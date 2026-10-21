import { useMemo, useState } from 'react'
import FilterBar, { DEFAULT_FILTER, saringanAktif } from '../../components/FilterBar'
import { Card, CatatanKaki, EmptyState, JudulHalaman, KartuAngka, PredikatTeks, ScoreBar, Tabs } from '../../components/Ui'
import { IconDownload } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { FACULTIES, STUDENTS, byAngkatan, byProgram, filterStudents, ringkas } from '../../lib/data'
import { susunCSV, unduhBerkas } from '../../lib/csv'
import { useTeks } from '../../lib/bahasa'
import { useStore } from '../../lib/store'
import { labelSemesterAngkatan } from './LoncengKemahasiswaan'

/* Capaian per unit. Judulnya sama dengan menunya ("Program Studi"); dulu "Capaian per unit", jadi lokasi
   halaman dan judul tidak cocok. Tiga angka memakai KartuAngka seperti Overview; alat saringnya FilterBar
   ringkas seperti Data Mahasiswa. Lihat README.md › Panel Kemahasiswaan › Tampilan. */
export default function Programs() {
  const t = useTeks()
  const versi = useStore()
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [tampilan, setTampilan] = useState('prodi')

  const rows = useMemo(() => filterStudents(filter), [filter, versi])
  const r = useMemo(() => ringkas(rows), [rows])
  const programs = useMemo(() => byProgram(rows), [rows])
  const angkatan = useMemo(() => byAngkatan(rows), [rows])
  const bagi = (n) => (r.total ? Math.round((n / r.total) * 100) : 0)

  const fakultas = useMemo(
    () =>
      FACULTIES.map((f) => {
        const list = rows.filter((s) => s.faculty === f.name)
        return { nama: f.name, prodi: f.programs.length, total: list.length, ...ringkas(list) }
      }).sort((a, b) => (b.rata ?? 0) - (a.rata ?? 0)),
    [rows],
  )

  const daftar =
    tampilan === 'prodi'
      ? programs.map((p) => ({ kunci: p.program, judul: p.program, sub: p.faculty, ...p }))
      : tampilan === 'fakultas'
        ? fakultas.map((f) => ({
            kunci: f.nama,
            // Dulu dirakit dengan teks tetap ('Fakultas ' + nama, ' program studi'), jadi tetap Indonesia di mode Inggris.
            judul: t('Fakultas {nama}', { nama: f.nama }),
            sub: t('{n} program studi', { n: f.prodi }),
            ...f,
          }))
        : angkatan.map((a) => ({
            kunci: a.angkatan.id,
            judul: t('Angkatan {label}', { label: a.angkatan.label }),
            // Semester kalender, bukan semesterAktif: semesterAktif dibatasi 1 sampai 3, jadi angkatan yang belum
            // mulai tertulis "Semester 1" dan yang sudah selesai "Semester 3". Statusnya dulu tampil mentah ("aktif").
            sub:
              labelSemesterAngkatan(t, a.angkatan.intake) +
              ' · ' +
              t(a.angkatan.status === 'terkunci' ? 'Terkunci' : 'Aktif'),
            ...a,
          }))

  function unduhRekap() {
    unduhBerkas(
      'rekap-' + tampilan + '-' + new Date().toISOString().slice(0, 10) + '.csv',
      susunCSV(
        ['Unit', 'Keterangan', 'Mahasiswa', 'Transkrip final', 'Rata-rata'],
        daftar.map((d) => [d.judul, d.sub, d.total, d.final, d.rata ?? '']),
      ),
    )
  }

  return (
    <div className="space-y-6">
      <JudulHalaman
        judul={t('Program Studi')}
        keterangan={t('Bandingkan capaian CPMK antar program studi, fakultas, dan angkatan.')}
        aksi={
          <button type="button" className="btn-ghost" onClick={unduhRekap} disabled={!daftar.length}>
            <IconDownload size={17} />
            {t('Unduh rekap')}
          </button>
        }
      />

      <section aria-label={t('Ringkasan angka')} className="grid gap-5 md:grid-cols-3">
        <KartuAngka
          judul={t('Unit terpantau')}
          nilai={programs.length.toLocaleString('id-ID')}
          satuan={t('program studi')}
          keterangan={t('Program studi yang punya mahasiswa pada saringan ini.')}
        />
        <KartuAngka
          judul={t('Rata-rata gabungan')}
          nilai={r.rata ?? '-'}
          satuan={t('dari 100')}
          persen={bagi(r.diAtasAmbang)}
          persenLabel={t('Di atas batas {ambang}', { ambang: CONFIG.AMBANG_SERTIFIKAT })}
        />
        <KartuAngka
          judul={t('Transkrip final')}
          nilai={r.final.toLocaleString('id-ID')}
          satuan={t('dari {n}', { n: r.total.toLocaleString('id-ID') })}
          persen={bagi(r.final)}
          persenLabel={t('Sudah dikunci')}
        />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold leading-tight text-ink">{t('Tabel perbandingan')}</h2>
            {/* Dulu "lewat tab di sebelah kanan", padahal di layar sempit tab-nya turun ke bawah. */}
            <p className="mt-1 text-[13px] text-ink-2">{t('Pilih satuan analisis: program studi, fakultas, atau angkatan.')}</p>
          </div>
          <Tabs
            label={t('Satuan analisis')}
            value={tampilan}
            onChange={setTampilan}
            items={[
              { value: 'prodi', label: t('Program studi'), count: programs.length },
              { value: 'fakultas', label: t('Fakultas'), count: fakultas.length },
              { value: 'angkatan', label: t('Angkatan'), count: angkatan.length },
            ]}
          />
        </div>

        <div className="border-b border-line px-4 py-4 sm:px-5">
          <FilterBar ringkas withSearch={false} value={filter} onChange={setFilter} />
          {saringanAktif(filter) ? (
            <button
              type="button"
              onClick={() => setFilter({ ...DEFAULT_FILTER })}
              className="mt-2 inline-flex min-h-[44px] items-center rounded-xl text-[13.5px] font-bold text-brand-ink underline-offset-4 hover:underline sm:min-h-0"
            >
              {t('Atur ulang filter')}
            </button>
          ) : null}
        </div>

        {daftar.length ? (
          <ul className="divide-y divide-line">
            {daftar.map((d) => (
              <li key={d.kunci} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-2 sm:px-6">
                <div className="min-w-[220px] flex-1">
                  <p className="text-[14.5px] font-bold text-ink">{d.judul}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-2">
                    {d.sub} · {t('{n} mahasiswa', { n: d.total })} · {t('{n} transkrip final', { n: d.final })}
                  </p>
                </div>
                <span className="w-40">
                  {d.rata == null ? (
                    <span className="block h-[10px] rounded-full border border-dashed border-line" />
                  ) : (
                    <ScoreBar value={d.rata} color="var(--c1)" />
                  )}
                </span>
                <span className="w-8 text-right">
                  <PredikatTeks nilai={d.rata} />
                </span>
                <span className="w-9 text-right text-[16px] font-extrabold tabular-nums text-ink">{d.rata ?? '-'}</span>
              </li>
            ))}
          </ul>
        ) : !STUDENTS.length ? (
          <EmptyState title={t('Belum ada data mahasiswa')}>
            {t('Data mahasiswa akan tampil di sini begitu tersedia.')}
          </EmptyState>
        ) : (
          <EmptyState title={t('Tidak ada data pada filter ini')}>
            {t('Ubah pilihan fakultas, angkatan, atau semester.')}
          </EmptyState>
        )}

        <div className="px-5 pb-4 sm:px-6">
          <CatatanKaki>
            {t('Angka ini bukan peringkat. Komposisi mata kuliah, jadwal asesmen, dan program kemahasiswaan tiap unit berbeda, dan angkatan yang berbeda berada pada semester yang berbeda pula, sehingga jumlah aspek yang sudah dinilai tidak sama.')}
          </CatatanKaki>
        </div>
      </Card>
    </div>
  )
}
