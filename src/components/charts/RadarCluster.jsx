import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartFrame, { VizTooltip } from './ChartFrame'
import { CLUSTER } from '../../lib/curriculum'

/* Enam sumbu cluster, satu seri. Cluster yang seluruh aspeknya belum dibuka
   TIDAK digambar di angka nol — nilainya null sehingga sumbunya kosong, dan
   keadaannya dijelaskan lewat daftar di bawah grafik (R2). */

export default function RadarCluster({
  data,
  title = 'Profil enam cluster',
  subtitle = 'Rata-rata aspek CPMK di tiap cluster',
  seriesName = 'Capaian',
  color = 'var(--brand-ink)',
  height = 300,
}) {
  const rows = CLUSTER.map((c) => {
    const d = data.find((x) => x.cluster.id === c.id)
    return {
      id: c.id,
      sumbu: c.id,
      nama: c.nama,
      nilai: d?.nilai ?? null,
      dinilai: d?.dinilai ?? 0,
      total: d?.total ?? c.aspek.length,
    }
  })

  const terkunci = rows.filter((r) => r.nilai == null)
  const sebagian = rows.filter((r) => r.nilai != null && r.dinilai < r.total)

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      height={height}
      table={{
        head: ['Cluster', 'Nilai', 'Aspek dinilai'],
        rows: rows.map((r) => [
          r.id + ' · ' + r.nama,
          r.nilai ?? 'Belum dibuka',
          r.dinilai + ' / ' + r.total,
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={rows} outerRadius="70%" margin={{ top: 8, right: 30, bottom: 8, left: 30 }}>
          <PolarGrid stroke="var(--grid)" />
          <PolarAngleAxis dataKey="sumbu" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={seriesName}
            dataKey="nilai"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.16}
            connectNulls={false}
            dot={{ r: 4, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
          />
          <Tooltip content={<VizTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
        </RadarChart>
      </ResponsiveContainer>

      <ul className="mt-1 space-y-1.5 px-4 pb-1">
        {rows.map((r) => (
          <li key={r.id} className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="text-ink-2">
              <span className="font-bold text-ink">{r.id}</span> {r.nama}
            </span>
            <span className="shrink-0 tabular-nums text-ink-3">
              {r.nilai == null ? 'belum dibuka' : r.nilai + ' · ' + r.dinilai + '/' + r.total + ' aspek'}
            </span>
          </li>
        ))}
      </ul>

      {terkunci.length || sebagian.length ? (
        <p className="px-4 pb-2 pt-3 text-[12px] leading-snug text-ink-3">
          {terkunci.length ? terkunci.length + ' cluster belum dibuka sehingga sumbunya kosong — bukan bernilai nol. ' : ''}
          {sebagian.length
            ? sebagian.map((r) => r.id).join(', ') + ' baru dinilai sebagian karena aspeknya melintasi dua semester.'
            : ''}
        </p>
      ) : null}
    </ChartFrame>
  )
}
