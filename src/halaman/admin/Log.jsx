import { Fragment, useEffect, useState } from 'react'
import { Badge, Card, EmptyState, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconChevronDown, IconInfo } from '../../components/Icons'
import { bacaLog } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

/* Jejak tindakan admin dan perubahan nilai dari /api/log (src/server/log.js), satu halaman per permintaan.
   Hanya dibaca; dipakai panel Kemahasiswaan dan panel Super Admin. Lihat README.md › Log Aktivitas. */

export const LABEL_LOG = {
  KUNCI_ANGKATAN: 'Kunci angkatan',
  UBAH_DATA_TERKUNCI: 'Ubah data terkunci',
  ROLLBACK_DATA_TERKUNCI: 'Batalkan perubahan data terkunci',
  UBAH_PENGUNCIAN: 'Ubah tanda final/sementara',
  UBAH_BOBOT: 'Ubah bobot',
  AJUKAN_PERSETUJUAN: 'Ajukan persetujuan',
  PUTUSKAN_PERSETUJUAN: 'Putuskan persetujuan',
  TARIK_PERMINTAAN: 'Tarik permintaan',
  UBAH_PENILAIAN: 'Ubah penilaian aspek',
}

const UKURAN = 25
const KOSONG = { aktorId: '', aksi: '', nim: '', dari: '', sampai: '' }

/** Tanggal TTTT-BB-HH menurut WIB, `mundur` hari sebelum hari ini; zona yang sama dengan log di server. */
export function tanggalWib(mundur = 0) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() - mundur * 86400000))
}

const kunciTerbaca = (k) => k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()

