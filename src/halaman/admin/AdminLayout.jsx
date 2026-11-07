import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import CariCepat from '../../components/CariCepat'
import KerangkaKerja, { MerekAtas, RemahKerja } from '../../components/KerangkaKerja'
import Laci from '../../components/Laci'
import MenuAkun from '../../components/MenuAkun'
import MenuAksesibilitas from '../../components/MenuAksesibilitas'
import MenuSamping from '../../components/MenuSamping'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import { useAuth } from '../../lib/auth'
import {
  IconBuilding,
  IconCalendar,
  IconCheckShield,
  IconDocument,
  IconEye,
  IconGauge,
  IconGrid,
  IconInbox,
  IconList,
  IconMenu,
  IconPrint,
  IconUpload,
  IconUsers,
} from '../../components/Icons'
import { PENGAJUAN_KOREKSI, PERIODE_AKTIF, STUDENTS, labelPeriode } from '../../lib/data'
import { PERMINTAAN_SERTIFIKAT, permintaanMenunggu, useStore, usulanMenunggu } from '../../lib/store'
import { giliranSaya } from '../../lib/duaLapis'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import { boleh } from '../../lib/wewenang'
import LoncengKemahasiswaan from './LoncengKemahasiswaan'
import StatusData from './StatusData'

/* Panel Kemahasiswaan: bilah atas dengan lokasi halaman, pencarian cepat, dan lonceng. Rupa kerangkanya bersama panel
   dosen dan Super Admin (KerangkaKerja). Lihat README.md › Panel Kemahasiswaan › Tampilan dan › Panel kerja. */

const KERJA = 'Kerja harian'
const RUJUKAN = 'Rujukan & catatan'

// Halaman tempat bekerja sehari-hari di atas, bahan rujukan yang lebih jarang dibuka di bawah. Lencana hanya
// untuk pekerjaan yang menunggu; angka ringkasan tidak diulang di menu.
// Sejak rapat 24 Okt 2026 admin hanya membaca nilai: halaman nilainya bernama "Nilai Mahasiswa" tanpa input dan
// import, dan usulan dosen lama hanya diputuskan super admin (menunya tampil selama masih ada yang menunggu). Data
// Master tampil untuk semua admin: yang belum diberi izin melihat kartu untuk memintanya; server tetap memeriksa.
// Lencana koreksi dan sertifikat hanya menghitung yang menunggu lapis akun ini (admin lapis 1, super admin lapis 2).
// Log Aktivitas hilang dari menu (dan pencarian cepat) selama Super Admin menutupnya untuk admin biasa (sakelar
// BACA_LOG_ADMIN di Peran & Wewenang); server ikut menolak /api/log.
const menuAdmin = ({ koreksi, usulan, permintaan, sertifikat, superAdmin, log }) => [
  { to: '/admin', label: 'Overview', icon: IconGauge, end: true, kelompok: KERJA },
  { to: '/admin/mahasiswa', label: 'Data Mahasiswa', icon: IconUsers, kelompok: KERJA },
  superAdmin
    ? { to: '/admin/nilai', label: 'Input & Import Nilai', icon: IconUpload, lencana: koreksi || null, kelompok: KERJA }
    : { to: '/admin/nilai', label: 'Nilai Mahasiswa', icon: IconEye, lencana: koreksi || null, kelompok: KERJA },
  ...(superAdmin && usulan
    ? [{ to: '/admin/usulan', label: 'Persetujuan Nilai Dosen', icon: IconCheckShield, lencana: usulan, kelompok: KERJA }]
    : []),
  {
    to: '/admin/persetujuan',
    // Super admin memutuskan permintaan admin; admin biasa melihat permintaannya sendiri.
    label: superAdmin ? 'Persetujuan Admin' : 'Permintaan Saya',
    icon: IconInbox,
    lencana: permintaan || null,
    kelompok: KERJA,
  },
  { to: '/admin/sertifikat', label: 'Cetak Sertifikat', icon: IconPrint, lencana: sertifikat || null, kelompok: KERJA },
  { to: '/admin/angkatan', label: 'Angkatan', icon: IconCalendar, kelompok: KERJA },
  { to: '/admin/kurikulum', label: 'Kurikulum CPMK', icon: IconDocument, kelompok: RUJUKAN },
  { to: '/admin/program-studi', label: 'Program Studi', icon: IconBuilding, kelompok: RUJUKAN },
  { to: '/admin/data-master', label: 'Data Master', icon: IconGrid, kelompok: RUJUKAN },
  ...(log ? [{ to: '/admin/log', label: 'Log Aktivitas', icon: IconList, kelompok: RUJUKAN }] : []),
]

const cocok = (m, jalur) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))

/** Lapisan lokasi halaman: halaman menu, lalu rincian bila jalurnya lebih dalam dari butir menunya. */
function lapisRemah(menu, jalur) {
  const butir = menu.find((m) => cocok(m, jalur))
  const rincian =
    jalur === '/admin/profil'
      ? 'Profil'
      : butir && jalur !== butir.to
        ? butir.to === '/admin/mahasiswa'
          ? 'Detail mahasiswa'
          : 'Rincian'
        : null
  return [
    butir && butir.to !== '/admin' ? { label: butir.label, ke: rincian ? butir.to : null } : null,
    rincian ? { label: rincian, ke: null } : null,
  ].filter(Boolean)
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

  const menu = menuAdmin({
    koreksi: giliranSaya(PENGAJUAN_KOREKSI, user).length,
    usulan: usulanMenunggu().length,
    permintaan: permintaanMenunggu().length,
    sertifikat: giliranSaya(PERMINTAAN_SERTIFIKAT, user).length,
    superAdmin,
    log: superAdmin || boleh('BACA_LOG_ADMIN'),
  })

  return (
    <KerangkaKerja
      panel="panel-admin"
      beranda="/admin"
      peran={t('Kemahasiswaan')}
      labelMenu={t('Menu Kemahasiswaan')}
      menu={menu}
      kakiMenu={superAdmin ? <KeSuperAdmin /> : null}
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
          <MerekAtas beranda="/admin" />
          <RemahKerja akar={{ ke: '/admin', label: 'Overview' }} lapis={lapisRemah(menu, jalur)} />
        </>
      }
      kananAtas={
        <>
          <CariCepat halaman={menu} mahasiswa={STUDENTS} keMahasiswa={(s) => '/admin/mahasiswa/' + s.id} />
          <LoncengKemahasiswaan nada="terang" />
          {/* Di HP pemilih bahasa dan tombol tema pindah ke laci supaya bilah atas tidak melebar: sejak tombol
              aksesibilitas ditambahkan, lonceng yang muncul membuat bilah 382px di layar 360px. */}
          <span className="hidden sm:block">
            <TombolBahasa nada="terang" />
          </span>
          <span className="hidden sm:block">
            <TombolTema />
          </span>
          <MenuAksesibilitas />
          <MenuAkun foto={foto} tone="terang" rinci={{ judul: admin.officer, sub: user?.email ?? '' }} rinciDari="min-[1440px]:block" />
        </>
      }
      meta={
        <>
          <p className="text-[13.5px] text-ink-2">
            Universitas Multimedia Nusantara · {t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })}
          </p>
          <StatusData />
        </>
      }
      kunci={jalur}
      lapisan={
        /* --------------------------- laci layar kecil -------------------------- */
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
            <div className="mt-3 flex items-center gap-2 px-3.5 sm:hidden">
              <TombolBahasa nada="terang" />
              <TombolTema />
            </div>
          </nav>
        </Laci>
      }
    >
      {children}
    </KerangkaKerja>
  )
}
