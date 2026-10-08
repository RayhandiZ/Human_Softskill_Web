import { CONFIG } from './config.js'

/* --------------------------------------------------------------------------
   Struktur kurikulum enam lapis — sumber kebenaran statis.

     Fase (2) → Area (3) → Cluster (6) → Aspek CPMK (10)
              → Komponen Asesmen → Indikator Perilaku

   Aspek CPMK adalah unit penilaian atom. Fase, area, dan cluster tidak pernah
   diinput; nilainya selalu diagregasi naik dari aspek.

   Warna: identitas visual hanya dibawa oleh AREA (tiga slot kategorikal yang
   sudah tervalidasi di index.css). Cluster dan aspek tidak punya warna sendiri
   — keduanya dikenali lewat kode dan label, bukan hue. Ini menjaga agar grafik
   satu seri (radar 6 sumbu, bar 10 aspek) tidak berubah jadi pelangi.
   -------------------------------------------------------------------------- */

export const SUMBER = {
  PDP: { id: 'PDP', label: 'PDP', nama: 'Personal Development Program' },
  MK: { id: 'MK', label: 'MK Humaniora', nama: 'Mata Kuliah Humaniora / Kebangsaan' },
  ENGAGEMENT: { id: 'ENGAGEMENT', label: 'Kemahasiswaan', nama: 'Student Service & Engagement' },
}

export const SUMBER_LIST = [SUMBER.PDP, SUMBER.MK, SUMBER.ENGAGEMENT]

export const JENIS_MK = ['TUGAS', 'SIKAP', 'UTS', 'UAS']

export const RANAH = {
  kognitif: { id: 'kognitif', label: 'Kognitif' },
  afektif: { id: 'afektif', label: 'Afektif' },
}

/* ------------------------------------ fase -------------------------------- */

export const FASE = [
  {
    id: 'F1',
    nomor: 1,
    nama: 'Internal Foundation & Self-Management',
    ringkas: 'Membangun fondasi karakter, pengendalian diri, dan cara berpikir.',
    area: ['A'],
  },
  {
    id: 'F2',
    nomor: 2,
    nama: 'Interpersonal & Professional Excellence',
    ringkas: 'Membawa fondasi itu ke dalam relasi kerja dan peran profesional.',
    area: ['B', 'C'],
  },
]

/* ------------------------------------ area -------------------------------- */

export const AREA = [
  {
    id: 'A',
    nama: 'Personal Development',
    fase: 'F1',
    warna: 'var(--c1)',
    ringkas: 'Pengembangan diri: etika, pengendalian emosi, kemandirian, dan penalaran.',
  },
  {
    id: 'B',
    nama: 'Interpersonal Development',
    fase: 'F2',
    warna: 'var(--c2)',
    ringkas: 'Pengembangan relasi: kolaborasi, kepercayaan, empati, dan penanganan konflik.',
  },
  {
    id: 'C',
    nama: 'Professional Career Development',
    fase: 'F2',
    warna: 'var(--c3)',
    ringkas: 'Pengembangan peran profesional: kepemimpinan dan kewargaan organisasi.',
  },
]

/* ---------------------------------- cluster ------------------------------- */

export const CLUSTER = [
  { id: 'CL1', nama: 'Ethical Foundation & Self-Discipline', area: 'A', aspek: ['A1', 'A3'] },
  { id: 'CL2', nama: 'Emotional Self-Regulation', area: 'A', aspek: ['A2'] },
  { id: 'CL3', nama: 'Cognitive Judgment & Analysis', area: 'A', aspek: ['A4'] },
  { id: 'CL4', nama: 'Collaborative Execution & Trust', area: 'B', aspek: ['B1', 'B2'] },
  { id: 'CL5', nama: 'Empathic Communication & Conflict Navigation', area: 'B', aspek: ['B3', 'B4'] },
  { id: 'CL6', nama: 'Influential Leadership & Citizenship', area: 'C', aspek: ['C1', 'C2'] },
]

/* ------------------------------- aspek CPMK ------------------------------- */

/* Semester A.3 dan C.1 sengaja tidak ditulis di sini — keduanya masih menunggu
   konfirmasi unit pengelola dan dibaca dari config.js (lihat resolveSemester). */

