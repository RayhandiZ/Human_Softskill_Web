import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { IconCheck, IconChevronDown } from './Icons'

/* Dropdown buatan sendiri (pola listbox, sama dengan PilihPeriode di super/PusatKendali.jsx), pengganti <select> di
   seluruh aplikasi sejak 24 Nov 2026 (Select di Ui.jsx memakainya). Mulai 20 Nov 2026 di halaman Nilai Mahasiswa.

   Kenapa bukan <select>: rupa dan gerak daftar <select> di index.css memakai appearance: base-select, yang hanya ada
   di Chrome dan Edge 135 ke atas. Firefox menggambar daftar bawaannya sendiri, tanpa animasi, membukanya ke sisi yang
   paling lega, dan memotong teks pilihan terpilih tanpa tanda "…". Komponen ini menyamakannya di semua peramban
   dengan rupa dan gerak yang sama dengan daftar base-select: selalu ke bawah, tingginya paling banyak 320px dan
   dibatasi ruang di bawah kotak, dan baru membalik ke atas bila ruang itu kurang dari 160px. Daftarnya popover di
   top layer (posisinya dihitung dari kotak), jadi tidak terpotong tabel yang bergulir atau kartu overflow-hidden.
   Lihat README.md › Panel Admin › Gerak.

   Nama untuk pembaca layar: ringkas memakai label di dalam kotak; selain itu berikan labelOleh (id label di luar)
   atau ariaLabel (label tak terlihat). Nilai dibandingkan sebagai teks, seperti <select>. */

const RUANG_MIN = 160
const RUANG_MAKS = 320
const LEBAR_MAKS = 360
const JARAK = 8 // celah antara kotak dan daftar
// Jarak daftar ke tepi layar, sama dengan margin daftar base-select (margin-block: 8px).
const TEPI = 8

export const KOTAK_SEDANG = 'rounded-xl bg-surface px-3.5 py-2.5 text-sm font-semibold'
export const KOTAK_BESAR = 'rounded-xl bg-surface px-3.5 py-3 text-[14.5px] font-bold'
export const KOTAK_KECIL = 'rounded-lg bg-surface py-1.5 pl-2.5 pr-2 text-[12.5px] font-semibold'
// Rupa .field (isian formulir): latar surface-2.
export const KOTAK_ISIAN = 'rounded-xl bg-surface-2 px-4 py-3 text-sm'

const sama = (a, b) => String(a) === String(b)

