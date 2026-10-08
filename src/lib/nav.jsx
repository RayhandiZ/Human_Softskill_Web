'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* --------------------------------------------------------------------------
   Jembatan navigasi.

   Next.js tidak punya padanan <NavLink> milik react-router — tautan yang tahu
   apakah dirinya sedang aktif. Karena penanda "halaman yang sedang dibuka"
   dipakai di sidebar, laci, dan bilah atas, satu komponen kecil ini menutup
   celahnya supaya tiap menu tidak perlu memanggil usePathname sendiri-sendiri
   dan menulis ulang aturan pencocokannya.

   `end` menyamakan perilakunya dengan react-router: tanpa `end`, "/admin"
   dianggap aktif juga ketika pembaca berada di "/admin/nilai"; dengan `end`,
   hanya cocok persis. Itu yang membuat menu "Dashboard" tidak ikut menyala di
   setiap halaman anaknya.

   `className` dan `children` boleh berupa fungsi yang menerima { isActive },
   persis seperti NavLink, supaya berkas yang memakainya nyaris tidak berubah.
   -------------------------------------------------------------------------- */

export function TautanNav({ href, end = false, className, children, ...rest }) {
  const jalur = usePathname() ?? ''
  const isActive = end ? jalur === href : jalur === href || jalur.startsWith(href + '/')

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive }) : className}
      {...rest}
    >
      {typeof children === 'function' ? children({ isActive }) : children}
    </Link>
  )
}
