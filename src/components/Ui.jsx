import { IconChevronDown, IconInfo, IconLock, IconSearch } from './Icons'
import { useTeks } from '../lib/bahasa'
import { hurufMutu } from '../lib/scoring'

/* ------------------------------- kartu dasar ------------------------------ */

export function Card({ className = '', children, ...rest }) {
  return (
    <section className={'card ' + className} {...rest}>
      {children}
    </section>
  )
}

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <Icon size={18} />
          </span>
        ) : null}
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-snug text-ink-2">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function SectionTitle({ children, hint }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-lg font-extrabold tracking-tight text-ink">{children}</h2>
      {hint ? <span className="text-[13px] text-ink-3">{hint}</span> : null}
    </div>
  )
}

/* ---------------------------------- label --------------------------------- */

const TONES = {
  good: 'bg-[color-mix(in_srgb,var(--good)_14%,transparent)] text-[var(--good)]',
  warning: 'bg-[color-mix(in_srgb,var(--warning)_20%,transparent)] text-[color-mix(in_srgb,var(--warning)_72%,var(--text-primary))]',
  critical: 'bg-[color-mix(in_srgb,var(--critical)_14%,transparent)] text-[var(--critical)]',
  serious: 'bg-[color-mix(in_srgb,var(--serious)_18%,transparent)] text-[color-mix(in_srgb,var(--serious)_75%,var(--text-primary))]',
  brand: 'bg-brand-soft text-brand-ink',
  neutral: 'bg-surface-2 text-ink-2 border border-line',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-bold leading-none ' +
        TONES[tone] +
        ' ' +
        className
      }
    >
      {Icon ? <Icon size={13} /> : null}
      {children}
    </span>
  )
}

const TONE_HURUF = { A: 'good', B: 'brand', C: 'warning', D: 'serious' }

export function HurufBadge({ nilai, sementara = false, panjang = false }) {
  const t = useTeks()
  if (nilai == null) return <Badge tone="neutral">{t('Belum dinilai')}</Badge>
  const r = hurufMutu(nilai)
  const tone = r.huruf ? TONE_HURUF[r.huruf] : 'critical'
  return (
    <Badge tone={tone}>
      {r.huruf ? r.huruf : t('Belum Memenuhi')}
      {panjang && r.huruf ? ' · ' + t(r.label) : ''}
      {sementara ? ' · ' + t('sementara') : ''}
    </Badge>
  )
}

export function PredikatTeks({ nilai, panjang = false }) {
  const t = useTeks()
  if (nilai == null) return <span className="text-[13px] text-ink-2">{t('Belum dinilai')}</span>
  const r = hurufMutu(nilai)
  return (
    <span className="text-[14px] font-bold text-ink">
      {r.huruf ? r.huruf : t('Belum Memenuhi')}
      {panjang && r.huruf ? <span className="font-semibold text-ink-2">{' · ' + t(r.label)}</span> : null}
    </span>
  )
}

/* Status ditulis polos tanpa warna; lihat README.md › Warna dan kontras. */
export function StatusTeks({ kuat = false, className = '', children }) {
  return (
    <span
      className={
        'whitespace-nowrap text-[12.5px] ' +
        (kuat ? 'font-bold text-ink' : 'font-semibold text-ink-2') +
        ' ' +
        className
      }
    >
      {children}
    </span>
  )
}

/* Penanda skema belum final: merah dalam kurung, bukan pil; lihat README.md › Warna dan kontras. */
export function TandaDraft({ children, className = '' }) {
  return (
    <span
      className={
        'whitespace-nowrap text-[12px] font-bold text-[var(--critical)] ' + className
      }
    >
      ({children})
    </span>
  )
}

export function Terkunci({ semester, ringkas = false }) {
  const t = useTeks()
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3">
      <IconLock size={14} />
      {ringkas ? t('Terkunci') : t('Dibuka pada Semester {n}', { n: semester })}
    </span>
  )
}

export function CatatanKaki({ children, icon = true }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-ink-3">
      {icon ? <IconInfo size={13} className="mt-px shrink-0" /> : null}
      <span>{children}</span>
    </p>
  )
}

export function SegeraHadir({ judul, fase, children }) {
  const t = useTeks()
  return (
    <Card className="card-pad">
      <p className="label">{t('Fase {n}', { n: fase })}</p>
      <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-ink">{judul}</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">{children}</p>
    </Card>
  )
}

export function Pill({ color, children }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-2">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {children}
    </span>
  )
}

/* -------------------------------- statistik ------------------------------- */

export function StatTile({ label, value, unit, hint, icon: Icon, tone = 'brand', trend }) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <span className="label">{label}</span>
        {Icon ? (
          <span
            className={
              'grid h-8 w-8 place-items-center rounded-lg ' +
              (tone === 'brand' ? 'bg-brand-soft text-brand-ink' : TONES[tone])
            }
          >
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[30px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{value}</span>
        {unit ? <span className="text-sm font-bold text-ink-3">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-2 text-[13px] leading-snug text-ink-2">{hint}</p> : null}
      {trend ? (
        <p className="mt-2 text-[13px] font-semibold text-[var(--good)]">{trend}</p>
      ) : null}
    </div>
  )
}

export function ScoreBar({ value, color = 'var(--c1)', target, height = 10 }) {
  return (
    <div className="relative w-full overflow-hidden rounded-full bg-[var(--grid)]" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: Math.max(2, Math.min(100, value)) + '%', background: color }}
      />
      {typeof target === 'number' ? (
        <span
          className="absolute top-0 h-full w-[2px] bg-[var(--surface)] opacity-90"
          style={{ left: target + '%' }}
          title={'Target ' + target}
        />
      ) : null}
    </div>
  )
}

export function ScoreRing({ value, size = 132, stroke = 12, color = 'var(--brand-ink)', label = 'Nilai akhir' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash + ' ' + c}
          style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,.68,.35,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[34px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[.08em] text-ink-3">{label}</p>
      </div>
    </div>
  )
}

/* --------------------------------- kontrol -------------------------------- */

/** tampilkan menerjemahkan label saja; nilai yang dikirim tetap kalimat aslinya. */
export function Select({ label, value, onChange, options, className = '', tampilkan }) {
  const tampil = tampilkan ?? ((x) => x)
  return (
    <label className={'block ' + className}>
      {label ? <span className="mb-1.5 block label">{label}</span> : null}
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-9 text-sm font-semibold text-ink transition hover:border-line-strong"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {tampil(o)}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
      </span>
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Cari…', className = '' }) {
  return (
    <label className={'relative block ' + className}>
      <IconSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-3 transition hover:border-line-strong"
      />
    </label>
  )
}

export function Tabs({ items, value, onChange }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={
              'rounded-lg px-3.5 py-2 text-[13px] font-bold transition ' +
              (active ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink')
            }
          >
            {it.label}
            {it.count != null ? <span className="ml-1.5 text-ink-3 tabular-nums">{it.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function Avatar({ initials, size = 40, tone = 'brand', src = null, alt = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={
        'grid shrink-0 place-items-center rounded-full font-extrabold ' +
        (tone === 'brand' ? 'bg-brand-soft text-brand-ink' : 'bg-white/15 text-white')
      }
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-2">{children}</p> : null}
    </div>
  )
}
