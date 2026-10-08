'use client'

import { useRef, useState } from 'react'
import { BAHASA, useBahasa } from '../lib/bahasa'

/* Pemilihan lewat penunjuk diselesaikan di pointerup, bukan onClick; lihat README.md › Pemilih bahasa. */

const SEGMEN = 34
const SELA = 3

const LENGKUNG = 'cubic-bezier(.34,1.42,.44,1)'

export default function TombolBahasa({ nada = 'terang' }) {
  const { bahasa, setBahasa } = useBahasa()
  const terang = nada === 'terang'

  const [seretX, setSeretX] = useState(null)
  const [menekan, setMenekan] = useState(false)

  const awal = useRef({ x: 0, dasar: 0 })
  const bergerak = useRef(false)
  const abaikanKlik = useRef(false)

  const indeks = Math.max(0, BAHASA.findIndex((b) => b.id === bahasa))
  const dasar = indeks * SEGMEN
  const posisi = seretX ?? dasar

  function mulaiSeret(e) {
    if (e.button != null && e.button !== 0) return
    awal.current = { x: e.clientX, dasar }
    bergerak.current = false
    abaikanKlik.current = false
    setMenekan(true)
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
    }
  }

  function seret(e) {
    if (!menekan) return
    const beda = e.clientX - awal.current.x
    if (Math.abs(beda) > 3) bergerak.current = true
    setSeretX(Math.min(SEGMEN, Math.max(0, awal.current.dasar + beda)))
  }

  function selesaiSeret(e) {
    if (!menekan) return
    setMenekan(false)
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
    }

    let tujuan
    if (bergerak.current) {
      tujuan = (seretX ?? dasar) > SEGMEN / 2 ? BAHASA[1].id : BAHASA[0].id
    } else {
      const kotak = e.currentTarget.getBoundingClientRect?.()
      const relatif = kotak ? e.clientX - kotak.left : awal.current.dasar
      tujuan = relatif > SELA + SEGMEN ? BAHASA[1].id : BAHASA[0].id
    }

    if (tujuan !== bahasa) setBahasa(tujuan)
    setSeretX(null)

    if (bergerak.current) {
      abaikanKlik.current = true
      setTimeout(() => {
        abaikanKlik.current = false
      }, 400)
    }
  }

  function lewatTombol(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      setBahasa(e.key === 'ArrowLeft' ? BAHASA[0].id : BAHASA[1].id)
    }
  }

  return (
    <div
      role="group"
      aria-label="Pilih bahasa"
      onPointerDown={mulaiSeret}
      onPointerMove={seret}
      onPointerUp={selesaiSeret}
      onPointerCancel={selesaiSeret}
      onKeyDown={lewatTombol}
      /* touch-none wajib: tanpa ini seretan di ponsel ikut menggulir halaman. */
      className={
        'relative flex shrink-0 touch-none select-none items-center rounded-2xl ' +
        (terang ? 'border border-line bg-surface' : 'bg-white/10')
      }
      style={{ padding: SELA }}
    >
      <span
        aria-hidden="true"
        className={'absolute rounded-[14px] ' + (terang ? 'pil-kaca' : 'pil-kaca-putih')}
        style={{
          width: SEGMEN,
          top: SELA,
          bottom: SELA,
          left: SELA,
          transform: 'translateX(' + posisi + 'px) scale(' + (menekan ? 0.93 : 1) + ')',
          transition: menekan
            ? 'transform .12s ease-out'
            : 'transform .42s ' + LENGKUNG,
        }}
      />

      {BAHASA.map((b) => {
        const aktif = b.id === bahasa
        return (
          <button
            key={b.id}
            type="button"
            onClick={(e) => {
              if (abaikanKlik.current) {
                abaikanKlik.current = false
                return
              }
              if (e.detail !== 0) return
              setBahasa(b.id)
            }}
            aria-pressed={aktif}
            aria-label={b.nama}
            title={b.nama}
            className={
              'relative z-10 rounded-[14px] py-1.5 text-[12px] font-extrabold leading-none transition-colors duration-300 ' +
              (aktif
                ? terang
                  ? 'text-brand-ink'
                  : 'text-brand'
                : terang
                  ? 'text-ink-3 hover:text-ink'
                  : 'text-white/70 hover:text-white')
            }
            style={{ width: SEGMEN }}
          >
            {b.kode}
          </button>
        )
      })}
    </div>
  )
}
