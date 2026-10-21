import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, EmptyState } from '../../components/Ui'
import ChartFrame from '../../components/charts/ChartFrame'
import {
  IconCalendar,
  IconCertificate,
  IconCheck,
  IconCheckShield,
  IconChevronDown,
  IconChevronRight,
  IconDocument,
  IconHapus,
  IconInbox,
  IconInfo,
  IconList,
  IconLock,
  IconPencil,
  IconTarget,
  IconUndo,
  IconUsers,
} from '../../components/Icons'
import { AUDIT_LOG, COHORTS, PERIODE_AKTIF, daftarPeriode, rentangPeriode, samaPeriode } from '../../lib/data'
import { KUNCI_DAPAT_DIUBAH, MENUNGGU_KONFIRMASI } from '../../lib/config'
import { PERMINTAAN, bacaLog, permintaanMenunggu, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useBahasa } from '../../lib/bahasa'
import { LABEL_AKSI } from '../admin/PersetujuanAdmin'
import { LABEL_LOG, tanggalWib } from '../admin/Log'

/* Pusat Kendali Super Admin, disusun mengikuti satu keputusan yang diambil di sini: permintaan admin yang
   menunggu. Kartu navy itu titik fokusnya; keadaan sistem, perubahan nilai per hari, dan tindakan admin
   terbaru adalah bahan pengawasan di bawahnya. Semua angka dihitung dari data yang termuat atau /api/log.
   Pemilih periode di pojok kanan atas menyaring keputusan, perubahan nilai, dan tindakan admin ke rentang
   semester itu (rentangPeriode di src/lib/data.js); antrean, angkatan terkunci, dan aturan tetap keadaan
   saat ini. Lihat README.md › Panel Super Admin. */

const RANTAI = [
  { peran: 'Super Admin', tugas: 'Menyetujui permintaan admin dan mengawasi seluruh jejak tindakan.' },
  { peran: 'Kemahasiswaan', tugas: 'Mengelola nilai, angkatan, kurikulum, dan sertifikat.' },
  { peran: 'Dosen', tugas: 'Mengusulkan nilai mahasiswa di kelasnya.' },
  { peran: 'Mahasiswa', tugas: 'Melihat capaian dan mengajukan koreksi nilai.' },
]

// Ikon per jenis tindakan, supaya linimasa bisa dipindai tanpa membaca setiap baris.
const IKON_LOG = {
  KUNCI_ANGKATAN: IconLock,
  UBAH_DATA_TERKUNCI: IconPencil,
  ROLLBACK_DATA_TERKUNCI: IconUndo,
  UBAH_PENGUNCIAN: IconCertificate,
  UBAH_BOBOT: IconTarget,
  AJUKAN_PERSETUJUAN: IconInbox,
  PUTUSKAN_PERSETUJUAN: IconCheckShield,
  TARIK_PERMINTAAN: IconUndo,
  UBAH_PENILAIAN: IconDocument,
  UBAH_AKSES: IconUsers,
  TAMBAH_AKUN: IconUsers,
  HAPUS_AKUN: IconHapus,
}

const LABEL_KEPUTUSAN = { disetujui: 'Disetujui', ditolak: 'Ditolak', gagal: 'Gagal dijalankan' }
const RINCIAN_KEPUTUSAN = { disetujui: '{n} disetujui', ditolak: '{n} ditolak', gagal: '{n} gagal dijalankan' }

/* ------------------------------ waktu (WIB) ------------------------------- */

const ZONA = 'Asia/Jakarta'
const lokal = (bahasa) => (bahasa === 'en' ? 'en-GB' : 'id-ID')

/** 'TTTT-BB-HH JJ:MM' dalam WIB, bentuk waktu dari server, menjadi Date. */
function dariWib(teks) {
  const s = String(teks ?? '')
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null
  const d = new Date(s.slice(0, 10) + 'T' + (s.slice(11, 16) || '12:00') + ':00+07:00')
  return Number.isNaN(d.getTime()) ? null : d
}

/** Selisih hari kalender antara dua tanggal TTTT-BB-HH (positif bila `a` sesudah `b`). */
const selisihHari = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000)

const tanggalPanjang = (teks, bahasa, tahun = true) => {
  const d = dariWib(teks)
  if (!d) return String(teks ?? '')
  return new Intl.DateTimeFormat(lokal(bahasa), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(tahun ? { year: 'numeric' } : {}),
    timeZone: ZONA,
  }).format(d)
}

