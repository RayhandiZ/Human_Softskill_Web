import { db } from './db.js'
import { GalatApi } from './api.js'
import { catatLog } from './log.js'
import { ambilAngkatanProdi } from './master.js'
import { ALASAN_MIN, cariProdi, tambahAkun, wajib } from './akses.js'
import { PERIODE_AKTIF } from '../lib/data.js'

// Menambah dan mengubah data master: angkatan, fakultas, prodi, dan mahasiswa. Hanya untuk super admin dan admin
// yang diberi izin kelola data master (penjaga ['master'] di src/server/api.js; izinnya diatur aturIzinMaster di
// src/server/akses.js). Tidak ada hapus: menghapus akun tetap hanya lewat super admin (hapusAkun di akses.js).
// Setiap perubahan dan catatan lognya ada dalam satu transaksi. Jawaban angkatan dan prodi membawa `master`
// terbaru supaya layar langsung memasangnya lewat isiMaster(); lihat README.md › Data master.

const SEMESTER_MASUK = { Ganjil: 'GANJIL', Genap: 'GENAP' }
const TAHUN_MIN = 2000
const JENJANG = ['S1', 'D3']
const EMAIL_SAH = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Alasan perubahan, wajib untuk setiap `ubah` supaya Log Aktivitas menjelaskan kenapa data master berubah. */
function alasanUbah(alasan) {
  const teks = String(alasan ?? '').trim()
  if (teks.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal ' + ALASAN_MIN + ' karakter.')
  return teks
}

/** `aksi` 'tambah' atau 'ubah' dari isi permintaan. */
function pilihAksi(isi, tambah, ubah) {
  if (isi?.aksi === 'tambah') return tambah
  if (isi?.aksi === 'ubah') return ubah
  throw new GalatApi('Aksi harus "tambah" atau "ubah".')
}

/** Hanya kunci yang berubah, untuk rincian log: { sebelum, sesudah }. */
function bedaIsi(lama, baru) {
  const kunci = Object.keys(baru).filter((k) => baru[k] !== lama[k])
  return {
    sebelum: Object.fromEntries(kunci.map((k) => [k, lama[k]])),
    sesudah: Object.fromEntries(kunci.map((k) => [k, baru[k]])),
    berubah: kunci.length > 0,
  }
}

/* ---------------------------------- angkatan ---------------------------------- */

// Admin hanya memilih tahun dan semester masuk; kode, label, dan periode dibentuk di sini supaya sama dengan
// angkatan yang sudah ada ('2027' / '2027B', '2027' / '2027 Genap', periode '2027/2028'). Periode masuk tidak bisa
// diubah sesudahnya, karena semester setiap mahasiswanya dihitung dari situ (turunkanSemesterAktif di data.js).

export const kelolaAngkatan = (pengguna, isi = {}) => pilihAksi(isi, tambahAngkatan, ubahAngkatan)(pengguna, isi)

async function tambahAngkatan(pengguna, { tahun, semester }) {
  // Paling jauh satu tahun di depan periode aktif: cukup untuk menyiapkan angkatan berikutnya, dan menolak salah
  // ketik seperti 2207.
  const batasAtas = Number(String(PERIODE_AKTIF.tahun).slice(0, 4)) + 1
  const t = Number(tahun)
  if (!Number.isInteger(t) || t < TAHUN_MIN || t > batasAtas) {
    throw new GalatApi('Tahun angkatan harus antara ' + TAHUN_MIN + ' dan ' + batasAtas + '.')
  }
  const periodeSemester = SEMESTER_MASUK[semester]
  if (!periodeSemester) throw new GalatApi('Semester masuk harus Ganjil atau Genap.')

  const genap = periodeSemester === 'GENAP'
  const data = {
    id: t + (genap ? 'B' : ''),
    tahun: t,
    label: genap ? t + ' Genap' : String(t),
    periodeTahun: t + '/' + (t + 1),
    periodeSemester,
  }
  if (await db.angkatan.findUnique({ where: { id: data.id } })) {
    throw new GalatApi('Angkatan ' + data.label + ' sudah ada.', 409)
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.angkatan.create({ data })
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'TAMBAH_ANGKATAN',
        target: 'angkatan ' + data.label,
        rincian: { id: data.id, label: data.label, periode: semester + ' ' + data.periodeTahun },
      })
    })
  } catch (e) {
    // Dua penyimpanan bersamaan bisa lolos pemeriksaan di atas; kunci utama tetap menolak yang kedua.
    if (e?.code === 'P2002') throw new GalatApi('Angkatan ' + data.label + ' sudah ada.', 409)
    throw e
  }
  return { angkatan: { id: data.id, label: data.label }, master: await ambilAngkatanProdi() }
}

