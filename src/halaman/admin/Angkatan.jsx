import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Badge, Card, CardHeader, CatatanKaki, EmptyState, StatusTeks, Tabs } from '../../components/Ui'
import { IconAlert, IconLock, IconPencil, IconPrint } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { SUMBER } from '../../lib/curriculum'
import { COHORTS, STUDENTS, labelPeriode, pekerjaanPenilaian, semesterKalender, transkripOf } from '../../lib/data'
import { pratinjauPenguncian } from '../../lib/rules'
import { kunciAngkatan, useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { tautanInput } from './LoncengKemahasiswaan'

const PAGE_SIZE = 12

// Dihitung dari data yang sudah dimuat, dengan aturan yang sama dengan server; lihat README.md › Halaman Angkatan.
function periksaAngkatan(c) {
  const mhs = STUDENTS.filter((s) => s.angkatanId === c.id)
  const kalender = semesterKalender(c.intake)
  const selesai = kalender > CONFIG.TOTAL_SEMESTER_PROGRAM
  let terisi = 0
  let total = 0
  const perlu = []

  for (const s of mhs) {
    const t = transkripOf(s)
    const kosong = []
    for (const a of t.aspek) {
      if (a.terkunci) continue
      terisi += a.komponenTerisi
      total += a.komponenTotal
      for (const k of a.komponenKosong) kosong.push({ aspek: a.aspek, komponen: k })
    }
    const nilai = t.akhir.nilai
    const rendah = s.semesterAktif >= CONFIG.TOTAL_SEMESTER_PROGRAM && nilai != null && nilai < CONFIG.AMBANG_SERTIFIKAT
    const sementara = selesai && !kosong.length ? t.aspek.filter((a) => !a.terkunci && a.status !== 'final') : []
    if (kosong.length || rendah || sementara.length) perlu.push({ s, kosong, nilai, rendah, sementara })
  }

  const kunci =
    c.status === 'terkunci'
      ? 'terkunci'
      : !selesai
        ? 'belum'
        : !mhs.length
          ? 'kosong'
          : 'boleh'

  return {
    c,
    mhs,
    kalender,
    selesai,
    persen: !total ? null : terisi === total ? 100 : Math.min(99, Math.floor((terisi / total) * 100)),
    perlu,
    kunci,
  }
}

export default function Angkatan() {
  const t = useTeks()
  const versi = useStore()
  const params = useSearchParams()
  const daftar = useMemo(() => COHORTS.map(periksaAngkatan), [versi])
  const [pilih, setPilih] = useState(() => params.get('angkatan'))
  const pilihan = daftar.find((x) => x.c.id === pilih) ?? daftar[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{t('Angkatan')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t('Pantau kelengkapan nilai tiap angkatan, temukan mahasiswa yang perlu ditindaklanjuti, lalu kunci angkatan yang programnya sudah selesai.')}
        </p>
      </div>

      {!daftar.length ? (
        <Card>
          <EmptyState title={t('Belum ada data angkatan')}>
            {t('Angkatan yang ditambahkan di basis data akan tampil di sini.')}
          </EmptyState>
        </Card>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {daftar.map((x) => (
              <li key={x.c.id}>
                <KartuAngkatan x={x} aktif={x === pilihan} onPilih={() => setPilih(x.c.id)} />
              </li>
            ))}
          </ul>

          <RincianAngkatan x={pilihan} />
        </>
      )}
    </div>
  )
}

/* ------------------------------ kartu angkatan ---------------------------- */

function KartuAngkatan({ x, aktif, onPilih }) {
  const t = useTeks()
  const { c, mhs, kalender, selesai, persen, perlu } = x
  const terkunci = c.status === 'terkunci'

  return (
    <button
      type="button"
      onClick={onPilih}
      aria-pressed={aktif}
      className={
        'card block h-full w-full p-4 text-left transition hover:border-brand-ink ' +
        (aktif ? 'border-brand-ink bg-brand-soft' : '')
      }
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[17px] font-extrabold tracking-tight text-ink">{c.label}</span>
        <StatusTeks kuat={terkunci}>{t(terkunci ? 'Terkunci' : 'Aktif')}</StatusTeks>
      </span>
      <span className="mt-0.5 block text-[12.5px] text-ink-2">
        {t('Masuk {periode}', { periode: labelPeriode(c.intake) })}
      </span>
      <span className="mt-1 block text-[13px] font-semibold text-ink">
        {selesai
          ? t('Program selesai')
          : t('Semester {n} dari {total}', { n: kalender, total: CONFIG.TOTAL_SEMESTER_PROGRAM })}
      </span>
      <span className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Angka label={t('Mahasiswa')} nilai={mhs.length.toLocaleString('id-ID')} />
        <Angka label={t('Nilai terisi')} nilai={persen == null ? '-' : persen + '%'} />
        <Angka label={t('Perlu tindak lanjut')} nilai={perlu.length.toLocaleString('id-ID')} />
      </span>
    </button>
  )
}

function Angka({ label, nilai }) {
  return (
    <span className="block min-w-0">
      <span className="block text-[11.5px] leading-tight text-ink-2">{label}</span>
      <span className="mt-0.5 block text-[16px] font-bold tabular-nums text-ink">{nilai}</span>
    </span>
  )
}

/* ----------------------------- rincian angkatan --------------------------- */

function RincianAngkatan({ x }) {
  const t = useTeks()
  const { c, mhs } = x
  const pekerjaan = useMemo(() => pekerjaanPenilaian(mhs), [mhs])

  return (
    <section aria-labelledby="judul-rincian-angkatan" className="space-y-5">
      <div>
        <h2 id="judul-rincian-angkatan" className="text-[18px] font-extrabold tracking-tight text-ink">
          {t('Angkatan {label}', { label: c.label })}
        </h2>
        <p className="mt-1 text-[13px] text-ink-2">
          {c.periode.map((p, i) => t('Semester {n}', { n: i + 1 }) + ': ' + labelPeriode(p)).join(' · ')}
        </p>
      </div>

      <Card>
        <CardHeader
          title={t('Nilai yang belum masuk')}
          subtitle={t('Per semester dan unit penilai, hanya semester yang sudah dibuka')}
        />
        {pekerjaan.length ? (
          <ul className="divide-y divide-line">
            {pekerjaan.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
                <span className="min-w-[200px] flex-1">
                  <span className="block text-[14px] font-bold text-ink">
                    {t('Semester {n}', { n: p.semester })} · {SUMBER[p.sumber]?.label ?? p.sumber}
                  </span>
                  <span className="block text-[12.5px] text-ink-2">
                    {t('{n} nilai kosong pada {m} mahasiswa', { n: p.kosong, m: p.mahasiswa })} ·{' '}
                    {p.aspek.map((a) => a.kode).join(' ')}
                  </span>
                </span>
                <Link
                  href={tautanInput({
                    semester: p.semester,
                    sumber: p.sumber,
                    angkatanId: c.id,
                    aspekId: p.aspek[0]?.id,
                    nim: p.nimTunggal,
                  })}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-bold text-brand-ink hover:underline sm:min-h-0"
                >
                  <IconPencil size={15} />
                  {t('Masukkan nilai')}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t(mhs.length ? 'Semua nilai sudah masuk' : 'Angkatan ini belum punya mahasiswa')}>
            {mhs.length ? t('Tidak ada komponen kosong pada semester yang sudah dibuka.') : null}
          </EmptyState>
        )}
      </Card>

      <DaftarPerlu key={'perlu-' + c.id} x={x} />
      <PanelKunci key={'kunci-' + c.id} x={x} />
    </section>
  )
}

/* -------------------- mahasiswa yang perlu ditindaklanjuti ----------------- */

function DaftarPerlu({ x }) {
  const t = useTeks()
  const { c, mhs, perlu } = x
  const [jenis, setJenis] = useState('semua')
  const [page, setPage] = useState(1)

  const hitung = {
    kosong: perlu.filter((p) => p.kosong.length).length,
    rendah: perlu.filter((p) => p.rendah).length,
    sementara: perlu.filter((p) => p.sementara.length).length,
  }
  const baris =
    jenis === 'kosong'
      ? perlu.filter((p) => p.kosong.length)
      : jenis === 'rendah'
        ? perlu.filter((p) => p.rendah)
        : jenis === 'sementara'
          ? perlu.filter((p) => p.sementara.length)
          : perlu
  const halaman = Math.max(1, Math.ceil(baris.length / PAGE_SIZE))
  const tampil = baris.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pilihJenis = (v) => {
    setJenis(v)
    setPage(1)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('Mahasiswa yang perlu ditindaklanjuti')}
        subtitle={t('{n} dari {total} mahasiswa', { n: perlu.length, total: mhs.length })}
      />

      {perlu.length ? (
        <>
          <div className="px-5 pt-4 sm:px-6">
            <Tabs
              value={jenis}
              onChange={pilihJenis}
              items={[
                { value: 'semua', label: t('Semua'), count: perlu.length },
                { value: 'kosong', label: t('Nilai belum lengkap'), count: hitung.kosong },
                { value: 'rendah', label: t('Di bawah rata-rata minimal'), count: hitung.rendah },
                { value: 'sementara', label: t('Masih sementara'), count: hitung.sementara },
              ]}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-y border-line bg-surface-2">
                  {['NIM', 'Nama', 'Yang perlu ditindaklanjuti'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                      {t(h)}
                    </th>
                  ))}
                  <th className="px-4 py-3">
                    <span className="sr-only">{t('Aksi')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((p) => {
                  const pertama = p.kosong[0]
                  return (
                    <tr key={p.s.id} className="border-b border-line align-top last:border-0">
                      <td className="px-4 py-3 text-[12.5px] tabular-nums text-ink-2">{p.s.nim}</td>
                      <td className="px-4 py-3">
                        <Link href={'/admin/mahasiswa/' + p.s.id} className="text-[14px] font-bold text-ink hover:text-brand-ink">
                          {p.s.name}
                        </Link>
                        <span className="block text-[12px] text-ink-3">{p.s.program}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1 text-[13px] leading-snug text-ink">
                          {pertama ? (
                            <li>
                              {t('{n} komponen belum dinilai', { n: p.kosong.length })}
                              <span className="text-ink-2">
                                {' '}
                                ({pertama.aspek.kode} · {SUMBER[pertama.komponen.sumber]?.label ?? pertama.komponen.sumber})
                              </span>
                            </li>
                          ) : null}
                          {p.rendah ? (
                            <li>
                              {t('Nilai akhir {nilai}, di bawah rata-rata minimal {n}', {
                                nilai: p.nilai,
                                n: CONFIG.AMBANG_SERTIFIKAT,
                              })}
                            </li>
                          ) : null}
                          {p.sementara.length ? (
                            <li>
                              {t('Aspek {daftar} masih sementara', {
                                daftar: p.sementara.map((a) => a.aspek.kode).join(', '),
                              })}
                            </li>
                          ) : null}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pertama ? (
                          <Link
                            href={tautanInput({
                              semester: pertama.aspek.semester,
                              sumber: pertama.komponen.sumber,
                              angkatanId: c.id,
                              prodi: p.s.program,
                              aspekId: pertama.aspek.id,
                              nim: p.s.nim,
                            })}
                            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-brand-ink hover:underline"
                          >
                            <IconPencil size={14} />
                            {t('Masukkan nilai')}
                          </Link>
                        ) : (
                          <Link
                            href={'/admin/mahasiswa/' + p.s.id}
                            className="inline-flex min-h-[40px] items-center whitespace-nowrap text-[13px] font-bold text-brand-ink hover:underline"
                          >
                            {t('Lihat transkrip')}
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {halaman > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
              <p className="text-[13px] text-ink-2">
                {t('Menampilkan')}{' '}
                <strong className="tabular-nums text-ink">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, baris.length)}
                </strong>{' '}
                {t('dari')} <strong className="tabular-nums text-ink">{baris.length}</strong>
              </p>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>
                  {t('Sebelumnya')}
                </button>
                <Badge tone="neutral">
                  {page} / {halaman}
                </Badge>
                <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" disabled={page === halaman} onClick={() => setPage((n) => n + 1)}>
                  {t('Berikutnya')}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState title={t('Tidak ada yang perlu ditindaklanjuti')}>
          {mhs.length
            ? t('Belum ada nilai yang kosong, di bawah rata-rata minimal, atau tertahan sementara di angkatan ini.')
            : t('Angkatan ini belum punya mahasiswa.')}
        </EmptyState>
      )}
    </Card>
  )
}

/* ---------------------------- penguncian angkatan ------------------------- */

function PanelKunci({ x }) {
  const t = useTeks()
  const { c, mhs, kalender, kunci } = x
  const [ketik, setKetik] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [baruDikunci, setBaruDikunci] = useState(false)
  const pratinjau = useMemo(() => (kunci === 'boleh' ? pratinjauPenguncian(mhs) : null), [kunci, mhs])
  const cocok = ketik.trim() === c.label

  async function kirimKunci(e) {
    e.preventDefault()
    if (!cocok || sibuk) return
    setGalat('')
    setSibuk(true)
    try {
      await kunciAngkatan({ angkatanId: c.id, konfirmasi: ketik.trim() })
      setBaruDikunci(true)
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title={t('Penguncian angkatan')}
        subtitle={t('Angkatan yang sudah dikunci memenuhi syarat sertifikat.')}
        icon={IconLock}
      />
      <div className="space-y-3 px-5 py-5 sm:px-6">
        {kunci === 'terkunci' ? (
          <>
            <p role={baruDikunci ? 'status' : undefined} className="text-[14.5px] font-bold text-ink">
              {t('Angkatan {label} sudah dikunci.', { label: c.label })}
            </p>
            <p className="text-[13px] leading-relaxed text-ink-2">
              {t('Nilainya masih bisa diubah atau dilengkapi Kemahasiswaan, asal disertai alasan yang tercatat.')}
            </p>
            <Link
              href={'/admin/sertifikat?angkatan=' + encodeURIComponent(c.label)}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-bold text-brand-ink hover:underline sm:min-h-0"
            >
              <IconPrint size={15} />
              {t('Cetak sertifikat angkatan ini')}
            </Link>
          </>
        ) : kunci === 'belum' ? (
          <>
            <p className="text-[14.5px] font-bold text-ink">{t('Belum bisa dikunci')}</p>
            <p className="text-[13px] leading-relaxed text-ink-2">
              {t('Angkatan ini baru di Semester {n} dari {total}. Penguncian bisa dilakukan setelah Semester {total} berakhir.', {
                n: kalender,
                total: CONFIG.TOTAL_SEMESTER_PROGRAM,
              })}
            </p>
          </>
        ) : kunci === 'kosong' ? (
          <p className="text-[14.5px] font-bold text-ink">{t('Angkatan ini belum punya mahasiswa')}</p>
        ) : (
          <>
            <p className="text-[14.5px] font-bold text-ink">
              {t('Bila dikunci sekarang, {b} dari {n} mahasiswa berhak atas sertifikat.', {
                b: pratinjau.berhak,
                n: pratinjau.total,
              })}
            </p>
            {pratinjau.tidakBerhak ? (
              <p className="text-[13px] leading-relaxed text-ink-2">
                {t('{n} belum berhak, {k} di antaranya karena nilainya belum lengkap. Nilai masih bisa dilengkapi sesudah dikunci, asal disertai alasan yang tercatat.', {
                  n: pratinjau.tidakBerhak,
                  k: pratinjau.komponenKosong,
                })}
              </p>
            ) : null}
            <form onSubmit={kirimKunci} className="flex flex-wrap items-end gap-3 pt-1">
              <label className="block min-w-[200px] flex-1 sm:max-w-xs">
                <span className="mb-1.5 block label">{t('Ketik {label} untuk mengonfirmasi', { label: c.label })}</span>
                <input
                  value={ketik}
                  onChange={(e) => setKetik(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="field"
                />
              </label>
              <button
                type="submit"
                disabled={!cocok || sibuk}
                className="btn-primary inline-flex min-h-[44px] items-center gap-2 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-2 disabled:shadow-none"
              >
                <IconLock size={16} />
                {t('Kunci angkatan')}
              </button>
            </form>
          </>
        )}

        {galat ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
          >
            <IconAlert size={16} className="mt-px shrink-0" />
            {galat}
          </p>
        ) : null}
      </div>
      {kunci === 'boleh' ? (
        <div className="px-5 pb-4 sm:px-6">
          <CatatanKaki>{t('Penguncian tidak bisa dibatalkan dari halaman ini.')}</CatatanKaki>
        </div>
      ) : null}
    </Card>
  )
}
