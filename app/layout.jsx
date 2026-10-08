import { Plus_Jakarta_Sans } from 'next/font/google'
import '../src/index.css'
import { SKRIP_TEMA } from '../src/lib/theme'

/* --------------------------------------------------------------------------
   Font dimuat lewat next/font, bukan <link> ke Google Fonts.

   Berkasnya ikut di-host sendiri saat build, jadi tidak ada permintaan ke
   peladen luar saat halaman dibuka, dan tidak ada pergeseran tata letak saat
   font selesai diunduh.

   Bobot yang diminta harus lengkap sampai 800: desain ini memakai
   font-extrabold di angka besar dan judul. Kalau 800 tidak ikut diunduh,
   peramban akan MENEBALKAN SENDIRI bobot 700 secara paksa — hasilnya pekat dan
   kasar, persis yang terjadi ketika font ini sempat tidak dimuat sama sekali.
   -------------------------------------------------------------------------- */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})
import Penyedia from './penyedia'
import { ambilMaster } from '../src/server/master'

/* Dirender ulang setiap permintaan, bukan sekali saat build: data master
   boleh diubah di basis data kapan saja dan harus terlihat setelah halaman
   dimuat ulang. */
export const dynamic = 'force-dynamic'

/* Basis data yang mati tidak boleh ikut menjatuhkan seluruh situs, termasuk
   halaman masuk. Halaman tetap jalan dengan isi awal dari kode. */
async function bacaMaster() {
  try {
    return await ambilMaster()
  } catch (e) {
    console.warn('Data master dibaca dari kode karena basis data tidak bisa dihubungi:', e.message)
    return null
  }
}

export const metadata = {
  title: 'Dashboard Monitoring Softskill 5C — UMN',
  description:
    'Pemantauan capaian softskill mahasiswa Universitas Multimedia Nusantara berbasis CPMK terintegrasi.',
}

export const viewport = {
  themeColor: '#12508f',
}

export default async function RootLayout({ children }) {
  const master = await bacaMaster()
  return (
    /* suppressHydrationWarning wajib di <html>: skrip tema di bawah mengubah
       kelasnya sebelum React menghidrasi, dan tanpa ini React akan melaporkan
       perbedaan yang justru memang disengaja. */
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body>
        <Penyedia master={master}>{children}</Penyedia>
      </body>
    </html>
  )
}
