'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { panelUntuk, useAuth } from '../src/lib/auth'

/* Tunggu `siap`: sesi yang masih dibaca jangan dilempar ke halaman masuk. */
export default function Beranda() {
  const { user, siap } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!siap) return
    router.replace(!user ? '/masuk' : panelUntuk(user.role))
  }, [user, siap, router])

  return null
}
