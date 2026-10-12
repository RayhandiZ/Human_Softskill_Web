'use client'

import { useEffect, useState } from 'react'

const DURASI = 300

/* Isi yang membuka dan menutup dengan tinggi meluncur (baris grid 0fr ↔ 1fr); lihat README.md › Gerak. */
export default function Lipat({ buka, id, children }) {
  const [pasang, setPasang] = useState(buka)
  const [lebar, setLebar] = useState(buka)

  useEffect(() => {
    if (buka) {
      setPasang(true)
      // Dua bingkai: keadaan 0fr harus sempat dilukis dulu supaya transisinya berjalan.
      let kedua = 0
      const pertama = requestAnimationFrame(() => {
        kedua = requestAnimationFrame(() => setLebar(true))
      })
      return () => {
        cancelAnimationFrame(pertama)
        cancelAnimationFrame(kedua)
      }
    }
    setLebar(false)
    const lepas = setTimeout(() => setPasang(false), DURASI + 100)
    return () => clearTimeout(lepas)
  }, [buka])

  if (!pasang) return null

  // Selama menutup, isi masih terlihat meluncur, tetapi id-nya dilepas dan tidak bisa dicapai pembaca layar maupun Tab.
  return (
    <div
      className={
        'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.22,.68,.35,1)] ' +
        (lebar ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')
      }
    >
      <div
        id={buka ? id : undefined}
        aria-hidden={buka ? undefined : true}
        inert={!buka}
        className={
          'min-h-0 overflow-hidden transition-opacity duration-300 ' + (lebar ? 'opacity-100' : 'opacity-0')
        }
      >
        {children}
      </div>
    </div>
  )
}
