import { CONFIG, subscribeConfig } from './config.js'
import { AREA, CLUSTER, getAspekList, getKomponen, isiKurikulum } from './curriculum.js'
import { pasangPadananData } from './kamusData.js'
import { hitungTranskrip, hurufMutu } from './scoring.js'
import { pasangWewenang } from './wewenang.js'

/* Data master dari basis data, data isian mulai kosong; lihat README.md › Data dan store. */

/* ------------------------------ periode akademik -------------------------- */

/* Periode yang sedang berjalan. Isinya diganti di tempat oleh pasangPeriode() dari Konfigurasi PERIODE_AKTIF
   (super admin, /api/periode), jadi pemakainya tidak perlu tahu dari mana asalnya; lihat README.md › Periode
   akademik. Angka di sini hanya bawaan selama basis data belum menyimpan periode. */
export const PERIODE_AKTIF = { tahun: '2026/2027', semester: 'Ganjil' }

const PERIODE_BAWAAN = { ...PERIODE_AKTIF }
export const KUNCI_PERIODE = 'PERIODE_AKTIF'

/** basisData: PERIODE_AKTIF terbaca dari Konfigurasi, bukan bawaan kode (halaman Aturan Sistem). */
export const ASAL_PERIODE = { basisData: false }

const tahunAwal = (t) => Number(String(t).slice(0, 4))
const ordinal = (p) => tahunAwal(p.tahun) * 2 + (p.semester === 'Ganjil' ? 0 : 1)

export function periodeSetelah(p, n) {
  const o = ordinal(p) + n
  const th = Math.floor(o / 2)
  const ganjil = o % 2 === 0
  return { tahun: th + '/' + (th + 1), semester: ganjil ? 'Ganjil' : 'Genap' }
}

/** { tahun: '2026/2027', semester: 'Ganjil' | 'Genap' } yang sah, atau null. */
export function periodeSah(p) {
  const m = /^(\d{4})\/(\d{4})$/.exec(String(p?.tahun ?? ''))
  if (!m || Number(m[2]) !== Number(m[1]) + 1) return null
  if (p.semester !== 'Ganjil' && p.semester !== 'Genap') return null
  return { tahun: p.tahun, semester: p.semester }
}

/**
 * Mengganti PERIODE_AKTIF di tempat, jadi semua pemakainya ikut berubah; null = kembali ke bawaan kode. Server
 * memanggilnya di setiap permintaan, jadi tidak berbuat apa-apa bila periodenya sama.
 */
export function pasangPeriode(p) {
  const tersimpan = periodeSah(p)
  ASAL_PERIODE.basisData = Boolean(tersimpan)
  const baru = tersimpan ?? PERIODE_BAWAAN
  if (samaPeriode(baru, PERIODE_AKTIF)) return
  Object.assign(PERIODE_AKTIF, baru)
  // Semester angkatan disimpan saat dipasang (pasangAngkatan), jadi ikut dihitung ulang.
  for (const c of COHORTS) c.semesterAktif = turunkanSemesterAktif(c.intake)
  resetTranskripCache()
}

export const labelPeriode = (p) => p.semester + ' ' + p.tahun

export const samaPeriode = (a, b) => ordinal(a) === ordinal(b)

/*
 * Rentang tanggal tiap periode, untuk menyaring data per semester (Pusat Kendali super admin). Mengikuti
 * Kalender Akademik UMN 2026/2027 (umn.ac.id): Ganjil dibuka tambah-ganti KRS 19-20 Agustus, kuliah mulai
 * 24 Agustus, UAS 14-23 Desember, lalu remedial di Januari; Genap dibuka tambah-ganti KRS 3-5 Februari,
 * kuliah mulai 8 Februari, UAS 7-19 Juni, lalu Semester Antara sampai akhir Juli. Dibulatkan per bulan supaya
 * setahun tertutup tanpa celah; Semester Antara ikut Genap. Tanggal dalam TTTT-BB-HH WIB, sama dengan
 * penyaring /api/log.
 */
export function rentangPeriode(p) {
  const th = tahunAwal(p.tahun)
  return p.semester === 'Ganjil'
    ? { mulai: th + '-08-01', selesai: th + 1 + '-01-31' }
    : { mulai: th + 1 + '-02-01', selesai: th + 1 + '-07-31' }
}

