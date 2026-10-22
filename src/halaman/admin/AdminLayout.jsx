import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import CariCepat from '../../components/CariCepat'
import Laci from '../../components/Laci'
import LogoPdp from '../../components/LogoPdp'
import MenuAkun from '../../components/MenuAkun'
import MenuAksesibilitas, { PemanduBaca, useAkarAksesibilitas } from '../../components/MenuAksesibilitas'
import MenuSamping from '../../components/MenuSamping'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import { useAuth } from '../../lib/auth'
import {
  IconBuilding,
  IconCalendar,
  IconCheckShield,
  IconChevronRight,
  IconDocument,
  IconGauge,
  IconInbox,
  IconList,
  IconMenu,
  IconPrint,
  IconUpload,
  IconUsers,
} from '../../components/Icons'
import { PENGAJUAN_KOREKSI, PERIODE_AKTIF, STUDENTS, labelPeriode } from '../../lib/data'
import { permintaanMenunggu, useStore, usulanMenunggu } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import LoncengKemahasiswaan from './LoncengKemahasiswaan'
import StatusData from './StatusData'

/* Panel Kemahasiswaan: menu samping putih (beda dari menu navy super admin), bilah atas dengan lokasi halaman,
   pencarian cepat, dan lonceng. Lihat README.md › Panel Kemahasiswaan › Tampilan. */

const KERJA = 'Kerja harian'
const RUJUKAN = 'Rujukan & catatan'

// Halaman tempat bekerja sehari-hari di atas, bahan rujukan yang lebih jarang dibuka di bawah. Lencana hanya
// untuk pekerjaan yang menunggu; angka ringkasan tidak diulang di menu.
const menuAdmin = ({ koreksi, usulan, permintaan, superAdmin }) => [
  { to: '/admin', label: 'Overview', icon: IconGauge, end: true, kelompok: KERJA },
  { to: '/admin/mahasiswa', label: 'Data Mahasiswa', icon: IconUsers, kelompok: KERJA },
  { to: '/admin/nilai', label: 'Input & Import Nilai', icon: IconUpload, lencana: koreksi || null, kelompok: KERJA },
  { to: '/admin/usulan', label: 'Persetujuan Nilai Dosen', icon: IconCheckShield, lencana: usulan || null, kelompok: KERJA },
  {
    to: '/admin/persetujuan',
    // Super admin memutuskan permintaan admin; admin biasa melihat permintaannya sendiri.
    label: superAdmin ? 'Persetujuan Admin' : 'Permintaan Saya',
    icon: IconInbox,
    lencana: permintaan || null,
    kelompok: KERJA,
  },
  { to: '/admin/sertifikat', label: 'Cetak Sertifikat', icon: IconPrint, kelompok: KERJA },
  { to: '/admin/angkatan', label: 'Angkatan', icon: IconCalendar, kelompok: KERJA },
  { to: '/admin/kurikulum', label: 'Kurikulum CPMK', icon: IconDocument, kelompok: RUJUKAN },
  { to: '/admin/program-studi', label: 'Program Studi', icon: IconBuilding, kelompok: RUJUKAN },
  { to: '/admin/log', label: 'Log Aktivitas', icon: IconList, kelompok: RUJUKAN },
]

const cocok = (m, jalur) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))

