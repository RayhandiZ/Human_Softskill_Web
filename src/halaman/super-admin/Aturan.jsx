import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { Badge, Card, CardHeader, CatatanKaki, GulirTabel, SearchInput, Select } from '../../components/Ui'
import {
  IconAlert,
  IconCalendar,
  IconCertificate,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconInfo,
  IconLock,
  IconPencil,
  IconPlus,
  IconUndo,
  IconUsers,
  IconX,
} from '../../components/Icons'
import { CONFIG, DARI_BASIS_DATA, KUNCI_DAPAT_DIUBAH, MENUNGGU_KONFIRMASI, nilaiBawaan } from '../../lib/config'
import { ASAL_PERIODE, COHORTS, PERIODE_AKTIF, STUDENTS, labelPeriode, periodeSetelah, semesterKalender } from '../../lib/data'
import { getAspek, getAspekList } from '../../lib/curriculum'
import { labelSyaratTambahan, syaratSudahMulai } from '../../lib/rules'
import { PERMINTAAN_SERTIFIKAT, tandaiSyaratSertifikat, ubahPeriode, ubahSyaratSertifikat, useStore } from '../../lib/store'
import {
  ALASAN_SYARAT_MIN,
  NAMA_SYARAT_MAKS,
  SYARAT_TAMBAHAN_MAKS,
  dampakSyarat,
  periksaSyarat,
  rapikanTambahan,
  samaSyarat,
  susunanSyarat,
  syaratSaatPindahPeriode,
} from '../../lib/syaratSertifikat'
import { useTeks } from '../../lib/bahasa'

/* Aturan perhitungan yang sedang berlaku: CONFIG, yaitu bawaan kode yang bisa ditimpa tabel Konfigurasi.
   Hanya bacaan, kecuali periode akademik (/api/periode) dan syarat kelayakan sertifikat (/api/sertifikat/syarat).
   Lihat README.md › Panel Super Admin, › Periode akademik, dan › Sertifikat. */

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
  SYARAT_SERTIFIKAT: {
    label: 'Syarat sertifikat yang bisa dimatikan',
    catatan: 'Semester dan pengesahan angkatan.',
    tampil: (v, t) => {
      const mati = [v?.semester === false && 'Semester', v?.terkunci === false && 'Pengesahan angkatan'].filter(Boolean)
      return mati.length ? t('Nonaktif: {daftar}', { daftar: mati.map((x) => t(x)).join(', ') }) : t('Semua aktif')
    },
  },
  SYARAT_TAMBAHAN: {
    label: 'Syarat sertifikat tambahan',
    catatan: 'Ditambah Super Admin di kartu syarat di atas.',
    tampil: (v, t) => {
      if (!v?.length) return t('Belum ada syarat tambahan')
      const nyala = v.filter((s) => s.aktif !== false)
      const jadwal = nyala.filter((s) => !syaratSudahMulai(s)).length
      return jadwal
        ? t('{n} syarat, {aktif} berlaku, {jadwal} terjadwal', { n: v.length, aktif: nyala.length - jadwal, jadwal })
        : t('{n} syarat, {aktif} aktif', { n: v.length, aktif: nyala.length })
    },
  },
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

/* Bobot aspek kustom hanya dipakai bila bobot antaraspeknya kustom; selama tidak, angkanya (semua 10) hanyalah
   isian awal. Rapat 24 Okt 2026: angka sama seperti itu diberi label contoh, bukan "Ditetapkan". */
const angkaContoh = (k) => k === 'BOBOT_ASPEK_KUSTOM' && CONFIG.BOBOT_ASPEK !== 'kustom'

