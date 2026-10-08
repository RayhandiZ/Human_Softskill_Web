'use client'

import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconMinus, IconPlus, IconX } from './Icons'
import { potongFoto } from '../lib/profil'

/* --------------------------------------------------------------------------
   Penyunting foto profil: geser untuk mengatur posisi, tarik penggeser untuk
   memperbesar.

   Kotak pratinjau berbentuk lingkaran karena avatar di seluruh aplikasi juga
   bulat — yang dilihat saat menyunting harus sama persis dengan yang nanti
   tampil, bukan bujur sangkar yang ternyata terpangkas.

   Geseran DIBATASI supaya gambar selalu menutupi seluruh lingkaran. Tanpa itu,
   foto bisa digeser sampai menyisakan bidang kosong, dan hasil potongannya
   memuat bagian putih yang tidak pernah terlihat saat menyunting.

   Dapat dipakai papan ketik: tombol panah menggeser, dan penggeser perbesaran
   adalah <input type="range"> biasa. Menyeret dengan tetikus bukan satu-satunya
   jalan.
   -------------------------------------------------------------------------- */

const TAMPIL = 240
const SKALA_MIN = 1
const SKALA_MAKS = 3
const LANGKAH_PANAH = 8

export default function PenyuntingFoto({ sumber, onSelesai, onBatal, judul = 'Atur foto' }) {
  const [skala, setSkala] = useState(1)
  const [geser, setGeser] = useState({ x: 0, y: 0 })
  const [ukuranDasar, setUkuranDasar] = useState({ lebar: TAMPIL, tinggi: TAMPIL })
  const [sibuk, setSibuk] = useState(false)
  const areaRef = useRef(null)
  const seret = useRef(null)

  /* Ukuran gambar saat perbesaran 1: "cover" terhadap kotak pratinjau. */
  useEffect(() => {
    let batal = false
    const img = new Image()
    img.onload = () => {
      if (batal) return
      const k = Math.max(TAMPIL / img.width, TAMPIL / img.height)
      setUkuranDasar({ lebar: img.width * k, tinggi: img.height * k })
    }
    img.src = sumber
    return () => {
      batal = true
    }
  }, [sumber])

  /* Batas geseran: setengah dari kelebihan gambar terhadap kotak. */
  const batas = {
    x: Math.max(0, (ukuranDasar.lebar * skala - TAMPIL) / 2),
    y: Math.max(0, (ukuranDasar.tinggi * skala - TAMPIL) / 2),
  }
  const jepit = (nilai, maks) => Math.max(-maks, Math.min(maks, nilai))

  /* Memperkecil harus ikut menarik gambar kembali ke dalam batas barunya,
     kalau tidak akan tersisa bidang kosong di tepi. */
  useEffect(() => {
    setGeser((g) => ({ x: jepit(g.x, batas.x), y: jepit(g.y, batas.y) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skala, ukuranDasar.lebar, ukuranDasar.tinggi])

  const mulaiSeret = (e) => {
    areaRef.current?.setPointerCapture?.(e.pointerId)
    seret.current = { x: e.clientX, y: e.clientY, awal: geser }
  }

  const saatSeret = (e) => {
    if (!seret.current) return
    const d = seret.current
    setGeser({
      x: jepit(d.awal.x + (e.clientX - d.x), batas.x),
      y: jepit(d.awal.y + (e.clientY - d.y), batas.y),
    })
  }

  const selesaiSeret = (e) => {
    areaRef.current?.releasePointerCapture?.(e.pointerId)
    seret.current = null
  }

  const denganPanah = (e) => {
    const arah = {
      ArrowLeft: [-LANGKAH_PANAH, 0],
      ArrowRight: [LANGKAH_PANAH, 0],
      ArrowUp: [0, -LANGKAH_PANAH],
      ArrowDown: [0, LANGKAH_PANAH],
    }[e.key]
    if (!arah) return
    e.preventDefault()
    setGeser((g) => ({ x: jepit(g.x + arah[0], batas.x), y: jepit(g.y + arah[1], batas.y) }))
  }

  const ubahSkala = (v) => setSkala(Math.min(SKALA_MAKS, Math.max(SKALA_MIN, Number(v.toFixed(2)))))

  async function simpan() {
    setSibuk(true)
    try {
      const hasil = await potongFoto(sumber, { skala, x: geser.x, y: geser.y, tampil: TAMPIL })
      onSelesai(hasil)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section
      aria-label={judul}
      className="rounded-2xl border border-line bg-surface-2 p-4 sm:p-5"
    >
      <p className="text-[14px] font-bold text-ink">{judul}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
        Seret gambarnya untuk menggeser posisi, lalu atur perbesarannya. Yang terlihat di
        lingkaran inilah yang akan tersimpan.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div
          ref={areaRef}
          role="application"
          aria-label="Geser foto dengan menyeret atau tombol panah"
          tabIndex={0}
          onPointerDown={mulaiSeret}
          onPointerMove={saatSeret}
          onPointerUp={selesaiSeret}
          onPointerCancel={selesaiSeret}
          onKeyDown={denganPanah}
          style={{ width: TAMPIL, height: TAMPIL, touchAction: 'none' }}
          className="relative shrink-0 cursor-grab overflow-hidden rounded-full border border-line bg-surface outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-ink active:cursor-grabbing"
        >
          <img
            src={sumber}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: ukuranDasar.lebar,
              height: ukuranDasar.tinggi,
              transform:
                'translate(calc(-50% + ' + geser.x + 'px), calc(-50% + ' + geser.y + 'px)) scale(' +
                skala +
                ')',
              maxWidth: 'none',
            }}
          />
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="block">
            <span className="mb-1.5 block label">Perbesaran</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => ubahSkala(skala - 0.2)}
                aria-label="Perkecil"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:text-ink"
              >
                <IconMinus size={16} />
              </button>
              <input
                type="range"
                min={SKALA_MIN}
                max={SKALA_MAKS}
                step="0.01"
                value={skala}
                onChange={(e) => ubahSkala(Number(e.target.value))}
                aria-label="Perbesaran foto"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--grid)] accent-[var(--brand-ink)]"
              />
              <button
                type="button"
                onClick={() => ubahSkala(skala + 0.2)}
                aria-label="Perbesar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:text-ink"
              >
                <IconPlus size={16} />
              </button>
            </div>
          </label>

          <p className="mt-1.5 text-[12.5px] tabular-nums text-ink-3">
            {Math.round(skala * 100)}% dari ukuran pas
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={simpan} disabled={sibuk} className="btn-primary !py-2.5">
              <IconCheck size={16} />
              Pakai foto ini
            </button>
            <button type="button" onClick={onBatal} className="btn-ghost !py-2.5">
              <IconX size={16} />
              Batal
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
