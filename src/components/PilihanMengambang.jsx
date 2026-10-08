import { useEffect, useId, useRef, useState } from 'react'
import { IconCheck, IconChevronDown } from './Icons'

// Pilihan tunggal dengan panel melayang, pola listbox WAI-ARIA: panah, Home/End, Enter/Spasi, Escape.
// Panelnya padat, bukan kaca: ia melayang di atas grafik, dan teks di atas kaca yang menutupi
// batang gelap tidak bisa dijamin kontrasnya.
export default function PilihanMengambang({ label, nilai, pilihan, onPilih, namaDaftar }) {
  const idDaftar = useId()
  const [buka, setBuka] = useState(false)
  // Tetap terpasang selama animasi tutup berjalan.
  const [pasang, setPasang] = useState(false)
  const [sorot, setSorot] = useState(0)
  const wadah = useRef(null)
  const tombol = useRef(null)
  const opsi = useRef([])

  const iTerpilih = Math.max(0, pilihan.findIndex((p) => p.nilai === nilai))

  const bukaPanel = () => {
    setSorot(iTerpilih)
    setPasang(true)
    setBuka(true)
  }
  const tutup = (fokusKeTombol) => {
    setBuka(false)
    if (fokusKeTombol) tombol.current?.focus()
  }
  const pilih = (i) => {
    onPilih(pilihan[i].nilai)
    tutup(true)
  }

  useEffect(() => {
    if (buka) opsi.current[sorot]?.focus()
  }, [buka, sorot])

  useEffect(() => {
    if (!buka) return undefined
    const diLuar = (e) => {
      if (!wadah.current?.contains(e.target)) tutup(false)
    }
    document.addEventListener('mousedown', diLuar)
    return () => document.removeEventListener('mousedown', diLuar)
  }, [buka])

  // Pengaman bila animationend tidak pernah datang (animasi dimatikan, jsdom).
  useEffect(() => {
    if (buka || !pasang) return undefined
    const id = setTimeout(() => setPasang(false), 180)
    return () => clearTimeout(id)
  }, [buka, pasang])

  const tekanTombol = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      bukaPanel()
    }
  }

  const tekanDaftar = (e) => {
    const akhir = pilihan.length - 1
    const ke = { ArrowDown: Math.min(sorot + 1, akhir), ArrowUp: Math.max(sorot - 1, 0), Home: 0, End: akhir }[e.key]
    if (ke !== undefined) {
      e.preventDefault()
      setSorot(ke)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pilih(sorot)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      tutup(true)
    } else if (e.key === 'Tab') {
      tutup(false)
    }
  }

  return (
    <div ref={wadah} className="relative">
      <button
        ref={tombol}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={buka}
        aria-controls={pasang ? idDaftar : undefined}
        onClick={() => (buka ? tutup(false) : bukaPanel())}
        onKeyDown={tekanTombol}
        className={
          'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition sm:min-h-0 sm:py-1.5 ' +
          (buka ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line text-ink hover:bg-surface-2')
        }
      >
        {label}
        <IconChevronDown
          size={14}
          className={'shrink-0 transition-transform duration-200 ' + (buka ? 'rotate-180' : '')}
        />
      </button>

      {pasang ? (
        <ul
          id={idDaftar}
          role="listbox"
          aria-label={namaDaftar}
          onKeyDown={tekanDaftar}
          onAnimationEnd={() => {
            if (!buka) setPasang(false)
          }}
          className={
            'absolute left-0 top-[calc(100%+6px)] z-50 w-max min-w-full rounded-xl border border-line bg-surface p-1 shadow-pop ' +
            (buka ? 'animate-kaca' : 'pointer-events-none animate-surut')
          }
        >
          {pilihan.map((p, i) => {
            const terpilih = p.nilai === nilai
            return (
              <li
                key={p.nilai}
                ref={(el) => {
                  opsi.current[i] = el
                }}
                role="option"
                aria-selected={terpilih}
                tabIndex={-1}
                onClick={() => pilih(i)}
                onMouseEnter={() => setSorot(i)}
                className={
                  'flex cursor-pointer items-center gap-4 rounded-lg px-2.5 py-2 ' +
                  (i === sorot ? 'bg-surface-2 ' : '') +
                  (terpilih ? 'text-brand-ink' : 'text-ink')
                }
              >
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold leading-tight">{p.label}</span>
                  {p.keterangan ? (
                    <span className="mt-0.5 block text-[11px] leading-tight text-ink-2">{p.keterangan}</span>
                  ) : null}
                </span>
                {terpilih ? (
                  <IconCheck size={15} className="ml-auto shrink-0" />
                ) : (
                  <span aria-hidden="true" className="ml-auto w-[15px] shrink-0" />
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
