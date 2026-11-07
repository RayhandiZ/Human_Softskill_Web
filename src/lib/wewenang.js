/* Sakelar wewenang: sel matriks Peran & Wewenang (src/halaman/super-admin/Wewenang.jsx) yang bisa ditutup Super Admin
   untuk sementara, lalu dibuka lagi. Bawaannya terbuka. Yang ditutup tersimpan di tabel Konfigurasi, satu baris per
   sakelar (kunci 'WEWENANG.<id>' bernilai false), dan server menolak tindakannya (denganWewenang di
   src/server/wewenang.js). Layar menerima keadaannya lewat data master (app/layout.jsx) dan /api/data, lalu
   menyembunyikan tombolnya. Di bawahnya: isi matriks itu sendiri (MATRIKS), yang bisa diberi keterangan dan ditambah
   kebijakan tertulis oleh Super Admin. Lihat README.md › Panel Super Admin › Peran & Wewenang. */

export const AWALAN_WEWENANG = 'WEWENANG.'

// `peran` = nama kolom matriks, `tindakan` = nama barisnya (keduanya kalimat kamus). `pesanTutup` jawaban server saat
// tindakannya dicoba selagi ditutup; `dampak` dibaca Super Admin sebelum menutupnya.
export const SAKELAR = [
  {
    id: 'AJUKAN_KOREKSI',
    peran: 'Mahasiswa',
    tindakan: 'Mengajukan koreksi nilai',
    pesanTutup: 'Pengajuan koreksi nilai sedang ditutup Super Admin.',
    dampak: 'Mahasiswa tidak bisa mengirim pengajuan koreksi baru. Pengajuan yang sudah masuk tetap diproses admin dan Super Admin.',
  },
  {
    id: 'MINTA_SERTIFIKAT',
    peran: 'Mahasiswa',
    tindakan: 'Meminta akses cetak sertifikat',
    pesanTutup: 'Permintaan akses cetak sertifikat sedang ditutup Super Admin.',
    dampak:
      'Mahasiswa tidak bisa meminta akses cetak baru. Permintaan yang sedang berjalan tetap diproses, dan sertifikat yang aksesnya sudah disetujui tetap bisa dicetak.',
  },
  {
    id: 'UNGGAH_NILAI_DOSEN',
    peran: 'Dosen',
    tindakan: 'Mengunggah nilai kelasnya dari Excel',
    pesanTutup: 'Unggah nilai sedang ditutup Super Admin.',
    dampak:
      'Dosen tidak bisa mengunggah nilai, termasuk perbaikan untuk angkatan yang sudah disahkan. Perbaikan yang sudah diajukan tetap bisa diputuskan Super Admin atau ditarik dosennya.',
  },
  {
    id: 'BACA_LOG_ADMIN',
    peran: 'Kemahasiswaan',
    tindakan: 'Membaca Log Aktivitas',
    pesanTutup: 'Log Aktivitas sedang ditutup untuk admin oleh Super Admin.',
    dampak:
      'Admin biasa tidak bisa membuka Log Aktivitas, dan menunya ikut hilang. Lonceng pembaruan admin tetap jalan, dan Super Admin tetap bisa membaca seluruh log.',
  },
]

export const sakelar = (id) => SAKELAR.find((s) => s.id === id) ?? null

/** Keadaan di layar, true = terbuka. Diisi pasangWewenang() dari data master, /api/data, dan jawaban /api/wewenang. */
export const WEWENANG = Object.fromEntries(SAKELAR.map((s) => [s.id, true]))

/** `tertutup` = { id: false } dari basis data (ambilWewenang di server); sakelar yang tidak disebut terbuka. */
export function pasangWewenang(tertutup) {
  for (const s of SAKELAR) WEWENANG[s.id] = tertutup?.[s.id] !== false
}

/** Apakah tindakan sakelar `id` sedang terbuka. Hanya untuk tampilan; server tetap memeriksa sendiri. */
export const boleh = (id) => WEWENANG[id] !== false

/* ------------------------------ matriks wewenang ------------------------------ */

/* Matriks tiap peran, diturunkan dari aturan server (src/server/persetujuan.js, tangani() di api.js). Dipakai halaman
   Peran & Wewenang dan server (ubahMatriks di src/server/wewenang.js memeriksa `baris` dan nama tindakan baru di sini).
   Isi Ya/Tidak-nya hanya bisa diubah di kode. Super Admin bisa menambah keterangan per sel dan baris kebijakan tertulis
   (tabel KeteranganWewenang dan TindakanWewenang); keduanya hanya tulisan, tidak dijaga server. */

export const PERAN = ['Mahasiswa', 'Dosen', 'Kemahasiswaan', 'Super Admin']

// ya: boleh langsung · syarat: boleh, kecuali yang ditulis di catatan · minta: selalu lewat persetujuan Super Admin.
export const JENIS = ['ya', 'syarat', 'minta', 'tidak']
export const LABEL_JENIS = { ya: 'Ya', syarat: 'Ya dengan syarat', minta: 'Selalu perlu persetujuan', tidak: 'Tidak' }

