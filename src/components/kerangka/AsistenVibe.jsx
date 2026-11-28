'use client'

import { useEffect, useRef, useState } from 'react'
import LogoVibe from './LogoVibe'
import { IconAlert, IconArrowLeft, IconArrowRight, IconHentikan, IconRefresh } from '../Icons'
import { useBahasa } from '../../lib/bahasa'
import { laporSesiHabis } from '../../lib/kirim'
import { modeLokal } from '../../lib/modeData'

/* --------------------------------------------------------------------------
   Asisten VIBE di panel tombol bantuan (LayananTambahan), untuk mahasiswa dan dosen.

   Pertanyaan dikirim ke POST /api/asisten. Server membaca nilai pemilik sesi sendiri, jadi layar hanya mengirim
   percakapannya. Jawaban dialirkan sebagai NDJSON ({ t } per potongan, lalu { selesai } atau { galat }) dan tampil
   sambil ditulis. Percakapan hanya ada di memori halaman: bertahan saat panel ditutup atau halaman panel berganti,
   hilang saat dimuat ulang. Lihat README.md › Asisten VIBE.
   -------------------------------------------------------------------------- */

/** Sama dengan BATAS_ASISTEN.panjangPesan dan .riwayat di src/server/asisten.js. */
const PANJANG_MAKS = 1000
const RIWAYAT = 12

const GAGAL = 'Asisten VIBE tidak bisa dihubungi. Coba lagi sebentar lagi.'
const TAK_TERHUBUNG = 'Server tidak bisa dihubungi. Periksa koneksi, lalu coba lagi.'
const TERPUTUS = 'Jawaban terputus. Coba lagi.'

let nomor = 0
const idBaru = () => 'asisten-' + ++nomor

/* Hanya di perangkat bertetikus kotak tulis difokus sendiri (saat dibuka dan sesudah mengirim). Di layar sentuh itu
   memunculkan papan ketik yang menutupi jawaban. Sama dengan PERANGKAT_TETIKUS di src/lib/gulirHalus.js. */
const bertetikus = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false

/** Yang dikirim ke server: pertanyaan, dan jawaban yang berisi. Jawaban yang gagal atau kosong tidak ikut. */
const riwayatUntukServer = (daftar) =>
  daftar
    .filter((p) => p.dari === 'saya' || (p.teks && !p.galat))
    .slice(-RIWAYAT)
    .map(({ dari, teks }) => ({ dari, teks }))

/**
 * Keadaan percakapan. Dipasang di LayananTambahan, yang selalu terpasang di panel, supaya percakapan tidak hilang saat
 * panel bantuan ditutup. `pesan`: [{ id, dari: 'saya' | 'asisten', teks, galat?, dihentikan? }].
 */