function Rincian({ rincian }) {
  const t = useTeks()
  if (!rincian || typeof rincian !== 'object' || !Object.keys(rincian).length) {
    return <p className="text-[13px] text-ink-3">{t('Tidak ada rincian tambahan.')}</p>
  }
  return (
    <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-[170px_minmax(0,1fr)]">
      {Object.entries(rincian).map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-[12.5px] font-semibold text-ink-3">{kunciTerbaca(k)}</dt>
          <dd className="min-w-0 break-words text-[13px] text-ink-2">
            {v == null || v === '' ? (
              '—'
            ) : typeof v === 'object' ? (
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2.5 font-mono text-[12px]">
                {JSON.stringify(v, null, 2)}
              </pre>
            ) : (
              String(v)
            )}
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}

function Tanggal({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block label">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:border-line-strong"
      />
    </label>
  )
}

export default function Log() {
  const t = useTeks()
  const [jenis, setJenis] = useState('aktivitas')
  const [saring, setSaring] = useState(KOSONG)
  const [nimKetik, setNimKetik] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [hasil, setHasil] = useState(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState(null)
  const [terbuka, setTerbuka] = useState(null)

  useEffect(() => {
    let batal = false
    setMemuat(true)
    setGalat(null)
    const isi = { jenis, halaman, ukuran: UKURAN }
    for (const k of ['aktorId', 'dari', 'sampai']) if (saring[k]) isi[k] = saring[k]
    if (jenis === 'aktivitas' && saring.aksi) isi.aksi = saring.aksi
    if (jenis === 'nilai' && saring.nim) isi.nim = saring.nim
    bacaLog(isi)
      .then((h) => !batal && setHasil(h))
      .catch((e) => !batal && setGalat(e.message))
      .finally(() => !batal && setMemuat(false))
    return () => {
      batal = true
    }
  }, [jenis, halaman, saring])

  const ubah = (patch) => {
    setSaring((s) => ({ ...s, ...patch }))
    setHalaman(1)
    setTerbuka(null)
  }

  const gantiJenis = (j) => {
    setJenis(j)
    setSaring((s) => ({ ...s, aktorId: '', aksi: '', nim: '' }))
    setNimKetik('')
    setHalaman(1)
    setTerbuka(null)
  }

  const adaSaring = Object.values(saring).some(Boolean)
  const baris = hasil?.baris ?? []
  const aktor = hasil?.pilihanAktor ?? []
  const namaAktor = new Map(aktor.map((a) => [String(a.id), a.nama]))
  const aksiPilihan = hasil?.pilihanAksi?.length ? hasil.pilihanAksi : Object.keys(LABEL_LOG)

  const hariIni = tanggalWib()
  const PRESET = [
    { label: 'Hari ini', dari: hariIni, sampai: hariIni },
    { label: '7 hari terakhir', dari: tanggalWib(6), sampai: hariIni },
    { label: 'Semua waktu', dari: '', sampai: '' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{t('Log Aktivitas')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t(
            'Jejak setiap tindakan untuk menelusuri siapa mengubah apa dan kapan. Log hanya bisa dibaca, tidak bisa diubah atau dihapus dari website.',
          )}
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-line px-5 py-4 sm:px-6">
          <Tabs
            value={jenis}
            onChange={gantiJenis}
            items={[
              { value: 'aktivitas', label: t('Tindakan admin') },
              { value: 'nilai', label: t('Perubahan nilai') },
            ]}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label={t('Pelaku')}
              value={saring.aktorId}
              onChange={(v) => ubah({ aktorId: v })}
              options={['', ...aktor.map((a) => String(a.id))]}
              tampilkan={(v) => (v ? (namaAktor.get(v) ?? v) : t('Semua pelaku'))}
            />
            {jenis === 'aktivitas' ? (
              <Select
                label={t('Jenis tindakan')}
                value={saring.aksi}
                onChange={(v) => ubah({ aksi: v })}
                options={['', ...aksiPilihan]}
                tampilkan={(v) => (v ? t(LABEL_LOG[v] ?? v) : t('Semua tindakan'))}
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  ubah({ nim: nimKetik.trim() })
                }}
              >
                <label className="block">
                  <span className="mb-1.5 block label">{t('NIM mahasiswa')}</span>
                  <input
                    type="search"
                    inputMode="numeric"
                    value={nimKetik}
                    onChange={(e) => setNimKetik(e.target.value)}
                    onBlur={() => nimKetik.trim() !== saring.nim && ubah({ nim: nimKetik.trim() })}
                    placeholder={t('Tekan Enter untuk mencari')}
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 transition hover:border-line-strong"
                  />
                </label>
              </form>
            )}
            <Tanggal label={t('Dari tanggal')} value={saring.dari} onChange={(v) => ubah({ dari: v })} />
            <Tanggal label={t('Sampai tanggal')} value={saring.sampai} onChange={(v) => ubah({ sampai: v })} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET.map((p) => {
              const aktif = saring.dari === p.dari && saring.sampai === p.sampai
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => ubah({ dari: p.dari, sampai: p.sampai })}
                  className={
                    'rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition ' +
                    (aktif ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:text-ink')
                  }
                >
                  {t(p.label)}
                </button>
              )
            })}
            {adaSaring ? (
              <button
                type="button"
                onClick={() => {
                  setNimKetik('')
                  ubah(KOSONG)
                }}
                className="ml-1 text-[12.5px] font-bold text-brand-ink underline underline-offset-4"
              >
                {t('Hapus semua penyaring')}
              </button>
            ) : null}
            <span className="ml-auto text-[12.5px] font-semibold tabular-nums text-ink-3" role="status">
              {memuat ? t('Memuat…') : t('{n} catatan', { n: hasil?.total ?? 0 })}
            </span>
          </div>
        </div>

        {hasil?.lokal && jenis === 'aktivitas' ? (
          <p className="flex items-start gap-2 border-b border-line px-5 py-3 text-[13px] text-ink-2 sm:px-6">
            <IconInfo size={15} className="mt-0.5 shrink-0" />
            {t('Tindakan admin hanya tercatat saat website terhubung ke basis data.')}
          </p>
        ) : null}

        {galat ? (
          <p role="alert" className="flex items-start gap-2 px-5 py-4 text-[13.5px] font-semibold text-[var(--critical)] sm:px-6">
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            {galat}
          </p>
        ) : !memuat && !baris.length ? (
          <EmptyState title={t('Tidak ada catatan')}>
            {adaSaring ? t('Coba longgarkan penyaringnya.') : t('Belum ada yang tercatat.')}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line text-[12px] font-bold uppercase tracking-[.06em] text-ink-3">
                  <th className="px-5 py-3 sm:px-6">{t('Waktu (WIB)')}</th>
                  <th className="px-3 py-3">{t('Pelaku')}</th>
                  {jenis === 'aktivitas' ? (
                    <>
                      <th className="px-3 py-3">{t('Tindakan')}</th>
                      <th className="px-3 py-3">{t('Sasaran')}</th>
                      <th className="px-5 py-3 sm:px-6">
                        <span className="sr-only">{t('Rincian')}</span>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3">{t('Mahasiswa')}</th>
                      <th className="px-3 py-3">{t('Komponen')}</th>
                      <th className="px-5 py-3 text-right sm:px-6">{t('Lama → baru')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className={memuat ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                {baris.map((b) =>
                  jenis === 'aktivitas' ? (
                    <Fragment key={b.id}>
                      <tr className="border-b border-line align-top">
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] tabular-nums text-ink-2 sm:px-6">{b.waktu}</td>
                        <td className="px-3 py-3 text-[13.5px] font-semibold text-ink">{b.aktor ?? '—'}</td>
                        <td className="px-3 py-3 text-[13.5px] text-ink">{t(LABEL_LOG[b.aksi] ?? b.aksi)}</td>
                        <td className="px-3 py-3 text-[13px] text-ink-2">{b.target ?? '—'}</td>
                        <td className="px-5 py-2 text-right sm:px-6">
                          <button
                            type="button"
                            onClick={() => setTerbuka((x) => (x === b.id ? null : b.id))}
                            aria-expanded={terbuka === b.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold text-brand-ink transition hover:bg-brand-soft"
                          >
                            {t('Rincian')}
                            <IconChevronDown size={15} className={'transition-transform ' + (terbuka === b.id ? 'rotate-180' : '')} />
                          </button>
                        </td>
                      </tr>
                      {terbuka === b.id ? (
                        <tr className="border-b border-line bg-surface-2">
                          <td colSpan={5} className="px-5 py-4 sm:px-6">
                            <Rincian rincian={b.rincian} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ) : (
                    <tr key={b.id} className="border-b border-line align-top">
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] tabular-nums text-ink-2 sm:px-6">{b.waktu}</td>
                      <td className="px-3 py-3 text-[13.5px] font-semibold text-ink">{b.aktor ?? '—'}</td>
                      <td className="px-3 py-3 text-[13.5px] text-ink">
                        {b.nama || '—'}
                        <span className="block text-[12px] tabular-nums text-ink-3">{b.nim}</span>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-ink-2">
                        {b.komponen}
                        {b.dibatalkan ? (
                          <Badge tone="neutral" className="ml-2 align-middle">
                            {t('Batch dibatalkan')}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-[13.5px] tabular-nums sm:px-6">
                        <span className="text-ink-3">{b.nilaiLama ?? '—'}</span>
                        <span className="px-1.5 text-ink-3" aria-hidden="true">→</span>
                        <span className="sr-only"> {t('menjadi')} </span>
                        <span className="font-bold text-ink">{b.nilaiBaru ?? '—'}</span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {hasil && hasil.jumlahHalaman > 1 ? (
          <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
            <button
              type="button"
              disabled={halaman <= 1 || memuat}
              onClick={() => setHalaman((h) => h - 1)}
              className="btn-ghost !py-2"
            >
              {t('Sebelumnya')}
            </button>
            <span className="text-[13px] tabular-nums text-ink-2">
              {t('Halaman {n} dari {total}', { n: hasil.halaman, total: hasil.jumlahHalaman })}
            </span>
            <button
              type="button"
              disabled={halaman >= hasil.jumlahHalaman || memuat}
              onClick={() => setHalaman((h) => h + 1)}
              className="btn-ghost !py-2"
            >
              {t('Berikutnya')}
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
