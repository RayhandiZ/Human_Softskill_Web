import { db } from './db.js'
import { GalatApi } from './api.js'
import { ambilKurikulum, kunciVersiKurikulum, siapkanKurikulum } from './kurikulum.js'
import { catatLog } from './log.js'
import { SERTA_MAHASISWA, susunMahasiswa } from './muat.js'
import { ALASAN_MIN } from './nilai.js'
import { KUNCI_VERSI_KURIKULUM, getKomponen } from '../lib/curriculum.js'
import { ISI_PENGATURAN, bedaBobot, dampakBobot, periksaBobot, susunanBobot } from '../lib/bobot.js'
import { tanamKurikulumDalam } from '../../prisma/tanam-kurikulum.js'

// Kemahasiswaan mengubah bobot dari halaman Kurikulum CPMK. Bobot berlaku untuk SEMUA angkatan dan nilai
// aspek dihitung ulang darinya (tidak disimpan), jadi mengubah bobot berarti mengubah nilai yang sudah ada:
// - layar mengirim versi kurikulum yang ia buka; bila sudah diubah orang lain sejak itu, ditolak (409);
// - dampaknya dihitung ulang di sini dari seluruh mahasiswa, tidak memercayai hitungan layar;
// - bila hasil angkatan terkunci atau aspek final manual ikut berubah, alasan wajib (aturan data terkunci);
// - bobot, versi baru, dan catatan log ditulis dalam satu transaksi.

const TRANSAKSI = { timeout: 30000, maxWait: 10000 }

/** Salinan yang hanya berisi kunci yang dikenal, dalam urutan tetap; dipanggil sesudah periksaBobot lolos. */
function rapikan({ pengaturan, aspek }) {
  const pilih = (isi, kunci) => Object.fromEntries(kunci.map((k) => [k, isi[k]]))
  return {
    pengaturan: {
      MODE_BOBOT_KOMPONEN: pengaturan.MODE_BOBOT_KOMPONEN,
      BOBOT_SUMBER: pilih(pengaturan.BOBOT_SUMBER, ISI_PENGATURAN.BOBOT_SUMBER),
      BOBOT_KOMPONEN_MK: pilih(pengaturan.BOBOT_KOMPONEN_MK, ISI_PENGATURAN.BOBOT_KOMPONEN_MK),
    },
    aspek: Object.fromEntries(
      Object.entries(aspek).map(([id, manual]) => [id, manual && pilih(manual, getKomponen(id).map((k) => k.id))]),
    ),
  }
}

/**
 * Menyimpan susunan bobot lengkap (lihat src/lib/bobot.js). `versi` = versi kurikulum saat halaman dibuka
 * (null bila kurikulum masih dari kode). Mengembalikan kurikulum yang baru supaya layar langsung memakainya.
 */
export async function simpanBobot(pengguna, { versi = null, pengaturan, aspek, alasan }) {
  const masalah = periksaBobot({ pengaturan, aspek })
  if (masalah.length) throw new GalatApi(masalah.map((m) => m.pesan).join(' '))
  const baru = rapikan({ pengaturan, aspek })
  const lama = susunanBobot()
  const beda = bedaBobot(lama, baru)
  if (!beda.pengaturan.length && !beda.aspek.length) throw new GalatApi('Tidak ada perubahan bobot untuk disimpan.')

  const mhs = await db.mahasiswa.findMany({ include: SERTA_MAHASISWA, orderBy: { nim: 'asc' } })
  const dampak = dampakBobot(mhs.map((m) => susunMahasiswa(m)), baru, 20)
  const teks = String(alasan ?? '').trim()
  if (dampak.terkunci && teks.length < ALASAN_MIN) {
    throw new GalatApi(
      'Perubahan ini mengubah hasil ' + dampak.terkunci + ' mahasiswa pada angkatan terkunci atau aspek final manual. ' +
        'Isi alasan minimal ' + ALASAN_MIN + ' karakter.',
    )
  }
  const ringkas = {
    total: dampak.total,
    berubah: dampak.berubah,
    naik: dampak.naik,
    turun: dampak.turun,
    jadiLayak: dampak.jadiLayak,
    tidakLagiLayak: dampak.tidakLagiLayak,
    terkunci: dampak.terkunci,
  }

  const versiBaru = await db.$transaction(async (tx) => {
    const sekarang = await kunciVersiKurikulum(tx)
    if (sekarang !== (versi == null ? null : Number(versi))) {
      throw new GalatApi('Kurikulum sudah diubah orang lain sejak halaman ini dibuka. Muat ulang halaman, lalu ulangi perubahan Anda.', 409)
    }
    // Basis data belum memegang kurikulum (belum di-seed): isi dari kode ditanam dulu, sama seperti seed.
    if (sekarang == null) await tanamKurikulumDalam(tx)

    const waktu = new Date()
    for (const id of beda.aspek) {
      for (const k of getKomponen(id)) {
        await tx.komponen.update({
          where: { id: k.id },
          data: { bobot: baru.aspek[id]?.[k.id] ?? null, diubahOleh: pengguna.id, diubahPada: waktu },
        })
      }
    }
    for (const kunci of beda.pengaturan) {
      const nilai = baru.pengaturan[kunci]
      await tx.konfigurasi.upsert({ where: { kunci }, update: { nilai }, create: { kunci, nilai } })
    }
    const v = (sekarang ?? 1) + 1
    await tx.konfigurasi.upsert({
      where: { kunci: KUNCI_VERSI_KURIKULUM },
      update: { nilai: v },
      create: { kunci: KUNCI_VERSI_KURIKULUM, nilai: v },
    })

    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_BOBOT',
      target: 'kurikulum versi ' + v,
      rincian: {
        alasan: teks || null,
        aspek: beda.aspek.map((id) => ({ aspekId: id, sebelum: lama.aspek[id], sesudah: baru.aspek[id] })),
        pengaturan: beda.pengaturan.map((kunci) => ({ kunci, sebelum: lama.pengaturan[kunci], sesudah: baru.pengaturan[kunci] })),
        dampak: { ...ringkas, angkatanTerkunci: dampak.angkatanTerkunci },
        contoh: dampak.daftar.map((x) => ({ nim: x.nim, sebelum: x.nilaiSebelum, sesudah: x.nilaiSesudah })),
      },
    })
    return v
  }, TRANSAKSI)

  await siapkanKurikulum()
  return { ok: true, versi: versiBaru, dampak: ringkas, kurikulum: await ambilKurikulum() }
}
