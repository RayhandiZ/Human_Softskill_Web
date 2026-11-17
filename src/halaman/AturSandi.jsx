import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconAlert, IconArrowRight, IconCheck } from '../components/Icons'
import KerangkaMasuk from '../components/KerangkaMasuk'
import { useBahasa } from '../lib/bahasa'
import { KembaliMasuk, kirimJson } from './LupaSandi'

/* Lupa kata sandi, langkah 2 (16 Nov 2026): halaman tujuan tautan di email, /atur-sandi?token=... Tokennya dibaca sekali,
   lalu dihapus dari bilah alamat (tidak tertinggal di riwayat atau terlihat orang di sebelah), diperiksa ke server, dan
   baru sesudah itu formulirnya tampil. Lihat src/server/lupaSandi.js dan README.md › Lupa kata sandi. */

const SANDI_MIN = 8

export default function AturSandi() {
  const { t } = useBahasa()
  // memeriksa → siap → selesai, atau mati bila tautannya kedaluwarsa, sudah dipakai, atau tidak dikenal.
  const [keadaan, setKeadaan] = useState('memeriksa')
  const [email, setEmail] = useState('')
  const [pesanMati, setPesanMati] = useState('')
  const [isian, setIsian] = useState({ sandi: '', ulang: '' })
  const [tampil, setTampil] = useState(false)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const token = useRef(null)
  const judul = useRef(null)

  useEffect(() => {
    // Dibaca sekali saja: efek ini berjalan dua kali di mode ketat React, dan sesudah yang pertama alamatnya sudah bersih.
    if (token.current === null) {
      token.current = new URLSearchParams(window.location.search).get('token') ?? ''
      if (token.current) window.history.replaceState(null, '', '/atur-sandi')
    }
    if (!token.current) {
      setKeadaan('mati')
      return undefined
    }
    let batal = false
    kirimJson('/api/atur-sandi', { token: token.current })
      .then((d) => {
        if (batal) return
        setEmail(d.email ?? '')
        setKeadaan('siap')
      })
      .catch((e) => {
        if (batal) return
        setPesanMati(e.message)
        setKeadaan('mati')
      })
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    if (keadaan !== 'memeriksa') judul.current?.focus()
  }, [keadaan])

  const set = (k) => (e) => setIsian((f) => ({ ...f, [k]: e.target.value }))

  async function simpan(e) {
    e.preventDefault()
    setGalat('')
    if (isian.sandi.length < SANDI_MIN) return setGalat('Kata sandi baru minimal 8 karakter.')
    if (isian.sandi !== isian.ulang) return setGalat('Kedua kata sandi tidak sama.')
    setSibuk(true)
    try {
      await kirimJson('/api/atur-sandi', { token: token.current, sandi: isian.sandi })
      setIsian({ sandi: '', ulang: '' })
      setKeadaan('selesai')
    } catch (err) {
      // Tautan yang mati di tengah jalan (kedaluwarsa saat formulir diisi) memindahkan halaman ke keadaan mati.
      if (err.message.startsWith('Tautan ini sudah tidak berlaku')) {
        setPesanMati(err.message)
        setKeadaan('mati')
      } else setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  const kelasJudul = 'text-[26px] font-extrabold tracking-tight text-ink outline-none'

  return (
    <KerangkaMasuk>
      <div className="kaca-masuk p-6 sm:p-9" aria-busy={keadaan === 'memeriksa'}>
        {keadaan === 'memeriksa' ? (
          <p role="status" className="flex items-center gap-3 text-[15px] font-semibold text-ink">
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            {t('Memeriksa tautan…')}
          </p>
        ) : null}

        {keadaan === 'mati' ? (
          <>
            <h2 ref={judul} tabIndex={-1} className={kelasJudul}>{t('Tautan tidak berlaku')}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">
              {t(pesanMati || 'Tautan ini sudah tidak berlaku. Minta tautan baru.')}
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">
              {t('Tautan atur ulang berlaku 30 menit dan hanya bisa dipakai sekali.')}
            </p>
            <Link href="/lupa-sandi" className="btn tombol-masuk mt-6 px-5 py-3 text-white">
              <span>{t('Minta tautan baru')}</span>
              <IconArrowRight size={17} className="panah-masuk" />
            </Link>
          </>
        ) : null}

        {keadaan === 'siap' ? (
          <>
            <h2 ref={judul} tabIndex={-1} className={kelasJudul}>{t('Buat kata sandi baru')}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/80">{t('Untuk akun {email}.', { email })}</p>

            <form onSubmit={simpan} className="mt-8 space-y-5" noValidate>
              {/* Nama pengguna tersembunyi untuk pengelola kata sandi peramban, supaya sandi baru disimpan ke akun yang benar. */}
              <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
              <div>
                <label htmlFor="sandi-baru" className="mb-2 block text-[13px] font-bold text-ink">
                  {t('Kata sandi baru')}
                </label>
                <input
                  id="sandi-baru"
                  type={tampil ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-describedby="sandi-syarat"
                  className="field"
                  value={isian.sandi}
                  onChange={set('sandi')}
                />
                <p id="sandi-syarat" className="mt-2 text-[12.5px] text-white/70">
                  {t('Minimal 8 karakter.')}
                </p>
              </div>
              <div>
                <label htmlFor="sandi-ulang" className="mb-2 block text-[13px] font-bold text-ink">
                  {t('Ulangi kata sandi baru')}
                </label>
                <input
                  id="sandi-ulang"
                  type={tampil ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="field"
                  value={isian.ulang}
                  onChange={set('ulang')}
                />
              </div>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink sm:min-h-[24px]">
                <input type="checkbox" checked={tampil} onChange={(e) => setTampil(e.target.checked)} className="h-4 w-4 accent-[var(--brand-ink)]" />
                {t('Tampilkan kata sandi')}
              </label>

              {galat ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
                >
                  <IconAlert size={16} className="mt-px shrink-0" />
                  {t(galat)}
                </p>
              ) : null}

              <button type="submit" className="btn tombol-masuk w-full py-3.5 text-white" disabled={sibuk} aria-busy={sibuk}>
                {sibuk ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : null}
                <span>{t(sibuk ? 'Menyimpan…' : 'Simpan kata sandi baru')}</span>
              </button>
            </form>
          </>
        ) : null}

        {keadaan === 'selesai' ? (
          <>
            <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[var(--accent-ink)]">
              <IconCheck size={24} />
            </span>
            <h2 ref={judul} tabIndex={-1} className={'mt-5 ' + kelasJudul}>{t('Kata sandi sudah diganti')}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">{t('Silakan masuk dengan kata sandi baru Anda.')}</p>
            <Link href="/masuk" className="btn tombol-masuk mt-6 w-full py-3.5 text-white">
              <span>{t('Masuk')}</span>
              <IconArrowRight size={17} className="panah-masuk" />
            </Link>
          </>
        ) : null}

        {keadaan === 'siap' || keadaan === 'mati' ? <KembaliMasuk /> : null}
      </div>
    </KerangkaMasuk>
  )
}
