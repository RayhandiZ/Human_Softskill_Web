import { db } from './db.js'
import { GalatApi } from './api.js'
import { petaAkun, waktuWib } from './muat.js'
import { pelaku } from './log.js'

// Pembaruan dari Super Admin di lonceng admin biasa (rapat 24 Okt 2026: notifikasi untuk admin saat super admin
// memperbarui data). Isinya dibaca dari LogAktivitas, jadi tidak ada tabel kedua yang bisa berbeda dari log. Status
// dibacanya satu penanda per akun, Pengguna.notifDibacaId: id log terakhir yang sudah ditandai dibaca. Akun yang belum
// pernah menandai menghitung sejak akunnya dibuat, supaya admin baru tidak menerima seluruh riwayat sebagai pembaruan.
// Menandai dibaca tidak dicatat di LogAktivitas: penandanya keadaan layar milik akun itu sendiri, seperti membaca log.

// Tindakan super admin yang tidak mengubah data bersama: membuka sertifikat untuk dicetak dan mengubah profil sendiri.
const BUKAN_PEMBARUAN = ['CETAK_SERTIFIKAT', 'UBAH_PROFIL']
const TAMPIL = 20

/** Saringan LogAktivitas untuk pembaruan: pelakunya akun yang saat ini berperan Super Admin. */
async function saringPembaruan() {
  const superAdmin = await db.pengguna.findMany({ where: { peran: 'SUPER_ADMIN' }, select: { id: true } })
  return { aktorId: { in: superAdmin.map((p) => p.id) }, aksi: { notIn: BUKAN_PEMBARUAN } }
}

// Super admin lolos penjaga ['admin'] di tangani(), padahal yang dilaporkan di sini tindakannya sendiri.
function wajibAdminBiasa(pengguna) {
  if (pengguna.superAdmin) throw new GalatApi('Pembaruan dari Super Admin hanya untuk akun admin.', 403)
}

// Contoh per mahasiswa (sampai 20 baris) hanya dibaca di Rincian halaman Log Aktivitas; lonceng memakai ringkasannya.
const tanpaContoh = (r) => {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return r ?? null
  const { contoh, ...sisa } = r
  return sisa
}

/**
 * { belum, terbaru, baris }: `belum` banyaknya pembaruan yang belum dibaca (bisa lebih banyak dari yang tampil),
 * `terbaru` id log pembaruan paling baru (dikirim balik ke tandaiNotifikasi), dan sampai 20 pembaruan terbaru dalam
 * bentuk baris aktivitas bacaLog() ditambah `baru`.
 */
export async function bacaNotifikasi(pengguna) {
  wajibAdminBiasa(pengguna)
  const [akun, where] = await Promise.all([
    db.pengguna.findUnique({ where: { id: pengguna.id }, select: { notifDibacaId: true, dibuat: true } }),
    saringPembaruan(),
  ])
  const dibaca = akun.notifDibacaId
  const belumDibaca = dibaca != null ? { id: { gt: dibaca } } : { waktu: { gt: akun.dibuat } }
  const [baris, belum] = await Promise.all([
    db.logAktivitas.findMany({ where, orderBy: { id: 'desc' }, take: TAMPIL }),
    db.logAktivitas.count({ where: { ...where, ...belumDibaca } }),
  ])
  const nama = await petaAkun(baris.map((b) => b.aktorId))
  return {
    belum,
    terbaru: baris[0]?.id ?? null,
    baris: baris.map((b) => ({
      id: 'A-' + b.id,
      waktu: waktuWib(b.waktu),
      ...pelaku(nama, b.aktorId),
      aksi: b.aksi,
      target: b.target,
      rincian: tanpaContoh(b.rincian),
      baru: dibaca != null ? b.id > dibaca : b.waktu > akun.dibuat,
    })),
  }
}

/**
 * Menandai dibaca semua pembaruan sampai id log `sampai`. Layar mengirim `terbaru` dari daftar yang sedang
 * ditampilkannya, bukan "sekarang", supaya pembaruan yang masuk sesudah daftar itu dimuat tetap terhitung baru.
 */
export async function tandaiNotifikasi(pengguna, { sampai } = {}) {
  wajibAdminBiasa(pengguna)
  const id = Number(sampai)
  if (!Number.isInteger(id) || id < 1) throw new GalatApi('Penanda baca tidak valid.')
  const ada = await db.logAktivitas.count({ where: { id, ...(await saringPembaruan()) } })
  if (!ada) throw new GalatApi('Pembaruan itu tidak ditemukan.', 404)
  // Penanda hanya maju: tab lain yang masih memegang daftar lama tidak mengembalikan yang sudah dibaca.
  await db.pengguna.updateMany({
    where: { id: pengguna.id, OR: [{ notifDibacaId: null }, { notifDibacaId: { lt: id } }] },
    data: { notifDibacaId: id },
  })
  return bacaNotifikasi(pengguna)
}
