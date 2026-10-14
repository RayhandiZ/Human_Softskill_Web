import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LABEL_PERAN, panelPengguna, roleFromEmail, useAuth } from '../lib/auth'
import { IconAlert, IconTabBaru } from '../components/Icons'
import LogoPdp from '../components/LogoPdp'
import { useTeks } from '../lib/bahasa'
import { SSO_LUPA_SANDI } from '../lib/layanan'
import { AREA } from '../lib/curriculum'

/* Dipasang dua kali: di atas formulir untuk layar lebar, di dalam kolom formulir untuk layar sempit. */
function JudulAplikasi({ className = '' }) {
  const t = useTeks()
  return (
    <div className={'text-center ' + className}>
      <p className="text-[30px] font-extrabold leading-none tracking-tight text-ink">
        HUMAN <span className="text-[var(--accent-ink)]">SKILL</span>
      </p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink-2">
        <span aria-hidden="true" className="text-[var(--accent-ink)]">“</span>
        {t('Ayo semangat mencari human skill kamu.')}
        <span aria-hidden="true" className="text-[var(--accent-ink)]">”</span>
      </p>
    </div>
  )
}

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
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_minmax(420px,540px)]">
      {/* --------------------------- panel kiri --------------------------- */}
      <aside className="relative hidden overflow-hidden bg-brand-deep p-12 text-white lg:flex lg:flex-col">
        <svg className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] opacity-[.09]" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="98" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="72" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="46" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="20" fill="white" />
        </svg>

        {/* Pita kertas menggantung dari tepi atas panel, kakinya tergulung ke luar; lihat README.md › Gerak. */}
        <div className="-mt-12 mb-8 self-start">
          <div className="pita-logo">
            <div className="pita-kertas">
              {/* Tepi bergelombang dan bayangan lipatan saat diterpa angin. */}
              <span aria-hidden="true" className="pita-tepi pita-tepi-kiri" />
              <span aria-hidden="true" className="pita-tepi pita-tepi-kanan" />
              <span aria-hidden="true" className="pita-lipat" />
              <LogoPdp className="h-[84px] w-auto text-brand-deep" />
            </div>
            <span aria-hidden="true" className="pita-tongkat" />
            <span aria-hidden="true" className="pita-gulungan" />
          </div>
        </div>

        <div className="my-auto max-w-lg">
          <h1 className="mt-4 text-[35px] font-extrabold leading-[1.1] tracking-tight">
            {t('Apa sih Human Skill itu?')}
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            {t(
              'Human Skill merupakan sistem penilaian yang dirancang untuk mengevaluasi dan mengembangkan kemampuan interpersonal, keterampilan teknis, dan kompetensi lainnya pada mahasiswa Universitas Multimedia Nusantara. Diantaranya ada tiga penilaian seperti dibawah ini:'
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
      <main className="flex flex-col bg-bg px-5 pb-12 pt-6 sm:px-10 lg:pt-12">
        <JudulAplikasi className="mx-auto mt-8 hidden w-full max-w-[400px] lg:block" />
        {/* Di layar sempit kolom ini menempel ke atas; di layar lebar ia di tengah. */}
        <div className="mx-auto w-full max-w-[400px] animate-rise lg:my-auto">
          {/* Di layar lebar logo PDP ada di pita panel kiri. */}
          <LogoPdp keterangan={false} className="block h-7 w-auto text-ink lg:hidden" />
          <JudulAplikasi className="mb-8 mt-20 lg:hidden" />

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
