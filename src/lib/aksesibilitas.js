import { useSyncExternalStore } from 'react'

/* Setelan menu aksesibilitas panel dosen, diingat di peramban ini (kunci sk5c.aksesibilitas) dan disamakan antartab.
   Bila peramban menolak menyimpan, setelan tetap berlaku selama halaman terbuka. Penerapannya: kelasAksesibilitas()
   untuk akar .panel-dosen, saringanAksesibilitas() untuk filter <html>, dan skala untuk zoom isi halaman. Lihat
   README.md › Panel Dosen › Menu aksesibilitas. */

const KUNCI = 'sk5c.aksesibilitas'

export const SKALA = { min: 90, maks: 150, langkah: 10 }
export const KONTRAS = ['gelap', 'terang', 'tinggi']
export const SATURASI = ['tinggi', 'rendah', 'monokrom']
const SAKELAR = ['sorotJudul', 'sorotTautan', 'disleksia', 'jarakHuruf', 'jarakBaris', 'tebal', 'pemandu', 'diam', 'kursor']

export const BAWAAN = Object.freeze({
  skala: 100,
  ...Object.fromEntries(SAKELAR.map((k) => [k, false])),
  kontras: null,
  saturasi: null,
})

/** Hanya kunci yang dikenal, dengan nilai yang sah; selebihnya kembali ke bawaan. */
function rapikan(v) {
  if (!v || typeof v !== 'object') return BAWAAN
  const skala = Math.round(Number(v.skala) / SKALA.langkah) * SKALA.langkah
  return {
    skala: Number.isFinite(skala) ? Math.min(SKALA.maks, Math.max(SKALA.min, skala)) : 100,
    ...Object.fromEntries(SAKELAR.map((k) => [k, v[k] === true])),
    kontras: KONTRAS.includes(v.kontras) ? v.kontras : null,
    saturasi: SATURASI.includes(v.saturasi) ? v.saturasi : null,
  }
}

const samaDenganBawaan = (s) => Object.keys(BAWAAN).every((k) => s[k] === BAWAAN[k])

let cadangan = null
const pendengar = new Set()

function baca() {
  if (cadangan) return cadangan
  try {
    cadangan = rapikan(JSON.parse(localStorage.getItem(KUNCI) ?? 'null'))
  } catch {
    cadangan = BAWAAN
  }
  return cadangan
}

function simpan(baru) {
  cadangan = baru
  try {
    if (samaDenganBawaan(baru)) localStorage.removeItem(KUNCI)
    else localStorage.setItem(KUNCI, JSON.stringify(baru))
  } catch {
    // Penyimpanan ditolak: setelan tetap berlaku di memori sampai halaman ditutup.
  }
  pendengar.forEach((f) => f())
}

function langgan(f) {
  pendengar.add(f)
  const dariTabLain = (e) => {
    if (e.key !== KUNCI) return
    cadangan = null
    f()
  }
  window.addEventListener('storage', dariTabLain)
  return () => {
    pendengar.delete(f)
    window.removeEventListener('storage', dariTabLain)
  }
}

export function useAksesibilitas() {
  const setelan = useSyncExternalStore(langgan, baca, () => BAWAAN)
  return {
    setelan,
    ubah: (sebagian) => simpan(rapikan({ ...baca(), ...sebagian })),
    kembalikan: () => simpan(BAWAAN),
    adaYangAktif: !samaDenganBawaan(setelan),
  }
}

/** Kelas untuk akar .panel-dosen; aturannya di index.css › menu aksesibilitas. */
export function kelasAksesibilitas(s) {
  return [
    s.sorotJudul && 'a11y-sorot-judul',
    s.sorotTautan && 'a11y-sorot-tautan',
    s.disleksia && 'a11y-disleksia',
    s.jarakHuruf && 'a11y-jarak-huruf',
    s.jarakBaris && 'a11y-jarak-baris',
    s.tebal && 'a11y-tebal',
    s.kontras === 'gelap' && 'a11y-kontras-gelap',
    s.kontras === 'terang' && 'a11y-kontras-terang',
    s.diam && 'a11y-diam',
    s.kursor && 'a11y-kursor',
  ]
    .filter(Boolean)
    .join(' ')
}

/* Filter warna dipasang di <html>, bukan di panel: filter pada elemen lain menjadi bingkai bagi elemen fixed di
   dalamnya (menu samping, bilah bawah, tombol bantuan), sedangkan elemen akar dikecualikan dari aturan itu. */
export function saringanAksesibilitas(s) {
  return [
    s.kontras === 'tinggi' && 'contrast(1.35)',
    s.saturasi === 'tinggi' && 'saturate(1.8)',
    s.saturasi === 'rendah' && 'saturate(0.4)',
    s.saturasi === 'monokrom' && 'grayscale(1)',
  ]
    .filter(Boolean)
    .join(' ')
}