async function ubahAngkatan(pengguna, { id, label, alasan }) {
  const teksAlasan = alasanUbah(alasan)
  const a = await db.angkatan.findUnique({ where: { id: wajib(id, 'Angkatan') } })
  if (!a) throw new GalatApi('Angkatan tidak ditemukan.', 404)
  if (a.status === 'TERKUNCI') throw new GalatApi('Angkatan ' + a.label + ' sudah dikunci, jadi tidak bisa diubah.', 409)

  const labelBaru = wajib(label, 'Label angkatan')
  if (labelBaru === a.label) return { angkatan: { id: a.id, label: a.label }, master: await ambilAngkatanProdi() }
  if (await db.angkatan.findFirst({ where: { label: labelBaru, NOT: { id: a.id } } })) {
    throw new GalatApi('Label ' + labelBaru + ' sudah dipakai angkatan lain.', 409)
  }

  await db.$transaction(async (tx) => {
    await tx.angkatan.update({ where: { id: a.id }, data: { label: labelBaru } })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_ANGKATAN',
      target: 'angkatan ' + a.label,
      rincian: { id: a.id, sebelum: { label: a.label }, sesudah: { label: labelBaru }, alasan: teksAlasan },
    })
  })
  return { angkatan: { id: a.id, label: labelBaru }, master: await ambilAngkatanProdi() }
}

/* ------------------------------ fakultas dan prodi ------------------------------ */

// Fakultas dan prodi dikenali dari namanya (unik di basis data), sama seperti layar dan cariProdi() di akses.js.
// Mengganti nama aman: mahasiswa dan dosen menyambung lewat id, jadi semuanya ikut nama baru.

export function kelolaProdi(pengguna, isi = {}) {
  if (isi.jenis === 'fakultas') return pilihAksi(isi, tambahFakultas, ubahFakultas)(pengguna, isi)
  if (isi.jenis === 'prodi') return pilihAksi(isi, tambahProdi, ubahProdi)(pengguna, isi)
  throw new GalatApi('Jenis harus "fakultas" atau "prodi".')
}

async function cariFakultas(nama) {
  const f = await db.fakultas.findUnique({ where: { nama: wajib(nama, 'Fakultas') } })
  if (!f) throw new GalatApi('Fakultas tidak ditemukan.', 404)
  return f
}

function jenjangSah(jenjang) {
  if (!JENJANG.includes(jenjang)) throw new GalatApi('Jenjang harus ' + JENJANG.join(' atau ') + '.')
  return jenjang
}

/** P2002 (nama kembar) dari dua penyimpanan bersamaan menjadi 409 yang terbaca. */
async function denganNamaUnik(kerja, pesan) {
  try {
    return await kerja()
  } catch (e) {
    if (e?.code === 'P2002') throw new GalatApi(pesan, 409)
    throw e
  }
}

async function tambahFakultas(pengguna, { nama }) {
  const teks = wajib(nama, 'Nama fakultas')
  const kembar = 'Fakultas ' + teks + ' sudah ada.'
  if (await db.fakultas.findUnique({ where: { nama: teks } })) throw new GalatApi(kembar, 409)
  await denganNamaUnik(
    () =>
      db.$transaction(async (tx) => {
        await tx.fakultas.create({ data: { nama: teks } })
        await catatLog(tx, { aktorId: pengguna.id, aksi: 'TAMBAH_FAKULTAS', target: 'fakultas ' + teks, rincian: { nama: teks } })
      }),
    kembar,
  )
  return { master: await ambilAngkatanProdi() }
}

