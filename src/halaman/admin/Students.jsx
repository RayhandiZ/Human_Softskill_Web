import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import FilterBar, { DEFAULT_FILTER, saringanAktif } from '../../components/FilterBar'
import {
  Badge,
  Card,
  CatatanKaki,
  EmptyState,
  GulirTabel,
  JudulHalaman,
  Paginasi,
  PredikatTeks,
  ScoreBar,
  TabSaring,
} from '../../components/Ui'
import {
  IconChevronDown,
  IconDocument,
  IconDownload,
  IconLainnya,
  IconPencil,
  IconUrut,
} from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { useTeks } from '../../lib/bahasa'
import { susunCSV, unduhBerkas } from '../../lib/csv'
import { kelayakanSertifikat } from '../../lib/rules'
import { hurufMutu } from '../../lib/scoring'
import { STUDENTS, filterStudents, ringkas, transkripOf } from '../../lib/data'
import { useStore } from '../../lib/store'
import { tautanInput } from './LoncengKemahasiswaan'

const UKURAN_HALAMAN = [12, 25, 50]

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

/* Menu aksi satu baris. Diletakkan fixed dari posisi tombolnya supaya tidak terpotong wadah tabel yang bisa
   digulir ke samping; naik ke atas tombol bila ruang di bawahnya tidak cukup. Pola menu: panah memindah fokus,
   Esc menutup dan mengembalikan fokus ke tombol, Tab menutupnya. */
function MenuBaris({ s }) {
  const t = useTeks()
  const id = useId()
  const [posisi, setPosisi] = useState(null)
  const tombol = useRef(null)
  const menu = useRef(null)
  const buka = Boolean(posisi)
  const TINGGI = 104

  function bukaMenu() {
    const r = tombol.current.getBoundingClientRect()
    const muatDiBawah = r.bottom + 6 + TINGGI <= window.innerHeight
    setPosisi({ top: muatDiBawah ? r.bottom + 6 : r.top - 6 - TINGGI, right: window.innerWidth - r.right })
  }

  useEffect(() => {
    if (!buka) return undefined
    menu.current?.querySelector('[role="menuitem"]')?.focus()
    const tutup = () => setPosisi(null)
    const onDown = (e) => {
      if (!menu.current?.contains(e.target) && !tombol.current?.contains(e.target)) tutup()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        tutup()
        tombol.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', tutup, true)
    window.addEventListener('resize', tutup)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', tutup, true)
      window.removeEventListener('resize', tutup)
    }
  }, [buka])

  function onKeyMenu(e) {
    const butir = [...menu.current.querySelectorAll('[role="menuitem"]')]
    const i = butir.indexOf(document.activeElement)
    const ke = (n) => {
      e.preventDefault()
      butir[(n + butir.length) % butir.length]?.focus()
    }
    if (e.key === 'ArrowDown') ke(i + 1)
    else if (e.key === 'ArrowUp') ke(i - 1)
    else if (e.key === 'Home') ke(0)
    else if (e.key === 'End') ke(butir.length - 1)
    else if (e.key === 'Tab') setPosisi(null)
  }

  const kelasButir =
    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-ink outline-none transition hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:text-brand-ink'

  return (
    <>
      <button
        ref={tombol}
        type="button"
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-controls={buka ? id : undefined}
        aria-label={t('Aksi untuk {nama}', { nama: s.name })}
        onClick={() => (buka ? setPosisi(null) : bukaMenu())}
        className="grid h-10 w-10 place-items-center rounded-xl text-ink-2 transition hover:bg-surface hover:text-ink"
      >
        <IconLainnya size={18} />
      </button>
      {buka ? (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label={t('Aksi untuk {nama}', { nama: s.name })}
          onKeyDown={onKeyMenu}
          style={{ position: 'fixed', top: posisi.top, right: posisi.right }}
          className="z-40 w-[230px] rounded-xl border border-line bg-surface p-1.5 shadow-pop animate-rise"
        >
          <Link role="menuitem" href={'/admin/mahasiswa/' + s.id} className={kelasButir}>
            <IconDocument size={16} className="shrink-0 text-ink-2" />
            {t('Lihat detail & transkrip')}
          </Link>
          <Link
            role="menuitem"
            href={tautanInput({ semester: s.semesterAktif, angkatanId: s.angkatanId, nim: s.nim })}
            className={kelasButir}
          >
            <IconPencil size={16} className="shrink-0 text-ink-2" />
            {t('Masukkan nilai')}
          </Link>
        </div>
      ) : null}
    </>
  )
}

