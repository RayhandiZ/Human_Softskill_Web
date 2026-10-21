/* Tiruan `next/font/google` untuk uji jsdom. Di luar kompiler Next modul aslinya kosong, jadi pemanggilan seperti
   Lexend({ ... }) akan gagal. Uji tidak memeriksa berkas huruf; cukup kelas dan nama variabelnya ada. */

const huruf = (opsi = {}) => ({
  className: 'huruf-palsu',
  variable: opsi.variable ? 'huruf-palsu-variabel' : '',
  style: { fontFamily: 'sans-serif' },
})

export const Lexend = huruf
export const Plus_Jakarta_Sans = huruf
