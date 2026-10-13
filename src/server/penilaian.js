import { db } from './db.js'
import { GalatApi } from './api.js'
import { ambilKurikulum, kunciVersiKurikulum, siapkanKurikulum } from './kurikulum.js'
import { catatLog } from './log.js'
import { SERTA_MAHASISWA, susunMahasiswa } from './muat.js'
import { ALASAN_MIN } from './nilai.js'
import { BIDANG_ASPEK, KUNCI_VERSI_KURIKULUM, KURIKULUM_TERPASANG, getAspek } from '../lib/curriculum.js'
import { dampakDari } from '../lib/bobot.js'
import { bedaPenilaian, denganAspek, komponenSementara, periksaPenilaian, susunanPenilaian } from '../lib/penilaian.js'

// Penilaian satu aspek diubah dari Input Manual: teks aspek (tabel Aspek), komponen asesmen (tambah, ubah,
// hapus ke arsip, pulihkan), dan bobotnya. Super admin menyimpan langsung; admin biasa SELALU mengajukan
// lewat src/server/persetujuan.js (aksi UBAH_PENILAIAN). Aturannya:
// - ID komponen tidak pernah diganti; komponen baru diberi ID '<aspek>-<sumber>-B<n>' (mis. 'A1-MK-B1');
// - komponen yang sudah punya nilai tidak bisa diganti sumbernya (aspeknya memang tidak bisa diganti di sini);
// - "hapus" = arsip (aktif false): tidak tampil dan tidak dihitung, nilainya tetap, bisa dipulihkan;
// - bila hasil angkatan terkunci atau aspek final manual ikut berubah, alasan wajib (aturan data terkunci);
// - semua ditulis dalam satu transaksi bersama versi kurikulum baru dan catatan log UBAH_PENILAIAN.

const TRANSAKSI = { timeout: 30000, maxWait: 10000 }
const KODE_SUMBER = { PDP: 'PDP', MK: 'MK', ENGAGEMENT: 'ENG' }
const teks = (v) => String(v ?? '').trim()

const rapikanKomponen = (k) =>
  k && typeof k === 'object'
    ? {
        id: k.id ?? null,
        label: teks(k.label),
        sumber: k.sumber,
        // Jenis hanya untuk MK; yang tertinggal saat sumber diganti dari MK dibuang, bukan ditolak.
        jenis: k.sumber === 'MK' ? (k.jenis ?? null) : null,
        ranah: k.ranah,
        status: k.status,
        aktif: k.aktif,
        bobot: typeof k.bobot === 'number' ? k.bobot : null,
      }
    : k

/**
 * Memeriksa susunan penilaian dan menghitung dampaknya tanpa menulis apa pun. Dipakai simpanPenilaian dan
 * gerbang persetujuan (supaya super admin tidak menerima permintaan yang pasti gagal).
 */
