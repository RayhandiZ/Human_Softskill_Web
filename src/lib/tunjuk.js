import { useEffect, useRef, useState } from 'react'

// Tooltip WCAG 1.4.13: tetap saat tetikus singgah, Escape menyembunyikan.
export function useTunjuk() {
  const jeda = useRef(0)
  const [arah, setArah] = useState(null)
  const [fokus, setFokus] = useState(null)
  const [diam, setDiam] = useState(false)
  const aktif = diam ? null : (arah ?? fokus)

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
