import { useState } from 'react'
import Link from 'next/link'
import { Badge, Card, CardHeader, CatatanKaki } from '../../components/Ui'
import { IconAlert, IconCalendar, IconCheck, IconChevronRight, IconClock, IconUndo } from '../../components/Icons'
import { CONFIG, DARI_BASIS_DATA, KUNCI_DAPAT_DIUBAH, MENUNGGU_KONFIRMASI, nilaiBawaan } from '../../lib/config'
import { ASAL_PERIODE, COHORTS, PERIODE_AKTIF, labelPeriode, periodeSetelah, semesterKalender } from '../../lib/data'
import { ubahPeriode, useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

/* Aturan perhitungan yang sedang berlaku: CONFIG, yaitu bawaan kode yang bisa ditimpa tabel Konfigurasi.
   Hanya bacaan, kecuali periode akademik yang dipindah lewat /api/periode. Lihat README.md › Panel Super
   Admin dan › Periode akademik. */

// Sama dengan aturan di src/server/periode.js; server tetap yang memutuskan.
const ALASAN_PERIODE_MIN = 10

const NAMA_SUMBER = { PDP: 'PDP', MK: 'MK Humaniora', ENGAGEMENT: 'Kemahasiswaan' }
const NAMA_JENIS = { TUGAS: 'Tugas', SIKAP: 'Sikap', UTS: 'UTS', UAS: 'UAS' }
const NAMA_AGREGASI = { 'per-aspek': 'Per aspek', 'per-semester': 'Per semester' }
const daftar = (isi, nama = (k) => k) =>
  Object.entries(isi ?? {})
    .map(([k, v]) => nama(k) + ' ' + v)
    .join(' · ')

const ATURAN = {
  ASPEK_A3_SEMESTER: { label: 'Semester aspek A.3', tampil: (v, t) => t('Semester {n}', { n: v }) },
  ASPEK_C1_SEMESTER: { label: 'Semester aspek C.1', tampil: (v, t) => t('Semester {n}', { n: v }) },
  MODE_BOBOT_KOMPONEN: {
    label: 'Pembagian bobot komponen',
    tampil: (v, t) => t(v === 'merata' ? 'Dibagi rata ke semua komponen' : 'Per sumber penilaian'),
  },
  BOBOT_SUMBER: {
    label: 'Bobot per sumber',
    catatan: 'Dipakai bila pembagian bobotnya per sumber.',
    tampil: (v, t) => daftar(v, (k) => t(NAMA_SUMBER[k] ?? k)),
  },
  BOBOT_KOMPONEN_MK: {
    label: 'Bobot komponen MK Humaniora',
    catatan: 'Dipakai bila pembagian bobotnya per sumber.',
    tampil: (v, t) => daftar(v, (k) => t(NAMA_JENIS[k] ?? k)),
  },
  BOBOT_ASPEK: {
    label: 'Bobot antaraspek',
    tampil: (v, t) => t(v === 'merata' ? 'Sama untuk semua aspek' : 'Kustom per aspek'),
  },
  BOBOT_ASPEK_KUSTOM: {
    label: 'Bobot aspek kustom',
    catatan: 'Dipakai bila bobot antaraspeknya kustom.',
    tampil: (v) => daftar(v),
  },
  MODE_AGREGASI: { label: 'Cara menggabungkan nilai', tampil: (v, t) => t(NAMA_AGREGASI[v] ?? String(v)) },
  AMBANG_SERTIFIKAT: { label: 'Nilai minimum sertifikat', tampil: (v) => String(v) },
  PENGUNCIAN_ASPEK: {
    label: 'Kapan aspek menjadi final',
    tampil: (v, t) =>
      t(
        { otomatis: 'Otomatis saat komponennya lengkap', manual: 'Ditandai manual oleh admin', semester: 'Saat semester ditutup' }[v] ??
          String(v),
      ),
  },
  IZINKAN_FINAL_DRAFT: { label: 'Aspek berkomponen draft boleh final', tampil: (v, t) => t(v ? 'Ya' : 'Tidak') },
}

export default function Aturan() {
  useStore()
  const t = useTeks()
  // Baris tabel: aturan yang bisa ditimpa ditambah lama program, yang selalu ditetapkan.
  const jumlah = KUNCI_DAPAT_DIUBAH.length + 1
  const menunggu = KUNCI_DAPAT_DIUBAH.filter((k) => MENUNGGU_KONFIRMASI.includes(k)).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Aturan Sistem')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t(
            'Aturan perhitungan yang sedang berlaku. Periode akademik dipindah dari halaman ini; aturan lainnya diubah lewat tabel Konfigurasi di basis data, sedangkan bobot dan penilaian aspek lewat halaman Penilaian & Bobot.',
          )}
        </p>
        <Link
          href="/super/penilaian"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[14px] font-bold text-brand-ink hover:underline sm:min-h-0"
        >
          {t('Buka Penilaian & Bobot')}
          <IconChevronRight size={16} />
        </Link>
      </header>

      <KartuPeriode />

      {/* Ringkasan sebelum tabel: seberapa banyak aturan yang angkanya masih bisa berubah. */}
      <Card className="card-pad">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="text-[14px] text-ink-2">
            <span className="text-[26px] font-extrabold leading-none text-ink">{menunggu}</span>
            <span className="font-bold text-ink-2"> / {jumlah} </span>
            {t('aturan masih menunggu konfirmasi')}
          </p>
          <p className="text-[13px] text-ink-2">{t('{n} sudah ditetapkan', { n: jumlah - menunggu })}</p>
        </div>
        <span aria-hidden="true" className="mt-3 block h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--warning)_22%,transparent)]">
          <span className="block h-full rounded-full bg-[var(--warning)]" style={{ width: Math.round((menunggu / jumlah) * 100) + '%' }} />
        </span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[12px] font-bold uppercase tracking-[.06em] text-ink-2">
                <th className="px-5 py-3 sm:px-6">{t('Aturan')}</th>
                <th className="px-3 py-3">{t('Yang berlaku')}</th>
                <th className="px-3 py-3">{t('Sumber')}</th>
                <th className="px-5 py-3 sm:px-6">{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {KUNCI_DAPAT_DIUBAH.map((k) => {
                const a = ATURAN[k] ?? { label: k, tampil: (v) => JSON.stringify(v) }
                const dariBasisData = DARI_BASIS_DATA.has(k)
                const beda = JSON.stringify(CONFIG[k]) !== JSON.stringify(nilaiBawaan(k))
                return (
                  <tr key={k} className="border-b border-line align-top">
                    <th scope="row" className="px-5 py-3 sm:px-6">
                      <span className="block text-[13.5px] font-semibold text-ink">{t(a.label)}</span>
                      {a.catatan ? <span className="mt-0.5 block text-[12.5px] font-normal text-ink-3">{t(a.catatan)}</span> : null}
                    </th>
                    <td className="px-3 py-3 text-[13.5px] font-semibold text-ink">{a.tampil(CONFIG[k], t)}</td>
                    <td className="px-3 py-3 text-[13px] text-ink-2">
                      <span className="whitespace-nowrap">{t(dariBasisData ? 'Basis data' : 'Bawaan kode')}</span>
                      {dariBasisData && beda ? (
                        <span className="mt-0.5 block text-[12px] text-ink-3">
                          {t('bawaan: {nilai}', { nilai: a.tampil(nilaiBawaan(k), t) })}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 sm:px-6">
                      {MENUNGGU_KONFIRMASI.includes(k) ? (
                        <Badge tone="warning" icon={IconClock} className="teks-tunggu whitespace-nowrap">{t('Menunggu konfirmasi')}</Badge>
                      ) : (
                        <Badge tone="neutral" icon={IconCheck} className="whitespace-nowrap">{t('Ditetapkan')}</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr className="align-top">
                <th scope="row" className="px-5 py-3 sm:px-6">
                  <span className="block text-[13.5px] font-semibold text-ink">{t('Lama program')}</span>
                  <span className="mt-0.5 block text-[12.5px] font-normal text-ink-3">
                    {t('Struktur program, tidak bisa ditimpa dari basis data.')}
                  </span>
                </th>
                <td className="px-3 py-3 text-[13.5px] font-semibold text-ink">
                  {t('{n} semester', { n: CONFIG.TOTAL_SEMESTER_PROGRAM })}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[13px] text-ink-2">{t('Bawaan kode')}</td>
                <td className="px-5 py-3 sm:px-6">
                  <Badge tone="neutral" icon={IconCheck} className="whitespace-nowrap">{t('Ditetapkan')}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <CatatanKaki>
        {t('Menunggu konfirmasi: angka usulan tim yang belum dikonfirmasi unit pengelola, jadi masih bisa berubah.')}
      </CatatanKaki>
    </div>
  )
}

/** Keadaan program pada semester kalender `n` (tanpa batas atas). */
function keadaanSemester(n, t) {
  if (n < 1) return t('Belum mulai')
  if (n > CONFIG.TOTAL_SEMESTER_PROGRAM) return t('Lewat Semester {n}', { n: CONFIG.TOTAL_SEMESTER_PROGRAM })
  return t('Semester {n}', { n })
}

/* Periode akademik yang sedang berjalan, dipindah satu semester maju atau mundur. Sebelum disimpan, dampaknya
   ke tiap angkatan dihitung di peramban dengan rumus yang sama dengan server (semesterKalender). */
function KartuPeriode() {
  const t = useTeks()
  const [tujuan, setTujuan] = useState(null)
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')

  const batas = CONFIG.TOTAL_SEMESTER_PROGRAM
  const maju = periodeSetelah(PERIODE_AKTIF, 1)
  const mundur = periodeSetelah(PERIODE_AKTIF, -1)

  // Angkatan yang sudah mulai pada salah satu dari kedua periode.
  const dampak = tujuan
    ? COHORTS.map((c) => ({ c, sebelum: semesterKalender(c.intake), sesudah: semesterKalender(c.intake, tujuan) })).filter(
        (d) => d.sebelum >= 1 || d.sesudah >= 1,
      )
    : []
  const jadiSelesai = dampak.filter((d) => d.sebelum <= batas && d.sesudah > batas).length
  const batalSelesai = dampak.filter((d) => d.sebelum > batas && d.sesudah <= batas).length

  function buka(p) {
    setTujuan(p)
    setAlasan('')
    setGalat('')
  }

  function tutup() {
    setTujuan(null)
    setAlasan('')
    setGalat('')
  }

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      await ubahPeriode({ tahun: tujuan.tahun, semester: tujuan.semester, alasan: alasan.trim() })
      tutup()
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconCalendar}
        title={t('Periode akademik')}
        subtitle={t('Semester tiap mahasiswa, siapa yang sudah lewat Semester 3, dan angkatan yang boleh dikunci dihitung dari periode ini.')}
      />
      <div className="card-pad space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-[24px] font-extrabold leading-tight text-ink">{labelPeriode(PERIODE_AKTIF)}</p>
            <p className="mt-1 text-[12.5px] text-ink-2">
              {t(ASAL_PERIODE.basisData ? 'Tersimpan di basis data' : 'Bawaan kode, belum pernah dipindah')}
            </p>
          </div>
          {tujuan ? null : (
            <div className="flex flex-wrap gap-2.5">
              <button type="button" className="btn-primary" onClick={() => buka(maju)}>
                <IconChevronRight size={16} />
                {t('Pindah ke {periode}', { periode: labelPeriode(maju) })}
              </button>
              <button type="button" className="btn-ghost" onClick={() => buka(mundur)}>
                <IconUndo size={16} />
                {t('Kembalikan ke {periode}', { periode: labelPeriode(mundur) })}
              </button>
            </div>
          )}
        </div>

        {tujuan ? (
          <form onSubmit={simpan} className="space-y-4 rounded-xl border border-line bg-surface-2/60 p-4">
            <p className="text-[13.5px] font-bold text-ink">
              {t('Dampak bila dipindah ke {periode}', { periode: labelPeriode(tujuan) })}
            </p>
            {dampak.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left">
                  <thead>
                    <tr className="border-b border-line text-[12px] font-bold uppercase tracking-[.06em] text-ink-2">
                      <th className="py-2 pr-3">{t('Angkatan')}</th>
                      <th className="px-3 py-2">{t('Sekarang')}</th>
                      <th className="py-2 pl-3">{t('Sesudah dipindah')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dampak.map(({ c, sebelum, sesudah }) => {
                      const lintas = (sebelum > batas) !== (sesudah > batas)
                      return (
                        <tr key={c.id} className="border-b border-line last:border-0">
                          <th scope="row" className="py-2 pr-3 text-[13.5px] font-semibold text-ink">
                            {c.label}
                          </th>
                          <td className="px-3 py-2 text-[13.5px] text-ink-2">{keadaanSemester(sebelum, t)}</td>
                          <td className={'py-2 pl-3 text-[13.5px] ' + (lintas ? 'font-bold text-ink' : 'text-ink-2')}>
                            {keadaanSemester(sesudah, t)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-ink-2">{t('Belum ada angkatan yang terdampak.')}</p>
            )}
            {jadiSelesai ? (
              <p className="text-[13px] leading-relaxed text-ink">
                {t(
                  '{n} angkatan akan lewat Semester {batas}: mahasiswanya tidak lagi ditangani dosen, perubahan datanya oleh admin biasa perlu persetujuan Super Admin, dan angkatannya boleh dikunci.',
                  { n: jadiSelesai, batas },
                )}
              </p>
            ) : null}
            {batalSelesai ? (
              <p className="text-[13px] leading-relaxed text-ink">
                {t('{n} angkatan akan kembali ke Semester {batas} dan kembali ditangani dosen.', { n: batalSelesai, batas })}
              </p>
            ) : null}
            <label className="block max-w-xl">
              <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_PERIODE_MIN })}</span>
              <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus />
            </label>
            <div className="flex flex-wrap gap-2.5">
              <button type="submit" className="btn-primary" disabled={sibuk || alasan.trim().length < ALASAN_PERIODE_MIN}>
                <IconCheck size={16} />
                {t('Pindahkan ke {periode}', { periode: labelPeriode(tujuan) })}
              </button>
              <button type="button" className="btn-ghost" disabled={sibuk} onClick={tutup}>
                {t('Batal')}
              </button>
            </div>
            {galat ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
              >
                <IconAlert size={16} className="mt-px shrink-0" />
                {galat}
              </p>
            ) : null}
          </form>
        ) : null}

        <p className="text-[12.5px] text-ink-3">
          {t('Hanya bisa satu semester maju atau mundur setiap kali, dan setiap perpindahan tercatat di Log Aktivitas beserta alasannya.')}
        </p>
      </div>
    </Card>
  )
}
