import { useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import ChartFrame from './ChartFrame'
import { KATEGORI_KOMPETENSI, RUBRIK, tulisRentang } from '../../lib/scoring'
import { useTeks } from '../../lib/bahasa'

/* Satu irisan per kategori kompetensi, bukan per huruf: delapan huruf melewati batas aman enam irisan. Empat kategori
   teratas memakai skala biru berurutan; Belum Memenuhi (huruf D, di bawah 55) memakai token merah dan selalu berlabel.
   Lihat README.md › Kenapa donat. */
const WARNA = {
  'Professional & Competent': 'var(--mutu-a)',
  'Emerging Professional': 'var(--mutu-b)',
  'Developing Professional Skills': 'var(--mutu-c)',
  'Basic Professional Awareness': 'var(--mutu-d)',
  'Belum Memenuhi': 'var(--critical)',
}

/* Rincian irisan yang disorot tampil di label tengah, bukan di kotak keterangan melayang. Kotak Tooltip Recharts
   dulu menimpa label tengah (19 Nov 2026): Recharts menjangkarkannya di titik tengah irisan dan menahannya di dalam
   kotak grafik 230px, jadi kotak selebar ~150px selalu jatuh ke lubang donat; label tengah juga tergambar di atasnya
   karena sama-sama absolute tanpa z-index dan letaknya sesudah grafik di DOM. */

export default function MutuDonut({ huruf, totalMahasiswa, height = 260 }) {
  const t = useTeks()
  const [sorot, setSorot] = useState(null)
  const data = KATEGORI_KOMPETENSI.map((kategori) => {
    // RUBRIK urut dari yang tertinggi: anggota pertama memegang batas atas, yang terakhir batas bawah.
    const anggota = RUBRIK.filter((r) => r.label === kategori)
    return {
      kunci: kategori,
      judul: t('Huruf {daftar}', { daftar: anggota.map((r) => r.huruf).join(', ') }),
      rincian: t(kategori),
      rentang: tulisRentang(anggota[anggota.length - 1].min, anggota[0].max),
      jumlah: anggota.reduce((n, r) => n + (huruf[r.huruf] ?? 0), 0),
      warna: WARNA[kategori],
    }
  }).filter((d) => d.jumlah > 0)

  /* Penyebut = jumlah seluruh irisan, bukan jumlah mahasiswa; lihat README.md › Kenapa donat. */
  const total = data.reduce((a, d) => a + d.jumlah, 0)
  const belumDinilai = Math.max(0, (totalMahasiswa ?? total) - total)
  const persen = (n) => (total ? Math.round((n / total) * 100) : 0)
  const aktif = sorot != null ? (data[sorot] ?? null) : null

  return (
    <ChartFrame
      title="Grafik Sebaran Aspek"
      subtitle="Dari {n} mahasiswa yang sudah punya nilai"
      subtitleNilai={{ n: total.toLocaleString('id-ID') }}
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
              onMouseEnter={(_, i) => setSorot(i)}
              onMouseLeave={() => setSorot(null)}
            >
              {/* Irisan lain diredupkan supaya jelas irisan mana yang sedang dibaca di tengah. */}
              {data.map((d) => (
                <Cell key={d.kunci} fill={d.warna} fillOpacity={aktif && aktif !== d ? 0.45 : 1} />
              ))}
            </Pie>
          </PieChart>

          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            {aktif ? (
              <>
                <p className="text-[30px] font-extrabold leading-none tabular-nums text-ink">{persen(aktif.jumlah)}%</p>
                <p className="mt-1.5 text-[13px] font-bold text-ink">{aktif.judul}</p>
                <p className="text-[13px] text-ink-2">
                  {t('{n} mahasiswa', { n: aktif.jumlah.toLocaleString('id-ID') })}
                </p>
              </>
            ) : (
              <>
                <p className="text-[30px] font-extrabold leading-none tabular-nums text-ink">
                  {total.toLocaleString('id-ID')}
                </p>
                <p className="mt-1 text-[13px] text-ink-2">{t('sudah dinilai')}</p>
              </>
            )}
          </div>
        </div>

        {data.length ? (
          // Lebar dibatasi supaya jumlah dan persen tetap dekat dengan labelnya; dulu di layar lebar terpisah sekitar 800px.
          // 480px memuat baris terpanjang dalam satu baris (terukur 439px: "Grade B-, C+, C · Basic Professional Awareness").
          <ul className="w-full max-w-[480px] space-y-2.5">
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
