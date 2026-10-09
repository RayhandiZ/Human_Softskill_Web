import Link from 'next/link'
import { useTeks } from '../lib/bahasa'
import { KONTAK_UMN } from '../lib/layanan'
import { IconLogo, IconMail, IconPhone } from './Icons'
import LogoPdp from './LogoPdp'

const KONTAK = [
  { icon: IconPhone, teks: KONTAK_UMN.telepon.tampil, href: KONTAK_UMN.telepon.tautan },
  { icon: IconMail, teks: KONTAK_UMN.surel.tampil, href: KONTAK_UMN.surel.tautan },
]

function Pintasan({ ke, label, icon: Icon }) {
  const t = useTeks()
  return (
    <li>
      <Link
        href={ke}
        className="flex w-[84px] flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition hover:bg-white/10"
      >
        <Icon size={30} />
        <span className="text-[12.5px] font-semibold leading-tight">{t(label)}</span>
      </Link>
    </li>
  )
}

export default function Footer({ pintasan = [] }) {
  const t = useTeks()
  return (
    <footer className="mt-12 bg-brand text-white print:hidden">
      <div className="mx-auto grid max-w-shell gap-x-10 gap-y-9 px-5 py-10 sm:px-6 lg:grid-cols-[auto_1fr_auto_auto]">
        {pintasan.length ? (
          <section>
            <h2 className="text-[13.5px] font-bold">{t('Pintasan')}</h2>
            <ul className="mt-3 flex flex-wrap gap-1">
              {pintasan.map((p) => (
                <Pintasan key={p.ke} {...p} />
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="text-[13.5px] font-bold">{t('Helpdesk')}</h2>
          <address className="mt-3 space-y-1 text-[13.5px] not-italic leading-relaxed text-white/80">
            <p>Gedung B, Lantai 3 Ruang B315</p>
            <p>Jl. Scientia Boulevard, Gading Serpong,</p>
            <p>kel. Curug Sangereng, Kec. Kelapa Dua,</p>
            <p>Kab. Tangerang, Prop. Banten 15811, Indonesia</p>
            <p className="pt-1">{t('Senin sampai Jumat, 08.00 hingga 17.00 WIB')}</p>
          </address>
        </section>

        <section className="lg:pt-7">
          <ul className="space-y-3 text-[13.5px] text-white/85">
            {KONTAK.map(({ icon: Icon, teks, href }) => (
              <li key={teks} className="flex items-center gap-3">
                <Icon size={18} className="shrink-0 text-white/70" />
                {href ? (
                  <a href={href} className="underline-offset-4 hover:text-white hover:underline">
                    {teks}
                  </a>
                ) : (
                  <span>{teks}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:pt-4">
          <div className="flex items-center gap-3.5">
            <LogoPdp keterangan={false} className="h-10 w-auto shrink-0 text-white" />
            <span aria-hidden="true" className="h-8 w-px shrink-0 bg-white/30" />
            <IconLogo size={40} />
          </div>
          <p className="mt-3 text-[16px] font-extrabold tracking-tight">
            HUMAN <span className="text-[var(--accent)]">SKILL</span>
          </p>
          <p className="mt-1.5 max-w-[220px] text-[13px] leading-relaxed text-white/70">
            {t('Biro Kemahasiswaan & Humaniora')}
            <br />
            Universitas Multimedia Nusantara
          </p>
        </section>
      </div>

      <div className="border-t border-white/15 py-4 text-center text-[13px] text-white/70">
        © Universitas Multimedia Nusantara. Design by Rayhandi Zulmi
      </div>
    </footer>
  )
}
