'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { panelUntuk, useAuth } from '../src/lib/auth'

/* Pintu depan: mengarahkan ke panel sesuai peran, atau ke halaman masuk.
   Menunggu `siap` supaya pengguna yang sesinya masih dibaca tidak telanjur
   dilempar ke halaman masuk. */
export default function Beranda() {
  const { user, siap } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!siap) return
    router.replace(!user ? '/masuk' : panelUntuk(user.role))
  }, [user, siap, router])

  return null
}