export function useAsisten() {
  const { bahasa } = useBahasa()
  const [pesan, setPesan] = useState([])
  const [sedang, setSedang] = useState(false)
  const henti = useRef(null)

  useEffect(() => () => henti.current?.abort(), [])

  async function jalankan(riwayat) {
    const idJawab = idBaru()
    setPesan([...riwayat, { id: idJawab, dari: 'asisten', teks: '' }])
    setSedang(true)
    const pengendali = new AbortController()
    henti.current = pengendali
    const ubah = (fn) => setPesan((daftar) => daftar.map((p) => (p.id === idJawab ? fn(p) : p)))
    let tersambung = false
    try {
      const jawaban = await fetch('/api/asisten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bahasa, pesan: riwayatUntukServer(riwayat) }),
        signal: pengendali.signal,
      })
      if (!jawaban.ok || !jawaban.body) {
        const data = await jawaban.json().catch(() => ({}))
        if (jawaban.status === 401) laporSesiHabis()
        throw new Error(data.galat ?? GAGAL)
      }
      tersambung = true
      const pembaca = jawaban.body.getReader()
      const dekoder = new TextDecoder()
      let sisa = ''
      for (;;) {
        const { value, done } = await pembaca.read()
        if (done) break
        sisa += dekoder.decode(value, { stream: true })
        let i
        while ((i = sisa.indexOf('\n')) >= 0) {
          const baris = sisa.slice(0, i).trim()
          sisa = sisa.slice(i + 1)
          if (!baris) continue
          const ev = JSON.parse(baris)
          if (ev.t) ubah((p) => ({ ...p, teks: p.teks + ev.t }))
          else if (ev.galat) throw new Error(ev.galat)
        }
      }
    } catch (e) {
      if (pengendali.signal.aborted) ubah((p) => ({ ...p, dihentikan: true }))
      else if (e instanceof TypeError || e instanceof SyntaxError) ubah((p) => ({ ...p, galat: tersambung ? TERPUTUS : TAK_TERHUBUNG }))
      else ubah((p) => ({ ...p, galat: e.message || GAGAL }))
    } finally {
      if (henti.current === pengendali) henti.current = null
      setSedang(false)
    }
  }

  return {
    pesan,
    sedang,
    kirim(teks) {
      const isi = teks.trim().slice(0, PANJANG_MAKS)
      if (isi && !sedang) jalankan([...pesan, { id: idBaru(), dari: 'saya', teks: isi }])
    },
    /** Mengirim ulang pertanyaan terakhir sesudah jawabannya gagal. */
    ulangi() {
      if (sedang) return
      const tanpaGagal = pesan.filter((p) => !(p.dari === 'asisten' && (p.galat || !p.teks)))
      if (tanpaGagal[tanpaGagal.length - 1]?.dari === 'saya') jalankan(tanpaGagal)
    },
    hentikan() {
      henti.current?.abort()
    },
    mulaiBaru() {
      henti.current?.abort()
      setPesan([])
    },
  }
}

/** Keterangan Asisten VIBE di bawah namanya, di menu bantuan dan di kepala percakapan. */
export function KeteranganAsisten({ peran, className = '' }) {
  const { t } = useBahasa()
  return <span className={className}>{t(peran === 'dosen' ? 'Tanya soal VIBE dan nilai kelas Anda' : 'Tanya soal VIBE dan nilaimu')}</span>
}

/** Ubin logo VIBE di atas navy, tempat gambar logonya dibuat; di latar terang pita paling mudanya hampir hilang. */
export function UbinAsisten({ besar = false }) {
  return (
    <span
      aria-hidden="true"
      className={
        // Garis tipis di mode gelap: navy ubinnya hampir sama dengan panel di belakangnya.
        'grid shrink-0 place-items-center bg-brand-deep dark:ring-1 dark:ring-white/15 ' +
        (besar ? 'h-10 w-10 rounded-2xl' : 'h-9 w-9 rounded-xl')
      }
    >
      <LogoVibe hiasan className={besar ? 'h-auto w-6' : 'h-auto w-[22px]'} />
    </span>
  )
}

/**
 * Jawaban model sebagai paragraf dan daftar, tanpa HTML mentah. Model diminta menulis teks biasa; tanda Markdown yang
 * tetap lolos (** dan #) dibuang.
 */
