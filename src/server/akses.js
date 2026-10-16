import { db } from './db.js'
import { GalatApi } from './api.js'
import { catatLog } from './log.js'

// Akses akun mahasiswa, dosen, dan admin (Pengguna.aktif), hanya untuk super admin; lihat README.md › Panel
// Super Admin › Akses Pengguna. Akun nonaktif sudah ditolak penggunaDari() di api.js dan periksaMasuk() di
// masuk.js. Mencabut akses tidak menyentuh data: nilai dan riwayat mahasiswa tetap ada dan tetap terlihat admin.

const PERAN = { MAHASISWA: 'mahasiswa', DOSEN: 'dosen', ADMIN: 'admin', SUPER_ADMIN: 'superadmin' }
const ALASAN_MIN = 10
const SERTA = {
  dosen: { include: { prodi: true } },
  mahasiswa: { include: { prodi: true, angkatan: true } },
}

function susunAkun(p) {
  return {
    id: p.id,
    email: p.email,
    peran: PERAN[p.peran],
    aktif: p.aktif,
    ...(p.dosen ? { nama: p.dosen.nama, nip: p.dosen.nip, prodi: p.dosen.prodi.nama } : {}),
    ...(p.mahasiswa
      ? { nama: p.mahasiswa.nama, nim: p.mahasiswa.nim, prodi: p.mahasiswa.prodi.nama, angkatan: p.mahasiswa.angkatan.label }
      : {}),
  }
}

/** { akun: [...] } untuk semua akun: mahasiswa, dosen, admin, dan super admin. */
export async function daftarAkses() {
  const daftar = await db.pengguna.findMany({ include: SERTA, orderBy: { id: 'asc' } })
  return { akun: daftar.map(susunAkun) }
}

/** Mencabut (aktif false) atau memulihkan (aktif true) akses satu akun, dengan alasan. */
export async function ubahAkses(pengguna, { id, aktif, alasan }) {
  const target = Number(id)
  if (!Number.isInteger(target)) throw new GalatApi('Akun tidak valid.')
  if (typeof aktif !== 'boolean') throw new GalatApi('Status akses tidak valid.')
  const teksAlasan = String(alasan ?? '').trim()
  if (teksAlasan.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')

  const akun = await db.pengguna.findUnique({ where: { id: target }, include: SERTA })
  if (!akun) throw new GalatApi('Akun tidak ditemukan.', 404)
  if (akun.id === pengguna.id) throw new GalatApi('Akses akun sendiri tidak bisa diubah.', 403)
  if (akun.peran === 'SUPER_ADMIN') throw new GalatApi('Akses Super Admin diatur langsung di basis data.', 403)
  if (akun.aktif === aktif) return { akun: susunAkun(akun) } // tidak ada yang berubah, tidak dicatat

  // Perubahan dan catatan lognya dalam satu transaksi: berhasil bersama atau gagal bersama.
  const baru = await db.$transaction(async (tx) => {
    const hasil = await tx.pengguna.update({ where: { id: akun.id }, data: { aktif }, include: SERTA })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_AKSES',
      target: 'akun ' + akun.email,
      rincian: { email: akun.email, peran: PERAN[akun.peran], sebelum: akun.aktif, sesudah: aktif, alasan: teksAlasan },
    })
    return hasil
  })
  return { akun: susunAkun(baru) }
}
