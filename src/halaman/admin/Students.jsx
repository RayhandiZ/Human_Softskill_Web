import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import FilterBar, { DEFAULT_FILTER } from '../../components/FilterBar'
import { Badge, Card, CatatanKaki, EmptyState, PredikatTeks, ScoreBar, Select } from '../../components/Ui'
import { IconChevronDown, IconChevronRight, IconDownload, IconRefresh } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { useTeks } from '../../lib/bahasa'
import { susunCSV, unduhBerkas } from '../../lib/csv'
import { kelayakanSertifikat } from '../../lib/rules'
import { hurufMutu } from '../../lib/scoring'
import { STUDENTS, filterStudents, ringkas, transkripOf } from '../../lib/data'
import { segarkanData, terakhirSegar, useStore } from '../../lib/store'

const PAGE_SIZE = 12

const KOLOM = [
  { key: 'nim', label: 'NIM', align: 'left' },
  { key: 'name', label: 'Nama', align: 'left' },
  { key: 'program', label: 'Program studi', align: 'left' },
  { key: 'angkatanLabel', label: 'Angkatan', align: 'left' },
  { key: 'semesterAktif', label: 'Sem', align: 'right' },
  { key: 'nilai', label: 'Nilai', align: 'right' },
  { key: 'huruf', label: 'Predikat', align: 'right' },
  { key: 'dinilai', label: 'Aspek dinilai', align: 'right' },
  { key: 'sertifikat', label: 'Sertifikat', align: 'left' },
]

