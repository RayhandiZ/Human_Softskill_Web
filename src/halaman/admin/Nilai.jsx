import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Badge,
  Card,
  CardHeader,
  CatatanKaki,
  EmptyState,
  SearchInput,
  Select,
  StatTile,
  Tabs,
  TandaDraft,
} from '../../components/Ui'
import {
  IconAlert,
  IconCheck,
  IconDownload,
  IconInfo,
  IconLock,
  IconPencil,
  IconUndo,
  IconUpload,
  IconX,
} from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { SUMBER, SUMBER_LIST, getAspekSemester, getKomponen, getKomponenById } from '../../lib/curriculum'
import { bolehTandaiFinal, validasiBatchImport } from '../../lib/rules'
import { susunCSV, unduhBerkas } from '../../lib/csv'
import {
  AGREGASI,
  SKALA_PILIHAN,
  analisaBerkas,
  hitungEntri,
  keyakinan,
} from '../../lib/ingest'
import {
  BATCH_IMPORT,
  COHORTS,
  FACULTIES,
  FAKULTAS_OF,
  JENJANG_OF,
  PENGAJUAN_KOREKSI,
  STUDENTS,
  getAngkatan,
  getStudentByNim,
  labelPeriode,
  programStudi,
} from '../../lib/data'
import {
  BATCH_SESI,
  bersihkanPerubahan,
  peringatanSesi,
  putuskanKoreksi,
  setPenguncianBanyak,
  rollbackBatch,
  simpanBatch,
  useStore,
} from '../../lib/store'
import { modeLokal } from '../../lib/modeData'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

const PAGE_SIZE = 10
const SEMESTER_KOSONG = '— Pilih semester —'


const TANDA_BARIS = [
  { id: 'sementara', label: 'Sementara', ringkas: 'tahan walau sudah lengkap' },
  { id: 'final', label: 'Final', ringkas: 'kunci, nilai berhenti berubah' },
]

/** Tanda status hanya diterapkan ke pasangan (mahasiswa, aspek) yang ikut tersimpan. */
async function terapkanStatus(batch, aktor, tandaBaris = {}) {
  const pasangan = [
    ...new Map(batch.jejak.map((j) => [j.nim + '|' + j.aspek, { nim: j.nim, aspekId: j.aspek }])).values(),
  ]

  const kelompok = { final: [], sementara: [], ikuti: [] }
  for (const pas of pasangan) {
    const tanda = tandaBaris[pas.nim] ?? null
    if (tanda === 'final') kelompok.final.push(pas)
    else if (tanda === 'sementara') kelompok.sementara.push(pas)
    else kelompok.ikuti.push(pas)
  }

  /* Aspek yang komponennya belum lengkap tidak boleh dikunci, walau diminta. */
  const layak = kelompok.final.filter((p) => bolehTandaiFinal(getStudentByNim(p.nim), p.aspekId).boleh)

  if (layak.length) await setPenguncianBanyak(layak, { status: 'final', aktor })
  if (kelompok.sementara.length) {
    await setPenguncianBanyak(kelompok.sementara, { status: 'sementara', aktor })
  }
  if (kelompok.ikuti.length) await setPenguncianBanyak(kelompok.ikuti, { status: null, aktor })

  return {
    dikunci: layak.length,
    ditolakFinal: kelompok.final.length - layak.length,
    ditahan: kelompok.sementara.length,
    otomatis: kelompok.ikuti.length,
    tersentuh: pasangan.length,
  }
}

