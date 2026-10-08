'use client'

import { useEffect, useRef, useState } from 'react'
import { IconChat, IconChevronRight, IconClock, IconInfo, IconX } from './Icons'
import { KONTAK_UMN, LAYANAN } from '../lib/layanan'
import { useTeks } from '../lib/bahasa'

/* --------------------------------------------------------------------------
   Layanan tambahan — tombol mengambang di sudut kanan bawah panel mahasiswa.

   Kenapa mengambang, bukan satu bagian di kaki halaman: orang mencari bantuan
   justru ketika sedang tersesat di tengah halaman, dan kaki halaman baru
   ditemukan setelah menggulir sampai habis. Yang mengambang selalu berada
   sejauh satu ketukan dari mana pun pembacanya berada.

   Kontaknya sendiri TIDAK ditulis ulang di sini; semuanya dibaca dari
   lib/layanan.js, satu tempat yang juga dipakai kaki halaman.

   Beberapa hal yang sengaja dipasang:

   - print:hidden. Halaman transkrip memang dicetak, dan tombol bantuan yang
     ikut tercetak di atas kertas transkrip resmi hanya jadi noda tinta.
   - z-40, di bawah laci navigasi yang z-50. Saat laci terbuka, tombol ini
     harus berada DI BALIK lapisan gelapnya, bukan mengambang di atasnya.
   - Tautan wa.me dibuka di tab baru dengan rel noopener: halaman yang dibuka
     lewat target _blank bisa menyentuh window.opener tanpa itu.
   -------------------------------------------------------------------------- */

export default function LayananTambahan() {
  const t = useTeks()
  const [buka, setBuka] = useState(false)
  const wadah = useRef(null)
  const tombol = useRef(null)

  useEffect(() => {
    if (!buka) return
    const diLuar = (e) => {
      if (wadah.current && !wadah.current.contains(e.target)) setBuka(false)
    }
    const tombolEsc = (e) => {
      if (e.key !== 'Escape') return
      setBuka(false)
      /* Fokus dikembalikan ke tombolnya. Tanpa ini, pengguna papan ketik yang
         menutup panel akan terlempar ke awal halaman. */
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
          /* kaca = bahan yang sama dengan panel lain di aplikasi ini. Lebarnya
             menyusut sendiri di layar sempit supaya tidak pernah menyentuh
             tepi kiri. */
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
                /* Muncul berurutan, bukan serentak. Jeda 55 ms cukup untuk
                   terbaca sebagai urutan, belum terasa sebagai antrean. */
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

          <div className="border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-4 py-3">
            <p className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-3">
              <IconClock size={13} className="mt-px shrink-0" />
              {t(KONTAK_UMN.jam)}
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-ink-3">
              <IconInfo size={13} className="mt-px shrink-0" />
              {t('Datang langsung ke {tempat}', { tempat: KONTAK_UMN.helpdesk })}
            </p>
          </div>
        </div>
      ) : null}

      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-controls="panel-layanan"
        aria-label={t(buka ? 'Tutup layanan tambahan' : 'Layanan tambahan')}
        className="layanan-tombol grid h-14 w-14 place-items-center rounded-full bg-brand text-white"
      >
        <span
          /* Ikonnya berputar saat berganti, bukan bertukar mendadak: yang
             berputar terbaca sebagai benda yang sama berubah keadaan. */
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