async function ubahFakultas(pengguna, { nama, namaBaru, alasan }) {
  const teksAlasan = alasanUbah(alasan)
  const f = await cariFakultas(nama)
  const baru = wajib(namaBaru, 'Nama baru fakultas')
  if (baru === f.nama) return { master: await ambilAngkatanProdi() }
  const kembar = 'Fakultas ' + baru + ' sudah ada.'
  if (await db.fakultas.findUnique({ where: { nama: baru } })) throw new GalatApi(kembar, 409)

  await denganNamaUnik(
    () =>
      db.$transaction(async (tx) => {
        await tx.fakultas.update({ where: { id: f.id }, data: { nama: baru } })
        await catatLog(tx, {
          aktorId: pengguna.id,
          aksi: 'UBAH_FAKULTAS',
          target: 'fakultas ' + f.nama,
          rincian: { sebelum: { nama: f.nama }, sesudah: { nama: baru }, alasan: teksAlasan },
        })
      }),
    kembar,
  )
  return { master: await ambilAngkatanProdi() }
}

async function tambahProdi(pengguna, { nama, jenjang, fakultas }) {
  const teks = wajib(nama, 'Nama program studi')
  const j = jenjangSah(jenjang)
  const f = await cariFakultas(fakultas)
  const kembar = 'Program studi ' + teks + ' sudah ada.'
  if (await db.programStudi.findUnique({ where: { nama: teks } })) throw new GalatApi(kembar, 409)

  await denganNamaUnik(
    () =>
      db.$transaction(async (tx) => {
        await tx.programStudi.create({ data: { nama: teks, jenjang: j, fakultasId: f.id } })
        await catatLog(tx, {
          aktorId: pengguna.id,
          aksi: 'TAMBAH_PRODI',
          target: 'prodi ' + teks,
          rincian: { nama: teks, jenjang: j, fakultas: f.nama },
        })
      }),
    kembar,
  )
  return { master: await ambilAngkatanProdi() }
}

async function ubahProdi(pengguna, { nama, namaBaru, jenjang, fakultas, alasan }) {
  const teksAlasan = alasanUbah(alasan)
  const p = await db.programStudi.findUnique({ where: { nama: wajib(nama, 'Program studi') }, include: { fakultas: true } })
  if (!p) throw new GalatApi('Program studi tidak ditemukan.', 404)

  const f = fakultas == null || fakultas === p.fakultas.nama ? p.fakultas : await cariFakultas(fakultas)
  const lama = { nama: p.nama, jenjang: p.jenjang, fakultas: p.fakultas.nama }
  const baru = {
    nama: namaBaru == null ? p.nama : wajib(namaBaru, 'Nama baru program studi'),
    jenjang: jenjang == null ? p.jenjang : jenjangSah(jenjang),
    fakultas: f.nama,
  }
  const beda = bedaIsi(lama, baru)
  if (!beda.berubah) return { master: await ambilAngkatanProdi() }
  const kembar = 'Program studi ' + baru.nama + ' sudah ada.'
  if (baru.nama !== p.nama && (await db.programStudi.findUnique({ where: { nama: baru.nama } }))) {
    throw new GalatApi(kembar, 409)
  }

  await denganNamaUnik(
    () =>
      db.$transaction(async (tx) => {
        await tx.programStudi.update({
          where: { id: p.id },
          data: { nama: baru.nama, jenjang: baru.jenjang, fakultasId: f.id },
        })
        await catatLog(tx, {
          aktorId: pengguna.id,
          aksi: 'UBAH_PRODI',
          target: 'prodi ' + p.nama,
          rincian: { sebelum: beda.sebelum, sesudah: beda.sesudah, alasan: teksAlasan },
        })
      }),
    kembar,
  )
  return { master: await ambilAngkatanProdi() }
}

/* ---------------------------------- mahasiswa ---------------------------------- */

// Tambah memakai tambahAkun() di akses.js (akun + data mahasiswa + log TAMBAH_AKUN), jadi aturannya sama persis
// dengan Akses Pengguna super admin, termasuk penolakan angkatan terkunci. Ubah mencakup nama, email, prodi, dan
// angkatan; NIM tidak bisa diubah karena UsulanEntri menyambung ke mahasiswa lewat teks NIM, bukan id, sehingga
// riwayat usulan dosen akan putus. Pindah prodi atau angkatan hanya selama mahasiswanya belum punya data penilaian:
// pindah angkatan menggeser semesternya, dan pindah prodi memindahkannya ke dosen lain.

export const kelolaMahasiswa = (pengguna, isi = {}) =>
  pilihAksi(isi, (p, i) => tambahAkun(p, { ...i, peran: 'mahasiswa' }), ubahMahasiswa)(pengguna, isi)