export default function Aturan() {
  useStore()
  const t = useTeks()
  // Baris tabel: aturan yang bisa ditimpa ditambah lama program, yang selalu ditetapkan.
  const jumlah = KUNCI_DAPAT_DIUBAH.length + 1
  const menunggu = KUNCI_DAPAT_DIUBAH.filter((k) => MENUNGGU_KONFIRMASI.includes(k)).length
  const contoh = KUNCI_DAPAT_DIUBAH.filter((k) => !MENUNGGU_KONFIRMASI.includes(k) && angkaContoh(k)).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Aturan Sistem')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t(
            'Aturan perhitungan yang sedang berlaku. Periode akademik dan syarat kelayakan sertifikat diubah dari halaman ini; aturan lainnya diubah lewat tabel Konfigurasi di basis data, sedangkan bobot dan penilaian aspek lewat halaman Penilaian & Bobot.',
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

      <KartuSyaratSertifikat />

      {/* Ringkasan sebelum tabel: seberapa banyak aturan yang angkanya masih bisa berubah. */}
      <Card className="card-pad">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="text-[14px] text-ink-2">
            <span className="text-[26px] font-extrabold leading-none text-ink">{menunggu}</span>
            <span className="font-bold text-ink-2"> / {jumlah} </span>
            {t('aturan masih menunggu konfirmasi')}
          </p>
          <p className="text-[13px] text-ink-2">
            {t('{n} sudah ditetapkan', { n: jumlah - menunggu - contoh })}
            {contoh ? ' · ' + t('{n} berisi angka contoh', { n: contoh }) : ''}
          </p>
        </div>
        <span aria-hidden="true" className="mt-3 block h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--warning)_22%,transparent)]">
          <span className="block h-full rounded-full bg-[var(--warning)]" style={{ width: Math.round((menunggu / jumlah) * 100) + '%' }} />
        </span>
      </Card>

      <Card className="overflow-hidden">
        <GulirTabel>
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
                      ) : angkaContoh(k) ? (
                        <Badge tone="neutral" icon={IconInfo} className="whitespace-nowrap">{t('Angka contoh')}</Badge>
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
        </GulirTabel>
      </Card>

      <CatatanKaki>
        {t('Menunggu konfirmasi: angka usulan tim yang belum dikonfirmasi unit pengelola, jadi masih bisa berubah.')}{' '}
        {t('Angka contoh: isian awal yang belum dipakai menghitung, sampai unit pengelola menetapkan angka resmi.')}
      </CatatanKaki>
    </div>
  )
}

/** Keadaan satu syarat di daftar: wajib (tidak bisa dimatikan), terjadwal (`mulai`: periode mulainya), aktif, atau nonaktif. */
function LencanaSyarat({ wajib, aktif, mulai = null }) {
  const t = useTeks()
  if (wajib) return <Badge tone="neutral" icon={IconLock} className="whitespace-nowrap">{t('Wajib')}</Badge>
  if (aktif && mulai) {
    return (
      <Badge tone="brand" icon={IconClock} className="whitespace-nowrap">
        {t('Mulai {periode}', { periode: t(labelPeriode(mulai)) })}
      </Badge>
    )
  }
  return aktif ? (
    <Badge tone="good" icon={IconCheck} className="whitespace-nowrap">{t('Aktif')}</Badge>
  ) : (
    <Badge tone="warning" icon={IconX} className="whitespace-nowrap">{t('Nonaktif')}</Badge>
  )
}

const JENIS_SYARAT = {
  manual: 'Ditandai Super Admin per mahasiswa',
  nilai: 'Nilai aspek minimal (otomatis)',
}

/* Isian satu syarat tambahan di formulir; angkanya tetap teks selama diketik. */
const keBaris = (s) => ({
  kunci: s.id,
  id: s.id,
  jenis: s.jenis,
  nama: s.nama ?? '',
  aspekId: s.aspekId ?? '',
  nilaiMin: s.nilaiMin == null ? '' : String(s.nilaiMin),
  aktif: s.aktif,
  pilihMulai: syaratSudahMulai(s) ? 'sekarang' : 'berikutnya',
  mulaiAsli: s.mulai ?? null,
})

/* Periode semester berikutnya untuk baris ini: jadwal yang masih menunggu dipertahankan. */
const periodeJadwal = (d) => (syaratSudahMulai({ mulai: d.mulaiAsli }) ? periodeSetelah(PERIODE_AKTIF, 1) : d.mulaiAsli)

/* Jadwal yang periodenya sudah lewat ikut terkirim apa adanya: bila periode dimundurkan, syaratnya kembali menunggu. */
const mulaiBaris = (d) => {
  if (d.pilihMulai === 'berikutnya') return periodeJadwal(d)
  return syaratSudahMulai({ mulai: d.mulaiAsli }) ? d.mulaiAsli : null
}

const dariBaris = (d) =>
  d.jenis === 'nilai'
    ? {
        id: d.id,
        jenis: 'nilai',
        aspekId: d.aspekId,
        nilaiMin: /^\d{1,3}$/.test(d.nilaiMin) ? Number(d.nilaiMin) : null,
        aktif: d.aktif,
        mulai: mulaiBaris(d),
      }
    : { id: d.id, jenis: 'manual', nama: d.nama, aktif: d.aktif, mulai: mulaiBaris(d) }