/** "5 menit yang lalu", "kemarin", lalu tanggal pendek setelah sepekan; bahasa mengikuti pilihan pengguna. */
function waktuRelatif(teks, bahasa) {
  const d = dariWib(teks)
  if (!d) return String(teks ?? '')
  const rtf = new Intl.RelativeTimeFormat(bahasa === 'en' ? 'en' : 'id', { numeric: 'auto' })
  const hari = selisihHari(String(teks).slice(0, 10), tanggalWib(0))
  if (hari === 0) {
    const menit = Math.round((d.getTime() - Date.now()) / 60000)
    if (Math.abs(menit) < 1) return rtf.format(0, 'second')
    if (Math.abs(menit) < 60) return rtf.format(menit, 'minute')
    return rtf.format(Math.round(menit / 60), 'hour')
  }
  if (hari > -7) return rtf.format(hari, 'day')
  return new Intl.DateTimeFormat(lokal(bahasa), { day: 'numeric', month: 'short', timeZone: ZONA }).format(d)
}

const namaPeriode = (p, t) => t(p.semester) + ' ' + p.tahun

/** "Agu 2026 – Jan 2027": bulan awal dan akhir rentang periode. */
const rentangPendek = ({ mulai, selesai }, bahasa) => {
  const f = new Intl.DateTimeFormat(lokal(bahasa), { month: 'short', year: 'numeric', timeZone: 'UTC' })
  return f.format(new Date(mulai + 'T00:00:00Z')) + ' – ' + f.format(new Date(selesai + 'T00:00:00Z'))
}

function sapaan() {
  const jam = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: ZONA }).format(new Date()))
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 18) return 'Selamat sore'
  return 'Selamat malam'
}

/* ------------------------------ bagian kecil ------------------------------ */

function TautanKepala({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center gap-1 text-[13px] font-bold text-brand-ink hover:underline sm:min-h-0"
    >
      {children}
      <IconChevronRight size={15} />
    </Link>
  )
}

/** Seperti CardHeader, tetapi tautannya turun ke baris sendiri saat kartu sempit, supaya judul dan keterangan
    tidak terjepit menjadi kolom kecil di HP. */
function KepalaKartu({ icon: Ikon, title, subtitle, action }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4 sm:px-6">
      <div className="flex min-w-[min(100%,240px)] flex-1 items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <Ikon size={18} />
        </span>
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-snug text-ink-2">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 pl-12 sm:pl-0">{action}</div> : null}
    </header>
  )
}

/** Batang meter: isian satu warna di atas lintasan dari ramp yang sama (lihat .isi-data di index.css). */
function Meter({ nilai, total, peringatan = false }) {
  const persen = total ? Math.round((nilai / total) * 100) : 0
  return (
    <span
      aria-hidden="true"
      className={
        'mt-2.5 block h-2 overflow-hidden rounded-full ' +
        (peringatan ? 'bg-[color-mix(in_srgb,var(--warning)_22%,transparent)]' : 'bg-brand-soft')
      }
    >
      <span
        className={'block h-full rounded-full ' + (peringatan ? 'bg-[var(--warning)]' : 'isi-data')}
        style={{ width: persen + '%' }}
      />
    </span>
  )
}

/* ------------------------------ pemilih periode ------------------------------ */

/** Tombol keping periode yang membuka daftar semester (pola listbox: panah atas/bawah, Home/End, Enter atau
    Spasi memilih, Escape menutup dan mengembalikan fokus ke tombol). */
