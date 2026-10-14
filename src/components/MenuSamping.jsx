import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TautanNav } from '../lib/nav'
import { useTeks } from '../lib/bahasa'

/* Menu samping panel mahasiswa dan super admin. Tiap butir menggambar sorotannya sendiri (.menu-sorot),
   jadi saat pindah menu tidak ada yang meluncur; lihat README.md › Gerak. */
export default function MenuSamping({ items, besar = false, gelap = false, onPilih }) {
  const t = useTeks()
  const jalur = usePathname() ?? ''

  const [tujuan, setTujuan] = useState(null)
  useEffect(() => setTujuan(null), [jalur])
  useEffect(() => {
    if (!tujuan) return undefined
    const id = setTimeout(() => setTujuan(null), 8000)
    return () => clearTimeout(id)
  }, [tujuan])

  const cocok = (m) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))
  const aktif = tujuan ?? items.find(cocok)?.to ?? null

  return (
    <ul className="space-y-1">
      {items.map(({ to, label, icon: Icon, end, lencana }) => (
        <li key={to}>
          <TautanNav
            href={to}
            end={end}
            onClick={(e) => {
              if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) setTujuan(to)
              onPilih?.(e)
            }}
            // aria-current tetap mengikuti halaman yang benar-benar terbuka; sorotan mengikuti tujuan klik.
            className={() =>
              'menu-sorot relative flex items-center gap-3 rounded-2xl px-3.5 font-bold transition-colors duration-200 ease-[cubic-bezier(.22,.68,.35,1)] ' +
              (gelap ? 'menu-sorot-gelap ' : '') +
              (besar ? 'py-3.5 text-[16px] ' : 'py-3 text-[14.5px] ') +
              (to === aktif
                ? 'menu-aktif ' + (gelap ? 'text-white' : 'text-brand-ink')
                : gelap
                  ? 'text-white/75'
                  : 'text-ink-2')
            }
          >
            <Icon size={20} className="shrink-0" />
            <span className="truncate">{t(label)}</span>
            {lencana ? (
              <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-extrabold text-[#2b1c00]">
                {lencana}
              </span>
            ) : null}
          </TautanNav>
        </li>
      ))}
    </ul>
  )
}
