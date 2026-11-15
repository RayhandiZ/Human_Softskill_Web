import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Footer from '../../components/Footer'
import KerangkaKerja, { MerekAtas, RemahKerja } from '../../components/KerangkaKerja'
import Laci from '../../components/Laci'
import LayananTambahan from '../../components/LayananTambahan'
import MenuAkun from '../../components/MenuAkun'
import MenuAksesibilitas from '../../components/MenuAksesibilitas'
import MenuSamping from '../../components/MenuSamping'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import { IconGauge, IconMenu, IconUpload, IconUsers } from '../../components/Icons'
import { useAuth } from '../../lib/auth'
import { SUMBER } from '../../lib/curriculum'
import { PERIODE_AKTIF, cakupanKelasDosen, dosenSesi, labelPeriode } from '../../lib/data'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import StatusData from '../admin/StatusData'

/* Panel dosen. Kebutuhan tulisan yang lebih besar, kontras, dan alat bantu lain dinyalakan sendiri lewat menu
   aksesibilitas di bilah atas. Menu samping berlabel di layar lebar; di HP tombol garis tiga membuka laci, sama dengan
   panel mahasiswa (sejak 15 Nov 2026; sebelumnya bilah bawah berlabel). Footer sama dengan panel mahasiswa. Sejak rapat
   24 Okt 2026 menunya tinggal tiga: Beranda memantau, Unggah Nilai menerima rekap Excel. Lihat README.md › Panel Dosen
   dan › Panel kerja. */

const MENU = [
  { to: '/dosen', label: 'Beranda', icon: IconGauge, end: true },
  { to: '/dosen/nilai', label: 'Unggah Nilai', icon: IconUpload },
  { to: '/dosen/profil', label: 'Profil', icon: IconUsers },
]

const PINTASAN = MENU.map(({ to, label, icon }) => ({ ke: to, label, icon }))

const cocok = (m, jalur) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))

export default function DosenLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user, logout } = useAuth()
  const router = useRouter()
  const jalur = usePathname() ?? '/dosen'
  const [laci, setLaci] = useState(false)
  const { foto } = useProfil(kunciSesi(user))

  const dosen = dosenSesi(user)

  // Kelas yang diampu (Sistem Informasi Kelas A, ...) bila Super Admin sudah memilihnya, atau nama prodinya.
  const kelas = dosen
    ? t('{unit} Semester {semester}, {prodi}', {
        unit: SUMBER[dosen.sumber]?.label ?? dosen.sumber,
        semester: dosen.semester,
        prodi: cakupanKelasDosen(dosen, t),
      })
    : null
  const periode = t('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })

  const butir = MENU.find((m) => cocok(m, jalur))
  const lapis = butir && butir.to !== '/dosen' ? [{ label: butir.label, ke: null }] : []

  return (
    <KerangkaKerja
      panel="panel-dosen"
      beranda="/dosen"
      peran={t('Dosen')}
      labelMenu={t('Menu dosen')}
      menu={MENU}
      sisipMenu={
        kelas ? (
          <div className="mb-5 rounded-2xl bg-surface-2 px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-ink-2">{t('Kelas Anda')}</p>
            <p className="mt-0.5 text-[13.5px] font-bold leading-snug text-ink">{kelas}</p>
          </div>
        ) : null
      }
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
          <MerekAtas beranda="/dosen" />
          <RemahKerja akar={{ ke: '/dosen', label: 'Beranda' }} lapis={lapis} />
        </>
      }
      kananAtas={
        <>
          {/* Di HP pemilih bahasa pindah ke laci, seperti panel mahasiswa, supaya tombol garis tiga muat di bilah atas. */}
          <span className="hidden sm:block">
            <TombolBahasa nada="terang" />
          </span>
          <TombolTema />
          <MenuAksesibilitas />
          <MenuAkun
            foto={foto}
            tone="terang"
            rinci={{ judul: user?.name ?? '', sub: user?.email ?? '' }}
            rinciDari="min-[1280px]:block"
          />
        </>
      }
      meta={
        <>
          <p className="text-[13.5px] text-ink-2">{kelas ? kelas + ' · ' + periode : periode}</p>
          <StatusData />
        </>
      }
      kunci={jalur}
      // Seperti panel mahasiswa: menempel di dasar kolom isi, dan isinya segaris dengan <main> KerangkaKerja.
      kakiIsi={<Footer pintasan={PINTASAN} kelasIsi="max-w-[1320px] px-5 sm:px-6 lg:px-5" />}
      lapisan={
        <>
          <LayananTambahan />
          {/* --------------------------- laci layar kecil -------------------------- */}
          {/* Sama dengan laci panel mahasiswa. Profil sudah termasuk menu dosen, jadi tidak ditulis lagi di bawah garis. */}
          <Laci buka={laci} onTutup={() => setLaci(false)}>
            <nav aria-label={t('Menu dosen')} className="p-3">
              <MenuSamping items={MENU} besar onPilih={() => setLaci(false)} />

              <span className="my-3 block h-px bg-line" />

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
        </>
      }
    >
      {children}
    </KerangkaKerja>
  )
}
