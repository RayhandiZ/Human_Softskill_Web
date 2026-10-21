'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Nilai from '../../../src/halaman/admin/Nilai'

/* Nilai membaca sasarannya dari URL hanya saat dipasang. Kuncinya diikat ke isi URL supaya tautan ke halaman ini
   dari halaman ini sendiri (lonceng, ajakan meninjau koreksi) ikut mengganti pilihan; dulu URL-nya berubah
   tetapi semester, sumber, dan angkatan di layar tetap. */
function NilaiBerkunci() {
  const params = useSearchParams()
  return <Nilai key={params?.toString() ?? ''} />
}

/* Suspense wajib: halaman membaca useSearchParams. */
export default function HalamanNilai() {
  return (
    <Suspense fallback={null}>
      <NilaiBerkunci />
    </Suspense>
  )
}
