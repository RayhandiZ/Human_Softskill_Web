'use client'

import { RequireRole } from '../../src/lib/auth'
import SuperLayout from '../../src/halaman/super/SuperLayout'

export default function LayoutSuper({ children }) {
  return (
    <RequireRole role="admin" superAdmin>
      <SuperLayout>{children}</SuperLayout>
    </RequireRole>
  )
}
