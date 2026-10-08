import { useEffect, useRef, useState } from 'react'

// Titik data yang sedang ditunjuk: lewat tetikus, fokus papan ketik, atau ketukan (yang memberi fokus).
// Tetikus boleh singgah di tooltip tanpa ia hilang, dan Escape menyembunyikannya (WCAG 1.4.13).
export function useTunjuk() {
  const jeda = useRef(0)
  const [arah, setArah] = useState(null)
  const [fokus, setFokus] = useState(null)
  const [diam, setDiam] = useState(false)
  const aktif = diam ? null : (arah ?? fokus)

  // Jeda singkat sebelum hilang, supaya tetikus sempat pindah ke tooltip.
  const lepas = () => {
    clearTimeout(jeda.current)
    jeda.current = setTimeout(() => setArah(null), 150)
  }
  useEffect(() => () => clearTimeout(jeda.current), [])

  useEffect(() => {
    if (aktif == null) return undefined
    const tekan = (e) => e.key === 'Escape' && setDiam(true)
    document.addEventListener('keydown', tekan)
    return () => document.removeEventListener('keydown', tekan)
  }, [aktif])

  const titik = (i) => ({
    onPointerEnter: () => {
      clearTimeout(jeda.current)
      setDiam(false)
      setArah(i)
    },
    onPointerLeave: lepas,
    onFocus: () => {
      setDiam(false)
      setFokus(i)
    },
    onBlur: () => setFokus((f) => (f === i ? null : f)),
  })

  const tip = { onPointerEnter: () => clearTimeout(jeda.current), onPointerLeave: lepas }

  return { aktif, titik, tip }
}
