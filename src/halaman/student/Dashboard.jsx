import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PredikatTeks, ScoreBar, StatusTeks, Terkunci } from '../../components/Ui'
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDocument,
  IconLock,
} from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { SUMBER, getArea } from '../../lib/curriculum'
import { kelayakanSertifikat } from '../../lib/rules'
import { PERIODE_AKTIF, labelPeriode, transkripOf } from '../../lib/data'
import { useStudent } from './StudentLayout'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { jalurMulus, jendelaNilai } from '../../lib/kurva'
import { nilaiKumulatif } from '../../lib/scoring'
import { useTunjuk } from '../../lib/tunjuk'

/* Aturan tampilan dashboard: lihat README.md › Panel mahasiswa: satu fakta, satu tempat. */

const sapaan = () => {
  const jam = new Date().getHours()
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 18) return 'Selamat sore'
  return 'Selamat malam'
}

/* --------------------------------- ubin ----------------------------------- */

/* Sebaran aspek: titik pada jalur 0 sampai 100, bukan batang; lihat README.md › Grafik. */
function SebaranAspek({ t }) {
  const teks = useTeks()
  const dinilai = t.aspek.filter((a) => a.nilai != null)
  if (dinilai.length < 2) return null

  const angka = dinilai.map((a) => a.nilai)
  const rendah = Math.min(...angka)
  const tinggi = Math.max(...angka)
  const terkunci = t.aspek.filter((a) => a.terkunci).length

  return (
    <div>
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-2">{teks('Sebaran nilai aspek')}</span>
        <span className="shrink-0 text-[13px] font-bold tabular-nums text-ink">
          {rendah === tinggi ? rendah : rendah + '–' + tinggi}
        </span>
      </p>

      <div
        role="img"
        aria-label={teks('Sebaran nilai {n} aspek pada skala 0 sampai 100, terendah {rendah}, tertinggi {tinggi}', {
          n: dinilai.length,
          rendah,
          tinggi,
        })}
        className="relative mt-3 h-10 rounded-xl bg-[var(--grid)]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 w-px bg-ink-2"
          style={{ left: CONFIG.AMBANG_SERTIFIKAT + '%' }}
        />

        {dinilai.map((a) => (
          <span
            key={a.aspekId}
            title={a.aspek.kode + ' ' + a.aspek.nama + ' — ' + a.nilai}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-ink ring-2 ring-[var(--surface)]"
            style={{ left: a.nilai + '%' }}
          />
        ))}
      </div>

      <p className="mt-2 flex items-baseline justify-between gap-3 text-[11.5px] text-ink-3">
        <span className="tabular-nums">0</span>
        <span className="min-w-0 truncate text-center">
          {teks('{n} aspek dinilai', { n: dinilai.length })}
          {terkunci ? ' · ' + teks('{n} belum dibuka', { n: terkunci }) : ''}
          {' · '}
          {teks('rata-rata minimal {n}', { n: CONFIG.AMBANG_SERTIFIKAT })}
        </span>
        <span className="tabular-nums">100</span>
      </p>
    </div>
  )
}

/* ------------------------ tren nilai per semester ------------------------- */

const TINGGI_BAGAN = 116

