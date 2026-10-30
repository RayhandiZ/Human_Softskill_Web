import { db } from './db.js'
import { GalatApi } from './api.js'
import { SERTA_MAHASISWA, angkaId, susunMahasiswa, waktuWib, wajibAksesAngkatan } from './muat.js'
import { ALASAN_MIN } from './nilai.js'
import { catatLog } from './log.js'
import { kelayakanSertifikat } from '../lib/rules.js'

// Akses cetak sertifikat dua lapis (rapat 24 Okt 2026). Mahasiswa yang memenuhi seluruh syarat tetap harus meminta
// akses cetak; admin Kemahasiswaan memutuskan lapis pertama, super admin lapis kedua, lalu statusnya SIAP_DICETAK.
// Sertifikat dicetak dari website (lembar cetak di halaman Sertifikat), tidak pernah dikirim lewat surel. Lapis
// pertama hanya untuk admin biasa dan lapis kedua hanya untuk super admin, supaya selalu dua orang yang memeriksa.
// Kelayakan dihitung ulang di setiap langkah karena nilai bisa berubah setelah permintaan diajukan. Akses yang sudah
// SIAP_DICETAK bisa dicabut admin atau super admin (DICABUT), dan setiap kali dibuka untuk dicetak dihitung.

const BERJALAN = ['MENUNGGU_ADMIN', 'MENUNGGU_SUPERADMIN', 'SIAP_DICETAK']

/** Kelayakan sertifikat satu mahasiswa menurut aturan yang sama dengan layar (kelayakanSertifikat di rules.js). */
async function kelayakan(mahasiswaId) {
  const m = await db.mahasiswa.findUnique({ where: { id: mahasiswaId }, include: SERTA_MAHASISWA })
  if (!m) throw new GalatApi('Data mahasiswa tidak ditemukan.', 404)
  return { m, k: kelayakanSertifikat(susunMahasiswa(m)) }
}

const sebabTidakLayak = (k) => k.gagal.map((s) => s.ringkas).filter(Boolean)[0] ?? 'syaratnya belum terpenuhi'

/** Mahasiswa meminta akses cetak. Satu permintaan yang berjalan per mahasiswa; yang ditolak boleh diajukan lagi. */
export async function mintaSertifikat(pengguna) {
  const { m, k } = await kelayakan(pengguna.mahasiswa.id)
  if (!k.layak) throw new GalatApi('Sertifikat belum bisa diminta: ' + sebabTidakLayak(k) + '.', 409)
  const ada = await db.permintaanSertifikat.findFirst({ where: { mahasiswaId: m.id, status: { in: BERJALAN } } })
  if (ada) throw new GalatApi('Permintaan akses cetak Anda sudah ada.', 409)
  const baru = await db.$transaction(async (tx) => {
    const p = await tx.permintaanSertifikat.create({ data: { mahasiswaId: m.id } })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'MINTA_SERTIFIKAT',
      target: 'mahasiswa ' + m.nim,
      rincian: { permintaan: 'S-' + p.id, nama: m.nama, nilaiAkhir: k.transkrip.akhir.nilai },
    })
    return p
  })
  return { id: 'S-' + baru.id }
}

/**
 * Keputusan atas permintaan akses cetak: admin biasa memutuskan MENUNGGU_ADMIN (disetujui diteruskan ke super
 * admin), super admin memutuskan MENUNGGU_SUPERADMIN (disetujui menjadi SIAP_DICETAK). Menolak wajib menyebut
 * alasannya. { ok: false } bila permintaan sudah diputuskan atau sedang menunggu lapis yang lain.
 */
export async function putuskanSertifikat(pengguna, { id, keputusan, catatan }) {
  if (!['disetujui', 'ditolak'].includes(keputusan)) throw new GalatApi('Keputusan harus "disetujui" atau "ditolak".')
  const p = await db.permintaanSertifikat.findUnique({ where: { id: angkaId(id) }, include: { mahasiswa: true } })
  if (!p) throw new GalatApi('Permintaan tidak ditemukan.', 404)
  await wajibAksesAngkatan(pengguna, [p.mahasiswa.angkatanId])
  const lapis = pengguna.superAdmin ? 'MENUNGGU_SUPERADMIN' : 'MENUNGGU_ADMIN'
  if (p.status !== lapis) return { ok: false }

  const teks = String(catatan ?? '').trim()
  const sekarang = new Date()
  let data
  if (keputusan === 'ditolak') {
    if (teks.length < ALASAN_MIN) {
      throw new GalatApi('Alasan penolakan wajib diisi, minimal ' + ALASAN_MIN + ' karakter, supaya mahasiswa tahu sebabnya.')
    }
    data = { status: 'DITOLAK', ditolakOleh: pengguna.id, ditolakPada: sekarang, catatan: teks }
  } else {
    const { k } = await kelayakan(p.mahasiswaId)
    if (!k.layak) {
      throw new GalatApi(
        'Mahasiswa ini sudah tidak memenuhi syarat sertifikat (' + sebabTidakLayak(k) + '). Tolak permintaannya dengan alasan itu.',
        409,
      )
    }
    data = pengguna.superAdmin
      ? { status: 'SIAP_DICETAK', superOleh: pengguna.id, superPada: sekarang }
      : { status: 'MENUNGGU_SUPERADMIN', adminOleh: pengguna.id, adminPada: sekarang }
  }

  return db.$transaction(async (tx) => {
    // Hanya yang masih menunggu lapis ini yang berubah: dua jendela yang memutuskan bersamaan tidak saling timpa.
    const hasil = await tx.permintaanSertifikat.updateMany({ where: { id: p.id, status: lapis }, data })
    if (hasil.count !== 1) return { ok: false }
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: keputusan === 'ditolak' ? 'TOLAK_SERTIFIKAT' : 'SETUJUI_SERTIFIKAT',
      target: 'mahasiswa ' + p.mahasiswa.nim,
      rincian: {
        permintaan: 'S-' + p.id,
        nama: p.mahasiswa.nama,
        lapis: pengguna.superAdmin ? 2 : 1,
        status: data.status,
        ...(teks ? { catatan: teks } : {}),
      },
    })
    return { ok: true }
  })
}

