/* Pengganti src/server/db.js, muat.js, dan masuk.js untuk uji Asisten VIBE (scripts/asisten-test.mjs): uji berjalan
   tanpa basis data. scripts/asisten.cjs mengarahkan ketiga impor itu ke berkas ini. */
export const db = {}

const palsu = { data: null, akun: null }

/** `data`: hasil muatData() yang diinginkan; `akun`: hasil akunDariId() (untuk dosen: { dosen }). */
export const aturPalsu = (isi) => Object.assign(palsu, isi)

export const muatData = async () => palsu.data
export const akunDariId = async () => palsu.akun