export default function Nilai() {
  const t = useTeks()
  const versi = useStore()

  const { admin } = useAuth()
  const aktor = admin.officer

  /* Sasaran boleh datang dari URL; nilai yang tidak dikenal jatuh ke bawaan; lihat README.md › Input nilai. */
  const params = useSearchParams()
  const awal = (kunci) => params?.get(kunci) ?? null

  const [semesterPilihan, setSemesterPilihan] = useState(() => {
    const n = Number(awal('semester'))
    return n >= 1 && n <= CONFIG.TOTAL_SEMESTER_PROGRAM ? 'Semester ' + n : SEMESTER_KOSONG
  })
  const [sumber, setSumber] = useState(() =>
    ['PDP', 'MK', 'ENGAGEMENT'].includes(awal('sumber')) ? awal('sumber') : 'MK',
  )
  const [angkatanId, setAngkatanId] = useState(() =>
    COHORTS.some((c) => c.id === awal('angkatan')) ? awal('angkatan') : (COHORTS[0]?.id ?? null),
  )
  const [faculty, setFaculty] = useState(() => awal('fakultas') ?? 'Semua')
  const [program, setProgram] = useState(() => awal('prodi') ?? 'Semua')
  const [tab, setTab] = useState(() =>
    ['manual', 'import', 'koreksi'].includes(awal('tab')) ? awal('tab') : 'manual',
  )

  const semester = semesterPilihan === SEMESTER_KOSONG ? null : Number(semesterPilihan.replace(/\D/g, ''))
  const angkatan = getAngkatan(angkatanId)

  const aspekSemester = useMemo(() => (semester ? getAspekSemester(semester) : []), [semester])

  const komponenSumber = useMemo(
    () => aspekSemester.flatMap((a) => getKomponen(a.id).filter((k) => k.sumber === sumber)),
    [aspekSemester, sumber],
  )

  const aspekBerkomponen = useMemo(
    () => aspekSemester.filter((a) => getKomponen(a.id).some((k) => k.sumber === sumber)),
    [aspekSemester, sumber],
  )

  const mahasiswa = useMemo(
    () =>
      STUDENTS.filter(
        (s) =>
          s.angkatanId === angkatanId &&
          (faculty === 'Semua' || s.faculty === faculty) &&
          (program === 'Semua' || s.program === program),
      ),
    [angkatanId, faculty, program, versi],
  )

  if (!angkatan) {
    return (
      <Card>
        <EmptyState title={t('Belum ada data angkatan')}>
          {t('Tambahkan angkatan di basis data lebih dulu; nilai selalu dimasukkan per angkatan.')}
        </EmptyState>
      </Card>
    )
  }

  const angkatanSiap = angkatan.semesterAktif >= (semester ?? 1)

  const koreksiMenunggu = PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu').length

  return (
    <div className="space-y-6">

      {/* ---------------------- langkah 1: pilih semester ---------------------- */}
      <Card>
        <CardHeader
          title={t('Pilih Yan Akan Di Input')}
          subtitle={t('Semester wajib dipilih sebelum data bisa dimasukkan')}
          icon={IconPencil}
        />
        <div className="card-pad grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <div>
            <Select
              label={t('Semester yang diisi')}
              value={semesterPilihan}
              onChange={setSemesterPilihan}
              options={[
                SEMESTER_KOSONG,
                ...Array.from({ length: CONFIG.TOTAL_SEMESTER_PROGRAM }, (_, i) => 'Semester ' + (i + 1)),
              ]}
              tampilkan={t}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">
              {semester
                ? t('{n} aspek CPMK berada di semester ini', { n: aspekSemester.length })
                : t('Belum dipilih')}
            </p>
          </div>

          <div>
            <Select
              label={t('Sumber penilaian')}
              value={SUMBER[sumber].label}
              onChange={(v) => setSumber(SUMBER_LIST.find((s) => s.label === v).id)}
              options={SUMBER_LIST.map((s) => s.label)}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">{SUMBER[sumber].nama}</p>
          </div>

          <div>
            <Select
              label={t('Angkatan')}
              value={angkatan.label}
              onChange={(v) => setAngkatanId(COHORTS.find((c) => c.label === v).id)}
              options={COHORTS.map((c) => c.label)}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">
              {t('Kini di Semester {n}', { n: angkatan.semesterAktif })}
              {semester
                ? ' · ' +
                  t('periode {periode}', {
                    periode: labelPeriode(angkatan.periode[semester - 1]),
                  })
                : ''}
            </p>
          </div>

          <div>
            <Select
              label={t('Fakultas')}
              value={faculty}
              onChange={(v) => {
                setFaculty(v)
                setProgram('Semua')
              }}
              options={['Semua', ...FACULTIES.map((f) => f.name)]}
              tampilkan={t}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">
              {program !== 'Semua'
                ? t('mengikuti program studi')
                : faculty === 'Semua'
                  ? t('{n} fakultas', { n: FACULTIES.length })
                  : t('{n} program studi', { n: programStudi(faculty).length })}
            </p>
          </div>

          <div>
            <Select
              label={t('Program studi')}
              value={program}
              onChange={(v) => {
                setProgram(v)
                if (v !== 'Semua') setFaculty(FAKULTAS_OF[v] ?? faculty)
              }}
              options={['Semua', ...programStudi(faculty)]}
              tampilkan={t}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">
              {t('{n} mahasiswa', { n: mahasiswa.length })}
              {program === 'Semua'
                ? ' ' + t('pada pilihan ini')
                : ' · ' + t('jenjang {jenjang}', { jenjang: JENJANG_OF[program] ?? '-' })}
            </p>
          </div>
        </div>
      </Card>

      {/* --------------------------- gerbang semester -------------------------- */}
      {!semester ? (
        <Card>
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
              <IconLock size={22} />
            </span>
            <p className="mt-4 text-[16px] font-bold text-ink">
              {t('Pilih semester terlebih dahulu')}
            </p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-2">
              {t('Setiap aspek CPMK hanya dinilai pada satu semester tertentu. Tanpa memilih semester, sistem tidak tahu komponen asesmen mana yang boleh diisi, dan nilai yang salah semester akan ditolak.')}
            </p>
            <ul className="mx-auto mt-6 grid max-w-lg gap-2 text-left sm:grid-cols-3">
              {Array.from({ length: CONFIG.TOTAL_SEMESTER_PROGRAM }, (_, i) => i + 1).map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setSemesterPilihan('Semester ' + s)}
                    className="w-full rounded-xl border border-line px-4 py-3 text-left transition hover:border-brand-ink hover:bg-surface-2"
                  >
                    <span className="block text-[13.5px] font-bold text-ink">
                      {t('Semester {n}', { n: s })}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">
                      {t('{n} aspek', { n: getAspekSemester(s).length })} ·{' '}
                      {getAspekSemester(s)
                        .map((a) => a.kode.replace('.', '').replace('.', ''))
                        .join(', ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : !komponenSumber.length ? (
        <Card>
          <EmptyState
            title={t('Tidak ada komponen {unit} pada Semester {semester}', {
              unit: SUMBER[sumber].label,
              semester,
            })}
          >
            {t('Dokumen kurikulum memang belum mencantumkan komponen asesmen dari sumber ini untuk semester tersebut. Pilih sumber lain, atau tambahkan komponennya lewat halaman')}{' '}
            <Link href="/admin/kurikulum" className="font-bold text-brand-ink hover:underline">
              {t('Kurikulum CPMK')}
            </Link>
            .
          </EmptyState>
        </Card>
      ) : !STUDENTS.length ? (
        <Card>
          <EmptyState title={t('Belum ada data mahasiswa')}>
            {t('Nilai baru bisa dimasukkan setelah data mahasiswa tersedia.')}
          </EmptyState>
        </Card>
      ) : !mahasiswa.length ? (
        <Card>
          <EmptyState title={t('Tidak ada mahasiswa pada pilihan ini')}>
            {t('Angkatan {label}', { label: angkatan.label })}
            {program !== 'Semua' ? ' ' + t('program studi {prodi}', { prodi: program }) : ''}
            {faculty !== 'Semua' && program === 'Semua'
              ? ' ' + t('fakultas {fakultas}', { fakultas: faculty })
              : ''}{' '}
            {t('belum punya mahasiswa terdaftar. Longgarkan pilihan fakultas atau program studi.')}
          </EmptyState>
        </Card>
      ) : !angkatanSiap ? (
        <Card>
          <EmptyState
            title={t('Angkatan {label} belum sampai Semester {semester}', {
              label: angkatan.label,
              semester,
            })}
          >
            {t('Angkatan ini baru menempuh Semester {aktif}. Nilai untuk Semester {semester} belum boleh dimasukkan; bila dipaksakan lewat import, seluruh barisnya akan ditolak.', {
              aktif: angkatan.semesterAktif,
              semester,
            })}
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label={t('Aspek pada semester ini')}
              value={aspekBerkomponen.length}
              unit={'/ ' + aspekSemester.length}
              icon={IconPencil}
              hint={aspekBerkomponen.map((a) => a.kode).join(' ')}
            />
            <StatTile
              label={t('Komponen dari sumber ini')}
              value={komponenSumber.length}
              icon={IconUpload}
              hint={SUMBER[sumber].label}
            />
            <StatTile
              label={t('Mahasiswa sasaran')}
              value={mahasiswa.length}
              icon={IconCheck}
              hint={t('Angkatan {label}', { label: angkatan.label })}
            />
          </div>

          <Card>
            <div className="border-b border-line px-5 py-4 sm:px-6">
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'manual', label: t('Input manual') },
                  { value: 'import', label: t('Import CSV') },
                  { value: 'koreksi', label: t('Pengajuan koreksi'), count: koreksiMenunggu },
                ]}
              />
            </div>

            {tab === 'manual' ? (
              <InputManual
                semester={semester}
                sumber={sumber}
                angkatan={angkatan}
                aspekList={aspekBerkomponen}
                mahasiswa={mahasiswa}
                aktor={aktor}
                awalAspek={awal('aspek')}
                awalCari={awal('cari') ?? ''}
              />
            ) : tab === 'import' ? (
              <ImportCerdas
                semester={semester}
                sumber={sumber}
                angkatan={angkatan}
                komponenSumber={komponenSumber}
                mahasiswa={mahasiswa}
                aktor={aktor}
                program={program}
              />
            ) : (
              <Koreksi aktor={aktor} />
            )}
          </Card>

          <RiwayatBatch />
        </>
      )}
    </div>
  )
}