/** Periode dari intake angkatan tertua sampai periode aktif, terbaru dulu. */
export function daftarPeriode() {
  const akhir = ordinal(PERIODE_AKTIF)
  const awal = Math.min(akhir, ...COHORTS.map((c) => ordinal(c.intake)))
  return Array.from({ length: akhir - awal + 1 }, (_, i) => periodeSetelah(PERIODE_AKTIF, -i))
}

export const periodeAngkatan = (intake) => [0, 1, 2].map((n) => periodeSetelah(intake, n))

const isiUlang = (larik, isi) => larik.splice(0, larik.length, ...(isi ?? []))

/** Semester kalender sejak masuk, TANPA dibatasi: 4 atau lebih berarti program tiga semester sudah lewat. */
export const semesterKalender = (intake, aktif = PERIODE_AKTIF) => ordinal(aktif) - ordinal(intake) + 1

/**
 * Program angkatan ini sudah lewat Semester 3. Sejak itu dosen tidak lagi menangani mahasiswanya; datanya
 * diurus Kemahasiswaan, dan perubahan oleh admin biasa menunggu persetujuan super admin.
 */
export const programSelesai = (intake, aktif = PERIODE_AKTIF) =>
  semesterKalender(intake, aktif) > CONFIG.TOTAL_SEMESTER_PROGRAM

export function turunkanSemesterAktif(intake, aktif = PERIODE_AKTIF) {
  return Math.max(1, Math.min(CONFIG.TOTAL_SEMESTER_PROGRAM, semesterKalender(intake, aktif)))
}

/* Isi awal hanya dipakai bila basis data tak terhubung, dan menjadi sumber npm run db:seed. */

/* --------------------------------- angkatan ------------------------------- */

const ANGKATAN_AWAL = [
  { id: '2026', angkatan: 2026, label: '2026', intake: { tahun: '2026/2027', semester: 'Ganjil' }, status: 'aktif' },
  { id: '2025B', angkatan: 2025, label: '2025 Genap', intake: { tahun: '2025/2026', semester: 'Genap' }, status: 'aktif' },
  { id: '2025', angkatan: 2025, label: '2025', intake: { tahun: '2025/2026', semester: 'Ganjil' }, status: 'aktif' },
  { id: '2024', angkatan: 2024, label: '2024', intake: { tahun: '2024/2025', semester: 'Ganjil' }, status: 'terkunci' },
]

/* Larik di berkas ini diisi ulang di tempat, bukan diganti: halaman memegang rujukannya. */
export const COHORTS = []

/* Angkatan yang disembunyikan server dari akun yang sedang masuk: bagi admin biasa, angkatan lewat Semester 3 yang
   belum dibuka dan angkatan Semester 1–3 yang dinonaktifkan Super Admin (angkatanTersembunyi di src/server/muat.js).
   Disaring di sini, saat COHORTS diisi, jadi semua halaman yang membaca COHORTS ikut tanpa menyaring sendiri.
   Mahasiswa dan nilainya sudah tidak dikirim server. */
export const ANGKATAN_TERSEMBUNYI = []
let angkatanSemua = []

function pasangAngkatan(daftar) {
  angkatanSemua = daftar
  const urut = [...daftar].filter((a) => !ANGKATAN_TERSEMBUNYI.includes(a.id)).sort((a, b) => ordinal(b.intake) - ordinal(a.intake))
  isiUlang(
    COHORTS,
    urut.map((a) => ({
      ...a,
      semesterAktif: turunkanSemesterAktif(a.intake),
      periode: periodeAngkatan(a.intake),
    })),
  )
}

export const getAngkatan = (id) => COHORTS.find((c) => c.id === id) ?? null

/** Dipanggil setiap /api/data tiba (dan saat keluar, dengan []): `ids` angkatan yang disembunyikan untuk akun ini. */
export function batasiAngkatan(ids) {
  const baru = Array.isArray(ids) ? ids : []
  if (baru.join() === ANGKATAN_TERSEMBUNYI.join()) return
  isiUlang(ANGKATAN_TERSEMBUNYI, baru)
  pasangAngkatan(angkatanSemua)
}

/* ------------------------------ fakultas & prodi -------------------------- */

