import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LABEL_PERAN, panelUntuk, roleFromEmail, useAuth } from '../lib/auth'
import { IconAlert, IconTabBaru } from '../components/Icons'
import LogoPdp from '../components/LogoPdp'
import { useTeks } from '../lib/bahasa'
import { SSO_LUPA_SANDI } from '../lib/layanan'
import TombolBahasa from '../components/TombolBahasa'
import { AREA } from '../lib/curriculum'

export default function Login() {
  const { user, login } = useAuth()
  const t = useTeks()
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) router.replace(panelUntuk(user.role))
  }, [user, router])

  if (user) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const next = await login(form)
      router.replace(panelUntuk(next.role))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const detected = form.email.includes('@') ? roleFromEmail(form.email) : null

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_minmax(420px,540px)]">
      {/* --------------------------- panel kiri --------------------------- */}
      <aside className="relative hidden overflow-hidden bg-brand-deep p-12 text-white lg:flex lg:flex-col">
        <svg className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] opacity-[.09]" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="98" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="72" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="46" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="20" fill="white" />
        </svg>

        <div className="flex items-start gap-4 self-start">
          <LogoPdp className="h-[92px] w-auto text-white" />
          <div className="flex h-[54px] items-center gap-4">
            <span aria-hidden="true" className="h-10 w-px bg-white/30" />
            <span className="text-[22px] font-extrabold tracking-tight">
              HUMAN <span className="text-[var(--accent)]">SOFTSKILL</span>
            </span>
          </div>
        </div>

        <div className="my-auto max-w-lg">
          <h1 className="mt-4 text-[35px] font-extrabold leading-[1.1] tracking-tight">
            {t('Apa sih HUMAN Softskill itu?')}
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            {t(
              'HUMAN Softskill merupakan sistem penilaian softskill yang dirancang untuk mengevaluasi dan mengembangkan kemampuan interpersonal, keterampilan teknis, dan kompetensi lainnya pada mahasiswa Universitas Multimedia Nusantara. Diantaranya ada tiga penilaian seperti dibawah ini:'
            )}
          </p>

          <ul className="mt-9 space-y-3">
            {AREA.map((a) => (
              <li key={a.id} className="flex items-center gap-3.5">
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl text-[13px] font-extrabold text-white"
                  style={{ background: a.warna }}
                >
                  {a.id}
                </span>
                <div>
                  <p className="text-[14.5px] font-bold">{t(a.nama)}</p>
                  <p className="text-[12.5px] text-white/55">{t(a.ringkas)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12.5px] text-white/45">
          Universitas Multimedia Nusantara
        </p>
      </aside>

      {/* -------------------------- panel kanan --------------------------- */}
      <main className="flex items-center justify-center bg-bg px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px] animate-rise">
          <div className="mb-6 flex justify-end">
            <TombolBahasa nada="terang" />
          </div>

          <div className="mb-8 flex items-center justify-center gap-3 text-ink lg:hidden">
            <LogoPdp keterangan={false} className="h-7 w-auto" />
            <span aria-hidden="true" className="h-6 w-px bg-line" />
            <span className="text-[15px] font-extrabold tracking-tight">HUMAN SOFTSKILL</span>
          </div>

          <h2 className="text-[26px] font-extrabold tracking-tight text-ink">
            {t('Masuk')}
          </h2>
          <p className="mt-2 text-[14px] text-ink-2">
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
                  className="field pr-20"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-ink-3 transition hover:bg-surface-2 hover:text-ink-2"
                >
                  {t(showPassword ? 'Sembunyikan' : 'Tampilkan')}
                </button>
              </div>
              
              <div className="mt-2 flex justify-end">
                <a
                  href={SSO_LUPA_SANDI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1 text-[12.5px] font-semibold text-brand-ink hover:underline sm:min-h-0"
                >
                  {t('Lupa kata sandi?')}
                  <IconTabBaru size={13} className="shrink-0" />
                  <span className="sr-only">{' ' + t('(membuka SSO UMN di tab baru)')}</span>
                </a>
              </div>
            </div>
              
            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
              >
                <IconAlert size={16} className="mt-px shrink-0" />
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary w-full py-3.5" disabled={busy}>
              {t(busy ? 'Memverifikasi…' : 'Masuk')}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
