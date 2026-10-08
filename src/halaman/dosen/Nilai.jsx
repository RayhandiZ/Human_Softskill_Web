'use client'

import { useMemo, useRef, useState } from 'react'
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
  StatusTeks,
  Tabs,
} from '../../components/Ui'
import {
  IconAlert,
  IconCheckShield,
  IconDownload,
  IconPencil,
  IconUpload,
  IconX,
} from '../../components/Icons'
import { SUMBER, getKomponenById } from '../../lib/curriculum'
import { susunCSV, unduhBerkas, uraiCSV } from '../../lib/csv'
import { SKALA_PILIHAN, bacaAngka, deteksiSkala, konversi, skorKecocokan } from '../../lib/ingest'
import { dosenSesi, komponenDosen, pengumpulanDosen } from '../../lib/data'
import { statusPengumpulan, useStore, usulkanNilai } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { LencanaStatus, RUPA_STATUS } from './status'
import { useTeks } from '../../lib/bahasa'

/* Dosen tidak pernah memanggil simpanBatch(); jalan keluarnya hanya usulkanNilai(); lihat README.md › Usulan nilai dosen. */

const BISA_DINILAI = new Set(['masuk', 'ditolak'])

export default function NilaiDosen() {
  const t = useTeks()
  const versi = useStore()
  const { user } = useAuth()
  const dosen = useMemo(() => dosenSesi(user), [user])
  const params = useSearchParams()

  const daftarKomponen = useMemo(() => komponenDosen(dosen), [dosen])

  const [komponenId, setKomponenId] = useState(() => {
    const dari = params?.get('komponen')
    return daftarKomponen.some((k) => k.id === dari) ? dari : (daftarKomponen[0]?.id ?? null)
  })
  const [cari, setCari] = useState(() => params?.get('cari') ?? '')
  const [tab, setTab] = useState('manual')
  const [catatan, setCatatan] = useState('')
  const [terkirim, setTerkirim] = useState(null)
  const [galat, setGalat] = useState('')

  const komponen = komponenId ? getKomponenById(komponenId) : null

  const baris = useMemo(() => {
    if (!dosen || !komponenId) return []
    return pengumpulanDosen(dosen.nip)
      .filter((p) => p.komponenId === komponenId)
      .map((p) => ({ ...p, status: statusPengumpulan(p) }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [dosen, komponenId, versi])

  const bisa = baris.filter((b) => BISA_DINILAI.has(b.status.id))

  async function kirim(entri, cara) {
    setGalat('')
    try {
      const usulan = await usulkanNilai({ dosen, cara, catatan, entri })
      setCatatan('')
      setTerkirim(usulan)
      return true
    } catch (e) {
      setGalat(e.message)
      return false
    }
  }

  if (!dosen) {
    return (
      <EmptyState title={t('Akun ini belum terdaftar sebagai dosen pengampu')}>
        {t('Hubungi Biro Kemahasiswaan untuk didaftarkan pada satu kelas.')}
      </EmptyState>
    )
  }

  if (!daftarKomponen.length) {
    return (
      <EmptyState title={t('Belum ada komponen yang bisa dinilai')}>
        {t('Kelas {unit} Semester {semester} belum memiliki komponen asesmen pada kurikulum yang berlaku.', {
          unit: SUMBER[dosen.sumber]?.label,
          semester: dosen.semester,
        })}
      </EmptyState>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Input nilai')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t('Isi sendiri satu per satu, atau unggah berkas nilai dari kelas Anda. Keduanya berakhir di tempat yang sama: antrean persetujuan Biro Kemahasiswaan.')}
        </p>
      </header>

      {terkirim ? (
        <HasilUsulan usulan={terkirim} onTutup={() => setTerkirim(null)} />
      ) : null}

      <Card>
        <CardHeader
          title={t('Pilih tugas yang dinilai')}
          subtitle={t('Semester {n}', { n: dosen.semester }) + ' · ' + dosen.prodi}
          icon={IconPencil}
        />
        <div className="px-5 py-4 sm:px-6">
          <Select
            label={t('Tugas / komponen asesmen')}
            value={komponen ? komponen.id + ' · ' + komponen.label : ''}
            onChange={(v) => {
              setKomponenId(v.split(' · ')[0])
              setTerkirim(null)
            }}
            options={daftarKomponen.map((k) => k.id + ' · ' + k.label)}
            className="max-w-xl"
          />
          {komponen?.status === 'draft' ? (
            <p className="mt-3 text-[12.5px] font-bold text-[var(--critical)]">
              {t('Skema komponen ini belum final di kurikulum. Nilainya tetap bisa diusulkan.')}
            </p>
          ) : null}
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            {t('{n} mahasiswa mengumpulkan tugas ini; {sisa} di antaranya belum bernilai.', {
              n: baris.length,
              sisa: bisa.length,
            })}
          </p>
        </div>
      </Card>

      {bisa.length === 0 && baris.length > 0 ? (
        <Card>
          <EmptyState title={t('Semua pengumpulan tugas ini sudah Anda tangani')}>
            {t('Yang tersisa hanya menunggu keputusan Kemahasiswaan atau sudah tercatat. Pilih tugas lain di atas untuk melanjutkan.')}
          </EmptyState>
        </Card>
      ) : null}

      {baris.length === 0 ? (
        <Card>
          <EmptyState title={t('Belum ada yang mengumpulkan tugas ini')}>
            {t('Nilai hanya bisa diisi untuk mahasiswa yang berkasnya sudah masuk.')}
          </EmptyState>
        </Card>
      ) : null}

      {bisa.length ? (
        <Card>
          <CardHeader
            title={t('Isi nilainya')}
            subtitle={t('Kedua cara di bawah menghasilkan usulan yang sama')}
            icon={IconUpload}
            action={
              <Tabs
                items={[
                  { value: 'manual', label: t('Manual'), count: bisa.length },
                  { value: 'import', label: t('Otomatis') },
                ]}
                value={tab}
                onChange={setTab}
              />
            }
          />

          <div className="border-b border-line px-5 py-4 sm:px-6">
            <label className="block max-w-xl">
              <span className="mb-1.5 block label">
                {t('Catatan untuk Kemahasiswaan (opsional)')}
              </span>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder={t('Misalnya: nilai sudah termasuk penyesuaian keterlambatan.')}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 transition hover:border-line-strong"
              />
            </label>
          </div>

          {tab === 'manual' ? (
            <IsiManual
              galat={galat}
              baris={baris}
              bisa={bisa}
              cari={cari}
              setCari={setCari}
              onKirim={(entri) => kirim(entri, 'manual')}
            />
          ) : (
            <IsiOtomatis
              galatKirim={galat}
              komponen={komponen}
              baris={baris}
              bisa={bisa}
              onKirim={(entri) => kirim(entri, 'import')}
            />
          )}
        </Card>
      ) : null}
    </div>
  )
}

/* ------------------------------ hasil kiriman ----------------------------- */

function HasilUsulan({ usulan, onTutup }) {
  const t = useTeks()
  return (
    <Card className="px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <IconCheckShield size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">
            {t('{n} nilai terkirim sebagai usulan {id}', {
              n: usulan.entri.length,
              id: usulan.id,
            })}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
            {t('Belum ada satu pun yang masuk transkrip. Biro Kemahasiswaan akan menyetujui atau menolaknya; statusnya bisa Anda pantau kapan saja.')}
          </p>
          <Link
            href="/dosen/usulan"
            className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand-ink hover:underline"
          >
            {t('Lihat status usulan')}
          </Link>
        </div>
        <button
          type="button"
          onClick={onTutup}
          aria-label={t('Tutup pemberitahuan')}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
        >
          <IconX size={17} />
        </button>
      </div>
    </Card>
  )
}

/* -------------------------------- cara 1: manual -------------------------- */

function IsiManual({ galat, baris, bisa, cari, setCari, onKirim }) {
  const t = useTeks()
  const [draf, setDraf] = useState({})

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return baris.filter((b) => !q || b.nama.toLowerCase().includes(q) || b.nim.includes(q))
  }, [baris, cari])

  const entri = useMemo(() => {
    const hasil = []
    for (const [nim, v] of Object.entries(draf)) {
      const teks = String(v).trim()
      if (teks === '') continue
      const angka = Number(teks)
      const sah = Number.isFinite(angka) && angka >= 0 && angka <= 100
      const p = bisa.find((b) => b.nim === nim)
      if (p) hasil.push({ nim, komponenId: p.komponenId, nilai: angka, sah })
    }
    return hasil
  }, [draf, bisa])

  const sah = entri.filter((e) => e.sah)
  const tidakSah = entri.filter((e) => !e.sah)

  return (
    <div>
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <span className="mb-1.5 block label">{t('Cari mahasiswa')}</span>
        <SearchInput value={cari} onChange={setCari} placeholder={t('Nama atau NIM…')} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                {t('Mahasiswa')}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                {t('Dikumpulkan')}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                {t('Status')}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                {t('Nilai')}
                <span className="mt-1 block normal-case font-semibold text-ink-3">0–100</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tersaring.map((b) => {
              const terbuka = BISA_DINILAI.has(b.status.id)
              const isi = draf[b.nim] ?? ''
              const salah = String(isi).trim() !== '' && !(Number(isi) >= 0 && Number(isi) <= 100)
              return (
                <tr key={b.id} className={terbuka ? '' : 'bg-surface-2/40'}>
                  <td className="px-4 py-3 align-middle">
                    <span className="block text-[14px] font-bold leading-snug text-ink">
                      {b.nama}
                    </span>
                    <span className="mt-0.5 block font-mono text-[12px] text-ink-3">{b.nim}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle text-[13px] tabular-nums text-ink-2">
                    {b.waktu}
                    {b.terlambat ? (
                      <span className="mt-0.5 block text-[12px] font-semibold text-ink-2">
                        {t('terlambat')}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <LencanaStatus id={b.status.id} />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {terbuka ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={isi}
                        onChange={(e) => setDraf((d) => ({ ...d, [b.nim]: e.target.value }))}
                        aria-label={t('Nilai untuk {nama}', { nama: b.nama })}
                        aria-invalid={salah || undefined}
                        className={
                          'w-[92px] rounded-lg border bg-surface px-3 py-2 text-sm font-semibold tabular-nums text-ink transition ' +
                          (salah
                            ? 'border-[var(--critical)] text-[var(--critical)]'
                            : 'border-line hover:border-line-strong')
                        }
                      />
                    ) : (
                      <span className="text-[13px] text-ink-3">
                        {b.status.nilai != null ? b.status.nilai : '-'}
                        <span className="mt-0.5 block text-[12px]">
                          {t(RUPA_STATUS[b.status.id].rinci)}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <BarisKirim
        galat={galat}
        jumlah={sah.length}
        tidakSah={tidakSah.length}
        onKirim={async () => {
          // Isian hanya dikosongkan bila usulannya benar-benar tersimpan.
          if (await onKirim(sah.map(({ nim, komponenId, nilai }) => ({ nim, komponenId, nilai })))) {
            setDraf({})
          }
        }}
      >
        {t('Sel yang dikosongkan tidak ikut terkirim. Sel kosong tidak dihitung sebagai nol.')}
      </BarisKirim>
    </div>
  )
}

/* ------------------------------ cara 2: otomatis -------------------------- */

const NAMA_NIM = ['nim', 'npm', 'no induk', 'nomor induk', 'student id', 'id mahasiswa']

const normal = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

function tebakKolomNim(kepala) {
  for (const k of kepala) if (NAMA_NIM.some((c) => normal(k) === normal(c))) return k
  for (const k of kepala) if (normal(k).includes('nim')) return k
  return null
}

function tebakKolomNilai(kepala, komponen, kolomNim) {
  let terbaik = null
  let skorTerbaik = -1
  for (const k of kepala) {
    if (k === kolomNim) continue
    const skor = skorKecocokan(k, komponen)
    if (skor > skorTerbaik) {
      skorTerbaik = skor
      terbaik = k
    }
  }
  return terbaik
}

function IsiOtomatis({ galatKirim, komponen, baris, bisa, onKirim }) {
  const t = useTeks()
  const [berkas, setBerkas] = useState(null)
  const [urai, setUrai] = useState(null)
  const [kolomNim, setKolomNim] = useState('')
  const [kolomNilai, setKolomNilai] = useState('')
  const [skala, setSkala] = useState(100)
  const [galat, setGalat] = useState('')
  const inputRef = useRef(null)

  function muat(file) {
    setGalat('')
    if (!file) return
    const pembaca = new FileReader()
    pembaca.onload = () => {
      const hasil = uraiCSV(String(pembaca.result ?? ''))
      if (!hasil.kepala.length || !hasil.baris.length) {
        setGalat(t('Berkas tidak berisi tabel yang bisa dibaca.'))
        return
      }
      const nim = tebakKolomNim(hasil.kepala)
      const nilai = tebakKolomNilai(hasil.kepala, komponen, nim)
      const angka = hasil.baris.map((r) => bacaAngka(r[nilai]))
      setBerkas(file.name)
      setUrai(hasil)
      setKolomNim(nim ?? hasil.kepala[0])
      setKolomNilai(nilai ?? hasil.kepala[1] ?? hasil.kepala[0])
      setSkala(deteksiSkala(angka).skala)
    }
    pembaca.onerror = () => setGalat(t('Berkas gagal dibaca.'))
    pembaca.readAsText(file)
  }

  const periksa = useMemo(() => {
    if (!urai) return []
    const terpakai = new Set()
    return urai.baris.map((r, i) => {
      const nim = String(r[kolomNim] ?? '').trim()
      const mentah = bacaAngka(r[kolomNilai])
      const nilai = konversi(mentah, skala)
      const cocok = bisa.find((b) => b.nim === nim)
      const adaTapiTerkunci = !cocok && baris.find((b) => b.nim === nim)

      let masalah = null
      if (!nim) masalah = t('NIM kosong')
      else if (terpakai.has(nim)) masalah = t('NIM ganda di berkas')
      else if (adaTapiTerkunci)
        masalah = t('sudah {keadaan}', {
          keadaan: t(RUPA_STATUS[adaTapiTerkunci.status.id].label).toLowerCase(),
        })
      else if (!cocok) masalah = t('tidak mengumpulkan tugas ini')
      else if (mentah == null) masalah = t('nilai tidak terbaca')
      else if (nilai < 0 || nilai > 100) masalah = t('di luar rentang 0–100')

      if (nim) terpakai.add(nim)
      return { no: i + 2, nim, nama: cocok?.nama ?? adaTapiTerkunci?.nama ?? '-', mentah, nilai, masalah }
    })
  }, [urai, kolomNim, kolomNilai, skala, bisa, baris])

  const siap = periksa.filter((p) => !p.masalah)
  const bermasalah = periksa.filter((p) => p.masalah)

  function templat() {
    const kepala = ['NIM', 'Nama', komponen.id]
    const isi = bisa.map((b) => [b.nim, b.nama, ''])
    unduhBerkas('templat-' + komponen.id.toLowerCase() + '.csv', susunCSV(kepala, isi))
  }

  return (
    <div>
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => muat(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px]"
          >
            <IconUpload size={16} />
            {t('Pilih berkas CSV')}
          </button>
          <button
            type="button"
            onClick={templat}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2.5 text-[13px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink"
          >
            <IconDownload size={15} />
            {t('Unduh templat')}
          </button>
          {berkas ? <Badge tone="brand">{berkas}</Badge> : null}
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
          {t('Templatnya sudah berisi NIM dan nama mahasiswa yang mengumpulkan tugas ini. Cukup isi kolom nilainya, lalu unggah kembali. Berkas dari sumber lain juga bisa: kolomnya akan ditebak, dan Anda tetap bisa membetulkan tebakan itu.')}
        </p>

        {galat ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--critical)]">
            <IconAlert size={14} />
            {galat}
          </p>
        ) : null}
      </div>

      {urai ? (
        <>
          <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-3 sm:px-6">
            <Select
              label={t('Kolom NIM')}
              value={kolomNim}
              onChange={setKolomNim}
              options={urai.kepala}
            />
            <Select
              label={t('Kolom nilai')}
              value={kolomNilai}
              onChange={setKolomNilai}
              options={urai.kepala}
            />
            <Select
              label={t('Skala nilai di berkas')}
              value={SKALA_PILIHAN.find((s) => s.nilai === skala)?.label ?? SKALA_PILIHAN[0].label}
              onChange={(v) => setSkala(SKALA_PILIHAN.find((s) => s.label === v).nilai)}
              options={SKALA_PILIHAN.map((s) => s.label)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {t('Baris')}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {t('Mahasiswa')}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {t('Di berkas')}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {t('Jadi nilai')}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {t('Keterangan')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {periksa.slice(0, 40).map((p) => (
                  <tr key={p.no} className={p.masalah ? 'bg-surface-2/40' : ''}>
                    <td className="px-4 py-2.5 text-[12.5px] tabular-nums text-ink-3">{p.no}</td>
                    <td className="px-4 py-2.5">
                      <span className="block text-[13.5px] font-semibold text-ink">{p.nama}</span>
                      <span className="block font-mono text-[12px] text-ink-3">{p.nim || '-'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] tabular-nums text-ink-2">
                      {p.mentah ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] font-bold tabular-nums text-ink">
                      {p.masalah ? '-' : p.nilai}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.masalah ? (
                        <span className="text-[12.5px] font-bold text-[var(--critical)]">{p.masalah}</span>
                      ) : (
                        <StatusTeks>{t('siap diusulkan')}</StatusTeks>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {periksa.length > 40 ? (
            <p className="px-5 pt-3 text-[12.5px] text-ink-3 sm:px-6">
              {t('Menampilkan 40 baris pertama dari {n}. Seluruh baris tetap ikut diperiksa dan dikirim.', {
                n: periksa.length,
              })}
            </p>
          ) : null}

          <BarisKirim
            galat={galatKirim}
            jumlah={siap.length}
            tidakSah={bermasalah.length}
            onKirim={async () => {
              if (
                await onKirim(
                  siap.map((p) => ({ nim: p.nim, komponenId: komponen.id, nilai: p.nilai })),
                )
              ) {
                setUrai(null)
                setBerkas(null)
              }
            }}
          >
            {t('Baris bermasalah tidak ikut terkirim; betulkan berkasnya lalu unggah ulang bila perlu.')}
          </BarisKirim>
        </>
      ) : null}
    </div>
  )
}

/* ------------------------------- baris kirim ------------------------------ */

function BarisKirim({ galat, jumlah, tidakSah, onKirim, children }) {
  const t = useTeks()
  return (
    <div className="border-t border-line px-5 py-4 sm:px-6">
      {galat ? (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
          >
            <IconAlert size={16} className="mt-px shrink-0" />
            {galat}
          </p>
        ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-2">
          <span className="font-bold text-ink">{jumlah}</span> {t('nilai siap diusulkan')}
          {tidakSah ? (
            <span className="ml-2 inline-flex items-center gap-1.5 font-bold text-[var(--critical)]">
              <IconAlert size={14} />
              {t('{n} tidak sah', { n: tidakSah })}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          disabled={!jumlah}
          onClick={onKirim}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconCheckShield size={16} />
          {t('Kirim untuk disetujui')}
        </button>
      </div>
      <CatatanKaki>
        {children}{' '}
        {t('Setelah dikirim, nilainya menunggu keputusan Biro Kemahasiswaan dan belum terlihat oleh mahasiswa.')}
      </CatatanKaki>
    </div>
  )
}
