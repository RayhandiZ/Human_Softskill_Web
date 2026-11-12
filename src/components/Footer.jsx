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
        className="flex w-[76px] flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 text-center transition hover:bg-white/10"
      >
        <Icon size={26} />
        <span className="text-[12px] font-semibold leading-tight">{t(label)}</span>
      </Link>
    </li>
  )
}

export default function Footer({ pintasan = [], kelasIsi = 'max-w-shell px-5 sm:px-6' }) {
  const t = useTeks()
  return (
    <footer className="mt-12 bg-brand text-white print:hidden">
      <div className={'mx-auto grid gap-x-7 gap-y-7 py-7 lg:grid-cols-2 xl:grid-cols-[auto_1fr_auto_auto] ' + kelasIsi}>
        {pintasan.length ? (
          <section className="lg:order-1">
            <h2 className="text-[13px] font-bold">{t('Pintasan')}</h2>
            <ul className="mt-2 flex flex-wrap gap-1">
              {pintasan.map((p) => (
                <Pintasan key={p.ke} {...p} />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="lg:order-3 xl:order-2">
          <h2 className="text-[13px] font-bold">{t('Helpdesk')}</h2>
          <address className="mt-2 space-y-0.5 text-[13px] not-italic leading-normal text-white/100">
            <p>Gedung B, Lantai 3 Ruang B315</p>
            <p>Jl. Scientia Boulevard, Gading Serpong,</p>
            <p>kel. Curug Sangereng, Kec. Kelapa Dua,</p>
            <p>Kab. Tangerang, Prop. Banten 15811, Indonesia</p>
          </address>
        </section>

        {/* lg:pt-7: baris pertamanya sejajar baris pertama alamat (judul 19,5px + jarak 8px). */}
        <section className="lg:order-4 lg:pt-7 xl:order-3">
          <ul className="space-y-2 text-[13px] text-white/100">
            {KONTAK.map(({ icon: Icon, teks, href }) => (
              <li key={teks} className="flex items-center gap-3">
                <Icon size={16} className="shrink-0 text-white/100" />
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

        <section className="lg:order-2 lg:pt-2 xl:order-4">
          <div className="flex items-center gap-3">
            <LogoPdp keterangan={false} className="h-8 w-auto shrink-0 text-white" />
            <span aria-hidden="true" className="h-7 w-px shrink-0 bg-white/30" />
            <IconLogo size={32} />
          </div>
          <p className="teks-vibe mt-2 w-fit text-[18px] font-extrabold tracking-tight text-[var(--accent)]">
            VIBE
          </p>
          <p className="mt-1 max-w-[220px] text-[12.5px] leading-snug text-white/100">
            {t('Biro Kemahasiswaan & Humaniora')}
            <br />
            Universitas Multimedia Nusantara
          </p>
        </section>
      </div>

      <div className="border-t border-white/15 py-3 text-center text-[13px] text-white/100 max-sm:pb-[25px]">
      © Universitas Multimedia Nusantara. Design by Rayhandi Zulmi
      </div>
    </footer>
  )
}
