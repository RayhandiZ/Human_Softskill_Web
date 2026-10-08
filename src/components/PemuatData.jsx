'use client'

import { useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useTeks } from '../lib/bahasa'
import { aturSaatSesiHabis } from '../lib/kirim'
import { modeLokal } from '../lib/modeData'
import { kosongkanDataServer, muatDariServer, useStatusMuat } from '../lib/store'
import { IconAlert, IconLogo, IconRefresh } from './Icons'

// Memuat data halaman dari basis data begitu ada yang masuk, dan menahan panel sampai datanya
// tiba. Tanpa ini, halaman sempat menulis "belum ada data" padahal datanya masih di jalan.
export default function PemuatData({ children }) {
  const { user, siap, logout } = useAuth()
  const status = useStatusMuat()
  const t = useTeks()
  const akun = user ? user.role + ':' + (user.nim ?? user.nip ?? user.email) : null

  // Jawaban 401 dari pintu API mana pun berarti sesinya sudah berakhir.
  useEffect(() => {
    aturSaatSesiHabis(logout)
    return () => aturSaatSesiHabis(null)
  }, [logout])

  useEffect(() => {
    if (modeLokal() || !siap) return
    if (!akun) {
      kosongkanDataServer()
      return
    }
    muatDariServer().catch(() => {})
  }, [siap, akun])

  if (modeLokal() || !user || status.keadaan === 'siap') return children

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-5">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto grid w-fit place-items-center">
          <IconLogo size={40} />
        </span>
        {status.keadaan === 'galat' ? (
          <>
            <p role="alert" className="mt-5 flex items-start justify-center gap-2 text-[14px] font-semibold text-[var(--critical)]">
              <IconAlert size={17} className="mt-px shrink-0" />
              {status.pesan}
            </p>
            <div className="mt-5 flex justify-center gap-2.5">
              <button type="button" className="btn-primary" onClick={() => muatDariServer().catch(() => {})}>
                <IconRefresh size={16} />
                {t('Coba lagi')}
              </button>
              <button type="button" className="btn-ghost" onClick={logout}>
                {t('Keluar')}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-5 text-[14px] text-ink-2" aria-live="polite">
            {t('Memuat data…')}
          </p>
        )}
      </div>
    </div>
  )
}
