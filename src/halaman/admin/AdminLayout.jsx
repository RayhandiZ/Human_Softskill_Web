import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../lib/auth'
import {
  IconBuilding,
  IconCertificate,
  IconDocument,
  IconCheckShield,
  IconGauge,
  IconList,
  IconUpload,
  IconUsers,
} from '../../components/Icons'
import { PENGAJUAN_KOREKSI, PERIODE_AKTIF, labelPeriode } from '../../lib/data'
import { useStore, usulanMenunggu } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import LoncengKemahasiswaan from './LoncengKemahasiswaan'
import StatusData from './StatusData'

/* Pintasan footer menunjuk ke halaman yang memang ada, bukan tautan hiasan. */
const PINTASAN = [
  { ke: '/admin/mahasiswa', label: 'Data Mahasiswa', icon: IconUsers },
  { ke: '/admin/nilai', label: 'Input Nilai', icon: IconUpload },
  { ke: '/admin/program-studi', label: 'Program Studi', icon: IconBuilding },
  { ke: '/admin/angkatan', label: 'Sertifikat', icon: IconCertificate },
]

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/mahasiswa', label: 'Mahasiswa' },
  /* 'Penilaian', bukan 'Nilai': kata 'Nilai' sudah dipakai sebagai kepala
     kolom tabel yang berarti satu angka, sedangkan menu ini berarti seluruh
     pekerjaan menilai. Satu kunci kamus tidak bisa melayani dua arti. */
  { to: '/admin/nilai', label: 'Penilaian' },
  { to: '/admin/angkatan', label: 'Angkatan' },
]

/* --------------------------------------------------------------------------
   Isi laci — peta lengkap panel ini, termasuk tiga halaman yang di layar hanya
   dimasuki lewat kartu di Ringkasan.

   Ini bukan pengulangan bilah atas: laci tersembunyi sampai diminta, jadi ia
   tidak menambah keramaian layar. Yang dulu diminta dihapus adalah menu samping
   yang SELALU terlihat berdampingan dengan kartu-kartu itu.
   -------------------------------------------------------------------------- */
const KELOMPOK_LACI = (koreksi, usulan) => [
  {
    judul: 'Workspace',
    item: [
      { to: '/admin', label: 'Overview', icon: IconGauge, end: true },
      { to: '/admin/mahasiswa', label: 'Data Mahasiswa', icon: IconUsers },
      { to: '/admin/nilai', label: 'Input & Import Nilai', icon: IconUpload, lencana: koreksi || null },
      { to: '/admin/usulan', label: 'Persetujuan Nilai Dosen', icon: IconCheckShield, lencana: usulan || null },
      { to: '/admin/angkatan', label: 'Angkatan & Sertifikat', icon: IconCertificate },
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
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
  const t = useTeks()
  const { user } = useAuth()
  const { foto } = useProfil(kunciSesi(user))

  /* Tanpa kolom kiri sama sekali.

     Kartu identitas unit dan menu sampingnya sudah dibuang: menunya cuma
     mengulang bilah atas dan kartu "Halaman lain", sedangkan kartu identitas
     memakan 280 piksel hanya untuk tiga baris teks yang tidak pernah berubah.
     Isi halaman kini memakai seluruh lebar.

     Satu hal dari kartu itu tetap dipertahankan sebagai baris kecil di bawah:
     PERIODE. Angka seperti "290 mahasiswa" atau "rata-rata 80" tidak punya
     makna kalau pembacanya tidak tahu itu periode yang mana — apalagi setelah
     halaman ini dicetak. Nama pejabat yang menandatangani tidak diulang di
     sini karena sudah ada di menu avatar bilah atas. */

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        links={NAV}
        kelompok={KELOMPOK_LACI(
          PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu').length,
          usulanMenunggu().length,
        )}
        aksi={<LoncengKemahasiswaan />}
        foto={foto}
      />

      <main className="mx-auto w-full max-w-shell flex-1 px-4 py-7 sm:px-6">
        {/* Identitas institusi dan periode di kiri, kesegaran data di kanan —
            dua keterangan yang sama-sama berlaku untuk seluruh halaman panel
            ini, jadi tempatnya memang di layout, bukan di tiap halaman. */}
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
