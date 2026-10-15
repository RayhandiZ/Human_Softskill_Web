'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { EN } from './teks'
import { dumpOtomatis, hasilOtomatis, mintaTerjemahan, saatSelesai } from './terjemahOtomatis'

/* Kalimat Indonesia dipakai sebagai kunci kamus; lihat README.md › Kamus dan terjemahan. */

/* Hanya pilihan pengguna yang disimpan. Kunci lama ('sk5c.bahasa') juga menyimpan bahasa bawaan
   yang tidak pernah dipilih, jadi isinya dibuang; lihat README.md › Hidrasi. */
const KUNCI = 'sk5c.bahasa.pilihan'
const KUNCI_LAMA = 'sk5c.bahasa'

/* Bahasa bila pengguna belum pernah memilih: halaman masuk Inggris karena penggunanya tidak hanya
   orang Indonesia, panel tetap Indonesia. */
export const bahasaBawaan = (jalur) => (jalur === '/masuk' ? 'en' : 'id')

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
  /* null: belum pernah memilih, jadi tiap halaman memakai bawaannya. Render pertama selalu memakai
     bawaan jalur, sama seperti HTML server; pilihan tersimpan dipasang setelah menempel. */
  const jalur = usePathname()
  const [pilihan, setPilihan] = useState(null)
  const bahasa = pilihan ?? bahasaBawaan(jalur)

  useEffect(() => {
    try {
      localStorage.removeItem(KUNCI_LAMA)
      const tersimpan = localStorage.getItem(KUNCI)
      if (tersimpan === 'en' || tersimpan === 'id') setPilihan(tersimpan)
    } catch {
    }
  }, [])

  /* Diset oleh setBahasa: hanya pergantian dari pemilih yang diberi efek pudar, bukan pembacaan
     pilihan tersimpan atau pindah dari halaman masuk ke panel. */
  const dariPemilih = useRef(false)

  const setBahasa = useCallback(
    (baru) => {
      if (baru !== 'id' && baru !== 'en') return
      if (baru !== bahasa) dariPemilih.current = true
      setPilihan(baru)
      try {
        localStorage.setItem(KUNCI, baru)
      } catch {
      }
    },
    [bahasa],
  )

  useEffect(() => {
    document.documentElement.lang = bahasa
    if (!dariPemilih.current) return
    dariPemilih.current = false

    const akar = document.documentElement
    akar.classList.add('ganti-bahasa')
    const id = setTimeout(() => akar.classList.remove('ganti-bahasa'), 300)
    return () => {
      clearTimeout(id)
      akar.classList.remove('ganti-bahasa')
    }
  }, [bahasa])

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
  const toggle = useCallback(() => setBahasa(bahasa === 'id' ? 'en' : 'id'), [bahasa, setBahasa])

  const nilai = useMemo(() => ({ bahasa, setBahasa, toggle, t }), [bahasa, setBahasa, toggle, t])
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
