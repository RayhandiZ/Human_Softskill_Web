'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from './Icons'
import { useTeks } from '../lib/bahasa'

/* Dipasang di <body> lewat portal supaya tidak terpotong kartu induk; fokus kembali ke pemicunya saat ditutup. */
export default function LihatFoto({ src, nama, onTutup }) {
  const t = useTeks()
  const tutupRef = useRef(onTutup)
  tutupRef.current = onTutup
  const tombolRef = useRef(null)

  useEffect(() => {
    const asalFokus = document.activeElement
    const asalGulir = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    tombolRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') tutupRef.current()
      // Satu-satunya yang bisa difokus di dalam adalah tombol tutup, jadi Tab tetap di sana.
      if (e.key === 'Tab') {
        e.preventDefault()
        tombolRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = asalGulir
      document.removeEventListener('keydown', onKey)
      asalFokus?.focus?.()
    }
  }, [])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Foto profil')}
      className="fixed inset-0 z-50 grid place-items-center p-6 print:hidden"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => tutupRef.current()}
        className="absolute inset-0 h-full w-full cursor-zoom-out bg-black/75 animate-pudar"
      />

      <figure className="relative flex flex-col items-center gap-4 animate-rise">
        <img
          src={src}
          alt={nama}
          className="aspect-square w-[min(78vw,320px)] rounded-full object-cover shadow-pop ring-4 ring-white/15"
        />
        <figcaption className="text-center text-[16px] font-bold text-white">{nama}</figcaption>
      </figure>

      <button
        ref={tombolRef}
        type="button"
        onClick={() => tutupRef.current()}
        aria-label={t('Tutup foto profil')}
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <IconX size={22} />
      </button>
    </div>,
    document.body,
  )
}
