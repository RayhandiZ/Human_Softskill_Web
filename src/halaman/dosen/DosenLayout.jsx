import { usePathname } from 'next/navigation'
import BilahBawah from '../../components/BilahBawah'
import Footer from '../../components/Footer'
import KerangkaKerja, { MerekAtas, RemahKerja } from '../../components/KerangkaKerja'
import LayananTambahan from '../../components/LayananTambahan'
import MenuAkun from '../../components/MenuAkun'
import MenuAksesibilitas from '../../components/MenuAksesibilitas'
import TombolBahasa from '../../components/TombolBahasa'
import TombolTema from '../../components/TombolTema'
import { IconGauge, IconUpload, IconUsers } from '../../components/Icons'
import { useAuth } from '../../lib/auth'
import { SUMBER } from '../../lib/curriculum'
import { PERIODE_AKTIF, dosenSesi, labelPeriode } from '../../lib/data'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import StatusData from '../admin/StatusData'

/* Panel dosen. Kebutuhan tulisan yang lebih besar, kontras, dan alat bantu lain dinyalakan sendiri lewat menu
   aksesibilitas di bilah atas. Menu samping berlabel di layar lebar, bilah bawah berlabel di HP (bukan tombol garis
   tiga), dan footer yang sama dengan panel mahasiswa. Sejak rapat 24 Okt 2026 menunya tinggal tiga: Beranda memantau,
   Unggah Nilai menerima rekap Excel. Lihat README.md › Panel Dosen dan › Panel kerja. */

const MENU = [
  { to: '/dosen', label: 'Beranda', icon: IconGauge, end: true },
  { to: '/dosen/nilai', label: 'Unggah Nilai', pendek: 'Unggah', icon: IconUpload },
  { to: '/dosen/profil', label: 'Profil', icon: IconUsers },
]

const PINTASAN = MENU.map(({ to, label, icon }) => ({ ke: to, label, icon }))

const cocok = (m, jalur) => (m.end ? jalur === m.to : jalur === m.to || jalur.startsWith(m.to + '/'))

export default function DosenLayout({ children }) {
  useStore()
  const t = useTeks()
  const { user } = useAuth()
  const jalur = usePathname() ?? '/dosen'
  const { foto } = useProfil(kunciSesi(user))

  const dosen = dosenSesi(user)

  const kelas = dosen
    ? t('{unit} Semester {semester}, {prodi}', {
        unit: SUMBER[dosen.sumber]?.label ?? dosen.sumber,
        semester: dosen.semester,
        prodi: dosen.prodi,
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
          <MerekAtas beranda="/dosen" />
          <RemahKerja akar={{ ke: '/dosen', label: 'Beranda' }} lapis={lapis} />
        </>
      }
      kananAtas={
        <>
          <TombolBahasa nada="terang" />
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
      // kolom-dosen: di HP kolom ini berakhir di atas bilah bawah, supaya footer tidak tertutup.
      kelasKolom="kolom-dosen"
      // Seperti panel mahasiswa: menempel di dasar kolom isi, dan isinya segaris dengan <main> KerangkaKerja.
      kakiIsi={<Footer pintasan={PINTASAN} kelasIsi="max-w-[1320px] px-5 sm:px-6 lg:px-5" />}
      lapisan={
        <>
          <BilahBawah items={MENU} label={t('Menu dosen')} />
          <LayananTambahan posisi="bantuan-dosen right-5 sm:right-6" />
        </>
      }
    >
      {children}
    </KerangkaKerja>
  )
}