export async function rencanakanPenilaian({ versi = null, aspekId, aspek, komponen }) {
  if (!getAspek(aspekId)) throw new GalatApi('Aspek tidak dikenal.', 404)
  if ((versi == null ? null : Number(versi)) !== (KURIKULUM_TERPASANG.versi ?? null)) {
    throw new GalatApi('Kurikulum sudah diubah orang lain sejak halaman ini dibuka. Muat ulang halaman, lalu ulangi perubahan Anda.', 409)
  }
  const lamaDb = await db.komponen.findMany({ where: { aspekId }, orderBy: [{ urutan: 'asc' }, { id: 'asc' }] })
  if (!lamaDb.length || KURIKULUM_TERPASANG.versi == null) {
    throw new GalatApi('Kurikulum belum tersimpan di basis data. Jalankan npm run db:seed lebih dulu.')
  }
  const ids = lamaDb.map((k) => k.id)
  // "Sudah dinilai" = punya nilai sekarang atau pernah tercatat di riwayat nilai.
  const [nilai, jejak] = await Promise.all([
    db.nilai.findMany({ where: { komponenId: { in: ids } }, distinct: ['komponenId'], select: { komponenId: true } }),
    db.auditLog.findMany({ where: { komponenId: { in: ids } }, distinct: ['komponenId'], select: { komponenId: true } }),
  ])
  const dinilai = new Set([...nilai, ...jejak].map((x) => x.komponenId))

  const baru = {
    aspek: Object.fromEntries(BIDANG_ASPEK.map((b) => [b, teks(aspek?.[b]) || null])),
    komponen: (Array.isArray(komponen) ? komponen : []).map(rapikanKomponen),
  }
  const masalah = periksaPenilaian(baru, {
    idLama: new Set(ids),
    dinilai,
    sumberLama: new Map(lamaDb.map((k) => [k.id, k.sumber])),
  })
  if (masalah.length) throw new GalatApi(masalah.map((m) => m.pesan).join(' '))

  const lama = susunanPenilaian(aspekId)
  const beda = bedaPenilaian(lama, baru)
  if (!beda.ada) throw new GalatApi('Tidak ada perubahan penilaian untuk disimpan.')

  // Data mahasiswa disusun ulang di dalam keadaan baru, supaya nilai komponen yang dipulihkan ikut terbaca.
  const mhs = await db.mahasiswa.findMany({ include: SERTA_MAHASISWA, orderBy: { nim: 'asc' } })
  const daftar = komponenSementara(aspekId, baru)
  const dampak = dampakDari(
    mhs.map((m) => susunMahasiswa(m)),
    (fn) => denganAspek(aspekId, daftar, fn),
    20,
    () => mhs.map((m) => susunMahasiswa(m)),
  )
  return { aspekId, lama, baru, beda, dampak, lamaDb, dinilai }
}

/** ID baru '<aspek>-<sumber>-B<n>' yang belum pernah dipakai, termasuk oleh komponen yang diarsipkan. */
function idBaru(aspekId, sumber, terpakai) {
  const awalan = aspekId + '-' + (KODE_SUMBER[sumber] ?? sumber) + '-B'
  let n = 1
  while (terpakai.has(awalan + n)) n++
  return awalan + n
}

const ringkasDampak = (d) => ({
  total: d.total,
  berubah: d.berubah,
  naik: d.naik,
  turun: d.turun,
  jadiLayak: d.jadiLayak,
  tidakLagiLayak: d.tidakLagiLayak,
  jadiBelumLengkap: d.jadiBelumLengkap,
  terkunci: d.terkunci,
})

/**
 * Menyimpan susunan penilaian satu aspek (lihat src/lib/penilaian.js). `versi` = versi kurikulum saat halaman
 * dibuka. Mengembalikan kurikulum yang baru supaya layar langsung memakainya.
 */
