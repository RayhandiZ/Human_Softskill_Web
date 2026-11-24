import { useEffect } from 'react'

const BAWAAN = 'VIBE'

/* Judul tab peramban per halaman: "<halaman> · VIBE" (24 Nov 2026). Dulu semua halaman berjudul "VIBE" saja (metadata
   app/layout.jsx), sehingga beberapa tab VIBE tidak bisa dibedakan dan pembaca layar tidak menyebut halaman mana yang
   terbuka. Diatur di klien supaya ikut bahasa yang dipilih; panel kerja mengaturnya lewat RemahKerja (KerangkaKerja.jsx),
   halaman masuk, lupa sandi, dan atur sandi masing-masing.

   <head> diamati selama ada judul aktif: Next.js mencabut lalu memasang lagi metadata app/layout.jsx, termasuk
   <title>VIBE</title>, sesudah efek halaman berjalan (terekam saat pindah /masuk ke /lupa-sandi: dicabut 85ms, judul
   halaman dipasang 92ms, <title>VIBE</title> kembali 96ms), dan judul halaman hilang.

   Satu pengamat dan satu tumpukan untuk semua pemakai; yang ditegakkan hanya judul yang terakhir dipasang. Dulu tiap
   pemakai punya pengamat sendiri, dan dua halaman yang terpasang bersamaan saling menimpa tanpa henti (smoke test macet
   dengan satu inti CPU penuh, 24 Nov 2026). */
const tumpukan = []
let pengamat = null

function terapkan() {
  const judul = tumpukan.length ? tumpukan[tumpukan.length - 1] : BAWAAN
  if (document.title !== judul) document.title = judul
}

export function useJudulTab(halaman) {
  useEffect(() => {
    if (!halaman) return undefined
    const judul = halaman + ' · ' + BAWAAN
    tumpukan.push(judul)
    if (!pengamat) {
      pengamat = new MutationObserver(terapkan)
      pengamat.observe(document.head, { subtree: true, childList: true, characterData: true })
    }
    terapkan()
    return () => {
      tumpukan.splice(tumpukan.lastIndexOf(judul), 1)
      if (!tumpukan.length) {
        pengamat.disconnect()
        pengamat = null
      }
      terapkan()
    }
  }, [halaman])
}
