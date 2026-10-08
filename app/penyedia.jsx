'use client'

import { useRef } from 'react'
import ErrorBoundary from '../src/components/ErrorBoundary'
import { AuthProvider } from '../src/lib/auth'
import { ThemeProvider } from '../src/lib/theme'
import { BahasaProvider } from '../src/lib/bahasa'
import { isiMaster } from '../src/lib/data'
import PemuatData from '../src/components/PemuatData'

export default function Penyedia({ master, children }) {
  /* Data master dipasang sebelum anak pertama dirender, supaya render server dan peramban sama. */
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
