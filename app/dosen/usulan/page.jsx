'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/* Riwayat Pengiriman dihapus sejak rapat 24 Okt 2026 (dosen tidak lagi mengusulkan nilai); riwayat unggahan kini ada di
   halaman Unggah Nilai. Alamat lamanya diteruskan ke sana supaya penanda buku dosen tidak berujung 404. Dialihkan di
   peramban seperti app/page.jsx: redirect() di server membuat pengukur performa React di next dev melempar galat
   "negative time stamp". */
export default function UsulanLama() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dosen/nilai')
  }, [router])
  return null
}
