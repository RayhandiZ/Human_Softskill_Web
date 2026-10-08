import { Plus_Jakarta_Sans } from 'next/font/google'
import '../src/index.css'
import { SKRIP_TEMA } from '../src/lib/theme'

/* Bobot 800 wajib ikut dimuat: judul dan angka besar memakai font-extrabold. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})
import Penyedia from './penyedia'
import { ambilMaster } from '../src/server/master'

export const dynamic = 'force-dynamic'

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
    /* suppressHydrationWarning wajib: skrip tema mengubah kelas <html> sebelum hidrasi. */
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
