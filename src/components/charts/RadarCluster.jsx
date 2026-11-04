import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartFrame, { VizTooltip } from './ChartFrame'
import { CLUSTER } from '../../lib/curriculum'
import { useTeks } from '../../lib/bahasa'

/* Label sumbu menyertakan nilainya: bentuk poligon saja tidak bisa dibaca sampai ke angkanya. */
function TandaSumbu({ x, y, textAnchor, payload, baris }) {
  const r = baris.find((b) => b.id === payload.value)
  return (
    <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fontSize={12} fill="var(--text-secondary)">
      <tspan fontWeight={700}>{payload.value}</tspan>
      {r?.nilai != null ? (
        <tspan dx={4} fontWeight={800} fill="var(--text-primary)">
          {r.nilai}
        </tspan>
      ) : null}
    </text>
  )
}

export default function RadarCluster({
  data,
  title = 'Profil enam cluster',
  subtitle = 'Rata-rata aspek CPMK di tiap cluster, skala 0 sampai 100',
  seriesName = 'Capaian',
  color = 'var(--brand-ink)',
  height = 300,
}) {
  const t = useTeks()
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
        <RadarChart data={rows} outerRadius="68%" margin={{ top: 8, right: 40, bottom: 8, left: 40 }}>
          <PolarGrid stroke="var(--grid)" />
          <PolarAngleAxis dataKey="sumbu" tick={<TandaSumbu baris={rows} />} />
          {/* Skala di sumbu tegak, supaya jarak titik dari tengah punya arti. 100 tidak ditulis: ia menimpa label CL1 di
              ujung sumbu itu, dan batas skalanya sudah disebut di subjudul. */}
          <PolarRadiusAxis
            domain={[0, 100]}
            ticks={[25, 50, 75]}
            angle={90}
            axisLine={false}
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
          />
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
              {r.nilai == null
                ? t('belum dibuka')
                : t('{nilai} · {dinilai}/{total} aspek', { nilai: r.nilai, dinilai: r.dinilai, total: r.total })}
            </span>
          </li>
        ))}
      </ul>

      {terkunci.length || sebagian.length ? (
        <p className="px-4 pb-2 pt-3 text-[12px] leading-snug text-ink-3">
          {terkunci.length
            ? t('{n} cluster belum dibuka sehingga sumbunya kosong, bukan bernilai nol.', { n: terkunci.length }) + ' '
            : ''}
          {sebagian.length
            ? t('{daftar} baru dinilai sebagian karena aspeknya melintasi dua semester.', {
                daftar: sebagian.map((r) => r.id).join(', '),
              })
            : ''}
        </p>
      ) : null}
    </ChartFrame>
  )
}