export default function Students() {
  const t = useTeks()
  const versi = useStore()
  const segar = terakhirSegar()
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [kelengkapan, setKelengkapan] = useState('Semua')
  const [sort, setSort] = useState({ key: 'nilai', dir: 'desc' })
  const [page, setPage] = useState(1)

  const dasar = useMemo(() => filterStudents(filter), [filter, versi])

  const rows = useMemo(
    () =>
      dasar
        .map((s) => {
          const t = transkripOf(s)
          const kosong = t.aspek.filter((a) => !a.terkunci && a.komponenKosong.length > 0).length
          return {
            s,
            nilai: t.akhir.nilai,
            dinilai: t.akhir.aspekDinilai,
            total: t.akhir.aspekTotal,
            kosong,
            layak: kelayakanSertifikat(s).layak,
          }
        })
        .filter((x) => (kelengkapan === 'Semua' ? true : kelengkapan === 'Lengkap' ? x.kosong === 0 : x.kosong > 0)),
    [dasar, kelengkapan],
  )

  const r = useMemo(() => ringkas(dasar), [dasar])

  const urut = useMemo(() => {
    const ambil = (x) => {
      if (x[sort.key] !== undefined) return x[sort.key]
      if (sort.key === 'huruf') return x.nilai
      return x.s[sort.key]
    }
    return [...rows].sort((a, b) => {
      const p = ambil(a) ?? -1
      const q = ambil(b) ?? -1
      const c = typeof p === 'string' ? p.localeCompare(q) : p - q
      return sort.dir === 'asc' ? c : -c
    })
  }, [rows, sort])

  useEffect(() => setPage(1), [filter, sort, kelengkapan])

  const halaman = Math.max(1, Math.ceil(urut.length / PAGE_SIZE))
  const tampil = urut.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function eksporCSV() {
    unduhBerkas(
      'data-mahasiswa-' + new Date().toISOString().slice(0, 10) + '.csv',
      susunCSV(
        ['NIM', 'Nama', 'Email', 'Program studi', 'Angkatan', 'Semester', 'Nilai', 'Predikat', 'Aspek dinilai', 'Sertifikat'],
        urut.map((x) => [
          x.s.nim, x.s.name, x.s.email, x.s.program, x.s.angkatanLabel,
          x.s.semesterAktif, x.nilai ?? '', hurufMutu(x.nilai)?.huruf ?? '',
          x.dinilai + '/' + x.total, x.layak ? 'Berhak' : 'Belum',
        ]),
      ),
    )
  }

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">
            {t('Data mahasiswa')}
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            {t('{n} mahasiswa', { n: rows.length.toLocaleString('id-ID') })} ·{' '}
            {t('rata-rata {n}', { n: r.rata ?? '-' })} ·{' '}
            {t('{n} transkrip final', { n: r.final })}
          </p>
          {segar ? (
            <p className="mt-1 text-[12.5px] text-ink-3">
              {t('Terakhir disegarkan {jam}', {
                jam: segar.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-ghost" onClick={segarkanData}>
            <IconRefresh size={17} />
            {t('Segarkan data')}
          </button>
          <button type="button" className="btn-ghost" onClick={eksporCSV} disabled={!urut.length}>
            <IconDownload size={17} />
            {t('Ekspor CSV')}
          </button>
        </div>
      </div>

      <FilterBar value={filter} onChange={setFilter} />

      <div className="max-w-xs">
        <Select
          label={t('Kelengkapan nilai')}
          value={kelengkapan}
          onChange={setKelengkapan}
          options={['Semua', 'Lengkap', 'Ada yang kosong']}
          tampilkan={t}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {KOLOM.map((c) => {
                  const aktif = sort.key === c.key
                  return (
                    <th
                      key={c.key}
                      className={
                        'px-4 py-3 text-[11px] font-bold uppercase tracking-[.07em] ' +
                        (c.align === 'right' ? 'text-right ' : 'text-left ') +
                        (aktif ? 'text-brand-ink' : 'text-ink-3')
                      }
                    >
                      <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-ink">
                        {t(c.label)}
                        {aktif ? (
                          <IconChevronDown size={13} className={sort.dir === 'asc' ? 'rotate-180 transition' : 'transition'} />
                        ) : null}
                      </button>
                    </th>
                  )
                })}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {tampil.map((x) => (
                <tr key={x.s.id} className="border-b border-line transition hover:bg-surface-2">
                  <td className="px-4 py-3 text-[12.5px] tabular-nums text-ink-2">{x.s.nim}</td>
                  <td className="px-4 py-3">
                    <Link href={'/admin/mahasiswa/' + x.s.id} className="text-[14px] font-bold text-ink hover:text-brand-ink">
                      {x.s.name}
                    </Link>
                    <span className="block text-[12px] text-ink-3">{x.s.email}</span>
                  </td>
                  <td className="table-cell">{x.s.program}</td>
                  <td className="table-cell">{x.s.angkatanLabel}</td>
                  <td className="px-4 py-3 text-right text-[13.5px] tabular-nums text-ink-2">
                    {x.s.semesterAktif}/{CONFIG.TOTAL_SEMESTER_PROGRAM}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="w-14">
                        <ScoreBar value={x.nilai ?? 0} color="var(--c1)" height={7} />
                      </span>
                      <span className="w-7 text-right text-[14px] font-bold tabular-nums text-ink">
                        {x.nilai ?? '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PredikatTeks nilai={x.nilai} />
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-ink-2">
                    {x.dinilai}/{x.total}
                    {x.kosong ? (
                      <span className="ml-1.5 text-ink-2">
                        ·{t('{n} kosong', { n: x.kosong })}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={x.layak ? 'good' : 'neutral'}>
                      {t(x.layak ? 'Berhak' : 'Belum')}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Link
                      href={'/admin/mahasiswa/' + x.s.id}
                      aria-label={t('Buka transkrip {nama}', { nama: x.s.name })}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface hover:text-brand-ink"
                    >
                      <IconChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!STUDENTS.length ? (
          <EmptyState title={t('Belum ada data mahasiswa')}>
            {t('Data mahasiswa akan tampil di sini begitu tersedia.')}
          </EmptyState>
        ) : !tampil.length ? (
          <EmptyState title={t('Tidak ada mahasiswa yang cocok')}>
            {t('Longgarkan filter, ubah kata kunci, atau setel kelengkapan nilai kembali ke “Semua”.')}
          </EmptyState>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <p className="text-[13px] text-ink-2">
              {t('Menampilkan')}{' '}
              <strong className="tabular-nums text-ink">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, urut.length)}
              </strong>{' '}
              {t('dari')} <strong className="tabular-nums text-ink">{urut.length}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                {t('Sebelumnya')}
              </button>
              <Badge tone="neutral">
                {page} / {halaman}
              </Badge>
              <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" disabled={page === halaman} onClick={() => setPage((p) => p + 1)}>
                {t('Berikutnya')}
              </button>
            </div>
          </div>
        )}
      </Card>

      <CatatanKaki>
        {t('Kolom “Aspek dinilai” menghitung aspek yang sudah punya nilai, bukan aspek yang sudah dibuka. Aspek yang semesternya belum tiba tidak pernah ikut dihitung.')}
      </CatatanKaki>
    </div>
  )
}
