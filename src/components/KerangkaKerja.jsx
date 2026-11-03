import Link from 'next/link'
import { IconChevronRight } from './Icons'
import LogoPdp from './LogoPdp'
import MenuSamping from './MenuSamping'
import { PemanduBaca, useAkarAksesibilitas } from './MenuAksesibilitas'
import { useTeks } from '../lib/bahasa'

/* Kerangka bersama panel dosen, Kemahasiswaan, dan Super Admin: menu samping yang mengambang dan bilah atas kapsul.
   Hanya tampilan. Daftar menu, lencana, dan isi bilah atas tetap ditentukan tiap panel (DosenLayout, AdminLayout,
   SuperLayout), jadi hak akses dan tindakan per peran tidak berubah di sini. Lihat README.md › Panel kerja. */

/** Logo di menu samping. `gelap`: di atas permukaan navy Super Admin. */
function MerekSamping({ beranda, gelap }) {
  return (
    <Link href={beranda} className="flex items-center gap-2.5 px-2.5">
      <LogoPdp keterangan={false} className={'h-7 w-auto shrink-0 ' + (gelap ? 'text-white' : 'text-ink')} />
      <span aria-hidden="true" className={'h-6 w-px shrink-0 ' + (gelap ? 'bg-white/25' : 'bg-line')} />
      <span
        className={
          'teks-vibe whitespace-nowrap text-[20px] font-extrabold tracking-tight ' +
          (gelap ? 'text-[var(--accent)]' : 'teks-vibe-terang text-[var(--accent-ink)]')
        }
      >
        VIBE
      </span>
    </Link>
  )
}

/** Logo di bilah atas layar kecil. `ringkas`: di HP hanya logo PDP, supaya tombol di bilah atas muat sampai lebar 360px. */
export function MerekAtas({ beranda, ringkas = true }) {
  return (
    <Link href={beranda} className="flex shrink-0 items-center gap-2.5 lg:hidden">
      <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
      <span aria-hidden="true" className={'h-6 w-px shrink-0 bg-line ' + (ringkas ? 'hidden sm:block' : '')} />
      <span
        className={
          'teks-vibe teks-vibe-terang text-[16px] font-extrabold tracking-tight text-[var(--accent-ink)] ' +
          (ringkas ? 'hidden sm:block' : '')
        }
      >
        VIBE
      </span>
    </Link>
  )
}

/**
 * Lokasi halaman di bilah atas. `lapis`: daftar { label, ke } sesudah `akar`; yang terakhir adalah halaman yang terbuka
 * dan tidak bertautan. Tersembunyi di layar kecil, tempat bilah atas hanya memuat tombol.
 */
