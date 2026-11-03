import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import KerangkaKerja, { RemahKerja } from '../../components/KerangkaKerja'
import Laci from '../../components/Laci'
import LogoPdp from '../../components/LogoPdp'
import MenuAkun from '../../components/MenuAkun'
import MenuAksesibilitas from '../../components/MenuAksesibilitas'
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

/* Panel pengawasan Super Admin, terpisah dari panel Kemahasiswaan; lihat README.md › Panel Super Admin dan › Panel kerja. */

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

const cocok = (m, jalur) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))

/** Lapisan lokasi halaman: halaman menu yang terbuka, atau Profil yang dibuka lewat menu akun. */
function lapisRemah(menu, jalur) {
  if (jalur === '/super/profil') return [{ label: 'Profil', ke: null }]
  const butir = menu.find((m) => cocok(m, jalur))
  return butir && butir.to !== '/super' ? [{ label: butir.label, ke: null }] : []
}

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
  const jalur = usePathname() ?? '/super'
  const [laci, setLaci] = useState(false)
  const { foto } = useProfil(kunciSesi(user))
  // Lencana Persetujuan: permintaan admin ditambah lapis kedua pengajuan ubah nilai dan akses cetak sertifikat.
  const menunggu =
    permintaanMenunggu().length +
    PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu_superadmin').length +
    PERMINTAAN_SERTIFIKAT.filter((p) => p.status === 'menunggu_superadmin').length
  const menu = menuSuper(menunggu)

  return (
    <KerangkaKerja
      panel="panel-super"
      beranda="/super"
      peran="Super Admin"
      sampingGelap
      labelMenu={t('Menu super admin')}
      menu={menu}
      kakiMenu={<KeKemahasiswaan />}
      kiriAtas={
        <>
          <button
            type="button"
            onClick={() => setLaci(true)}
            aria-label={t('Buka menu navigasi')}
            aria-expanded={laci}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink transition hover:bg-surface-2 lg:hidden"
          >
            <IconMenu size={23} />
          </button>
          <Link href="/super" className="flex items-center gap-2.5 lg:hidden">
            <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
            <span className="hidden text-[14px] font-extrabold uppercase tracking-[.08em] text-[var(--accent-ink)] sm:block">Super Admin</span>
          </Link>
          <RemahKerja akar={{ ke: '/super', label: 'Pusat Kendali' }} lapis={lapisRemah(menu, jalur)} />
        </>
      }
      kananAtas={
        <>
          {/* Di layar sempit menu samping tersembunyi, jadi lencananya pindah ke lonceng ini. Hanya muncul
              bila ada yang menunggu, dan langsung menuju antreannya; lihat README.md › Bahasa visual. */}
          {menunggu ? (
            <Link
              href="/super/persetujuan"
              aria-label={t('{n} permintaan menunggu keputusan', { n: menunggu })}
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink lg:hidden"
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
        </>
      }
      kunci={jalur}
      lapisan={
        /* --------------------------- laci layar kecil -------------------------- */
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
      }
    >
      {children}
    </KerangkaKerja>
  )
}
