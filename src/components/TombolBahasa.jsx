'use client'

import { useRef, useState } from 'react'
import { BAHASA, useBahasa } from '../lib/bahasa'

/* --------------------------------------------------------------------------
   Pemilih bahasa.

   Bentuknya kendali bersegmen dua, bukan satu tombol yang berganti tulisan.
   Tombol tunggal bertuliskan "EN" ambigu: sebagian orang membacanya sebagai
   "sekarang bahasa Inggris", sebagian lagi sebagai "tekan untuk ke Inggris".
   Dengan dua segmen dan satu pil penanda, keadaan sekarang dan pilihan yang
   tersedia terbaca sekaligus.

   Kode ID dan EN sengaja tidak diterjemahkan: keduanya sudah dikenali
   universal, dan menerjemahkan nama bahasa ke bahasa yang belum dipahami
   pembacanya justru melawan tujuannya.

   TIGA CARA MEMAKAINYA, dan ketiganya harus bekerja:

   1. Klik biasa pada salah satu segmen.
   2. Tekan dan tahan pilnya, lalu seret. Pilnya mengikuti jari sampai
      dilepas, lalu menempel ke segmen terdekat.
   3. Tab lalu panah kiri/kanan, untuk yang memakai papan ketik.

   Cara kedua yang membuatnya terasa seperti benda, bukan sekadar dua tombol:
   ada yang bisa dipegang, dan ia bergerak seiring gerakan jari alih-alih
   melompat setelah jari diangkat. Ini pula sebabnya posisinya dihitung dalam
   piksel dan bukan lewat kelas CSS — selama diseret, posisinya bukan salah
   satu dari dua nilai, melainkan apa pun di antaranya.

   PELAJARAN YANG MAHAL, jangan dihapus: pemilihan lewat penunjuk diselesaikan
   di pointerup, BUKAN di onClick tombolnya.

   Sebabnya setPointerCapture di bawah. Begitu penunjuk ditangkap oleh wadah
   ini, peramban mengirim peristiwa click ke WADAHNYA, bukan ke tombol tempat
   jari benar-benar turun — dan onClick milik tombol tidak pernah menyala.
   Akibatnya kendali ini hanya bisa diseret, tidak bisa diklik biasa.

   Penangkapan penunjuk tetap dipertahankan karena tanpanya seretan berhenti
   begitu jari keluar dari kendali selebar 74 piksel ini. Yang dipindahkan
   adalah keputusannya: pointerup tahu persis di mana jari dilepas, jadi ia
   bisa melayani ketukan maupun seretan sekaligus.

   onClick tombol tinggal melayani klik yang BUKAN dari penunjuk — papan ketik
   dan pemanggilan .click() dari kode. Keduanya dikenali dari event.detail
   yang bernilai 0; klik dari tetikus selalu 1 atau lebih.

   Khusus SESUDAH SERETAN ada satu penjagaan tambahan. Peramban ponsel
   mengirim klik kesesuaian setelah urutan sentuh, dan detail-nya di sana bisa
   0. Kalau jari turun di ID lalu diseret ke EN, klik itu mendarat di tombol
   ID dan akan membalikkan pilihan yang baru saja diseret. Ketukan biasa tidak
   perlu penjagaan ini: segmen yang dihitung pointerup dan tombol yang diklik
   selalu sama, jadi diproses dua kali pun hasilnya sama.
   -------------------------------------------------------------------------- */

/* Lebar satu segmen. Ditulis sebagai angka, bukan kelas Tailwind, karena
   perhitungan seretnya butuh nilainya dalam piksel. */
const SEGMEN = 34
const SELA = 3

/* Lengkung yang sama dengan animasi lain di aplikasi ini (lihat index.css),
   dengan sedikit pegas di ujungnya supaya pilnya terasa punya bobot. */
const LENGKUNG = 'cubic-bezier(.34,1.42,.44,1)'

/**
 * @param nada 'terang'  — bilah panel mahasiswa (latar terang)
 *             'onbrand' — bilah biru panel Kemahasiswaan dan dosen
 */
