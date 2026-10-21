import { useEffect, useId, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TautanNav } from '../lib/nav'
import { useTeks } from '../lib/bahasa'

/* Menu samping panel mahasiswa dan super admin. Tiap butir menggambar sorotannya sendiri (.menu-sorot),
   jadi saat pindah menu tidak ada yang meluncur; lihat README.md › Gerak. Butir boleh membawa `kelompok`:
   butir berurutan dengan kelompok yang sama dijadikan satu daftar berjudul. Semua kelompok berbagi satu
   sorotan aktif, jadi klik di kelompok lain tidak membuat dua butir tersorot sekaligus. */
export default function MenuSamping({ items, besar = false, gelap = false, onPilih }) {
  const t = useTeks()
  const awalan = useId()
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

  const kelompok = []
  for (const m of items) {
    const akhir = kelompok[kelompok.length - 1]
    if (akhir && akhir.judul === (m.kelompok ?? null)) akhir.butir.push(m)
    else kelompok.push({ judul: m.kelompok ?? null, butir: [m] })
  }

  const daftar = (butir, labelId) => (
    <ul className="space-y-1" aria-labelledby={labelId}>
      {butir.map(({ to, label, icon: Icon, end, lencana }) => (
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
            {/* Label menu turun ke baris kedua, tidak dipotong "…": butir berlencana (pekerjaan menunggu) justru yang
                labelnya paling panjang, dan menu harus tetap terbaca utuh saat itu. */}
            <span className="min-w-0 leading-snug [overflow-wrap:anywhere]">{t(label)}</span>
            {lencana ? (
              <span className="ml-auto grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full isi-toska px-1.5 text-[11px] font-extrabold text-[var(--accent-on)]">
                {lencana}
              </span>
            ) : null}
          </TautanNav>
        </li>
      ))}
    </ul>
  )

  if (kelompok.length === 1 && !kelompok[0].judul) return daftar(items)

  return (
    <div className="space-y-5">
      {kelompok.map((k, i) => {
        const labelId = k.judul ? awalan + '-' + i : undefined
        return (
          <div key={k.judul ?? i}>
            {k.judul ? (
              <p
                id={labelId}
                className={
                  'mb-1.5 px-3.5 text-[11px] font-bold uppercase tracking-[.08em] ' +
                  (gelap ? 'text-white/60' : 'text-ink-3')
                }
              >
                {t(k.judul)}
              </p>
            ) : null}
            {daftar(k.butir, labelId)}
          </div>
        )
      })}
    </div>
  )
}
