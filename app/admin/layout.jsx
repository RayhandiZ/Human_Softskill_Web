'use client'

import { RequireRole } from '../../src/lib/auth'
import AdminLayout from '../../src/halaman/admin/AdminLayout'

export default function LayoutAdmin({ children }) {
  return (
    <RequireRole role="admin">
      <AdminLayout>{children}</AdminLayout>
    </RequireRole>
  )
}
