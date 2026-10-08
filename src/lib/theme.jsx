'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'sk5c.theme'

/* Dipasang di <head> supaya kelas dark ada sebelum halaman digambar; lihat README.md › Hidrasi. */
export const SKRIP_TEMA = `(function(){try{
var k=${JSON.stringify(KEY)},s=localStorage.getItem(k),
d=s==='dark'||(s!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    setSiap(true)
  }, [])

  /* Tulis hanya setelah pembacaan awal; render pertama selalu 'light'. */
  useEffect(() => {
    if (!siap) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
    }
  }, [theme, siap])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
