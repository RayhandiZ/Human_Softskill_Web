/* --------------------------------------------------------------------------
   5C — nilai inti institusi.

   PENTING: 5C BUKAN sumbu penilaian. Sumbu penilaian adalah 10 aspek CPMK
   (lihat curriculum.js). 5C hadir sebagai MATERI Mentoring 5C pada semester 1,
   yang menyumbang komponen asesmen ke aspek A.1 dan A.2.

   Modul ini hanya menyediakan teks penjelas untuk halaman Peta Perjalanan dan
   kop dokumen. Tidak ada satu pun angka yang boleh dihitung darinya.
   -------------------------------------------------------------------------- */

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
  ringkas:
    'Program pendampingan semester 1 yang mengenalkan lima nilai inti UMN. Kehadiran dan refleksi pribadi peserta menjadi komponen asesmen pada aspek A.1 dan A.2.',
  aspekTerkait: ['A1', 'A2', 'A3'],
}

/** Program kemahasiswaan per semester — dipakai di Peta Perjalanan. */
export const PROGRAM_ENGAGEMENT = [
  { semester: 1, nama: 'Mentoring 5C', ringkas: MENTORING.ringkas },
  {
    semester: 2,
    nama: 'Teamwork & Leadership',
    ringkas: 'Pelatihan kerja tim dan kepemimpinan awal; penilaian fasilitator menyumbang ke aspek Area B dan C.',
  },
  {
    semester: 3,
    nama: 'Effective Communication',
    ringkas: 'Pelatihan komunikasi efektif dan penanganan konflik untuk aspek B.3, B.4, dan C.2.',
  },
]
