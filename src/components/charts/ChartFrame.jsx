import { useState } from 'react'
import { IconDocument } from '../Icons'
import { Pill } from '../Ui'
import { useTeks } from '../../lib/bahasa'

export default function ChartFrame({
  title,
  subtitle,
  legend = [],
  table,
  height = 280,
  action,
  children,
}) {
  const t = useTeks()
  const [showTable, setShowTable] = useState(false)

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-ink">{t(title)}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-snug text-ink-2">{t(subtitle)}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {action}
          {table ? (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              className={
                'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition sm:min-h-0 sm:py-1.5 ' +
                (showTable
                  ? 'border-brand-ink bg-brand-soft text-brand-ink'
                  : 'border-line text-ink-2 hover:bg-surface-2')
              }
            >
              <IconDocument size={14} />
              {t('Tabel')}
            </button>
          ) : null}
        </div>
      </header>

      {legend.length > 1 ? (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line px-5 py-3 sm:px-6">
          {legend.map((l) => (
            <Pill key={l.label} color={l.color}>
              {t(l.label)}
            </Pill>
          ))}
        </div>
      ) : null}

      {showTable && table ? (
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                {table.head.map((h, i) => (
                  <th
                    key={h}
                    className={
                      'px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.07em] text-ink-3 sm:px-6 ' +
                      (i === 0 ? '' : 'text-right')
                    }
                  >
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-line">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={
                        'px-5 py-2.5 text-sm sm:px-6 ' +
                        (ci === 0
                          ? 'font-semibold text-ink'
                          : 'text-right tabular-nums text-ink-2')
                      }
                    >
                      {typeof cell === 'string' ? t(cell) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-2 py-4 sm:px-4" style={{ minHeight: height }}>
          {children}
        </div>
      )}
    </section>
  )
}

export function VizTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 shadow-pop">
      <p className="mb-1.5 text-[12px] font-bold text-ink">{label}</p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={p.dataKey} className="flex items-center gap-2 text-[12px] text-ink-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color || p.stroke }} />
            <span className="mr-3">{p.name}</span>
            <span className="ml-auto font-bold tabular-nums text-ink">
              {p.value}
              {suffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
