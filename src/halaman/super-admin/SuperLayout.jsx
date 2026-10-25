import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Laci from '../../components/Laci'
import LogoPdp from '../../components/LogoPdp'
import MenuAkun from '../../components/MenuAkun'
import MenuAksesibilitas, { PemanduBaca, useAkarAksesibilitas } from '../../components/MenuAksesibilitas'
import MenuSamping from '../../components/MenuSamping'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import {
  IconBell,
  IconBook,
  IconBuilding,
  IconCheckShield,
  IconDocument,
  IconGauge,
  IconList,
  IconLock,
  IconMenu,
  IconUsers,
} from '../../components/Icons'
import { PERMINTAAN_SERTIFIKAT, permintaanMenunggu, useStore } from '../../lib/store'
import { PENGAJUAN_KOREKSI } from '../../lib/data'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'

/* Panel pengawasan Super Admin, terpisah dari panel Kemahasiswaan; lihat README.md › Panel Super Admin. */

// Tiga tugas utama super admin di atas, halaman pengawasan di bawahnya; judul kelompok memisahkan
// halaman tempat bertindak dari halaman yang hanya dibaca.
const menuSuper = (menunggu) => [
  { to: '/super', label: 'Pusat Kendali', icon: IconGauge, end: true, kelompok: 'Utama' },
  { to: '/super/persetujuan', label: 'Persetujuan', icon: IconCheckShield, lencana: menunggu || null, kelompok: 'Utama' },
  { to: '/super/penilaian', label: 'Penilaian & Bobot', icon: IconDocument, kelompok: 'Utama' },
  { to: '/super/akses', label: 'Akses Pengguna', icon: IconLock, kelompok: 'Utama' },
  { to: '/super/log', label: 'Log Aktivitas', icon: IconList, kelompok: 'Pengawasan' },
  { to: '/super/wewenang', label: 'Peran & Wewenang', icon: IconUsers, kelompok: 'Pengawasan' },
  { to: '/super/aturan', label: 'Aturan Sistem', icon: IconBook, kelompok: 'Pengawasan' },
]

function KeKemahasiswaan({ besar = false, onClick }) {
  const t = useTeks()
  return (
    <Link
      href="/admin"
      onClick={onClick}
      className={
        'flex items-center gap-3 rounded-2xl px-3.5 font-bold text-white/85 transition hover:bg-white/10 hover:text-white ' +
        (besar ? 'py-3.5 text-[16px]' : 'py-3 text-[14px]')
      }
    >
      <IconBuilding size={20} className="shrink-0" />
      {t('Panel Admin')}
    </Link>
  )
}

