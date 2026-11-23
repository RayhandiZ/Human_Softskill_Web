import crypto from 'node:crypto'
import { db } from './db.js'
import { GalatApi } from './api.js'
import { ambilKurikulum, kunciVersiKurikulum, siapkanKurikulum } from './kurikulum.js'
import { catatLog } from './log.js'
import { SERTA_MAHASISWA, susunMahasiswa } from './muat.js'
import { KUNCI_VERSI_KURIKULUM } from '../lib/curriculum.js'
import {
  ALASAN_SYARAT_MIN,
  TANDA_MAKS,
  dampakSyarat,
  keKonfigurasi,
  periksaSyarat,
  rapikanTambahan,
  samaSyarat,
  susunanSyarat,
  syaratUntukLog,
} from '../lib/syaratSertifikat.js'
import { tanamKurikulumDalam } from '../../prisma/tanam-kurikulum.js'

// Super admin mengubah dan menambah syarat kelayakan cetak sertifikat dari Aturan Sistem. Syaratnya berlaku untuk seluruh
// mahasiswa dan dihitung ulang saat akses diminta, diputuskan, dan dicetak, jadi wajib beralasan dan tercatat beserta
// dampaknya. Daftar syarat tinggal di tabel Konfigurasi dan ikut VERSI_KURIKULUM, supaya setiap proses server membacanya
// ulang; tanda syarat manual per mahasiswa ada di tabel SyaratMahasiswa.
// Lihat README.md › Sertifikat › Mengubah syarat kelayakan.

const TRANSAKSI = { timeout: 30000, maxWait: 10000 }
const KUNCI_TAMBAHAN = 'SYARAT_TAMBAHAN'

// Id acak, bukan nomor urut: id syarat yang dihapus tidak pernah terpakai lagi, jadi tandanya tidak bisa berpindah ke syarat lain.
const idSyaratBaru = () => 'S' + crypto.randomBytes(8).toString('hex')

const wajibAlasan = (alasan) => {
  const teks = String(alasan ?? '').trim()
  if (teks.length < ALASAN_SYARAT_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')
  return teks
}

export async function ubahSyaratSertifikat(pengguna, { versi = null, nilaiMinimum, syaratSemester, syaratPengesahan, tambahan, alasan } = {}) {
  const lama = susunanSyarat() // sudah dibaca ulang dari basis data oleh tangani()
  // `tambahan` yang tidak dikirim berarti daftarnya tetap.
  const kiriman = { nilaiMinimum, syaratSemester, syaratPengesahan, tambahan: tambahan === undefined ? lama.tambahan : tambahan }
  const masalah = periksaSyarat(kiriman, lama.tambahan)
  if (masalah) throw new GalatApi(masalah)
  const teksAlasan = wajibAlasan(alasan)

  const baru = { ...kiriman, tambahan: kiriman.tambahan.map((s) => ({ ...rapikanTambahan(s), id: s.id ?? idSyaratBaru() })) }
  if (samaSyarat(lama, baru)) throw new GalatApi('Tidak ada perubahan syarat untuk disimpan.')

  // Dampak dihitung ulang di sini dari seluruh mahasiswa, tidak memercayai hitungan layar.
  const [mhs, siapCetak] = await Promise.all([
    db.mahasiswa.findMany({ include: SERTA_MAHASISWA, orderBy: { nim: 'asc' } }),
    db.permintaanSertifikat.findMany({ where: { status: 'SIAP_DICETAK' }, select: { mahasiswa: { select: { nim: true } } } }),
  ])
  const dampak = dampakSyarat(mhs.map((m) => susunMahasiswa(m)), baru, siapCetak.map((p) => p.mahasiswa.nim))

  const tulisan = keKonfigurasi(baru)
  const kunciBerubah = Object.keys(tulisan).filter(
    (k) => JSON.stringify(tulisan[k]) !== JSON.stringify(keKonfigurasi(lama)[k]),
  )
  const idDihapus = lama.tambahan.filter((s) => !baru.tambahan.some((x) => x.id === s.id)).map((s) => s.id)

  const versiBaru = await db.$transaction(async (tx) => {
    const sekarang = await kunciVersiKurikulum(tx)
    if (sekarang !== (versi == null ? null : Number(versi))) {
      throw new GalatApi('Kurikulum sudah diubah orang lain sejak halaman ini dibuka. Muat ulang halaman, lalu ulangi perubahan Anda.', 409)
    }
    // Basis data belum memegang kurikulum (belum di-seed): isi dari kode ditanam dulu, sama seperti simpanBobot.
    if (sekarang == null) await tanamKurikulumDalam(tx)

    for (const kunci of kunciBerubah) {
      const nilai = tulisan[kunci]
      await tx.konfigurasi.upsert({ where: { kunci }, update: { nilai }, create: { kunci, nilai } })
    }
    // Tanda milik syarat yang dihapus ikut hilang bersama syaratnya.
    const terhapus = idDihapus.length ? (await tx.syaratMahasiswa.deleteMany({ where: { syaratId: { in: idDihapus } } })).count : 0
    const v = (sekarang ?? 1) + 1
    await tx.konfigurasi.upsert({
      where: { kunci: KUNCI_VERSI_KURIKULUM },
      update: { nilai: v },
      create: { kunci: KUNCI_VERSI_KURIKULUM, nilai: v },
    })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_SYARAT_SERTIFIKAT',
      target: 'syarat sertifikat',
      rincian: {
        sebelum: syaratUntukLog(lama),
        sesudah: syaratUntukLog(baru),
        alasan: teksAlasan,
        dampak,
        ...(idDihapus.length ? { tandaDihapus: terhapus } : {}),
      },
    })
    return v
  }, TRANSAKSI)

  await siapkanKurikulum()
  return { ok: true, versi: versiBaru, syarat: baru, dampak, kurikulum: await ambilKurikulum() }
}

