import { useEffect, useId, useRef, useState } from 'react'
import { IconCheck, IconChevronDown } from './Icons'

/* Dropdown buatan sendiri (pola listbox, sama dengan PilihPeriode di super-admin/Kendali.jsx), pengganti <select>
   untuk Angkatan, Fakultas, dan Program studi di halaman Nilai Mahasiswa sejak 20 Nov 2026.

   Kenapa bukan <select>: rupa dan gerak daftar <select> di index.css memakai appearance: base-select, yang hanya ada
   di Chrome dan Edge 135 ke atas. Firefox menggambar daftar bawaannya sendiri, tanpa animasi, dan membukanya ke sisi
   yang paling lega: Program studi (15 pilihan) membuka ke atas menutupi bilah atas, sedangkan Fakultas dan Angkatan
   membuka ke bawah. Komponen ini menyamakannya di semua peramban, dengan rupa dan gerak yang sama dengan daftar
   base-select: selalu ke bawah, tingginya paling banyak 320px dan dibatasi ruang di bawah kotak, dan baru membalik
   ke atas bila ruang itu kurang dari 160px. Lihat README.md › Panel Kemahasiswaan › Gerak.

   ringkas: label di dalam kotak, untuk baris saringan. Tanpa ringkas: kotak besar dengan label di luar; berikan id
   elemen labelnya lewat labelOleh. */

const RUANG_MIN = 160
const RUANG_MAKS = 320
const JARAK = 8 // celah antara kotak dan daftar
// Jarak daftar ke tepi layar, sama dengan margin daftar base-select (margin-block: 8px). Dulu 16px: daftar Program
// studi berisi 6 pilihan kelebihan 4px dan memunculkan batang gulir untuk 4px itu.
const TEPI = 8

export default function PilihanTurun({
  label,
  labelOleh,
  id,
  value,
  onChange,
  options,
  tampilkan,
  ringkas = false,
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
  const [ruang, setRuang] = useState({ arah: 'bawah', tinggi: RUANG_MAKS })
  // Sorotan terbaru juga disimpan di ref: panah yang ditekan beruntun lebih cepat dari render berikutnya tetap
  // bergeser satu per satu, dan Enter memilih yang benar-benar tersorot.
  const sorotKini = useRef(0)
  const ketikan = useRef({ teks: '', waktu: 0 })
  const wadah = useRef(null)
  const tombol = useRef(null)
  const daftar = useRef(null)

  const iTerpilih = Math.max(0, options.indexOf(value))
  const aturSorot = (i) => {
    sorotKini.current = i
    setSorot(i)
  }

  function ukurRuang() {
    const r = wadah.current?.getBoundingClientRect()
    if (!r) return { arah: 'bawah', tinggi: RUANG_MAKS }
    const bawah = window.innerHeight - r.bottom - JARAK - TEPI
    const atas = r.top - JARAK - TEPI
    if (bawah < RUANG_MIN && atas > bawah) return { arah: 'atas', tinggi: Math.min(RUANG_MAKS, atas) }
    return { arah: 'bawah', tinggi: Math.max(RUANG_MIN, Math.min(RUANG_MAKS, bawah)) }
  }

  function bukaDaftar(i = iTerpilih) {
    setRuang(ukurRuang())
    aturSorot(i)
    setPasang(true)
    setBuka(true)
  }
  function tutup(kembali = true) {
    setBuka(false)
    if (kembali) tombol.current?.focus()
  }
  function pilih(i) {
    if (options[i] !== value) onChange(options[i])
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

  useEffect(() => {
    if (buka) document.getElementById(dasar + '-' + sorot)?.scrollIntoView?.({ block: 'nearest' })
  }, [buka, sorot, dasar])

  // Pengaman bila animationend tidak datang (animasi dimatikan, jsdom): daftar dilepas sesudah waktu pudarnya.
  useEffect(() => {
    if (buka || !pasang) return undefined
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
      sorotKini.current = iTerpilih
      const i = cariKetik(e.key)
      bukaDaftar(i >= 0 ? i : iTerpilih)
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

  // focus-visible:rounded-*: aturan global *:focus-visible di index.css memasang sudut 6px pada elemen yang difokus.
  const bingkai =
    'rounded-xl border bg-surface transition hover:border-line-strong focus-visible:rounded-xl ' +
    (buka ? 'border-brand-ink' : 'border-line')
  const panah = 'shrink-0 text-ink-3 transition-transform duration-200 ' + (buka ? 'rotate-180' : '')

  return (
    <div ref={wadah} className={'relative min-w-0 ' + className}>
      <button
        ref={tombol}
        id={id}
        type="button"
        data-nilai={value}
        aria-haspopup="listbox"
        aria-expanded={buka}
        aria-controls={pasang ? idDaftar : undefined}
        // Kotak besar: nama = label di luar + pilihan saat ini ("3. Angkatan 2023 · 2 mahasiswa"). Kotak ringkas
        // memakai isinya sendiri ("Fakultas Semua").
        aria-labelledby={!ringkas && labelOleh ? labelOleh + ' ' + idNilai : undefined}
        onClick={() => (buka ? tutup(false) : bukaDaftar())}
        onKeyDown={tekanTombol}
        className={
          ringkas
            ? 'flex w-full min-w-0 items-center text-left ' + bingkai
            : 'flex w-full min-w-0 items-center gap-2 px-3.5 py-3 text-left text-[14.5px] font-bold text-ink ' + bingkai
        }
      >
        {ringkas ? (
          <>
            <span id={idLabel} className="shrink-0 whitespace-nowrap pl-3.5 text-[12.5px] font-semibold text-ink-2">
              {label}
            </span>
            <span id={idNilai} className="min-w-0 flex-1 truncate py-2.5 pl-2 pr-1.5 text-sm font-semibold text-ink">
              {tampil(value)}
            </span>
            <IconChevronDown size={16} className={'mr-2.5 ' + panah} />
          </>
        ) : (
          <>
            <span id={idNilai} className="min-w-0 flex-1 truncate">
              {tampil(value)}
            </span>
            <IconChevronDown size={16} className={panah} />
          </>
        )}
      </button>

      {pasang ? (
        <ul
          ref={daftar}
          id={idDaftar}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={ringkas ? idLabel : labelOleh}
          aria-activedescendant={idPilihan(sorot)}
          data-arah={ruang.arah}
          onKeyDown={tekanDaftar}
          onAnimationEnd={(e) => {
            // animationend pilihan (gerak masuk berurutan) ikut naik ke sini; hanya milik daftar yang dihitung.
            if (!buka && e.target === e.currentTarget) setPasang(false)
          }}
          style={{ maxHeight: ruang.tinggi }}
          className={
            'absolute inset-x-0 z-30 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-pop focus-visible:rounded-2xl focus-visible:outline-none ' +
            (ruang.arah === 'atas' ? 'bottom-[calc(100%+8px)] ' : 'top-[calc(100%+8px)] ') +
            (buka ? 'daftar-turun' : 'daftar-turun-tutup pointer-events-none')
          }
        >
          {options.map((o, i) => {
            const terpilih = o === value
            return (
              <li
                key={String(o)}
                id={idPilihan(i)}
                role="option"
                aria-selected={terpilih}
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
