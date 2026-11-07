import { useState } from 'react'
import { Badge, Card, CardHeader, GulirTabel } from '../../components/Ui'
import {
  IconAlert,
  IconBook,
  IconBuilding,
  IconChat,
  IconCheck,
  IconCheckShield,
  IconClock,
  IconHapus,
  IconLock,
  IconMinus,
  IconPencil,
  IconPlus,
  IconUndo,
  IconUpload,
} from '../../components/Icons'
import { useTeks } from '../../lib/bahasa'
import { MATRIKS_SA, ubahWewenang, useStore } from '../../lib/store'
import { MATRIKS, PERAN, TAMBAHAN_MAKS, boleh, kunciSel, sakelar } from '../../lib/wewenang'
import { FormArsip, FormKeterangan, FormTindakan } from './UbahMatriks'

/* Matriks wewenang tiap peran (MATRIKS di src/lib/wewenang.js, diturunkan dari aturan server). Empat sel bertanda
   `sakelar` bisa ditutup Super Admin untuk sementara lalu dibuka lagi (/api/wewenang); server ikut menolak tindakan yang
   ditutup. Lewat "Ubah matriks", setiap sel bisa diberi keterangan dan baris kebijakan tertulis bisa ditambahkan
   (/api/wewenang/matriks, formulirnya di UbahMatriks.jsx); keduanya hanya tulisan, tidak dijaga server. Isi Ya/Tidak
   baris bawaan dan peran akun tidak diubah dari sini. Lihat README.md › Panel Super Admin › Peran & Wewenang. */

const SUPER = PERAN.indexOf('Super Admin')

// Sama dengan ALASAN_MIN di src/server/nilai.js; server tetap yang memutuskan.
const ALASAN_MIN = 10

// Ikon per peran, menurut pekerjaan utamanya: melihat capaian, mengunggah nilai, mengelola, mengawasi.
const IKON_PERAN = { Mahasiswa: IconBook, Dosen: IconUpload, Kemahasiswaan: IconBuilding, 'Super Admin': IconCheckShield }

// Susunan sejak rapat 24 Okt 2026: dosen mengunggah nilai kelasnya, admin hanya membaca nilai dan data master, super
// admin memegang keduanya.
const RINGKAS_PERAN = {
  Mahasiswa: 'Melihat capaiannya sendiri, mengajukan koreksi bila nilainya keliru, dan meminta akses cetak sertifikat.',
  Dosen: 'Mengunggah nilai angkatan yang diampunya lewat Excel dan memantau hasilnya; perbaikan untuk angkatan yang sudah disahkan diajukan ke Super Admin.',
  Kemahasiswaan:
    'Membaca nilai dan memantau kelengkapannya, memutuskan lapis pertama pengajuan koreksi, meninjau akses cetak sertifikat dan meneruskannya dengan rekomendasi, serta mengurus angkatan dan kurikulum.',
  'Super Admin':
    'Wewenang tertinggi: memegang nilai dan data master, memutuskan lapis kedua koreksi dan akses cetak sertifikat, menyetujui permintaan admin, mengatur penilaian dan akses, dan mengawasi seluruh jejak.',
}

const PRINSIP = [
  ['Wewenang secukupnya', 'Setiap peran hanya bisa melakukan yang dibutuhkan tugasnya.'],
  ['Yang meminta tidak menyetujui', 'Admin mengajukan, Super Admin memutuskan. Tidak ada yang menyetujui permintaannya sendiri.'],
  ['Dijaga di server', 'Setiap pintu API memeriksa ulang peran pengirimnya. Menyembunyikan tombol saja tidak cukup.'],
  ['Semua tercatat', 'Pengajuan, keputusan, dan penarikan masuk Log Aktivitas dan tidak bisa dihapus dari website.'],
]

/**
 * Isi sel peran ke-`i` pada baris `m` yang berlaku saat ini: sel yang sakelarnya ditutup Super Admin terbaca 'ditutup',
 * apa pun isi aslinya. Sel yang ikut sakelar baris lain membawa id sakelar itu sebagai catatannya.
 */