const daftarNim = (x) => [...new Set((Array.isArray(x) ? x : []).map((n) => String(n ?? '').trim()).filter(Boolean))]

/**
 * Menandai mahasiswa sudah memenuhi satu syarat manual (`tandai`: NIM) atau membatalkan tandanya (`batalkan`: NIM), dengan
 * alasan. Yang keadaannya sudah sama dilewati, dan bila tidak ada yang berubah tidak ada yang dicatat. Jawabannya { jumlah }.
 */
export async function tandaiSyaratSertifikat(pengguna, { syaratId, tandai, batalkan, alasan } = {}) {
  const id = String(syaratId ?? '').trim()
  const teksAlasan = wajibAlasan(alasan)
  const nimTandai = daftarNim(tandai)
  const nimBatal = daftarNim(batalkan)
  if (!nimTandai.length && !nimBatal.length) throw new GalatApi('Pilih minimal satu mahasiswa.')
  if (nimTandai.length + nimBatal.length > TANDA_MAKS) throw new GalatApi('Paling banyak 500 mahasiswa sekali simpan.')
  if (nimTandai.some((n) => nimBatal.includes(n))) {
    throw new GalatApi('Mahasiswa yang sama tidak bisa ditandai dan dibatalkan sekaligus.')
  }

  const semuaNim = [...nimTandai, ...nimBatal]
  const mhs = await db.mahasiswa.findMany({ where: { nim: { in: semuaNim } }, select: { id: true, nim: true, nama: true } })
  const adaNim = new Set(mhs.map((m) => m.nim))
  const asing = semuaNim.find((n) => !adaNim.has(n))
  if (asing) throw new GalatApi('Mahasiswa dengan NIM ' + asing + ' tidak ditemukan.', 404)

  const jumlah = await db.$transaction(async (tx) => {
    // Baris versi dikunci dulu, supaya syarat yang sedang dihapus di permintaan lain tidak meninggalkan tanda.
    await kunciVersiKurikulum(tx)
    const baris = await tx.konfigurasi.findUnique({ where: { kunci: KUNCI_TAMBAHAN } })
    const syarat = (Array.isArray(baris?.nilai) ? baris.nilai : []).find((s) => s.id === id)
    if (!syarat) throw new GalatApi('Syarat tidak ditemukan. Mungkin sudah dihapus. Muat ulang halaman.', 404)
    if (syarat.jenis !== 'manual') throw new GalatApi('Syarat nilai diperiksa otomatis, tidak ditandai per mahasiswa.')

    const sudah = new Set(
      (await tx.syaratMahasiswa.findMany({
        where: { syaratId: id, mahasiswaId: { in: mhs.map((m) => m.id) } },
        select: { mahasiswaId: true },
      })).map((x) => x.mahasiswaId),
    )
    const urut = [...mhs].sort((a, b) => a.nim.localeCompare(b.nim))
    const baru = urut.filter((m) => nimTandai.includes(m.nim) && !sudah.has(m.id))
    const batal = urut.filter((m) => nimBatal.includes(m.nim) && sudah.has(m.id))
    if (!baru.length && !batal.length) return 0

    if (baru.length) {
      await tx.syaratMahasiswa.createMany({
        data: baru.map((m) => ({ syaratId: id, mahasiswaId: m.id, ditandaiOleh: pengguna.id })),
      })
    }
    if (batal.length) {
      await tx.syaratMahasiswa.deleteMany({ where: { syaratId: id, mahasiswaId: { in: batal.map((m) => m.id) } } })
    }
    const barisLog = (m, terpenuhi) => ({ nim: m.nim, nama: m.nama, sebelum: { terpenuhi: !terpenuhi }, sesudah: { terpenuhi } })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'TANDAI_SYARAT_SERTIFIKAT',
      target: 'syarat sertifikat ' + syarat.nama,
      rincian: {
        syarat: syarat.nama,
        ditandai: baru.length,
        dibatalkan: batal.length,
        mahasiswa: [...baru.map((m) => barisLog(m, true)), ...batal.map((m) => barisLog(m, false))],
        alasan: teksAlasan,
      },
    })
    return baru.length + batal.length
  }, TRANSAKSI)
  return { jumlah }
}
