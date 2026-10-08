'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'sk5c.theme'

/* --------------------------------------------------------------------------
   Skrip yang dipasang di <head> oleh app/layout.jsx.

   Ia menetapkan kelas `dark` pada <html> SEBELUM halaman digambar, jadi
   pengguna bertema gelap tidak melihat kedipan putih lebih dulu. Ini juga yang
   membuat komponen di bawah tidak perlu membaca localStorage saat render —
   pembacaan seperti itu mustahil di server dan akan membuat HTML server
   berbeda dengan render pertama di peramban.
   -------------------------------------------------------------------------- */
export const SKRIP_TEMA = `(function(){try{
var k=${JSON.stringify(KEY)},s=localStorage.getItem(k),
d=s==='dark'||(s!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [siap, setSiap] = useState(false)

  /* Tema dibaca dari kelas yang sudah dipasang skrip di atas, bukan dihitung
     ulang — supaya keduanya tidak mungkin berbeda. */
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    setSiap(true)
  }, [])

  /* Menulis hanya setelah pembacaan awal selesai; kalau tidak, render pertama
     (yang selalu 'light') akan menimpa pilihan gelap yang tersimpan. */
  useEffect(() => {
    if (!siap) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* diabaikan */
    }
  }, [theme, siap])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
