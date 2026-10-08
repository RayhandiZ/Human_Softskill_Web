'use client'

import { Suspense } from 'react'
import Nilai from '../../../src/halaman/admin/Nilai'

/* Suspense wajib: halaman membaca useSearchParams. */
export default function HalamanNilai() {
  return (
    <Suspense fallback={null}>
      <Nilai />
    </Suspense>
  )
}