/* Contoh dua kelas di setiap prodi (12 Nov 2026), untuk mode lokal dan seed. Basis data yang sudah ada mendapatnya dari
   migrasi 20261112150000_kelas_prodi. Nama tanpa kata "Kelas"; layar menulis "Kelas A". Mahasiswa membawa nama kelasnya
   (`kelas`, null = belum dimasukkan ke kelas) dan dosen kelas yang diampunya (`kelas` di dosenSesi), sejak 13 Nov 2026. */
const KELAS_CONTOH = ['A', 'B']

const FAKULTAS_AWAL = [
  {
    name: 'Teknik & Informatika',
    programs: [
      { nama: 'Informatika', jenjang: 'S1' },
      { nama: 'Sistem Informasi', jenjang: 'S1' },
      { nama: 'Teknik Komputer', jenjang: 'S1' },
      { nama: 'Teknik Elektro', jenjang: 'S1' },
      { nama: 'Teknik Fisika', jenjang: 'S1' },
    ],
  },
  {
    name: 'Ilmu Komunikasi',
    programs: [
      { nama: 'Komunikasi Strategis', jenjang: 'S1' },
      { nama: 'Jurnalistik', jenjang: 'S1' },
      { nama: 'Ilmu Komunikasi (PJJ)', jenjang: 'S1' },
    ],
  },
  {
    name: 'Seni & Desain',
    programs: [
      { nama: 'Desain Komunikasi Visual', jenjang: 'S1' },
      { nama: 'Film & Animasi', jenjang: 'S1' },
      { nama: 'Arsitektur', jenjang: 'S1' },
    ],
  },
  {
    name: 'Bisnis',
    programs: [
      { nama: 'Akuntansi', jenjang: 'S1' },
      { nama: 'Manajemen', jenjang: 'S1' },
      { nama: 'Perhotelan', jenjang: 'D3' },
    ],
  },
].map((f) => ({ ...f, programs: f.programs.map((p) => ({ ...p, kelas: [...KELAS_CONTOH] })) }))

export const FACULTIES = []
export const PROGRAMS = []
export const FACULTY_OF = {}
export const JENJANG_OF = {}

export const FAKULTAS_OF = {}

const isiPeta = (peta, pasangan) => {
  for (const k of Object.keys(peta)) delete peta[k]
  Object.assign(peta, Object.fromEntries(pasangan))
}

function pasangFakultas(daftar) {
  isiUlang(FACULTIES, daftar)
  isiUlang(
    PROGRAMS,
    daftar.flatMap((f) =>
      f.programs.map((p) => ({ program: p.nama, namaEn: p.namaEn, jenjang: p.jenjang, faculty: f.name, kelas: p.kelas ?? [] })),
    ),
  )
  isiPeta(FACULTY_OF, PROGRAMS.map((p) => [p.program, p.faculty]))
  isiPeta(JENJANG_OF, PROGRAMS.map((p) => [p.program, p.jenjang]))
  isiPeta(FAKULTAS_OF, PROGRAMS.map((p) => [p.program, p.faculty]))
}

export function programStudi(faculty = 'Semua') {
  return (faculty === 'Semua' ? PROGRAMS : PROGRAMS.filter((p) => p.faculty === faculty)).map((p) => p.program)
}

/* --------------------------- pemasangan data master ----------------------- */

export const MASTER_AWAL = { angkatan: ANGKATAN_AWAL, fakultas: FAKULTAS_AWAL }

export function isiMaster({ angkatan, fakultas, kurikulum, periode, wewenang } = {}) {
  // null = basis data belum menyimpan periode: kembali ke bawaan dari kode.
  if (periode !== undefined) pasangPeriode(periode)
  // Sakelar wewenang yang ditutup Super Admin (src/lib/wewenang.js); null = tidak terbaca, semuanya terbuka di layar.
  if (wewenang !== undefined) pasangWewenang(wewenang)
  if (angkatan) pasangAngkatan(angkatan)
  if (fakultas) pasangFakultas(fakultas)
  // Nama yang diketik dari layar, jadi layar cukup memanggil t(s.program); lihat kamusData.js.
  pasangPadananData('master', [
    ...angkatanSemua.map((a) => [a.label, a.labelEn]),
    ...FACULTIES.flatMap((f) => [[f.name, f.namaEn], ...f.programs.map((p) => [p.nama, p.namaEn])]),
  ])
  // null = basis data belum di-seed: kurikulum dan CONFIG kembali ke isi dari kode.
  if (kurikulum !== undefined) isiKurikulum(kurikulum ?? {})
  resetTranskripCache()
}