function selBerlaku(m, i) {
  const milik = m.sakelar?.[PERAN[i]]
  const ikut = m.ikut?.[PERAN[i]]
  if (milik && !boleh(milik)) return ['ditutup']
  if (ikut && !boleh(ikut)) return ['ditutup', ikut]
  return m.izin[i]
}

/**
 * Jumlah tindakan yang boleh dilakukan peran ke-`i` (langsung atau bersyarat) dan yang harus lewat persetujuan. Hanya
 * baris bawaan yang dihitung: kebijakan tertulis tidak dijaga server.
 */
function hitungIzin(i) {
  const jenis = MATRIKS.map((m) => selBerlaku(m, i)[0])
  return {
    boleh: jenis.filter((j) => j === 'ya' || j === 'syarat').length,
    minta: jenis.filter((j) => j === 'minta').length,
  }
}

function Sel({ izin }) {
  const t = useTeks()
  const [jenis, catatan] = izin
  // Setiap keadaan punya ikon dan tulisannya sendiri, jadi tidak bergantung pada warna saja.
  if (jenis === 'tidak') {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] text-ink-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3 ring-1 ring-line">
          <IconMinus size={12} />
        </span>
        {t('Tidak')}
      </span>
    )
  }
  // Ditutup sementara lewat sakelar: berbeda dari Tidak, karena bisa dibuka lagi dari halaman ini.
  if (jenis === 'ditutup') {
    return (
      <span className="inline-flex items-start gap-2 text-[13px] font-semibold text-[var(--warning-ink)]">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--warning)_22%,transparent)]">
          <IconLock size={12} />
        </span>
        <span>
          {t('Ditutup sementara')}
          <span className="block font-normal text-ink-2">
            {catatan
              ? t('ikut tertutup bersama "{tindakan}"', { tindakan: t(sakelar(catatan).tindakan) })
              : t('oleh Super Admin, bisa dibuka lagi')}
          </span>
        </span>
      </span>
    )
  }
  if (jenis === 'minta') {
    return (
      <span className="inline-flex items-start gap-2 text-[13px] font-semibold text-[var(--warning-ink)]">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--warning)_22%,transparent)]">
          <IconClock size={12} />
        </span>
        {t('Selalu perlu persetujuan')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-start gap-2 text-[13px] font-semibold text-ink">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--good)_16%,transparent)] text-[var(--good)]">
        <IconCheck size={12} strokeWidth={2.4} />
      </span>
      <span>
        {t('Ya')}
        {catatan ? <span className="block font-normal text-ink-2">{t(catatan)}</span> : null}
      </span>
    </span>
  )
}

/** Keterangan Super Admin di bawah isi sel; warna dan ikonnya berbeda dari catatan bawaan supaya tidak tertukar. */
function CatatanSel({ teks }) {
  const t = useTeks()
  if (!teks) return null
  return (
    <span className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-brand-ink">
      <IconChat size={13} className="mt-0.5 shrink-0" />
      <span>
        <span className="font-semibold">{t('Catatan')}:</span> {teks}
      </span>
    </span>
  )
}

/** Tombol di sel bersakelar: membuka formulir alasan di bawah tabel untuk menutup atau membuka lagi tindakannya. */
function TombolSakelar({ id, aktif, onPilih }) {
  const t = useTeks()
  const s = sakelar(id)
  const terbuka = boleh(id)
  const isi = { tindakan: t(s.tindakan), peran: t(s.peran) }
  return (
    <button
      type="button"
      onClick={() => onPilih(id)}
      aria-expanded={aktif}
      aria-controls={aktif ? 'ubah-sakelar' : undefined}
      aria-label={terbuka ? t('Tutup sementara: {tindakan} ({peran})', isi) : t('Buka lagi: {tindakan} ({peran})', isi)}
      className={'btn-ghost mt-2 min-h-[36px] whitespace-nowrap !px-3 !py-1 text-[12.5px] ' + (aktif ? 'bg-surface-2 text-ink' : '')}
    >
      {terbuka ? <IconLock size={14} /> : <IconUndo size={14} />}
      {t(terbuka ? 'Tutup sementara' : 'Buka lagi')}
    </button>
  )
}

