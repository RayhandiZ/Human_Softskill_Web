'use client'

import { Suspense } from 'react'
import CetakSertifikat from '../../../src/halaman/admin/CetakSertifikat'

/* Suspense wajib: halaman membaca useSearchParams. */
export default function HalamanSertifikat() {
  return (
    <Suspense fallback={null}>
      <CetakSertifikat />
    </Suspense>
  )
}