pasangAngkatan(ANGKATAN_AWAL)
pasangFakultas(FAKULTAS_AWAL)

/* -------------------------------- data isian ------------------------------ */

export const STUDENTS = []
export const AUDIT_LOG = []
export const PENGAJUAN_KOREKSI = []
export const PENGUMPULAN = []
export const USULAN_AWAL = []
export const BATCH_IMPORT = []

/** Mengganti seluruh data isian; kunci yang tidak disebut ikut dikosongkan. Mode lokal: panggil bersihkanPerubahan() sesudahnya. */
export function isiData({ mahasiswa, audit, koreksi, pengumpulan, usulan, batchImport } = {}) {
  isiUlang(STUDENTS, mahasiswa)
  isiUlang(AUDIT_LOG, audit)
  isiUlang(PENGAJUAN_KOREKSI, koreksi)
  isiUlang(PENGUMPULAN, pengumpulan)
  isiUlang(USULAN_AWAL, usulan)
  isiUlang(BATCH_IMPORT, batchImport)
  resetTranskripCache()
}

export const getStudent = (id) => STUDENTS.find((s) => s.id === id) ?? null
export const getStudentByNim = (nim) => STUDENTS.find((s) => s.nim === String(nim).trim()) ?? null

export const auditUntuk = (nim) => AUDIT_LOG.filter((l) => l.nim === nim)

export function komponenDosen(dosen) {
  if (!dosen) return []
  return getAspekList()
    .filter((a) => a.semester === dosen.semester)
    .flatMap((a) => getKomponen(a.id))
    .filter((k) => k.sumber === dosen.sumber)
}

/**
 * Mahasiswa kelas dosen: anggota kelas yang diampu bila Super Admin sudah memilihnya (`dosen.kelas`: [{ prodi, nama }],
 * boleh di beberapa prodi; sejak 13 Nov 2026), atau tanpa pilihan, mahasiswa prodi dosen apa pun kelasnya. Lalu angkatan
 * yang diampu bila Super Admin sudah memilihnya (termasuk angkatan yang programnya sudah selesai), atau tanpa pilihan, yang
 * sudah sampai semester kelas itu dan programnya belum lewat Semester 3. Data dari server sudah tersaring dengan aturan
 * yang sama (diKelasDosen di src/server/muat.js); mode lokal memuat semua mahasiswa, jadi disaring di sini.
 */
export function mahasiswaKelas(dosen) {
  if (!dosen) return []
  const diKelas = dosen.kelas?.length
    ? (s) => dosen.kelas.some((k) => k.prodi === s.program && k.nama === s.kelas)
    : (s) => s.program === dosen.prodi
  if (dosen.angkatan?.length) return STUDENTS.filter((s) => diKelas(s) && dosen.angkatan.includes(s.angkatanId))
  return STUDENTS.filter(
    (s) => diKelas(s) && s.semesterAktif >= dosen.semester && !(s.periode?.[0] && programSelesai(s.periode[0])),
  )
}

/**
 * Cakupan kelas dosen sebagai teks: kelas yang diampu ("Sistem Informasi Kelas A, Informatika Kelas B"), atau tanpa
 * pilihan kelas, nama prodinya. `t`: penerjemah bahasa aktif. Dipakai panel dosen di tempat nama prodi dulu ditulis.
 */
export function cakupanKelasDosen(dosen, t = (teks, isi) => teks.replace(/\{(\w+)\}/g, (_, k) => isi?.[k] ?? '')) {
  if (!dosen) return ''
  if (!dosen.kelas?.length) return t(dosen.prodi)
  return dosen.kelas.map((k) => t('{prodi} Kelas {nama}', { prodi: k.prodi, nama: k.nama })).join(', ')
}

/* --------------------------- akun yang sedang masuk ----------------------- */

/* Identitas dari sesi (basis data); orang yang belum ada di data isian tampil tanpa nilai. */

export function mahasiswaSesi(user) {
  if (!user) return null
  return (
    getStudent(user.studentId) ??
    (user.nim ? getStudentByNim(user.nim) : null) ??
    mahasiswaDariSesi(user)
  )
}

