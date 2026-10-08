'use client'

import { useEffect, useState } from 'react'
import { IconRefresh } from '../../components/Icons'
import { segarkanData, terakhirDiperbarui, useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

/* Waktu selalu ditulis WIB (Asia/Jakarta), bukan zona perangkat. */

const ZONA = 'Asia/Jakarta'
const DETAK = 30_000

const tanggalnya = (d) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: ZONA,
  }).format(d)

/* en-GB supaya jam memakai titik dua (13:39). */
const jamnya = (d) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA,
  }).format(d)

function selisih(t, dari, sampai) {
  const detik = Math.max(0, Math.round((sampai - dari) / 1000))
  if (detik < 60) return t('baru saja')
  const menit = Math.round(detik / 60)
  if (menit < 60) return t('{n} menit lalu', { n: menit })
  const jam = Math.round(menit / 60)
  if (jam < 24) return t('{n} jam lalu', { n: jam })
  return null
}

export default function StatusData() {
  useStore()
  const t = useTeks()

  /* Dirender sesudah menempel: jam server dan peramban berbeda. */
  const [siap, setSiap] = useState(false)
  const [sekarang, setSekarang] = useState(null)

  useEffect(() => {
    setSiap(true)
    setSekarang(Date.now())
    const id = setInterval(() => setSekarang(Date.now()), DETAK)
    return () => clearInterval(id)
  }, [])

  if (!siap) return null

  const waktu = terakhirDiperbarui()
  const relatif = sekarang ? selisih(t, waktu, sekarang) : null

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[13.5px] text-ink-2">
        {t('Terakhir diperbarui {tanggal}, {jam} WIB', {
          tanggal: tanggalnya(waktu),
          jam: jamnya(waktu),
        })}
        {relatif ? <span className="text-ink-3"> · {relatif}</span> : null}
      </span>
      <button
        type="button"
        onClick={segarkanData}
        aria-label={t('Segarkan data sekarang')}
        className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12.5px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink"
      >
        <IconRefresh size={13} />
        {t('Segarkan')}
      </button>
    </span>
  )
}
