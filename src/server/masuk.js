import bcrypt from 'bcryptjs'
import { db } from './db.js'
import { turunkanSemesterAktif } from '../lib/data.js'

const HASH_PENGGANTI = bcrypt.hashSync('bukan-kata-sandi-siapa-pun', 10)

const PERAN = { MAHASISWA: 'student', DOSEN: 'dosen', ADMIN: 'admin' }

// Galat yang boleh dibaca pengguna, lengkap dengan kode HTTP-nya.
export class GalatMasuk extends Error {
  constructor(pesan, status) {
    super(pesan)
    this.status = status
  }
}

const SERTA = {
  mahasiswa: { include: { prodi: { include: { fakultas: true } }, angkatan: true } },
  dosen: { include: { prodi: { include: { fakultas: true } } } },
}

export async function periksaMasuk({ email, password } = {}) {
  const alamat = String(email ?? '').trim().toLowerCase()
  const sandi = String(password ?? '')
  if (!alamat || !sandi) throw new GalatMasuk('Email dan kata sandi wajib diisi.', 400)

  const akun = await db.pengguna.findUnique({ where: { email: alamat }, include: SERTA })

  const cocok = await bcrypt.compare(sandi, akun?.passwordHash ?? HASH_PENGGANTI)
  if (!akun || !cocok) throw new GalatMasuk('Email atau kata sandi salah.', 401)
  return susunAkun(akun)
}

// Akun pemilik sesi, dibaca ulang dari basis data setiap halaman dimuat (/api/sesi),
// jadi perubahan nama, prodi, atau angkatan langsung terlihat tanpa masuk ulang.
export async function akunDariId(id) {
  const akun = await db.pengguna.findUnique({ where: { id }, include: SERTA })
  if (!akun) throw new GalatMasuk('Sesi berakhir. Silakan masuk lagi.', 401)
  return susunAkun(akun)
}

function susunAkun(akun) {
  if (!akun.aktif) throw new GalatMasuk('Akun ini dinonaktifkan. Hubungi Biro Kemahasiswaan.', 403)

  const peran = PERAN[akun.peran]
  const m = akun.mahasiswa
  const d = akun.dosen

  // Peran tanpa baris pendampingnya tidak bisa membuka panel apa pun —
  // lebih baik ditolak di sini daripada masuk ke halaman yang setengah kosong.
  if ((peran === 'student' && !m) || (peran === 'dosen' && !d)) {
    throw new GalatMasuk('Data akun ini belum lengkap. Hubungi Biro Kemahasiswaan.', 409)
  }

  return {
    penggunaId: akun.id,
    peran,
    email: akun.email,
    mahasiswa: m
      ? {
          id: String(m.id),
          nim: m.nim,
          nama: m.nama,
          prodi: m.prodi.nama,
          fakultas: m.prodi.fakultas.nama,
          angkatanId: m.angkatanId,
          semesterAktif: turunkanSemesterAktif({
            tahun: m.angkatan.periodeTahun,
            semester: m.angkatan.periodeSemester === 'GANJIL' ? 'Ganjil' : 'Genap',
          }),
        }
      : null,
    dosen: d
      ? {
          nip: d.nip,
          nama: d.nama,
          jabatan: d.jabatan,
          sumber: d.sumber,
          semester: d.semester,
          prodi: d.prodi.nama,
          fakultas: d.prodi.fakultas.nama,
        }
      : null,
  }
}
