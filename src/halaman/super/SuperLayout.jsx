import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Laci from '../../components/Laci'
import LogoPdp from '../../components/LogoPdp'
import MenuAkun from '../../components/MenuAkun'
import MenuSamping from '../../components/MenuSamping'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import { IconBook, IconBuilding, IconCheckShield, IconGauge, IconList, IconMenu, IconUsers } from '../../components/Icons'
import { PERIODE_AKTIF, labelPeriode } from '../../lib/data'
import { permintaanMenunggu, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'

/* Panel pengawasan Super Admin, terpisah dari panel Kemahasiswaan; lihat README.md › Panel Super Admin. */

const menuSuper = (menunggu) => [
  { to: '/super', label: 'Pusat Kendali', icon: IconGauge, end: true },
  { to: '/super/persetujuan', label: 'Persetujuan', icon: IconCheckShield, lencana: menunggu || null },
  { to: '/super/log', label: 'Log Aktivitas', icon: IconList },
  { to: '/super/wewenang', label: 'Peran & Wewenang', icon: IconUsers },
  { to: '/super/aturan', label: 'Aturan Sistem', icon: IconBook },
]

function KeKemahasiswaan({ besar = false, onClick }) {
  const t = useTeks()
  return (
    <Link
      href="/admin"
      onClick={onClick}
      className={
        'flex items-center gap-3 rounded-2xl px-3.5 font-bold text-white/75 transition hover:bg-white/10 hover:text-white ' +
        (besar ? 'py-3.5 text-[16px]' : 'py-3 text-[14px]')
      }
    >
      <IconBuilding size={20} className="shrink-0" />
      {t('Panel Kemahasiswaan')}
    </Link>
  )
}

export default function SuperLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user, logout } = useAuth()
  const router = useRouter()
  const jalur = usePathname()
  const [laci, setLaci] = useState(false)
  const { foto } = useProfil(kunciSesi(user))
  const menu = menuSuper(permintaanMenunggu().length)

  return (
    <div className="min-h-screen bg-bg lg:pl-[264px] print:pl-0">
      {/* -------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] p-4 pr-0 lg:block print:hidden">
        <div className="flex h-full flex-col rounded-3xl bg-brand-deep px-3 py-5 text-white dark:ring-1 dark:ring-white/10">
          <Link href="/super" className="flex items-center gap-2.5 px-2.5">
            <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-white" />
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-white/25" />
            <span className="whitespace-nowrap text-[15px] font-extrabold tracking-tight">
              HUMAN <span className="text-[var(--accent)]">SKILL</span>
            </span>
          </Link>
          <p className="mb-6 mt-3 px-2.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--accent)]">
            Super Admin
          </p>

          <nav aria-label={t('Menu super admin')}>
            <MenuSamping items={menu} gelap />
          </nav>

          <div className="mt-auto border-t border-white/10 pt-4">
            <KeKemahasiswaan />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* ------------------------------ bilah atas ----------------------------- */}
        <header className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] backdrop-blur-sm print:hidden">
          <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setLaci(true)}
              aria-label={t('Buka menu navigasi')}
              aria-expanded={laci}
              className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-ink transition hover:bg-surface lg:hidden"
            >
              <IconMenu size={23} />
            </button>

            <Link href="/super" className="flex items-center gap-2.5 lg:hidden">
              <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
              <span className="hidden text-[12px] font-extrabold uppercase tracking-[.12em] text-[var(--accent-ink)] sm:block">
                Super Admin
              </span>
            </Link>

            <p className="hidden text-[13.5px] text-ink-2 lg:block">
              Universitas Multimedia Nusantara · {t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <TombolBahasa nada="terang" />
              <TombolTema />
              <MenuAkun foto={foto} tone="terang" rinci={{ judul: 'Super Admin', sub: user?.email ?? '' }} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-10 pt-2 sm:px-6 lg:px-8">
          {/* Dikunci per jalur supaya animasi masuknya berjalan lagi setiap pindah menu. */}
          <div key={jalur} className="animate-halaman">
            {children}
          </div>
        </main>
      </div>

      {/* --------------------------- laci layar kecil -------------------------- */}
      <Laci buka={laci} onTutup={() => setLaci(false)} label="Menu super admin" nada="gelap">
        <nav aria-label={t('Menu super admin')} className="p-3">
          <MenuSamping items={menu} besar gelap onPilih={() => setLaci(false)} />

          <span className="my-3 block h-px bg-white/10" />

          <KeKemahasiswaan besar onClick={() => setLaci(false)} />
          <Link
            href="/super/profil"
            onClick={() => setLaci(false)}
            className="block rounded-2xl px-3.5 py-3.5 text-[16px] font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            {t('Profil')}
          </Link>
          <button
            type="button"
            onClick={() => {
              setLaci(false)
              logout()
              router.replace('/masuk')
            }}
            className="block w-full rounded-2xl px-3.5 py-3.5 text-left text-[16px] font-bold text-[#ffb4b4] transition hover:bg-white/10"
          >
            {t('Keluar')}
          </button>
        </nav>
      </Laci>
    </div>
  )
}
