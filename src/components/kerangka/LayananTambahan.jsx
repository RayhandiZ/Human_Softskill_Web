'use client'

import { useEffect, useRef, useState } from 'react'
import { IconChat, IconChevronRight, IconX } from '../Icons'
import { LAYANAN } from '../../lib/layanan'
import { useTeks } from '../../lib/bahasa'
import { KeteranganAsisten, PanelAsisten, UbinAsisten, useAsisten } from './AsistenVibe'

/* Tetap di bawah laci navigasi (z-40 < z-50) dan tidak ikut tercetak. Letaknya sama di panel mahasiswa dan dosen; sampai
   15 Nov 2026 panel dosen menaikkannya di atas bilah bawah HP, yang kini diganti laci. Tombolnya selalu terlihat, juga
   saat halaman digulir (pilihan pemilik produk), walau di pojok kanan bawah ia menutupi sedikit isi.
   `asisten` ('mahasiswa' | 'dosen') memasang Asisten VIBE sebagai pilihan pertama, di atas saluran petugas; panelnya
   melebar menjadi percakapan saat pilihan itu dibuka (AsistenVibe.jsx, README.md › Asisten VIBE). */

export default function LayananTambahan({ asisten: peranAsisten = null }) {
  const t = useTeks()
  const [buka, setBuka] = useState(false)
  const [layar, setLayar] = useState('menu')
  const asisten = useAsisten()
  const wadah = useRef(null)
  const tombol = useRef(null)
  const tombolAsisten = useRef(null)
  const dariPercakapan = useRef(false)
  const diAsisten = Boolean(peranAsisten) && layar === 'asisten'

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

  // Kembali dari percakapan: fokus ke pilihan Asisten VIBE, tempat pengguna tadi masuk.
  useEffect(() => {
    if (layar !== 'menu' || !dariPercakapan.current) return
    dariPercakapan.current = false
    tombolAsisten.current?.focus()
  }, [layar])

  return (
    <div ref={wadah} className="fixed bottom-5 right-5 z-40 print:hidden sm:bottom-6 sm:right-6">
      {buka ? (
        <div
          id="panel-layanan"
          role="dialog"
          aria-label={t(diAsisten ? 'Asisten VIBE' : 'Layanan tambahan')}
          className={
            'kaca layanan-panel absolute bottom-[calc(100%+12px)] right-0 overflow-hidden rounded-3xl ' +
            (diAsisten
              ? // 9rem: tombol 56px, jarak ke dasar layar sampai 24px, jarak ke panel 12px, dan sisa supaya tidak menempel
                // ke bilah atas (di 1536×728 puncaknya 96px, bilah atas berakhir di 73px).
                'asisten-panel flex h-[min(540px,calc(100dvh-9rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col'
              : 'w-[min(304px,calc(100vw-2.5rem))]')
          }
        >
          {diAsisten ? (
            <PanelAsisten
              asisten={asisten}
              peran={peranAsisten}
              onKembali={() => {
                dariPercakapan.current = true
                setLayar('menu')
              }}
            />
          ) : (
            <>
              <div className="border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-4 py-3.5">
                <p className="text-[15px] font-bold text-ink">{t('Butuh bantuan?')}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
                  {t('Pilih saluran yang paling cocok dengan pertanyaan Anda.')}
                </p>
              </div>

              <ul className="p-2">
                {peranAsisten ? (
                  <li className="layanan-item">
                    <button
                      ref={tombolAsisten}
                      type="button"
                      onClick={() => setLayar('asisten')}
                      className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)]"
                    >
                      <UbinAsisten besar />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-bold leading-snug text-ink">{t('Asisten VIBE')}</span>
                        <KeteranganAsisten peran={peranAsisten} className="block truncate text-[12.5px] leading-snug text-ink-2" />
                      </span>
                      <IconChevronRight size={16} className="shrink-0 text-ink-3" />
                    </button>
                  </li>
                ) : null}
                {LAYANAN.map((l, i) => (
                  <li
                    key={l.id}
                    className="layanan-item"
                    style={{ animationDelay: (i + (peranAsisten ? 1 : 0)) * 55 + 'ms' }}
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
            </>
          )}
        </div>
      ) : null}

      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-controls="panel-layanan"
        aria-label={t(buka ? 'Tutup layanan tambahan' : 'Layanan tambahan')}
        className="layanan-tombol grid h-14 w-14 place-items-center rounded-full bg-brand text-white transition duration-300 motion-reduce:transition-none"
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
