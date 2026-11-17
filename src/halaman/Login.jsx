import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LABEL_PERAN, panelPengguna, roleFromEmail, useAuth } from '../lib/auth'
import { IconAlert, IconArrowRight, IconEye, IconEyeOff } from '../components/Icons'
import KerangkaMasuk from '../components/KerangkaMasuk'
import { useTeks } from '../lib/bahasa'

export default function Login() {
  const { user, login } = useAuth()
  const t = useTeks()
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) router.replace(panelPengguna(user))
  }, [user, router])

  if (user) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const next = await login(form)
      router.replace(panelPengguna(next))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const detected = form.email.includes('@') ? roleFromEmail(form.email) : null

  return (
    // Latar, panel kiri, dan judul VIBE ada di KerangkaMasuk, bersama halaman lupa dan atur kata sandi.
    <KerangkaMasuk>
          {/* Kartu kaca dari judul Masuk sampai tombol Masuk; lihat index.css › kartu kaca halaman masuk. */}
          <div className="kaca-masuk p-6 sm:p-9">
            <h2 className="text-[26px] font-extrabold tracking-tight text-ink">
              {t('Masuk')}
            </h2>
            <p className="mt-2 text-[14px] text-white/80">
              {t('Masuk menggunakan akun SSO kampus.')}
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="mb-2 block text-[13px] font-bold text-ink">
                  {t('Alamat email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="field"
                  placeholder="name@student.umn.ac.id"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <label htmlFor="password" className="mb-2 block text-[13px] font-bold text-ink">
                    {t('Kata sandi')}
                  </label>

                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="field pr-12"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                  />
                  {/* Mata: kata sandi tampil selama kursor di atasnya (tetikus) atau selama ditahan jari (sentuh).
                      Enter/Spasi (klik tanpa tetikus, detail 0) menyalakan dan mematikannya untuk papan ketik dan
                      pembaca layar. mousedown dicegah supaya fokus tetap di kolom sandi dan papan ketik HP tidak
                      tertutup; lihat juga .mata-sandi di index.css. */}
                  <button
                    type="button"
                    aria-label={t('Lihat kata sandi')}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setShowPassword(true)}
                    onPointerLeave={() => setShowPassword(false)}
                    onPointerDown={(e) => e.pointerType !== 'mouse' && setShowPassword(true)}
                    onPointerUp={(e) => e.pointerType !== 'mouse' && setShowPassword(false)}
                    onPointerCancel={() => setShowPassword(false)}
                    onMouseDown={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => {
                      if (e.detail === 0) setShowPassword((v) => !v)
                    }}
                    className="mata-sandi absolute right-4 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-white/75 transition-colors hover:text-white"
                  >
                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>
              
                {/* Halaman lupa kata sandi VIBE sendiri (16 Nov 2026). Sebelumnya tautan ini membuka lupa kata sandi SSO UMN,
                    padahal kata sandi VIBE disimpan sendiri dan tidak ikut berubah. */}
                <div className="mt-2 flex justify-end">
                  <Link
                    href="/lupa-sandi"
                    className="inline-flex min-h-[44px] items-center gap-1 text-[12.5px] font-semibold text-brand-ink hover:underline sm:min-h-0"
                  >
                    {t('Lupa kata sandi?')}
                  </Link>
                </div>
              </div>
              
              {error ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
                >
                  <IconAlert size={16} className="mt-px shrink-0" />
                  {t(error)}
                </p>
              ) : null}

              {/* Gradasi biru dengan kilau saat ditunjuk dan pemutar saat memverifikasi; lihat .tombol-masuk di index.css. */}
              <button type="submit" className="btn tombol-masuk w-full py-3.5 text-white" disabled={busy} aria-busy={busy}>
                {busy ? (
                  <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                ) : null}
                <span>{t(busy ? 'Memverifikasi…' : 'Masuk')}</span>
                {busy ? null : <IconArrowRight size={17} className="panah-masuk" />}
              </button>
            </form>
          </div>
    </KerangkaMasuk>
  )
}
