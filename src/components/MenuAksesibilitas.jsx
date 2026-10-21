'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lexend } from 'next/font/google'
import {
  IconAksesibilitas,
  IconBook,
  IconCheck,
  IconHentikan,
  IconHurufCek,
  IconJarakBaris,
  IconJarakHuruf,
  IconJudul,
  IconKontras,
  IconKontrasTinggi,
  IconKursor,
  IconMinus,
  IconMonokrom,
  IconPlus,
  IconRefresh,
  IconSun,
  IconTautan,
  IconTebal,
  IconTetes,
  IconTetesKosong,
  IconUkuranHuruf,
  IconX,
} from './Icons'
import { SKALA, useAksesibilitas } from '../lib/aksesibilitas'
import { useTeks } from '../lib/bahasa'

/* Menu aksesibilitas panel dosen: tulisan, warna, dan alat bantu yang bisa dinyalakan sendiri oleh pemakainya,
   menggantikan tampilan yang serba besar. Susunannya mengikuti contoh dari pemilik produk (Penyesuaian konten,
   Penyesuaian warna, Alat). Setelannya di src/lib/aksesibilitas.js, penerapannya di DosenLayout dan index.css ›
   menu aksesibilitas. Lihat README.md › Panel Dosen › Menu aksesibilitas. */

/* Huruf ramah disleksia: Lexend, dirancang untuk mengurangi beban visual saat membaca. preload: false, jadi baru
   diunduh ketika setelan ini dinyalakan. --font-disleksia dipasang di akar panel dosen. */
export const hurufDisleksia = Lexend({ subsets: ['latin'], variable: '--font-disleksia', display: 'swap', preload: false })

const KONTEN = [
  { kunci: 'sorotJudul', label: 'Sorot judul', icon: IconJudul },
  { kunci: 'sorotTautan', label: 'Sorot tautan', icon: IconTautan },
  { kunci: 'disleksia', label: 'Huruf ramah disleksia', icon: IconHurufCek },
  { kunci: 'jarakHuruf', label: 'Jarak huruf', icon: IconJarakHuruf },
  { kunci: 'jarakBaris', label: 'Jarak baris', icon: IconJarakBaris },
  { kunci: 'tebal', label: 'Huruf tebal', icon: IconTebal },
]

// Satu pilihan per kelompok: kontras gelap, terang, dan tinggi saling menggantikan, begitu juga saturasi.
const WARNA = [
  { kelompok: 'kontras', nilai: 'gelap', label: 'Kontras gelap', icon: IconKontras },
  { kelompok: 'kontras', nilai: 'terang', label: 'Kontras terang', icon: IconSun },
  { kelompok: 'kontras', nilai: 'tinggi', label: 'Kontras tinggi', icon: IconKontrasTinggi },
  { kelompok: 'saturasi', nilai: 'tinggi', label: 'Saturasi tinggi', icon: IconTetes },
  { kelompok: 'saturasi', nilai: 'rendah', label: 'Saturasi rendah', icon: IconTetesKosong },
  { kelompok: 'saturasi', nilai: 'monokrom', label: 'Monokrom', icon: IconMonokrom },
]

const ALAT = [
  { kunci: 'pemandu', label: 'Pemandu baca', icon: IconBook },
  { kunci: 'diam', label: 'Hentikan animasi', icon: IconHentikan },
  { kunci: 'kursor', label: 'Kursor besar', icon: IconKursor },
]

/* Satu alat. Keadaan nyala tidak hanya dari warna: ada tanda centang, garis tepi tebal, dan aria-pressed. */
function Ubin({ aktif, onTekan, label, icon: Icon }) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onTekan}
      className={
        'ubin-a11y relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 text-center text-[13px] font-semibold leading-tight transition ' +
        (aktif ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-transparent bg-surface text-ink hover:border-line-strong')
      }
    >
      {aktif ? (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-ink text-[color:var(--surface)]">
          <IconCheck size={13} strokeWidth={2.4} />
        </span>
      ) : null}
      <Icon size={22} />
      <span>{label}</span>
    </button>
  )
}

function Bagian({ judul, children }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="mb-3 text-[14px] font-bold text-ink">{judul}</h3>
      {children}
    </section>
  )
}

