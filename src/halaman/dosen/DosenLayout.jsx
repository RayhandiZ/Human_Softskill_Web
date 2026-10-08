import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../lib/auth'
import { IconCheckShield, IconInbox, IconPencil, IconUpload } from '../../components/Icons'
import { SUMBER } from '../../lib/curriculum'
import { PERIODE_AKTIF, dosenSesi, labelPeriode, pengumpulanDosen } from '../../lib/data'
import { statusPengumpulan, useStore, usulanDosen } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import StatusData from '../admin/StatusData'
import LayananTambahan from '../../components/LayananTambahan'

const PINTASAN = [
  { ke: '/dosen', label: 'Pengumpulan', icon: IconInbox },
  { ke: '/dosen/nilai', label: 'Input Nilai', icon: IconPencil },
  { ke: '/dosen/usulan', label: 'Status Usulan', icon: IconCheckShield },
]

const NAV = [
  { to: '/dosen', label: 'Pengumpulan', end: true },
  { to: '/dosen/nilai', label: 'Input Nilai' },
  { to: '/dosen/usulan', label: 'Status Usulan' },
]

const KELOMPOK_LACI = (perluDinilai, menunggu) => [
  {
    judul: 'Kelas saya',
    item: [
      { to: '/dosen', label: 'Data Masuk', icon: IconInbox, end: true, lencana: perluDinilai || null },
      { to: '/dosen/nilai', label: 'Input & Import Nilai', icon: IconUpload },
      { to: '/dosen/usulan', label: 'Status Usulan', icon: IconCheckShield, lencana: menunggu || null },
    ],
  },
]

export default function DosenLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user } = useAuth()
  const { foto } = useProfil(kunciSesi(user))

  const dosen = dosenSesi(user)
  const pengumpulan = dosen ? pengumpulanDosen(dosen.nip) : []
  const perluDinilai = pengumpulan.filter((p) => statusPengumpulan(p).id === 'masuk').length
  const menunggu = dosen ? usulanDosen(dosen.nip).filter((u) => u.status === 'menunggu').length : 0

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar links={NAV} kelompok={KELOMPOK_LACI(perluDinilai, menunggu)} foto={foto} />

      <main className="mx-auto w-full max-w-shell flex-1 px-4 py-7 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-[13.5px] text-ink-2">
            {dosen
              ? t('{unit} Semester {semester}, {prodi}', {
                  unit: SUMBER[dosen.sumber]?.label ?? dosen.sumber,
                  semester: dosen.semester,
                  prodi: dosen.prodi,
                }) +
                ' · ' +
                t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })
              : t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })}
          </p>
          <StatusData />
        </div>

        <div className="min-w-0">{children}</div>
      </main>

      <Footer pintasan={PINTASAN} />

      <LayananTambahan />
    </div>
  )
}
