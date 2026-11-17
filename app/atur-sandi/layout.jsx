/* Halaman tujuan tautan di email lupa kata sandi. Alamatnya membawa token sampai halaman membersihkannya, jadi: tanpa Referer
   ke situs lain, dan tidak diindeks mesin pencari. */
export const metadata = {
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
}

export default function Layout({ children }) {
  return children
}