const ASPEK_DASAR = [
  {
    id: 'A1',
    kode: 'A.1.',
    nama: 'UMN Character & Ethical Foundation',
    fase: 'F1',
    area: 'A',
    cluster: 'CL1',
    semester: 1,
    pdp: 'PDP-1',
    mk: 'Religiositas',
    engagement: 'Mentoring 5C',
    deskripsi:
      'Menerapkan prinsip integritas, kejujuran, tanggung jawab, dan etika profesional dalam pengambilan keputusan serta pelaksanaan tanggung jawab akademik dan profesional.',
  },
  {
    id: 'A2',
    kode: 'A.2.',
    nama: 'Emotional Self-Regulation',
    fase: 'F1',
    area: 'A',
    cluster: 'CL2',
    semester: 1,
    pdp: 'PDP-1',
    mk: 'Religiositas',
    engagement: 'Mentoring 5C',
    deskripsi:
      'Mengelola emosi, stres, dan tekanan secara adaptif serta menunjukkan ketangguhan dan pengendalian diri dalam menghadapi perubahan dan tantangan.',
  },
  {
    id: 'A3',
    kode: 'A.3.',
    nama: 'Self-Direction & Discipline',
    fase: 'F1',
    area: 'A',
    cluster: 'CL1',
    semester: null, // dari CONFIG.ASPEK_A3_SEMESTER
    pdp: 'PDP-1',
    mk: 'Religiositas',
    engagement: 'Mentoring 5C',
    deskripsi:
      'Menunjukkan profesionalisme melalui tanggung jawab, komunikasi efektif, dan integritas, serta mampu bekerja sama, memimpin, mengelola diri, dan menghadapi tantangan kerja secara mandiri.',
  },
  {
    id: 'A4',
    kode: 'A.4.',
    nama: 'Cognitive Judgment',
    fase: 'F1',
    area: 'A',
    cluster: 'CL3',
    semester: 2,
    pdp: 'PDP-2',
    mk: 'Pancasila',
    engagement: 'Teamwork & Leadership',
    deskripsi:
      'Menunjukkan kemampuan berpikir analitis, pemecahan masalah, dan pengambilan keputusan yang logis dan sistematis berdasarkan data serta konteks situasional.',
  },
  {
    id: 'B1',
    kode: 'B.1.',
    nama: 'Collaborative Execution',
    fase: 'F2',
    area: 'B',
    cluster: 'CL4',
    semester: 2,
    pdp: 'PDP-2',
    mk: 'Pancasila',
    engagement: 'Teamwork & Leadership',
    deskripsi:
      'Menunjukkan kerja tim yang efektif, beradaptasi dengan dinamika kelompok, berkontribusi pada tujuan bersama, dan luwes dalam mengambil peran.',
  },
  {
    id: 'B2',
    kode: 'B.2.',
    nama: 'Trust & Respect Building',
    fase: 'F2',
    area: 'B',
    cluster: 'CL4',
    semester: 2,
    pdp: 'PDP-2',
    mk: 'Pancasila',
    engagement: 'Teamwork & Leadership',
    deskripsi:
      'Membangun kepercayaan, menghargai perbedaan, menepati komitmen, dan menunjukkan rasa hormat kepada rekan dan atasan.',
  },
  {
    id: 'B3',
    kode: 'B.3.',
    nama: 'Empathic Exchange',
    fase: 'F2',
    area: 'B',
    cluster: 'CL5',
    semester: 3,
    pdp: 'PDP-3',
    mk: 'Civics',
    engagement: 'Effective Communication',
    deskripsi:
      'Mendengarkan secara aktif, memahami perspektif orang lain, menyampaikan pesan dengan jelas, dan membangun komunikasi dua arah yang efektif.',
  },
  {
    id: 'B4',
    kode: 'B.4.',
    nama: 'Conflict Navigation',
    fase: 'F2',
    area: 'B',
    cluster: 'CL5',
    semester: 3,
    pdp: 'PDP-3',
    mk: 'Civics',
    engagement: 'Effective Communication',
    deskripsi:
      'Menyelesaikan konflik secara konstruktif, menegosiasikan solusi menang-menang, menengahi perbedaan, dan menjaga profesionalisme saat terjadi ketegangan.',
  },
  {
    id: 'C1',
    kode: 'C.1.',
    nama: 'Influential Leadership',
    fase: 'F2',
    area: 'C',
    cluster: 'CL6',
    semester: null, // dari CONFIG.ASPEK_C1_SEMESTER
    pdp: 'PDP-2',
    mk: 'Pancasila',
    engagement: 'Teamwork & Leadership',
    deskripsi:
      'Menunjukkan kepemimpinan awal dengan memimpin tim, mendelegasikan, memotivasi rekan, menyelaraskan upaya tim dengan visi, dan mengambil keputusan yang bertanggung jawab.',
  },
  {
    id: 'C2',
    kode: 'C.2.',
    nama: 'Organizational Citizenship',
    fase: 'F2',
    area: 'C',
    cluster: 'CL6',
    semester: 3,
    pdp: 'PDP-3',
    mk: 'Civics',
    engagement: 'Effective Communication',
    deskripsi:
      'Menjunjung perilaku kerja profesional, menaati budaya organisasi, menunjukkan tanggung jawab sosial di tempat kerja, dan mematuhi etika institusi.',
  },
]

