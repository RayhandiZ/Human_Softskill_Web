import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BilahBawah from '../../components/BilahBawah'
import Footer from '../../components/Footer'
import LayananTambahan from '../../components/LayananTambahan'
import LogoPdp from '../../components/LogoPdp'
import MenuAkun from '../../components/MenuAkun'
import MenuAksesibilitas, { PemanduBaca, useAkarAksesibilitas } from '../../components/MenuAksesibilitas'
import MenuSamping from '../../components/MenuSamping'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import { IconChevronRight, IconGauge, IconUpload, IconUsers } from '../../components/Icons'
import { useAuth } from '../../lib/auth'
import { SUMBER } from '../../lib/curriculum'
import { PERIODE_AKTIF, dosenSesi, labelPeriode } from '../../lib/data'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import StatusData from '../admin/StatusData'

/* Panel dosen. Ukurannya sama dengan panel super admin; kebutuhan tulisan yang lebih besar, kontras, dan alat bantu
   lain dinyalakan sendiri lewat menu aksesibilitas di bilah atas. Menu samping berlabel di layar lebar, bilah bawah
   berlabel di HP (bukan tombol garis tiga), dan footer melayang seperti panel mahasiswa. Sejak rapat 24 Okt 2026
   menunya tinggal tiga: Beranda memantau, Unggah Nilai menerima rekap Excel. Lihat README.md › Panel Dosen. */

const MENU = [
  { to: '/dosen', label: 'Beranda', icon: IconGauge, end: true },
  { to: '/dosen/nilai', label: 'Unggah Nilai', pendek: 'Unggah', icon: IconUpload },
  { to: '/dosen/profil', label: 'Profil', icon: IconUsers },
]

const PINTASAN = MENU.map(({ to, label, icon }) => ({ ke: to, label, icon }))

const cocok = (m, jalur) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))

/** Lokasi halaman: Beranda › halaman yang terbuka. */
function Remah({ menu, jalur }) {
  const t = useTeks()
  const butir = menu.find((m) => cocok(m, jalur))
  const diBeranda = !butir || butir.to === '/dosen'
  return (
    <nav aria-label={t('Lokasi halaman')} className="hidden min-w-0 lg:block">
      <ol className="flex min-w-0 items-center gap-1.5 text-[14px]">
        <li className="shrink-0">
          {diBeranda ? (
            <span aria-current="page" className="font-bold text-ink">
              {t('Beranda')}
            </span>
          ) : (
            <Link href="/dosen" className="font-semibold text-ink-2 transition hover:text-brand-ink">
              {t('Beranda')}
            </Link>
          )}
        </li>
        {diBeranda ? null : (
          <li className="flex min-w-0 items-center gap-1.5">
            <IconChevronRight size={14} className="shrink-0 text-ink-2" />
            <span aria-current="page" className="truncate font-bold text-ink">
              {t(butir.label)}
            </span>
          </li>
        )}
      </ol>
    </nav>
  )
}

/* ringkas: di HP hanya logo PDP, supaya bilah atas (bahasa, tema, aksesibilitas, akun) muat sampai lebar 360px. */
function Logo({ className = '', ringkas = false }) {
  return (
    <Link href="/dosen" className={'flex shrink-0 items-center gap-2.5 ' + className}>
      <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
      <span aria-hidden="true" className={'h-6 w-px shrink-0 bg-line ' + (ringkas ? 'hidden sm:block' : '')} />
      <span
        className={
          'teks-vibe teks-vibe-terang whitespace-nowrap text-[20px] font-extrabold tracking-tight text-[var(--accent-ink)] ' +
          (ringkas ? 'hidden sm:block' : '')
        }
      >
        VIBE
      </span>
    </Link>
  )
}

export default function DosenLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user } = useAuth()
  const jalur = usePathname() ?? '/dosen'
  const { foto } = useProfil(kunciSesi(user))
  const a11y = useAkarAksesibilitas()

  const dosen = dosenSesi(user)

  const kelas = dosen
    ? t('{unit} Semester {semester}, {prodi}', {
        unit: SUMBER[dosen.sumber]?.label ?? dosen.sumber,
        semester: dosen.semester,
        prodi: dosen.prodi,
      })
    : null
  const periode = t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })

  return (
    // panel-dosen: teks redup dipertebal seperti panel admin dan tinggi bilah bawah; kelasAkar: setelan menu
    // aksesibilitas. Lihat index.css › panel dosen dan › menu aksesibilitas.
    <div className={'panel-dosen min-h-screen bg-bg lg:pl-[264px] print:pl-0 ' + a11y.kelasAkar}>
      {/* -------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] p-4 pr-0 lg:block print:hidden">
        <div className="kartu flex h-full flex-col overflow-y-auto px-3 py-5">
          <Logo className="px-2.5" />
          <p className="mb-6 mt-3 px-2.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--accent-ink)]">
            {t('Dosen')}
          </p>

          {kelas ? (
            <div className="mb-5 rounded-2xl bg-surface-2 px-3.5 py-3">
              <p className="text-[12.5px] font-semibold text-ink-2">{t('Kelas Anda')}</p>
              <p className="mt-0.5 text-[13.5px] font-bold leading-snug text-ink">{kelas}</p>
            </div>
          ) : null}

          <nav aria-label={t('Menu dosen')}>
            <MenuSamping items={MENU} />
          </nav>
        </div>
      </aside>

      {/* kolom-dosen: di HP kolom ini berakhir di atas bilah bawah, supaya footer tidak tertutup. */}
      <div className="kolom-dosen flex min-h-screen flex-col">
        {/* ------------------------------ bilah atas ----------------------------- */}
        <header className="bilah-kaca sticky top-0 z-20 print:hidden">
          <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
            <Logo ringkas className="lg:hidden" />
            <Remah menu={MENU} jalur={jalur} />

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <TombolBahasa nada="terang" />
              <TombolTema />
              <MenuAksesibilitas />
              <MenuAkun
                foto={foto}
                tone="terang"
                rinci={{ judul: user?.name ?? '', sub: user?.email ?? '' }}
                rinciDari="min-[1280px]:block"
              />
            </div>
          </div>
        </header>

        {/* isi-zoom: "Ukuran tulisan" di menu aksesibilitas memperbesar isi halaman dan footer saja. Bilah atas, menu
            samping, dan bilah bawah tetap, supaya kendalinya tidak terdorong keluar layar HP. */}
        <div className="isi-zoom flex flex-1 flex-col" style={a11y.gayaIsi}>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-4 pt-2 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <p className="text-[13.5px] text-ink-2">{kelas ? kelas + ' · ' + periode : periode}</p>
              <StatusData />
            </div>

            {/* Dikunci per jalur supaya animasi masuknya berjalan lagi setiap pindah menu. */}
            <div key={jalur} className="min-w-0 animate-halaman">
              {children}
            </div>
          </main>

          {/* Seperti panel mahasiswa: mulai layar laptop, kartu melayang sepasang dengan sidebar. */}
          <Footer pintasan={PINTASAN} melayang />
        </div>
      </div>

      <BilahBawah items={MENU} label={t('Menu dosen')} />
      <LayananTambahan posisi="bantuan-dosen right-5 sm:right-6" />
      {a11y.pemandu ? <PemanduBaca /> : null}
    </div>
  )
}