/** Satu syarat tambahan di formulir. Jenisnya hanya dipilih saat dibuat, karena tanda mahasiswa menempel pada syaratnya. */
function BarisTambahan({ baris, onUbah, onHapus }) {
  const t = useTeks()
  const baru = baris.id == null
  const manual = baris.jenis === 'manual'
  // Aspek yang sudah diarsipkan tetap jadi pilihan pada baris yang memakainya.
  const pilihanAspek = getAspekList().map((a) => a.id)
  if (baris.aspekId && !pilihanAspek.includes(baris.aspekId)) pilihanAspek.push(baris.aspekId)
  const namaAspek = (id) => {
    const a = getAspek(id)
    return a ? a.kode.replace(/\.$/, '') + ' ' + t(a.nama) : id
  }
  const sebutan = (manual ? baris.nama.trim() : baris.aspekId && namaAspek(baris.aspekId)) || t(JENIS_SYARAT[baris.jenis])

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        {baru ? (
          <Select
            label={t('Jenis syarat')}
            value={baris.jenis}
            onChange={(jenis) => onUbah({ jenis })}
            options={Object.keys(JENIS_SYARAT)}
            tampilkan={(x) => t(JENIS_SYARAT[x])}
          />
        ) : (
          <div>
            <span className="mb-1.5 block label">{t('Jenis syarat')}</span>
            <p className="py-2.5 text-[13.5px] font-semibold text-ink">{t(JENIS_SYARAT[baris.jenis])}</p>
          </div>
        )}
        {manual ? (
          <label className="block">
            <span className="mb-1.5 block label">{t('Nama syarat')}</span>
            <input
              className="field !py-2.5"
              value={baris.nama}
              maxLength={NAMA_SYARAT_MAKS}
              placeholder={t('Contoh: Mengikuti seminar antikorupsi')}
              onChange={(e) => onUbah({ nama: e.target.value })}
              autoFocus={baru}
            />
          </label>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3">
            <Select
              label={t('Aspek')}
              value={baris.aspekId}
              onChange={(aspekId) => onUbah({ aspekId })}
              options={pilihanAspek}
              tampilkan={namaAspek}
              kosong={t('Pilih aspek')}
              className="min-w-0"
            />
            <label className="block">
              <span className="mb-1.5 block label">{t('Nilai minimal')}</span>
              <input
                className="field !py-2.5"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={baris.nilaiMin}
                onChange={(e) => onUbah({ nilaiMin: e.target.value })}
              />
            </label>
          </div>
        )}
        <Select
          label={t('Mulai berlaku')}
          value={baris.pilihMulai}
          onChange={(pilihMulai) => onUbah({ pilihMulai })}
          options={['sekarang', 'berikutnya']}
          tampilkan={(x) =>
            x === 'sekarang'
              ? t('Saat ini juga')
              : t('Semester berikutnya ({periode})', { periode: t(labelPeriode(periodeJadwal(baris))) })
          }
        />
      </div>
      {baris.pilihMulai === 'berikutnya' ? (
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          {t('Mulai diperiksa saat periode akademik dipindah ke {periode}.', { periode: t(labelPeriode(periodeJadwal(baris))) })}
        </p>
      ) : baru && manual ? (
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          {t('Mahasiswa dianggap belum memenuhi sampai ditandai. Supaya tidak ada yang tertahan, pilih mulai semester berikutnya atau matikan Aktif dulu, lalu tandai mahasiswanya.')}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink sm:min-h-0">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--brand-ink)]"
            checked={baris.aktif}
            onChange={(e) => onUbah({ aktif: e.target.checked })}
          />
          {t('Aktif')}
        </label>
        <button
          type="button"
          className="btn-ghost !px-3 !py-2 text-[13px]"
          aria-label={t('Hapus syarat: {nama}', { nama: sebutan })}
          onClick={onHapus}
        >
          <IconX size={15} />
          {t('Hapus')}
        </button>
      </div>
    </div>
  )
}

/**
 * Menandai mahasiswa yang sudah memenuhi satu syarat manual. Kotak centang mengikuti tanda yang tersimpan; yang dikirim hanya
 * selisihnya (`tandai` dan `batalkan`), jadi saringan boleh diganti tanpa menghilangkan centang yang sudah diubah.
 */
function PanelTandaSyarat({ syarat, onBatal, onSelesai }) {
  const t = useTeks()
  const [tersimpan] = useState(() => new Set(STUDENTS.filter((s) => s.syaratTerpenuhi?.includes(syarat.id)).map((s) => s.nim)))
  const [pilih, setPilih] = useState(() => new Set(tersimpan))
  const [angkatan, setAngkatan] = useState('Semua')
  const [saring, setSaring] = useState('semua') // 'semua' | 'sudah' | 'belum'
  const [cari, setCari] = useState('')
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')

  const angkatanAda = COHORTS.filter((c) => STUDENTS.some((s) => s.angkatanId === c.id)).map((c) => c.id)
  const kata = cari.trim().toLowerCase()
  const tampil = STUDENTS.filter(
    (s) =>
      (angkatan === 'Semua' || s.angkatanId === angkatan) &&
      (saring === 'semua' || tersimpan.has(s.nim) === (saring === 'sudah')) &&
      (!kata || s.nim.includes(kata) || s.name.toLowerCase().includes(kata)),
  ).sort((a, b) => a.nim.localeCompare(b.nim))
  const semuaTerpilih = tampil.length > 0 && tampil.every((s) => pilih.has(s.nim))
  const tandai = [...pilih].filter((n) => !tersimpan.has(n))
  const batalkan = [...tersimpan].filter((n) => !pilih.has(n))

  const centang = (nim) =>
    setPilih((x) => {
      const baru = new Set(x)
      if (baru.has(nim)) baru.delete(nim)
      else baru.add(nim)
      return baru
    })
  const centangSemua = () =>
    setPilih((x) => {
      const baru = new Set(x)
      for (const s of tampil) {
        if (semuaTerpilih) baru.delete(s.nim)
        else baru.add(s.nim)
      }
      return baru
    })

  async function kirim(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      await tandaiSyaratSertifikat({ syaratId: syarat.id, tandai, batalkan, alasan: alasan.trim() })
      onSelesai(t('Tanda "{nama}" tersimpan: {a} ditandai, {b} dibatalkan.', { nama: syarat.nama, a: tandai.length, b: batalkan.length }))
    } catch (err) {
      setGalat(t(err.message))
      setSibuk(false)
    }
  }

  return (
    <form onSubmit={kirim} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <p className="text-[13px] leading-relaxed text-ink">
        {t('Centang mahasiswa yang sudah memenuhi "{nama}". Yang tidak dicentang dianggap belum memenuhi syarat ini.', { nama: syarat.nama })}
      </p>
      <div className="flex flex-wrap items-end gap-2.5">
        <Select
          label={t('Angkatan')}
          value={angkatan}
          onChange={setAngkatan}
          options={['Semua', ...angkatanAda]}
          tampilkan={(id) => (id === 'Semua' ? t('Semua angkatan') : t(COHORTS.find((c) => c.id === id)?.label ?? id))}
          className="w-[180px]"
        />
        <Select
          label={t('Status')}
          value={saring}
          onChange={setSaring}
          options={['semua', 'sudah', 'belum']}
          tampilkan={(x) => t({ semua: 'Semua', sudah: 'Sudah ditandai', belum: 'Belum ditandai' }[x])}
          className="w-[180px]"
        />
        <SearchInput
          label={t('Cari mahasiswa')}
          placeholder={t('Cari nama atau NIM')}
          value={cari}
          onChange={setCari}
          className="min-w-[200px] flex-1"
        />
      </div>

      {tampil.length ? (
        <fieldset>
          <legend className="sr-only">{t('Mahasiswa')}</legend>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 border-b border-line px-1 text-[13.5px] font-bold text-ink">
            <input type="checkbox" className="h-4 w-4 accent-[var(--brand-ink)]" checked={semuaTerpilih} onChange={centangSemua} />
            {t('Pilih semua yang tampil ({n})', { n: tampil.length })}
          </label>
          <ul className="max-h-[360px] overflow-y-auto">
            {tampil.map((s) => (
              <li key={s.nim}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 border-b border-line px-1 py-1.5 text-[13.5px] text-ink last:border-b-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[var(--brand-ink)]"
                    checked={pilih.has(s.nim)}
                    onChange={() => centang(s.nim)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-ink-2">{' · NIM ' + s.nim + ' · ' + t('Angkatan {label}', { label: t(s.angkatanLabel) })}</span>
                  </span>
                  <span className={'shrink-0 text-[12.5px] ' + (tersimpan.has(s.nim) ? 'font-semibold text-ink' : 'text-ink-2')}>
                    {t(tersimpan.has(s.nim) ? 'Sudah ditandai' : 'Belum ditandai')}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : (
        <p className="text-[13px] text-ink-2">{t('Tidak ada mahasiswa yang cocok.')}</p>
      )}

      <label className="block max-w-xl">
        <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_SYARAT_MIN })}</span>
        <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
      </label>
      <p className="text-[13px] text-ink-2">
        {t('Akan ditandai: {a} mahasiswa. Tanda dibatalkan: {b} mahasiswa.', { a: tandai.length, b: batalkan.length })}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="submit"
          className="btn-primary"
          disabled={sibuk || (!tandai.length && !batalkan.length) || alasan.trim().length < ALASAN_SYARAT_MIN}
        >
          <IconCheck size={16} />
          {t('Simpan tanda')}
        </button>
        <button type="button" className="btn-ghost" disabled={sibuk} onClick={onBatal}>
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
  )
}

/* Syarat kelayakan cetak sertifikat: nilai akhir minimal bisa diganti, semester dan pengesahan angkatan bisa dimatikan, dan
   syarat baru bisa ditambah. Sebelum disimpan, dampaknya dihitung di peramban dengan aturan yang sama dengan server
   (dampakSyarat). */
function KartuSyaratSertifikat() {
  const t = useTeks()
  const versi = useStore()
  const [draf, setDraf] = useState(null)
  const [dariTambah, setDariTambah] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState('')
  const [panelTanda, setPanelTanda] = useState(null) // id syarat manual yang sedang diatur mahasiswanya
  const tombolUbah = useRef(null)
  const tombolTambah = useRef(null)
  const urutBaris = useRef(0)

  const berlaku = susunanSyarat()
  const semester = CONFIG.TOTAL_SEMESTER_PROGRAM
  const daftar = [
    { id: 'ambang', label: t('Nilai akhir minimal {n}', { n: berlaku.nilaiMinimum }), wajib: true },
    { id: 'final', label: t('Seluruh aspek berstatus final'), wajib: true },
    { id: 'lengkap', label: t('Tidak ada komponen asesmen yang kosong'), wajib: true },
    { id: 'semester', label: t('Sudah menempuh Semester {n}', { n: semester }), aktif: berlaku.syaratSemester },
    { id: 'terkunci', label: t('Nilai angkatan sudah disahkan Kemahasiswaan'), aktif: berlaku.syaratPengesahan },
  ]
  const jumlahTanda = (id) => STUDENTS.filter((m) => m.syaratTerpenuhi?.includes(id)).length

  // Isian dibaca lewat nilai tertunda supaya menghitung seluruh mahasiswa tidak memperlambat ketikan.
  const drafTunda = useDeferredValue(draf)
  const { baru, masalah } = useMemo(() => {
    if (!drafTunda || !/^\d{1,3}$/.test(drafTunda.nilaiMinimum)) return { baru: null, masalah: '' }
    const isi = {
      nilaiMinimum: Number(drafTunda.nilaiMinimum),
      syaratSemester: drafTunda.syaratSemester,
      syaratPengesahan: drafTunda.syaratPengesahan,
      tambahan: drafTunda.tambahan.map(dariBaris),
    }
    const salah = periksaSyarat(isi, susunanSyarat().tambahan)
    return salah ? { baru: null, masalah: salah } : { baru: { ...isi, tambahan: isi.tambahan.map(rapikanTambahan) }, masalah: '' }
    // `versi` berubah setiap data di store berubah, termasuk syarat yang berlaku.
  }, [drafTunda, versi])
  const adaPerubahan = baru != null && !samaSyarat(baru, berlaku)
  const dampak = useMemo(() => {
    if (!adaPerubahan) return null
    const siapCetak = PERMINTAAN_SERTIFIKAT.filter((p) => p.status === 'siap_dicetak').map((p) => p.nim)
    return dampakSyarat(STUDENTS, baru, siapCetak)
  }, [baru, adaPerubahan, versi])
  const dampakSiap = drafTunda === draf && dampak != null
  const angkaSalah = draf != null && (!/^\d{1,3}$/.test(draf.nilaiMinimum) || Number(draf.nilaiMinimum) > 100)
  const tandaTerhapus = draf
    ? berlaku.tambahan
        .filter((s) => s.jenis === 'manual' && !draf.tambahan.some((d) => d.id === s.id))
        .reduce((n, s) => n + jumlahTanda(s.id), 0)
    : 0

  const barisBaru = () => ({
    kunci: 'baru-' + ++urutBaris.current,
    id: null,
    jenis: 'manual',
    nama: '',
    aspekId: '',
    nilaiMin: '',
    aktif: true,
    pilihMulai: 'sekarang',
    mulaiAsli: null,
  })

  function buka(denganBaris) {
    setDraf({
      nilaiMinimum: String(berlaku.nilaiMinimum),
      syaratSemester: berlaku.syaratSemester,
      syaratPengesahan: berlaku.syaratPengesahan,
      tambahan: [...berlaku.tambahan.map(keBaris), ...(denganBaris ? [barisBaru()] : [])],
    })
    setDariTambah(denganBaris)
    setAlasan('')
    setGalat('')
    setPesan('')
    setPanelTanda(null)
  }

  function tutup() {
    flushSync(() => {
      setDraf(null)
      setAlasan('')
      setGalat('')
    })
    const tombol = dariTambah && !tombolTambah.current?.disabled ? tombolTambah : tombolUbah
    tombol.current?.focus()
  }

  function tutupPanel(id, isiPesan = '') {
    flushSync(() => {
      setPanelTanda(null)
      setPesan(isiPesan)
    })
    document.getElementById('atur-syarat-' + id)?.focus()
  }

  async function simpan(e) {
    e.preventDefault()
    if (sibuk || !dampakSiap) return
    setSibuk(true)
    setGalat('')
    try {
      await ubahSyaratSertifikat({ ...baru, alasan: alasan.trim() })
      tutup()
      setPesan(t('Syarat kelayakan tersimpan dan langsung berlaku.'))
    } catch (err) {
      setGalat(t(err.message))
    } finally {
      setSibuk(false)
    }
  }

  const ubahIsian = (kunci, nilai) => setDraf((d) => ({ ...d, [kunci]: nilai }))
  const ubahBaris = (kunci, isi) =>
    setDraf((d) => ({ ...d, tambahan: d.tambahan.map((b) => (b.kunci === kunci ? { ...b, ...isi } : b)) }))
  const hapusBaris = (kunci) => setDraf((d) => ({ ...d, tambahan: d.tambahan.filter((b) => b.kunci !== kunci) }))
  const tambahBaris = () => setDraf((d) => ({ ...d, tambahan: [...d.tambahan, barisBaru()] }))

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconCertificate}
        title={t('Syarat kelayakan cetak sertifikat')}
        subtitle={t('Berlaku untuk seluruh mahasiswa dan diperiksa ulang saat akses cetak diminta, diputuskan, dan dicetak.')}
      />
      <div className="card-pad space-y-4">
        <ul className="divide-y divide-line rounded-xl border border-line">
          {daftar.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5">
              <span className="min-w-0 text-[13.5px] font-semibold text-ink">{s.label}</span>
              <LencanaSyarat wajib={s.wajib} aktif={s.aktif} />
            </li>
          ))}
          {berlaku.tambahan.map((s) => (
            <li key={s.id} className="px-4 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink">{t(...labelSyaratTambahan(s))}</span>
                  <span className="block text-[12.5px] text-ink-2">
                    {s.jenis === 'manual'
                      ? t('Ditandai Super Admin: {n} dari {total} mahasiswa', { n: jumlahTanda(s.id), total: STUDENTS.length })
                      : t('Diperiksa otomatis dari nilai aspek')}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2.5">
                  {s.jenis === 'manual' && !draf ? (
                    <button
                      id={'atur-syarat-' + s.id}
                      type="button"
                      className="btn-ghost !px-3 !py-2 text-[13px]"
                      aria-expanded={panelTanda === s.id}
                      onClick={() => {
                        setPesan('')
                        setPanelTanda((x) => (x === s.id ? null : s.id))
                      }}
                    >
                      <IconUsers size={15} />
                      {t('Atur mahasiswa')}
                    </button>
                  ) : null}
                  <LencanaSyarat aktif={s.aktif} mulai={syaratSudahMulai(s) ? null : s.mulai} />
                </span>
              </div>
              {panelTanda === s.id ? (
                <PanelTandaSyarat
                  syarat={s}
                  onBatal={() => tutupPanel(s.id)}
                  onSelesai={(isi) => tutupPanel(s.id, isi)}
                />
              ) : null}
            </li>
          ))}
        </ul>

        {draf ? (
          <form onSubmit={simpan} className="space-y-4 rounded-xl border border-line bg-surface-2/60 p-4">
            <label className="block max-w-[240px]">
              <span className="mb-1.5 block label">{t('Nilai akhir minimal (0 sampai 100)')}</span>
              <input
                id="syarat-nilai-minimum"
                className="field !py-2.5"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={draf.nilaiMinimum}
                aria-invalid={angkaSalah || undefined}
                aria-describedby={angkaSalah ? 'syarat-nilai-galat' : undefined}
                onChange={(e) => ubahIsian('nilaiMinimum', e.target.value)}
                autoFocus={!dariTambah}
              />
            </label>
            {angkaSalah ? (
              <p id="syarat-nilai-galat" className="text-[13px] font-semibold text-[var(--critical)]">
                {t('Nilai akhir minimal harus bilangan bulat 0 sampai 100.')}
              </p>
            ) : null}

            <fieldset className="space-y-2.5">
              <legend className="mb-1.5 label">{t('Syarat yang bisa dimatikan')}</legend>
              <label className="flex items-start gap-2.5 text-[13.5px] text-ink">
                <input
                  id="syarat-semester"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-ink)]"
                  checked={draf.syaratSemester}
                  onChange={(e) => ubahIsian('syaratSemester', e.target.checked)}
                />
                <span>
                  <span className="block font-semibold">{t('Sudah menempuh Semester {n}', { n: semester })}</span>
                  <span className="block text-[12.5px] text-ink-2">{t('Bila dimatikan, semester mahasiswa tidak lagi diperiksa.')}</span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-[13.5px] text-ink">
                <input
                  id="syarat-pengesahan"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-ink)]"
                  checked={draf.syaratPengesahan}
                  onChange={(e) => ubahIsian('syaratPengesahan', e.target.checked)}
                />
                <span>
                  <span className="block font-semibold">{t('Nilai angkatan sudah disahkan Kemahasiswaan')}</span>
                  <span className="block text-[12.5px] text-ink-2">
                    {t('Bila dimatikan, sertifikat bisa dicetak sebelum nilai angkatan disahkan, jadi nilainya masih bisa berubah sesudah dicetak.')}
                  </span>
                </span>
              </label>
            </fieldset>

            <fieldset className="space-y-2.5">
              <legend className="mb-1.5 label">{t('Syarat tambahan')}</legend>
              {draf.tambahan.map((b) => (
                <BarisTambahan
                  key={b.kunci}
                  baris={b}
                  onUbah={(isi) => ubahBaris(b.kunci, isi)}
                  onHapus={() => hapusBaris(b.kunci)}
                />
              ))}
              {draf.tambahan.length < SYARAT_TAMBAHAN_MAKS ? (
                <button type="button" className="btn-ghost" onClick={tambahBaris}>
                  <IconPlus size={16} />
                  {t('Tambah syarat')}
                </button>
              ) : (
                <p className="text-[12.5px] text-ink-2">
                  {t('Syarat tambahan sudah {n}, batasnya. Hapus yang tidak dipakai untuk menambah yang baru.', { n: SYARAT_TAMBAHAN_MAKS })}
                </p>
              )}
            </fieldset>

            {masalah && !angkaSalah ? (
              <p aria-live="polite" className="text-[13px] font-semibold text-ink-2">
                {t(masalah)}
              </p>
            ) : null}

            {dampakSiap ? (
              <div className="space-y-2">
                <p className="text-[13.5px] font-bold text-ink">{t('Dampak bila disimpan')}</p>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  {t('Mahasiswa yang berhak: {sebelum} menjadi {sesudah} dari {total}.', {
                    sebelum: dampak.layakSebelum,
                    sesudah: dampak.layakSesudah,
                    total: dampak.total,
                  })}{' '}
                  {t('{naik} menjadi berhak, {turun} tidak lagi berhak.', { naik: dampak.jadiLayak, turun: dampak.tidakLagiLayak })}
                </p>
                {dampak.aksesTerhenti ? (
                  <p className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-ink">
                    <IconAlert size={16} className="mt-px shrink-0" />
                    {t('{n} mahasiswa yang sudah punya akses cetak tidak bisa mencetak sampai memenuhi syarat ini.', { n: dampak.aksesTerhenti })}
                  </p>
                ) : null}
                {dampak.akanTertahan ? (
                  <p className="text-[13px] leading-relaxed text-ink-2">
                    {t('Saat mulai berlaku, {n} mahasiswa yang sekarang berhak akan tertahan sampai memenuhinya.', { n: dampak.akanTertahan })}
                  </p>
                ) : null}
                {tandaTerhapus ? (
                  <p className="text-[13px] leading-relaxed text-ink-2">
                    {t('{n} tanda mahasiswa pada syarat yang dihapus ikut terhapus.', { n: tandaTerhapus })}
                  </p>
                ) : null}
              </div>
            ) : null}

            <label className="block max-w-xl">
              <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_SYARAT_MIN })}</span>
              <input id="syarat-alasan" className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="submit"
                className="btn-primary"
                disabled={sibuk || !dampakSiap || alasan.trim().length < ALASAN_SYARAT_MIN}
              >
                <IconCheck size={16} />
                {t('Simpan syarat')}
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
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <button ref={tombolUbah} type="button" className="btn-primary" onClick={() => buka(false)}>
              <IconPencil size={16} />
              {t('Ubah syarat')}
            </button>
            <button
              ref={tombolTambah}
              type="button"
              className="btn-ghost"
              disabled={berlaku.tambahan.length >= SYARAT_TAMBAHAN_MAKS}
              onClick={() => buka(true)}
            >
              <IconPlus size={16} />
              {t('Tambah syarat')}
            </button>
          </div>
        )}

        {pesan ? (
          <p role="status" className="text-[13px] font-semibold text-ink">
            {pesan}
          </p>
        ) : null}

        <p className="text-[12.5px] text-ink-3">
          {t('Syarat bertanda Wajib tidak bisa dimatikan karena lembar sertifikat memuat nilai akhir dan menyatakan seluruh aspek sudah diselesaikan. Setiap perubahan tercatat di Log Aktivitas beserta alasannya.')}
        </p>
      </div>
    </Card>
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
  const versi = useStore()
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
  // Memindah periode bisa membuat syarat sertifikat yang dijadwalkan mulai berlaku, jadi akibatnya disebut sebelum disimpan.
  const syaratPindah = useMemo(() => (tujuan ? syaratSaatPindahPeriode(tujuan, STUDENTS) : null), [tujuan, versi])
  const sebutSyarat = (isi) => isi.map((s) => t(...labelSyaratTambahan(s))).join(', ')

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
      setGalat(t(err.message))
    } finally {
      setSibuk(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconCalendar}
        title={t('Periode akademik')}
        subtitle={t('Semester tiap mahasiswa, siapa yang sudah lewat Semester 3, dan angkatan yang nilainya boleh disahkan dihitung dari periode ini.')}
      />
      <div className="card-pad space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-[24px] font-extrabold leading-tight text-ink">{t(labelPeriode(PERIODE_AKTIF))}</p>
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
              <GulirTabel>
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
                            {t(c.label)}
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
              </GulirTabel>
            ) : (
              <p className="text-[13px] text-ink-2">{t('Belum ada angkatan yang terdampak.')}</p>
            )}
            {jadiSelesai ? (
              <p className="text-[13px] leading-relaxed text-ink">
                {t(
                  '{n} angkatan akan lewat Semester {batas}: mahasiswanya tidak lagi ditangani dosen, perubahan datanya oleh admin biasa perlu persetujuan Super Admin, dan nilai angkatannya boleh disahkan.',
                  { n: jadiSelesai, batas },
                )}
              </p>
            ) : null}
            {batalSelesai ? (
              <p className="text-[13px] leading-relaxed text-ink">
                {t('{n} angkatan akan kembali ke Semester {batas} dan kembali ditangani dosen.', { n: batalSelesai, batas })}
              </p>
            ) : null}
            {syaratPindah?.mulai.length ? (
              <p className="text-[13px] leading-relaxed text-ink">
                {t('Syarat sertifikat yang mulai berlaku: {daftar}.', { daftar: sebutSyarat(syaratPindah.mulai) })}
                {syaratPindah.tertahan
                  ? ' ' + t('{n} mahasiswa yang sekarang berhak akan tertahan sampai memenuhinya.', { n: syaratPindah.tertahan })
                  : ''}
              </p>
            ) : null}
            {syaratPindah?.batal.length ? (
              <p className="text-[13px] leading-relaxed text-ink">
                {t('Syarat sertifikat yang kembali belum berlaku: {daftar}.', { daftar: sebutSyarat(syaratPindah.batal) })}
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
