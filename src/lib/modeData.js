// Website selalu membaca dan menulis lewat server (basis data). Skrip uji berjalan tanpa server,
// jadi mereka menyalakan mode lokal SEBELUM modul aplikasi dimuat (lihat scripts/modeLokal.js):
// sesi dan perubahan lalu hidup di memori dan localStorage seperti pada masa purwarupa.
export const modeLokal = () => globalThis.__SK5C_LOKAL__ === true