/**
 * Mencabut akses cetak yang sudah SIAP_DICETAK, misalnya karena laporan sikap datang sesudah disetujui. Admin biasa
 * dan super admin sama-sama boleh, langsung dan sendiri, dengan alasan minimal 10 karakter yang terbaca mahasiswa.
 * Sesudahnya mahasiswa boleh meminta lagi lewat dua lapis. { ok: false } bila aksesnya sudah tidak SIAP_DICETAK.
 */
export async function cabutSertifikat(pengguna, { id, alasan }) {
  const p = await db.permintaanSertifikat.findUnique({ where: { id: angkaId(id) }, include: { mahasiswa: true } })
  if (!p) throw new GalatApi('Permintaan tidak ditemukan.', 404)
  await wajibAksesAngkatan(pengguna, [p.mahasiswa.angkatanId])
  if (p.status !== 'SIAP_DICETAK') return { ok: false }
  const teks = String(alasan ?? '').trim()
  if (teks.length < ALASAN_MIN) {
    throw new GalatApi('Alasan pencabutan wajib diisi, minimal ' + ALASAN_MIN + ' karakter, supaya mahasiswa tahu sebabnya.')
  }

  return db.$transaction(async (tx) => {
    const hasil = await tx.permintaanSertifikat.updateMany({
      where: { id: p.id, status: 'SIAP_DICETAK' },
      data: { status: 'DICABUT', dicabutOleh: pengguna.id, dicabutPada: new Date(), alasanCabut: teks },
    })
    if (hasil.count !== 1) return { ok: false }
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'CABUT_SERTIFIKAT',
      target: 'mahasiswa ' + p.mahasiswa.nim,
      // Berapa kali sudah dibuka untuk dicetak saat dicabut: penanda apakah ada sertifikat yang sempat tercetak.
      rincian: { permintaan: 'S-' + p.id, nama: p.mahasiswa.nama, alasan: teks, jumlahCetak: p.jumlahCetak, cetakTerakhir: waktuWib(p.cetakTerakhir) },
    })
    return { ok: true }
  })
}

/**
 * Mencatat bahwa sertifikat dibuka untuk dicetak. Layar memanggilnya SEBELUM membuka dialog cetak, jadi ini juga
 * gerbang terakhir: akses yang dicabut, belum disetujui, atau syaratnya gugur dijawab 409, termasuk dari halaman yang
 * dimuat sebelum pencabutan. Mahasiswa hanya untuk permintaannya sendiri. Website hanya tahu dialog cetak dibuka,
 * bukan apakah kertasnya benar-benar keluar.
 */
export async function catatCetak(pengguna, { id }) {
  const p = await db.permintaanSertifikat.findUnique({ where: { id: angkaId(id) }, include: { mahasiswa: true } })
  if (!p || (pengguna.peran === 'student' && p.mahasiswaId !== pengguna.mahasiswa?.id)) {
    throw new GalatApi('Permintaan tidak ditemukan.', 404)
  }
  await wajibAksesAngkatan(pengguna, [p.mahasiswa.angkatanId])
  if (p.status === 'DICABUT') throw new GalatApi('Akses cetak sertifikat ini sudah dicabut.', 409)
  if (p.status !== 'SIAP_DICETAK') throw new GalatApi('Akses cetak sertifikat ini belum disetujui.', 409)
  const { k } = await kelayakan(p.mahasiswaId)
  if (!k.layak) throw new GalatApi('Sertifikat tidak bisa dicetak: ' + sebabTidakLayak(k) + '.', 409)

  return db.$transaction(async (tx) => {
    const hasil = await tx.permintaanSertifikat.updateMany({
      where: { id: p.id, status: 'SIAP_DICETAK' },
      data: { jumlahCetak: { increment: 1 }, cetakTerakhir: new Date(), cetakTerakhirOleh: pengguna.id },
    })
    if (hasil.count !== 1) throw new GalatApi('Akses cetak sertifikat ini baru saja dicabut.', 409)
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'CETAK_SERTIFIKAT',
      target: 'mahasiswa ' + p.mahasiswa.nim,
      rincian: { permintaan: 'S-' + p.id, nama: p.mahasiswa.nama, ke: p.jumlahCetak + 1 },
    })
    return { ok: true, jumlahCetak: p.jumlahCetak + 1 }
  })
}
