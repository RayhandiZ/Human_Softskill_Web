import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../lib/auth'
import {
  IconBuilding,
  IconCalendar,
  IconCertificate,
  IconDocument,
  IconCheckShield,
  IconGauge,
  IconInbox,
  IconList,
  IconPrint,
  IconUpload,
  IconUsers,
} from '../../components/Icons'
import { PENGAJUAN_KOREKSI, PERIODE_AKTIF, labelPeriode } from '../../lib/data'
import { permintaanMenunggu, useStore, usulanMenunggu } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import LoncengKemahasiswaan from './LoncengKemahasiswaan'
import StatusData from './StatusData'

const PINTASAN = [
  { ke: '/admin/mahasiswa', label: 'Data Mahasiswa', icon: IconUsers },
  { ke: '/admin/nilai', label: 'Input Nilai', icon: IconUpload },
  { ke: '/admin/program-studi', label: 'Program Studi', icon: IconBuilding },
  { ke: '/admin/sertifikat', label: 'Sertifikat', icon: IconCertificate },
]

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/mahasiswa', label: 'Mahasiswa' },
  /* 'Penilaian', bukan 'Nilai': kunci kamus 'Nilai' sudah berarti kepala kolom. */
  { to: '/admin/nilai', label: 'Penilaian' },
  { to: '/admin/angkatan', label: 'Angkatan' },
]

/* Super admin menyetujui permintaan admin; admin biasa melihat permintaannya sendiri. */
const MENU_PERSETUJUAN = (superAdmin) => ({
  to: '/admin/persetujuan',
  label: superAdmin ? 'Persetujuan Admin' : 'Permintaan Saya',
  icon: IconInbox,
})

const KELOMPOK_LACI = (koreksi, usulan, permintaan, superAdmin) => [
  {
    judul: 'Workspace',
    item: [
      ...(superAdmin ? [{ to: '/super', label: 'Panel Super Admin', icon: IconCheckShield }] : []),
      { to: '/admin', label: 'Overview', icon: IconGauge, end: true },
      { to: '/admin/mahasiswa', label: 'Data Mahasiswa', icon: IconUsers },
      { to: '/admin/nilai', label: 'Input & Import Nilai', icon: IconUpload, lencana: koreksi || null },
      { to: '/admin/usulan', label: 'Persetujuan Nilai Dosen', icon: IconCheckShield, lencana: usulan || null },
      { ...MENU_PERSETUJUAN(superAdmin), lencana: permintaan || null },
      { to: '/admin/sertifikat', label: 'Cetak Sertifikat', icon: IconPrint },
      { to: '/admin/angkatan', label: 'Angkatan', icon: IconCalendar },
    ],
  },
  {
    judul: 'Rujukan & catatan',
    item: [
      { to: '/admin/kurikulum', label: 'Kurikulum CPMK', icon: IconDocument },
      { to: '/admin/program-studi', label: 'Program Studi', icon: IconBuilding },
      { to: '/admin/log', label: 'Log Aktivitas', icon: IconList },
    ],
  },
]


export default function AdminLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user } = useAuth()
  const { foto } = useProfil(kunciSesi(user))

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        links={
          user?.superAdmin
            ? [...NAV, { to: '/admin/persetujuan', label: 'Persetujuan' }, { to: '/super', label: 'Super Admin' }]
            : NAV
        }
        kelompok={KELOMPOK_LACI(
          PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu').length,
          usulanMenunggu().length,
          permintaanMenunggu().length,
          Boolean(user?.superAdmin),
        )}
        aksi={<LoncengKemahasiswaan />}
        foto={foto}
      />

      <main className="mx-auto w-full max-w-shell flex-1 px-4 py-7 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-[13.5px] text-ink-2">
            Universitas Multimedia Nusantara ·{' '}
            {t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })}
          </p>
          <StatusData />
        </div>

        <div className="min-w-0">{children}</div>
      </main>

      <Footer pintasan={PINTASAN} />
    </div>
  )
}
