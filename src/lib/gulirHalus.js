'use client'

import { useEffect, useState } from 'react'

/* Gulir roda halus di keempat panel (MahasiswaLayout, dan KerangkaKerja untuk dosen, admin, dan Super Admin) memakai
   Lenis (lenis 1.3.27, MIT; CSS-nya dimuat app/layout.jsx). Hanya roda
   tetikus dan touchpad yang dihaluskan; sentuh, papan ketik, batang gulir, dan lompatan jangkar tetap milik peramban.
   Lihat README.md › Gerak. */

// Hanya perangkat bertetikus; di HP tidak ada roda, jadi Lenis tidak dimuat sama sekali.
const PERANGKAT_TETIKUS = '(hover: hover) and (pointer: fine)'
// Saat sistem meminta gerak dikurangi, Lenis tidak dibuat: gulirnya kembali bawaan, bukan sekadar lompat tanpa animasi.
const GERAK_DIKURANGI = '(prefers-reduced-motion: reduce)'

/* Laci HP dan penampil foto mengunci gulir dengan overflow hidden di <body>. Lenis tidak mengenalnya dan tetap akan
   menggulir halaman di belakangnya, jadi rodanya dikembalikan ke peramban (yang tidak menggulir apa pun). */
function gulirTerkunci() {
  const terkunci = (el) => /hidden|clip/.test(getComputedStyle(el).overflowY)
  return terkunci(document.documentElement) || terkunci(document.body)
}

function useBolehHalus() {
  const [boleh, setBoleh] = useState(false)
  useEffect(() => {
    const tetikus = window.matchMedia?.(PERANGKAT_TETIKUS)
    const kurangi = window.matchMedia?.(GERAK_DIKURANGI)
    if (!tetikus || !kurangi) return undefined
    const ukur = () => setBoleh(tetikus.matches && !kurangi.matches)
    ukur()
    tetikus.addEventListener?.('change', ukur)
    kurangi.addEventListener?.('change', ukur)
    return () => {
      tetikus.removeEventListener?.('change', ukur)
      kurangi.removeEventListener?.('change', ukur)
    }
  }, [])
  return boleh
}

/** Memasang Lenis selama `aktif` (pemanggil mematikannya saat Hentikan animasi menyala). */
export function useGulirHalus(aktif) {
  const nyala = useBolehHalus() && aktif

  useEffect(() => {
    if (!nyala) return undefined
    let lenis = null
    let batal = false

    /* Selama Lenis menganimasikan gulir, Lenis mengabaikan gulir dari luar (papan ketik, batang gulir, fokus, pindah
       halaman) dan akan menimpanya. Gulir yang tidak sama dengan posisi animasi Lenis berarti datang dari luar, jadi
       animasinya dihentikan dan halaman mengikuti gulir itu. */
    const gulirLuar = () => {
      if (lenis?.isScrolling === 'smooth' && Math.abs(window.scrollY - lenis.animatedScroll) > 2) lenis.reset()
    }

    import('lenis').then(({ default: Lenis }) => {
      if (batal) return
      lenis = new Lenis({
        autoRaf: true,
        // Wadah yang bisa digulir sendiri (daftar pilihan, panel bantuan, menu) memakai gulir bawaan.
        allowNestedScroll: true,
        // Klik tautan di halaman menghentikan sisa luncuran, supaya halaman baru mulai dari atas.
        stopInertiaOnNavigate: true,
        // Shift + roda (geser ke samping) dan gulir yang sedang dikunci dikembalikan ke peramban. Ctrl + roda (zoom)
        // sudah dilewati Lenis sendiri.
        virtualScroll: ({ event }) => !event.shiftKey && !gulirTerkunci(),
      })
      window.addEventListener('scroll', gulirLuar, { passive: true })
    })

    return () => {
      batal = true
      window.removeEventListener('scroll', gulirLuar)
      lenis?.destroy()
    }
  }, [nyala])
}
