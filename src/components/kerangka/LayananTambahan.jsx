'use client'

import { useEffect, useRef, useState } from 'react'
import { IconChat, IconChevronRight, IconX } from '../Icons'
import { LAYANAN } from '../../lib/layanan'
import { useTeks } from '../../lib/bahasa'

/* Tetap di bawah laci navigasi (z-40 < z-50) dan tidak ikut tercetak. Letaknya sama di panel mahasiswa dan dosen; sampai
   15 Nov 2026 panel dosen menaikkannya di atas bilah bawah HP, yang kini diganti laci.

   Sejak 24 Nov 2026 tombolnya menyingkir saat halaman digulir ke bawah dan muncul lagi saat digulir ke atas, di puncak,
   atau di dasar halaman (di sana yang tertutup hanya footer). Isi panel selebar layar, jadi tombol 56px ini menutupi
   isi di pojok kanan bawah, misalnya nilai Semester 3 di Beranda mahasiswa pada layar 1536x728. Yang digeser hanya
   tombolnya, bukan pembungkus panel: pembungkus yang dianimasikan memutus backdrop-filter panel kaca di dalamnya. */
const AMBANG_GULIR = 24

export default function LayananTambahan() {
  const t = useTeks()
  const [buka, setBuka] = useState(false)
  const [menyingkir, setMenyingkir] = useState(false)
  const wadah = useRef(null)
  const tombol = useRef(null)

  useEffect(() => {
    let acuan = window.scrollY
    let bingkai = 0
    const gulir = () => {
      cancelAnimationFrame(bingkai)
      bingkai = requestAnimationFrame(() => {
        const y = window.scrollY
        const dasar = y + window.innerHeight >= document.documentElement.scrollHeight - 40
        if (y < 80 || dasar || y - acuan < -AMBANG_GULIR) {
          setMenyingkir(false)
          acuan = y
        } else if (y - acuan > AMBANG_GULIR) {
          // Tombol yang sedang difokus papan ketik tidak disembunyikan.
          if (document.activeElement !== tombol.current) setMenyingkir(true)
          acuan = y
        }
      })
    }
    window.addEventListener('scroll', gulir, { passive: true })
    return () => {
      cancelAnimationFrame(bingkai)
      window.removeEventListener('scroll', gulir)
    }
  }, [])
  const tersembunyi = menyingkir && !buka

  useEffect(() => {
    if (!buka) return
    const diLuar = (e) => {
      if (wadah.current && !wadah.current.contains(e.target)) setBuka(false)
    }
    const tombolEsc = (e) => {
      if (e.key !== 'Escape') return
      setBuka(false)
      tombol.current?.focus()
    }
    document.addEventListener('mousedown', diLuar)
    document.addEventListener('keydown', tombolEsc)
    return () => {
      document.removeEventListener('mousedown', diLuar)
      document.removeEventListener('keydown', tombolEsc)
    }
  }, [buka])

  return (
    <div ref={wadah} className="fixed bottom-5 right-5 z-40 print:hidden sm:bottom-6 sm:right-6">
      {buka ? (
        <div
          id="panel-layanan"
          role="dialog"
          aria-label={t('Layanan tambahan')}
          className="kaca layanan-panel absolute bottom-[calc(100%+12px)] right-0 w-[min(304px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl"
        >
          <div className="border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-4 py-3.5">
            <p className="text-[15px] font-bold text-ink">{t('Butuh bantuan?')}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
              {t('Pilih saluran yang paling cocok dengan pertanyaan Anda.')}
            </p>
          </div>

          <ul className="p-2">
            {LAYANAN.map((l, i) => (
              <li
                key={l.id}
                className="layanan-item"
                style={{ animationDelay: i * 55 + 'ms' }}
              >
                <a
                  href={l.tautan}
                  target={l.keluar ? '_blank' : undefined}
                  rel={l.keluar ? 'noopener noreferrer' : undefined}
                  onClick={() => setBuka(false)}
                  className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition hover:bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                    <l.ikon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold leading-snug text-ink">
                      {t(l.label)}
                    </span>
                    <span className="block truncate text-[12.5px] leading-snug text-ink-2">
                      {l.nilai ?? t(l.rinci)}
                    </span>
                  </span>
                  <IconChevronRight size={16} className="shrink-0 text-ink-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-controls="panel-layanan"
        aria-label={t(buka ? 'Tutup layanan tambahan' : 'Layanan tambahan')}
        className={
          'layanan-tombol grid h-14 w-14 place-items-center rounded-full bg-brand text-white transition duration-300 focus-visible:translate-y-0 focus-visible:opacity-100 motion-reduce:transition-none ' +
          (tersembunyi ? 'pointer-events-none translate-y-[calc(100%+2rem)] opacity-0' : '')
        }
      >
        <span
          className={
            'transition-transform duration-300 ' + (buka ? 'rotate-90' : 'rotate-0')
          }
        >
          {buka ? <IconX size={24} /> : <IconChat size={24} />}
        </span>
      </button>
    </div>
  )
}