export default function Students() {
  const t = useTeks()
  const versi = useStore()
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [kelengkapan, setKelengkapan] = useState('Semua')
  const [sort, setSort] = useState({ key: 'nilai', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [ukuran, setUkuran] = useState(UKURAN_HALAMAN[0])

  const dasar = useMemo(() => filterStudents(filter), [filter, versi])

  const semua = useMemo(
    () =>
      dasar.map((s) => {
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
      }),
    [dasar],
  )
  const rows = useMemo(
    () => (kelengkapan === 'Semua' ? semua : semua.filter((x) => (kelengkapan === 'Lengkap' ? x.kosong === 0 : x.kosong > 0))),
    [semua, kelengkapan],
  )

  // Tab kelengkapan beserta jumlahnya: berapa yang belum lengkap langsung terbaca tanpa harus memilihnya.
  const jumlahLengkap = semua.filter((x) => x.kosong === 0).length
  const tabKelengkapan = [
    { nilai: 'Semua', label: t('Semua'), n: semua.length },
    { nilai: 'Lengkap', label: t('Lengkap'), n: jumlahLengkap },
    { nilai: 'Belum lengkap', label: t('Belum lengkap'), n: semua.length - jumlahLengkap },
  ]
  const adaSaringan = saringanAktif(filter) || kelengkapan !== 'Semua'

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

  useEffect(() => setPage(1), [filter, sort, kelengkapan, ukuran])

  const halaman = Math.max(1, Math.ceil(urut.length / ukuran))
  const tampil = urut.slice((page - 1) * ukuran, page * ukuran)

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
      {/* Tombol segarkan tidak diulang di sini: bilah status di atas halaman sudah memuat waktu pembaruan dan
          tombol Segarkan yang menjalankan hal yang sama. */}
      <JudulHalaman
        judul={t('Data Mahasiswa')}
        // Sama dasarnya dengan rata-rata dan transkrip final di sebelahnya: sesudah saringan, sebelum tab kelengkapan.
        keterangan={
          t('{n} mahasiswa', { n: semua.length.toLocaleString('id-ID') }) +
          ' · ' +
          t('rata-rata {n}', { n: r.rata ?? '-' }) +
          ' · ' +
          t('{n} transkrip final', { n: r.final })
        }
        aksi={
          <button type="button" className="btn-primary" onClick={eksporCSV} disabled={!urut.length}>
            <IconDownload size={17} />
            {t('Ekspor CSV')}
          </button>
        }
      />

      <Card className="overflow-hidden">
        {/* ------------------- tab kelengkapan nilai + atur ulang ------------------- */}
        <TabSaring
          label={t('Kelengkapan nilai')}
          nilai={kelengkapan}
          onPilih={setKelengkapan}
          pilihan={tabKelengkapan}
          kanan={
            adaSaringan ? (
              <button
                type="button"
                onClick={() => {
                  setFilter({ ...DEFAULT_FILTER })
                  setKelengkapan('Semua')
                }}
                className="inline-flex min-h-[44px] items-center rounded-xl text-[13.5px] font-bold text-brand-ink underline-offset-4 hover:underline"
              >
                {t('Atur ulang filter')}
              </button>
            ) : null
          }
        />

        {/* ------------------------------ alat saring ------------------------------ */}
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <FilterBar ringkas value={filter} onChange={setFilter} />
        </div>

        {/* GulirTabel: label sr-only "Aksi" dulu lolos dari wadah gulir dan melebarkan layar HP ke 1110px.
            Garis baris dipasang di sel (border-separate), bukan di <tr>: pada border-collapse garis sel yang menempel
            (kolom aksi, sticky) ikut tergulir pergi. Kolom aksi menempel di kanan supaya tombol ⋯ tetap terlihat di
            layar 1280 sampai 1366 px, tempat tabel ini memang harus digulir ke samping. scroll-padding kanan
            selebar kolom itu: tanpa itu, judul kolom atau tautan yang difokus dengan Tab berhenti tepat di
            bawah kolom ⋯ dan tertutup (WCAG 2.4.11). */}
        <GulirTabel jarak="scroll-pl-5 scroll-pr-[72px]">
          <table className="w-full min-w-[980px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-surface-2">
                {KOLOM.map((c, i) => {
                  const aktif = sort.key === c.key
                  return (
                    <th
                      key={c.key}
                      aria-sort={aktif ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={
                        'border-b border-line py-3 pr-3 ' +
                        (i === 0 ? 'pl-4 sm:pl-5 ' : 'pl-3 ') +
                        (c.align === 'right' ? 'text-right' : 'text-left')
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        className={
                          'inline-flex items-center gap-1 whitespace-nowrap rounded-md text-[12.5px] font-bold transition hover:text-ink ' +
                          (aktif ? 'text-brand-ink' : 'text-ink-2')
                        }
                      >
                        {t(c.label)}
                        {aktif ? (
                          <IconChevronDown size={13} className={sort.dir === 'asc' ? 'rotate-180 transition' : 'transition'} />
                        ) : (
                          <IconUrut size={13} className="text-ink-3" />
                        )}
                      </button>
                    </th>
                  )
                })}
                <th className="sticky right-0 w-14 border-b border-l border-line bg-surface-2 px-2 py-3">
                  <span className="sr-only">{t('Aksi')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((x) => (
                <tr key={x.s.id} className="group transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-line">
                  <td className="py-3 pl-4 pr-3 text-[13px] tabular-nums text-ink-2 sm:pl-5">{x.s.nim}</td>
                  {/* Email tidak diulang di sini: tetap ada di detail mahasiswa, ekspor CSV, dan pencarian. */}
                  <td className="px-3 py-3">
                    <Link href={'/admin/mahasiswa/' + x.s.id} className="text-[14.5px] font-bold text-ink hover:text-brand-ink hover:underline">
                      {x.s.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-sm text-ink-2">{x.s.program}</td>
                  <td className="px-3 py-3 text-sm text-ink-2">{x.s.angkatanLabel}</td>
                  <td className="px-3 py-3 text-right text-[13.5px] tabular-nums text-ink-2">
                    {x.s.semesterAktif}/{CONFIG.TOTAL_SEMESTER_PROGRAM}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="w-14">
                        <ScoreBar value={x.nilai ?? 0} color="var(--c1)" height={7} />
                      </span>
                      <span className="w-7 text-right text-[14px] font-bold tabular-nums text-ink">{x.nilai ?? '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <PredikatTeks nilai={x.nilai} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[13.5px] tabular-nums text-ink-2">
                    {x.dinilai}/{x.total}
                    {x.kosong ? <span className="ml-1.5 text-ink-2">· {t('{n} kosong', { n: x.kosong })}</span> : null}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={x.layak ? 'good' : 'neutral'} className={x.layak ? 'teks-baik' : ''}>
                      {t(x.layak ? 'Berhak' : 'Belum')}
                    </Badge>
                  </td>
                  <td className="sticky right-0 border-l bg-surface px-2 py-2 text-right transition-colors group-hover:bg-surface-2">
                    <MenuBaris s={x.s} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GulirTabel>

        {!STUDENTS.length ? (
          <EmptyState title={t('Belum ada data mahasiswa')}>
            {t('Data mahasiswa akan tampil di sini begitu tersedia.')}
          </EmptyState>
        ) : !tampil.length && kelengkapan === 'Belum lengkap' && semua.length ? (
          // Tab "Belum lengkap" kosong itu kabar baik, bukan hasil saringan yang gagal.
          <EmptyState title={t('Tidak ada nilai yang kosong')}>
            {t('Semua {n} mahasiswa pada saringan ini sudah lengkap nilainya.', { n: semua.length.toLocaleString('id-ID') })}
          </EmptyState>
        ) : !tampil.length ? (
          <EmptyState title={t('Tidak ada mahasiswa yang cocok')}>
            {t('Longgarkan filter, ubah kata kunci, atau setel kelengkapan nilai kembali ke “Semua”.')}
          </EmptyState>
        ) : (
          <Paginasi
            halaman={page}
            jumlahHalaman={halaman}
            total={urut.length}
            ukuran={ukuran}
            onHalaman={setPage}
            pilihanUkuran={UKURAN_HALAMAN}
            onUkuran={setUkuran}
          />
        )}
      </Card>

      <CatatanKaki>
        {t('Kolom “Aspek dinilai” menghitung aspek yang sudah punya nilai, bukan aspek yang sudah dibuka. Aspek yang semesternya belum tiba tidak pernah ikut dihitung.')}
      </CatatanKaki>
    </div>
  )
}
