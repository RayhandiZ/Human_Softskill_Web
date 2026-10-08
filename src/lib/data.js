import { CONFIG, subscribeConfig } from './config.js'
import { AREA, CLUSTER, getAspekList, getKomponen } from './curriculum.js'
import { hitungTranskrip, hurufMutu } from './scoring.js'

/* Data master dari basis data, data isian mulai kosong; lihat README.md › Data dan store. */

/* ------------------------------ periode akademik -------------------------- */

export const PERIODE_AKTIF = { tahun: '2026/2027', semester: 'Ganjil' }

const tahunAwal = (t) => Number(String(t).slice(0, 4))
const ordinal = (p) => tahunAwal(p.tahun) * 2 + (p.semester === 'Ganjil' ? 0 : 1)

function periodeSetelah(p, n) {
  const o = ordinal(p) + n
  const th = Math.floor(o / 2)
  const ganjil = o % 2 === 0
  return { tahun: th + '/' + (th + 1), semester: ganjil ? 'Ganjil' : 'Genap' }
}

export const labelPeriode = (p) => p.semester + ' ' + p.tahun

export const periodeAngkatan = (intake) => [0, 1, 2].map((n) => periodeSetelah(intake, n))

const isiUlang = (larik, isi) => larik.splice(0, larik.length, ...(isi ?? []))

export function turunkanSemesterAktif(intake, aktif = PERIODE_AKTIF) {
  const jarak = ordinal(aktif) - ordinal(intake) + 1
  return Math.max(1, Math.min(CONFIG.TOTAL_SEMESTER_PROGRAM, jarak))
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

function pasangAngkatan(daftar) {
  const urut = [...daftar].sort((a, b) => ordinal(b.intake) - ordinal(a.intake))
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

/* ------------------------------ fakultas & prodi -------------------------- */

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
]

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
    daftar.flatMap((f) => f.programs.map((p) => ({ program: p.nama, jenjang: p.jenjang, faculty: f.name }))),
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

export function isiMaster({ angkatan, fakultas } = {}) {
  if (angkatan) pasangAngkatan(angkatan)
  if (fakultas) pasangFakultas(fakultas)
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

export const pengumpulanDosen = (nip) => PENGUMPULAN.filter((p) => p.dosenNip === nip)

export function komponenDosen(dosen) {
  if (!dosen) return []
  return getAspekList()
    .filter((a) => a.semester === dosen.semester)
    .flatMap((a) => getKomponen(a.id))
    .filter((k) => k.sumber === dosen.sumber)
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

export function filterStudents({ faculty = 'Semua', program = 'Semua', angkatan = 'Semua', semester = 'Semua', query = '' } = {}) {
  const q = query.trim().toLowerCase()
  return STUDENTS.filter(
    (s) =>
      (faculty === 'Semua' || s.faculty === faculty) &&
      (program === 'Semua' || s.program === program) &&
      (angkatan === 'Semua' || s.angkatanId === angkatan) &&
      (semester === 'Semua' || String(s.semesterAktif) === String(semester)) &&
      (!q || s.name.toLowerCase().includes(q) || s.nim.includes(q) || s.program.toLowerCase().includes(q)),
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