function TeksJawaban({ teks }) {
  const blok = []
  for (const baris of teks.replace(/\*\*/g, '').replace(/^#{1,6}\s+/gm, '').split('\n')) {
    const butir = baris.match(/^\s*([-•*]|\d+[.)])\s+(.*)$/)
    const akhir = blok[blok.length - 1]
    if (butir) {
      const jenis = /\d/.test(butir[1]) ? 'urut' : 'daftar'
      if (akhir?.jenis === jenis) akhir.isi.push(butir[2])
      else blok.push({ jenis, isi: [butir[2]] })
    } else if (!baris.trim()) {
      blok.push({ jenis: 'jeda' })
    } else if (akhir?.jenis === 'paragraf') {
      akhir.isi.push(baris)
    } else {
      blok.push({ jenis: 'paragraf', isi: [baris] })
    }
  }
  return (
    <div className="space-y-2">
      {blok.map((b, i) => {
        if (b.jenis === 'jeda') return null
        if (b.jenis === 'paragraf') return <p key={i} className="whitespace-pre-line">{b.isi.join('\n')}</p>
        const Daftar = b.jenis === 'urut' ? 'ol' : 'ul'
        return (
          <Daftar key={i} className={(b.jenis === 'urut' ? 'list-decimal' : 'list-disc') + ' space-y-1 pl-5 marker:text-ink-3'}>
            {b.isi.map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </Daftar>
        )
      })}
    </div>
  )
}

function Gelembung({ p, terakhir, onUlangi }) {
  const { t } = useBahasa()
  if (p.dari === 'saya') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-brand px-3 py-2 text-[14px] leading-snug text-white">
          {p.teks}
        </p>
      </div>
    )
  }
  const menunggu = !p.teks && !p.galat && !p.dihentikan
  return (
    <div className="flex justify-start">
      <div className="min-w-0 max-w-[92%] break-words rounded-2xl rounded-bl-md border border-line bg-surface px-3 py-2 text-[14px] leading-relaxed text-ink">
        {p.teks ? <TeksJawaban teks={p.teks} /> : null}
        {menunggu ? (
          <p className="text-ink-2">
            {t('Sedang menyiapkan jawaban')}
            <span className="asisten-titik" aria-hidden="true">
              …
            </span>
          </p>
        ) : null}
        {p.dihentikan ? <p className={'text-[12.5px] text-ink-2' + (p.teks ? ' mt-1.5' : '')}>{t('Jawaban dihentikan.')}</p> : null}
        {p.galat ? (
          <div role="alert" className={p.teks ? 'mt-2' : ''}>
            <p className="flex items-start gap-1.5 text-[13px] font-semibold leading-snug text-[var(--critical)]">
              <IconAlert size={15} className="mt-0.5 shrink-0" />
              {t(p.galat)}
            </p>
            {terakhir ? (
              <button
                type="button"
                onClick={onUlangi}
                className="mt-1.5 rounded-md text-[13px] font-bold text-brand-ink underline-offset-2 hover:underline"
              >
                {t('Coba lagi')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Isi panel bantuan saat Asisten VIBE dibuka. `peran`: 'mahasiswa' | 'dosen'; `onKembali`: kembali ke pilihan bantuan. */
export function PanelAsisten({ asisten, peran, onKembali }) {
  const { t } = useBahasa()
  const [teks, setTeks] = useState('')
  const isian = useRef(null)
  const daftar = useRef(null)
  const kembali = useRef(null)
  // Daftar pesan ikut turun ke jawaban terbaru, kecuali pengguna sedang membaca bagian atasnya.
  const menempel = useRef(true)
  const lokal = modeLokal()
  const dosen = peran === 'dosen'
  const saran = dosen
    ? [
        t('Komponen mana yang nilainya belum lengkap?'),
        t('Siapa saja mahasiswa dengan rata-rata di bawah ambang sertifikat?'),
        t('Bagaimana cara mengunggah nilai?'),
      ]
    : [
        t('Berapa nilai akhirku sekarang?'),
        t('Aspek mana yang paling perlu kutingkatkan?'),
        t('Apa saja syarat sertifikat yang belum kupenuhi?'),
      ]

  // Pilihan yang dibuka sudah hilang dari layar, jadi fokus pindah ke dalam percakapan.
  useEffect(() => {
    if (bertetikus() && !isian.current?.disabled) isian.current?.focus()
    else kembali.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const el = daftar.current
    if (el && menempel.current) el.scrollTop = el.scrollHeight
  }, [asisten.pesan])

  // Kotak tulis ikut meninggi sampai sekitar empat baris, lalu bergulir.
  useEffect(() => {
    const el = isian.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 112) + 'px'
  }, [teks])

  const kirim = (isi) => {
    if (lokal || asisten.sedang || !isi.trim()) return
    menempel.current = true
    asisten.kirim(isi)
    setTeks('')
    // Contoh pertanyaan yang ditekan ikut hilang; fokusnya dikembalikan ke kotak tulis untuk pertanyaan berikutnya.
    if (bertetikus()) isian.current?.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3 py-2.5">
        <button
          ref={kembali}
          type="button"
          onClick={onKembali}
          aria-label={t('Kembali ke pilihan bantuan')}
          title={t('Kembali ke pilihan bantuan')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] hover:text-ink"
        >
          <IconArrowLeft size={18} />
        </button>
        <UbinAsisten />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight text-ink">{t('Asisten VIBE')}</p>
          <KeteranganAsisten peran={peran} className="block truncate text-[12px] leading-snug text-ink-2" />
        </div>
        {asisten.pesan.length ? (
          <button
            type="button"
            onClick={asisten.mulaiBaru}
            aria-label={t('Mulai percakapan baru')}
            title={t('Mulai percakapan baru')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] hover:text-ink"
          >
            <IconRefresh size={17} />
          </button>
        ) : null}
      </div>

      <div
        ref={daftar}
        role="log"
        aria-label={t('Percakapan dengan Asisten VIBE')}
        aria-busy={asisten.sedang}
        onScroll={(e) => {
          const el = e.currentTarget
          menempel.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {asisten.pesan.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[14px] leading-relaxed text-ink">
              {dosen
                ? t('Halo! Saya Asisten VIBE. Tanyakan soal VIBE, nilai kelas Anda, atau cara mengunggah nilai.')
                : t('Halo! Saya Asisten VIBE. Tanyakan apa saja soal VIBE, nilaimu, atau sertifikatmu.')}
            </p>
            <div>
              <p className="text-[12px] font-bold text-ink-2">{t('Contoh pertanyaan')}</p>
              <ul className="mt-1.5 space-y-1.5">
                {saran.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={lokal}
                      onClick={() => kirim(s)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-left text-[13.5px] leading-snug text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          asisten.pesan.map((p, i) => (
            <Gelembung key={p.id} p={p} terakhir={i === asisten.pesan.length - 1} onUlangi={asisten.ulangi} />
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          kirim(teks)
        }}
        className="border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3 pb-3 pt-2.5"
      >
        {lokal ? (
          <p className="mb-2 rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] leading-snug text-ink-2">
            {t('Asisten VIBE butuh sambungan ke server, jadi tidak aktif di mode uji lokal.')}
          </p>
        ) : null}
        {/* Bingkai ini yang menandai fokus (.asisten-isian di index.css), jadi kotak tulisnya tidak memakai outline sendiri. */}
        <div className="asisten-isian flex items-end gap-2 rounded-2xl border border-line bg-surface p-1.5 pl-3 transition">
          <label htmlFor="tanya-asisten" className="sr-only">
            {t('Tulis pertanyaan')}
          </label>
          {/* 16px di HP: Safari iPhone memperbesar halaman bila kotak tulisnya lebih kecil dari itu. */}
          <textarea
            id="tanya-asisten"
            ref={isian}
            rows={1}
            value={teks}
            maxLength={PANJANG_MAKS}
            disabled={lokal}
            placeholder={t('Tulis pertanyaan')}
            onChange={(e) => setTeks(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                kirim(teks)
              }
            }}
            className="min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[16px] leading-snug text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none sm:text-[14px]"
          />
          {asisten.sedang ? (
            <button
              type="button"
              onClick={asisten.hentikan}
              aria-label={t('Hentikan jawaban')}
              title={t('Hentikan jawaban')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink transition hover:brightness-95"
            >
              <IconHentikan size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={lokal || !teks.trim()}
              aria-label={t('Kirim pertanyaan')}
              title={t('Kirim pertanyaan')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconArrowRight size={17} />
            </button>
          )}
        </div>
        <p className="mt-1.5 flex gap-2 px-1 text-[11.5px] leading-snug text-ink-2">
          <span className="min-w-0 flex-1">
            {t('Jawaban dibuat AI dan bisa keliru. Angka resmi tetap yang tertera di halaman nilai.')}
          </span>
          {teks.length > PANJANG_MAKS - 200 ? (
            <span className="shrink-0 tabular-nums">{t('{n} dari {maks}', { n: teks.length, maks: PANJANG_MAKS })}</span>
          ) : null}
        </p>
      </form>
    </div>
  )
}