/** Tombol keterangan di setiap sel selama mode ubah. `tindakan` sudah dalam bahasa layar. */
function TombolKeterangan({ ada, tindakan, peran, aktif, onPilih }) {
  const t = useTeks()
  const isi = { tindakan, peran: t(peran) }
  return (
    <button
      type="button"
      onClick={onPilih}
      aria-expanded={aktif}
      aria-controls={aktif ? 'ubah-matriks' : undefined}
      aria-label={ada ? t('Ubah keterangan: {tindakan} ({peran})', isi) : t('Tambah keterangan: {tindakan} ({peran})', isi)}
      className={
        'mt-2 inline-flex min-h-[32px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[12px] font-semibold text-brand-ink transition hover:bg-surface-2 ' +
        (aktif ? 'bg-surface-2' : '')
      }
    >
      <IconPencil size={13} />
      {t(ada ? 'Ubah keterangan' : 'Tambah keterangan')}
    </button>
  )
}

/** Formulir menutup atau membuka lagi sakelar `id`, dengan dampak dan alasan wajib. */
function UbahSakelar({ id, onSelesai, onBatal }) {
  const t = useTeks()
  const s = sakelar(id)
  const menutup = boleh(id)
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const kurang = alasan.trim().length < ALASAN_MIN

  async function simpan(e) {
    e.preventDefault()
    if (sibuk || kurang) return
    setSibuk(true)
    setGalat('')
    try {
      await ubahWewenang({ id, boleh: !menutup, alasan: alasan.trim() })
      const isi = { tindakan: t(s.tindakan), peran: t(s.peran) }
      onSelesai(
        menutup
          ? { teks: t('"{tindakan}" untuk {peran} sekarang ditutup. Server menolaknya mulai permintaan berikutnya.', isi), tutup: true }
          : { teks: t('"{tindakan}" untuk {peran} sudah dibuka lagi.', isi) },
      )
    } catch (err) {
      setGalat(t(err.message))
      setSibuk(false)
    }
  }

  return (
    <form id="ubah-sakelar" onSubmit={simpan} className="space-y-4 border-t border-line bg-surface-2/60 px-5 py-5 sm:px-6">
      <div>
        <p className="text-[14px] font-bold text-ink">
          {menutup ? t('Tutup sementara: {tindakan}', { tindakan: t(s.tindakan) }) : t('Buka lagi: {tindakan}', { tindakan: t(s.tindakan) })}
          <span className="ml-2 text-[12.5px] font-semibold text-ink-2">{t(s.peran)}</span>
        </p>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          {menutup
            ? t(s.dampak)
            : t('Tindakan ini kembali seperti semula dan langsung diterima server lagi. Pengguna yang halamannya sudah terbuka melihat tombolnya kembali setelah datanya dimuat ulang.')}
        </p>
      </div>
      <label className="block max-w-xl">
        <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_MIN })}</span>
        <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus />
      </label>
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn-primary" disabled={sibuk || kurang}>
          {menutup ? <IconLock size={16} /> : <IconCheck size={16} />}
          {t(menutup ? 'Tutup sekarang' : 'Buka sekarang')}
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

/* Formulir yang sedang terbuka di bawah tabel, satu saja sekaligus:
   { jenis: 'sakelar', id } · { jenis: 'keterangan', baris, peran } · { jenis: 'tindakan', id? } · { jenis: 'arsip', id, aksi } */
const samaFormulir = (a, b) => Boolean(a && b) && JSON.stringify(a) === JSON.stringify(b)

