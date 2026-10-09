import { useEffect, useRef } from 'react'
import { IconX } from './Icons'
import LogoPdp from './LogoPdp'
import { useTeks } from '../lib/bahasa'

export default function Laci({ buka, onTutup, label = 'Menu navigasi', nada = 'terang', children }) {
  const gelap = nada === 'gelap'
  const t = useTeks()

  const panelRef = useRef(null)

  /* Disimpan di ref supaya fungsi baru dari induk tidak memicu ulang efek dan merebut fokus. */
  const tutupRef = useRef(onTutup)
  tutupRef.current = onTutup

  useEffect(() => {
    if (!buka) return
    const asal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') tutupRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = asal
      document.removeEventListener('keydown', onKey)
    }
  }, [buka])

  if (!buka) return null

  return (
    <div className="fixed inset-0 z-50 print:hidden">
      <button
        type="button"
        aria-label={t('Tutup menu navigasi')}
        onClick={() => tutupRef.current()}
        className="absolute inset-0 h-full w-full cursor-default bg-black/45 animate-pudar"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(label)}
        tabIndex={-1}
        className={
          'absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col shadow-pop outline-none animate-geser ' +
          (gelap ? 'bg-brand-deep text-white' : 'bg-surface')
        }
      >
        <div
          className={
            'flex h-[64px] shrink-0 items-center justify-between gap-3 px-4 text-white ' +
            (gelap ? 'border-b border-white/10' : 'bg-brand')
          }
        >
          <span className="flex items-center gap-2.5">
            <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-white" />
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-white/30" />
            <span className="text-[14px] font-extrabold tracking-tight">
              HUMAN <span className="text-[var(--accent)]">SKILL</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => tutupRef.current()}
            aria-label={t('Tutup menu navigasi')}
            className="-mr-1 grid h-9 w-9 place-items-center rounded-lg text-white transition hover:bg-white/10"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