export async function simpanPenilaian(pengguna, isi = {}) {
  const r = await rencanakanPenilaian(isi)
  const alasan = teks(isi.alasan)
  if (r.dampak.terkunci && alasan.length < ALASAN_MIN) {
    throw new GalatApi(
      'Perubahan ini mengubah hasil ' + r.dampak.terkunci + ' mahasiswa pada angkatan terkunci atau aspek final manual. ' +
        'Isi alasan minimal ' + ALASAN_MIN + ' karakter.',
    )
  }
  const dampak = ringkasDampak(r.dampak)

  const tersimpan = await db.$transaction(async (tx) => {
    const sekarang = await kunciVersiKurikulum(tx)
    if (sekarang !== Number(isi.versi)) {
      throw new GalatApi('Kurikulum sudah diubah orang lain sejak halaman ini dibuka. Muat ulang halaman, lalu ulangi perubahan Anda.', 409)
    }
    const oleh = { diubahOleh: pengguna.id, diubahPada: new Date() }

    if (r.beda.aspek.length) {
      const data = { ...r.baru.aspek, nama: r.baru.aspek.nama, deskripsi: r.baru.aspek.deskripsi, ...oleh }
      await tx.aspek.upsert({ where: { id: r.aspekId }, update: data, create: { id: r.aspekId, ...data } })
    }

    const terpakai = new Set((await tx.komponen.findMany({ select: { id: true } })).map((k) => k.id))
    const lamaDari = new Map(r.lamaDb.map((k) => [k.id, k]))
    const awal = Math.min(...r.lamaDb.map((k) => k.urutan))
    const ditambah = []
    const idAkhir = []
    for (const [i, k] of r.baru.komponen.entries()) {
      const isiKomponen = {
        label: k.label,
        sumber: k.sumber,
        jenis: k.jenis,
        ranah: k.ranah,
        resmi: k.status === 'resmi',
        aktif: k.aktif,
        urutan: awal + i,
      }
      if (k.id == null) {
        const id = idBaru(r.aspekId, k.sumber, terpakai)
        terpakai.add(id)
        ditambah.push({ id, label: k.label, sumber: k.sumber })
        idAkhir.push(id)
        await tx.komponen.create({ data: { id, aspekId: r.aspekId, ...isiKomponen, bobot: k.aktif ? k.bobot : null, ...oleh } })
        continue
      }
      idAkhir.push(k.id)
      const l = lamaDari.get(k.id)
      // Bobot komponen yang diarsipkan dibiarkan: tidak dihitung, dan dipakai lagi bila dipulihkan tanpa diubah.
      const bobot = k.aktif ? k.bobot : (l.bobot ?? null)
      const berubah =
        l.label !== isiKomponen.label || l.sumber !== isiKomponen.sumber || (l.jenis ?? null) !== isiKomponen.jenis ||
        l.ranah !== isiKomponen.ranah || l.resmi !== isiKomponen.resmi || l.aktif !== isiKomponen.aktif ||
        l.urutan !== isiKomponen.urutan || (l.bobot ?? null) !== bobot
      if (berubah) await tx.komponen.update({ where: { id: k.id }, data: { ...isiKomponen, bobot, ...oleh } })
    }

    const v = sekarang + 1
    await tx.konfigurasi.upsert({
      where: { kunci: KUNCI_VERSI_KURIKULUM },
      update: { nilai: v },
      create: { kunci: KUNCI_VERSI_KURIKULUM, nilai: v },
    })

    const bobotAktif = (s, idDari) =>
      Object.fromEntries(s.komponen.map((k, i) => [idDari(k, i), k]).filter(([, k]) => k.aktif).map(([id, k]) => [id, k.bobot ?? null]))
    const pilih = (o, bidang) => Object.fromEntries(bidang.map((b) => [b, o[b] ?? null]))
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_PENILAIAN',
      target: 'aspek ' + r.aspekId + ' (kurikulum versi ' + v + ')',
      rincian: {
        alasan: alasan || null,
        aspekId: r.aspekId,
        aspek: r.beda.aspek.length
          ? { bidang: r.beda.aspek, sebelum: pilih(r.lama.aspek, r.beda.aspek), sesudah: pilih(r.baru.aspek, r.beda.aspek) }
          : null,
        ditambah,
        diubah: r.beda.diubah.map((id) => ({
          id,
          sebelum: r.lama.komponen.find((k) => k.id === id),
          sesudah: r.baru.komponen.find((k) => k.id === id),
        })),
        diarsipkan: r.beda.diarsipkan,
        dipulihkan: r.beda.dipulihkan,
        bobot: r.beda.bobot
          ? { sebelum: bobotAktif(r.lama, (k) => k.id), sesudah: bobotAktif(r.baru, (k, i) => idAkhir[i]) }
          : null,
        dampak: { ...dampak, angkatanTerkunci: r.dampak.angkatanTerkunci },
      },
    })
    return { versi: v, ditambah }
  }, TRANSAKSI)

  await siapkanKurikulum()
  return { ok: true, versi: tersimpan.versi, ditambah: tersimpan.ditambah, dampak, kurikulum: await ambilKurikulum() }
}
