'use client'

import { Suspense } from 'react'
import Nilai from '../../../src/halaman/admin/Nilai'

/* Suspense wajib di sini: halaman membaca sasaran dari alamat URL lewat
   useSearchParams, dan Next menolak merender halaman statis yang membacanya
   tanpa batas Suspense. */
export default function HalamanNilai() {
  return (
    <Suspense fallback={null}>
      <Nilai />
    </Suspense>
  )
}
