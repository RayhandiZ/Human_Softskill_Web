import Link from 'next/link'
import { useTeks } from '../../lib/bahasa'
import { KONTAK_UMN } from '../../lib/layanan'
import { TautanNav } from '../../lib/nav'
import { IconMail, IconPhone } from '../Icons'
import LogoPdp from './LogoPdp'
import LogoVibe from './LogoVibe'

const KONTAK = [
  { icon: IconPhone, teks: KONTAK_UMN.telepon.tampil, href: KONTAK_UMN.telepon.tautan },
  { icon: IconMail, teks: KONTAK_UMN.surel.tampil, href: KONTAK_UMN.surel.tautan },
]

/**
 * Pintasan footer dari butir menu panel, menurut urutan `alamat`. Diambil dari menu yang sudah disaring per peran, jadi
 * label dan hak aksesnya ikut menu; alamat yang tidak ada di menu peran itu dilewati.
 */
export function pintasanDari(menu, alamat) {
  return alamat
    .map((ke) => menu.find((m) => m.to === ke))
    .filter(Boolean)
    .map(({ to, label, icon }) => ({ ke: to, label, icon }))
}

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

/** `tentang`: alamat halaman Tentang VIBE panel ini; bila ada, logo VIBE di kapsul logo menjadi tautan ke sana. */
export default function Footer({ pintasan = [], kelasIsi = 'max-w-shell px-5 sm:px-6', tentang = null }) {
  const t = useTeks()
  const merekVibe = (
    <>
      <LogoVibe hiasan terang="tetap" className="h-[22px] w-auto shrink-0" />
      <span className="teks-vibe teks-vibe-putih text-[14px] font-extrabold tracking-tight text-[#0f766e]">
        VIBE
      </span>
    </>
  )
  return (
    <footer className="mt-12 bg-brand text-white print:hidden">
      <div className={'mx-auto grid gap-x-7 gap-y-7 py-9 lg:grid-cols-2 xl:grid-cols-[auto_1fr_auto_auto] ' + kelasIsi}>
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

        {/* Deretan logo UMN, VIBE, dan PDP di alas putih, juga di mode gelap, karena logo UMN dan PDP berwarna gelap. */}
        {/* xl:mr-8: di layar lebar kolom ini paling kanan; diberi jarak supaya kapsulnya tidak menempel ke tepi kanan. */}
        {/* w-fit: selebar kapsulnya, supaya keterangan di bawahnya bisa ditengahkan tepat di bawah kapsul. */}
        <section className="w-fit lg:order-2 lg:pt-2 xl:order-4 xl:mr-8">
          <div className="flex w-fit items-center gap-3 rounded-full bg-white px-5 py-2 shadow-card">
            <img
              src="/logo-umn.png"
              width={114}
              height={192}
              alt="Universitas Multimedia Nusantara"
              draggable={false}
              className="h-9 w-auto shrink-0"
            />
            <span aria-hidden="true" className="h-7 w-px shrink-0 bg-[#d5d9e3]" />
            {tentang ? (
              <TautanNav
                href={tentang}
                end
                aria-label={t('Tentang VIBE')}
                title={t('Tentang VIBE')}
                /* Garis fokus navy: alasnya putih juga di mode gelap, dan --brand-ink mode gelap (biru muda) nyaris hilang di putih. */
                className="flex shrink-0 items-center gap-1 rounded-md transition-opacity hover:opacity-75 focus-visible:outline-[#12508f]"
              >
                {merekVibe}
              </TautanNav>
            ) : (
              <span className="flex shrink-0 items-center gap-1">{merekVibe}</span>
            )}
            <span aria-hidden="true" className="h-7 w-px shrink-0 bg-[#d5d9e3]" />
            <LogoPdp className="h-9 w-auto shrink-0 text-[#082a52]" />
          </div>
          <p className="mt-3 text-center text-[12.5px] leading-snug text-white/100">
            {t('Biro Kemahasiswaan & Humaniora')}
            <br />
            Universitas Multimedia Nusantara
          </p>
        </section>
      </div>

      <div className="border-t border-white/15 py-4 text-center text-[13px] text-white/100 max-sm:pb-[25px]">
      © Universitas Multimedia Nusantara. Design by Rayhandi Zulmi
      </div>
    </footer>
  )
}
