import { Fragment, useState } from 'react'
import {
  Badge,
  Card,
  CardHeader,
  CatatanKaki,
  EmptyState,
  PredikatTeks,
  StatusTeks,
  TandaDraft,
  Terkunci,
} from '../../components/Ui'
import RadarCluster from '../../components/charts/RadarCluster'
import AspectBars from '../../components/charts/AspectBars'
import {
  IconChevronDown,
  IconDownload,
  IconLock,
  IconPencil,
  IconPrint,
} from '../../components/Icons'
import { CATATAN_BOBOT_SEMENTARA, CONFIG } from '../../lib/config'
import { SUMBER, getArea, getCluster, getIndikator, getKomponen } from '../../lib/curriculum'
import { labelNilaiAkhir, statusDokumenTranskrip } from '../../lib/rules'
import { PERIODE_AKTIF, labelPeriode, transkripOf } from '../../lib/data'
import { ajukanKoreksi, koreksiMilik, useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import LembarCetak from './LembarCetak'

const STATUS_LABEL = {
  terkunci: { teks: 'Terkunci' },
  menunggu: { teks: 'Menunggu nilai' },
  berjalan: { teks: 'Sementara' },
  final: { teks: 'Final' },
}

const nomorDokumen = (student) =>
  'TSK/' + student.angkatanId + '/' + student.nim.slice(-5) + '/' + new Date().getFullYear()

export default function Transkrip({ student }) {
  useStore()
  const teks = useTeks()
  const t = transkripOf(student)
  const dokumen = statusDokumenTranskrip(student)
  const label = labelNilaiAkhir(t.akhir)
  const [terbuka, setTerbuka] = useState(null)
  const [formKoreksi, setFormKoreksi] = useState(false)
  const milikSaya = koreksiMilik(student.nim)

  const clusterRows = Object.values(t.cluster)

  return (
    <>
      <LembarCetak student={student} transkrip={t} />
    <div className="space-y-6 print:hidden">
      {/* ------------------------------ kop dokumen ------------------------------ */}
      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[.14em] text-brand-ink">
              Universitas Multimedia Nusantara
            </p>
            <h1 className="mt-1.5 text-[24px] font-extrabold tracking-tight text-ink">
              {teks('Transkrip Capaian human skill')}
            </h1>
            <p className="mt-1 text-[13px] text-ink-2">
              {teks('Program pembinaan human skill terintegrasi, Semester 1 sampai {total}', {
                total: CONFIG.TOTAL_SEMESTER_PROGRAM,
              })}
            </p>
          </div>
          {dokumen.watermark ? (
            <StatusTeks kuat className="tracking-[.06em]">
              {dokumen.watermark}
            </StatusTeks>
          ) : (
            <StatusTeks kuat>{teks('Dokumen final')}</StatusTeks>
          )}
        </div>

        <dl className="grid gap-x-8 gap-y-3 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Nama', student.name],
            ['NIM', student.nim],
            ['Program studi', student.program],
            ['Fakultas', student.faculty],
            ['Angkatan', student.angkatanLabel],
            [
              'Semester berjalan',
              teks('{n} dari {total}', {
                n: student.semesterAktif,
                total: CONFIG.TOTAL_SEMESTER_PROGRAM,
              }),
            ],
            ['Periode cetak', labelPeriode(PERIODE_AKTIF)],
            ['Nomor dokumen', nomorDokumen(student)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[12px] font-semibold text-ink-3">{teks(k)}</dt>
              <dd className="mt-0.5 text-[14px] font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {/* ---------------------------- ringkasan nilai --------------------------- */}
        <div className="flex flex-wrap items-center gap-6 border-t border-line bg-surface-2 px-6 py-5">
          <div>
            <p className="text-[52px] font-extrabold leading-none tabular-nums text-ink">
              {t.akhir.nilai ?? '-'}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-ink-3">{teks('Nilai akhir')}</p>
          </div>
          <div className="min-w-[220px] flex-1 print:min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PredikatTeks nilai={t.akhir.nilai} panjang />
              <StatusTeks kuat={t.akhir.status === 'final'}>{teks(label.teks)}</StatusTeks>
            </div>
            <p className="mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-ink-2">
              {teks(label.rinci, label.nilai)}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button type="button" className="btn-ghost" onClick={() => window.print()}>
              <IconPrint size={17} />
              {teks('Cetak / simpan PDF')}
            </button>
          </div>
        </div>
      </Card>

      {/* ------------------------------ tabel utama ------------------------------ */}
      <Card className="overflow-hidden">
        <CardHeader
          title={teks('Rincian capaian per semester')}
          subtitle={teks('Klik baris aspek untuk melihat komponen asesmen yang membentuk nilainya')}
          icon={IconDownload}
        />

        {/* Di kertas tidak ada yang bisa digulir: print:overflow-visible + print:min-w-0; lihat README.md › Cetak. */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[820px] border-collapse print:min-w-0 print:table-fixed">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {['Kode', 'Aspek CPMK', 'Cluster', 'Sumber penilaian', 'Nilai', 'Predikat', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    className={
                      'px-4 py-3 text-[11px] font-bold uppercase tracking-[.07em] text-ink-3 ' +
                      (i >= 4 ? 'text-right' : 'text-left')
                    }
                  >
                    {teks(h)}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>

            {Object.values(t.semester).map((sem) => (
              <tbody key={sem.semester}>
                <tr className="border-b border-line bg-brand-soft/40">
                  <th colSpan={6} className="px-4 py-2.5 text-left text-[12.5px] font-bold text-brand-ink">
                    {teks('Semester {n}', { n: sem.semester })}
                    <span className="ml-2 font-semibold text-ink-3">
                      ·{' '}
                      {sem.terkunci
                        ? teks('belum dibuka')
                        : teks('{n} dari {total} aspek dinilai', {
                            n: sem.dinilai,
                            total: sem.total,
                          })}
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-right text-[12.5px] font-bold tabular-nums text-brand-ink">
                    {sem.nilai ?? '-'}
                  </th>
                  <th />
                </tr>

                {sem.aspek.map((a) => {
                  const cluster = getCluster(a.aspek.cluster)
                  const area = getArea(a.aspek.area)
                  const sumberHadir = [...new Set(getKomponen(a.aspek.id).map((x) => x.sumber))]
                  const st = STATUS_LABEL[a.status]
                  const dibuka = terbuka === a.aspek.id

                  return (
                    <Fragment key={a.aspek.id}>
                      <tr
                        onClick={() => !a.terkunci && setTerbuka(dibuka ? null : a.aspek.id)}
                        className={
                          'border-b border-line transition ' +
                          (a.terkunci ? 'opacity-70' : 'cursor-pointer hover:bg-surface-2')
                        }
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                            <span
                              aria-hidden="true"
                              className="tanda-area h-2.5 w-2.5 rounded-[3px]"
                              style={{ background: area.warna }}
                            />
                            {a.aspek.kode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[14px] font-semibold text-ink">{a.aspek.nama}</span>
                          {a.adaDraft ? (
                            <TandaDraft className="ml-2 align-middle">
                              {teks('Skema belum final')}
                            </TandaDraft>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-ink-2">{cluster.id}</td>
                        <td className="px-4 py-3">
                          <span className="flex flex-wrap gap-1">
                            {sumberHadir.map((s) => (
                              <span
                                key={s}
                                className="sumber-pil rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-ink-2"
                              >
                                {SUMBER[s].label}
                              </span>
                            ))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.terkunci ? (
                            <IconLock size={15} className="ml-auto text-ink-3" />
                          ) : (
                            <span className="text-[15px] font-bold tabular-nums text-ink">
                              {a.nilai ?? '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.terkunci ? null : <PredikatTeks nilai={a.nilai} />}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.terkunci ? (
                            <Terkunci semester={a.aspek.semester} />
                          ) : (
                            <>
                              <StatusTeks kuat={a.status === 'final'}>
                                {teks(st.teks)}
                              </StatusTeks>
                              {a.alasanSementara ? (
                                <span className="ml-auto mt-1 block max-w-[210px] text-[11px] leading-snug text-ink-3 print:max-w-none">
                                  {teks(a.alasanSementara)}
                                </span>
                              ) : null}
                            </>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right print:hidden">
                          {a.terkunci ? null : (
                            <IconChevronDown
                              size={16}
                              className={'text-ink-3 transition ' + (dibuka ? 'rotate-180' : '')}
                            />
                          )}
                        </td>
                      </tr>

                      {dibuka ? <BarisRincian aspek={a} /> : null}
                    </Fragment>
                  )
                })}
              </tbody>
            ))}
          </table>
        </div>

        <div className="px-6 py-4">
          <CatatanKaki>
            {teks(
              'Aspek yang semesternya belum tiba ditandai gembok dan sengaja tidak diberi angka, bukan bernilai nol.',
            )}{' '}
            {teks(CATATAN_BOBOT_SEMENTARA)}
          </CatatanKaki>
        </div>
      </Card>

      {/* -------------------------------- grafik -------------------------------- */}
      <div className="grid gap-6 xl:grid-cols-2 print:hidden">
        <RadarCluster data={clusterRows} seriesName={student.name.split(' ')[0]} />
        <AspectBars rows={t.aspek} />
      </div>

      {/* --------------------------------- aksi --------------------------------- */}
      <Card className="card-pad print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">
              {teks('Ada nilai yang menurutmu keliru?')}
            </h2>
            <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-2">
              {teks(
                'Kamu tidak bisa mengubah nilai sendiri. Ajukan koreksi dan Biro Kemahasiswaan akan menelusurinya bersama dosen atau unit yang memberi nilai.',
              )}
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={() => setFormKoreksi((v) => !v)}>
            <IconPencil size={17} />
            {teks(formKoreksi ? 'Tutup formulir' : 'Ajukan koreksi nilai')}
          </button>
        </div>

        {formKoreksi ? <FormKoreksi student={student} transkrip={t} onSelesai={() => setFormKoreksi(false)} /> : null}

        {milikSaya.length ? (
          <ul className="mt-5 space-y-2 border-t border-line pt-4">
            <li className="text-[12px] font-semibold text-ink-3">{teks('Pengajuan kamu')}</li>
            {milikSaya.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-2.5 text-[13px]">
                <Badge tone={k.status === 'disetujui' ? 'good' : k.status === 'ditolak' ? 'critical' : 'warning'}>
                  {teks(
                    k.status === 'menunggu'
                      ? 'Menunggu'
                      : k.status === 'disetujui'
                        ? 'Disetujui'
                        : 'Ditolak',
                  )}
                </Badge>
                <span className="text-ink">{k.komponenLabel}</span>
                <span className="text-ink-3">{teks('diajukan {tanggal}', { tanggal: k.diajukan })}</span>
                {k.keputusan?.catatan ? (
                  <span className="w-full text-[12.5px] text-ink-2">{k.keputusan.catatan}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {dokumen.catatan ? <CatatanKaki>{teks(dokumen.catatan)}</CatatanKaki> : null}
      </Card>
    </div>
    </>
  )
}

/* --------------------- drill-down komponen & indikator --------------------- */

function BarisRincian({ aspek }) {
  const t = useTeks()
  const indikator = getIndikator(aspek.aspek.id)

  return (
    <tr className="border-b border-line bg-surface-2">
      <td colSpan={8} className="px-4 py-5 sm:px-6">
        <p className="mb-3 max-w-3xl text-[13px] leading-relaxed text-ink-2">{t(aspek.aspek.deskripsi)}</p>

        <p className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
          <span className="font-bold text-ink">{t('Status')}:</span>
          {aspek.status === 'final' ? (
            <span>
              {aspek.penguncian?.oleh
                ? t('Final, dikunci oleh {oleh} pada {tanggal}.', {
                    oleh: aspek.penguncian.oleh,
                    tanggal: aspek.penguncian.tanggal,
                  })
                : t('Final, seluruh komponen asesmen sudah dinilai.')}{' '}
              {t('Nilai aspek ini tidak berubah lagi.')}
            </span>
          ) : (
            <span>
              {t('Sementara')}, {t(aspek.alasanSementara)}
            </span>
          )}
        </p>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface print:overflow-visible">
          <table className="w-full min-w-[680px] border-collapse print:min-w-0 print:table-fixed">
            <thead>
              <tr className="border-b border-line">
                {['Sumber', 'Komponen asesmen', 'Ranah', 'Bobot', 'Nilai', 'Penilai', 'Tanggal masuk'].map((h, i) => (
                  <th
                    key={h}
                    className={
                      'px-3 py-2 text-[11px] font-bold uppercase tracking-[.06em] text-ink-3 ' +
                      (i === 3 || i === 4 ? 'text-right' : 'text-left')
                    }
                  >
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aspek.komponen.map((x) => (
                <tr key={x.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2.5 text-[12.5px] font-semibold text-ink-2">{SUMBER[x.sumber].label}</td>
                  <td className="px-3 py-2.5 text-[13px] text-ink">
                    {x.label}
                    {x.status === 'draft' ? (
                      <TandaDraft className="ml-2">{t('Draft')}</TandaDraft>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink-2">
                    {t(x.ranah === 'kognitif' ? 'Kognitif' : 'Afektif')}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums text-ink-2">
                    {x.bobotEfektif.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {x.terisi ? (
                      <span className="text-[13.5px] font-bold tabular-nums text-ink">{x.nilai}</span>
                    ) : (
                      <StatusTeks>{t('belum masuk')}</StatusTeks>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink-2">{x.penilai ?? '-'}</td>
                  <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-ink-3">{x.tanggal ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 className="mt-5 mb-2 text-[12px] font-bold uppercase tracking-[.07em] text-ink-3">
          {t('Indikator perilaku')}
        </h4>
        {indikator.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {indikator.map((i) => (
              <li key={i.id} className="rounded-xl border border-line bg-surface px-3.5 py-3">
                <p className="text-[13px] font-bold text-ink">{i.label}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{i.sumber.join(' · ')}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-line bg-surface">
            <EmptyState title={t('Rincian indikator belum ditetapkan untuk mata kuliah ini.')}>
              {t(
                'Pemetaan indikator perilaku baru tersedia untuk mata kuliah semester 1. Untuk semester berikutnya, rinciannya menyusul setelah skema asesmen diresmikan.',
              )}
            </EmptyState>
          </div>
        )}
      </td>
    </tr>
  )
}


/* ------------------------- formulir pengajuan koreksi --------------------- */

function FormKoreksi({ student, transkrip, onSelesai }) {
  const t = useTeks()
  const terbuka = transkrip.aspek.filter((a) => !a.terkunci)
  const pilihan = terbuka.flatMap((a) =>
    a.komponen.map((k) => ({ id: k.id, label: a.aspek.kode + ' ' + k.label, terisi: k.terisi, nilai: k.nilai })),
  )

  const [komponenId, setKomponenId] = useState(pilihan[0]?.id ?? '')
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState('')

  async function kirim(e) {
    e.preventDefault()
    try {
      await ajukanKoreksi({ student, komponenId, alasan })
      onSelesai()
    } catch (err) {
      setGalat(err.message)
    }
  }

  if (!pilihan.length) {
    return (
      <p className="mt-4 border-t border-line pt-4 text-[13.5px] text-ink-2">
        {t('Belum ada komponen asesmen yang bisa dikoreksi karena semesternya belum dibuka.')}
      </p>
    )
  }

  return (
    <form onSubmit={kirim} className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          {t('Komponen yang dipersoalkan')}
        </span>
        <select className="field" value={komponenId} onChange={(e) => setKomponenId(e.target.value)}>
          {pilihan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}{' '}
              {k.terisi ? t('(nilai {n})', { n: k.nilai }) : t('(belum dinilai)')}
            </option>
          ))}
        </select>
      </label>

      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">{t('Alasan')}</span>
        <textarea
          className="field"
          rows={3}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder={t('Jelaskan apa yang menurutmu keliru, dan bukti apa yang kamu punya.')}
          required
        />
      </label>

      {galat ? <p className="text-[13px] font-semibold text-[var(--critical)] sm:col-span-2">{galat}</p> : null}

      <div className="flex flex-wrap gap-2.5 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={!alasan.trim()}>
          {t('Kirim pengajuan')}
        </button>
        <button type="button" className="btn-ghost" onClick={onSelesai}>
          {t('Batal')}
        </button>
      </div>
    </form>
  )
}
