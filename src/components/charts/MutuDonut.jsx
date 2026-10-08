import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import ChartFrame from './ChartFrame'
import { RUBRIK } from '../../lib/scoring'
import { useTeks } from '../../lib/bahasa'

/* --------------------------------------------------------------------------
   Sebaran huruf mutu — satu-satunya grafik di halaman Ringkasan.

   Bentuk donat dipakai karena tugas datanya memang bagian-terhadap-keseluruhan
   dan segmennya hanya lima (batas amannya enam). Pembacaannya sekilas saja;
   angka pastinya tetap tertulis di daftar sebelah kanan dan di tampilan tabel.

   Warna A-D adalah SATU hue bertingkat karena huruf mutu itu skala berurutan,
   bukan empat kategori setara. "Belum Memenuhi" bukan huruf mutu melainkan
   status, jadi ia memakai token status dan selalu disertai label.
   -------------------------------------------------------------------------- */

const WARNA = { A: 'var(--mutu-a)', B: 'var(--mutu-b)', C: 'var(--mutu-c)', D: 'var(--mutu-d)' }

function Keterangan({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-pop">
      <p className="text-[14px] font-bold text-ink">{d.judul}</p>
      <p className="mt-1 text-[13.5px] text-ink-2">
        {d.jumlah.toLocaleString('id-ID')} mahasiswa · {Math.round((d.jumlah / total) * 100)}%
      </p>
    </div>
  )
}

export default function MutuDonut({ huruf, totalMahasiswa, height = 260 }) {
  const t = useTeks()
  const data = [
    ...RUBRIK.map((r) => ({
      kunci: r.huruf,
      judul: 'Huruf ' + r.huruf,
      rincian: r.label,
      rentang: r.min + '–' + r.max,
      jumlah: huruf[r.huruf] ?? 0,
      warna: WARNA[r.huruf],
    })),
    {
      kunci: 'belum',
      judul: 'Belum Memenuhi',
      rincian: 'Bukan huruf mutu, capaian di bawah 60',
      rentang: '0–59',
      jumlah: huruf.belum ?? 0,
      warna: 'var(--critical)',
    },
  ].filter((d) => d.jumlah > 0)

  /* Penyebutnya WAJIB jumlah seluruh irisan, bukan jumlah mahasiswa. Kalau ada
     mahasiswa yang belum punya nilai sama sekali, ia tidak punya huruf mutu dan
     tidak boleh ikut membagi — kalau tidak, persentasenya tidak akan genap 100. */
  const total = data.reduce((a, d) => a + d.jumlah, 0)
  const belumDinilai = Math.max(0, (totalMahasiswa ?? total) - total)
  const persen = (n) => (total ? Math.round((n / total) * 100) : 0)

  return (
    <ChartFrame
      title="Grafik Sebaran Aspek"
      subtitle={t('Dari {n} mahasiswa yang sudah punya nilai', {
        n: total.toLocaleString('id-ID'),
      })}
      height={height}
      table={{
        head: ['Huruf mutu', 'Rentang nilai', 'Mahasiswa', 'Bagian'],
        rows: data.map((d) => [
          d.judul + ' — ' + d.rincian,
          d.rentang,
          d.jumlah.toLocaleString('id-ID'),
          persen(d.jumlah) + '%',
        ]),
      }}
    >
      <div className="grid items-center gap-6 px-3 sm:px-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative mx-auto" style={{ width: 230, height: 230 }}>
          {/* Ukuran donat memang tetap, jadi lebih sederhana tanpa
              ResponsiveContainer — sekaligus menghindari kontainer 0x0. */}
          <PieChart width={230} height={230}>
            <Pie
              data={data}
              dataKey="jumlah"
              nameKey="judul"
              innerRadius={72}
              outerRadius={108}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.kunci} fill={d.warna} />
              ))}
            </Pie>
            <Tooltip content={<Keterangan total={total} />} />
          </PieChart>

          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <p className="text-[30px] font-extrabold leading-none tabular-nums text-ink">
              {total.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-[13px] text-ink-2">sudah dinilai</p>
          </div>
        </div>

        {/* Angka pastinya ditulis, bukan diserahkan pada besar-kecil irisan. */}
        {data.length ? (
          <ul className="space-y-2.5">
            {data.map((d) => (
              <li key={d.kunci} className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 shrink-0 rounded-[4px]" style={{ background: d.warna }} />
                <span className="min-w-0 flex-1 text-[14.5px] text-ink">
                  <span className="font-bold">{d.judul}</span>
                  <span className="text-ink-2"> · {d.rincian}</span>
                </span>
                <span className="shrink-0 text-[14.5px] tabular-nums text-ink-2">
                  {d.jumlah.toLocaleString('id-ID')}
                </span>
                <span className="w-12 shrink-0 text-right text-[15px] font-bold tabular-nums text-ink">
                  {persen(d.jumlah)}%
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            {t('Belum ada mahasiswa yang punya nilai, jadi sebarannya belum bisa digambar.')}
          </p>
        )}
      </div>

      {belumDinilai > 0 ? (
        <p className="px-3 pt-4 text-[13.5px] leading-relaxed text-ink-3 sm:px-4">
          {belumDinilai.toLocaleString('id-ID')} mahasiswa belum punya nilai sama sekali, sehingga belum
          memiliki huruf mutu dan tidak ikut dihitung di sini.
        </p>
      ) : null}
    </ChartFrame>
  )
}