export default function MenuAksesibilitas() {
  const t = useTeks()
  const { setelan, ubah, kembalikan, adaYangAktif } = useAksesibilitas()
  const [buka, setBuka] = useState(false)
  const wadah = useRef(null)
  const tombol = useRef(null)
  const judul = useRef(null)
  const idPanel = useId()
  const idJudul = useId()

  useEffect(() => {
    if (!buka) return
    judul.current?.focus()
    const diLuar = (e) => {
      if (wadah.current && !wadah.current.contains(e.target)) setBuka(false)
    }
    // Esc mengembalikan fokus ke tombolnya; Tab keluar dari menu menutupnya, seperti menu akun.
    const tombolEsc = (e) => {
      if (e.key !== 'Escape') return
      setBuka(false)
      tombol.current?.focus()
    }
    document.addEventListener('mousedown', diLuar)
    document.addEventListener('keydown', tombolEsc)
    document.addEventListener('focusin', diLuar)
    return () => {
      document.removeEventListener('mousedown', diLuar)
      document.removeEventListener('keydown', tombolEsc)
      document.removeEventListener('focusin', diLuar)
    }
  }, [buka])

  const tutup = () => {
    setBuka(false)
    tombol.current?.focus()
  }
  const { skala } = setelan

  return (
    <div ref={wadah} className="relative">
      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-controls={idPanel}
        aria-label={t('Menu aksesibilitas')}
        title={t('Menu aksesibilitas')}
        className="relative grid h-10 w-10 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition hover:text-ink"
      >
        <IconAksesibilitas size={20} />
        {/* Penanda bahwa ada setelan yang sedang menyala, supaya tampilan yang berubah tidak membingungkan. */}
        {adaYangAktif ? (
          <span aria-hidden="true" className="isi-toska absolute right-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--surface)]" />
        ) : null}
      </button>

      {buka ? (
        <div
          id={idPanel}
          role="dialog"
          aria-labelledby={idJudul}
          className="fixed inset-x-2 top-[76px] z-50 flex max-h-[calc(100dvh-88px-var(--tinggi-bilah-bawah,0px))] animate-rise flex-col overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[440px] sm:max-h-[min(680px,calc(100dvh-96px-var(--tinggi-bilah-bawah,0px)))]"
        >
          <div className="flex items-center gap-1 bg-brand py-2 pl-5 pr-2 text-white">
            <h2 ref={judul} id={idJudul} tabIndex={-1} className="flex-1 text-[15px] font-bold">
              {t('Menu aksesibilitas')}
            </h2>
            <button
              type="button"
              onClick={kembalikan}
              disabled={!adaYangAktif}
              aria-label={t('Kembalikan semua setelan')}
              title={t('Kembalikan semua setelan')}
              className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/10 disabled:opacity-40"
            >
              <IconRefresh size={19} />
            </button>
            <button
              type="button"
              onClick={tutup}
              aria-label={t('Tutup menu aksesibilitas')}
              className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/10"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="overflow-y-auto px-4 pb-5 pt-4 sm:px-5">
            <Bagian judul={t('Penyesuaian konten')}>
              <div className="rounded-2xl bg-surface px-4 py-3.5">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  <IconUkuranHuruf size={20} />
                  {t('Ukuran tulisan')}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => ubah({ skala: skala - SKALA.langkah })}
                    disabled={skala <= SKALA.min}
                    aria-label={t('Perkecil tulisan')}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong text-ink transition hover:bg-surface-2 disabled:opacity-40"
                  >
                    <IconMinus size={18} />
                  </button>
                  <output aria-live="polite" className="text-[18px] font-bold tabular-nums text-ink">
                    {skala}%
                  </output>
                  <button
                    type="button"
                    onClick={() => ubah({ skala: skala + SKALA.langkah })}
                    disabled={skala >= SKALA.maks}
                    aria-label={t('Perbesar tulisan')}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong text-ink transition hover:bg-surface-2 disabled:opacity-40"
                  >
                    <IconPlus size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                {KONTEN.map((a) => (
                  <Ubin key={a.kunci} aktif={setelan[a.kunci]} onTekan={() => ubah({ [a.kunci]: !setelan[a.kunci] })} label={t(a.label)} icon={a.icon} />
                ))}
              </div>
            </Bagian>

            <Bagian judul={t('Penyesuaian warna')}>
              <div className="grid grid-cols-3 gap-2.5">
                {WARNA.map((a) => {
                  const aktif = setelan[a.kelompok] === a.nilai
                  return (
                    <Ubin
                      key={a.kelompok + a.nilai}
                      aktif={aktif}
                      onTekan={() => ubah({ [a.kelompok]: aktif ? null : a.nilai })}
                      label={t(a.label)}
                      icon={a.icon}
                    />
                  )
                })}
              </div>
            </Bagian>

            <Bagian judul={t('Alat')}>
              <div className="grid grid-cols-3 gap-2.5">
                {ALAT.map((a) => (
                  <Ubin key={a.kunci} aktif={setelan[a.kunci]} onTekan={() => ubah({ [a.kunci]: !setelan[a.kunci] })} label={t(a.label)} icon={a.icon} />
                ))}
              </div>
            </Bagian>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* Pemandu baca: pita mendatar yang mengikuti penunjuk, untuk menjaga mata tetap di baris yang sedang dibaca.
   Dipasang di <body> lewat portal, di luar zoom isi panel, supaya letaknya sama persis dengan penunjuk. */
export function PemanduBaca() {
  const [y, setY] = useState(null)
  useEffect(() => {
    let bingkai = 0
    let terakhir = null
    const gerak = (e) => {
      terakhir = e.clientY
      if (!bingkai) {
        bingkai = requestAnimationFrame(() => {
          bingkai = 0
          setY(terakhir)
        })
      }
    }
    window.addEventListener('pointermove', gerak, { passive: true })
    return () => {
      window.removeEventListener('pointermove', gerak)
      cancelAnimationFrame(bingkai)
    }
  }, [])
  if (y == null) return null
  return createPortal(<div aria-hidden="true" className="pemandu-baca" style={{ top: y }} />, document.body)
}