function mahasiswaDariSesi(user) {
  const angkatan = getAngkatan(user.cohort)
  const semesterAktif = angkatan?.semesterAktif ?? user.semesterAktif ?? 1
  const intake = angkatan?.intake ?? periodeSetelah(PERIODE_AKTIF, 1 - semesterAktif)
  const program = user.subtitle ?? ''
  return {
    id: user.studentId ?? user.nim ?? user.email,
    nim: user.nim ?? '',
    name: user.name ?? '',
    email: user.email ?? '',
    program,
    faculty: FAKULTAS_OF[program] ?? '',
    jenjang: JENJANG_OF[program] ?? 'S1',
    angkatan: angkatan?.angkatan ?? tahunAwal(intake.tahun),
    angkatanId: angkatan?.id ?? user.cohort ?? null,
    angkatanLabel: angkatan?.label ?? '',
    semesterAktif,
    statusAngkatan: angkatan?.status ?? 'aktif',
    periode: angkatan?.periode ?? periodeAngkatan(intake),
    nilai: {},
    penguncian: {},
  }
}

export function dosenSesi(user) {
  if (user?.role !== 'dosen' || !user.nip) return null
  return {
    nip: user.nip,
    nama: user.name ?? user.nip,
    email: user.email ?? '',
    inisial: user.initials ?? '',
    jabatan: user.subtitle ?? '',
    sumber: user.sumber,
    semester: user.semester,
    prodi: user.prodi,
    fakultas: user.fakultas ?? FAKULTAS_OF[user.prodi] ?? '',
    angkatan: user.angkatan ?? [],
    // Kelas yang diampu: [{ prodi, nama }]; kosong = semua mahasiswa prodinya. Lihat mahasiswaKelas di atas.
    kelas: user.kelas ?? [],
  }
}

/* ------------------------------- transkrip ------------------------------- */

let cache = new Map()
subscribeConfig(() => {
  cache = new Map()
})

export function resetTranskripCache() {
  cache = new Map()
}

export function transkripOf(student) {
  if (!student) return null
  const kunci = student.id
  if (!cache.has(kunci)) cache.set(kunci, hitungTranskrip(student))
  return cache.get(kunci)
}

export const nilaiAkhirOf = (student) => transkripOf(student).akhir

/* ------------------------------ agregasi admin ---------------------------- */

/** `t`: penerjemah bahasa aktif, supaya prodi juga ketemu lewat nama yang tertulis di layar. */
export function filterStudents({ faculty = 'Semua', program = 'Semua', angkatan = 'Semua', semester = 'Semua', query = '' } = {}, t = (x) => x) {
  const q = query.trim().toLowerCase()
  return STUDENTS.filter(
    (s) =>
      (faculty === 'Semua' || s.faculty === faculty) &&
      (program === 'Semua' || s.program === program) &&
      (angkatan === 'Semua' || s.angkatanId === angkatan) &&
      (semester === 'Semua' || String(s.semesterAktif) === String(semester)) &&
      (!q || s.name.toLowerCase().includes(q) || s.nim.includes(q) || s.program.toLowerCase().includes(q) || t(s.program).toLowerCase().includes(q)),
  )
}

const rerataAman = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null)

export function ringkas(rows) {
  const akhir = rows.map((s) => transkripOf(s).akhir)
  const bernilai = akhir.filter((a) => a.nilai != null)
  const huruf = { A: 0, B: 0, C: 0, D: 0, belum: 0 }
  for (const a of bernilai) {
    const h = hurufMutu(a.nilai)
    if (h?.huruf) huruf[h.huruf]++
    else huruf.belum++
  }
  return {
    total: rows.length,
    rata: rerataAman(bernilai.map((a) => a.nilai)),
    huruf,
    final: akhir.filter((a) => a.status === 'final').length,
    diAtasAmbang: bernilai.filter((a) => a.nilai >= CONFIG.AMBANG_SERTIFIKAT).length,
  }
}

export function rataAspek(rows) {
  return getAspekList().map((a) => {
    const nilai = rows.map((s) => transkripOf(s).aspekById[a.id]?.nilai).filter((n) => n != null)
    return { ...a, nilai: rerataAman(nilai), dinilai: nilai.length, total: rows.length }
  })
}

export function rataCluster(rows) {
  return CLUSTER.map((c) => {
    const nilai = rows.map((s) => transkripOf(s).cluster[c.id]?.nilai).filter((n) => n != null)
    return { cluster: c, nilai: rerataAman(nilai), dinilai: nilai.length, total: rows.length }
  })
}