// Batas isian dari layar; server memeriksa ulang.
export const KETERANGAN_MAKS = 300
export const TINDAKAN_MIN = 5
export const TINDAKAN_MAKS = 150
export const TAMBAHAN_MAKS = 30

// `kode` tetap, tempat keterangan Super Admin menempel (KeteranganWewenang.baris), jadi tidak hilang bila tulisan
// tindakannya diganti. `sakelar`: sel yang bisa ditutup Super Admin, per nama kolom; `ikut`: sel yang ikut tertutup
// bersama sakelar baris lain.
export const MATRIKS = [
  // Admin biasa: angkatan Semester 1–3 kecuali dinonaktifkan, dan angkatan lewat Semester 3 yang dibuka Super Admin
  // (angkatanTersembunyi di src/server/muat.js).
  {
    kode: 'LIHAT_CAPAIAN',
    tindakan: 'Melihat capaian mahasiswa',
    izin: [
      ['syarat', 'hanya miliknya'],
      ['syarat', 'mahasiswa di kelasnya'],
      ['syarat', 'angkatan Semester 1–3 kecuali dinonaktifkan Super Admin; angkatan yang sudah lewat bila dibuka Super Admin'],
      ['ya'],
    ],
  },
  // /api/koreksi (ajukanKoreksi di src/server/pengajuan.js).
  {
    kode: 'AJUKAN_KOREKSI',
    tindakan: 'Mengajukan koreksi nilai',
    izin: [['ya'], ['tidak'], ['tidak'], ['tidak']],
    sakelar: { Mahasiswa: 'AJUKAN_KOREKSI' },
  },
  // Dua lapis sejak rapat 24 Okt 2026 (putuskanKoreksi di src/server/pengajuan.js).
  {
    kode: 'PUTUSKAN_KOREKSI',
    tindakan: 'Memutuskan pengajuan koreksi nilai',
    izin: [['tidak'], ['tidak'], ['syarat', 'lapis pertama: meneruskan atau menolak'], ['syarat', 'lapis kedua: menyetujui dan menerapkan nilai, atau menolak']],
  },
  // /api/sertifikat dan /api/sertifikat/keputusan (src/server/sertifikat.js).
  {
    kode: 'MINTA_SERTIFIKAT',
    tindakan: 'Meminta akses cetak sertifikat',
    izin: [['syarat', 'bila seluruh syarat terpenuhi'], ['tidak'], ['tidak'], ['tidak']],
    sakelar: { Mahasiswa: 'MINTA_SERTIFIKAT' },
  },
  // Admin tidak menyetujui atau menolak sendiri; ia meneruskan dengan rekomendasi dan alasan (keputusan 26 Okt 2026).
  {
    kode: 'SETUJUI_SERTIFIKAT',
    tindakan: 'Menyetujui akses cetak sertifikat',
    izin: [
      ['tidak'],
      ['tidak'],
      ['syarat', 'lapis pertama: meneruskan dengan rekomendasi disarankan atau tidak disarankan, wajib beralasan'],
      ['syarat', 'lapis kedua, sesudah admin: menyetujui atau menolak'],
    ],
  },
  // /api/sertifikat/cabut: akses yang sudah Siap dicetak, satu orang cukup; mahasiswa boleh meminta lagi lewat dua lapis.
  {
    kode: 'CABUT_SERTIFIKAT',
    tindakan: 'Mencabut akses cetak sertifikat',
    izin: [['tidak'], ['tidak'], ['syarat', 'langsung, wajib beralasan'], ['syarat', 'langsung, wajib beralasan']],
  },
  {
    kode: 'CETAK_SERTIFIKAT',
    tindakan: 'Mencetak sertifikat',
    izin: [['syarat', 'sesudah akses cetaknya disetujui'], ['tidak'], ['syarat', 'sesudah akses cetaknya disetujui'], ['syarat', 'sesudah akses cetaknya disetujui']],
  },
  // /api/nilai/dosen (unggahNilaiDosen di src/server/pengajuan.js); kelasnya angkatan yang diampu (/api/akses/kelas).
  {
    kode: 'UNGGAH_NILAI',
    tindakan: 'Mengunggah nilai kelasnya dari Excel',
    izin: [['tidak'], ['syarat', 'langsung tersimpan untuk angkatan berjalan'], ['tidak'], ['tidak']],
    sakelar: { Dosen: 'UNGGAH_NILAI_DOSEN' },
  },
  // Perbaikan dosen masuk lewat pintu unggah yang sama, jadi ikut tertutup bersama sakelar unggah nilai.
  {
    kode: 'PERBAIKI_NILAI',
    tindakan: 'Memperbaiki nilai angkatan yang sudah disahkan atau selesai, atau aspek final',
    izin: [['tidak'], ['minta'], ['tidak'], ['ya']],
    ikut: { Dosen: 'UNGGAH_NILAI_DOSEN' },
  },
  { kode: 'ATUR_KELAS_DOSEN', tindakan: 'Mengatur kelas dosen dan angkatan yang diampu', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // Usulan dari sebelum unggahan langsung yang masih menunggu.
  { kode: 'PUTUSKAN_USULAN', tindakan: 'Memutuskan usulan nilai dosen yang tersisa', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/nilai dan /api/nilai/rollback, penjaga ['superadmin']: admin hanya membaca nilai.
  { kode: 'SIMPAN_NILAI', tindakan: 'Menyimpan dan mengimpor nilai', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  { kode: 'BATALKAN_BATCH', tindakan: 'Membatalkan batch nilai, termasuk unggahan dosen', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  { kode: 'UBAH_TANDA_FINAL', tindakan: 'Mengubah tanda final/sementara', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { kode: 'UBAH_BOBOT', tindakan: 'Mengubah bobot kurikulum', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { kode: 'UBAH_PENILAIAN', tindakan: 'Mengubah penilaian aspek', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { kode: 'SAHKAN_ANGKATAN', tindakan: 'Mengesahkan nilai angkatan', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { kode: 'PUTUSKAN_PERMINTAAN', tindakan: 'Memutuskan permintaan admin', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/persetujuan/batal, penjaga ['admin', 'dosen']: hanya permintaan milik sendiri yang belum diputuskan
  // (batalkanPermintaan di src/server/persetujuan.js). Dosen menarik perbaikan nilainya dari Unggah Nilai.
  {
    kode: 'TARIK_PERMINTAAN',
    tindakan: 'Menarik permintaan yang belum diputuskan',
    izin: [['tidak'], ['syarat', 'hanya miliknya'], ['syarat', 'hanya miliknya'], ['tidak']],
  },
  // /api/log (bacaLog di src/server/log.js): admin biasa tanpa tindakan Super Admin; yang berkaitan dengan akunnya
  // sampai lewat lonceng (src/server/notifikasi.js).
  {
    kode: 'BACA_LOG',
    tindakan: 'Membaca Log Aktivitas',
    izin: [['tidak'], ['tidak'], ['syarat', 'tanpa tindakan Super Admin'], ['ya']],
    sakelar: { Kemahasiswaan: 'BACA_LOG_ADMIN' },
  },
  // /api/periode, hanya super admin (src/server/periode.js).
  { kode: 'PINDAH_PERIODE', tindakan: 'Memindahkan periode akademik', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/akses/ubah, hanya super admin; akun Super Admin dan akun sendiri ditolak (src/server/akses.js).
  { kode: 'ATUR_AKSES_AKUN', tindakan: 'Mencabut dan memulihkan akses mahasiswa, dosen, dan admin', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/master/*, penjaga ['superadmin'] (src/server/dataMaster.js).
  {
    kode: 'KELOLA_DATA_MASTER',
    tindakan: 'Menambah dan mengubah angkatan, fakultas, prodi, dan data mahasiswa',
    izin: [['tidak'], ['tidak'], ['tidak'], ['ya']],
  },
  // Halaman Data Master tanpa tombol ubah; izinnya dari Akses Pengguna atau permintaan AKSES_DATA_MASTER.
  {
    kode: 'LIHAT_DATA_MASTER',
    tindakan: 'Melihat halaman Data Master',
    izin: [['tidak'], ['tidak'], ['syarat', 'bila diberi izin atau permintaannya disetujui Super Admin'], ['ya']],
  },
  // /api/akses/izin, hanya super admin, dan hanya untuk akun admin (aturIzinMaster di src/server/akses.js).
  { kode: 'ATUR_IZIN_MASTER', tindakan: 'Memberi dan mencabut izin lihat data master', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/akses/angkatan, hanya super admin, dan hanya untuk akun admin (aturAksesAngkatan di src/server/akses.js).
  {
    kode: 'ATUR_AKSES_ANGKATAN',
    tindakan: 'Mengatur angkatan yang terlihat oleh admin (membuka atau menonaktifkan)',
    izin: [['tidak'], ['tidak'], ['tidak'], ['ya']],
  },
  // Peran SUPER_ADMIN hanya dipasang langsung di basis data; tidak ada tombolnya di website.
  { kode: 'ANGKAT_SUPER_ADMIN', tindakan: 'Mengangkat Super Admin dari website', izin: [['tidak'], ['tidak'], ['tidak'], ['tidak']] },
]

export const barisBawaan = (kode) => MATRIKS.find((m) => m.kode === kode) ?? null

/** Kunci keterangan satu sel (KeteranganWewenang dan MATRIKS_SA.keterangan di layar). */
export const kunciSel = (baris, peran) => baris + '|' + peran

/** Izin baris tambahan dalam urutan PERAN; MySQL menyusun ulang kunci objek JSON, jadi urutannya tidak bisa diandalkan. */
export const izinUrut = (izin) => Object.fromEntries(PERAN.map((p) => [p, JENIS.includes(izin?.[p]) ? izin[p] : 'tidak']))