/** Data penilaian yang sudah menempel pada mahasiswa, sebagai [keterangan, jumlah] yang jumlahnya lebih dari nol. */
async function dataPenilaian(m) {
  const hitung = [
    ['nilai', db.nilai.count({ where: { mahasiswaId: m.id } })],
    ['pengumpulan', db.pengumpulan.count({ where: { mahasiswaId: m.id } })],
    ['pengajuan koreksi', db.pengajuanKoreksi.count({ where: { mahasiswaId: m.id } })],
    ['penguncian aspek', db.penguncian.count({ where: { mahasiswaId: m.id } })],
    ['usulan nilai dosen', db.usulanEntri.count({ where: { nim: m.nim } })],
  ]
  const jumlah = await Promise.all(hitung.map(([, n]) => n))
  return hitung.map(([ket], i) => [ket, jumlah[i]]).filter(([, n]) => n > 0)
}

async function ubahMahasiswa(pengguna, { nim, nama, email, prodi, angkatanId, alasan }) {
  const teksAlasan = alasanUbah(alasan)
  const m = await db.mahasiswa.findUnique({
    where: { nim: wajib(nim, 'NIM') },
    include: { pengguna: true, prodi: true, angkatan: true },
  })
  if (!m) throw new GalatApi('Mahasiswa dengan NIM itu tidak ditemukan.', 404)

  const emailBaru = email == null ? m.pengguna.email : wajib(email, 'Email').toLowerCase()
  if (!EMAIL_SAH.test(emailBaru)) throw new GalatApi('Format email tidak valid.')
  const prodiId = prodi == null || prodi === m.prodi.nama ? m.prodiId : await cariProdi(prodi)
  const tujuan =
    angkatanId == null || angkatanId === m.angkatanId
      ? m.angkatan
      : await db.angkatan.findUnique({ where: { id: wajib(angkatanId, 'Angkatan') } })
  if (!tujuan) throw new GalatApi('Angkatan tidak ditemukan.')

  const lama = { nama: m.nama, email: m.pengguna.email, prodi: m.prodi.nama, angkatan: m.angkatan.label }
  const baru = {
    nama: nama == null ? m.nama : wajib(nama, 'Nama'),
    email: emailBaru,
    prodi: prodiId === m.prodiId ? m.prodi.nama : String(prodi).trim(),
    angkatan: tujuan.label,
  }
  const beda = bedaIsi(lama, baru)
  if (!beda.berubah) return { mahasiswa: { nim: m.nim, ...baru } }

  if (prodiId !== m.prodiId || tujuan.id !== m.angkatanId) {
    const terkait = await dataPenilaian(m)
    if (terkait.length) {
      throw new GalatApi(
        'Prodi dan angkatan hanya bisa diubah selama mahasiswa ini belum punya data penilaian, sedangkan ia sudah punya ' +
          terkait.map(([ket, n]) => n + ' ' + ket).join(', ') +
          '.',
        409,
      )
    }
  }
  if (tujuan.id !== m.angkatanId) {
    if (m.angkatan.status === 'TERKUNCI') {
      throw new GalatApi('Angkatan ' + m.angkatan.label + ' sudah dikunci, jadi mahasiswanya tidak bisa dipindah.', 409)
    }
    if (tujuan.status === 'TERKUNCI') {
      throw new GalatApi('Angkatan ' + tujuan.label + ' sudah dikunci, jadi tidak bisa menerima mahasiswa.', 409)
    }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.mahasiswa.update({ where: { id: m.id }, data: { nama: baru.nama, prodiId, angkatanId: tujuan.id } })
      if (baru.email !== m.pengguna.email) await tx.pengguna.update({ where: { id: m.penggunaId }, data: { email: baru.email } })
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'UBAH_AKUN',
        target: 'akun ' + m.pengguna.email,
        rincian: { nim: m.nim, sebelum: beda.sebelum, sesudah: beda.sesudah, alasan: teksAlasan },
      })
    })
  } catch (e) {
    if (e?.code === 'P2002') throw new GalatApi('Email ' + baru.email + ' sudah dipakai akun lain.', 409)
    throw e
  }
  return { mahasiswa: { nim: m.nim, ...baru } }
}
