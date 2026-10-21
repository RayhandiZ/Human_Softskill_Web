'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { EmptyState, SearchInput, Select } from '../../components/Ui'
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconCheckShield,
  IconChevronRight,
  IconDownload,
  IconInfo,
  IconPencil,
  IconUpload,
} from '../../components/Icons'
import { susunCSV, unduhBerkas, uraiCSV } from '../../lib/csv'
import { SKALA_PILIHAN, bacaAngka, deteksiSkala, konversi, skorKecocokan } from '../../lib/ingest'
import { dosenSesi, komponenDosen, pengumpulanDosen } from '../../lib/data'
import { statusPengumpulan, useStore, usulanDosen, usulkanNilai } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { RUPA_STATUS } from './status'
import { useBahasa, useTeks } from '../../lib/bahasa'

/* Penilaian dosen dalam tiga langkah: pilih tugas, isi nilai, periksa lalu kirim. Dibuat untuk dosen 40 tahun ke atas:
   huruf dan kolom besar, satu pekerjaan per layar, langkahnya selalu terlihat, draf tersimpan otomatis di perangkat,
   dan nilai tidak pernah terkirim tanpa diperiksa dulu. Dosen tidak pernah memanggil simpanBatch(); jalan keluarnya
   hanya usulkanNilai(). Lihat README.md › Panel Dosen › Penilaian dan README.md › Usulan nilai dosen. */

const BISA_DINILAI = new Set(['masuk', 'ditolak'])
const enc = encodeURIComponent
const keTugas = (id) => '/dosen/nilai?komponen=' + enc(id)

/* --------------------------------- nilai --------------------------------- */

/** "85", "85,5", dan "85.5" diterima; dua angka di belakang koma paling banyak. "85," (sedang mengetik desimal)
    dibaca 85, supaya tanda salah tidak berkedip di tengah mengetik. */
export function bacaNilai(teks) {
  const s = String(teks ?? '').trim()
  if (s === '') return { kosong: true }
  if (!/^\d{1,3}([.,]\d{0,2})?$/.test(s)) return { salah: 'Tulis angka saja, misalnya 85 atau 85,5.' }
  const angka = Number(s.replace(',', '.'))
  if (angka > 100) return { salah: 'Nilai paling tinggi 100.' }
  return { angka }
}

const tulisAngka = (n) => String(Math.round(n * 100) / 100).replace('.', ',')

