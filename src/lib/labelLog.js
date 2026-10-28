/* Label jenis tindakan Log Aktivitas (aksi di LogAktivitas, src/server/log.js) dan sasaran log yang ditulis server,
   untuk halaman Log Aktivitas, Pusat Kendali, dan lonceng admin. Label di sini kalimat kamus; layar menerjemahkannya
   lewat t(). */

export const LABEL_LOG = {
  KUNCI_ANGKATAN: 'Sahkan nilai angkatan',
  UBAH_DATA_TERKUNCI: 'Ubah data yang sudah final',
  ROLLBACK_DATA_TERKUNCI: 'Batalkan perubahan data yang sudah final',
  UBAH_PENGUNCIAN: 'Ubah tanda final/sementara',
  UBAH_BOBOT: 'Ubah bobot',
  AJUKAN_PERSETUJUAN: 'Ajukan persetujuan',
  PUTUSKAN_PERSETUJUAN: 'Putuskan persetujuan',
  TARIK_PERMINTAAN: 'Tarik permintaan',
  UBAH_PENILAIAN: 'Ubah penilaian aspek',
  // Dicatat /api/akses/ubah setelah dibuat di back-end; lihat README.md › Panel Super Admin › Akses Pengguna.
  UBAH_AKSES: 'Ubah akses akun',
  UBAH_PERIODE: 'Ubah periode akademik',
  TAMBAH_AKUN: 'Tambah akun',
  UBAH_AKUN: 'Ubah akun',
  HAPUS_AKUN: 'Hapus akun',
  // Izin kelola data master (src/server/akses.js) dan perubahan data master (src/server/dataMaster.js).
  UBAH_IZIN: 'Ubah izin data master',
  TAMBAH_ANGKATAN: 'Tambah angkatan',
  UBAH_ANGKATAN: 'Ubah angkatan',
  TAMBAH_FAKULTAS: 'Tambah fakultas',
  UBAH_FAKULTAS: 'Ubah fakultas',
  TAMBAH_PRODI: 'Tambah program studi',
  UBAH_PRODI: 'Ubah program studi',
  // Aspek CPMK itu sendiri (src/server/aspek.js).
  TAMBAH_ASPEK: 'Tambah aspek',
  UBAH_ASPEK: 'Ubah struktur aspek',
  ARSIPKAN_ASPEK: 'Arsipkan aspek',
  PULIHKAN_ASPEK: 'Pulihkan aspek',
  // Persetujuan dua lapis (rapat 24 Okt 2026): admin meneruskan, super admin menyetujui.
  TERUSKAN_KOREKSI: 'Teruskan pengajuan ubah nilai',
  SETUJUI_KOREKSI: 'Setujui dan terapkan ubah nilai',
  TOLAK_KOREKSI: 'Tolak pengajuan ubah nilai',
  SETUJUI_SERTIFIKAT: 'Setujui akses cetak sertifikat',
  TOLAK_SERTIFIKAT: 'Tolak akses cetak sertifikat',
  CABUT_SERTIFIKAT: 'Cabut akses cetak sertifikat',
  UBAH_KELAS_DOSEN: 'Ubah kelas dosen',
  CETAK_SERTIFIKAT: 'Buka sertifikat untuk dicetak',
  // Batch nilai tanpa data terkunci (src/server/nilai.js), usulan dosen yang lama, dan tindakan mahasiswa atau
  // pemilik akun sendiri.
  SIMPAN_NILAI: 'Simpan nilai',
  BATALKAN_BATCH: 'Batalkan batch nilai',
  SETUJUI_USULAN: 'Setujui usulan nilai dosen',
  TOLAK_USULAN: 'Tolak usulan nilai dosen',
  AJUKAN_KOREKSI: 'Ajukan koreksi nilai',
  MINTA_SERTIFIKAT: 'Minta akses cetak sertifikat',
  UBAH_PROFIL: 'Ubah profil',
}

/* Sasaran log ditulis server sebagai teks Indonesia jadi ('akun x@umn.ac.id', 'penguncian (2 mahasiswa)'; lihat
   catatLog di src/server). Polanya sedikit dan tetap, jadi diterjemahkan di sini menurut awalannya; yang tidak
   dikenali tampil apa adanya. 'penguncian' ditampilkan sebagai tanda final, istilah yang dipakai layar sejak
   rapat 24 Okt 2026. */
const POLA_SASARAN = [
  [/^penguncian \((\d+) mahasiswa\)$/, (m, t) => t('tanda final ({n} mahasiswa)', { n: m[1] })],
  [/^aspek (\S+) \(kurikulum versi (\S+)\)$/, (m, t) => t('aspek {kode} (kurikulum versi {v})', { kode: m[1], v: m[2] })],
  [/^kurikulum versi (\S+)$/, (m, t) => t('kurikulum versi {v}', { v: m[1] })],
  [/^periode (Ganjil|Genap) (\S+)$/, (m, t) => t('periode {nama}', { nama: t(m[1]) + ' ' + m[2] })],
  [/^akun (.+)$/, (m, t) => t('akun {nama}', { nama: m[1] })],
  [/^angkatan (.+)$/, (m, t) => t('angkatan {nama}', { nama: m[1] })],
  [/^batch (.+)$/, (m, t) => t('batch {nama}', { nama: m[1] })],
  [/^fakultas (.+)$/, (m, t) => t('fakultas {nama}', { nama: m[1] })],
  [/^prodi (.+)$/, (m, t) => t('prodi {nama}', { nama: m[1] })],
  [/^mahasiswa (\S+)$/, (m, t) => t('mahasiswa {nim}', { nim: m[1] })],
  [/^permintaan (P-\d+)$/, (m, t) => t('permintaan {id}', { id: m[1] })],
  [/^usulan (U-\d+)$/, (m, t) => t('usulan {id}', { id: m[1] })],
]

export function labelSasaran(sasaran, t) {
  for (const [pola, susun] of POLA_SASARAN) {
    const m = String(sasaran).match(pola)
    if (m) return susun(m, t)
  }
  return sasaran
}