/** Aspek yang penempatan semesternya masih menunggu keputusan unit pengelola. */
export const ASPEK_SEMESTER_SEMENTARA = {
  A3: 'ASPEK_A3_SEMESTER',
  C1: 'ASPEK_C1_SEMESTER',
}

function resolveSemester(aspek) {
  const kunci = ASPEK_SEMESTER_SEMENTARA[aspek.id]
  return kunci ? CONFIG[kunci] : aspek.semester
}

/** Daftar aspek dengan semester yang sudah diselesaikan dari config. */
export function getAspekList() {
  return ASPEK_DASAR.map((a) => ({
    ...a,
    semester: resolveSemester(a),
    semesterSementara: Boolean(ASPEK_SEMESTER_SEMENTARA[a.id]),
  }))
}

export function getAspek(id) {
  return getAspekList().find((a) => a.id === id) ?? null
}

export function getAspekSemester(semester) {
  return getAspekList().filter((a) => a.semester === semester)
}

/** { 1: 3, 2: 4, 3: 3 } — dipakai untuk memeriksa distribusi 3/4/3. */
export function distribusiSemester() {
  const hasil = {}
  for (let s = 1; s <= CONFIG.TOTAL_SEMESTER_PROGRAM; s++) hasil[s] = getAspekSemester(s).length
  return hasil
}

/* --------------------------- komponen asesmen ----------------------------- */

/* bobot: null berarti diturunkan dari CONFIG (lihat scoring.js). Angka eksplisit
   hanya dipakai bila unit pengelola ingin menimpa pembagian bawaan.
   jenis: wajib untuk sumber MK, dipakai memetakan CONFIG.BOBOT_KOMPONEN_MK. */

const k = (id, aspekId, sumber, label, ranah, status, jenis = null) => ({
  id,
  aspekId,
  sumber,
  jenis,
  label,
  ranah,
  bobot: null,
  status,
})