/** "2026-09-05 08:16" (waktu WIB dari data) menjadi "5 Sep 2026, 08.16" dalam bahasa aktif; selain itu apa adanya. */
function tulisWaktu(s, bahasa) {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (!m) return s
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  return new Intl.DateTimeFormat(bahasa === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/* --------------------------------- draf ---------------------------------- */
/* Draf disimpan di peramban, per dosen dan per tugas. Hanya di perangkat ini; pindah perangkat butuh dukungan server. */

const kunciDraf = (nip, komponenId) => 'sk5c.draf-nilai.' + nip + '.' + komponenId
const DRAF_KOSONG = { nilai: {}, catatan: '', dariBerkas: false, waktu: null }
// Bila peramban menolak menyimpan (penyimpanan penuh atau diblokir), draf dipegang di memori supaya tetap terbawa dari
// Isi nilai ke Periksa & kirim. Setiap langkah membaca drafnya sendiri, jadi tanpa ini nilainya hilang saat pindah langkah.
const cadangan = new Map()

function bacaDraf(kunci) {
  if (cadangan.has(kunci)) return cadangan.get(kunci)
  try {
    const v = JSON.parse(localStorage.getItem(kunci) ?? 'null')
    if (!v || typeof v !== 'object') return DRAF_KOSONG
    return { nilai: v.nilai ?? {}, catatan: v.catatan ?? '', dariBerkas: Boolean(v.dariBerkas), waktu: v.waktu ?? null }
  } catch {
    return DRAF_KOSONG
  }
}

const drafKosong = (d) => !d.catatan.trim() && !Object.values(d.nilai).some((v) => String(v).trim() !== '')

function useDraf(nip, komponenId) {
  const kunci = kunciDraf(nip, komponenId)
  const [draf, setDraf] = useState(DRAF_KOSONG)
  const [siap, setSiap] = useState(false)
  const [gagalSimpan, setGagalSimpan] = useState(false)

  useEffect(() => {
    setDraf(bacaDraf(kunci))
    setSiap(true)
  }, [kunci])

  useEffect(() => {
    if (!siap) return
    try {
      if (drafKosong(draf)) localStorage.removeItem(kunci)
      else localStorage.setItem(kunci, JSON.stringify(draf))
      cadangan.delete(kunci)
      setGagalSimpan(false)
    } catch {
      if (drafKosong(draf)) cadangan.delete(kunci)
      else cadangan.set(kunci, draf)
      setGagalSimpan(true)
    }
  }, [draf, siap, kunci])

  const ubah = (f) => setDraf((d) => ({ ...f(d), waktu: Date.now() }))
  return {
    draf,
    siap,
    gagalSimpan,
    ubahNilai: (nim, teks) => ubah((d) => ({ ...d, nilai: { ...d.nilai, [nim]: teks } })),
    isiBanyak: (peta) => ubah((d) => ({ ...d, nilai: { ...d.nilai, ...peta }, dariBerkas: true })),
    ubahCatatan: (teks) => ubah((d) => ({ ...d, catatan: teks })),
    hapus: () => setDraf(DRAF_KOSONG),
  }
}

/* --------------------------------- halaman -------------------------------- */

export default function NilaiDosen() {
  const t = useTeks()
  const versi = useStore()
  const { user } = useAuth()
  const dosen = useMemo(() => dosenSesi(user), [user])
  const params = useSearchParams()
  const daftarKomponen = useMemo(() => komponenDosen(dosen), [dosen])

  const semua = useMemo(() => {
    if (!dosen) return []
    return pengumpulanDosen(dosen.nip)
      .map((p) => ({ ...p, status: statusPengumpulan(p) }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [dosen, versi])

  const komponen = daftarKomponen.find((k) => k.id === params?.get('komponen')) ?? null
  const terkirim = params?.get('terkirim')
  const langkah = !komponen ? 0 : terkirim ? 3 : params?.get('periksa') === '1' ? 2 : 1

  if (!dosen) {
    return (
      <EmptyState title={t('Akun ini belum terdaftar sebagai dosen pengampu')}>
        {t('Hubungi Biro Kemahasiswaan untuk didaftarkan pada satu kelas.')}
      </EmptyState>
    )
  }

  if (!daftarKomponen.length) {
    return (
      <EmptyState title={t('Belum ada tugas yang bisa dinilai')}>
        {t('Kelas Anda belum memiliki tugas pada kurikulum yang berlaku. Hubungi Biro Kemahasiswaan.')}
      </EmptyState>
    )
  }

  const baris = komponen ? semua.filter((b) => b.komponenId === komponen.id) : []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{t('Penilaian')}</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t('Nilai tugas mahasiswa dalam tiga langkah. Nilai baru masuk transkrip setelah disetujui Biro Kemahasiswaan.')}
        </p>
      </header>

      <Langkah aktif={langkah} komponenId={komponen?.id} />

      {langkah === 0 ? (
        <PilihTugas dosen={dosen} daftarKomponen={daftarKomponen} semua={semua} />
      ) : langkah === 1 ? (
        <IsiNilai key={komponen.id} dosen={dosen} komponen={komponen} baris={baris} awalCari={params?.get('cari') ?? ''} />
      ) : langkah === 2 ? (
        <PeriksaKirim key={komponen.id} dosen={dosen} komponen={komponen} baris={baris} />
      ) : (
        <Terkirim dosen={dosen} komponen={komponen} usulanId={terkirim} baris={baris} />
      )}
    </div>
  )
}

/* -------------------------------- langkah --------------------------------- */

function Langkah({ aktif, komponenId }) {
  const t = useTeks()
  const daftar = [
    { label: 'Pilih tugas', ke: '/dosen/nilai' },
    { label: 'Isi nilai', ke: komponenId ? keTugas(komponenId) : null },
    { label: 'Periksa & kirim', ke: null },
  ]
  return (
    <nav aria-label={t('Langkah penilaian')}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {daftar.map((l, i) => {
          const selesai = i < aktif
          const sekarang = i === aktif
          const isi = (
            <>
              <span
                aria-hidden="true"
                className={
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13.5px] font-extrabold ' +
                  // --surface, bukan putih: di tema gelap --brand-ink berwarna biru muda (centang putih hanya 1,8:1).
                  (selesai
                    ? 'bg-brand-ink text-[color:var(--surface)]'
                    : sekarang
                      ? 'bg-brand text-white ring-4 ring-brand-soft'
                      : 'border-2 border-line-strong text-ink-2')
                }
              >
                {selesai ? <IconCheck size={18} /> : i + 1}
              </span>
              <span className={'text-[14px] ' + (sekarang ? 'font-extrabold text-ink' : 'font-semibold text-ink-2')}>
                {t(l.label)}
                <span className="sr-only">
                  {' '}
                  {t(selesai ? '(selesai)' : sekarang ? '(sedang dikerjakan)' : '(belum)')}
                </span>
              </span>
            </>
          )
          return (
            <li key={l.label} className="flex items-center gap-1" aria-current={sekarang ? 'step' : undefined}>
              {selesai && l.ke ? (
                <Link href={l.ke} className="flex min-h-[44px] items-center gap-2.5 rounded-xl pr-2 hover:underline">
                  {isi}
                </Link>
              ) : (
                <span className="flex min-h-[44px] items-center gap-2.5 pr-2">{isi}</span>
              )}
              {i < daftar.length - 1 ? <span aria-hidden="true" className="mr-2 hidden h-0.5 w-8 rounded bg-line-strong sm:block" /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Judul langkah yang menerima fokus saat langkah berganti, supaya pembaca layar dan papan ketik ikut berpindah. */
function JudulLangkah({ children }) {
  const ref = useRef(null)
  useEffect(() => {
    // Penyimpanan sesi bisa ditolak peramban (atau tidak ada sama sekali); tanpanya fokus cukup tetap di tempatnya.
    let pindah = false
    try {
      pindah = sessionStorage.getItem('sk5c.penilaian-pindah') === '1'
      if (pindah) sessionStorage.removeItem('sk5c.penilaian-pindah')
    } catch {
      pindah = false
    }
    if (pindah) ref.current?.focus()
  }, [])
  return (
    <h2 ref={ref} tabIndex={-1} className="text-[20px] font-extrabold leading-snug tracking-tight text-ink focus:outline-none">
      {children}
    </h2>
  )
}

const tandaiPindah = () => {
  try {
    sessionStorage.setItem('sk5c.penilaian-pindah', '1')
  } catch {
    /* tanpa penyimpanan, fokus tetap di tempatnya */
  }
}

/* ----------------------------- 1. pilih tugas ----------------------------- */

function PilihTugas({ dosen, daftarKomponen, semua }) {
  const t = useTeks()
  const [drafPerTugas, setDrafPerTugas] = useState({})

  const kartu = useMemo(
    () =>
      daftarKomponen
        .map((k) => {
          const b = semua.filter((x) => x.komponenId === k.id)
          const hitung = (id) => b.filter((x) => x.status.id === id).length
          return {
            ...k,
            total: b.length,
            perlu: hitung('masuk') + hitung('ditolak'),
            menunggu: hitung('menunggu'),
            dinilai: hitung('dinilai'),
            ditolak: hitung('ditolak'),
            bisa: new Set(b.filter((x) => BISA_DINILAI.has(x.status.id)).map((x) => x.nim)),
          }
        })
        // Tugas yang masih punya pekerjaan lebih dulu.
        .sort((a, b) => Number(b.perlu > 0) - Number(a.perlu > 0)),
    [daftarKomponen, semua],
  )

  useEffect(() => {
    const hasil = {}
    for (const k of kartu) {
      const d = bacaDraf(kunciDraf(dosen.nip, k.id))
      hasil[k.id] = Object.entries(d.nilai).filter(([nim, v]) => k.bisa.has(nim) && String(v).trim() !== '').length
    }
    setDrafPerTugas(hasil)
  }, [kartu, dosen.nip])

  return (
    <section className="space-y-4">
      <div>
        <JudulLangkah>{t('Pilih tugas yang ingin Anda nilai')}</JudulLangkah>
        <p className="mt-1 text-[14px] text-ink-2">{t('Tugas yang masih punya pengumpulan belum dinilai ada di urutan teratas.')}</p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {kartu.map((k) => {
          const sudah = k.menunggu + k.dinilai
          const persen = k.total ? Math.round((sudah / k.total) * 100) : 0
          const draf = drafPerTugas[k.id] ?? 0
          return (
            <li key={k.id}>
              <article className="card flex h-full flex-col p-5 sm:p-6">
                <h3 className="text-[16px] font-extrabold leading-snug text-ink">{k.label}</h3>
                <p className="mt-1 text-[13px] text-ink-2">
                  {t('Kode {kode}', { kode: k.id })}
                  {k.status === 'draft' ? ' · ' + t('skema belum final, nilainya tetap bisa dikirim') : ''}
                </p>

                {k.total ? (
                  <>
                    <dl className="mt-5 grid grid-cols-3 gap-3">
                      <Angka label={t('Belum dinilai')} nilai={k.perlu} tegas={k.perlu > 0} />
                      <Angka label={t('Menunggu persetujuan')} nilai={k.menunggu} />
                      <Angka label={t('Tercatat')} nilai={k.dinilai} />
                    </dl>
                    <div className="mt-4">
                      <p className="text-[13.5px] text-ink-2">
                        {t('{n} dari {total} pengumpulan sudah Anda nilai', { n: sudah, total: k.total })}
                      </p>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--grid)]">
                        <div className="h-full rounded-full bg-brand-ink" style={{ width: Math.max(persen ? 3 : 0, persen) + '%' }} />
                      </div>
                    </div>
                    {k.ditolak ? (
                      <p className="mt-3 flex items-start gap-2 text-[13.5px] font-semibold text-[var(--teks-kritis)]">
                        <IconAlert size={17} className="mt-0.5 shrink-0" />
                        {t('{n} nilai ditolak Kemahasiswaan dan perlu dinilai ulang', { n: k.ditolak })}
                      </p>
                    ) : null}
                    {draf ? (
                      <p className="mt-3 flex items-start gap-2 text-[13.5px] text-ink-2">
                        <IconPencil size={17} className="mt-0.5 shrink-0" />
                        {t('Ada {n} nilai draf yang belum dikirim', { n: draf })}
                      </p>
                    ) : null}
                    <div className="mt-auto pt-5">
                      <Link
                        href={keTugas(k.id)}
                        onClick={tandaiPindah}
                        className={k.perlu ? 'btn-primary' : 'btn-ghost'}
                      >
                        {t(k.perlu ? (draf ? 'Lanjutkan menilai' : 'Nilai tugas ini') : 'Lihat nilai tugas ini')}
                        <IconChevronRight size={18} />
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="mt-5 text-[14px] text-ink-2">{t('Belum ada yang mengumpulkan tugas ini.')}</p>
                )}
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* Angkanya didorong ke dasar kotak, supaya tetap sejajar walau labelnya ada yang dua baris. */
function Angka({ label, nilai, tegas = false }) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface-2 px-3 py-3">
      <dt className="text-[13px] leading-snug text-ink-2">{label}</dt>
      <dd className={'mt-auto pt-1.5 text-[20px] font-extrabold leading-none tabular-nums ' + (tegas ? 'text-brand-ink' : 'text-ink')}>{nilai}</dd>
    </div>
  )
}

/* ------------------------------ 2. isi nilai ------------------------------ */

/* Tombol bantuan mengambang 8px di atas bilah aksi selama bilah itu menempel di dasar layar atau baru saja lepas,
   lalu kembali ke tempatnya setelah bilah tergulir cukup jauh ke atas. Keduanya tidak pernah bertumpuk, dan di ujung
   halaman tombol itu tidak menutupi footer. Ditulis ke --naik-bantuan di .panel-dosen (index.css › panel dosen).
   Bilah aksi ada di dalam .isi-zoom ("Ukuran tulisan"), tombol bantuan tidak: semua hitungan dalam piksel layar,
   dan hanya jarak menempel bilah (nilai CSS di dalam zoom) yang dikali z. */
function useBantuanDiAtasBilah(ref, aktif) {
  useLayoutEffect(() => {
    const bilah = ref.current
    const panel = bilah?.closest('.panel-dosen')
    if (!aktif || !bilah || !panel) return
    const isi = bilah.closest('.isi-zoom') ?? panel
    let bingkai = 0
    const atur = () => {
      bingkai = 0
      const z = Number(window.getComputedStyle(isi).zoom) || 1
      const r = bilah.getBoundingClientRect()
      const garis = window.innerHeight - parseFloat(window.getComputedStyle(bilah).bottom) * z
      // 84 = jejak tombol bantuan di tempat asalnya: 56px tinggi, 20px dari garis, sela 8px.
      const dekat = garis - r.bottom < 84
      panel.style.setProperty('--naik-bantuan', dekat ? Math.max(0, garis - r.top - 12) + 'px' : '0px')
    }
    // Lingkungan tanpa requestAnimationFrame atau ResizeObserver (jsdom di skrip uji) tetap jalan, hanya tanpa
    // penggabungan per bingkai dan tanpa pengamatan ukuran.
    const jadwal = () => {
      if (!window.requestAnimationFrame) return atur()
      if (!bingkai) bingkai = window.requestAnimationFrame(atur)
    }
    atur()
    // Tabel yang tersaring atau zoom yang berubah memindah bilah tanpa digulir.
    const amati = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(jadwal)
    amati?.observe(bilah.parentElement)
    amati?.observe(document.body)
    window.addEventListener('scroll', jadwal, { passive: true })
    window.addEventListener('resize', jadwal)
    return () => {
      if (bingkai) window.cancelAnimationFrame(bingkai)
      amati?.disconnect()
      window.removeEventListener('scroll', jadwal)
      window.removeEventListener('resize', jadwal)
      panel.style.removeProperty('--naik-bantuan')
    }
  }, [ref, aktif])
}

function IsiNilai({ dosen, komponen, baris, awalCari }) {
  const { t, bahasa } = useBahasa()
  const router = useRouter()
  const { draf, siap, gagalSimpan, ubahNilai, isiBanyak } = useDraf(dosen.nip, komponen.id)
  const [cara, setCara] = useState('ketik')
  const [cari, setCari] = useState(awalCari)
  const [dariBerkas, setDariBerkas] = useState(0)
  const [disentuh, setDisentuh] = useState(() => new Set())
  const [tunjukSemua, setTunjukSemua] = useState(false)
  const kolom = useRef(new Map())
  const bilahAksi = useRef(null)

  const bisa = baris.filter((b) => BISA_DINILAI.has(b.status.id))
  const hasil = (nim) => bacaNilai(draf.nilai[nim])
  const terisi = bisa.filter((b) => hasil(b.nim).angka != null).length
  const salah = bisa.filter((b) => hasil(b.nim).salah)

  useBantuanDiAtasBilah(bilahAksi, bisa.length > 0 && cara === 'ketik')

  const q = cari.trim().toLowerCase()
  const tampil = baris.filter((b) => !q || b.nama.toLowerCase().includes(q) || b.nim.includes(q))
  const urutan = tampil.filter((b) => BISA_DINILAI.has(b.status.id)).map((b) => b.nim)

  // Enter dan panah bawah turun ke baris berikutnya, Shift+Enter dan panah atas naik, seperti lembar kerja.
  function pindahDari(nim, arah) {
    const i = urutan.indexOf(nim) + arah
    const el = kolom.current.get(urutan[i])
    if (el) {
      el.focus()
      el.select()
    }
  }

  function lanjut() {
    if (salah.length) {
      setTunjukSemua(true)
      // Baris yang salah bisa tersembunyi oleh pencarian: kosongkan dulu, lalu fokus sesudah tabel tergambar ulang.
      if (q && !tampil.some((b) => b.nim === salah[0].nim)) setCari('')
      setTimeout(() => kolom.current.get(salah[0].nim)?.focus(), 0)
      return
    }
    if (!terisi) return
    tandaiPindah()
    router.push(keTugas(komponen.id) + '&periksa=1')
  }

  const waktu = draf.waktu
    ? new Date(draf.waktu).toLocaleTimeString(bahasa === 'en' ? 'en-GB' : 'id-ID', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <section className="space-y-5">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink-2">{t('Tugas yang sedang dinilai')}</p>
            <JudulLangkah>{komponen.label}</JudulLangkah>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              {t('Kode {kode}', { kode: komponen.id })} ·{' '}
              {t('{n} mahasiswa mengumpulkan, {sisa} belum dinilai', { n: baris.length, sisa: bisa.length })}
            </p>
          </div>
          <Link href="/dosen/nilai" onClick={tandaiPindah} className="btn-ghost shrink-0">
            <IconArrowLeft size={18} />
            {t('Ganti tugas')}
          </Link>
        </div>

        {bisa.length ? (
          <fieldset className="mt-5">
            <legend className="sr-only">{t('Cara mengisi nilai')}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <PilihanCara
                nilai="ketik"
                aktif={cara === 'ketik'}
                onPilih={setCara}
                judul={t('Ketik nilai satu per satu')}
                ket={t('Cocok untuk kelas kecil atau beberapa nilai saja.')}
                icon={IconPencil}
              />
              <PilihanCara
                nilai="unggah"
                aktif={cara === 'unggah'}
                onPilih={setCara}
                judul={t('Unggah dari berkas CSV')}
                ket={t('Bila nilainya sudah ada di Excel. Nilainya masuk ke tabel untuk Anda periksa.')}
                icon={IconUpload}
              />
            </div>
          </fieldset>
        ) : baris.length ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-4 py-3 text-[14px] text-ink">
            <IconCheck size={19} className="mt-0.5 shrink-0 text-[var(--teks-baik)]" />
            {t('Semua pengumpulan tugas ini sudah Anda nilai. Nilainya tampil di bawah sebagai bacaan saja.')}
          </p>
        ) : null}
      </div>

      {!baris.length ? (
        <div className="card">
          <EmptyState title={t('Belum ada yang mengumpulkan tugas ini.')}>
            {t('Nilai hanya bisa diisi untuk mahasiswa yang berkasnya sudah masuk.')}
          </EmptyState>
        </div>
      ) : cara === 'unggah' && bisa.length ? (
        <UnggahBerkas
          komponen={komponen}
          baris={baris}
          bisa={bisa}
          onMasukkan={(peta) => {
            isiBanyak(peta)
            setDariBerkas(Object.keys(peta).length)
            setCara('ketik')
          }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="space-y-3 border-b border-line px-5 py-4 sm:px-6">
            {dariBerkas ? (
              <p role="status" className="flex animate-rise items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-[13.5px] font-semibold text-brand-ink">
                <IconCheck size={18} className="mt-0.5 shrink-0" />
                {t('{n} nilai dari berkas sudah masuk ke tabel. Periksa, lalu tekan Periksa & kirim.', { n: dariBerkas })}
              </p>
            ) : null}
            {bisa.length ? (
              <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-2">
                <IconInfo size={18} className="mt-0.5 shrink-0" />
                <span>
                  {gagalSimpan
                    ? t('Peramban ini menolak menyimpan draf. Kirim nilainya sebelum menutup halaman ini.')
                    : t('Nilai yang Anda ketik tersimpan otomatis sebagai draf di perangkat ini.')}{' '}
                  {t('Nilai belum terlihat oleh mahasiswa sampai dikirim dan disetujui.')}
                  {waktu && !gagalSimpan ? ' ' + t('Terakhir tersimpan pukul {waktu}.', { waktu }) : ''}
                </span>
              </p>
            ) : null}
            <div className="max-w-md">
              <SearchInput value={cari} onChange={setCari} label={t('Cari mahasiswa')} placeholder={t('Cari nama atau NIM')} className="[&_input]:py-3 [&_input]:text-[14px]" />
            </div>
          </div>

          {/* Kepala kolom hanya untuk layar lebar; di HP setiap baris menulis keterangannya sendiri. */}
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_170px] gap-x-4 border-b border-line bg-surface-2 px-6 py-3 text-[13px] font-bold text-ink-2 md:grid">
            <span>{t('Mahasiswa')}</span>
            <span>{t('Dikumpulkan')}</span>
            <span>{t('Keadaan')}</span>
            <span>{t('Nilai (0–100)')}</span>
          </div>

          {tampil.length ? (
            <ul className="divide-y divide-line">
              {tampil.map((b) => (
                <BarisNilai
                  key={b.id}
                  b={b}
                  teks={draf.nilai[b.nim] ?? ''}
                  siap={siap}
                  tersimpan={!gagalSimpan}
                  tunjukGalat={tunjukSemua || disentuh.has(b.nim)}
                  daftarkan={(el) => (el ? kolom.current.set(b.nim, el) : kolom.current.delete(b.nim))}
                  onUbah={(v) => ubahNilai(b.nim, v)}
                  onTinggal={() => setDisentuh((s) => new Set(s).add(b.nim))}
                  onPindah={(arah) => pindahDari(b.nim, arah)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title={t('Tidak ada mahasiswa yang cocok')}>{t('Periksa ejaan nama atau NIM, atau kosongkan kotak pencarian.')}</EmptyState>
          )}
        </div>
      )}

      {bisa.length && cara === 'ketik' ? (
        <div ref={bilahAksi} className="bilah-aksi-dosen -mx-4 border-t border-line bg-surface px-4 py-3 shadow-[0_-10px_24px_-14px_rgba(16,20,50,.25)] sm:mx-0 sm:rounded-2xl sm:border sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-[14px] text-ink-2">
              <strong className="text-[16px] font-extrabold tabular-nums text-ink">{terisi}</strong>{' '}
              {t('dari {n} nilai sudah diisi', { n: bisa.length })}
              {salah.length ? (
                <span className="ml-2 font-bold text-[var(--teks-kritis)]">· {t('{n} perlu dibetulkan', { n: salah.length })}</span>
              ) : null}
            </p>
            <button type="button" onClick={lanjut} disabled={!terisi && !salah.length} className="btn-primary">
              {t('Periksa & kirim')}
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

/* Radio asli di balik kartu: panah kiri/kanan memindah pilihan tanpa kode tambahan, dan pembaca layar menyebutnya
   sebagai pilihan. relative: radio sr-only (absolute) tetap di dalam kartunya. */
function PilihanCara({ nilai, aktif, onPilih, judul, ket, icon: Icon }) {
  return (
    <label className="relative block cursor-pointer">
      <input type="radio" name="cara-isi" value={nilai} checked={aktif} onChange={() => onPilih(nilai)} className="peer sr-only" />
      <span
        className={
          'flex h-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-ink ' +
          (aktif ? 'border-brand-ink bg-brand-soft' : 'border-line hover:border-line-strong')
        }
      >
        <span className={'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (aktif ? 'bg-brand-ink text-[color:var(--surface)]' : 'bg-surface-2 text-ink-2')}>
          <Icon size={20} />
        </span>
        <span className="min-w-0">
          <span className={'block text-[14px] font-bold ' + (aktif ? 'text-brand-ink' : 'text-ink')}>{judul}</span>
          <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-2">{ket}</span>
        </span>
      </span>
    </label>
  )
}

/* tersimpan: false bila peramban menolak menyimpan draf; tanda "Tersimpan sebagai draf" tidak boleh muncul. */
function BarisNilai({ b, teks, siap, tersimpan, tunjukGalat, daftarkan, onUbah, onTinggal, onPindah }) {
  const { t, bahasa } = useBahasa()
  const terbuka = BISA_DINILAI.has(b.status.id)
  const h = bacaNilai(teks)
  const galat = terbuka && h.salah && tunjukGalat
  const idPesan = 'pesan-' + b.id
  const rupa = RUPA_STATUS[b.status.id] ?? RUPA_STATUS.masuk

  return (
    <li className="grid gap-x-4 gap-y-2 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_170px] md:items-center">
      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-snug text-ink">{b.nama}</p>
        <p className="mt-0.5 text-[13.5px] tabular-nums text-ink-2">{t('NIM {nim}', { nim: b.nim })}</p>
      </div>
      <p className="text-[13.5px] text-ink-2">
        <span className="font-semibold text-ink md:hidden">{t('Dikumpulkan')}: </span>
        <span className="tabular-nums">{tulisWaktu(b.waktu, bahasa)}</span>
        {b.terlambat ? <span className="ml-1.5 font-bold text-ink">· {t('Terlambat')}</span> : null}
      </p>
      <div className="text-[13.5px]">
        <span className="font-semibold text-ink md:hidden">{t('Keadaan')}: </span>
        <span className={rupa.perluTindakan ? 'font-bold text-ink' : 'text-ink-2'}>{t(rupa.label)}</span>
        {b.status.id === 'ditolak' ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
            {t('Nilai sebelumnya {n} ditolak', { n: tulisAngka(b.status.nilai) })}
            {b.status.catatan ? ': ' + b.status.catatan : '.'}
          </span>
        ) : null}
      </div>
      <div>
        {terbuka ? (
          <>
            <input
              ref={daftarkan}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              disabled={!siap}
              value={teks}
              onChange={(e) => onUbah(e.target.value)}
              onBlur={onTinggal}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  onPindah(e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey) ? -1 : 1)
                }
              }}
              aria-label={t('Nilai untuk {nama}', { nama: b.nama })}
              aria-invalid={galat || undefined}
              aria-describedby={idPesan}
              placeholder="0–100"
              className={
                'h-10 w-full max-w-[140px] rounded-xl border-2 bg-surface px-3 text-center text-[16px] font-bold tabular-nums text-ink transition placeholder:text-[13.5px] placeholder:font-normal placeholder:text-ink-3 focus:border-brand-ink ' +
                (galat ? 'border-[var(--teks-kritis)]' : 'border-line-strong')
              }
            />
            <p id={idPesan} className="mt-1 min-h-[20px] text-[13px] leading-snug">
              {galat ? (
                <span className="flex items-start gap-1 font-semibold text-[var(--teks-kritis)]">
                  <IconAlert size={15} className="mt-0.5 shrink-0" />
                  {t(h.salah)}
                </span>
              ) : h.angka != null && tersimpan ? (
                <span className="flex items-center gap-1 text-[var(--teks-baik)]">
                  <IconCheck size={15} className="shrink-0" />
                  {t('Tersimpan sebagai draf')}
                </span>
              ) : null}
            </p>
          </>
        ) : (
          // Keadaannya sudah tertulis di kolom sebelah; di sini cukup angkanya.
          <p className="text-[16px] font-bold tabular-nums text-ink">{b.status.nilai != null ? tulisAngka(b.status.nilai) : '-'}</p>
        )}
      </div>
    </li>
  )
}

/* ---------------------------- unggah berkas CSV --------------------------- */

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
    const { skor } = skorKecocokan(k, komponen)
    if (skor > skorTerbaik) {
      skorTerbaik = skor
      terbaik = k
    }
  }
  return terbaik
}

function UnggahBerkas({ komponen, baris, bisa, onMasukkan }) {
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
        setGalat(t('Berkas tidak berisi tabel yang bisa dibaca. Pastikan berkasnya CSV dan baris pertamanya judul kolom.'))
        return
      }
      const nim = tebakKolomNim(hasil.kepala)
      const nilai = tebakKolomNilai(hasil.kepala, komponen, nim) ?? hasil.kepala[1] ?? hasil.kepala[0]
      setBerkas(file.name)
      setUrai(hasil)
      setKolomNim(nim ?? hasil.kepala[0])
      setKolomNilai(nilai)
      setSkala(deteksiSkala(hasil.baris.map((r) => bacaAngka(r[nilai]))).skala)
    }
    pembaca.onerror = () => setGalat(t('Berkas gagal dibaca. Coba pilih berkasnya sekali lagi.'))
    pembaca.readAsText(file)
  }

  const periksa = useMemo(() => {
    if (!urai) return []
    const terpakai = new Set()
    return urai.baris.map((r, i) => {
      const nim = String(r[kolomNim] ?? '').trim()
      // Sel nilai kosong berarti belum diisi, bukan salah: dilewati, seperti impor Kemahasiswaan.
      if (String(r[kolomNilai] ?? '').trim() === '') return { no: i + 2, nim, kosong: true }
      const mentah = bacaAngka(r[kolomNilai])
      const nilai = mentah == null ? null : konversi(mentah, skala, 2)
      const cocok = bisa.find((b) => b.nim === nim)
      const terkunci = !cocok && baris.find((b) => b.nim === nim)

      let masalah = null
      if (!nim) masalah = t('NIM kosong')
      else if (terpakai.has(nim)) masalah = t('NIM muncul dua kali di berkas')
      else if (terkunci) masalah = t('sudah {keadaan}', { keadaan: t(RUPA_STATUS[terkunci.status.id].label).toLowerCase() })
      else if (!cocok) masalah = t('tidak mengumpulkan tugas ini')
      else if (mentah == null) masalah = t('nilainya tidak terbaca')
      else if (nilai < 0 || nilai > 100) masalah = t('di luar 0 sampai 100')

      if (nim) terpakai.add(nim)
      return { no: i + 2, nim, nama: cocok?.nama ?? terkunci?.nama ?? '-', mentah, nilai, masalah }
    })
  }, [urai, kolomNim, kolomNilai, skala, bisa, baris, t])

  const siap = periksa.filter((p) => !p.kosong && !p.masalah)
  const bermasalah = periksa.filter((p) => p.masalah)
  const dilewati = periksa.filter((p) => p.kosong).length

  function templat() {
    const kepala = ['NIM', 'Nama', komponen.id]
    unduhBerkas('templat-' + komponen.id.toLowerCase() + '.csv', susunCSV(kepala, bisa.map((b) => [b.nim, b.nama, ''])))
  }

  return (
    <div className="card overflow-hidden">
      <div className="space-y-4 border-b border-line px-5 py-5 sm:px-6">
        <ol className="space-y-2 text-[14px] leading-relaxed text-ink">
          <li>
            <span className="font-bold">1.</span> {t('Unduh templat. Isinya NIM dan nama mahasiswa yang belum dinilai.')}
          </li>
          <li>
            <span className="font-bold">2.</span> {t('Isi kolom nilainya di Excel, lalu simpan sebagai CSV.')}
          </li>
          <li>
            <span className="font-bold">3.</span> {t('Pilih berkas itu di sini. Nilainya akan masuk ke tabel untuk Anda periksa.')}
          </li>
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={templat} className="btn-ghost">
            <IconDownload size={18} />
            {t('Unduh templat')}
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(e) => muat(e.target.files?.[0] ?? null)} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary">
            <IconUpload size={18} />
            {t('Pilih berkas CSV')}
          </button>
          {berkas ? <span className="text-[13.5px] font-semibold text-ink">{t('Berkas: {nama}', { nama: berkas })}</span> : null}
        </div>
        {galat ? (
          <p role="alert" className="flex items-start gap-2 text-[13.5px] font-semibold text-[var(--teks-kritis)]">
            <IconAlert size={17} className="mt-0.5 shrink-0" />
            {galat}
          </p>
        ) : null}
      </div>

      {urai ? (
        <>
          <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-3 sm:px-6">
            <Select label={t('Kolom NIM di berkas')} value={kolomNim} onChange={setKolomNim} options={urai.kepala} />
            <Select label={t('Kolom nilai di berkas')} value={kolomNilai} onChange={setKolomNilai} options={urai.kepala} />
            <Select
              label={t('Skala nilai di berkas')}
              value={SKALA_PILIHAN.find((s) => s.nilai === skala)?.label ?? SKALA_PILIHAN[0].label}
              onChange={(v) => setSkala(SKALA_PILIHAN.find((s) => s.label === v).nilai)}
              options={SKALA_PILIHAN.map((s) => s.label)}
              tampilkan={t}
            />
          </div>

          <div className="px-5 py-4 sm:px-6">
            <p className="text-[14px] text-ink">
              <strong>{siap.length}</strong> {t('nilai siap dimasukkan ke tabel')}
              {bermasalah.length ? (
                <span className="font-bold text-[var(--teks-kritis)]"> · {t('{n} baris tidak bisa dipakai', { n: bermasalah.length })}</span>
              ) : null}
              {dilewati ? <span className="text-ink-2"> · {t('{n} baris tanpa nilai dilewati', { n: dilewati })}</span> : null}
            </p>
            {bermasalah.length ? (
              <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink-2">
                {bermasalah.slice(0, 12).map((p) => (
                  <li key={p.no}>
                    {t('Baris {n}', { n: p.no })}: <span className="font-semibold text-ink">{p.nama !== '-' ? p.nama : p.nim || '-'}</span>, {p.masalah}
                  </li>
                ))}
                {bermasalah.length > 12 ? <li>{t('dan {n} baris lainnya', { n: bermasalah.length - 12 })}</li> : null}
              </ul>
            ) : null}
            <button
              type="button"
              disabled={!siap.length}
              onClick={() => onMasukkan(Object.fromEntries(siap.map((p) => [p.nim, tulisAngka(p.nilai)])))}
              className="btn-primary mt-4"
            >
              <IconCheck size={18} />
              {t('Masukkan {n} nilai ke tabel', { n: siap.length })}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/* ---------------------------- 3. periksa & kirim --------------------------- */

function PeriksaKirim({ dosen, komponen, baris }) {
  const t = useTeks()
  const router = useRouter()
  const { draf, siap, ubahCatatan, hapus } = useDraf(dosen.nip, komponen.id)
  const [mengirim, setMengirim] = useState(false)
  const [galat, setGalat] = useState('')

  const bisa = baris.filter((b) => BISA_DINILAI.has(b.status.id))
  const isian = bisa.map((b) => ({ b, h: bacaNilai(draf.nilai[b.nim]) }))
  const entri = isian.filter((x) => x.h.angka != null)
  const salah = isian.filter((x) => x.h.salah)

  async function kirim() {
    setGalat('')
    setMengirim(true)
    try {
      const usulan = await usulkanNilai({
        dosen,
        cara: draf.dariBerkas ? 'import' : 'manual',
        catatan: draf.catatan.trim(),
        entri: entri.map(({ b, h }) => ({ nim: b.nim, komponenId: komponen.id, nilai: h.angka })),
      })
      hapus()
      tandaiPindah()
      router.replace(keTugas(komponen.id) + '&terkirim=' + enc(usulan.id))
    } catch (e) {
      setGalat(e.message)
      setMengirim(false)
    }
  }

  if (!siap) return <div className="card h-40" aria-busy="true" />

  if (!entri.length || salah.length) {
    return (
      <div className="card">
        <EmptyState title={salah.length ? t('Ada nilai yang perlu dibetulkan') : t('Belum ada nilai untuk dikirim')}>
          {salah.length
            ? t('Betulkan dulu nilai yang ditandai merah, lalu periksa lagi.')
            : t('Ketik nilainya dulu di langkah Isi nilai.')}
        </EmptyState>
        <div className="flex justify-center px-5 pb-6">
          <Link href={keTugas(komponen.id)} className="btn-primary">
            <IconArrowLeft size={18} />
            {t('Kembali isi nilai')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-5">
      {galat ? (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-4 py-3.5 text-[14px] font-semibold text-[var(--teks-kritis)]">
          <IconAlert size={19} className="mt-0.5 shrink-0" />
          <span>
            {t('Nilai belum terkirim.')} {galat}
          </span>
        </p>
      ) : null}

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <JudulLangkah>{t('Periksa sebelum dikirim')}</JudulLangkah>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            {t('Anda akan mengirim {n} nilai untuk tugas {tugas}.', { n: entri.length, tugas: komponen.label })}
            {bisa.length > entri.length ? ' ' + t('{n} mahasiswa lain belum Anda beri nilai dan tidak ikut terkirim.', { n: bisa.length - entri.length }) : ''}
          </p>
        </div>

        <ul className="divide-y divide-line">
          {entri.map(({ b, h }) => (
            <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
              <span className="min-w-0">
                <span className="block text-[15px] font-bold leading-snug text-ink">{b.nama}</span>
                <span className="block text-[13.5px] tabular-nums text-ink-2">{t('NIM {nim}', { nim: b.nim })}</span>
              </span>
              <span className="shrink-0 text-[20px] font-extrabold tabular-nums text-ink">{tulisAngka(h.angka)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-4 border-t border-line px-5 py-5 sm:px-6">
          <label className="block">
            <span className="block text-[14px] font-bold text-ink">{t('Catatan untuk Kemahasiswaan')}</span>
            <span className="mt-0.5 block text-[13.5px] text-ink-2">{t('Boleh dikosongkan.')}</span>
            <textarea
              value={draf.catatan}
              onChange={(e) => ubahCatatan(e.target.value)}
              rows={3}
              placeholder={t('Misalnya: nilai sudah termasuk penyesuaian keterlambatan.')}
              className="mt-2 w-full rounded-xl border-2 border-line-strong bg-surface px-4 py-3 text-[14px] leading-relaxed text-ink placeholder:text-ink-3 focus:border-brand-ink"
            />
          </label>
          <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-2">
            <IconInfo size={18} className="mt-0.5 shrink-0" />
            {t('Setelah dikirim, nilai menunggu persetujuan Biro Kemahasiswaan dan belum terlihat oleh mahasiswa.')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={kirim} disabled={mengirim} className="btn-primary">
              <IconCheckShield size={18} />
              {t(mengirim ? 'Mengirim…' : 'Kirim ke Kemahasiswaan')}
            </button>
            <Link href={keTugas(komponen.id)} onClick={tandaiPindah} className="btn-ghost">
              <IconArrowLeft size={18} />
              {t('Kembali ubah nilai')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- terkirim -------------------------------- */

function Terkirim({ dosen, komponen, usulanId, baris }) {
  const t = useTeks()
  const usulan = usulanDosen(dosen.nip).find((u) => u.id === usulanId)
  const n = usulan?.entri?.length
  const sisa = baris.filter((b) => BISA_DINILAI.has(b.status.id)).length

  return (
    <section className="card p-6 sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--good)_14%,transparent)] text-[var(--teks-baik)]">
        <IconCheck size={28} />
      </span>
      <div className="mt-4">
        <JudulLangkah>
          {n ? t('{n} nilai terkirim ke Biro Kemahasiswaan', { n }) : t('Nilai terkirim ke Biro Kemahasiswaan')}
        </JudulLangkah>
      </div>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
        {t('Nomor pengiriman {id}, untuk tugas {tugas}.', { id: usulanId, tugas: komponen.label })}{' '}
        {t('Nilainya belum masuk transkrip sampai disetujui. Hasil keputusannya bisa Anda lihat di Riwayat Pengiriman.')}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dosen/usulan" className="btn-primary">
          {t('Lihat riwayat pengiriman')}
          <IconChevronRight size={18} />
        </Link>
        {sisa ? (
          <Link href={keTugas(komponen.id)} onClick={tandaiPindah} className="btn-ghost">
            {t('Lanjut menilai tugas ini ({n} belum)', { n: sisa })}
          </Link>
        ) : null}
        <Link href="/dosen/nilai" onClick={tandaiPindah} className="btn-ghost">
          {t('Nilai tugas lain')}
        </Link>
      </div>
    </section>
  )
}
