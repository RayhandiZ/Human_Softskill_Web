'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { EN } from './teks'
import { dumpOtomatis, hasilOtomatis, mintaTerjemahan, saatSelesai } from './terjemahOtomatis'

/* Kalimat Indonesia dipakai sebagai kunci kamus; lihat README.md › Kamus dan terjemahan. */

const KUNCI = 'sk5c.bahasa'

export const BAHASA = [
  { id: 'id', kode: 'ID', nama: 'Bahasa Indonesia' },
  { id: 'en', kode: 'EN', nama: 'English' },
]

const BahasaContext = createContext(null)


function isi(teks, nilai) {
  if (!nilai) return teks
  return String(teks).replace(/\{(\w+)\}/g, (utuh, k) => (k in nilai ? String(nilai[k]) : utuh))
}

/* Kunci dirapikan supaya penataan ulang kode tidak memutus terjemahan. */
export const rapikan = (teks) => String(teks ?? '').trim().replace(/\s+/g, ' ')

const EN_RAPI = new Map(Object.entries(EN).map(([k, v]) => [rapikan(k), v]))

const sudahDilapor = new Set()

export function terjemah(bahasa, teks, nilai) {
  if (bahasa !== 'en') return isi(teks, nilai)

  /* Nilai kosong berarti belum diterjemahkan. */
  const padanan = EN_RAPI.get(rapikan(teks))
  if (padanan) return isi(padanan, nilai)

  const mesin = hasilOtomatis(teks)
  if (mesin) return isi(mesin, nilai)

  if (OTOMATIS.aktif) mintaTerjemahan(teks)

  const pengembangan =
    typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  if (pengembangan && teks && !sudahDilapor.has(teks)) {
    sudahDilapor.add(teks)
    console.warn(
      '[bahasa] belum ada padanan Inggris untuk:\n  ' +
        rapikan(teks) +
        '\n  Jalankan: npm run bahasa:sync',
    )
  }
  return isi(teks, nilai)
}

export const OTOMATIS = { aktif: true }

export function BahasaProvider({ children }) {
  /* Selalu mulai dari Indonesia seperti HTML server; pilihan tersimpan dipasang setelah menempel. */
  const [bahasa, setBahasa] = useState('id')
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    try {
      const tersimpan = localStorage.getItem(KUNCI)
      if (tersimpan === 'en' || tersimpan === 'id') setBahasa(tersimpan)
    } catch {
    }

    /* Bawaan selalu Indonesia, bukan bahasa peramban. */
    setSiap(true)
  }, [])

  const sebelumnya = useRef(null)

  /* Tulis hanya setelah pembacaan awal; render pertama selalu 'id'. */
  useEffect(() => {
    if (!siap) return
    document.documentElement.lang = bahasa
    try {
      localStorage.setItem(KUNCI, bahasa)
    } catch {
    }

    const awal = sebelumnya.current
    sebelumnya.current = bahasa
    if (awal === null || awal === bahasa) return

    const akar = document.documentElement
    akar.classList.add('ganti-bahasa')
    const id = setTimeout(() => akar.classList.remove('ganti-bahasa'), 300)
    return () => {
      clearTimeout(id)
      akar.classList.remove('ganti-bahasa')
    }
  }, [bahasa, siap])

  const [putaran, setPutaran] = useState(0)

  useEffect(() => {
    if (bahasa !== 'en') return
    return saatSelesai(() => setPutaran((n) => n + 1))
  }, [bahasa])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.dumpOtomatis = dumpOtomatis
  }, [])

  const t = useCallback(
    (teks, nilai) => terjemah(bahasa, teks, nilai),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bahasa, putaran],
  )
  const toggle = useCallback(() => setBahasa((b) => (b === 'id' ? 'en' : 'id')), [])

  const nilai = useMemo(() => ({ bahasa, setBahasa, toggle, t }), [bahasa, toggle, t])
  return <BahasaContext.Provider value={nilai}>{children}</BahasaContext.Provider>
}

/* Sengaja tidak melempar galat di luar penyedia: uji kerap merender komponen sendirian. */
const CADANGAN = {
  bahasa: 'id',
  setBahasa: () => {},
  toggle: () => {},
  t: (teks, nilai) => isi(teks, nilai),
}

export function useBahasa() {
  return useContext(BahasaContext) ?? CADANGAN
}

export const useTeks = () => useBahasa().t
