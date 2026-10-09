import { useEffect, useMemo, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LembarSertifikat from '../student/LembarSertifikat'
import { Badge, Card, CatatanKaki, EmptyState, PredikatTeks, SearchInput, Select, StatusTeks, Tabs } from '../../components/Ui'
import { IconPrint } from '../../components/Icons'
import { kelayakanSertifikat } from '../../lib/rules'
import { COHORTS, STUDENTS, filterStudents, transkripOf } from '../../lib/data'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

const PAGE_SIZE = 12

export default function CetakSertifikat() {
  const t = useTeks()
  const versi = useStore()
  const params = useSearchParams()
  const [cari, setCari] = useState(() => params.get('cari') ?? '')
  const [angkatan, setAngkatan] = useState(() =>
    COHORTS.some((c) => c.label === params.get('angkatan')) ? params.get('angkatan') : 'Semua',
  )
  const [kelompok, setKelompok] = useState('semua')
  const [page, setPage] = useState(1)
  const [dicetak, setDicetak] = useState(null)

  const semua = useMemo(
    () =>
      STUDENTS.map((s) => ({ s, k: kelayakanSertifikat(s) })).sort(
        (a, b) => Number(b.k.layak) - Number(a.k.layak) || a.s.name.localeCompare(b.s.name),
      ),
    [versi],
  )
  const jumlahBerhak = semua.filter((x) => x.k.layak).length

  const cocok = useMemo(() => {
    const angkatanId = COHORTS.find((c) => c.label === angkatan)?.id ?? 'Semua'
    const ids = new Set(filterStudents({ angkatan: angkatanId, query: cari }).map((s) => s.id))
    return semua.filter((x) => ids.has(x.s.id))
  }, [semua, cari, angkatan])

  const berhak = cocok.filter((x) => x.k.layak)
  const belum = cocok.filter((x) => !x.k.layak)
  const baris = kelompok === 'berhak' ? berhak : kelompok === 'belum' ? belum : cocok

  useEffect(() => setPage(1), [cari, angkatan, kelompok])

  const halaman = Math.max(1, Math.ceil(baris.length / PAGE_SIZE))
  const tampil = baris.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const cetak = (s) => {
    flushSync(() => setDicetak(s))
    const selesai = () => {
      window.removeEventListener('afterprint', selesai)
      setDicetak(null)
    }
    window.addEventListener('afterprint', selesai)
    window.print()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{t('Cetak sertifikat')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t('Bantu mahasiswa yang kesulitan mencetak sertifikatnya sendiri. Lembarnya sama persis dengan yang dicetak mahasiswa.')}
        </p>
        <p className="mt-1 text-[14px] text-ink-2">
          {t('{n} dari {total} mahasiswa sudah berhak atas sertifikat', {
            n: jumlahBerhak.toLocaleString('id-ID'),
            total: STUDENTS.length.toLocaleString('id-ID'),
          })}
        </p>
      </div>

      <div className="card card-pad space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <span className="mb-1.5 block label">{t('Cari mahasiswa')}</span>
            <SearchInput value={cari} onChange={setCari} placeholder={t('Nama, NIM, atau prodi…')} />
          </div>
          <Select
            label={t('Angkatan')}
            value={angkatan}
            onChange={setAngkatan}
            options={['Semua', ...COHORTS.map((c) => c.label)]}
            tampilkan={t}
          />
        </div>
        <Tabs
          value={kelompok}
          onChange={setKelompok}
          items={[
            { value: 'semua', label: t('Semua'), count: cocok.length },
            { value: 'berhak', label: t('Berhak'), count: berhak.length },
            { value: 'belum', label: t('Belum berhak'), count: belum.length },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {['NIM', 'Nama', 'Angkatan', 'Nilai', 'Predikat', 'Kelayakan'].map((h, i) => (
                  <th
                    key={h}
                    className={
                      'px-4 py-3 text-[11px] font-bold uppercase tracking-[.07em] text-ink-3 ' +
                      (i === 3 || i === 4 ? 'text-right' : 'text-left')
                    }
                  >
                    {t(h)}
                  </th>
                ))}
                <th className="px-4 py-3">
                  <span className="sr-only">{t('Aksi')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tampil.map(({ s, k }) => {
                const sebab = k.gagal.map((g) => g.ringkas).filter(Boolean)
                const nilai = k.transkrip.akhir.nilai
                return (
                  <tr key={s.id} className="border-b border-line align-top transition hover:bg-surface-2">
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-ink-2">{s.nim}</td>
                    <td className="px-4 py-3">
                      <Link href={'/admin/mahasiswa/' + s.id} className="text-[14px] font-bold text-ink hover:text-brand-ink">
                        {s.name}
                      </Link>
                      <span className="block text-[12px] text-ink-3">{s.program}</span>
                    </td>
                    <td className="table-cell">{s.angkatanLabel}</td>
                    <td className="px-4 py-3 text-right text-[14px] font-bold tabular-nums text-ink">{nilai ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <PredikatTeks nilai={nilai} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusTeks kuat={k.layak}>{t(k.layak ? 'Berhak' : 'Belum berhak')}</StatusTeks>
                      {!k.layak && sebab.length ? (
                        <span id={'sebab-' + s.id} className="mt-0.5 block max-w-[280px] text-[12.5px] leading-snug text-ink-2">
                          {t(sebab[0])}
                          {sebab.length > 1 ? ' ' + t('+{n} syarat lain', { n: sebab.length - 1 }) : ''}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => cetak(s)}
                        disabled={!k.layak}
                        aria-label={t('Cetak sertifikat {nama}', { nama: s.name })}
                        aria-describedby={!k.layak && sebab.length ? 'sebab-' + s.id : undefined}
                        className="btn-primary inline-flex min-h-[40px] items-center gap-1.5 !px-3 !py-2 text-[13px] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-2 disabled:shadow-none"
                      >
                        <IconPrint size={15} />
                        {t('Cetak')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!STUDENTS.length ? (
          <EmptyState title={t('Belum ada data mahasiswa')}>
            {t('Data mahasiswa akan tampil di sini begitu tersedia.')}
          </EmptyState>
        ) : !tampil.length ? (
          <EmptyState title={t('Tidak ada mahasiswa yang cocok')}>
            {t('Ubah kata kunci, angkatan, atau pilihan kelayakan.')}
          </EmptyState>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <p className="text-[13px] text-ink-2">
              {t('Menampilkan')}{' '}
              <strong className="tabular-nums text-ink">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, baris.length)}
              </strong>{' '}
              {t('dari')} <strong className="tabular-nums text-ink">{baris.length}</strong>
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
        {t('Tombol cetak hanya aktif bila kelima syarat terpenuhi, sama seperti di panel mahasiswa. Pilih Simpan sebagai PDF di dialog cetak untuk mengirimkannya ke mahasiswa.')}
      </CatatanKaki>

      {/* Dipasang di <body> hanya selama mencetak; lihat README.md › Cetak. */}
      {dicetak
        ? createPortal(<LembarSertifikat student={dicetak} transkrip={transkripOf(dicetak)} />, document.body)
        : null}
    </div>
  )
}
