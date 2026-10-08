import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const LENGKUNG = 'cubic-bezier(.22,.68,.35,1)'
const DURASI = '.32s'

// Selama `siap` palsu (belum terukur), pemanggil memakai latar statisnya sendiri.
export function usePenandaGeser(aktif) {
  const wadah = useRef(null)
  const aktifRef = useRef(aktif)
  const [posisi, setPosisi] = useState(null)
  const [gerak, setGerak] = useState(false)

  const ukur = useCallback(() => {
    const el = [...(wadah.current?.querySelectorAll('[data-geser]') ?? [])].find(
      (n) => n.dataset.geser === aktifRef.current,
    )
    setPosisi(
      el && el.offsetHeight
        ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
        : null,
    )
  }, [])

  useLayoutEffect(() => {
    aktifRef.current = aktif
    ukur()
  }, [aktif, ukur])

  useEffect(() => {
    const el = wadah.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    let bingkai = 0
    const ro = new ResizeObserver(() => {
      setGerak(false)
      ukur()
      cancelAnimationFrame(bingkai)
      bingkai = requestAnimationFrame(() => setGerak(true))
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(bingkai)
    }
  }, [ukur])

  const gaya = posisi
    ? {
        width: posisi.w,
        height: posisi.h,
        transform: 'translate(' + posisi.x + 'px,' + posisi.y + 'px)',
        transition: gerak
          ? ['transform', 'width', 'height'].map((p) => p + ' ' + DURASI + ' ' + LENGKUNG).join(',')
          : 'none',
      }
    : undefined

  return { wadah, siap: Boolean(posisi), gaya }
}
