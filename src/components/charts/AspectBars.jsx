import ChartFrame from './ChartFrame'
import { ScoreBar, Terkunci } from '../Ui'
import { getArea } from '../../lib/curriculum'
import { CATATAN_BOBOT_SEMENTARA } from '../../lib/config'
import { useTeks } from '../../lib/bahasa'

/* Sepuluh aspek CPMK sebagai bar horizontal dengan label nilai langsung.
   Aspek yang semesternya belum tiba TIDAK digambar sebagai bar kosong atau nol
   — barisnya diganti penanda gembok (R2). */

export default function AspectBars({
  rows,
  title = 'Nilai per aspek CPMK',
  subtitle = 'Sepuluh aspek, dikelompokkan menurut area pengembangan',
  height = 380,
  catatan,
}) {
  const t = useTeks()
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      height={height}
      table={{
        head: ['Kode', 'Aspek', 'Semester', 'Nilai'],
        rows: rows.map((r) => [
          r.aspek.kode,
          r.aspek.nama,
          r.aspek.semester,
          r.terkunci ? 'Belum dibuka' : (r.nilai ?? 'Belum dinilai'),
        ]),
      }}
    >
      <ul className="space-y-3.5 px-3 py-2 sm:px-4">
        {rows.map((r) => {
          const warna = getArea(r.aspek.area)?.warna ?? 'var(--brand-ink)'
          return (
            <li key={r.aspek.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: warna }} />
                  <span className="font-bold text-ink">{r.aspek.kode}</span>
                  <span className="truncate text-ink-2">{r.aspek.nama}</span>
                </span>
                <span className="shrink-0">
                  {r.terkunci ? (
                    <Terkunci semester={r.aspek.semester} ringkas />
                  ) : r.nilai == null ? (
                    <span className="text-[12.5px] font-semibold text-ink-3">Belum dinilai</span>
                  ) : (
                    <span className="text-[15px] font-bold tabular-nums text-ink">{r.nilai}</span>
                  )}
                </span>
              </div>
              {r.terkunci || r.nilai == null ? (
                <div className="h-[10px] rounded-full border border-dashed border-line" />
              ) : (
                <ScoreBar value={r.nilai} color={warna} />
              )}
            </li>
          )
        })}
      </ul>
      <p className="px-3 pb-1 pt-3 text-[12px] leading-snug text-ink-3 sm:px-4">
        {catatan ?? t('Warna menandai area pengembangan, bukan peringkat.') + ' ' + t(CATATAN_BOBOT_SEMENTARA)}
      </p>
    </ChartFrame>
  )
}
