'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { IconChevronRight, IconSearch } from './Icons'
import { useTeks } from '../lib/bahasa'

/* Pencarian cepat panel Kemahasiswaan: mahasiswa (nama, NIM, email) dan halaman menu. Dibuka dari tombol di
   bilah atas atau Ctrl+K / ⌘K di halaman mana pun. Pola combobox: fokus tetap di kolom ketik, panah memindah
   sorotan (aria-activedescendant), Enter membuka, Esc menutup dan fokus kembali ke tombol pembukanya. */

const MAKS_MAHASISWA = 6

export default function CariCepat({ halaman, mahasiswa, keMahasiswa }) {
  const t = useTeks()
  const router = useRouter()
  const jalur = usePathname()
  const awalan = useId()
  const [buka, setBuka] = useState(false)
  const [kata, setKata] = useState('')
  const [sorot, setSorot] = useState(0)
  const pemicu = useRef(null)
  const pemicuIkon = useRef(null)
  const asalFokus = useRef(null)
  const masukan = useRef(null)
  const daftar = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuka(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Pindah halaman dari tempat lain (misalnya menu) menutup pencarian.
  useEffect(() => setBuka(false), [jalur])

  useEffect(() => {
    if (!buka) return undefined
    // Dicatat sebelum kolom cari mengambil fokus: tombol mana pun yang membukanya (versi lebar atau ikon),
    // atau unsur apa pun yang sedang difokus saat Ctrl+K ditekan.
    asalFokus.current = document.activeElement
    setKata('')
    setSorot(0)
    masukan.current?.focus()
    // Halaman di belakangnya tidak ikut tergulir selama pencarian terbuka.
    const lama = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = lama
    }
  }, [buka])

  const q = kata.trim().toLowerCase()
  const hasil = useMemo(() => {
    const mhs =
      q.length < 2
        ? []
        : mahasiswa
            .filter((s) => [s.name, s.nim, s.email].some((x) => String(x ?? '').toLowerCase().includes(q)))
            .slice(0, MAKS_MAHASISWA)
            .map((s) => ({
              id: 'm-' + s.id,
              jenis: 'mahasiswa',
              ke: keMahasiswa(s),
              judul: s.name,
              rinci: [s.nim, s.program, t('Angkatan {label}', { label: s.angkatanLabel })].filter(Boolean).join(' · '),
            }))
    const hal = halaman
      .filter((h) => !q || t(h.label).toLowerCase().includes(q))
      .map((h) => ({ id: 'h-' + h.to, jenis: 'halaman', ke: h.to, judul: t(h.label), ikon: h.icon }))
    return [...mhs, ...hal]
  }, [q, mahasiswa, halaman, keMahasiswa, t])

  useEffect(() => setSorot(0), [q])

  // Butir yang tersorot selalu terlihat saat dipindah dengan panah.
  useEffect(() => {
    if (!buka) return
    daftar.current?.querySelector('[data-sorot="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [sorot, buka])

  function tutup(kembalikanFokus = true) {
    setBuka(false)
    if (!kembalikanFokus) return
    requestAnimationFrame(() => {
      const asal = asalFokus.current
      // Tombol versi lebar disembunyikan di bawah 1280px; fokus ke unsur tersembunyi akan hilang ke <body>.
      if (asal && asal !== document.body && asal.isConnected && asal.getClientRects().length) asal.focus()
      else [pemicu.current, pemicuIkon.current].find((b) => b?.getClientRects().length)?.focus()
    })
  }

  function pilih(h) {
    tutup(false)
    router.push(h.ke)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSorot((i) => (hasil.length ? (i + 1) % hasil.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSorot((i) => (hasil.length ? (i - 1 + hasil.length) % hasil.length : 0))
    } else if (e.key === 'Home' && hasil.length) {
      e.preventDefault()
      setSorot(0)
    } else if (e.key === 'End' && hasil.length) {
      e.preventDefault()
      setSorot(hasil.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hasil[sorot]) pilih(hasil[sorot])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      tutup()
    } else if (e.key === 'Tab') {
      // Hanya ada satu kolom di dialog ini; Tab tidak boleh keluar ke halaman di belakangnya.
      e.preventDefault()
    }
  }

  const kelompok = [
    { judul: t('Mahasiswa'), butir: hasil.filter((h) => h.jenis === 'mahasiswa') },
    { judul: t('Halaman'), butir: hasil.filter((h) => h.jenis === 'halaman') },
  ].filter((k) => k.butir.length)
  const idButir = (h) => awalan + h.id

  return (
    <>
      <button
        ref={pemicu}
        type="button"
        onClick={() => setBuka(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        // Versi lebar hanya mulai 1280px, dan lebarnya tetap: di 1024 sampai 1279px menu samping memakan
        // tempatnya, dan versi selebar 24vw dulu memotong teksnya sekaligus menghimpit lokasi halaman.
        className="hidden h-11 w-[310px] items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 text-[14px] text-ink-2 transition hover:border-line-strong xl:flex min-[1440px]:w-[330px]"
      >
        <IconSearch size={17} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{t('Cari mahasiswa atau halaman')}</span>
        <kbd className="shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11.5px] font-semibold text-ink-2">
          Ctrl K
        </kbd>
      </button>
      <button
        ref={pemicuIkon}
        type="button"
        onClick={() => setBuka(true)}
        aria-haspopup="dialog"
        aria-label={t('Cari mahasiswa atau halaman')}
        aria-keyshortcuts="Control+K Meta+K"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-2 transition hover:bg-surface hover:text-ink xl:hidden"
      >
        <IconSearch size={20} />
      </button>

      {/* Lewat portal ke <body>: bilah atas punya tumpukan (z-index) sendiri yang lebih rendah dari menu samping,
          jadi tanpa portal menu samping tidak ikut tertutup tirai dan masih bisa diklik. */}
      {buka ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[rgb(8_14_30/0.45)] px-4 pt-[min(14vh,120px)] animate-[pudar_.15s_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) tutup()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('Pencarian cepat')}
            className="w-full max-w-[600px] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-rise"
          >
            {/* Garis bawah berubah warna saat kolom difokus; itu penanda fokusnya, pengganti cincin bawaan. */}
            <div className="flex items-center gap-3 border-b-2 border-line px-4 transition-colors focus-within:border-brand-ink">
              <IconSearch size={19} className="shrink-0 text-ink-2" />
              <input
                ref={masukan}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={awalan + '-daftar'}
                aria-autocomplete="list"
                aria-activedescendant={hasil[sorot] ? idButir(hasil[sorot]) : undefined}
                aria-label={t('Cari mahasiswa atau halaman')}
                value={kata}
                onChange={(e) => setKata(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('Ketik nama, NIM, atau nama halaman')}
                className="h-14 min-w-0 flex-1 bg-transparent text-[15.5px] text-ink outline-none placeholder:text-ink-2 focus-visible:outline-none"
              />
              <kbd className="hidden shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11.5px] font-semibold text-ink-2 sm:block">
                Esc
              </kbd>
            </div>

            <div ref={daftar} id={awalan + '-daftar'} role="listbox" aria-label={t('Hasil pencarian')} className="max-h-[min(58vh,420px)] overflow-y-auto p-2">
              {kelompok.length ? (
                kelompok.map((k) => (
                  <div key={k.judul} role="group" aria-label={k.judul} className="pb-1">
                    <p aria-hidden="true" className="px-3 pb-1 pt-2 text-[11.5px] font-bold uppercase tracking-[.08em] text-ink-2">
                      {k.judul}
                    </p>
                    {k.butir.map((h) => {
                      const i = hasil.indexOf(h)
                      const aktif = i === sorot
                      return (
                        <div
                          key={h.id}
                          id={idButir(h)}
                          role="option"
                          aria-selected={aktif}
                          data-sorot={aktif}
                          onMouseMove={(e) => {
                            if ((e.movementX || e.movementY) && !aktif) setSorot(i)
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pilih(h)}
                          className={
                            'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ' +
                            (aktif ? 'bg-brand-soft' : '')
                          }
                        >
                          {h.ikon ? (
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2">
                              <h.ikon size={16} />
                            </span>
                          ) : (
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-[12px] font-extrabold text-ink-2">
                              {h.judul
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((k) => k[0])
                                .join('')
                                .toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className={'block truncate text-[14.5px] font-bold ' + (aktif ? 'text-brand-ink' : 'text-ink')}>
                              {h.judul}
                            </span>
                            {h.rinci ? <span className="block truncate text-[12.5px] text-ink-2">{h.rinci}</span> : null}
                          </span>
                          <IconChevronRight size={16} className={'shrink-0 ' + (aktif ? 'text-brand-ink' : 'text-ink-2')} />
                        </div>
                      )
                    })}
                  </div>
                ))
              ) : (
                <p className="px-3 py-8 text-center text-[14px] text-ink-2">
                  {t('Tidak ada mahasiswa atau halaman yang cocok dengan "{kata}".', { kata: kata.trim() })}
                </p>
              )}
              {q.length === 1 ? (
                <p className="px-3 pb-2 text-[12.5px] text-ink-2">{t('Ketik minimal 2 huruf untuk mencari mahasiswa.')}</p>
              ) : null}
            </div>

            <p className="hidden border-t border-line bg-surface-2 px-4 py-2.5 text-[12.5px] text-ink-2 sm:block">
              {t('Panah atas/bawah untuk memilih, Enter untuk membuka, Esc untuk menutup.')}
            </p>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
