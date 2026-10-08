'use client'

import { RequireRole } from '../../src/lib/auth'
import StudentLayout from '../../src/halaman/student/StudentLayout'

export default function LayoutMahasiswa({ children }) {
  return (
    <RequireRole role="student">
      <StudentLayout>{children}</StudentLayout>
    </RequireRole>
  )
}