export function rataArea(rows) {
  return AREA.map((a) => {
    const nilai = rows.map((s) => transkripOf(s).area[a.id]?.nilai).filter((n) => n != null)
    return { area: a, nilai: rerataAman(nilai), dinilai: nilai.length, total: rows.length }
  })
}

export function byProgram(rows) {
  const map = new Map()
  for (const s of rows) {
    if (!map.has(s.program)) map.set(s.program, [])
    map.get(s.program).push(s)
  }
  return [...map.entries()]
    .map(([program, list]) => ({
      program,
      faculty: FACULTY_OF[program],
      jenjang: JENJANG_OF[program],
      total: list.length,
      ...ringkas(list),
    }))
    .sort((a, b) => (b.rata ?? 0) - (a.rata ?? 0))
}

export function byAngkatan(rows) {
  return COHORTS.map((c) => {
    const list = rows.filter((s) => s.angkatanId === c.id)
    return { angkatan: c, total: list.length, ...ringkas(list) }
  })
}

export function kelengkapanMatriks(rows) {
  const hasil = []
  for (let sem = 1; sem <= CONFIG.TOTAL_SEMESTER_PROGRAM; sem++) {
    const aspek = getAspekList().filter((a) => a.semester === sem)
    const baris = { semester: sem, sumber: {} }
    for (const sumber of ['PDP', 'MK', 'ENGAGEMENT']) {
      let terisi = 0
      let total = 0
      for (const s of rows) {
        if (s.semesterAktif < sem) continue
        for (const a of aspek) {
          for (const k of getKomponen(a.id)) {
            if (k.sumber !== sumber) continue
            total++
            if (s.nilai?.[a.id]?.komponen?.[k.id]?.nilai != null) terisi++
          }
        }
      }
      baris.sumber[sumber] = { terisi, total, persen: total ? Math.round((terisi / total) * 100) : null }
    }
    hasil.push(baris)
  }
  return hasil
}

export function pekerjaanPenilaian(rows = STUDENTS) {
  const hasil = []

  for (const c of COHORTS) {
    const mhs = rows.filter((s) => s.angkatanId === c.id)
    if (!mhs.length) continue

    for (let sem = 1; sem <= CONFIG.TOTAL_SEMESTER_PROGRAM; sem++) {
      if (c.semesterAktif < sem) continue
      const aspek = getAspekList().filter((a) => a.semester === sem)

      for (const sumber of ['PDP', 'MK', 'ENGAGEMENT']) {
        let kosong = 0
        const aspekKurang = []
        const mhsKurang = new Set()

        for (const a of aspek) {
          const komponen = getKomponen(a.id).filter((k) => k.sumber === sumber)
          if (!komponen.length) continue
          let kurangDiAspek = false
          for (const s of mhs) {
            for (const k of komponen) {
              if (s.nilai?.[a.id]?.komponen?.[k.id]?.nilai == null) {
                kosong++
                kurangDiAspek = true
                mhsKurang.add(s.nim)
              }
            }
          }
          if (kurangDiAspek) aspekKurang.push(a)
        }

        if (kosong) {
          hasil.push({
            id: c.id + '-S' + sem + '-' + sumber,
            angkatan: c,
            semester: sem,
            sumber,
            kosong,
            mahasiswa: mhsKurang.size,
            nimTunggal: mhsKurang.size === 1 ? [...mhsKurang][0] : null,
            aspek: aspekKurang,
          })
        }
      }
    }
  }

  return hasil.sort((a, b) => b.kosong - a.kosong)
}

export function perluDitinjau(rows = STUDENTS) {
  const dibawahAmbang = rows.filter((s) => {
    if (s.semesterAktif < CONFIG.TOTAL_SEMESTER_PROGRAM) return false
    const n = transkripOf(s).akhir.nilai
    return n != null && n < CONFIG.AMBANG_SERTIFIKAT
  }).length

  const siapDikunci = COHORTS.filter(
    (c) =>
      c.status === 'aktif' &&
      c.semesterAktif >= CONFIG.TOTAL_SEMESTER_PROGRAM &&
      rows.some((s) => s.angkatanId === c.id),
  ).length

  return { dibawahAmbang, siapDikunci }
}
