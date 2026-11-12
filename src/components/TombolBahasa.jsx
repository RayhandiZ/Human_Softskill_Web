'use client'

import { useEffect, useRef } from 'react'
import { GlassSegmented } from '@zakisheriff/liquid-glass'
import { BAHASA, useBahasa } from '../lib/bahasa'

/* Rupa dan gerak lensanya dari GlassSegmented (@zakisheriff/liquid-glass). Yang diurus di sini hanya tiga hal yang
   tidak disediakan pustaka itu; lihat README.md › Pemilih bahasa. */

const KODE = BAHASA.map((b) => b.kode)

export default function TombolBahasa({ nada = 'terang' }) {
  const { bahasa, setBahasa, t } = useBahasa()
  const akar = useRef(null)
  const berganti = useRef(false)
  const indeks = Math.max(0, BAHASA.findIndex((b) => b.id === bahasa))

  /* Pustaka menulis kendalinya sebagai tablist/tab. Pemilih bahasa tidak punya panel tab, jadi peran itu diganti menjadi
     tombol tekan biasa (aria-pressed) di dalam satu grup, dan nama tombolnya nama bahasa, bukan kodenya. */
  useEffect(() => {
    const wadah = akar.current
    if (!wadah) return
    const rapikan = () => {
      /* Termasuk salinan lintasan yang dibuat pustaka di dalam lensa: salinan itu aria-hidden, tetapi peran tab-nya
         ikut tertangkap pencarian [role="tab"] di halaman. */
      wadah.querySelectorAll('[role="tablist"], [role="tab"], [aria-selected]').forEach((el) => {
        el.removeAttribute('role')
        el.removeAttribute('aria-selected')
      })
      const lintasan = wadah.querySelector(':scope > .lg-track')
      lintasan?.removeAttribute('aria-label')
      lintasan?.querySelectorAll(':scope > [data-lg-item]').forEach((tombol, i) => {
        const tekan = String(i === indeks)
        if (tombol.getAttribute('aria-pressed') !== tekan) tombol.setAttribute('aria-pressed', tekan)
        if (tombol.getAttribute('aria-label') !== BAHASA[i].nama) tombol.setAttribute('aria-label', BAHASA[i].nama)
        if (tombol.title !== BAHASA[i].nama) tombol.title = BAHASA[i].nama
      })
    }
    rapikan()
    /* React menulis ulang aria-selected tiap ganti bahasa, dan pustaka menyalin lintasan saat lensa terangkat. */
    const pengamat = new MutationObserver(rapikan)
    pengamat.observe(wadah, { subtree: true, childList: true, attributes: true, attributeFilter: ['role', 'aria-selected'] })
    return () => pengamat.disconnect()
  }, [indeks])

  return (
    <span
      ref={akar}
      role="group"
      aria-label={t('Pilih bahasa')}
      className={'tombol-bahasa ' + (nada === 'terang' ? 'tombol-bahasa--terang' : 'tombol-bahasa--onbrand')}
      onPointerDown={() => {
        berganti.current = false
      }}
      /* Pustaka hanya melapor kalau pilihannya berubah. Menekan bahasa yang sedang tampil juga pilihan yang diingat,
         jadi itu dicatat di sini. Ditunda satu giliran karena pustaka menyelesaikan gesturnya di window, sesudah ini. */
      onPointerUp={(e) => {
        if (e.button !== 0) return
        setTimeout(() => {
          if (!berganti.current) setBahasa(bahasa)
        }, 0)
      }}
      onClick={(e) => {
        /* detail 0: Enter atau Spasi di tombol yang sudah aktif. */
        const tombol = e.detail === 0 ? e.target.closest?.('[data-lg-item]') : null
        if (tombol) setBahasa(BAHASA[Number(tombol.dataset.lgItem)].id)
      }}
    >
      <GlassSegmented
        size="sm"
        options={KODE}
        value={indeks}
        onChange={(i) => {
          berganti.current = true
          setBahasa(BAHASA[i].id)
        }}
      />
    </span>
  )
}
