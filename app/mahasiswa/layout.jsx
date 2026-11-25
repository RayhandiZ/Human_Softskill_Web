'use client'

import { RequireRole } from '../../src/lib/auth'
import MahasiswaLayout from '../../src/halaman/mahasiswa/MahasiswaLayout'

export default function LayoutMahasiswa({ children }) {
  return (
    <RequireRole role="student">
      <MahasiswaLayout>{children}</MahasiswaLayout>
    </RequireRole>
  )
}
