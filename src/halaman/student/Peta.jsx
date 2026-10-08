import { useState } from 'react'
import Link from 'next/link'
import { StatusTeks, TandaDraft, Terkunci } from '../../components/Ui'
import { IconCheck, IconChevronDown, IconChevronRight, IconClock, IconLock } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { SUMBER, SUMBER_LIST, getCluster } from '../../lib/curriculum'
import { transkripOf } from '../../lib/data'
import { useStore } from '../../lib/store'
import { useStudent } from './StudentLayout'
import { useTeks } from '../../lib/bahasa'

const keadaanOf = (s) => (s.terkunci ? 'terkunci' : s.ditutup ? 'selesai' : 'berjalan')

const RINGKAS_KEADAAN = {
  selesai: 'Selesai',
  berjalan: 'Sedang berjalan',
  terkunci: 'Belum dibuka',
}

function StatusSingkat({ a }) {
  const t = useTeks()
  if (a.status === 'final') return <StatusTeks kuat>{t('Final')}</StatusTeks>
  if (a.status === 'terkunci') return <Terkunci semester={a.aspek.semester} />
  return <StatusTeks>{t(a.status === 'menunggu' ? 'Belum dinilai' : 'Sementara')}</StatusTeks>
}

function Jalur({ sumber, nama, kegiatan, terkunci }) {
  const t = useTeks()
  const dinilai = kegiatan.filter((x) => x.k.terisi).length

  return (
    <section className="rounded-2xl border border-line">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink">{nama}</p>
          <p className="text-[12.5px] text-ink-2">{sumber.nama}</p>
        </div>
        {kegiatan.length && !terkunci ? (
          <p className="text-[12.5px] font-semibold text-ink-2">
            {t('{n} dari {total} dinilai', { n: dinilai, total: kegiatan.length })}
          </p>
        ) : null}
      </header>

      {kegiatan.length ? (
        <ul className="divide-y divide-line">
          {kegiatan.map(({ k, aspek }) => (
            <li key={k.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 shrink-0">
                {terkunci ? (
                  <IconLock size={15} className="text-ink-3" />
                ) : k.terisi ? (
                  <IconCheck size={15} className="text-[var(--good)]" />
                ) : (
                  <IconClock size={15} className="text-ink-3" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
                {k.label}
                <span className="ml-1.5 inline-flex items-center gap-1 align-middle">
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-ink-2">
                    {aspek.kode}
                  </span>
                  {k.status === 'draft' ? <TandaDraft>{t('Draft')}</TandaDraft> : null}
                </span>
              </span>
              <span className="shrink-0 text-[14px]">
                {terkunci ? null : k.terisi ? (
                  <span className="font-extrabold text-ink">{k.nilai}</span>
                ) : (
                  <span className="font-semibold text-ink-3">{t('belum masuk')}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-[13.5px] text-ink-2">
          {t('Program ini dijalani, tetapi tidak menghasilkan komponen nilai.')}
        </p>
      )}
    </section>
  )
}

function Semester({ s, aspek, terbuka, onToggle, terakhir }) {
  const t = useTeks()
  const keadaan = keadaanOf(s)
  const terkunci = keadaan === 'terkunci'
  const idIsi = 'semester-' + s.semester

  const jalur = SUMBER_LIST.map((sumber) => {
    const kunciNama = sumber.id === 'PDP' ? 'pdp' : sumber.id === 'MK' ? 'mk' : 'engagement'
    const nama = [...new Set(aspek.map((a) => a.aspek[kunciNama]).filter(Boolean))].join(', ')
    const kegiatan = aspek.flatMap((a) =>
      a.komponen.filter((k) => k.sumber === sumber.id).map((k) => ({ k, aspek: a.aspek })),
    )
    return { sumber, nama: nama || sumber.label, kegiatan }
  })

  const semuaFinal = aspek.length > 0 && aspek.every((a) => a.status === 'final')
  const keterangan =
    keadaan === 'selesai'
      ? t('{total} aspek', { total: s.total }) + (semuaFinal ? ' · ' + t('semua final') : '')
      : keadaan === 'berjalan'
        ? t('{n} dari {total} aspek dinilai', { n: s.dinilai, total: s.total })
        : t('{total} aspek · dibuka pada Semester {semester}', {
            total: s.total,
            semester: s.semester,
          })

  return (
    <li className="relative pb-5 pl-12 last:pb-0 sm:pl-14">
      {!terakhir ? (
        <span
          aria-hidden="true"
          className={
            'absolute -bottom-5 left-[15px] top-[56px] w-0.5 rounded-full sm:left-[19px] ' +
            (keadaan === 'selesai' ? 'bg-brand-ink' : 'bg-line')
          }
        />
      ) : null}

      <span
        aria-hidden="true"
        className={
          'absolute left-0 top-5 grid h-8 w-8 place-items-center rounded-full sm:h-10 sm:w-10 ' +
          (keadaan === 'selesai'
            ? 'bg-brand-ink text-white'
            : keadaan === 'berjalan'
              ? 'border-2 border-brand-ink bg-surface text-brand-ink ring-4 ring-brand-soft'
              : 'border border-line bg-surface-2 text-ink-3')
        }
      >
        {keadaan === 'selesai' ? (
          <IconCheck size={17} />
        ) : keadaan === 'terkunci' ? (
          <IconLock size={15} />
        ) : (
          <span className="h-3 w-3 rounded-full bg-brand-ink" />
        )}
      </span>

      <div className={'kartu overflow-hidden ' + (keadaan === 'berjalan' ? 'border-brand-ink' : '')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={terbuka}
          aria-controls={idIsi}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-surface-2 sm:px-6"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-extrabold text-ink">
                {t('Semester {n}', { n: s.semester })}
              </span>
              {keadaan === 'berjalan' ? (
                <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11.5px] font-bold text-white">
                  {t('Anda di sini')}
                </span>
              ) : (
                <span className="text-[13px] font-semibold text-ink-2">
                  {t(RINGKAS_KEADAAN[keadaan])}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[13.5px] text-ink-2">{keterangan}</span>
          </span>

          {terkunci ? (
            <IconLock size={18} className="shrink-0 text-ink-3" />
          ) : (
            <span className="shrink-0 text-right">
              <span className="block text-[22px] font-extrabold leading-none text-ink">{s.nilai ?? '-'}</span>
              <span className="mt-1 block text-[11.5px] text-ink-3">{t('nilai semester')}</span>
            </span>
          )}

          <IconChevronDown
            size={19}
            className={'shrink-0 text-ink-3 transition-transform ' + (terbuka ? 'rotate-180' : '')}
          />
        </button>

        {terbuka ? (
          <div id={idIsi} className="space-y-5 border-t border-line px-5 py-5 sm:px-6">
            {terkunci ? (
              <p className="text-[14px] leading-relaxed text-ink-2">
                {t(
                  'Semester ini belum dibuka. Berikut kegiatan yang akan Anda jalani. Nilainya baru muncul setelah Semester {n} dimulai dan penilai mengunggahnya.',
                  { n: s.semester },
                )}
              </p>
            ) : null}

            <section>
              <h3 className="text-[14px] font-bold text-ink">{t('Aspek yang dibentuk')}</h3>
              <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {aspek.map((a) => (
                  <li key={a.aspekId} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-2.5">
                    <span className="shrink-0 text-[12.5px] font-bold text-ink">{a.aspek.kode}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{a.aspek.nama}</span>
                      <span className="block truncate text-[12px] text-ink-3">
                        {getCluster(a.aspek.cluster)?.nama}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {a.terkunci ? null : (
                        <span className="block text-[16px] font-extrabold leading-tight text-ink">
                          {a.nilai ?? '-'}
                        </span>
                      )}
                      <StatusSingkat a={a} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-[14px] font-bold text-ink">
                {t(
                  terkunci
                    ? 'Kegiatan yang akan dijalani'
                    : keadaan === 'selesai'
                      ? 'Kegiatan yang sudah dijalani'
                      : 'Kegiatan semester ini',
                )}
              </h3>
              <div className="mt-2.5 space-y-3">
                {jalur.map((j) => (
                  <Jalur key={j.sumber.id} {...j} terkunci={terkunci} />
                ))}
              </div>
            </section>

            {!terkunci ? (
              <Link
                href="/mahasiswa/transkrip"
                className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-ink hover:underline"
              >
                {t('Lihat rincian bobot di transkrip')}
                <IconChevronRight size={16} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export default function Peta() {
  useStore()
  const teks = useTeks()
  const student = useStudent()
  const t = transkripOf(student)
  const daftar = Object.values(t.semester)

  const berjalan = daftar.find((s) => keadaanOf(s) === 'berjalan')
  const semuaSelesai = daftar.every((s) => keadaanOf(s) === 'selesai')

  const [buka, setBuka] = useState(
    () => berjalan?.semester ?? (semuaSelesai ? daftar[daftar.length - 1]?.semester : daftar[0]?.semester),
  )

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">
          {teks('Peta Perjalanan')}
        </h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
          {berjalan
            ? teks('Anda sedang menjalani Semester {n} dari {total}.', {
                n: berjalan.semester,
                total: CONFIG.TOTAL_SEMESTER_PROGRAM,
              })
            : semuaSelesai
              ? teks('Seluruh {total} semester program sudah Anda selesaikan.', {
                  total: CONFIG.TOTAL_SEMESTER_PROGRAM,
                })
              : teks('Program Anda belum dimulai.')}{' '}
          {teks('Ketuk satu semester untuk melihat kegiatan dan nilainya.')}
        </p>
      </header>

      <ol className="max-w-4xl">
        {daftar.map((s, i) => (
          <Semester
            key={s.semester}
            s={s}
            aspek={t.aspek.filter((a) => a.aspek.semester === s.semester)}
            terbuka={buka === s.semester}
            onToggle={() => setBuka((b) => (b === s.semester ? null : s.semester))}
            terakhir={i === daftar.length - 1}
          />
        ))}
      </ol>

      <p className="max-w-4xl text-[13px] leading-relaxed text-ink-3">
        {teks('Tiap semester dijalani lewat tiga jalur: modul {pdp}, {mk}, dan program {eng}.', {
          pdp: SUMBER.PDP.nama,
          mk: SUMBER.MK.nama,
          eng: SUMBER.ENGAGEMENT.label,
        })}{' '}
        {teks('Kode kecil di samping tiap kegiatan menunjukkan aspek mana yang menerima nilainya.')}
      </p>
    </div>
  )
}
