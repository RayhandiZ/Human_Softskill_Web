/* --------------------------------------------------------------------------
   Satu-satunya tempat angka kebijakan boleh hidup.

   Aturan R11: tidak ada bobot, ambang, atau penempatan semester yang boleh
   ditulis langsung di komponen. Semuanya dibaca dari sini supaya unit pengelola
   bisa mengubahnya lewat halaman Kurikulum tanpa menyentuh kode.
   -------------------------------------------------------------------------- */

export const CONFIG = {
  /* ---- penempatan semester yang masih diperdebatkan ---------------------- */

  // Dokumen sumber tidak konsisten: sheet GENERAL menaruh A.3 di PDP-1/semester 1,
  // sheet DETAIL KOMPONEN menaruhnya di blok PDP-2. Default mengikuti GENERAL.
  ASPEK_A3_SEMESTER: 1, // MENUNGGU KONFIRMASI (1 atau 2)

  // Excel menaruh C.1 di PDP-2/semester 2; peta jalan visual menggambarkannya
  // menyatu dengan C.2 di ujung Fase 2. Default mengikuti Excel + silabus PDP-2.
  ASPEK_C1_SEMESTER: 2, // MENUNGGU KONFIRMASI (2 atau 3)

  /* ---- bobot ------------------------------------------------------------- */

  // Tidak ada satu pun angka bobot di dokumen sumber. Semua di bawah placeholder.
  BOBOT_SUMBER: { PDP: 30, MK: 50, ENGAGEMENT: 20 }, // MENUNGGU KONFIRMASI
  BOBOT_KOMPONEN_MK: { TUGAS: 30, SIKAP: 20, UTS: 20, UAS: 30 }, // MENUNGGU KONFIRMASI

  BOBOT_ASPEK: 'merata', // 'merata' | 'kustom'
  // Hanya dipakai bila BOBOT_ASPEK === 'kustom'. Nilai relatif, tidak harus 100.
  BOBOT_ASPEK_KUSTOM: { A1: 10, A2: 10, A3: 10, A4: 10, B1: 10, B2: 10, B3: 10, B4: 10, C1: 10, C2: 10 },

  /* ---- agregasi ---------------------------------------------------------- */

  // Belum diputuskan apakah nilai akhir dirata-rata dari 10 aspek langsung,
  // atau dari rata-rata tiap semester lalu dirata-rata lagi. Hasilnya berbeda
  // karena distribusi aspek per semester tidak sama (3/4/3).
  MODE_AGREGASI: 'per-aspek', // 'per-aspek' | 'per-semester'  MENUNGGU KONFIRMASI

  /* ---- ambang dan durasi program ----------------------------------------- */

  AMBANG_SERTIFIKAT: 70, // nilai minimum untuk berhak atas sertifikat
  TOTAL_SEMESTER_PROGRAM: 3,

  /* Kapan sebuah aspek berhenti berstatus "sementara" dan menjadi "final".
     Apa pun modenya, aspek yang komponennya belum lengkap TIDAK PERNAH final,
     dan penandaan manual oleh Kemahasiswaan selalu menang atas mode ini.

       'otomatis'  final begitu seluruh komponen asesmennya terisi
       'manual'    final hanya bila ditandai Kemahasiswaan, walau sudah lengkap
       'semester'  final bila lengkap DAN semesternya sudah ditutup           */
  PENGUNCIAN_ASPEK: 'otomatis', // MENUNGGU KONFIRMASI

  // Lima aspek (A.3, A.4, B.1, B.2, C.1) belum punya komponen asesmen resmi di
  // dokumen sumber, sehingga komponennya berstatus 'draft'. Aturan R4 melarang
  // aspek berkomponen draft menjadi 'final' — dan karena sertifikat menuntut
  // kesepuluh aspek final (R5), tidak ada satu pun mahasiswa yang bisa
  // disertifikasi selama skema penilaiannya belum diresmikan.
  //
  // Saklar ini melonggarkan R4 supaya alur sertifikat tetap bisa diuji dan
  // didemokan. Aspek draft yang di-final tetap diberi penanda visual di UI.
  // Setel false begitu seluruh komponen sudah resmi.
  IZINKAN_FINAL_DRAFT: true, // MENUNGGU KONFIRMASI
}

/* --------------------------------------------------------------------------
   Perubahan konfigurasi harus menyebar ke seluruh perhitungan tanpa reload.
   Halaman Kurikulum memakai updateConfig(); komponen React berlangganan lewat
   subscribeConfig() agar ikut menghitung ulang.
   -------------------------------------------------------------------------- */

const listeners = new Set()

export function updateConfig(patch) {
  Object.assign(CONFIG, patch)
  listeners.forEach((fn) => fn(CONFIG))
  return CONFIG
}

export function subscribeConfig(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Salinan lepas untuk simulasi dampak: hitung dengan nilai baru tanpa menyimpannya. */
export function withConfig(patch, fn) {
  const asli = { ...CONFIG }
  Object.assign(CONFIG, patch)
  try {
    return fn()
  } finally {
    Object.assign(CONFIG, asli)
  }
}

/** Daftar kunci yang masih menunggu keputusan unit pengelola — dipakai di UI. */
export const MENUNGGU_KONFIRMASI = [
  'ASPEK_A3_SEMESTER',
  'ASPEK_C1_SEMESTER',
  'BOBOT_SUMBER',
  'BOBOT_KOMPONEN_MK',
  'MODE_AGREGASI',
  'PENGUNCIAN_ASPEK',
  'IZINKAN_FINAL_DRAFT',
]

export const CATATAN_BOBOT_SEMENTARA = 'Bobot masih bersifat sementara dan dapat berubah.'