/* ------------------------------ hasil simpan ------------------------------ */

function HasilSimpan({ hasil }) {
  const t = useTeks()
  const { batch, status } = hasil
  const mahasiswa = [...new Map(batch.jejak.map((j) => [j.nim, j])).values()]

  const bagian = []
  if (status.dikunci) bagian.push(t('{n} aspek dikunci sebagai final', { n: status.dikunci }))
  if (status.ditahan) bagian.push(t('{n} ditahan sebagai sementara', { n: status.ditahan }))
  if (status.otomatis) bagian.push(t('{n} mengikuti aturan sistem', { n: status.otomatis }))

  const catatanStatus =
    (bagian.length ? bagian.join(', ') + '.' : t('Status aspek tidak diubah.')) +
    (status.ditolakFinal
      ? ' ' +
        t('{n} aspek diminta final tetapi komponennya belum lengkap, jadi tetap sementara.', {
          n: status.ditolakFinal,
        })
      : '')

  return (
    <div className="rounded-xl border border-line bg-[color-mix(in_srgb,var(--good)_8%,transparent)] px-4 py-3.5">
      <p className="flex items-start gap-2 text-[13px] font-bold text-[var(--good)]">
        <IconCheck size={16} className="mt-px shrink-0" />
        {t('{n} nilai tersimpan sebagai batch {id}.', { n: batch.jumlah, id: batch.id })}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{catatanStatus}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
        {t('Transkrip dan dashboard {n} mahasiswa berikut sudah dihitung ulang tanpa tindakan tambahan.', {
          n: mahasiswa.length,
        })}
      </p>
      <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {mahasiswa.slice(0, 8).map((j) => {
          const m = getStudentByNim(j.nim)
          return (
            <li key={j.nim}>
              <Link
                href={'/admin/mahasiswa/' + m.id}
                className="text-[12.5px] font-bold text-brand-ink hover:underline"
              >
                {j.nama}
              </Link>
            </li>
          )
        })}
        {mahasiswa.length > 8 ? (
          <li className="text-[12.5px] text-ink-3">
            {t('dan {n} mahasiswa lain', { n: mahasiswa.length - 8 })}
          </li>
        ) : null}
      </ul>
    </div>
  )
}

function PesanGalat({ pesan }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
    >
      <IconAlert size={16} className="mt-px shrink-0" />
      {pesan}
    </p>
  )
}

/* ------------------------------ input manual ------------------------------ */