function TrenSemester({ t }) {
  const teks = useTeks()
  const daftar = Object.values(t.semester)
  const dinilai = daftar.filter((s) => s.nilai != null)
  // Kumulatif = nilai akhir bila dihitung sampai semester itu.
  const kumulatif = Object.fromEntries(dinilai.map((s) => [s.semester, nilaiKumulatif(t, s.semester)]))

  const { bawah, atas, garis: garisBantu } = jendelaNilai([
    ...dinilai.map((s) => s.nilai),
    ...dinilai.map((s) => kumulatif[s.semester]),
  ])

  const n = daftar.length
  const px = (sem) => (n === 1 ? 50 : 4 + ((sem - 1) / (n - 1)) * 92)
  const py = (nilai) => ((atas - nilai) / (atas - bawah)) * 100

  const runtun = (ambil) => {
    const hasil = []
    for (const s of dinilai) {
      const k = { sem: s, x: px(s.semester), y: py(ambil(s)) }
      const terakhir = hasil[hasil.length - 1]
      if (terakhir && s.semester === terakhir[terakhir.length - 1].sem.semester + 1) terakhir.push(k)
      else hasil.push([k])
    }
    return hasil
  }
  const SERI = [
    { kunci: 'semester', label: 'Nilai semester', warna: 'var(--brand-ink)', tebal: 2.5, ambil: (s) => s.nilai },
    { kunci: 'kumulatif', label: 'Nilai kumulatif', warna: 'var(--text-muted)', tebal: 2, ambil: (s) => kumulatif[s.semester] },
  ]

  const mulai = dinilai[0]
  const kini = dinilai[dinilai.length - 1]
  const selisih = kini.nilai - mulai.nilai
  const ringkas =
    selisih === 0
      ? teks('Tetap sejak Semester {n}', { n: mulai.semester })
      : selisih > 0
        ? teks('Naik {d} sejak Semester {n}', { d: selisih, n: mulai.semester })
        : teks('Turun {d} sejak Semester {n}', { d: -selisih, n: mulai.semester })

  const ambang = CONFIG.AMBANG_SERTIFIKAT
  const ambangTampil = ambang > bawah && ambang < atas

  const kolom = dinilai.map((s) => {
    const i = daftar.indexOf(s)
    const kiri = i === 0 ? 0 : (px(daftar[i - 1].semester) + px(s.semester)) / 2
    const kanan = i === n - 1 ? 100 : (px(s.semester) + px(daftar[i + 1].semester)) / 2
    return { s, kiri, lebar: kanan - kiri }
  })

  const { aktif, titik: pegangan, tip: peganganTip } = useTunjuk()
  const pilih = aktif != null ? dinilai[aktif] : null

  const wadah = useRef(null)
  const bidang = useRef(null)
  const tipRef = useRef(null)
  const [posisi, setPosisi] = useState(null)

  useLayoutEffect(() => {
    if (!pilih) {
      setPosisi(null)
      return
    }
    const w = wadah.current.getBoundingClientRect()
    const b = bidang.current.getBoundingClientRect()
    const tip = tipRef.current.getBoundingClientRect()
    const tengah = b.left - w.left + (px(pilih.semester) / 100) * b.width
    const kiri = Math.min(Math.max(tengah - tip.width / 2, 0), Math.max(0, w.width - tip.width))
    setPosisi((lama) => ({ kiri, atas: b.top - w.top - tip.height - 8, geser: lama != null }))
  }, [pilih])

  return (
    <div ref={wadah} className="relative">
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-2">{teks('Nilai per semester')}</span>
        <span className="shrink-0 text-[12.5px] font-bold text-ink-2">{ringkas}</span>
      </p>
      <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
        {SERI.map((r) => (
          <span key={r.kunci} className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-3 rounded-full" style={{ background: r.warna }} />
            {teks(r.label)}
          </span>
        ))}
      </p>

      <div className="mt-3 flex gap-2">
        <div aria-hidden="true" className="relative w-[26px] shrink-0" style={{ height: TINGGI_BAGAN }}>
          {garisBantu.map((v) => (
            <span
              key={v}
              className="absolute right-0 -translate-y-1/2 text-[10.5px] font-semibold tabular-nums text-ink-2"
              style={{ top: py(v) + '%' }}
            >
              {v}
            </span>
          ))}
        </div>

        <div ref={bidang} className="relative min-w-0 flex-1" style={{ height: TINGGI_BAGAN }}>
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            {garisBantu.map((v) => (
              <line
                key={v}
                x1="0"
                x2="100"
                y1={py(v)}
                y2={py(v)}
                stroke={v === bawah ? 'var(--border-strong)' : 'var(--border)'}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {ambangTampil ? (
              <line
                x1="0"
                x2="100"
                y1={py(ambang)}
                y2={py(ambang)}
                stroke="var(--text-secondary)"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {pilih ? (
              <line
                x1={px(pilih.semester)}
                x2={px(pilih.semester)}
                y1="0"
                y2="100"
                stroke="var(--border-strong)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {[...SERI].reverse().map((r) =>
              runtun(r.ambil).map((deret) =>
                deret.length < 2 ? null : (
                  <path
                    key={r.kunci + deret[0].sem.semester}
                    d={jalurMulus(deret)}
                    fill="none"
                    stroke={r.warna}
                    strokeWidth={r.tebal}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    /* Tanpa ini preserveAspectRatio="none" ikut meregangkan tebal garis. */
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              ),
            )}
          </svg>

          {/* Titik ditulis sebagai HTML: lingkaran di viewBox yang diregangkan jadi lonjong. */}
          {[...SERI].reverse().map((r) =>
            dinilai.map((s) => {
              const terpilih = pilih === s
              return (
                <span
                  key={r.kunci + s.semester}
                  aria-hidden="true"
                  className={
                    'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height] duration-150 ' +
                    (terpilih ? 'h-3.5 w-3.5 border-[2.5px] bg-surface' : r.kunci === 'semester' ? 'h-2.5 w-2.5 ring-2 ring-surface' : 'h-2 w-2 ring-2 ring-surface')
                  }
                  style={{
                    left: px(s.semester) + '%',
                    top: py(r.ambil(s)) + '%',
                    background: terpilih ? undefined : r.warna,
                    borderColor: terpilih ? r.warna : undefined,
                  }}
                />
              )
            }),
          )}

          <div role="list" aria-label={teks('Nilai per semester')} className="absolute inset-0">
            {kolom.map(({ s, kiri, lebar }, i) => (
              <div
                key={s.semester}
                role="listitem"
                tabIndex={0}
                aria-label={
                  teks('Semester {n}', { n: s.semester }) +
                  ': ' +
                  SERI.map((r) => teks(r.label) + ' ' + r.ambil(s)).join(', ')
                }
                {...pegangan(i)}
                className="absolute inset-y-0 cursor-pointer focus-visible:outline-none"
                style={{ left: kiri + '%', width: lebar + '%' }}
              />
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="relative ml-[34px] mr-1 mt-1.5 h-4">
        {daftar.map((sem, i) => (
          <span
            key={sem.semester}
            className={
              'absolute inline-flex items-center gap-1 whitespace-nowrap text-[11px] ' +
              (pilih === sem ? 'font-bold text-ink ' : 'text-ink-2 ') +
              (i === 0 ? '' : i === daftar.length - 1 ? '-translate-x-full' : '-translate-x-1/2')
            }
            style={{ left: px(sem.semester) + '%' }}
          >
            {sem.nilai == null ? <IconLock size={11} className="shrink-0" /> : null}
            {teks('Semester {n}', { n: sem.semester })}
          </span>
        ))}
      </div>

      {pilih ? (
        <div
          ref={tipRef}
          aria-hidden="true"
          {...peganganTip}
          className="absolute z-20 w-max rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-pop animate-tip [@media(hover:none)]:pointer-events-none"
          style={{
            left: posisi?.kiri ?? 0,
            top: posisi?.atas ?? 0,
            visibility: posisi ? 'visible' : 'hidden',
            transition: posisi?.geser ? 'left .18s cubic-bezier(.22,.68,.35,1)' : 'none',
          }}
        >
          <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-1 text-[12.5px]">
            <span className="font-bold text-ink">{teks('Semester')}</span>
            <span className="text-ink-2">:</span>
            <span className="font-bold text-ink">{pilih.semester}</span>
            {SERI.map((r) => (
              <Fragment key={r.kunci}>
                <span className="inline-flex items-center gap-1.5 text-ink-2">
                  <span className="h-[3px] w-3 shrink-0 rounded-full" style={{ background: r.warna }} />
                  {teks(r.label)}
                </span>
                <span className="text-ink-2">:</span>
                <span className="font-bold tabular-nums text-ink">{r.ambil(pilih)}</span>
              </Fragment>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* Tren butuh minimal dua semester bernilai; selain itu tampil sebaran aspek; lihat README.md › Grafik. */
function GrafikRingkas({ t }) {
  const semesterDinilai = Object.values(t.semester).filter((s) => s.nilai != null).length
  const aspekDinilai = t.aspek.filter((a) => a.nilai != null).length

  if (semesterDinilai < 2 && aspekDinilai < 2) return null

  return (
    <div className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-6">
      {semesterDinilai >= 2 ? <TrenSemester t={t} /> : <SebaranAspek t={t} />}
    </div>
  )
}

function UbinRingkas({ judul, nilai, satuan, ke, children }) {
  const t = useTeks()
  const isi = (
    <>
      <p className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink-2">{t(judul)}</span>
        <span className="shrink-0 text-[26px] font-extrabold leading-none tracking-tight text-ink">
          {nilai}
          {satuan ? <span className="text-[15px] font-bold text-ink-3">{satuan}</span> : null}
        </span>
      </p>
      {children}
    </>
  )
  const kelas = 'kartu block px-5 py-4'
  return ke ? (
    <Link href={ke} className={kelas + ' transition hover:border-brand-ink'}>
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  )
}


/* ------------------------------ status aspek ------------------------------ */

function StatusAspek({ a }) {
  const t = useTeks()
  if (a.status === 'final') return <StatusTeks kuat>{t('Final')}</StatusTeks>
  if (a.status === 'terkunci') {
    return <StatusTeks>{t('Dibuka Semester {n}', { n: a.aspek.semester })}</StatusTeks>
  }
  return <StatusTeks>{t(a.status === 'menunggu' ? 'Belum dinilai' : 'Sementara')}</StatusTeks>
}

export const BATAS_BARIS_ASPEK = 5

const TAB = [
  { id: 'semua', label: 'Semua', cocok: () => true },
  { id: 'final', label: 'Final', cocok: (a) => a.status === 'final' },
  { id: 'berjalan', label: 'Berjalan', cocok: (a) => a.status === 'berjalan' || a.status === 'menunggu' },
  { id: 'terkunci', label: 'Terkunci', cocok: (a) => a.status === 'terkunci' },
]

function BarisAspek({ a, terbuka, onToggle }) {
  const t = useTeks()
  const area = getArea(a.aspek.area)
  const idRinci = 'rinci-' + a.aspekId

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        aria-controls={idRinci}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface-2 sm:px-6"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[13px] font-bold text-ink">
          {a.aspek.kode}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-ink">{a.aspek.nama}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: area?.warna }} />
            <span className="truncate">
              {area?.nama} · {t('Semester {n}', { n: a.aspek.semester })}
            </span>
          </span>
        </span>

        <span className="hidden shrink-0 sm:block">
          <StatusAspek a={a} />
        </span>

        <span className="w-10 shrink-0 text-right">
          {a.terkunci ? (
            <IconLock size={17} className="ml-auto text-ink-3" />
          ) : (
            <span className="text-[19px] font-extrabold text-ink">{a.nilai ?? '-'}</span>
          )}
        </span>

        <IconChevronDown
          size={18}
          className={'shrink-0 text-ink-3 transition-transform ' + (terbuka ? 'rotate-180' : '')}
        />
      </button>

      {terbuka ? (
        <div id={idRinci} className="px-5 pb-5 sm:px-6 sm:pl-[88px]">
          <div className="mb-3 sm:hidden">
            <StatusAspek a={a} />
          </div>

          {a.terkunci ? (
            <Terkunci semester={a.aspek.semester} />
          ) : (
            <>
              <ul className="space-y-2">
                {a.komponen.map((k) => (
                  <li key={k.id} className="flex items-center gap-3 text-[14px]">
                    <span className="min-w-0 flex-1 text-ink">
                      {k.label}
                      <span className="text-ink-3"> · {SUMBER[k.sumber]?.label ?? k.sumber}</span>
                    </span>
                    <span className="shrink-0 font-bold text-ink">
                      {k.terisi ? k.nilai : <span className="font-semibold text-ink-3">{t('belum masuk')}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {a.alasanSementara ? (
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{t(a.alasanSementara)}.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  )
}

function AspekSaya({ t }) {
  const teks = useTeks()
  const [tab, setTab] = useState('semua')
  const [bukaId, setBukaId] = useState(null)

  const aktif = TAB.find((x) => x.id === tab)
  const semua = t.aspek.filter(aktif.cocok)
  const daftar = semua.slice(0, BATAS_BARIS_ASPEK)
  const sisa = semua.length - daftar.length

  return (
    <section className="kartu overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <div>
          <h2 className="text-[17px] font-extrabold text-ink">{teks('Aspek penilaian')}</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-2">
            {teks('Ketuk salah satu untuk melihat komponen nilainya')}
          </p>
        </div>
      </div>

      {/* overflow-y-hidden wajib: overflow-x-auto ikut membuat sumbu y auto dan memunculkan batang gulir 1 px. */}
      <div
        role="tablist"
        aria-label={teks('Saring aspek')}
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-4 sm:px-5"
      >
        {TAB.map((x) => {
          const jumlah = t.aspek.filter(x.cocok).length
          const pilih = x.id === tab
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={pilih}
              onClick={() => {
                setTab(x.id)
                setBukaId(null)
              }}
              className={
                '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-bold transition ' +
                (pilih ? 'border-brand-ink text-brand-ink' : 'border-transparent text-ink-2 hover:text-ink')
              }
            >
              {teks(x.label)}
              <span className="ml-1.5 font-semibold text-ink-3">{jumlah}</span>
            </button>
          )
        })}
      </div>

      {daftar.length ? (
        <ul>
          {daftar.map((a) => (
            <BarisAspek
              key={a.aspekId}
              a={a}
              terbuka={bukaId === a.aspekId}
              onToggle={() => setBukaId((id) => (id === a.aspekId ? null : a.aspekId))}
            />
          ))}
        </ul>
      ) : (
        <p className="px-6 py-10 text-center text-[14px] text-ink-2">
          {teks('Belum ada aspek di kelompok ini.')}
        </p>
      )}

      <Link
        href="/mahasiswa/transkrip"
        className="flex items-center justify-center gap-1.5 border-t border-line px-5 py-3.5 text-[14px] font-bold text-brand-ink transition hover:bg-surface-2"
      >
        {teks(sisa > 0 ? 'Lihat Selengkapnya' : 'Lihat transkrip lengkap')}
        <IconChevronRight size={16} />
      </Link>
    </section>
  )
}

/* ------------------------------ capaian area ------------------------------ */

function CapaianArea({ t }) {
  const teks = useTeks()
  return (
    <section className="kartu px-5 py-5 sm:px-6">
      <h2 className="text-[17px] font-extrabold text-ink">{teks('Capaian per area')}</h2>
      <p className="mt-0.5 text-[13.5px] text-ink-2">
        {teks('Rata-rata aspek yang sudah dinilai di tiap area')}
      </p>

      <ul className="mt-5 space-y-5">
        {Object.values(t.area).map((x) => {
          const terkunci = x.nilai == null
          return (
            <li key={x.area.id}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[14.5px] font-bold text-ink">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.area.warna }} />
                  <span className="truncate">
                    {teks('Area {kode}', { kode: x.area.id })} · {x.area.nama}
                  </span>
                </span>
                {terkunci ? (
                  <IconLock size={16} className="shrink-0 text-ink-3" />
                ) : (
                  <span className="shrink-0 text-[17px] font-extrabold text-ink">{x.nilai}</span>
                )}
              </div>
              {terkunci ? (
                <Terkunci semester={Math.min(...x.aspek.map((a) => a.aspek.semester))} />
              ) : (
                <>
                  <ScoreBar value={x.nilai} color={x.area.warna} />
                  <p className="mt-1.5 text-[12.5px] text-ink-3">
                    {teks('{n} dari {total} aspek dinilai', { n: x.dinilai, total: x.total })}
                  </p>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* --------------------------- perjalanan semester -------------------------- */

function PerjalananSemester({ t }) {
  const teks = useTeks()
  const daftar = Object.values(t.semester)
  return (
    <section className="kartu px-5 py-5 sm:px-6">
      <h2 className="text-[17px] font-extrabold text-ink">{teks('Perjalanan semester')}</h2>

      <ol className="mt-4">
        {daftar.map((s, i) => {
          const keadaan = s.terkunci ? 'terkunci' : s.ditutup ? 'selesai' : 'berjalan'
          const terakhir = i === daftar.length - 1
          return (
            <li key={s.semester} className="relative flex gap-3.5 pb-5 last:pb-0">
              {!terakhir ? (
                <span
                  aria-hidden="true"
                  className={
                    'absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5 rounded-full ' +
                    (keadaan === 'selesai' ? 'bg-brand-ink' : 'bg-line')
                  }
                />
              ) : null}

              <span
                className={
                  'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ' +
                  (keadaan === 'selesai'
                    ? 'bg-brand-ink text-white'
                    : keadaan === 'berjalan'
                      ? 'border-2 border-brand-ink bg-surface text-brand-ink'
                      : 'bg-surface-2 text-ink-3')
                }
              >
                {keadaan === 'selesai' ? (
                  <IconCheck size={16} />
                ) : keadaan === 'terkunci' ? (
                  <IconLock size={14} />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-ink" />
                )}
              </span>

              <span className="min-w-0 flex-1 pt-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold text-ink">
                    {teks('Semester {n}', { n: s.semester })}
                  </span>
                  {keadaan !== 'terkunci' ? (
                    <span className="text-[15px] font-bold text-ink">{s.nilai ?? '-'}</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-2">
                  {keadaan === 'selesai'
                    ? teks('Selesai · {total} aspek', { total: s.total })
                    : keadaan === 'berjalan'
                      ? teks('Sedang berjalan · {n} dari {total} aspek dinilai', {
                          n: s.dinilai,
                          total: s.total,
                        })
                      : teks('Belum dibuka · {total} aspek', { total: s.total })}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      <Link
        href="/mahasiswa/peta"
        className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-ink hover:underline"
      >
        {teks('Buka Peta Perjalanan')}
        <IconChevronRight size={16} />
      </Link>
    </section>
  )
}

/* --------------------------------- halaman -------------------------------- */

export default function Dashboard() {
  useStore()
  const teks = useTeks()
  const student = useStudent()
  const t = transkripOf(student)
  const sertifikat = kelayakanSertifikat(student)
  const { akhir } = t

  const terkunci = t.aspek.filter((a) => a.terkunci).length
  const [rinciBuka, setRinciBuka] = useState(false)
  const persenDinilai = akhir.aspekTotal ? Math.round((akhir.aspekDinilai / akhir.aspekTotal) * 100) : 0

  return (
    <div className="space-y-6">
      {/* -------------------------------- sapaan ------------------------------- */}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">
            {teks(sapaan())}, {student.name.split(' ')[0]}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {teks('Semester {n} dari {total}', {
              n: student.semesterAktif,
              total: CONFIG.TOTAL_SEMESTER_PROGRAM,
            })}{' '}
            · {teks('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })}
          </p>
        </div>
        <Link href="/mahasiswa/transkrip" className="btn-primary rounded-2xl px-5 py-3">
          <IconDocument size={18} />
          {teks('Buka Transkrip')}
        </Link>
      </header>

      {/* --------------------------------- ubin -------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="kartu flex flex-col px-6 py-6 sm:px-7 sm:py-7">
          <p className="text-[14px] font-semibold text-ink-2">{teks('Nilai akhir')}</p>

          <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:shrink-0 sm:flex-col sm:items-start sm:gap-y-1">
              <p className="text-[56px] font-extrabold leading-[0.9] tracking-tight text-ink sm:text-[64px]">
                {akhir.nilai ?? '-'}
              </p>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {akhir.nilai != null ? <PredikatTeks nilai={akhir.nilai} /> : null}
                  <StatusTeks kuat={akhir.status === 'final'}>
                    {teks(akhir.status === 'final' ? 'Final' : 'Sementara')}
                  </StatusTeks>
                </div>
                <p className="mt-1.5 text-[13px] text-ink-2">
                  {teks('berdasarkan {n} dari {total} aspek', {
                    n: akhir.aspekDinilai,
                    total: akhir.aspekTotal,
                  })}
                </p>
              </div>
            </div>

            <GrafikRingkas t={t} />
          </div>

          <button
            type="button"
            onClick={() => setRinciBuka((v) => !v)}
            aria-expanded={rinciBuka}
            aria-controls="ubin-rinci"
            className="mt-auto flex w-full items-center gap-2 border-t border-line pt-3.5 text-left sm:hidden"
          >
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
              {teks('{n}/{total} dinilai, {final} final · sertifikat {keadaan}', {
                n: akhir.aspekDinilai,
                total: akhir.aspekTotal,
                final: akhir.aspekFinal,
                keadaan: teks(sertifikat.layak ? 'siap' : 'belum'),
              })}
            </span>
            <span className="shrink-0 text-[13.5px] font-bold text-brand-ink">
              {teks(rinciBuka ? 'Tutup' : 'Rincian')}
            </span>
            <IconChevronDown
              size={17}
              className={'shrink-0 text-brand-ink transition-transform ' + (rinciBuka ? 'rotate-180' : '')}
            />
          </button>
        </div>

        <div id="ubin-rinci" className={(rinciBuka ? 'grid' : 'hidden') + ' gap-4 sm:grid'}>
          <UbinRingkas
            judul="Aspek dinilai"
            nilai={akhir.aspekDinilai}
            satuan={' / ' + akhir.aspekTotal}
          >
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--grid)]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={akhir.aspekTotal}
              aria-valuenow={akhir.aspekDinilai}
              aria-label={teks('Aspek yang sudah dinilai')}
            >
              <div className="h-full rounded-full bg-brand-ink" style={{ width: persenDinilai + '%' }} />
            </div>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
              {terkunci
                ? teks('{n} aspek belum dibuka', { n: terkunci })
                : teks('Semua aspek sudah dibuka')}
            </p>
          </UbinRingkas>

          <UbinRingkas
            judul="Aspek final"
            nilai={akhir.aspekFinal}
            satuan={' / ' + akhir.aspekTotal}
          >
            <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
              {teks(
                akhir.aspekFinal
                  ? 'Sudah dikunci dan tidak akan berubah lagi'
                  : 'Belum ada aspek yang dikunci',
              )}
            </p>
          </UbinRingkas>

          <UbinRingkas
            judul="Sertifikat"
            ke="/mahasiswa/sertifikat"
            nilai={
              <span className="text-[16px] font-extrabold leading-tight text-ink">
                {teks(sertifikat.layak ? 'Siap diunduh' : 'Belum tersedia')}
              </span>
            }
          >
            <p className="mt-2 flex items-center gap-1 text-[12.5px] leading-snug text-ink-2">
              {sertifikat.layak
                ? teks('Buka untuk mengunduh')
                : teks('{n} syarat belum terpenuhi', { n: sertifikat.gagal.length })}
              <IconChevronRight size={14} className="shrink-0" />
            </p>
          </UbinRingkas>
        </div>
      </section>

      {/* ------------------------------- dua kolom ----------------------------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <AspekSaya t={t} />
        </div>
        <div className="space-y-6">
          <PerjalananSemester t={t} />
          <CapaianArea t={t} />
        </div>
      </div>
    </div>
  )
}
