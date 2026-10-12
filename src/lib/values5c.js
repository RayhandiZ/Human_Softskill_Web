/* 5C hanya materi Mentoring, bukan sumbu penilaian; jangan hitung apa pun dari sini. */

export const NILAI_5C = [
  { kode: 'C1', nama: 'Caring', ringkas: 'Peduli pada sesama dan lingkungan.' },
  { kode: 'C2', nama: 'Credible', ringkas: 'Jujur, konsisten, dan dapat dipercaya.' },
  { kode: 'C3', nama: 'Competent', ringkas: 'Menguasai kompetensi bidangnya.' },
  { kode: 'C4', nama: 'Competitive', ringkas: 'Berdaya saing dan berorientasi prestasi.' },
  { kode: 'C5', nama: 'Customer Delight', ringkas: 'Melampaui ekspektasi pemangku kepentingan.' },
]

export const MENTORING = {
  nama: 'Mentoring 5C',
  semester: 1,
  sumber: 'PDP',
  ringkas:
    'Program pendampingan semester 1, bagian dari PDP, yang mengenalkan lima nilai inti UMN. Kehadiran, refleksi pribadi, dan partisipasi peserta menjadi komponen asesmen PDP pada aspek A.1 sampai A.3.',
  aspekTerkait: ['A1', 'A2', 'A3'],
}

// Program PDP per semester beserta pasangan MK Humaniora-nya.
export const PROGRAM_PDP = [
  { semester: 1, modul: 'PDP-1', nama: 'Character & Mentoring 5C', mk: 'Religiositas', ringkas: MENTORING.ringkas },
  {
    semester: 2,
    modul: 'PDP-2',
    nama: 'Teamwork & Leadership',
    mk: 'Pancasila',
    ringkas: 'Pelatihan kerja tim dan kepemimpinan awal; penilaian fasilitator menyumbang ke aspek A.4, B.1, B.2, dan C.1.',
  },
  {
    semester: 3,
    modul: 'PDP-3',
    nama: 'Effective Communication',
    mk: 'Civics',
    ringkas: 'Pelatihan komunikasi efektif dan penanganan konflik untuk aspek B.3, B.4, dan C.2.',
  },
]
