import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconAlert, IconArrowLeft, IconArrowRight, IconMail } from '../components/Icons'
import KerangkaMasuk from '../components/KerangkaMasuk'
import { useBahasa } from '../lib/bahasa'

/* Lupa kata sandi, langkah 1 (16 Nov 2026): mahasiswa atau dosen mengisi email kampusnya, lalu server mengirim tautan
   /atur-sandi yang berlaku 30 menit. Jawabannya sama untuk email terdaftar dan tidak, jadi halaman ini selalu menulis
   "jika terdaftar". Server menolak permintaan kedua dalam semenit, jadi kirim ulang baru aktif sesudah 60 detik. Lihat
   src/server/lupaSandi.js dan README.md › Lupa kata sandi. */

const JEDA_KIRIM_ULANG = 60

/** POST JSON ke `url`; galat jaringan dan galat server dilempar sebagai Error berpesan kalimat kamus. */
export async function kirimJson(url, isi) {
  let jawaban
  try {
    jawaban = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isi) })
  } catch {
    throw new Error('Server tidak bisa dihubungi. Periksa koneksi, lalu coba lagi.')
  }
  const data = await jawaban.json().catch(() => ({}))
  if (!jawaban.ok) throw new Error(data.galat ?? 'Server sedang bermasalah. Coba lagi sebentar lagi.')
  return data
}

function PesanGalat({ children }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
    >
      <IconAlert size={16} className="mt-px shrink-0" />
      {children}
    </p>
  )
}

export function KembaliMasuk() {
  const { t } = useBahasa()
  return (
    <Link
      href="/masuk"
      className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-brand-ink hover:underline sm:min-h-[24px]"
    >
      <IconArrowLeft size={15} className="shrink-0" />
      {t('Kembali ke halaman masuk')}
    </Link>
  )
}

export default function LupaSandi() {
  const { t, bahasa } = useBahasa()
  const [email, setEmail] = useState('')
  const [terkirim, setTerkirim] = useState(false)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [tunggu, setTunggu] = useState(0)
  const judul = useRef(null)

  useEffect(() => {
    if (!tunggu) return undefined
    const id = setTimeout(() => setTunggu((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [tunggu])

  async function kirim(e) {
    e?.preventDefault()
    setGalat('')
    if (!email.trim()) return setGalat('Email wajib diisi.')
    setSibuk(true)
    try {
      await kirimJson('/api/lupa-sandi', { email, bahasa })
      setTerkirim(true)
      setTunggu(JEDA_KIRIM_ULANG)
      // Pembaca layar langsung membacakan hasilnya.
      requestAnimationFrame(() => judul.current?.focus())
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <KerangkaMasuk>
      <div className="kaca-masuk p-6 sm:p-9">
        {terkirim ? (
          <>
            <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[var(--accent-ink)]">
              <IconMail size={24} />
            </span>
            <h2 ref={judul} tabIndex={-1} className="mt-5 text-[26px] font-extrabold tracking-tight text-ink outline-none">
              {t('Periksa email Anda')}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">
              {t('Jika {email} terdaftar sebagai akun mahasiswa atau dosen, tautan untuk membuat kata sandi baru sudah dikirim ke sana. Tautannya berlaku 30 menit dan hanya bisa dipakai sekali.', { email: email.trim().toLowerCase() })}
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">
              {t('Belum masuk? Periksa folder spam, atau kirim ulang.')}
            </p>

            {galat ? <div className="mt-5"><PesanGalat>{t(galat)}</PesanGalat></div> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => kirim()}
                disabled={sibuk || tunggu > 0}
                aria-busy={sibuk}
                className="btn tombol-masuk px-5 py-3 text-white disabled:opacity-60"
              >
                {sibuk ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : null}
                <span>{tunggu > 0 ? t('Kirim ulang ({n} detik)', { n: tunggu }) : t('Kirim ulang')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTerkirim(false)
                  setGalat('')
                }}
                className="inline-flex min-h-[44px] items-center px-2 text-[13px] font-semibold text-brand-ink hover:underline"
              >
                {t('Ganti email')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Lupa kata sandi')}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/80">
              {t('Masukkan email kampus akun mahasiswa atau dosen Anda. Kami kirim tautan untuk membuat kata sandi baru.')}
            </p>

            <form onSubmit={kirim} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="email-lupa" className="mb-2 block text-[13px] font-bold text-ink">
                  {t('Alamat email')}
                </label>
                <input
                  id="email-lupa"
                  type="email"
                  autoComplete="username"
                  className="field"
                  placeholder="name@student.umn.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {galat ? <PesanGalat>{t(galat)}</PesanGalat> : null}

              <button type="submit" className="btn tombol-masuk w-full py-3.5 text-white" disabled={sibuk} aria-busy={sibuk}>
                {sibuk ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : null}
                <span>{t(sibuk ? 'Mengirim…' : 'Kirim tautan')}</span>
                {sibuk ? null : <IconArrowRight size={17} className="panah-masuk" />}
              </button>
            </form>

            <p className="mt-5 text-[12.5px] leading-relaxed text-white/70">
              {/* Super Admin hanya bisa memberi sandi awal saat membuat akun, belum mengatur ulang sandi akun yang ada. */}
              {t('Akun admin Kemahasiswaan dan Super Admin tidak menerima tautan ini. Hubungi pengelola VIBE.')}
            </p>
          </>
        )}

        <KembaliMasuk />
      </div>
    </KerangkaMasuk>
  )
}
