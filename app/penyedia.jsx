'use client'

import { useRef } from 'react'
import ErrorBoundary from '../src/components/ErrorBoundary'
import { AuthProvider } from '../src/lib/auth'
import { ThemeProvider } from '../src/lib/theme'
import { BahasaProvider } from '../src/lib/bahasa'
import { isiMaster } from '../src/lib/data'
import PemuatData from '../src/components/PemuatData'

/* Semua penyedia konteks berkumpul di satu berkas klien, supaya app/layout.jsx
   tetap menjadi komponen server dan bisa mengatur <html>, metadata, serta
   skrip tema. */
export default function Penyedia({ master, children }) {
  /* Data master dari basis data dipasang SEBELUM anak pertama dirender, di
     server maupun di peramban — jadi isi awal dari kode tidak pernah sempat
     tampil, dan hasil render keduanya sama. Tanpa master (basis data mati,
     atau uji tanpa server), isi awal di data.js yang dipakai. */
  const terpasang = useRef(null)
  if (master && terpasang.current !== master) {
    isiMaster(master)
    terpasang.current = master
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BahasaProvider>
          <AuthProvider>
            <PemuatData>{children}</PemuatData>
          </AuthProvider>
        </BahasaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
