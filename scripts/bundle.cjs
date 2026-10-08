/* Menyatukan modul sumber lewat esbuild agar resolusi impornya sama dengan
   Next (tanpa ekstensi berkas), lalu mengembalikan lokasi hasilnya.

   Modul `next/link` dan `next/navigation` diarahkan ke tiruannya: uji merender
   komponen halaman langsung di jsdom, tanpa server Next, dan modul aslinya
   menolak dipakai di luar router Next. */
const path = require('path')
const esbuild = require('esbuild')

const ALIAS = {
  'next/link': path.join(__dirname, 'palsu-next-link.jsx'),
  'next/navigation': path.join(__dirname, 'palsu-next-navigation.jsx'),
}

module.exports = function bundle(masuk, keluar, opsi = {}) {
  const abs = path.join(__dirname, keluar)
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, masuk)],
    bundle: true,
    outfile: abs,
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"development"' },
    ...opsi,
    alias: { ...ALIAS, ...(opsi.alias || {}) },
  })
  return abs
}