export function RemahKerja({ akar, lapis = [] }) {
  const t = useTeks()
  return (
    <nav aria-label={t('Lokasi halaman')} className="hidden min-w-0 lg:block">
      <ol className="flex min-w-0 items-center gap-1.5 text-[14px]">
        <li className="shrink-0">
          {lapis.length ? (
            <Link href={akar.ke} className="inline-flex min-h-[24px] items-center font-semibold text-ink-2 transition hover:text-brand-ink">
              {t(akar.label)}
            </Link>
          ) : (
            <span aria-current="page" className="font-bold text-ink">
              {t(akar.label)}
            </span>
          )}
        </li>
        {lapis.map((l, i) => (
          <li key={l.label} className="flex min-w-0 items-center gap-1.5">
            <IconChevronRight size={14} className="shrink-0 text-ink-2" />
            {l.ke ? (
              <Link href={l.ke} className="inline-flex min-h-[24px] min-w-0 items-center font-semibold text-ink-2 transition hover:text-brand-ink">
                <span className="truncate">{t(l.label)}</span>
              </Link>
            ) : (
              <span aria-current={i === lapis.length - 1 ? 'page' : undefined} className="truncate font-bold text-ink">
                {t(l.label)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * `panel`: kelas panel ('panel-dosen' dan seterusnya); `beranda` dan `peran`: tujuan logo dan nama panel di menu samping.
 * `sampingGelap`: menu samping navy Super Admin (.kartu-aurora), supaya tidak tertukar dengan panel Kemahasiswaan yang putih.
 * `labelMenu`, `menu`: nama dan isi menu samping. `sisipMenu`: isi di atas menu; `kakiMenu`: isi di dasar menu.
 * `kiriAtas`: isi kiri bilah atas (tombol laci, logo layar kecil, lokasi halaman); `kananAtas`: tombol di kanan.
 * `meta`: baris konteks di atas isi halaman; `kunci`: jalur, supaya animasi masuk berjalan lagi setiap pindah halaman.
 * `kelasKolom`: kelas tambahan kolom isi; `kakiIsi`: isi sesudah <main> yang ikut diperbesar (footer dosen);
 * `lapisan`: unsur di luar kolom (laci, bilah bawah, tombol bantuan).
 */
export default function KerangkaKerja({
  panel,
  beranda,
  peran,
  sampingGelap = false,
  labelMenu,
  menu,
  sisipMenu = null,
  kakiMenu = null,
  kiriAtas = null,
  kananAtas = null,
  meta = null,
  kunci,
  kelasKolom = '',
  kakiIsi = null,
  lapisan = null,
  children,
}) {
  const a11y = useAkarAksesibilitas()

  return (
    // kelasAkar: setelan menu aksesibilitas; lihat index.css › menu aksesibilitas.
    <div className={'panel-kerja ' + panel + ' min-h-screen bg-bg lg:pl-[272px] print:pl-0 ' + a11y.kelasAkar}>
      {/* -------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] p-4 pr-0 lg:block print:hidden">
        <div
          className={
            'flex h-full flex-col overflow-y-auto px-3 py-5 ' +
            (sampingGelap ? 'kartu-aurora kartu-aurora-tegak relative rounded-3xl text-white dark:ring-1 dark:ring-white/10' : 'kartu')
          }
        >
          <MerekSamping beranda={beranda} gelap={sampingGelap} />
          <p
            className={
              'mb-6 mt-3 px-2.5 text-[11px] font-extrabold uppercase tracking-[.14em] ' +
              (sampingGelap ? 'text-[var(--accent)]' : 'text-[var(--accent-ink)]')
            }
          >
            {peran}
          </p>

          {sisipMenu}

          <nav aria-label={labelMenu}>
            <MenuSamping items={menu} gelap={sampingGelap} />
          </nav>

          {kakiMenu ? <div className={'mt-auto border-t pt-4 ' + (sampingGelap ? 'border-white/10' : 'border-line')}>{kakiMenu}</div> : null}
        </div>
      </aside>

      <div className={'flex min-h-screen flex-col ' + kelasKolom}>
        {/* ------------------------------ bilah atas ----------------------------- */}
        <header className="kepala-kerja sticky top-0 z-20 print:hidden">
          <div className="bilah-kerja mx-auto flex h-[56px] w-full max-w-[1320px] items-center gap-1.5 px-2 sm:h-[60px] sm:gap-3 sm:px-3.5">
            {kiriAtas}
            <div className="ml-auto flex items-center gap-1 sm:gap-2">{kananAtas}</div>
          </div>
        </header>

        {/* isi-zoom: "Ukuran tulisan" di menu aksesibilitas memperbesar isi halaman saja; bilah atas dan menu samping
            tetap, supaya kendalinya tidak terdorong keluar layar HP. */}
        <div className="isi-zoom flex flex-1 flex-col" style={a11y.gayaIsi}>
          <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-12 pt-3 sm:px-6 lg:px-5">
            {meta ? <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">{meta}</div> : null}

            {/* Dikunci per jalur supaya animasi masuknya berjalan lagi setiap pindah menu. */}
            <div key={kunci} className="min-w-0 animate-halaman">
              {children}
            </div>
          </main>
          {kakiIsi}
        </div>
      </div>

      {lapisan}
      {a11y.pemandu ? <PemanduBaca /> : null}
    </div>
  )
}
