import { createContext, useContext, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Footer from '../../components/Footer'
import Laci from '../../components/Laci'
import LogoPdp from '../../components/LogoPdp'
import MenuAkun from '../../components/MenuAkun'
import MenuSamping from '../../components/MenuSamping'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import LayananTambahan from '../../components/LayananTambahan'
import { IconCertificate, IconDocument, IconGauge, IconList, IconMenu, IconRoute } from '../../components/Icons'
import { mahasiswaSesi, transkripOf } from '../../lib/data'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import LoncengBelumDinilai from './LoncengBelumDinilai'

const PINTASAN = [
  { ke: '/mahasiswa/transkrip', label: 'Transkrip', icon: IconDocument },
  { ke: '/mahasiswa/peta', label: 'Peta Perjalanan', icon: IconRoute },
  { ke: '/mahasiswa/riwayat', label: 'Riwayat', icon: IconList },
  { ke: '/mahasiswa/sertifikat', label: 'Sertifikat', icon: IconCertificate },
]

const MENU = [
  { to: '/mahasiswa', label: 'Dashboard', icon: IconGauge, end: true },
  { to: '/mahasiswa/transkrip', label: 'Transkrip', icon: IconDocument },
  { to: '/mahasiswa/peta', label: 'Peta Perjalanan', icon: IconRoute },
  { to: '/mahasiswa/riwayat', label: 'Riwayat', icon: IconList },
  { to: '/mahasiswa/sertifikat', label: 'Sertifikat', icon: IconCertificate },
]

const KonteksMahasiswa = createContext(null)

export const useStudent = () => useContext(KonteksMahasiswa)

const DaftarMenu = (props) => <MenuSamping items={MENU} {...props} />

export default function StudentLayout({ children }) {
  const versi = useStore()
  const { user, logout } = useAuth()
  const teks = useTeks()
  const router = useRouter()
  const jalurHalaman = usePathname()
  const [laci, setLaci] = useState(false)

  const student = useMemo(() => mahasiswaSesi(user), [user, versi])
  const { foto } = useProfil(kunciSesi(user, student.nim))
  const t = transkripOf(student)

  return (
    <div className="min-h-screen bg-bg lg:pl-[264px] print:pl-0">
      {/* print:pl-0 wajib: sidebar disembunyikan saat mencetak. */}
      {/* -------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] p-4 pr-0 lg:block print:hidden">
        <div className="kartu flex h-full flex-col px-3 py-5">
          <Link href="/mahasiswa" className="mb-7 flex items-center gap-2.5 px-2.5">
            <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
            <span className="whitespace-nowrap text-[20px] font-extrabold tracking-tight text-ink">
              HUMAN <span className="text-[var(--accent)]">SKILL</span>
            </span>
          </Link>

          <nav aria-label={teks('Menu mahasiswa')}>
            <DaftarMenu />
          </nav>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* ------------------------------ bilah atas ----------------------------- */}
        <header className="bilah-kaca sticky top-0 z-20 print:hidden">
          <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setLaci(true)}
              aria-label={teks('Buka menu navigasi')}
              aria-expanded={laci}
              className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-ink transition hover:bg-surface lg:hidden"
            >
              <IconMenu size={23} />
            </button>

            <Link href="/mahasiswa" className="flex items-center gap-2.5 lg:hidden">
              <LogoPdp keterangan={false} className="h-7 w-auto shrink-0 text-ink" />
              <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-line sm:block" />
              <span className="hidden text-[14px] font-extrabold tracking-tight text-ink sm:block">
                HUMAN <span className="text-[var(--accent)]">SKILL</span>
              </span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <LoncengBelumDinilai t={t} />
              <TombolBahasa nada="terang" />
              <TombolTema />
              <MenuAkun
                foto={foto}
                tone="terang"
                rinci={{ judul: student.name, sub: student.nim + ' · ' + student.program }}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-4 pt-2 sm:px-6 lg:px-8">
          <KonteksMahasiswa.Provider value={student}>
            {/* Dikunci per jalur supaya animasi masuknya berjalan lagi setiap pindah menu. */}
            <div key={jalurHalaman} className="animate-halaman">
              {children}
            </div>
          </KonteksMahasiswa.Provider>
        </main>

        {/* Mulai layar laptop: kartu melayang sepasang dengan sidebar (sudut dan jarak 16px yang sama). */}
        <Footer pintasan={PINTASAN} melayang />
      </div>

      <LayananTambahan />

      {/* --------------------------- laci layar kecil -------------------------- */}
      <Laci buka={laci} onTutup={() => setLaci(false)}>
        <nav aria-label={teks('Menu mahasiswa')} className="p-3">
          <DaftarMenu besar onPilih={() => setLaci(false)} />

          <span className="my-3 block h-px bg-line" />

          <Link
            href="/mahasiswa/profil"
            onClick={() => setLaci(false)}
            className="block rounded-2xl px-3.5 py-3.5 text-[16px] font-bold text-ink transition hover:bg-surface-2"
          >
            {teks('Profil')}
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
            {teks('Keluar')}
          </button>
        </nav>
      </Laci>
    </div>
  )
}
