'use client'

import { RequireRole } from '../../src/lib/auth'
import DosenLayout from '../../src/halaman/dosen/DosenLayout'

export default function LayoutDosen({ children }) {
  return (
    <RequireRole role="dosen">
      <DosenLayout>{children}</DosenLayout>
    </RequireRole>
  )
}
