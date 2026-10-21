import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTeks } from '../lib/bahasa'

/* Menu bawah layar kecil untuk panel dengan sedikit halaman (dosen). Selalu terlihat dan berlabel, tidak
   disembunyikan di balik tombol garis tiga: menu yang disembunyikan hampir separuh lebih sulit ditemukan (NN/g).
   Tingginya dipakai sebagai --tinggi-bilah-bawah; lihat index.css › panel dosen. */
export default function BilahBawah({ items, label }) {
  const t = useTeks()
  const jalur = usePathname() ?? ''
  const cocok = (m) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))

  return (
    <nav aria-label={label} className="bilah-bawah fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden print:hidden">
      <ul className="mx-auto flex max-w-[640px]">
        {items.map((m) => {
          const aktif = cocok(m)
          const Icon = m.icon
          return (
            <li key={m.to} className="flex-1">
              <Link
                href={m.to}
                aria-current={aktif ? 'page' : undefined}
                className={
                  'flex h-[68px] flex-col items-center justify-center gap-1 px-1 text-[13px] font-bold leading-tight transition-colors ' +
                  (aktif ? 'text-brand-ink' : 'text-ink-2 hover:text-ink')
                }
              >
                <span
                  className={
                    'relative grid h-8 w-14 place-items-center rounded-full transition-colors ' + (aktif ? 'bg-brand-soft' : '')
                  }
                >
                  <Icon size={22} />
                  {m.lencana ? (
                    <span
                      aria-hidden="true"
                      className="isi-toska absolute -right-0.5 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[11px] font-extrabold text-[var(--accent-on)]"
                    >
                      {m.lencana}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">
                  {t(m.pendek ?? m.label)}
                  {/* Angka lencana dibacakan sesudah labelnya, bukan sebelumnya. */}
                  {m.lencana ? <span className="sr-only"> ({m.lencana})</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
