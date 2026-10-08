import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LABEL_PERAN, panelUntuk, useAuth } from '../lib/auth'
import { useTeks } from '../lib/bahasa'
import { Avatar } from './Ui'
import { IconChevronDown, IconChevronRight, IconLogout, IconUsers } from './Icons'

/* --------------------------------------------------------------------------
   Tombol avatar beserta menunya: identitas, Profil, dan Keluar.

   Dipakai di dua latar berbeda — bilah biru panel Kemahasiswaan ('onbrand')
   dan bilah terang panel mahasiswa ('terang') — jadi hanya warnanya yang
   bercabang; isi dan perilakunya satu.

   `rinci` menampilkan nama dan keterangan di samping avatar. Di layar sempit
   teksnya disembunyikan dan tinggal avatarnya saja.
   -------------------------------------------------------------------------- */

export default function MenuAkun({ foto = null, tone = 'onbrand', rinci = null }) {
  const { user, logout } = useAuth()
  const t = useTeks()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  /* Profil tinggal di dalam panel masing-masing supaya kerangka yang
     membungkusnya tetap sesuai peran. */
  const profilKe = panelUntuk(user?.role) + '/profil'
  const terang = tone === 'terang'

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('Menu akun')}
        className={
          'flex items-center gap-2.5 rounded-2xl py-1 pl-1 pr-2 transition ' +
          (terang ? 'hover:bg-surface-2' : 'hover:bg-white/10')
        }
      >
        <Avatar
          initials={user?.initials ?? '??'}
          size={terang ? 38 : 34}
          tone={terang ? 'brand' : 'onbrand'}
          src={foto}
          alt=""
        />
        {rinci ? (
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-[200px] truncate text-[14px] font-bold leading-tight text-ink">
              {rinci.judul}
            </span>
            <span className="block max-w-[200px] truncate text-[12.5px] leading-tight text-ink-2">
              {rinci.sub}
            </span>
          </span>
        ) : null}
        <IconChevronDown size={16} className={terang ? 'text-ink-2' : 'text-white/70'} />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-rise">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-bold text-ink">{user?.name}</p>
            <p className="truncate text-[12.5px] text-ink-2">{user?.email}</p>
            <p className="mt-1.5 inline-flex rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">
              {t(LABEL_PERAN[user?.role] ?? 'Pengguna')}
            </p>
          </div>
          <Link
            href={profilKe}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 border-b border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            <IconUsers size={17} className="text-ink-2" />
            {t('Profil')}
            <IconChevronRight size={16} className="ml-auto text-ink-3" />
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              router.replace('/masuk')
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-[var(--critical)] transition hover:bg-surface-2"
          >
            <IconLogout size={17} />
            {t('Keluar')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