export const KOMPONEN = [
  /* ---- A.1 — resmi ---- */
  k('A1-PDP-T2', 'A1', 'PDP', 'Tugas 2: Video "Saya & Kebiasaan"', 'kognitif', 'resmi'),
  k('A1-MK-T1', 'A1', 'MK', 'Tugas 1: Nilai Refleksi Proposal SLH', 'kognitif', 'resmi', 'TUGAS'),
  k('A1-MK-SIKAP', 'A1', 'MK', 'Sikap: nilai dosen + peer review 2 aspek', 'afektif', 'resmi', 'SIKAP'),
  k('A1-MK-UAS', 'A1', 'MK', 'UAS: Nilai laporan SLH', 'kognitif', 'resmi', 'UAS'),
  k('A1-ENG-HADIR', 'A1', 'ENGAGEMENT', 'Mentoring 5C: Kehadiran', 'afektif', 'resmi'),

  /* ---- A.2 — resmi ---- */
  k('A2-PDP-T1', 'A2', 'PDP', 'Tugas 1: Refleksi Diri', 'kognitif', 'resmi'),
  k('A2-PDP-T3', 'A2', 'PDP', 'Tugas 3: Video "Be Proactive"', 'kognitif', 'resmi'),
  k('A2-MK-T2', 'A2', 'MK', 'Tugas 2: Pelaksanaan Proyek SLH', 'kognitif', 'resmi', 'TUGAS'),
  k('A2-MK-SIKAP', 'A2', 'MK', 'Sikap: nilai dosen + peer review 2 aspek', 'afektif', 'resmi', 'SIKAP'),
  k('A2-MK-UTS', 'A2', 'MK', 'UTS: Refleksi Pribadi', 'kognitif', 'resmi', 'UTS'),
  k('A2-MK-UAS', 'A2', 'MK', 'UAS: Refleksi Pribadi', 'kognitif', 'resmi', 'UAS'),
  k('A2-ENG-REFLEKSI', 'A2', 'ENGAGEMENT', 'Mentoring 5C: Refleksi Pribadi 5C', 'afektif', 'resmi'),

  /* ---- A.3 — draft (belum ada komponen resmi di dokumen sumber) ---- */
  k('A3-PDP-T', 'A3', 'PDP', 'Tugas: Rencana pengembangan diri', 'kognitif', 'draft'),
  k('A3-MK-T', 'A3', 'MK', 'Tugas: Peer-assessment PBL', 'afektif', 'draft', 'TUGAS'),
  k('A3-MK-SIKAP', 'A3', 'MK', 'Sikap: Kedisiplinan & kemandirian', 'afektif', 'draft', 'SIKAP'),
  k('A3-MK-UAS', 'A3', 'MK', 'UAS: Refleksi kemandirian', 'kognitif', 'draft', 'UAS'),
  k('A3-ENG-PARTISIPASI', 'A3', 'ENGAGEMENT', 'Mentoring 5C: Partisipasi', 'afektif', 'draft'),

  /* ---- A.4 — draft ---- */
  k('A4-PDP-T', 'A4', 'PDP', 'Tugas: Studi kasus pengambilan keputusan', 'kognitif', 'draft'),
  k('A4-MK-T', 'A4', 'MK', 'Tugas: Analisis kasus kebangsaan', 'kognitif', 'draft', 'TUGAS'),
  k('A4-MK-SIKAP', 'A4', 'MK', 'Sikap: Ketelitian & penalaran', 'afektif', 'draft', 'SIKAP'),
  k('A4-MK-UTS', 'A4', 'MK', 'UTS: Ujian analisis', 'kognitif', 'draft', 'UTS'),
  k('A4-ENG-FASILITATOR', 'A4', 'ENGAGEMENT', 'Teamwork & Leadership: Penilaian fasilitator', 'afektif', 'draft'),

  /* ---- B.1 — draft ---- */
  k('B1-PDP-T', 'B1', 'PDP', 'Tugas: Kontribusi dalam kelompok', 'kognitif', 'draft'),
  k('B1-MK-T', 'B1', 'MK', 'Tugas: Proyek kelompok kebangsaan', 'kognitif', 'draft', 'TUGAS'),
  k('B1-MK-SIKAP', 'B1', 'MK', 'Sikap: Peer-assessment kelompok', 'afektif', 'draft', 'SIKAP'),
  k('B1-MK-UAS', 'B1', 'MK', 'UAS: Laporan kerja kelompok', 'kognitif', 'draft', 'UAS'),
  k('B1-ENG-FASILITATOR', 'B1', 'ENGAGEMENT', 'Teamwork & Leadership: Penilaian fasilitator', 'afektif', 'draft'),

  /* ---- B.2 — draft ---- */
  k('B2-PDP-T', 'B2', 'PDP', 'Tugas: Komitmen & kesepakatan tim', 'kognitif', 'draft'),
  k('B2-MK-T', 'B2', 'MK', 'Tugas: Studi keberagaman', 'kognitif', 'draft', 'TUGAS'),
  k('B2-MK-SIKAP', 'B2', 'MK', 'Sikap: Peer review rasa hormat & komitmen', 'afektif', 'draft', 'SIKAP'),
  k('B2-MK-UAS', 'B2', 'MK', 'UAS: Refleksi relasi kerja', 'kognitif', 'draft', 'UAS'),
  k('B2-ENG-FASILITATOR', 'B2', 'ENGAGEMENT', 'Teamwork & Leadership: Penilaian fasilitator', 'afektif', 'draft'),

  /* ---- B.3 — resmi ---- */
  k('B3-PDP-T2', 'B3', 'PDP', 'Tugas 2: Dilema Win-Win', 'kognitif', 'resmi'),
  k('B3-PDP-T3', 'B3', 'PDP', 'Tugas 3: Best Practice Win-Win', 'kognitif', 'resmi'),
  k('B3-MK-T1', 'B3', 'MK', 'Tugas 1: Peer-Assessment Group (UAS)', 'afektif', 'resmi', 'TUGAS'),
  k('B3-MK-UAS', 'B3', 'MK', 'UAS: Refleksi Pribadi (UAS-1)', 'kognitif', 'resmi', 'UAS'),

  /* ---- B.4 — resmi ---- */
  k('B4-MK-T1', 'B4', 'MK', 'Tugas 1: Peer-Assessment Group (UAS)', 'afektif', 'resmi', 'TUGAS'),
  k('B4-MK-UAS', 'B4', 'MK', 'UAS: Refleksi Pribadi (UAS-1)', 'kognitif', 'resmi', 'UAS'),

  /* ---- C.1 — draft ---- */
  k('C1-PDP-T', 'C1', 'PDP', 'Tugas: Peran kepemimpinan dalam tim', 'kognitif', 'draft'),
  k('C1-MK-T', 'C1', 'MK', 'Tugas: Kepemimpinan pada proyek kelompok', 'kognitif', 'draft', 'TUGAS'),
  k('C1-MK-SIKAP', 'C1', 'MK', 'Sikap: Peer review kepemimpinan', 'afektif', 'draft', 'SIKAP'),
  k('C1-MK-UAS', 'C1', 'MK', 'UAS: Refleksi kepemimpinan', 'kognitif', 'draft', 'UAS'),
  k('C1-ENG-FASILITATOR', 'C1', 'ENGAGEMENT', 'Teamwork & Leadership: Penilaian fasilitator', 'afektif', 'draft'),

  /* ---- C.2 — resmi ---- */
  k('C2-PDP-T1', 'C2', 'PDP', 'Tugas 1: Paradigma Interdependensi', 'kognitif', 'resmi'),
  k('C2-MK-T1', 'C2', 'MK', 'Tugas 1: Peer-Assessment Group (UAS)', 'afektif', 'resmi', 'TUGAS'),
  k('C2-MK-UAS', 'C2', 'MK', 'UAS: Refleksi Pribadi (UAS-1)', 'kognitif', 'resmi', 'UAS'),
]