/** Lokasi halaman: panel › halaman menu › rincian (bila jalurnya lebih dalam dari butir menunya). */
function Remah({ menu, jalur }) {
  const t = useTeks()
  const butir = menu.find((m) => cocok(m, jalur))
  const rincian =
    jalur === '/admin/profil'
      ? 'Profil'
      : butir && jalur !== butir.to
        ? butir.to === '/admin/mahasiswa'
          ? 'Detail mahasiswa'
          : 'Rincian'
        : null
  const lapis = [
    butir && butir.to !== '/admin' ? { label: butir.label, ke: rincian ? butir.to : null } : null,
    rincian ? { label: rincian, ke: null } : null,
  ].filter(Boolean)

  return (
    <nav aria-label={t('Lokasi halaman')} className="hidden min-w-0 lg:block">
      <ol className="flex min-w-0 items-center gap-1.5 text-[14px]">
        <li className="shrink-0">
          {lapis.length ? (
            <Link href="/admin" className="font-semibold text-ink-2 transition hover:text-brand-ink">
              {t('Overview')}
            </Link>
          ) : (
            <span aria-current="page" className="font-bold text-ink">
              {t('Overview')}
            </span>
          )}
        </li>
        {lapis.map((l, i) => (
          <li key={l.label} className="flex min-w-0 items-center gap-1.5">
            <IconChevronRight size={14} className="shrink-0 text-ink-2" />
            {l.ke ? (
              <Link href={l.ke} className="truncate font-semibold text-ink-2 transition hover:text-brand-ink">
                {t(l.label)}
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

function KeSuperAdmin({ besar = false, onClick }) {
  const t = useTeks()
  return (
    <Link
      href="/super"
      onClick={onClick}
      className={
        'flex items-center gap-3 rounded-2xl px-3.5 font-bold text-ink-2 transition hover:bg-surface-2 hover:text-brand-ink ' +
        (besar ? 'py-3.5 text-[16px]' : 'py-3 text-[14px]')
      }
    >
      <IconCheckShield size={20} className="shrink-0" />
      {t('Panel Super Admin')}
    </Link>
  )
}

export default function AdminLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user, admin, logout } = useAuth()
  const router = useRouter()
  const jalur = usePathname() ?? '/admin'
  const [laci, setLaci] = useState(false)
  const { foto } = useProfil(kunciSesi(user))
  const superAdmin = Boolean(user?.superAdmin)
  const a11y = useAkarAksesibilitas()

  const menu = menuAdmin({
    koreksi: PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu').length,
    usulan: usulanMenunggu().length,
    permintaan: permintaanMenunggu().length,
    superAdmin,
  })

  return (
    // panel-admin: teks redup dipertebal seperti panel super admin; lihat index.css › teks redup panel kerja.
    // kelasAkar: setelan menu aksesibilitas; lihat index.css › menu aksesibilitas.
    <div className={'panel-admin min-h-screen bg-bg lg:pl-[280px] print:pl-0 ' + a11y.kelasAkar}>
      {/* -------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] p-4 pr-0 lg:block print:hidden">
        <div className="kartu flex h-full flex-col overflow-y-auto px-3 py-5">
          <Link href="/admin" className="flex items-center gap-2.5 px-2.5">
            <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
            <span className="teks-vibe teks-vibe-terang whitespace-nowrap text-[20px] font-extrabold tracking-tight text-[var(--accent-ink)]">
              VIBE
            </span>
          </Link>
          <p className="mb-6 mt-3 px-2.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--accent-ink)]">
            {t('Kemahasiswaan')}
          </p>

          <nav aria-label={t('Menu Kemahasiswaan')}>
            <MenuSamping items={menu} />
          </nav>

          {superAdmin ? (
            <div className="mt-auto border-t border-line pt-4">
              <KeSuperAdmin />
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* ------------------------------ bilah atas ----------------------------- */}
        <header className="bilah-kaca sticky top-0 z-20 print:hidden">
          <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setLaci(true)}
              aria-label={t('Buka menu navigasi')}
              aria-expanded={laci}
              className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-ink transition hover:bg-surface lg:hidden"
            >
              <IconMenu size={23} />
            </button>

            <Link href="/admin" className="flex shrink-0 items-center gap-2.5 lg:hidden">
              <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
              <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-line sm:block" />
              <span className="teks-vibe teks-vibe-terang hidden text-[14px] font-extrabold tracking-tight text-[var(--accent-ink)] sm:block">
                VIBE
              </span>
            </Link>

            <Remah menu={menu} jalur={jalur} />

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <CariCepat
                halaman={menu}
                mahasiswa={STUDENTS}
                keMahasiswa={(s) => '/admin/mahasiswa/' + s.id}
              />
              <LoncengKemahasiswaan nada="terang" />
              {/* Di HP pemilih bahasa pindah ke laci supaya bilah atas tidak melebar. */}
              <span className="hidden sm:block">
                <TombolBahasa nada="terang" />
              </span>
              <TombolTema />
              <MenuAksesibilitas />
              <MenuAkun
                foto={foto}
                tone="terang"
                rinci={{ judul: admin.officer, sub: user?.email ?? '' }}
                rinciDari="min-[1440px]:block"
              />
            </div>
          </div>
        </header>

        {/* isi-zoom: "Ukuran tulisan" di menu aksesibilitas memperbesar isi halaman saja; bilah atas dan menu samping
            tetap, supaya kendalinya tidak terdorong keluar layar HP. */}
        <div className="isi-zoom flex flex-1 flex-col" style={a11y.gayaIsi}>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-12 pt-2 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <p className="text-[13.5px] text-ink-2">
                Universitas Multimedia Nusantara ·{' '}
                {t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })}
              </p>
              <StatusData />
            </div>

            {/* Dikunci per jalur supaya animasi masuknya berjalan lagi setiap pindah menu. */}
            <div key={jalur} className="min-w-0 animate-halaman">
              {children}
            </div>
          </main>
        </div>
      </div>

      {a11y.pemandu ? <PemanduBaca /> : null}

      {/* --------------------------- laci layar kecil -------------------------- */}
      <Laci buka={laci} onTutup={() => setLaci(false)}>
        <nav aria-label={t('Menu Kemahasiswaan')} className="p-3">
          <MenuSamping items={menu} besar onPilih={() => setLaci(false)} />

          <span className="my-3 block h-px bg-line" />

          {superAdmin ? <KeSuperAdmin besar onClick={() => setLaci(false)} /> : null}
          <Link
            href="/admin/profil"
            onClick={() => setLaci(false)}
            className="block rounded-2xl px-3.5 py-3.5 text-[16px] font-bold text-ink transition hover:bg-surface-2"
          >
            {t('Profil')}
          </Link>
          <button
            type="button"
            onClick={() => {
              setLaci(false)
              logout()
              router.replace('/masuk')
            }}
            className="block w-full rounded-2xl px-3.5 py-3.5 text-left text-[16px] font-bold text-[var(--critical)] transition hover:bg-surface-2"
          >
            {t('Keluar')}
          </button>
          <div className="mt-3 px-3.5 sm:hidden">
            <TombolBahasa nada="terang" />
          </div>
        </nav>
      </Laci>
    </div>
  )
}