export default function SuperLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user, logout } = useAuth()
  const router = useRouter()
  const jalur = usePathname()
  const [laci, setLaci] = useState(false)
  const { foto } = useProfil(kunciSesi(user))
  // Lencana Persetujuan: permintaan admin ditambah lapis kedua pengajuan ubah nilai dan akses cetak sertifikat.
  const menunggu =
    permintaanMenunggu().length +
    PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu_superadmin').length +
    PERMINTAAN_SERTIFIKAT.filter((p) => p.status === 'menunggu_superadmin').length
  const menu = menuSuper(menunggu)
  const a11y = useAkarAksesibilitas()

  return (
    // panel-super: teks redup dipertebal khusus panel ini; lihat index.css › panel super admin. kelasAkar: setelan
    // menu aksesibilitas; lihat index.css › menu aksesibilitas.
    <div className={'panel-super min-h-screen bg-bg lg:pl-[264px] print:pl-0 ' + a11y.kelasAkar}>
      {/* -------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] p-4 pr-0 lg:block print:hidden">
        <div className="kartu-aurora kartu-aurora-tegak relative flex h-full flex-col overflow-y-auto rounded-3xl px-3 py-5 text-white dark:ring-1 dark:ring-white/10">
          <Link href="/super" className="flex items-center gap-2.5 px-2.5">
            <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-white" />
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-white/25" />
            <span className="teks-vibe whitespace-nowrap text-[20px] font-extrabold tracking-tight text-[var(--accent)]">
              VIBE
            </span>
          </Link>
          <p className="mb-6 mt-3 px-2.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--accent)]">
            Super Admin
          </p>

          <nav aria-label={t('Menu super admin')}>
            <MenuSamping items={menu} gelap />
          </nav>

          <div className="mt-auto border-t border-white/10 pt-4">
            <KeKemahasiswaan />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* ------------------------------ bilah atas ----------------------------- */}
        <header className="bilah-kaca sticky top-0 z-20 print:hidden">
          <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setLaci(true)}
              aria-label={t('Buka menu navigasi')}
              aria-expanded={laci}
              className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-ink transition hover:bg-surface lg:hidden"
            >
              <IconMenu size={23} />
            </button>

            <Link href="/super" className="flex items-center gap-2.5 lg:hidden">
              <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
              <span className="hidden text-[20px] font-extrabold uppercase tracking-[.12em] text-[var(--accent-ink)] sm:block">
                Super Admin
              </span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              {/* Di layar sempit menu samping tersembunyi, jadi lencananya pindah ke lonceng ini. Hanya muncul
                  bila ada yang menunggu, dan langsung menuju antreannya; lihat README.md › Bahasa visual. */}
              {menunggu ? (
                <Link
                  href="/super/persetujuan"
                  aria-label={t('{n} permintaan menunggu keputusan', { n: menunggu })}
                  className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-2 transition hover:bg-surface hover:text-ink lg:hidden"
                >
                  <IconBell size={20} />
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full isi-toska px-1 text-[10px] font-extrabold text-[var(--accent-on)]"
                  >
                    {menunggu > 99 ? '99+' : menunggu}
                  </span>
                </Link>
              ) : null}
              {/* Di HP pemilih bahasa pindah ke laci, seperti panel Kemahasiswaan, supaya tombol menu aksesibilitas
                  muat sampai lebar 360px. */}
              <span className="hidden sm:block">
                <TombolBahasa nada="terang" />
              </span>
              <TombolTema />
              <MenuAksesibilitas />
              <MenuAkun foto={foto} tone="terang" rinci={{ judul: 'Super Admin', sub: user?.email ?? '' }} />
            </div>
          </div>
        </header>

        {/* isi-zoom: "Ukuran tulisan" di menu aksesibilitas memperbesar isi halaman saja; bilah atas dan menu samping
            tetap, supaya kendalinya tidak terdorong keluar layar HP. */}
        <div className="isi-zoom flex flex-1 flex-col" style={a11y.gayaIsi}>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-10 pt-2 sm:px-6 lg:px-8">
            {/* Dikunci per jalur supaya animasi masuknya berjalan lagi setiap pindah menu. */}
            <div key={jalur} className="animate-halaman">
              {children}
            </div>
          </main>
        </div>
      </div>

      {a11y.pemandu ? <PemanduBaca /> : null}

      {/* --------------------------- laci layar kecil -------------------------- */}
      <Laci buka={laci} onTutup={() => setLaci(false)} label="Menu super admin" nada="aurora">
        <nav aria-label={t('Menu super admin')} className="p-3">
          <MenuSamping items={menu} besar gelap onPilih={() => setLaci(false)} />

          <span className="my-3 block h-px bg-white/10" />

          <KeKemahasiswaan besar onClick={() => setLaci(false)} />
          <Link
            href="/super/profil"
            onClick={() => setLaci(false)}
            className="block rounded-2xl px-3.5 py-3.5 text-[16px] font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
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
            className="block w-full rounded-2xl px-3.5 py-3.5 text-left text-[16px] font-bold text-[#ffb4b4] transition hover:bg-white/10"
          >
            {t('Keluar')}
          </button>
          <div className="mt-3 px-3.5 sm:hidden">
            <TombolBahasa nada="onbrand" />
          </div>
        </nav>
      </Laci>
    </div>
  )
}