export function getKomponen(aspekId) {
  return KOMPONEN.filter((x) => x.aspekId === aspekId)
}

export function getKomponenById(id) {
  return KOMPONEN.find((x) => x.id === id) ?? null
}

export function aspekPunyaDraft(aspekId) {
  return getKomponen(aspekId).some((x) => x.status === 'draft')
}

/* --------------------------- indikator perilaku --------------------------- */

/* Dokumen sumber baru merinci indikator untuk semester 1. Aspek lain sengaja
   dibiarkan kosong supaya UI menampilkan keadaan kosong yang jujur, bukan
   indikator karangan. */

export const INDIKATOR = [
  {
    id: 'A1-IND-1',
    aspekId: 'A1',
    label: 'Integrity & honesty',
    ranah: 'afektif',
    sumber: [
      'Refleksi 1 PDP',
      'Tepat waktu (rata-rata kelas & mentoring)',
      'Tidak plagiat',
      'Integrity (peer-assessment, rata-rata kelompok)',
    ],
  },
  {
    id: 'A1-IND-2',
    aspekId: 'A1',
    label: 'Responsibility',
    ranah: 'afektif',
    sumber: ['Refleksi 2 PDP', 'Presensi 100%', 'Interaktif', 'Kondusif', 'Responsible (peer-assessment)'],
  },
  {
    id: 'A1-IND-3',
    aspekId: 'A1',
    label: 'Professional ethics',
    ranah: 'afektif',
    sumber: ['Refleksi 3 PDP', 'Busana proper / KTM (kelas & mentoring)'],
  },
  {
    id: 'A2-IND-1',
    aspekId: 'A2',
    label: 'Emotions, stress & pressure',
    ranah: 'kognitif',
    sumber: ['Refleksi 1 (rata-rata UTS & UAS)'],
  },
  {
    id: 'A2-IND-2',
    aspekId: 'A2',
    label: 'Self-regulation',
    ranah: 'kognitif',
    sumber: ['Refleksi 2 (rata-rata UTS & UAS)'],
  },
  ...['Effective communication', 'Teamwork', 'Leadership', 'Self-management', 'Risk-taking'].map((label, i) => ({
    id: 'A3-IND-' + (i + 1),
    aspekId: 'A3',
    label,
    ranah: 'afektif',
    sumber: ['Peer-assessment PBL (rata-rata kelompok)'],
  })),
]

export function getIndikator(aspekId) {
  return INDIKATOR.filter((x) => x.aspekId === aspekId)
}

/* ------------------------------- pencarian -------------------------------- */

export const getCluster = (id) => CLUSTER.find((c) => c.id === id) ?? null
export const getArea = (id) => AREA.find((a) => a.id === id) ?? null
export const getFase = (id) => FASE.find((f) => f.id === id) ?? null

/** Warna identitas sebuah aspek diwarisi dari areanya — bukan hue tersendiri. */
export const warnaAspek = (aspekId) => getArea(getAspek(aspekId)?.area)?.warna ?? 'var(--brand-ink)'
export const warnaCluster = (clusterId) => getArea(getCluster(clusterId)?.area)?.warna ?? 'var(--brand-ink)'
