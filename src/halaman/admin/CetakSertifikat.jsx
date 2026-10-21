import { useEffect, useMemo, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LembarSertifikat from '../student/LembarSertifikat'
import {
  Card,
  CatatanKaki,
  EmptyState,
  GulirTabel,
  JUDUL_KOLOM,
  JudulHalaman,
  Paginasi,
  PredikatTeks,
  SearchInput,
  Select,
  StatusTeks,
  TabSaring,
} from '../../components/Ui'
import { IconPrint } from '../../components/Icons'
import { kelayakanSertifikat } from '../../lib/rules'
import { COHORTS, STUDENTS, filterStudents, transkripOf } from '../../lib/data'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

const PAGE_SIZE = 12

/* Susunannya sama dengan Data Mahasiswa: tab kelayakan berjumlah, alat saring, tabel, kaki bernomor halaman.
   Lihat README.md › Panel Kemahasiswaan › Tampilan. */
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
  const adaSaringan = Boolean(cari.trim()) || angkatan !== 'Semua' || kelompok !== 'semua'

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
      <JudulHalaman
        judul={t('Cetak Sertifikat')}
        keterangan={t('Bantu mahasiswa yang kesulitan mencetak sertifikatnya sendiri. Lembarnya sama persis dengan yang dicetak mahasiswa.')}
      >
        <p className="mt-1 text-[14px] text-ink-2">
          {t('{n} dari {total} mahasiswa sudah berhak atas sertifikat', {
            n: jumlahBerhak.toLocaleString('id-ID'),
            total: STUDENTS.length.toLocaleString('id-ID'),
          })}
        </p>
      </JudulHalaman>

      <Card className="overflow-hidden">
        <TabSaring
          label={t('Kelayakan sertifikat')}
          nilai={kelompok}
          onPilih={setKelompok}
          pilihan={[
            { nilai: 'semua', label: t('Semua'), n: cocok.length },
            { nilai: 'berhak', label: t('Berhak'), n: berhak.length },
            { nilai: 'belum', label: t('Belum berhak'), n: belum.length },
          ]}
          kanan={
            adaSaringan ? (
              <button
                type="button"
                onClick={() => {
                  setCari('')
                  setAngkatan('Semua')
                  setKelompok('semua')
                }}
                className="inline-flex min-h-[44px] items-center rounded-xl text-[13.5px] font-bold text-brand-ink underline-offset-4 hover:underline"
              >
                {t('Atur ulang filter')}
              </button>
            ) : null
          }
        />

        <div className="grid gap-2.5 border-b border-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:px-5">
          <SearchInput value={cari} onChange={setCari} label={t('Cari mahasiswa')} placeholder={t('Cari nama, NIM, atau prodi')} />
          <Select
            ringkas
            label={t('Angkatan')}
            value={angkatan}
            onChange={setAngkatan}
            options={['Semua', ...COHORTS.map((c) => c.label)]}
            tampilkan={(o) => (o === 'Semua' ? t('Semua') : o)}
          />
        </div>

        <GulirTabel>
          <table className="w-full min-w-[860px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-surface-2 [&>th]:border-b [&>th]:border-line">
                <th className={JUDUL_KOLOM + ' pl-4 text-left sm:pl-5'}>{t('NIM')}</th>
                <th className={JUDUL_KOLOM + ' text-left'}>{t('Nama')}</th>
                <th className={JUDUL_KOLOM + ' text-left'}>{t('Angkatan')}</th>
                <th className={JUDUL_KOLOM + ' text-right'}>{t('Nilai')}</th>
                <th className={JUDUL_KOLOM + ' text-right'}>{t('Predikat')}</th>
                <th className={JUDUL_KOLOM + ' text-left'}>{t('Kelayakan')}</th>
                <th className={JUDUL_KOLOM + ' pr-4 sm:pr-5'}>
                  <span className="sr-only">{t('Aksi')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tampil.map(({ s, k }) => {
                // ringkasT: [kunci, isian]. ringkas sendiri dirakit dengan angka, jadi tidak bisa diterjemahkan.
                const sebab = k.gagal.map((g) => g.ringkasT).filter(Boolean)
                const nilai = k.transkrip.akhir.nilai
                return (
                  <tr key={s.id} className="align-top transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-line">
                    <td className="py-3 pl-4 pr-3 text-[13px] tabular-nums text-ink-2 sm:pl-5">{s.nim}</td>
                    <td className="px-3 py-3">
                      <Link href={'/admin/mahasiswa/' + s.id} className="text-[14.5px] font-bold text-ink hover:text-brand-ink hover:underline">
                        {s.name}
                      </Link>
                      <span className="block text-[12.5px] text-ink-2">{s.program}</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-ink-2">{s.angkatanLabel}</td>
                    <td className="px-3 py-3 text-right text-[14px] font-bold tabular-nums text-ink">{nilai ?? '-'}</td>
                    <td className="px-3 py-3 text-right">
                      <PredikatTeks nilai={nilai} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusTeks kuat={k.layak}>{t(k.layak ? 'Berhak' : 'Belum berhak')}</StatusTeks>
                      {!k.layak && sebab.length ? (
                        <span id={'sebab-' + s.id} className="mt-0.5 block max-w-[280px] text-[12.5px] leading-snug text-ink-2">
                          {t(...sebab[0])}
                          {sebab.length > 1 ? ' ' + t('+{n} syarat lain', { n: sebab.length - 1 }) : ''}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pl-3 pr-4 text-right sm:pr-5">
                      {/* Tombol garis, bukan isian penuh: satu tombol biru pekat per baris membuat tabel terasa berat. */}
                      <button
                        type="button"
                        onClick={() => cetak(s)}
                        disabled={!k.layak}
                        aria-label={t('Cetak sertifikat {nama}', { nama: s.name })}
                        aria-describedby={!k.layak && sebab.length ? 'sebab-' + s.id : undefined}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[13px] font-bold text-brand-ink transition hover:border-brand-ink hover:bg-brand-soft active:scale-[.97] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-2 disabled:active:scale-100"
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
        </GulirTabel>

        {!STUDENTS.length ? (
          <EmptyState title={t('Belum ada data mahasiswa')}>
            {t('Data mahasiswa akan tampil di sini begitu tersedia.')}
          </EmptyState>
        ) : !tampil.length ? (
          <EmptyState title={t('Tidak ada mahasiswa yang cocok')}>
            {t('Ubah kata kunci, angkatan, atau pilihan kelayakan.')}
          </EmptyState>
        ) : (
          <Paginasi halaman={page} jumlahHalaman={halaman} total={baris.length} ukuran={PAGE_SIZE} onHalaman={setPage} />
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