/* Menu tanda memakai position: fixed supaya tidak terpotong tabel yang bisa digulir mendatar. */
function TandaBaris({ nama, nilai, aktif, buka, onBuka, onPilih }) {
  const teks = useTeks()
  const terpilih = TANDA_BARIS.find((t) => t.id === nilai)
  const tombolRef = useRef(null)
  const [posisi, setPosisi] = useState(null)

  useEffect(() => {
    if (!buka || !tombolRef.current) {
      setPosisi(null)
      return
    }
    const hitung = () => {
      const r = tombolRef.current?.getBoundingClientRect()
      if (!r) return
      const lebar = 170
      setPosisi({
        atas: r.bottom + 6,
        kiri: Math.max(8, Math.min(r.left, window.innerWidth - lebar - 8)),
      })
    }
    hitung()
    window.addEventListener('resize', hitung)
    window.addEventListener('scroll', hitung, true)
    return () => {
      window.removeEventListener('resize', hitung)
      window.removeEventListener('scroll', hitung, true)
    }
  }, [buka])

  return (
    <div>
      <button
        ref={tombolRef}
        type="button"
        onClick={onBuka}
        disabled={!aktif}
        aria-expanded={buka}
        aria-label={teks('Tandai status untuk {nama}', { nama })}
        className={
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-bold transition ' +
          (!aktif
            ? 'cursor-not-allowed border-line bg-surface-2 text-ink-3'
            : terpilih
              ? 'border-brand-ink bg-brand-soft text-brand-ink'
              : 'border-line bg-surface text-ink-2 hover:border-brand-ink hover:text-brand-ink')
        }
      >
        <IconPencil size={14} />
        {terpilih ? teks(terpilih.label) : teks('Tandai')}
      </button>

      {buka && aktif && posisi ? (
        <div
          style={{ position: 'fixed', top: posisi.atas, left: posisi.kiri, width: 170 }}
          className="kaca animate-kaca z-50 rounded-xl p-1"
        >
          {TANDA_BARIS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPilih(t.id === nilai ? null : t.id)}
              className={
                'block w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-semibold transition ' +
                (t.id === nilai ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-surface-2')
              }
            >
              {teks(t.label)}
              <span className="block text-[11px] font-normal leading-snug text-ink-3">
                {teks(t.ringkas)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function InputManual({
  semester,
  sumber,
  angkatan,
  aspekList,
  mahasiswa,
  aktor,
  awalAspek = null,
  awalCari = '',
}) {
  const teks = useTeks()
  const [aspekId, setAspekId] = useState(() =>
    aspekList.some((a) => a.id === awalAspek) ? awalAspek : (aspekList[0]?.id ?? null),
  )
  const [cari, setCari] = useState(awalCari)
  const [page, setPage] = useState(1)
  const [draf, setDraf] = useState({})
  const [tanda, setTanda] = useState({})
  const [tandaBuka, setTandaBuka] = useState(null)
  const [pesan, setPesan] = useState(null)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    if (!aspekList.some((a) => a.id === aspekId)) setAspekId(aspekList[0]?.id ?? null)
  }, [aspekList, aspekId])

  useEffect(() => {
    setPage(1)
  }, [cari, aspekId])

  const kolom = useMemo(
    () => (aspekId ? getKomponen(aspekId).filter((k) => k.sumber === sumber) : []),
    [aspekId, sumber],
  )

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return mahasiswa.filter((s) => !q || s.name.toLowerCase().includes(q) || s.nim.includes(q))
  }, [mahasiswa, cari])

  const halaman = Math.max(1, Math.ceil(tersaring.length / PAGE_SIZE))
  const tampil = tersaring.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const kunci = (nim, komponenId) => nim + '|' + komponenId

  const nilaiTersimpan = (s, komponenId) => s.nilai?.[aspekId]?.komponen?.[komponenId]?.nilai ?? ''

  const ubah = (nim, komponenId, v) =>
    setDraf((d) => ({ ...d, [kunci(nim, komponenId)]: v }))

  const entri = useMemo(() => {
    const hasil = []
    for (const [k, v] of Object.entries(draf)) {
      const teks = String(v).trim()
      if (teks === '') continue
      const [nim, komponenId] = k.split('|')
      const angka = Number(teks)
      const sah = Number.isFinite(angka) && angka >= 0 && angka <= 100
      hasil.push({ nim, komponenId, nilai: angka, sah })
    }
    return hasil
  }, [draf])

  const sah = entri.filter((e) => e.sah)
  const tidakSah = entri.filter((e) => !e.sah)

  async function simpan() {
    if (!sah.length || sibuk) return
    setGalat('')
    setSibuk(true)
    let batch
    try {
      batch = await simpanBatch({
        sumber,
        semester,
        angkatanId: angkatan.id,
        aktor,
        cara: 'manual',
        entri: sah.map(({ nim, komponenId, nilai }) => ({ nim, komponenId, nilai })),
      })
    } catch (e) {
      setGalat(e.message)
      setSibuk(false)
      return
    }
    /* Isian dikosongkan sekarang juga supaya Simpan ulang tidak membuat batch kembar. */
    const tandaBaris = tanda
    setDraf({})
    setTanda({})
    setTandaBuka(null)
    try {
      setPesan({ batch, status: await terapkanStatus(batch, aktor, tandaBaris) })
    } catch (e) {
      setPesan({ batch, status: {} })
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  if (!aspekId) {
    return <EmptyState title={teks('Tidak ada aspek yang bisa diisi dari sumber ini.')} />
  }

  return (
    <div>
      <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-2 sm:px-6">
        <Select
          label={teks('Aspek CPMK')}
          value={aspekList.find((a) => a.id === aspekId)?.kode ?? ''}
          onChange={(v) => setAspekId(aspekList.find((a) => a.kode === v).id)}
          options={aspekList.map((a) => a.kode)}
        />
        <div>
          <span className="mb-1.5 block label">{teks('Cari mahasiswa')}</span>
          <SearchInput value={cari} onChange={setCari} placeholder={teks('Nama atau NIM…')} />
        </div>
        <p className="text-[12.5px] leading-snug text-ink-2 sm:col-span-2">
          {aspekList.find((a) => a.id === aspekId)?.nama},{' '}
          {teks('{n} komponen dari {unit}.', {
            n: kolom.length,
            unit: SUMBER[sumber].label,
          })}{' '}
          {teks('Kosongkan sel yang belum dinilai; sel kosong tidak dihitung sebagai nol.')}{' '}
          {teks('Baris yang tidak ditandai mengikuti aturan sistem: aspeknya menjadi final sendiri begitu seluruh komponennya terisi.')}
        </p>
      </div>

      {pesan ? (
        <div className="px-5 pt-4 sm:px-6">
          <HasilSimpan hasil={pesan} />
        </div>
      ) : null}
      {galat ? (
        <div className="px-5 pt-4 sm:px-6">
          <PesanGalat pesan={galat} />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                {teks('Mahasiswa')}
              </th>
              {kolom.map((k) => (
                <th
                  key={k.id}
                  className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3"
                >
                  <span className="block max-w-[190px] normal-case leading-snug text-ink-2">{k.label}</span>
                  <span className="mt-1 block font-mono text-[10px] text-ink-3">{k.id}</span>
                  {k.status === 'draft' ? (
                    <TandaDraft className="mt-1 inline-block">
                      {teks('Skema belum final')}
                    </TandaDraft>
                  ) : null}
                </th>
              ))}
              <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                {teks('Tanda')}
                <span className="mt-1 block max-w-[150px] normal-case font-semibold leading-snug text-ink-3">
                  {teks('sementara atau final')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tampil.map((s) => {
              const barisDiisi = kolom.some((k) => {
                const v = draf[kunci(s.nim, k.id)]
                return v !== undefined && String(v).trim() !== ''
              })
              return (
              <tr key={s.id} className="border-b border-line">
                <td className="px-4 py-2.5">
                  <Link href={'/admin/mahasiswa/' + s.id} className="text-[13.5px] font-bold text-ink hover:text-brand-ink">
                    {s.name}
                  </Link>
                  <span className="block text-[12px] tabular-nums text-ink-3">{s.nim}</span>
                  <span className="block max-w-[210px] text-[12px] leading-snug text-ink-3">
                    {s.program} · {s.faculty}
                  </span>
                </td>
                {kolom.map((k) => {
                  const tersimpan = nilaiTersimpan(s, k.id)
                  const isi = draf[kunci(s.nim, k.id)]
                  const nilaiInput = isi !== undefined ? isi : tersimpan
                  const angka = Number(String(nilaiInput).trim())
                  const buruk =
                    String(nilaiInput).trim() !== '' && (!Number.isFinite(angka) || angka < 0 || angka > 100)
                  const berubah = isi !== undefined && String(isi) !== String(tersimpan)
                  return (
                    <td key={k.id} className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        inputMode="numeric"
                        value={nilaiInput}
                        onChange={(e) => ubah(s.nim, k.id, e.target.value)}
                        aria-label={s.name + ', ' + k.label}
                        className={
                          'w-24 rounded-lg border px-2.5 py-1.5 text-[13.5px] font-semibold tabular-nums text-ink transition ' +
                          (buruk
                            ? 'border-[var(--critical)] bg-[color-mix(in_srgb,var(--critical)_8%,transparent)]'
                            : berubah
                              ? 'border-brand-ink bg-brand-soft'
                              : 'border-line bg-surface')
                        }
                      />
                      {buruk ? (
                        <span className="mt-1 block text-[11px] font-semibold text-[var(--critical)]">
                          {teks('harus 0–100')}
                        </span>
                      ) : null}
                    </td>
                  )
                })}

                <td className="px-3 py-2.5 align-middle">
                  <TandaBaris
                    nama={s.name}
                    nilai={tanda[s.nim] ?? null}
                    aktif={barisDiisi}
                    buka={tandaBuka === s.nim}
                    onBuka={() => setTandaBuka((n) => (n === s.nim ? null : s.nim))}
                    onPilih={(v) => {
                      setTanda((t) => ({ ...t, [s.nim]: v }))
                      setTandaBuka(null)
                    }}
                  />
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            {teks('Sebelumnya')}
          </button>
          <Badge tone="neutral">
            {page} / {halaman}
          </Badge>
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-[13px]"
            disabled={page === halaman}
            onClick={() => setPage((p) => p + 1)}
          >
            {teks('Berikutnya')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {tidakSah.length ? (
            <span className="text-[12.5px] font-semibold text-[var(--critical)]">
              {teks('{n} sel di luar rentang 0–100', { n: tidakSah.length })}
            </span>
          ) : null}
          <span className="text-[12.5px] text-ink-2">
            {sah.length
              ? teks('{n} nilai siap disimpan', { n: sah.length })
              : teks('Belum ada perubahan')}
          </span>
          <button type="button" className="btn-primary" disabled={!sah.length || tidakSah.length > 0 || sibuk} onClick={simpan}>
            <IconCheck size={17} />
            {teks('Simpan nilai')}
          </button>
        </div>
      </div>

      <div className="px-5 pb-4 sm:px-6">
        <CatatanKaki>{teks(peringatanSesi())}</CatatanKaki>
      </div>
    </div>
  )
}

/* ----------------------------- import cerdas ------------------------------ */

const ABAIKAN = '— Abaikan kolom ini —'
const labelKomponen = (k) => k.id + ' · ' + k.label

function ImportCerdas({ semester, sumber, angkatan, komponenSumber, mahasiswa, aktor, program }) {
  const tr = useTeks()
  const [teks, setTeks] = useState('')
  const [analisa, setAnalisa] = useState(null)
  const [peta, setPeta] = useState({})
  const [agregasi, setAgregasi] = useState('rata')
  const [pesan, setPesan] = useState(null)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const berkasRef = useRef(null)

  useEffect(() => {
    setAnalisa(null)
    setPeta({})
    setPesan(null)
  }, [semester, sumber, angkatan.id])

  /* -------------------------------- analisa ------------------------------- */

  function analisaSekarang(isi = teks) {
    const hasil = analisaBerkas(isi, { komponenList: komponenSumber })
    setAnalisa(hasil)
    setPesan(null)
    if (hasil.format === 'mentah') {
      setPeta(
        Object.fromEntries(
          hasil.kolomNilai.map((k) => [k.nama, { komponenId: k.usulan, skala: k.skala }]),
        ),
      )
    }
  }

  function bacaBerkas(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const fr = new FileReader()
    fr.onload = () => {
      const isi = String(fr.result ?? '')
      setTeks(isi)
      analisaSekarang(isi)
    }
    fr.readAsText(f)
  }

  const batasSasaran = (m) => {
    if (m.angkatanId !== angkatan.id)
      return tr('Mahasiswa bukan angkatan {label}', { label: angkatan.label })
    if (program !== 'Semua' && m.program !== program)
      return tr('Mahasiswa bukan dari program studi {prodi}', { prodi: program })
    return null
  }

  /* ------------------------- hitung ulang secara hidup -------------------- */

  const hasilBaku = useMemo(() => {
    if (analisa?.format !== 'baku') return null
    const dasar = validasiBatchImport(analisa.baris, { cariMahasiswa: getStudentByNim, sumber })
    const diperiksa = dasar.hasil.map((r) => {
      const alasan = [...r.alasan]
      const komponen = r.komponenId ? getKomponenById(r.komponenId) : null
      if (komponen && !getAspekSemester(semester).some((a) => a.id === komponen.aspekId)) {
        alasan.push(tr('Komponen ini bukan milik Semester {n}', { n: semester }))
      }
      if (r.mahasiswa) {
        const tolak = batasSasaran(r.mahasiswa)
        if (tolak) alasan.push(tolak)
      }
      return { ...r, alasan, ok: alasan.length === 0 }
    })
    return {
      diterima: diperiksa.filter((r) => r.ok),
      ditolak: diperiksa.filter((r) => !r.ok),
    }
  }, [analisa, sumber, semester, angkatan, program])

  const hasilMentah = useMemo(() => {
    if (analisa?.format !== 'mentah') return null
    return hitungEntri(analisa, peta, { agregasi, cariMahasiswa: getStudentByNim, batas: batasSasaran })
  }, [analisa, peta, agregasi, angkatan, program])

  const entriSiap =
    analisa?.format === 'baku'
      ? (hasilBaku?.diterima ?? []).map((r) => ({ nim: r.nim, komponenId: r.komponenId, nilai: r.nilai }))
      : (hasilMentah?.entri ?? []).map((e) => ({ nim: e.nim, komponenId: e.komponenId, nilai: e.nilai }))

  async function proses() {
    if (!entriSiap.length || sibuk) return
    setGalat('')
    setSibuk(true)
    let batch
    try {
      batch = await simpanBatch({
        sumber,
        semester,
        angkatanId: angkatan.id,
        aktor,
        cara: analisa.format === 'baku' ? 'import' : 'import-mentah',
        entri: entriSiap,
      })
    } catch (e) {
      setGalat(e.message)
      setSibuk(false)
      return
    }
    setAnalisa(null)
    setPeta({})
    setTeks('')
    if (berkasRef.current) berkasRef.current.value = ''
    try {
      setPesan({ batch, status: await terapkanStatus(batch, aktor) })
    } catch (e) {
      setPesan({ batch, status: {} })
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  /* ------------------------------ contoh berkas --------------------------- */

  function unduhTemplateBaku() {
    const baris = mahasiswa.slice(0, 3).flatMap((s) => komponenSumber.slice(0, 2).map((k) => [s.nim, k.id, '']))
    unduhBerkas(
      'template-baku-' + sumber.toLowerCase() + '-sem' + semester + '.csv',
      susunCSV(['nim', 'komponen', 'nilai'], baris),
    )
  }

  /* Kolom nilai sengaja kosong: NIM dan namanya milik mahasiswa sungguhan. */
  function unduhContohMentah() {
    const kolom = komponenSumber.slice(0, 4)
    const kepala = ['NIM', 'Nama Mahasiswa', ...kolom.map(namaKolomMentah)]
    const baris = mahasiswa.slice(0, 8).map((s) => [s.nim, s.name, ...kolom.map(() => '')])
    unduhBerkas('contoh-rekap-mentah-sem' + semester + '.csv', susunCSV(kepala, baris))
  }

  const adaAnalisa = Boolean(analisa) && !analisa.kosong

  return (
    <div className="card-pad space-y-5">
      {/* ------------------------------ unggah ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-ink">{tr('Unggah rekap nilai')}</h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-2">
            {tr('Berkas mentah dari dosen bisa langsung diunggah: sistem mengenali kolom NIM, menebak kolom mana memetakan ke komponen asesmen mana, mendeteksi skala nilai, lalu mengisi dan menghitungnya otomatis. Semua tebakan bisa Anda koreksi sebelum diproses.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" onClick={unduhContohMentah}>
            <IconDownload size={15} />
            {tr('Contoh rekap mentah')}
          </button>
          <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" onClick={unduhTemplateBaku}>
            <IconDownload size={15} />
            {tr('Template baku')}
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-bold text-ink">{tr('Berkas CSV')}</span>
          <input
            ref={berkasRef}
            type="file"
            accept=".csv,text/csv"
            onChange={bacaBerkas}
            className="text-[13px] text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-[13px] file:font-bold file:text-brand-ink"
          />
          <span className="text-[12px] text-ink-3">{tr('langsung dianalisa setelah dipilih')}</span>
        </label>

        <label>
          <span className="mb-1.5 block label">{tr('atau tempel isinya di sini')}</span>
          <textarea
            value={teks}
            onChange={(e) => {
              setTeks(e.target.value)
              setAnalisa(null)
            }}
            rows={5}
            spellCheck={false}
            placeholder="NIM,Nama Mahasiswa,Tugas 1,UTS,Nilai Sikap"
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink placeholder:text-ink-3 focus:border-brand-ink focus:bg-surface"
          />
        </label>

        <div>
          <button type="button" className="btn-ghost" disabled={!teks.trim()} onClick={() => analisaSekarang()}>
            <IconInfo size={17} />
            {tr('Analisa berkas')}
          </button>
        </div>
      </div>

      {pesan ? <HasilSimpan hasil={pesan} /> : null}
      {galat ? <PesanGalat pesan={galat} /> : null}

      {analisa?.kosong ? (
        <p className="rounded-xl border border-line px-4 py-3 text-[13px] text-ink-2">
          {tr('Berkas tidak berisi baris data. Pastikan baris pertama adalah kepala kolom.')}
        </p>
      ) : null}

      {/* --------------------------- hasil deteksi -------------------------- */}
      {adaAnalisa && analisa.format === 'mentah' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['Format terbaca', tr('Rekap mentah')],
              ['Kolom NIM', analisa.kolomNim ?? tr('tidak terdeteksi')],
              ['Baris data', analisa.baris.length],
              [
                'Kolom terpetakan',
                tr('{n} dari {total}', { n: analisa.terpetakan, total: analisa.kolomNumerik }),
              ],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line px-3.5 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">{tr(k)}</p>
                <p className="mt-1 text-[14px] font-bold text-ink">{v}</p>
              </div>
            ))}
          </div>

          {!analisa.kolomNim ? (
            <p className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_9%,transparent)] px-4 py-3 text-[13px] font-semibold text-[var(--critical)]">
              <IconAlert size={16} className="mt-px shrink-0" />
              {tr('Kolom NIM tidak ditemukan. Beri nama kolom itu “NIM” atau “NPM”, lalu unggah ulang.')}
            </p>
          ) : null}

          {/* ----------------------- pemetaan kolom ----------------------- */}
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-[.07em] text-ink-3">
                {tr('Pemetaan kolom, periksa dan koreksi bila perlu')}
              </p>
              <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                {tr('Bila satu komponen menerima beberapa kolom:')}
                <select
                  value={agregasi}
                  onChange={(e) => setAgregasi(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-ink"
                >
                  {AGREGASI.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    {['Kolom di berkas', 'Contoh isi', 'Skala', 'Dipetakan ke komponen', 'Keyakinan'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                        {tr(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analisa.kolomNilai.map((kol) => {
                    const aturan = peta[kol.nama] ?? {}
                    const yakin = keyakinan(aturan.komponenId ? kol.skor : 0)
                    const terpilih = aturan.komponenId ? getKomponenById(aturan.komponenId) : null
                    return (
                      <tr key={kol.nama} className="border-b border-line last:border-0">
                        <td className="px-3 py-2.5">
                          <span className="block text-[13px] font-bold text-ink">{kol.nama}</span>
                          <span className="block text-[11.5px] text-ink-3">
                            {kol.terisi} terisi · {kol.kosong} kosong
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px] text-ink-2">
                          {kol.contoh.slice(0, 3).join(' · ') || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={String(aturan.skala ?? kol.skala)}
                            onChange={(e) =>
                              setPeta((p) => ({ ...p, [kol.nama]: { ...p[kol.nama], skala: Number(e.target.value) } }))
                            }
                            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[12.5px] font-semibold text-ink"
                          >
                            {SKALA_PILIHAN.map((s) => (
                              <option key={s.nilai} value={s.nilai}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          {kol.skalaMaks != null ? (
                            <span className="mt-1 block text-[11px] text-ink-3">tertinggi {kol.skalaMaks}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={terpilih ? labelKomponen(terpilih) : ABAIKAN}
                            onChange={(e) => {
                              const k = komponenSumber.find((x) => labelKomponen(x) === e.target.value)
                              setPeta((p) => ({ ...p, [kol.nama]: { ...p[kol.nama], komponenId: k?.id ?? null } }))
                            }}
                            className={
                              'w-full max-w-[320px] rounded-lg border bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-ink ' +
                              (terpilih ? 'border-line' : 'border-dashed border-line-strong text-ink-3')
                            }
                          >
                            <option>{ABAIKAN}</option>
                            {komponenSumber.map((k) => (
                              <option key={k.id} value={labelKomponen(k)}>
                                {labelKomponen(k)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          {terpilih ? (
                            <>
                              <Badge
                                tone={
                                  yakin.level === 'tinggi' ? 'good' : yakin.level === 'sedang' ? 'warning' : 'critical'
                                }
                              >
                                {yakin.label}
                              </Badge>
                              {kol.alasan.length ? (
                                <span className="mt-1 block text-[11px] text-ink-3">{kol.alasan.join(' · ')}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-[12px] text-ink-3">tidak dipakai</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------- pratinjau hasil hitung ------------------- */}
          {hasilMentah ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="good" icon={IconCheck}>
                  {tr('{n} nilai akan diisi', { n: hasilMentah.entri.length })}
                </Badge>
                <Badge tone={hasilMentah.ditolak.length ? 'critical' : 'neutral'} icon={IconX}>
                  {tr('{n} baris ditolak', { n: hasilMentah.ditolak.length })}
                </Badge>
                {hasilMentah.perKomponen.map((p) => (
                  <span key={p.komponen.id} className="text-[12px] text-ink-2">
                    <span className="font-mono font-bold text-ink">{p.komponen.id}</span> {p.jumlah}
                  </span>
                ))}
              </div>

              {hasilMentah.entri.length ? (
                <div className="overflow-hidden rounded-xl border border-line">
                  <p className="border-b border-line bg-surface-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {tr('Pratinjau hasil perhitungan')}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse">
                      <thead>
                        <tr className="border-b border-line">
                          {['Mahasiswa', 'Komponen', 'Asal kolom', 'Konversi', 'Nilai'].map((h, i) => (
                            <th
                              key={h}
                              className={
                                'px-3 py-2 text-[11px] font-bold uppercase tracking-[.07em] text-ink-3 ' +
                                (i === 4 ? 'text-right' : 'text-left')
                              }
                            >
                              {tr(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hasilMentah.entri.slice(0, 10).map((e, i) => (
                          <tr key={i} className="border-b border-line last:border-0">
                            <td className="px-3 py-2 text-[13px] font-semibold text-ink">{e.nama}</td>
                            <td className="px-3 py-2 font-mono text-[12px] text-ink-2">{e.komponenId}</td>
                            <td className="px-3 py-2 text-[12px] text-ink-3">
                              {e.dari.map((d) => d.kolom).join(' + ')}
                            </td>
                            <td className="px-3 py-2 font-mono text-[12px] text-ink-3">
                              {e.dari.map((d) => d.mentah + '/' + d.skala).join(' · ')} →
                            </td>
                            <td className="px-3 py-2 text-right text-[13.5px] font-bold tabular-nums text-ink">
                              {e.nilai}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hasilMentah.entri.length > 10 ? (
                    <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">
                      dan {hasilMentah.entri.length - 10} nilai lain
                    </p>
                  ) : null}
                </div>
              ) : null}

              {hasilMentah.ditolak.length ? (
                <div className="overflow-hidden rounded-xl border border-line">
                  <p className="border-b border-line bg-surface-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {tr('Baris ditolak')}
                  </p>
                  <ul className="divide-y divide-line">
                    {hasilMentah.ditolak.slice(0, 8).map((r, i) => (
                      <li key={i} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                        <span className="w-16 shrink-0 text-[12px] font-bold tabular-nums text-ink-3">
                          {tr('baris {n}', { n: r.nomor })}
                        </span>
                        <span className="min-w-[140px] font-mono text-[12px] text-ink-2">{r.nim || '-'}</span>
                        <span className="flex-1 text-[12.5px] font-semibold text-[var(--critical)]">
                          {r.alasan.join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {/* ------------------------- format baku (lama) ----------------------- */}
      {adaAnalisa && analisa.format === 'baku' && hasilBaku ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="neutral">{tr('Format baku terdeteksi')}</Badge>
            <Badge tone="good" icon={IconCheck}>
              {hasilBaku.diterima.length} baris siap diproses
            </Badge>
            <Badge tone={hasilBaku.ditolak.length ? 'critical' : 'neutral'} icon={IconX}>
              {hasilBaku.ditolak.length} ditolak
            </Badge>
          </div>
          {hasilBaku.ditolak.length ? (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {hasilBaku.ditolak.slice(0, 10).map((r) => (
                <li key={r.nomor} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                  <span className="w-16 shrink-0 text-[12px] font-bold tabular-nums text-ink-3">baris {r.nomor}</span>
                  <span className="min-w-[150px] font-mono text-[12px] text-ink-2">
                    {r.nim || '—'} · {r.komponenId || '—'}
                  </span>
                  <span className="flex-1 text-[12.5px] font-semibold text-[var(--critical)]">
                    {r.alasan.join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {adaAnalisa ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={!entriSiap.length || sibuk} onClick={proses}>
            <IconUpload size={17} />
            {tr('Isi otomatis {n} nilai', { n: entriSiap.length })}
          </button>
          <span className="text-[12.5px] text-ink-2">
            {analisa.format === 'mentah' ? hasilMentah?.ringkas : null}
          </span>
        </div>
      ) : null}

      <CatatanKaki>
        {tr('Konversi skala dan penggabungan kolom hanya mengubah cara nilai dibaca dari berkas; perhitungan aspek, cluster, dan nilai akhir tetap memakai bobot di Kurikulum CPMK. Baris ditolak bila NIM tak dikenal, komponen dari sumber atau semester lain, mahasiswa di luar angkatan sasaran, atau nilai melebihi skala yang dipilih.')}{' '}
        {tr(peringatanSesi())}
      </CatatanKaki>
    </div>
  )
}

function namaKolomMentah(k) {
  if (k.jenis === 'UTS') return 'UTS'
  if (k.jenis === 'UAS') return 'UAS'
  if (k.jenis === 'SIKAP') return 'Nilai Sikap'
  const angka = k.label.match(/\b(\d)\b/)
  if (k.jenis === 'TUGAS') return 'Tugas ' + (angka ? angka[1] : '1')
  if (k.sumber === 'PDP') return 'PDP Tugas ' + (angka ? angka[1] : '1')
  return 'Kehadiran Mentoring'
}

/* --------------------------- pengajuan koreksi ---------------------------- */

function Koreksi({ aktor }) {
  const t = useTeks()
  const [catatan, setCatatan] = useState({})
  const [galat, setGalat] = useState('')

  const putuskan = async (id, keputusan) => {
    try {
      const berhasil = await putuskanKoreksi(id, keputusan, {
        aktor,
        catatan: catatan[id]?.trim() || null,
      })
      if (!berhasil) {
        setGalat(t('Pengajuan tidak ditemukan. Mungkin sudah diputuskan di jendela lain.'))
        return
      }
      setGalat('')
    } catch (e) {
      setGalat(e.message)
    }
  }

  if (!PENGAJUAN_KOREKSI.length) {
    return <EmptyState title={t('Belum ada pengajuan koreksi dari mahasiswa.')} />
  }

  return (
    <ul className="divide-y divide-line">
      {galat ? (
        <li className="px-5 pt-4 sm:px-6">
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
          >
            <IconAlert size={16} className="mt-px shrink-0" />
            {galat}
          </p>
        </li>
      ) : null}
      {PENGAJUAN_KOREKSI.map((k) => (
        <li key={k.id} className="px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[240px] flex-1">
              <p className="text-[14px] font-bold text-ink">{k.komponenLabel}</p>
              <p className="mt-1 text-[12.5px] text-ink-2">
                {k.nama} · {k.nim} · {t('aspek {kode}', { kode: k.aspekId })} ·{' '}
                {t('diajukan {tanggal}', { tanggal: k.diajukan })}
              </p>
              <p className="mt-2 max-w-2xl rounded-lg bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
                “{k.alasan}”
                {k.nilaiDiharapkan != null ? (
                  <span className="mt-1 block text-[12.5px] font-semibold text-ink-3">
                    {t('Nilai yang diharapkan')}: {k.nilaiDiharapkan}
                  </span>
                ) : null}
              </p>
            </div>
            <Badge
              tone={k.status === 'disetujui' ? 'good' : k.status === 'ditolak' ? 'critical' : 'warning'}
              icon={k.status === 'disetujui' ? IconCheck : k.status === 'ditolak' ? IconX : IconAlert}
            >
              {t(
                k.status === 'menunggu'
                  ? 'Menunggu'
                  : k.status === 'disetujui'
                    ? 'Disetujui'
                    : 'Ditolak',
              )}
            </Badge>
          </div>

          {k.status === 'menunggu' ? (
            <div className="mt-3 flex flex-wrap items-end gap-2.5">
              <label className="min-w-[240px] flex-1">
                <span className="mb-1.5 block label">{t('Catatan keputusan')}</span>
                <input
                  className="field !py-2.5"
                  value={catatan[k.id] ?? ''}
                  onChange={(e) => setCatatan((c) => ({ ...c, [k.id]: e.target.value }))}
                  placeholder={t('Alasan menyetujui atau menolak…')}
                />
              </label>
              <button
                type="button"
                onClick={() => putuskan(k.id, 'ditolak')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2.5 text-[13px] font-bold text-ink-2 transition hover:border-[var(--critical)] hover:text-[var(--critical)]"
              >
                <IconX size={15} />
                {t('Tolak')}
              </button>
              <button type="button" className="btn-primary !py-2.5" onClick={() => putuskan(k.id, 'disetujui')}>
                <IconCheck size={15} />
                {t('Setujui')}
              </button>
            </div>
          ) : k.keputusan ? (
            <p className="mt-2 text-[12.5px] text-ink-3">
              {k.keputusan.oleh} · {k.keputusan.tanggal}
              {k.keputusan.catatan ? '. ' + k.keputusan.catatan : ''}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/* ----------------------------- riwayat batch ------------------------------ */

function RiwayatBatch() {
  const t = useTeks()
  const [galat, setGalat] = useState('')
  return (
    <Card>
      <CardHeader
        title={t('Riwayat batch')}
        subtitle={t('Batch yang Anda buat bisa dibatalkan; batch periode lalu hanya tercatat')}
        icon={IconUndo}
        action={
          /* Hanya mode lokal: di basis data batch dibatalkan satu per satu. */
          BATCH_SESI.length && modeLokal() ? (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    t('Hapus seluruh perubahan: batch nilai, penguncian aspek, dan usulan dosen? Tindakan ini tidak bisa dibatalkan.'),
                  )
                ) {
                  try {
                    bersihkanPerubahan()
                    setGalat('')
                  } catch (e) {
                    setGalat(e.message)
                  }
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-bold text-ink-2 transition hover:border-[var(--critical)] hover:text-[var(--critical)]"
            >
              <IconUndo size={14} />
              {t('Hapus semua perubahan')}
            </button>
          ) : null
        }
      />

      {galat ? (
        <p
          role="alert"
          className="mx-5 mt-4 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)] sm:mx-6"
        >
          <IconAlert size={16} className="mt-px shrink-0" />
          {galat}
        </p>
      ) : null}

      {BATCH_SESI.length ? (
        <ul className="divide-y divide-line">
          {BATCH_SESI.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
              <span className="font-mono text-[12.5px] font-bold text-ink">{b.id}</span>
              <span className="min-w-[200px] flex-1 text-[13px] text-ink-2">
                {SUMBER[b.sumber].label} · {t('Semester {n}', { n: b.semester })} ·{' '}
                {t('angkatan {id}', { id: b.angkatanId })} ·{' '}
                {t(b.cara === 'manual' ? 'input manual' : 'import CSV')} ·{' '}
                {t('{n} nilai', { n: b.jumlah })}
              </span>
              <span className="text-[12.5px] tabular-nums text-ink-3">{b.waktu}</span>
              {b.status === 'dibatalkan' ? (
                <Badge tone="neutral">{t('Dibatalkan')}</Badge>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!(await rollbackBatch(b.id))) {
                        setGalat(t('Batch ini sudah dibatalkan sebelumnya.'))
                        return
                      }
                      setGalat('')
                    } catch (e) {
                      setGalat(e.message)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-bold text-ink-2 transition hover:border-[var(--critical)] hover:text-[var(--critical)]"
                >
                  <IconUndo size={14} />
                  {t('Rollback')}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('Belum ada batch perubahan')}>
          {t('Setiap penyimpanan, baik lewat input manual maupun import, dicatat sebagai satu batch yang bisa dibatalkan sekaligus, dan bertahan setelah halaman dimuat ulang.')}
        </EmptyState>
      )}

      {BATCH_IMPORT.length ? (
        <div className="border-t border-line">
          <p className="px-5 pt-4 text-[12px] font-bold uppercase tracking-[.07em] text-ink-3 sm:px-6">
            {t('Batch periode sebelumnya')}
          </p>
          <ul className="divide-y divide-line">
            {BATCH_IMPORT.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6">
                <span className="font-mono text-[12.5px] text-ink-2">{b.id}</span>
                <span className="min-w-[200px] flex-1 text-[12.5px] text-ink-3">
                  {SUMBER[b.sumber].label} · {b.periode} · {t('{n} baris', { n: b.baris })} ·{' '}
                  {t('{n} ditolak', { n: b.ditolak })}
                </span>
                <span className="text-[12px] tabular-nums text-ink-3">{b.waktu}</span>
                <Badge tone="neutral">{t(b.status)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
