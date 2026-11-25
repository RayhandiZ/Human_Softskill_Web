'use client'

import { Suspense } from 'react'
import DetailMahasiswa from '../../../../src/halaman/admin/DetailMahasiswa'

/* Suspense wajib: halaman membaca useSearchParams (mode tinjau ?tinjau=sertifikat). */
export default function HalamanDetailMahasiswa() {
  return (
    <Suspense fallback={null}>
      <DetailMahasiswa />
    </Suspense>
  )
}
