'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* Padanan NavLink untuk Next; `end` berarti cocok persis. */

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
