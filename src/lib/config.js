/* Satu-satunya tempat angka kebijakan (R11); lihat README.md › Yang masih menunggu keputusan unit pengelola. */

export const CONFIG = {
  /* ---- penempatan semester yang masih diperdebatkan ---------------------- */

  ASPEK_A3_SEMESTER: 1, // MENUNGGU KONFIRMASI (1 atau 2)

  ASPEK_C1_SEMESTER: 2, // MENUNGGU KONFIRMASI (2 atau 3)

  /* ---- bobot ------------------------------------------------------------- */

  BOBOT_SUMBER: { PDP: 30, MK: 50, ENGAGEMENT: 20 }, // MENUNGGU KONFIRMASI
  BOBOT_KOMPONEN_MK: { TUGAS: 30, SIKAP: 20, UTS: 20, UAS: 30 }, // MENUNGGU KONFIRMASI

  BOBOT_ASPEK: 'merata', // 'merata' | 'kustom'
  // Hanya dipakai bila BOBOT_ASPEK === 'kustom'. Nilai relatif, tidak harus 100.
  BOBOT_ASPEK_KUSTOM: { A1: 10, A2: 10, A3: 10, A4: 10, B1: 10, B2: 10, B3: 10, B4: 10, C1: 10, C2: 10 },

  /* ---- agregasi ---------------------------------------------------------- */

  MODE_AGREGASI: 'per-aspek', // 'per-aspek' | 'per-semester'  MENUNGGU KONFIRMASI

  /* ---- ambang dan durasi program ----------------------------------------- */

  AMBANG_SERTIFIKAT: 70, // nilai minimum untuk berhak atas sertifikat
  TOTAL_SEMESTER_PROGRAM: 3,

  /* 'otomatis' | 'manual' | 'semester'; lihat README.md › Kapan aspek berubah dari sementara menjadi final. */
  PENGUNCIAN_ASPEK: 'otomatis', // MENUNGGU KONFIRMASI

  // Melonggarkan R4 supaya alur sertifikat bisa didemokan; lihat README.md › Kenapa IZINKAN_FINAL_DRAFT ada.
  IZINKAN_FINAL_DRAFT: true, // MENUNGGU KONFIRMASI
}

/* ------------------------- berlangganan perubahan ------------------------- */

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

export function withConfig(patch, fn) {
  const asli = { ...CONFIG }
  Object.assign(CONFIG, patch)
  try {
    return fn()
  } finally {
    Object.assign(CONFIG, asli)
  }
}

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