export default function PilihanTurun({
  label,
  labelOleh,
  ariaLabel,
  id,
  title,
  value,
  onChange,
  options,
  tampilkan,
  kosong = null,
  ringkas = false,
  disabled = false,
  redup = false,
  kelasTombol = KOTAK_SEDANG,
  ukuranPanah = 16,
  className = '',
}) {
  const tampil = tampilkan ?? ((o) => String(o))
  const dasar = useId()
  const idDaftar = dasar + '-daftar'
  const idLabel = dasar + '-label'
  const idNilai = dasar + '-nilai'
  const idPilihan = (i) => dasar + '-' + i

  const [buka, setBuka] = useState(false)
  // Daftar tetap terpasang selama memudar saat ditutup.
  const [pasang, setPasang] = useState(false)
  const [sorot, setSorot] = useState(0)
  const [posisi, setPosisi] = useState(null)
  // Sorotan terbaru juga disimpan di ref: panah yang ditekan beruntun lebih cepat dari render berikutnya tetap
  // bergeser satu per satu, dan Enter memilih yang benar-benar tersorot.
  const sorotKini = useRef(0)
  const ketikan = useRef({ teks: '', waktu: 0 })
  const wadah = useRef(null)
  const tombol = useRef(null)
  const daftar = useRef(null)

  const iTerpilih = options.findIndex((o) => sama(o, value))
  const adaTerpilih = iTerpilih >= 0
  // Nilai di luar pilihan: placeholder bila ada, selain itu pilihan pertama, seperti <select>.
  const teksNilai = adaTerpilih ? tampil(options[iTerpilih]) : (kosong ?? (options.length ? tampil(options[0]) : ''))
  const namaLabel = labelOleh || (label || ariaLabel ? idLabel : null)

  const aturSorot = (i) => {
    sorotKini.current = i
    setSorot(i)
  }

  function ukurPosisi() {
    const r = tombol.current?.getBoundingClientRect()
    const vw = document.documentElement.clientWidth || window.innerWidth || 1024
    const vh = window.innerHeight || 768
    if (!r) return { arah: 'bawah', tinggi: RUANG_MAKS, left: TEPI, top: 0, minW: 0, maxW: LEBAR_MAKS }
    const bawah = vh - r.bottom - JARAK - TEPI
    const atas = r.top - JARAK - TEPI
    const naik = bawah < RUANG_MIN && atas > bawah
    const minW = Math.max(0, Math.min(r.width, vw - 2 * TEPI))
    const left = Math.max(TEPI, Math.min(r.left, vw - TEPI - minW))
    return {
      arah: naik ? 'atas' : 'bawah',
      tinggi: naik ? Math.min(RUANG_MAKS, atas) : Math.max(RUANG_MIN, Math.min(RUANG_MAKS, bawah)),
      left,
      top: naik ? null : r.bottom + JARAK,
      bottom: naik ? vh - r.top + JARAK : null,
      minW,
      maxW: Math.max(minW, Math.min(LEBAR_MAKS, vw - TEPI - left)),
    }
  }

  function bukaDaftar(i = Math.max(0, iTerpilih)) {
    if (disabled) return
    setPosisi(ukurPosisi())
    aturSorot(i)
    setPasang(true)
    setBuka(true)
  }
  function tutup(kembali = true) {
    setBuka(false)
    if (kembali) tombol.current?.focus()
  }
  function pilih(i) {
    if (!sama(options[i], value)) onChange(options[i])
    tutup()
  }

  /* Ketik huruf untuk melompat ke pilihan yang awalnya cocok, seperti <select>. Huruf yang sama ditekan berulang
     berpindah ke pilihan cocok berikutnya. */
  function cariKetik(huruf) {
    const kini = Date.now()
    const k = ketikan.current
    k.teks = (kini - k.waktu > 700 ? '' : k.teks) + huruf.toLowerCase()
    k.waktu = kini
    const ulang = [...k.teks].every((h) => h === k.teks[0])
    const cari = ulang ? k.teks[0] : k.teks
    const mulai = cari.length === 1 ? sorotKini.current + 1 : sorotKini.current
    for (let n = 0; n < options.length; n++) {
      const i = (mulai + n) % options.length
      if (String(tampil(options[i])).toLowerCase().startsWith(cari)) return i
    }
    return -1
  }
  const sedangMengetik = () => ketikan.current.teks !== '' && Date.now() - ketikan.current.waktu < 700
  const hurufBiasa = (e) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey

  // Daftar masuk top layer begitu terpasang; dilepas dari DOM, ia keluar dengan sendirinya.
  useLayoutEffect(() => {
    const d = daftar.current
    if (!pasang || !d?.showPopover) return
    try {
      if (!d.matches(':popover-open')) d.showPopover()
    } catch {
      // Peramban tanpa Popover API: daftar tetap tampil sebagai position: fixed.
    }
  }, [pasang])

  // Fokus pindah ke daftar saat terbuka; tekanan tetikus di luar menutupnya tanpa memindahkan fokus.
  useEffect(() => {
    if (!buka) return undefined
    daftar.current?.focus({ preventScroll: true })
    const luar = (e) => {
      if (wadah.current && !wadah.current.contains(e.target)) setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    return () => document.removeEventListener('mousedown', luar)
  }, [buka])

  // Posisinya mengikuti kotak saat halaman atau wadah apa pun digulir, dan saat ukuran layar berubah.
  useEffect(() => {
    if (!pasang) return undefined
    let bingkai = 0
    const ulang = (e) => {
      if (e?.type === 'scroll' && daftar.current?.contains(e.target)) return
      cancelAnimationFrame(bingkai)
      bingkai = requestAnimationFrame(() => setPosisi(ukurPosisi()))
    }
    window.addEventListener('scroll', ulang, true)
    window.addEventListener('resize', ulang)
    return () => {
      cancelAnimationFrame(bingkai)
      window.removeEventListener('scroll', ulang, true)
      window.removeEventListener('resize', ulang)
    }
    // ukurPosisi hanya membaca ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasang])

  useEffect(() => {
    if (buka) document.getElementById(dasar + '-' + sorot)?.scrollIntoView?.({ block: 'nearest' })
  }, [buka, sorot, dasar])

  // Daftar yang ditutup dilepas begitu pudarnya selesai (onAnimationEnd). Tanpa pudar yang berjalan (kurangi gerak,
  // menu Hentikan animasi, jsdom tanpa getAnimations) daftar langsung dilepas, tidak tertahan 220ms; jeda itu hanya
  // pengaman bila animationend tidak datang.
  useEffect(() => {
    if (buka || !pasang) return undefined
    const pudar = daftar.current?.getAnimations?.().some((a) => a.animationName === 'tutup-pilihan')
    if (!pudar) {
      setPasang(false)
      return undefined
    }
    const jeda = setTimeout(() => setPasang(false), 220)
    return () => clearTimeout(jeda)
  }, [buka, pasang])

  function tekanTombol(e) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      bukaDaftar()
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      bukaDaftar(e.key === 'Home' ? 0 : options.length - 1)
    } else if (hurufBiasa(e)) {
      sorotKini.current = Math.max(0, iTerpilih)
      const i = cariKetik(e.key)
      bukaDaftar(i >= 0 ? i : Math.max(0, iTerpilih))
    }
  }

  function tekanDaftar(e) {
    const kini = sorotKini.current
    const akhir = options.length - 1
    const ke = {
      ArrowDown: Math.min(akhir, kini + 1),
      ArrowUp: Math.max(0, kini - 1),
      Home: 0,
      End: akhir,
      PageDown: Math.min(akhir, kini + 5),
      PageUp: Math.max(0, kini - 5),
    }
    if (e.key in ke) {
      e.preventDefault()
      aturSorot(ke[e.key])
    } else if (e.key === ' ' && sedangMengetik()) {
      // Spasi di tengah ketikan ikut dicari ("Teknik K…"), bukan memilih.
      e.preventDefault()
      const i = cariKetik(' ')
      if (i >= 0) aturSorot(i)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pilih(kini)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      tutup()
    } else if (e.key === 'Tab') {
      tutup(false)
    } else if (hurufBiasa(e)) {
      const i = cariKetik(e.key)
      if (i >= 0) aturSorot(i)
    }
  }

  const garis = buka ? 'border-brand-ink' : redup ? 'border-dashed border-line-strong' : 'border-line'
  const panah =
    'shrink-0 text-ink-3 transition-transform duration-200 ' + (buka ? 'rotate-180 ' : '') + (disabled ? 'opacity-50' : '')
  const warnaNilai = !adaTerpilih && kosong ? 'text-ink-3' : ''

  return (
    <div ref={wadah} className={'relative min-w-0 ' + className}>
      <button
        ref={tombol}
        id={id}
        type="button"
        title={title}
        disabled={disabled}
        data-nilai={adaTerpilih ? String(options[iTerpilih]) : String(value ?? '')}
        aria-haspopup="listbox"
        aria-expanded={buka}
        aria-controls={pasang ? idDaftar : undefined}
        // Nama = label + pilihan saat ini ("Fakultas Semua", "3. Angkatan 2023 · 2 mahasiswa").
        aria-labelledby={namaLabel ? namaLabel + ' ' + idNilai : undefined}
        onClick={() => (buka ? tutup(false) : bukaDaftar())}
        onKeyDown={tekanTombol}
        className={
          'flex w-full min-w-0 items-center border text-left transition enabled:hover:border-line-strong disabled:cursor-not-allowed disabled:text-ink-3 ' +
          garis +
          ' ' +
          (redup ? 'text-ink-3 ' : 'text-ink ') +
          (ringkas ? 'rounded-xl bg-surface' : 'gap-2 ' + kelasTombol)
        }
      >
        {ringkas ? (
          <span id={idLabel} className="shrink-0 whitespace-nowrap pl-3.5 text-[12.5px] font-semibold text-ink-2">
            {label}
          </span>
        ) : !labelOleh && ariaLabel ? (
          <span id={idLabel} className="sr-only">
            {ariaLabel}
          </span>
        ) : null}
        <span
          id={idNilai}
          className={
            'min-w-0 flex-1 truncate ' + (ringkas ? 'py-2.5 pl-2 pr-1.5 text-sm font-semibold ' : '') + warnaNilai
          }
        >
          {teksNilai}
        </span>
        <IconChevronDown size={ukuranPanah} className={(ringkas ? 'mr-2.5 ' : '') + panah} />
      </button>

      {pasang ? (
        <ul
          ref={daftar}
          id={idDaftar}
          popover="manual"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={namaLabel ?? undefined}
          aria-activedescendant={idPilihan(sorot)}
          data-arah={posisi?.arah ?? 'bawah'}
          onKeyDown={tekanDaftar}
          onAnimationEnd={(e) => {
            // animationend pilihan (gerak masuk berurutan) ikut naik ke sini; hanya milik daftar yang dihitung.
            if (!buka && e.target === e.currentTarget) setPasang(false)
          }}
          style={{
            left: posisi?.left,
            top: posisi?.top ?? 'auto',
            bottom: posisi?.bottom ?? 'auto',
            minWidth: posisi?.minW,
            maxWidth: posisi?.maxW,
            maxHeight: posisi?.tinggi,
          }}
          className={
            'fixed inset-auto z-50 m-0 w-max overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-pop focus-visible:outline-none ' +
            (buka ? 'daftar-turun' : 'daftar-turun-tutup pointer-events-none')
          }
        >
          {options.map((o, i) => {
            const terpilih = i === iTerpilih
            return (
              <li
                key={String(o)}
                id={idPilihan(i)}
                role="option"
                aria-selected={terpilih}
                data-nilai={String(o)}
                // Hanya gerakan tetikus sungguhan yang memindah sorotan. Chrome mengirim mousemove tiruan (tanpa
                // pergeseran) saat daftar bergulir oleh panah, yang kalau diikuti akan merebut sorotan papan ketik.
                onMouseMove={(e) => {
                  if ((e.movementX || e.movementY) && sorotKini.current !== i) aturSorot(i)
                }}
                onClick={() => pilih(i)}
                // Pilihan muncul berurutan, 25ms per baris, paling lama 200ms.
                style={{ animationDelay: Math.min(i, 8) * 25 + 'ms' }}
                className={
                  'pilihan-turun flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13.5px] leading-snug [@media(pointer:coarse)]:min-h-[44px] ' +
                  (i === sorot ? 'bg-brand-soft ' : '') +
                  (terpilih ? 'font-bold text-brand-ink' : 'font-semibold text-ink')
                }
              >
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{tampil(o)}</span>
                {terpilih ? <IconCheck size={15} strokeWidth={2.2} className="shrink-0" /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
