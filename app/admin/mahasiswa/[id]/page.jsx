'use client'

import { Suspense } from 'react'
import StudentDetail from '../../../../src/halaman/admin/StudentDetail'

/* Suspense wajib: halaman membaca useSearchParams (mode tinjau ?tinjau=sertifikat). */
export default function HalamanDetailMahasiswa() {
  return (
    <Suspense fallback={null}>
      <StudentDetail />
    </Suspense>
  )
}