export default function Wewenang() {
  useStore()
  const t = useTeks()
  const [modeUbah, setModeUbah] = useState(false)
  const [formulir, setFormulir] = useState(null)
  // Kabar sesudah satu perubahan tersimpan: { teks, tutup } (tutup = sakelar baru ditutup, ikonnya gembok).
  const [kabar, setKabar] = useState(null)

  const tambahanAktif = MATRIKS_SA.tambahan.filter((b) => b.aktif)
  const tambahanArsip = MATRIKS_SA.tambahan.filter((b) => !b.aktif)
  const keteranganSel = (baris, peran) => MATRIKS_SA.keterangan[kunciSel(baris, peran)] ?? ''

  const buka = (f) => {
    setKabar(null)
    setFormulir((lama) => (samaFormulir(lama, f) ? null : f))
  }
  const tutupFormulir = () => setFormulir(null)
  const selesai = (hasil) => {
    setFormulir(null)
    setKabar(hasil)
  }
  const gantiMode = () => {
    setModeUbah((m) => !m)
    setFormulir(null)
    setKabar(null)
  }

  /** Isi sel peran `p` milik baris `baris` (kode atau 'T-<id>'), tombol keterangannya bila mode ubah. */
  const bagianKeterangan = (baris, namaTampil, p) => (
    <>
      <CatatanSel teks={keteranganSel(baris, p)} />
      {modeUbah ? (
        <span className="block">
          <TombolKeterangan
            ada={Boolean(keteranganSel(baris, p))}
            tindakan={namaTampil}
            peran={p}
            aktif={samaFormulir(formulir, { jenis: 'keterangan', baris, peran: p })}
            onPilih={() => buka({ jenis: 'keterangan', baris, peran: p })}
          />
        </span>
      ) : null}
    </>
  )
  const kelasSel = (i) => 'px-3 py-3 ' + (i === SUPER ? 'bg-[color-mix(in_srgb,var(--brand-soft)_60%,transparent)]' : '')

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Peran & Wewenang')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t('Siapa boleh melakukan apa di VIBE. Empat tindakan bisa Anda tutup sementara lalu buka lagi, dan lewat Ubah matriks setiap sel bisa diberi keterangan serta kebijakan tertulis bisa ditambahkan. Isi Ya/Tidak lainnya ditetapkan server, dan peran akun diatur lewat basis data.')}
        </p>
      </header>

      {/* Kartu Super Admin navy seperti di rantai pengawasan Pusat Kendali: peran pembaca halaman ini. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PERAN.map((p, i) => {
          const Ikon = IKON_PERAN[p]
          const anda = i === SUPER
          const { boleh: jumlahBoleh, minta } = hitungIzin(i)
          return (
            <div
              key={p}
              className={
                'flex flex-col rounded-2xl p-5 sm:p-6 ' +
                (anda ? 'kartu-aurora relative text-white dark:ring-1 dark:ring-white/10' : 'card')
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' +
                    (anda ? 'bg-white/10 text-[var(--accent)]' : 'bg-brand-soft text-brand-ink')
                  }
                >
                  <Ikon size={18} />
                </span>
                <p className={'text-[15px] font-extrabold ' + (anda ? '' : 'text-ink')}>
                  {t(p)}
                  {anda ? (
                    <span className="ml-2 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--accent)]">{t('Anda')}</span>
                  ) : null}
                </p>
              </div>
              <p className={'mt-3 text-[13px] leading-snug ' + (anda ? 'text-white/80' : 'text-ink-2')}>{t(RINGKAS_PERAN[p])}</p>
              <p className={'mt-auto pt-4 text-[12.5px] font-semibold ' + (anda ? 'text-white/85' : 'text-ink-2')}>
                {t('Boleh {n} dari {total} tindakan', { n: jumlahBoleh, total: MATRIKS.length })}
                {minta ? (
                  <span className={'block font-normal ' + (anda ? 'text-white/75' : 'text-ink-2')}>
                    {t('{n} lainnya lewat persetujuan Super Admin', { n: minta })}
                  </span>
                ) : null}
              </p>
            </div>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          icon={IconCheckShield}
          title={t('Matriks wewenang')}
          subtitle={t('Mengikuti aturan yang dijaga server saat ini.')}
          action={
            MATRIKS_SA.siap ? (
              <button
                type="button"
                onClick={gantiMode}
                aria-pressed={modeUbah}
                className={(modeUbah ? 'btn-primary' : 'btn-ghost') + ' min-h-[40px] !px-3.5 !py-2 text-[13px]'}
              >
                {modeUbah ? <IconCheck size={15} /> : <IconPencil size={15} />}
                {t(modeUbah ? 'Selesai mengubah' : 'Ubah matriks')}
              </button>
            ) : null
          }
        />
        {MATRIKS_SA.siap ? null : (
          <p className="flex items-start gap-2 border-b border-line px-5 py-3 text-[13px] text-ink-2 sm:px-6">
            <IconAlert size={16} className="mt-px shrink-0" />
            {t('Keterangan dan kebijakan tertulis belum bisa dimuat, jadi matriks belum bisa diubah. Muat ulang halaman; bila tetap begini, server perlu dinyalakan ulang sesudah migrasi basis data.')}
          </p>
        )}
        <GulirTabel>
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[12px] font-bold uppercase tracking-[.06em] text-ink-2">
                <th className="px-5 py-3 sm:px-6">{t('Tindakan')}</th>
                {PERAN.map((p, i) => (
                  <th key={p} className={'px-3 py-3 ' + (i === SUPER ? 'bg-brand-soft text-brand-ink' : '')}>
                    {t(p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIKS.map((m) => (
                <tr key={m.kode} className="border-b border-line align-top last:border-b-0">
                  <th scope="row" className="px-5 py-3 text-[13.5px] font-semibold text-ink sm:px-6">
                    {t(m.tindakan)}
                  </th>
                  {/* Kolom Super Admin diberi latar merek tipis: itu kolom pembaca halaman ini. */}
                  {PERAN.map((p, i) => {
                    const id = m.sakelar?.[p]
                    return (
                      <td key={p} className={kelasSel(i)}>
                        <Sel izin={selBerlaku(m, i)} />
                        {bagianKeterangan(m.kode, t(m.tindakan), p)}
                        {id ? (
                          <span className="block">
                            <TombolSakelar
                              id={id}
                              aktif={samaFormulir(formulir, { jenis: 'sakelar', id })}
                              onPilih={() => buka({ jenis: 'sakelar', id })}
                            />
                          </span>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Kebijakan tertulis: baris dari Super Admin, terpisah dari aturan server dan tidak ikut dihitung di kartu peran. */}
              {tambahanAktif.length ? (
                <tr className="border-b border-line bg-surface-2">
                  <th colSpan={PERAN.length + 1} scope="colgroup" className="px-5 py-2.5 sm:px-6">
                    <span className="text-[12px] font-bold uppercase tracking-[.06em] text-ink-2">{t('Kebijakan tertulis')}</span>
                    <span className="ml-2 text-[12.5px] font-normal text-ink-2">
                      {t('Ditambah Super Admin. Hanya tulisan: server tidak menjalankannya.')}
                    </span>
                  </th>
                </tr>
              ) : null}
              {tambahanAktif.map((b) => (
                <tr key={b.id} className="border-b border-line align-top last:border-b-0">
                  <th scope="row" className="px-5 py-3 text-[13.5px] font-semibold text-ink sm:px-6">
                    {b.tindakan}
                    <span className="mt-1.5 block">
                      <Badge>{t('Tidak dijaga server')}</Badge>
                    </span>
                    {modeUbah ? (
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => buka({ jenis: 'tindakan', id: b.id })}
                          aria-label={t('Ubah kebijakan: {tindakan}', { tindakan: b.tindakan })}
                          className="btn-ghost min-h-[32px] !px-2.5 !py-1 text-[12px]"
                        >
                          <IconPencil size={13} />
                          {t('Ubah')}
                        </button>
                        <button
                          type="button"
                          onClick={() => buka({ jenis: 'arsip', id: b.id, aksi: 'arsipkan' })}
                          aria-label={t('Arsipkan kebijakan: {tindakan}', { tindakan: b.tindakan })}
                          className="btn-ghost min-h-[32px] !px-2.5 !py-1 text-[12px]"
                        >
                          <IconHapus size={13} />
                          {t('Arsipkan')}
                        </button>
                      </span>
                    ) : null}
                  </th>
                  {PERAN.map((p, i) => (
                    <td key={p} className={kelasSel(i)}>
                      <Sel izin={b.izin[p] === 'syarat' ? ['syarat', 'dengan syarat'] : [b.izin[p]]} />
                      {bagianKeterangan(b.id, b.tindakan, p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </GulirTabel>

        {modeUbah ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => buka({ jenis: 'tindakan' })}
              disabled={tambahanAktif.length >= TAMBAHAN_MAKS}
              aria-expanded={samaFormulir(formulir, { jenis: 'tindakan' })}
              className="btn-ghost min-h-[40px] text-[13px]"
            >
              <IconPlus size={15} />
              {t('Tambah tindakan')}
            </button>
            <p className="max-w-xl text-[12.5px] leading-relaxed text-ink-2">
              {tambahanAktif.length >= TAMBAHAN_MAKS
                ? t('Kebijakan tertulis sudah {n} baris, batasnya. Arsipkan yang tidak dipakai lagi untuk menambah yang baru.', { n: TAMBAHAN_MAKS })
                : t('Isi Ya/Tidak baris bawaan mengikuti server. Yang bisa diubah di sini: keterangan tiap sel dan baris kebijakan tertulis.')}
            </p>
          </div>
        ) : null}

        {modeUbah && tambahanArsip.length ? (
          <details className="border-t border-line px-5 py-3.5 sm:px-6">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">
              {t('Diarsipkan ({n})', { n: tambahanArsip.length })}
            </summary>
            <ul className="mt-2 divide-y divide-line">
              {tambahanArsip.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
                  <span className="text-ink">{b.tindakan}</span>
                  <button
                    type="button"
                    onClick={() => buka({ jenis: 'arsip', id: b.id, aksi: 'pulihkan' })}
                    aria-label={t('Pulihkan kebijakan: {tindakan}', { tindakan: b.tindakan })}
                    className="btn-ghost min-h-[36px] !px-3 !py-1 text-[12.5px]"
                  >
                    <IconUndo size={14} />
                    {t('Pulihkan')}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {kabar ? (
          <p role="status" className="flex items-start gap-2 border-t border-line px-5 py-3.5 text-[13.5px] font-semibold text-ink sm:px-6">
            {kabar.tutup ? (
              <IconLock size={17} className="mt-px shrink-0 text-[var(--warning-ink)]" />
            ) : (
              <IconCheck size={17} className="mt-px shrink-0 text-[var(--good)]" />
            )}
            {kabar.teks}
          </p>
        ) : null}

        {formulir?.jenis === 'sakelar' ? (
          <UbahSakelar key={formulir.id} id={formulir.id} onSelesai={selesai} onBatal={tutupFormulir} />
        ) : null}
        {formulir?.jenis === 'keterangan' ? (
          <FormKeterangan
            key={formulir.baris + '|' + formulir.peran}
            baris={formulir.baris}
            peran={formulir.peran}
            onSelesai={(teks) => selesai({ teks })}
            onBatal={tutupFormulir}
          />
        ) : null}
        {formulir?.jenis === 'tindakan' ? (
          <FormTindakan key={formulir.id ?? 'baru'} id={formulir.id} onSelesai={(teks) => selesai({ teks })} onBatal={tutupFormulir} />
        ) : null}
        {formulir?.jenis === 'arsip' ? (
          <FormArsip
            key={formulir.id + formulir.aksi}
            id={formulir.id}
            aksi={formulir.aksi}
            onSelesai={(teks) => selesai({ teks })}
            onBatal={tutupFormulir}
          />
        ) : null}

        <p className="border-t border-line px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-3 sm:px-6">
          {t('Tindakan yang ditutup langsung ditolak server, dan tombolnya hilang dari layar pengguna setelah datanya dimuat ulang. Keterangan dan kebijakan tertulis hanya tulisan: server tidak menjalankannya. Setiap perubahan tercatat di Log Aktivitas beserta alasannya.')}
        </p>
      </Card>

      <Card className="card-pad">
        <h2 className="text-[15px] font-bold text-ink">{t('Prinsip yang dipakai')}</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {PRINSIP.map(([judul, isi]) => (
            <li key={judul}>
              <p className="text-[14px] font-bold text-ink">{t(judul)}</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{t(isi)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