function PilihPeriode({ nilai, onPilih, t, bahasa }) {
  const daftar = daftarPeriode()
  const idDaftar = useId()
  const [buka, setBuka] = useState(false)
  const [sorot, setSorot] = useState(0)
  // Posisi sorotan terbaru juga disimpan di ref: tombol panah yang ditekan beruntun lebih cepat dari render
  // berikutnya tetap bergeser satu per satu, dan Enter memilih yang benar-benar tersorot.
  const sorotKini = useRef(0)
  const aturSorot = (i) => {
    sorotKini.current = i
    setSorot(i)
  }
  const wadah = useRef(null)
  const tombol = useRef(null)
  const kotak = useRef(null)
  const indeksNilai = Math.max(0, daftar.findIndex((p) => samaPeriode(p, nilai)))

  useEffect(() => {
    if (!buka) return undefined
    kotak.current?.focus()
    const luar = (e) => {
      if (wadah.current && !wadah.current.contains(e.target)) setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    return () => document.removeEventListener('mousedown', luar)
  }, [buka])

  useEffect(() => {
    if (buka) document.getElementById(idDaftar + '-' + sorot)?.scrollIntoView?.({ block: 'nearest' })
  }, [buka, sorot, idDaftar])

  const bukaDaftar = () => {
    aturSorot(indeksNilai)
    setBuka(true)
  }
  const tutup = (kembali = true) => {
    setBuka(false)
    if (kembali) tombol.current?.focus()
  }
  const pilih = (i) => {
    onPilih(daftar[i])
    tutup()
  }

  function tekanTombol(e) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      bukaDaftar()
    }
  }
  function tekanDaftar(e) {
    const kini = sorotKini.current
    const ke = { ArrowDown: Math.min(daftar.length - 1, kini + 1), ArrowUp: Math.max(0, kini - 1), Home: 0, End: daftar.length - 1 }
    if (e.key in ke) {
      e.preventDefault()
      aturSorot(ke[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pilih(kini)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      tutup()
    } else if (e.key === 'Tab') {
      tutup(false)
    }
  }

  const TandaAktif = () => (
    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">{t('Aktif')}</span>
  )

  return (
    <div ref={wadah} className="relative">
      <button
        ref={tombol}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={buka}
        aria-controls={buka ? idDaftar : undefined}
        aria-label={t('Periode yang ditampilkan: {periode}', { periode: namaPeriode(nilai, t) })}
        onClick={() => (buka ? tutup() : bukaDaftar())}
        onKeyDown={tekanTombol}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] font-bold text-ink transition hover:border-line-strong hover:bg-surface-2 sm:min-h-[38px]"
      >
        <IconCalendar size={15} className="shrink-0 text-brand-ink" />
        {namaPeriode(nilai, t)}
        {samaPeriode(nilai, PERIODE_AKTIF) ? <TandaAktif /> : null}
        <IconChevronDown size={15} className={'shrink-0 text-ink-2 transition-transform ' + (buka ? 'rotate-180' : '')} />
      </button>

      {buka ? (
        <ul
          ref={kotak}
          id={idDaftar}
          role="listbox"
          tabIndex={-1}
          aria-label={t('Pilih periode')}
          aria-activedescendant={idDaftar + '-' + sorot}
          onKeyDown={tekanDaftar}
          className="absolute right-0 top-[calc(100%+8px)] z-30 max-h-[320px] w-[min(300px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-pop animate-rise"
        >
          {daftar.map((p, i) => {
            const dipilih = samaPeriode(p, nilai)
            return (
              <li
                key={p.tahun + p.semester}
                id={idDaftar + '-' + i}
                role="option"
                aria-selected={dipilih}
                // Hanya gerakan tetikus sungguhan yang memindah sorotan. Chrome mengirim mousemove tiruan (tanpa
                // pergeseran) saat daftar bergulir oleh panah, yang kalau diikuti akan merebut sorotan papan ketik.
                onMouseMove={(e) => {
                  if ((e.movementX || e.movementY) && sorotKini.current !== i) aturSorot(i)
                }}
                onClick={() => pilih(i)}
                className={'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ' + (i === sorot ? 'bg-brand-soft' : '')}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                    {namaPeriode(p, t)}
                    {samaPeriode(p, PERIODE_AKTIF) ? <TandaAktif /> : null}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-2">{rentangPendek(rentangPeriode(p), bahasa)}</span>
                </span>
                {dipilih ? <IconCheck size={16} strokeWidth={2.2} className="shrink-0 text-brand-ink" /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/* ------------------------- 1. titik fokus: keputusan ------------------------ */

function KeputusanAnda({ menunggu, saatIni, t, bahasa }) {
  const ada = menunggu.length > 0
  const terlama = menunggu[0]
  const lamaHari = terlama ? Math.max(0, -selisihHari(String(terlama.diajukanPada ?? '').slice(0, 10), tanggalWib(0))) : 0
  const terakhir = [...PERMINTAAN]
    .filter((p) => LABEL_KEPUTUSAN[p.status] && p.diputuskanPada)
    .sort((a, b) => String(b.diputuskanPada).localeCompare(String(a.diputuskanPada)))[0]

  return (
    // Di layar lebar: judul, angka, dan tombol di kiri; daftar (atau keterangan bila kosong) di kanan.
    // Di layar sempit tombolnya turun ke paling bawah, sesudah daftar.
    <section
      aria-labelledby="judul-keputusan"
      className="kartu-aurora relative grid gap-6 rounded-3xl p-5 text-white sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 xl:col-span-12 dark:ring-1 dark:ring-white/10"
    >
      <div className="lg:col-start-1 lg:row-start-1">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-[var(--accent)]">
            <IconCheckShield size={20} />
          </span>
          <div>
            <h2 id="judul-keputusan" className="flex flex-wrap items-center gap-2 text-[16px] font-extrabold leading-tight">
              {t('Perlu keputusan Anda')}
              {/* Saat periode lain dipilih: antrean ini tidak ikut disaring, ia selalu keadaan sekarang. */}
              {saatIni ? (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.08em] text-white">
                  {t('Saat ini')}
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-white/75">
              {t('Permintaan admin, diurutkan dari yang paling lama menunggu.')}
            </p>
          </div>
        </div>

        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[56px] font-extrabold leading-none tracking-tight">{menunggu.length}</span>
          <span className="text-[15px] font-semibold text-white/85">{t('permintaan menunggu')}</span>
        </p>
        {ada ? (
          <p className="mt-2 text-[13.5px] font-semibold text-[var(--accent)]">
            {lamaHari
              ? t('Terlama menunggu {n} hari, sejak {tanggal}.', {
                  n: lamaHari,
                  tanggal: tanggalPanjang(terlama.diajukanPada, bahasa, false),
                })
              : t('Yang terlama diajukan hari ini.')}
          </p>
        ) : null}
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {ada ? (
          <>
            <ul className="space-y-2">
              {menunggu.slice(0, 3).map((p) => (
                <li key={p.id} className="rounded-2xl bg-white/[.07] px-4 py-3">
                  <p className="text-[14px] font-bold">
                    {t(LABEL_AKSI[p.aksi] ?? p.aksi)}
                    <span className="font-semibold text-white/80"> · {p.id}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-white/80">
                    {[p.diajukanOleh, waktuRelatif(p.diajukanPada, bahasa)].filter(Boolean).join(' · ')}
                  </p>
                  {p.alasan ? <p className="mt-1 line-clamp-1 text-[12.5px] italic text-white/80">“{p.alasan}”</p> : null}
                </li>
              ))}
            </ul>
            {menunggu.length > 3 ? (
              <p className="mt-2 text-[12.5px] text-white/75">{t('dan {n} lainnya di antrean', { n: menunggu.length - 3 })}</p>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center gap-4 rounded-2xl bg-white/[.07] px-5 py-5 text-[13.5px] leading-relaxed text-white/80">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white">
              <IconCheck size={22} />
            </span>
            <div>
              <p className="font-semibold text-white">{t('Tidak ada yang perlu Anda putuskan sekarang.')}</p>
              <p className="mt-1">{t('Permintaan admin untuk mahasiswa yang sudah lewat Semester 3 akan muncul di sini.')}</p>
              {terakhir ? (
                <p className="mt-1">
                  {t('Keputusan terakhir: {status}, {kapan}.', {
                    status: t(LABEL_KEPUTUSAN[terakhir.status]).toLowerCase(),
                    kapan: waktuRelatif(terakhir.diputuskanPada, bahasa),
                  })}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Toska hanya saat ada yang harus diputuskan: itulah satu-satunya aksi utama halaman ini. */}
      <div className="lg:col-start-1 lg:row-start-2 lg:self-end">
        <Link
          href="/super/persetujuan"
          className={
            'inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-extrabold transition ' +
            (ada ? 'isi-toska text-[var(--accent-on)] hover:brightness-105' : 'bg-white/10 text-white hover:bg-white/15')
          }
        >
          {t(ada ? 'Buka antrean persetujuan' : 'Lihat riwayat keputusan')}
          <IconChevronRight size={16} />
        </Link>
      </div>
    </section>
  )
}

/* --------------------------- 2. keadaan sistem --------------------------- */

function KeadaanSistem({ t, rentang, label, periodeLain }) {
  const putus = PERMINTAAN.filter((p) => {
    const tgl = String(p.diputuskanPada ?? '').slice(0, 10)
    return LABEL_KEPUTUSAN[p.status] && tgl >= rentang.mulai && tgl <= rentang.selesai
  })
  const rincianPutus = Object.entries(RINCIAN_KEPUTUSAN)
    .map(([s, kunci]) => [kunci, putus.filter((p) => p.status === s).length])
    .filter(([, n]) => n)
    .map(([kunci, n]) => t(kunci, { n }))

  // Terlama di kiri, seperti urutan angkatan di halaman Angkatan.
  const angkatan = [...COHORTS].reverse()
  const terkunci = angkatan.filter((c) => c.status === 'terkunci')

  // Sama dengan tabel Aturan Sistem: aturan yang bisa ditimpa ditambah lama program yang selalu ditetapkan.
  const jumlahAturan = KUNCI_DAPAT_DIUBAH.length + 1
  const aturanMenunggu = KUNCI_DAPAT_DIUBAH.filter((k) => MENUNGGU_KONFIRMASI.includes(k)).length

  return (
    <Card className="flex flex-col xl:col-span-4 xl:col-start-9">
      <h2 className="px-5 pt-5 text-[15px] font-bold text-ink sm:px-6">{t('Keadaan sistem')}</h2>
      {periodeLain ? (
        <p className="px-5 pt-1 text-[12.5px] leading-snug text-ink-2 sm:px-6">
          {t('Angkatan dan aturan di bawah ini menunjukkan keadaan saat ini.')}
        </p>
      ) : null}
      <dl className="grid flex-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0 xl:grid-cols-1 xl:divide-x-0 xl:divide-y">
        <div className="px-5 py-4 sm:px-6">
          <dt className="text-[13px] font-semibold text-ink-2">{t('Diputuskan di {periode}', { periode: label })}</dt>
          <dd className="mt-1 text-[26px] font-extrabold leading-tight text-ink">{putus.length}</dd>
          <dd className="mt-1 text-[12.5px] leading-snug text-ink-2">
            {rincianPutus.length ? rincianPutus.join(' · ') : t('Belum ada keputusan di periode ini.')}
          </dd>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <dt className="text-[13px] font-semibold text-ink-2">{t('Angkatan terkunci')}</dt>
          <dd className="mt-1 text-[26px] font-extrabold leading-tight text-ink">
            {terkunci.length}
            <span className="text-[15px] font-bold text-ink-2"> / {angkatan.length}</span>
          </dd>
          <dd>
            <Meter nilai={terkunci.length} total={angkatan.length} />
          </dd>
          <dd className="mt-2 text-[12.5px] leading-snug text-ink-2">
            {terkunci.length
              ? t('Terkunci: {daftar}', { daftar: terkunci.map((c) => c.label).join(', ') })
              : t('Belum ada angkatan yang terkunci.')}
          </dd>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <dt className="text-[13px] font-semibold text-ink-2">{t('Aturan menunggu konfirmasi')}</dt>
          <dd className="mt-1 text-[26px] font-extrabold leading-tight text-ink">
            {aturanMenunggu}
            <span className="text-[15px] font-bold text-ink-2"> / {jumlahAturan}</span>
          </dd>
          <dd>
            <Meter nilai={aturanMenunggu} total={jumlahAturan} peringatan />
          </dd>
          <dd className="mt-1">
            <TautanKepala href="/super/aturan">{t('Lihat aturan')}</TautanKepala>
          </dd>
        </div>
      </dl>
    </Card>
  )
}

/* ----------------------- 3. perubahan nilai per bulan ----------------------- */

const TINGGI_PLOT = 216

/** Batas atas sumbu Y yang rapi: dua langkah 1, 2, atau 5 kali pangkat sepuluh, minimal sebesar nilai terbesar. */
function skalaRapi(maks) {
  if (maks <= 0) return { atas: 1, langkah: 1 }
  const separuh = maks / 2
  let pangkat = 1
  for (;;) {
    for (const k of [1, 2, 5]) {
      if (k * pangkat >= separuh) return { atas: k * pangkat * 2, langkah: k * pangkat }
    }
    pangkat *= 10
  }
}

/** Enam bulan (TTTT-BB) sebuah periode, dari bulan pertamanya. */
function bulanPeriode(periode) {
  const [th, bl] = rentangPeriode(periode).mulai.split('-').map(Number)
  return Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(th, bl - 1 + i, 1)).toISOString().slice(0, 7))
}

const namaBulan = (b, bahasa, panjang = false) =>
  new Intl.DateTimeFormat(
    lokal(bahasa),
    panjang ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'short', timeZone: 'UTC' },
  ).format(new Date(b + '-15T00:00:00Z'))

function GrafikPerubahan({ periode, t, bahasa }) {
  const bulan = bulanPeriode(periode)
  const bulanIni = tanggalWib(0).slice(0, 7)
  const hitung = new Map(bulan.map((b) => [b, 0]))
  const mahasiswa = new Set()
  for (const l of AUDIT_LOG) {
    const b = String(l.waktu ?? '').slice(0, 7)
    if (!hitung.has(b)) continue
    hitung.set(b, hitung.get(b) + 1)
    if (l.nim) mahasiswa.add(l.nim)
  }
  // Bulan sesudah bulan ini (periode aktif) belum berjalan: tanpa batang, bukan nol.
  const data = bulan.map((b) => ({ bulan: b, n: hitung.get(b), nanti: b > bulanIni }))
  const total = data.reduce((a, d) => a + d.n, 0)
  const maks = Math.max(...data.map((d) => d.n))
  const { atas, langkah } = skalaRapi(maks)
  // Hanya nilai terbesar yang diberi label; sisanya lewat sumbu, tooltip, dan tabel.
  const puncak = data.reduceRight((p, d) => (p === null || d.n > p.n ? d : p), null)
  const label = namaPeriode(periode, t)

  return (
    <ChartFrame
      title="Perubahan nilai per bulan"
      subtitle="Per bulan dalam semester yang dipilih, menurut tanggal WIB."
      height={0}
      action={<TautanKepala href="/super/log">{t('Telusuri di log')}</TautanKepala>}
      table={{
        head: ['Bulan', 'Perubahan nilai'],
        rows: data.map((d) => [
          <time key={d.bulan} dateTime={d.bulan}>
            {namaBulan(d.bulan, bahasa, true)}
          </time>,
          d.nanti ? 'belum berjalan' : d.n,
        ]),
      }}
    >
      {total ? (
        <div className="px-3 pb-2 pt-1 sm:px-2">
          <p className="text-[13px] text-ink-2">
            {label + ': ' + t('{n} perubahan nilai pada {m} mahasiswa.', { n: total, m: mahasiswa.size })}
          </p>
          {/* mt-8: ruang untuk label nilai puncak, yang bisa naik melewati garis teratas. */}
          <div className="mt-8 flex gap-2">
            <div aria-hidden="true" className="relative w-8 shrink-0" style={{ height: TINGGI_PLOT }}>
              {[atas, langkah, 0].map((v) => (
                <span
                  key={v}
                  className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-ink-2"
                  style={{ top: (1 - v / atas) * 100 + '%' }}
                >
                  {v}
                </span>
              ))}
            </div>
            <div className="relative flex-1" style={{ height: TINGGI_PLOT }}>
              {[0, 50, 100].map((p) => (
                <span key={p} aria-hidden="true" className="absolute inset-x-0 h-px bg-[var(--grid)]" style={{ top: p + '%' }} />
              ))}
              <ol aria-label={t('Perubahan nilai per bulan di {periode}', { periode: label })} className="relative flex h-full items-end">
                {data.map((d) => {
                  const nama = namaBulan(d.bulan, bahasa, true)
                  return (
                    // Fokus papan ketik menampilkan keterangan yang sama dengan tunjuk tetikus.
                    <li
                      key={d.bulan}
                      tabIndex={0}
                      aria-label={nama + ': ' + (d.nanti ? t('belum berjalan') : t('{n} perubahan', { n: d.n }))}
                      className="group relative flex h-full flex-1 items-end justify-center rounded-md"
                    >
                      {d.nanti ? null : (
                        <span
                          aria-hidden="true"
                          className="isi-data block w-[44%] max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                          style={{ height: (d.n / atas) * 100 + '%' }}
                        />
                      )}
                      {d === puncak && d.n ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-1/2 -translate-x-1/2 -translate-y-full pb-1 text-[12px] font-bold text-ink group-hover:invisible group-focus-visible:invisible"
                          style={{ bottom: (d.n / atas) * 100 + '%' }}
                        >
                          {d.n}
                        </span>
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-surface group-hover:visible group-focus-visible:visible"
                      >
                        {d.nanti ? t('Belum berjalan') : <strong className="font-extrabold">{d.n}</strong>} · {nama}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
          <div aria-hidden="true" className="ml-10 mt-2 flex">
            {data.map((d) => (
              <span key={d.bulan} className="flex-1 text-center leading-tight">
                <span className={'block text-[11.5px] ' + (d.bulan === bulanIni ? 'font-bold text-ink' : 'text-ink-2')}>
                  {namaBulan(d.bulan, bahasa)}
                </span>
                <span className="block text-[11px] text-ink-2">{d.bulan.slice(0, 4)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title={t('Tidak ada perubahan nilai di {periode}', { periode: label })}>
          {t('Nilai yang diinput, diimpor, atau disetujui akan terhitung di sini per bulan.')}
        </EmptyState>
      )}
    </ChartFrame>
  )
}

/* -------------------------- 4. tindakan admin terbaru ----------------------- */

function Aktivitas({ aktivitas, label, t, bahasa }) {
  return (
    <Card className="flex flex-col overflow-hidden xl:col-span-7">
      <KepalaKartu
        icon={IconList}
        title={t('Tindakan admin terbaru')}
        subtitle={t('Enam catatan terakhir di {periode}.', { periode: label })}
        action={<TautanKepala href="/super/log">{t('Lihat seluruh log')}</TautanKepala>}
      />
      {aktivitas === null ? (
        <p className="flex-1 px-5 py-6 text-[13.5px] text-ink-2 sm:px-6">{t('Memuat…')}</p>
      ) : aktivitas.galat ? (
        <p role="alert" className="flex-1 px-5 py-6 text-[13.5px] font-semibold text-[var(--critical)] sm:px-6">
          {aktivitas.galat}
        </p>
      ) : aktivitas.lokal ? (
        <p className="flex flex-1 items-start gap-2 px-5 py-6 text-[13.5px] text-ink-2 sm:px-6">
          <IconInfo size={15} className="mt-0.5 shrink-0" />
          {t('Tindakan admin hanya tercatat saat website terhubung ke basis data.')}
        </p>
      ) : aktivitas.baris.length ? (
        // Saat periode diganti, daftar lama tetap terlihat redup sampai yang baru tiba (tanpa lompatan tata letak).
        <ol className={'flex-1 px-5 py-5 transition-opacity sm:px-6 ' + (aktivitas.memuat ? 'opacity-50' : '')}>
          {aktivitas.baris.map((b, i) => {
            const Ikon = IKON_LOG[b.aksi] ?? IconList
            return (
              <li key={b.id} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Garis linimasa menyambung ke catatan berikutnya. */}
                {i < aktivitas.baris.length - 1 ? (
                  <span aria-hidden="true" className="absolute bottom-1 left-4 top-10 w-px bg-line" />
                ) : null}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                  <Ikon size={16} />
                </span>
                {/* Di HP waktunya turun ke bawah teks; mulai sm sejajar di kanan. */}
                <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug text-ink">
                      {b.aktor ? <span className="font-bold">{b.aktor} · </span> : null}
                      {t(LABEL_LOG[b.aksi] ?? b.aksi)}
                    </p>
                    {b.target ? <p className="mt-0.5 truncate text-[12.5px] text-ink-2">{b.target}</p> : null}
                  </div>
                  <time
                    dateTime={String(b.waktu ?? '').replace(' ', 'T')}
                    title={b.waktu ? b.waktu + ' WIB' : undefined}
                    className="mt-0.5 block text-[12px] text-ink-2 sm:mt-0 sm:shrink-0 sm:pt-0.5"
                  >
                    {waktuRelatif(b.waktu, bahasa)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="flex-1">
          <EmptyState title={t('Belum ada tindakan admin yang tercatat')}>
            {t('Penguncian, perubahan bobot, dan keputusan persetujuan akan tercatat di sini.')}
          </EmptyState>
        </div>
      )}
    </Card>
  )
}

/* --------------------------- 5. rantai pengawasan --------------------------- */

function RantaiPengawasan({ t }) {
  return (
    <Card className="flex flex-col overflow-hidden xl:col-span-5">
      <KepalaKartu
        icon={IconUsers}
        title={t('Rantai pengawasan')}
        subtitle={t('Setiap peran diawasi peran di atasnya.')}
        action={<TautanKepala href="/super/wewenang">{t('Lihat matriks')}</TautanKepala>}
      />
      {/* Bertingkat dari atas ke bawah, sesuai urutan pengawasannya. Panah hanya saat peran tersusun satu
          kolom (HP dan layar lebar); di antaranya dua kolom tanpa panah. */}
      <ol className="grid flex-1 content-start p-5 sm:grid-cols-2 sm:gap-3 sm:p-6 xl:grid-cols-1 xl:gap-0">
        {RANTAI.map((r, i) => (
          <li key={r.peran}>
            <div
              className={
                'rounded-2xl px-4 py-3.5 ' +
                (i === 0 ? 'kartu-aurora relative text-white dark:ring-1 dark:ring-white/10' : 'border border-line bg-surface-2 text-ink')
              }
            >
              <p className="text-[14px] font-extrabold">
                {t(r.peran)}
                {i === 0 ? (
                  <span className="ml-2 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--accent)]">{t('Anda')}</span>
                ) : null}
              </p>
              <p className={'mt-1 text-[13px] leading-snug ' + (i === 0 ? 'text-white/80' : 'text-ink-2')}>{t(r.tugas)}</p>
            </div>
            {i < RANTAI.length - 1 ? (
              <span className="flex h-7 items-center justify-center text-ink-3 sm:hidden xl:flex">
                <IconChevronDown size={18} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  )
}

/* ---------------------------------- halaman --------------------------------- */

export default function Kendali() {
  useStore()
  const { t, bahasa } = useBahasa()
  const { user } = useAuth()
  const [aktivitas, setAktivitas] = useState(null)
  const [periode, setPeriode] = useState(PERIODE_AKTIF)
  const rentang = rentangPeriode(periode)
  const labelPeriode = namaPeriode(periode, t)
  const periodeLain = !samaPeriode(periode, PERIODE_AKTIF)

  useEffect(() => {
    let batal = false
    setAktivitas((a) => (a ? { ...a, memuat: true } : a))
    bacaLog({ jenis: 'aktivitas', ukuran: 6, dari: rentang.mulai, sampai: rentang.selesai })
      .then((h) => !batal && setAktivitas(h))
      .catch((e) => !batal && setAktivitas({ galat: e.message, baris: [] }))
    return () => {
      batal = true
    }
  }, [rentang.mulai, rentang.selesai])

  // Terlama di atas: yang paling lama menunggu diputuskan lebih dulu.
  const menunggu = [...permintaanMenunggu()].sort((a, b) => String(a.diajukanPada).localeCompare(String(b.diajukanPada)))
  const hariIni = tanggalWib(0)

  return (
    <div className="space-y-6">
      {/* Pemilih periode di pojok kanan, tepat di bawah menu akun di bilah atas (lebar isinya sama). Di layar
          sempit ia turun ke baris sendiri, tetap rata kanan. */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink-2">
            {[t(sapaan()) + (user?.name ? ', ' + user.name : ''), tanggalPanjang(hariIni, bahasa)].join(' · ')}
          </p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-ink">{t('Pusat Kendali')}</h1>
          <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
            {t('Pengawasan seluruh sistem VIBE: permintaan yang perlu diputuskan, jejak tindakan, dan aturan yang berlaku.')}
          </p>
        </div>
        <div className="ml-auto">
          <PilihPeriode nilai={periode} onPilih={setPeriode} t={t} bahasa={bahasa} />
        </div>
      </header>

      {/* Urutan di HP: keputusan, ringkasan angka, grafik, linimasa, rantai. Di layar lebar ringkasan pindah
          ke kanan grafik (col-start-9) dan grid-flow-dense mengisi sisi kirinya dengan grafik. */}
      <div className="grid gap-6 xl:grid-flow-row-dense xl:grid-cols-12">
        <KeputusanAnda menunggu={menunggu} saatIni={periodeLain} t={t} bahasa={bahasa} />
        <KeadaanSistem t={t} rentang={rentang} label={labelPeriode} periodeLain={periodeLain} />
        <div className="flex flex-col xl:col-span-8 [&>section]:flex-1">
          <GrafikPerubahan periode={periode} t={t} bahasa={bahasa} />
        </div>
        <Aktivitas aktivitas={aktivitas} label={labelPeriode} t={t} bahasa={bahasa} />
        <RantaiPengawasan t={t} />
      </div>
    </div>
  )
}