export default function TombolBahasa({ nada = 'terang' }) {
  const { bahasa, setBahasa } = useBahasa()
  const terang = nada === 'terang'

  /* Posisi pil saat sedang diseret, dalam piksel. null berarti tidak sedang
     diseret, dan posisinya mengikuti bahasa yang aktif. */
  const [seretX, setSeretX] = useState(null)
  const [menekan, setMenekan] = useState(false)

  const awal = useRef({ x: 0, dasar: 0 })
  const bergerak = useRef(false)
  const abaikanKlik = useRef(false)

  const indeks = Math.max(0, BAHASA.findIndex((b) => b.id === bahasa))
  const dasar = indeks * SEGMEN
  const posisi = seretX ?? dasar

  function mulaiSeret(e) {
    if (e.button != null && e.button !== 0) return
    awal.current = { x: e.clientX, dasar }
    bergerak.current = false
    abaikanKlik.current = false
    setMenekan(true)
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* peramban lama tanpa penangkapan penunjuk — seretnya tetap jalan */
    }
  }

  function seret(e) {
    if (!menekan) return
    const beda = e.clientX - awal.current.x
    /* Ambang kecil supaya ketukan yang jarinya bergeser sedikit tetap dibaca
       sebagai ketukan, bukan seretan sejauh dua piksel. */
    if (Math.abs(beda) > 3) bergerak.current = true
    setSeretX(Math.min(SEGMEN, Math.max(0, awal.current.dasar + beda)))
  }

  function selesaiSeret(e) {
    if (!menekan) return
    setMenekan(false)
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* diabaikan */
    }

    let tujuan
    if (bergerak.current) {
      /* Menempel ke segmen terdekat, bukan ke arah gerakan: kalau ditarik
         separuh jalan lalu dilepas, pilnya kembali ke tempatnya semula. */
      tujuan = (seretX ?? dasar) > SEGMEN / 2 ? BAHASA[1].id : BAHASA[0].id
    } else {
      /* Ketukan biasa: yang menentukan adalah DI MANA jari dilepas, dihitung
         dari tepi kiri kendali. Titik tengahnya ada di SELA + SEGMEN. */
      const kotak = e.currentTarget.getBoundingClientRect?.()
      const relatif = kotak ? e.clientX - kotak.left : awal.current.dasar
      tujuan = relatif > SELA + SEGMEN ? BAHASA[1].id : BAHASA[0].id
    }

    if (tujuan !== bahasa) setBahasa(tujuan)
    setSeretX(null)

    if (bergerak.current) {
      abaikanKlik.current = true
      /* Dibersihkan sendiri. Kalau klik susulannya ternyata tidak pernah
         datang, penanda ini tidak boleh tertinggal menyala dan menelan
         penekanan papan ketik berikutnya. */
      setTimeout(() => {
        abaikanKlik.current = false
      }, 400)
    }
  }

  function lewatTombol(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      setBahasa(e.key === 'ArrowLeft' ? BAHASA[0].id : BAHASA[1].id)
    }
  }

  return (
    <div
      role="group"
      aria-label="Pilih bahasa"
      onPointerDown={mulaiSeret}
      onPointerMove={seret}
      onPointerUp={selesaiSeret}
      onPointerCancel={selesaiSeret}
      onKeyDown={lewatTombol}
      /* touch-none wajib: tanpa ini, menyeret ke samping di ponsel ikut
         menggulirkan halaman di belakangnya. */
      className={
        'relative flex shrink-0 touch-none select-none items-center rounded-2xl ' +
        (terang ? 'border border-line bg-surface' : 'bg-white/10')
      }
      style={{ padding: SELA }}
    >
      {/* Pil penanda. Ia yang bergerak; kedua tombol di bawah tetap diam. */}
      <span
        aria-hidden="true"
        className={'absolute rounded-[14px] ' + (terang ? 'pil-kaca' : 'pil-kaca-putih')}
        style={{
          width: SEGMEN,
          top: SELA,
          bottom: SELA,
          left: SELA,
          transform: 'translateX(' + posisi + 'px) scale(' + (menekan ? 0.93 : 1) + ')',
          /* Selama diseret transisinya dimatikan: pil yang punya transisi akan
             tertinggal di belakang jari dan terasa seret, bukan mulus. */
          transition: menekan
            ? 'transform .12s ease-out'
            : 'transform .42s ' + LENGKUNG,
        }}
      />

      {BAHASA.map((b) => {
        const aktif = b.id === bahasa
        return (
          <button
            key={b.id}
            type="button"
            onClick={(e) => {
              /* Klik kesesuaian yang menyusul sebuah seretan: sudah ditangani
                 pointerup, dan tombolnya bahkan bukan tujuan yang benar. */
              if (abaikanKlik.current) {
                abaikanKlik.current = false
                return
              }
              /* detail 0 berarti klik ini bukan dari penunjuk: papan ketik,
                 atau .click() dari kode. Klik dari tetikus sudah diselesaikan
                 di pointerup dan tidak boleh diproses dua kali. */
              if (e.detail !== 0) return
              setBahasa(b.id)
            }}
            aria-pressed={aktif}
            /* Nama lengkapnya hanya untuk pembaca layar: "ID" sendirian tidak
               memberi tahu apa-apa kalau tidak bisa dilihat. */
            aria-label={b.nama}
            title={b.nama}
            className={
              'relative z-10 rounded-[14px] py-1.5 text-[12px] font-extrabold leading-none transition-colors duration-300 ' +
              (aktif
                ? terang
                  ? 'text-brand-ink'
                  : 'text-brand'
                : terang
                  ? 'text-ink-3 hover:text-ink'
                  : 'text-white/70 hover:text-white')
            }
            style={{ width: SEGMEN }}
          >
            {b.kode}
          </button>
        )
      })}
    </div>
  )
}
