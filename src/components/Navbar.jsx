import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TautanNav } from '../lib/nav'
import { panelUntuk, useAuth } from '../lib/auth'
import { useTeks } from '../lib/bahasa'
import { useTheme } from '../lib/theme'
import Laci from './Laci'
import MenuAkun from './MenuAkun'
import TombolBahasa from './TombolBahasa'
import { IconMenu, IconMoon, IconSun } from './Icons'
import LogoPdp from './LogoPdp'

export default function Navbar({ links = [], kelompok = null, aksi = null, foto = null }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const t = useTeks()
  const router = useRouter()
  const [laci, setLaci] = useState(false)

  const profilKe = panelUntuk(user?.role) + '/profil'

  return (
    <header className="sticky top-0 z-40 bg-brand text-white">
      <div className="flex h-[64px] w-full items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setLaci(true)}
          aria-label={t('Buka menu navigasi')}
          aria-expanded={laci}
          className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white transition hover:bg-white/10"
        >
          <IconMenu size={23} />
        </button>

        <Link href="/" className="flex items-center gap-2.5 text-white">
          <LogoPdp keterangan={false} className="h-7 w-auto shrink-0" />
          <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-white/30 sm:block" />
          <span className="hidden whitespace-nowrap text-[15px] font-extrabold tracking-tight sm:block">
            HUMAN <span className="text-[var(--accent)]">SOFTSKILL</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:ml-6 md:flex">
          {links.map((l) => (
            <TautanNav
              key={l.to}
              href={l.to}
              end={l.end}
              className={({ isActive }) =>
                'whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-bold transition ' +
                (isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')
              }
            >
              {t(l.label)}
            </TautanNav>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {aksi}

          <TombolBahasa nada="onbrand" />

          <span className="mx-1.5 hidden h-6 w-px bg-white/20 sm:block" />

          <MenuAkun foto={foto} tone="onbrand" />

          <button
            type="button"
            onClick={toggle}
            aria-label={t(theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap')}
            className="ml-1 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
          >
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
        </div>
      </div>

      {/* --------------------------------- laci --------------------------------- */}
      <Laci buka={laci} onTutup={() => setLaci(false)} nada="gelap">
        <nav className="px-3 py-4">
          {(kelompok ?? [{ judul: null, item: links }]).map((g, i) => (
            <div key={g.judul ?? i} className={i ? 'mt-5' : ''}>
              {g.judul ? (
                <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.12em] text-white/55">
                  {t(g.judul)}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {g.item.map((l) => (
                  <li key={l.to}>
                    <TautanNav
                      href={l.to}
                      end={l.end}
                      onClick={() => setLaci(false)}
                      className={({ isActive }) =>
                        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition ' +
                        (isActive ? 'bg-white/12 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-[var(--accent)]"
                            />
                          ) : null}
                          {l.icon ? <l.icon size={19} className="shrink-0" /> : null}
                          <span className="truncate">{t(l.label)}</span>
                          {l.lencana ? (
                            <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-extrabold text-[#2b1c00]">
                              {l.lencana}
                            </span>
                          ) : null}
                        </>
                      )}
                    </TautanNav>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <span className="my-4 block h-px bg-white/10" />

          <Link
            href={profilKe}
            onClick={() => setLaci(false)}
            className="block rounded-xl px-3 py-2.5 text-[15px] font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
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
            className="mt-0.5 block w-full rounded-xl px-3 py-2.5 text-left text-[15px] font-bold text-[#ffb4b4] transition hover:bg-white/10"
          >
            {t('Keluar')}
          </button>
        </nav>
      </Laci>
    </header>
  )
}
