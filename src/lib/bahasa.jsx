'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { EN } from './teks'
import { dumpOtomatis, hasilOtomatis, mintaTerjemahan, saatSelesai } from './terjemahOtomatis'

/* --------------------------------------------------------------------------
   Dwibahasa Indonesia dan Inggris.

   KEPUTUSAN PALING PENTING DI BERKAS INI: kalimat Indonesia dipakai sebagai
   KUNCI terjemahan, bukan kode seperti 'dashboard.nilaiAkhir'.

   Alasannya praktis. Dengan kunci berupa kode, setiap kalimat di layar hilang
   dari berkas halamannya dan berubah menjadi rujukan yang harus dilacak ke
   kamus; membaca satu halaman jadi mustahil tanpa membuka dua berkas. Dengan
   kalimat Indonesia sebagai kunci, halaman tetap terbaca apa adanya, dan
   kamus hanya berisi pasangan terjemahannya.

   Akibat lain yang menguntungkan: kalimat yang BELUM diterjemahkan jatuh
   kembali ke bahasa Indonesia, bukan menjadi kode mentah seperti
   'dashboard.nilaiAkhir' yang bocor ke layar pengguna.

   Nilai sisipan ditulis {dalamKurungKurawal}:
     t('Semester {n} dari {total}', { n: 2, total: 3 })
   -------------------------------------------------------------------------- */

const KUNCI = 'sk5c.bahasa'

export const BAHASA = [
  { id: 'id', kode: 'ID', nama: 'Bahasa Indonesia' },
  { id: 'en', kode: 'EN', nama: 'English' },
]

const BahasaContext = createContext(null)


/** Mengisi {penanda} dengan nilainya. */
function isi(teks, nilai) {
  if (!nilai) return teks
  return String(teks).replace(/\{(\w+)\}/g, (utuh, k) => (k in nilai ? String(nilai[k]) : utuh))
}

/* --------------------------------------------------------------------------
   Kunci dirapikan sebelum dicocokkan: spasi di ujung dibuang, dan deretan
   spasi atau baris baru di tengah dipadatkan jadi satu spasi.

   Ini bukan kerapian kosmetik, melainkan yang membuat kamus tidak gampang
   putus. Kalimat panjang di JSX kerap ditulis memanjang beberapa baris dengan
   indentasi, dan satu kali penataan ulang oleh penyunting kode sudah cukup
   mengubah kuncinya tanpa satu huruf pun berbeda di layar. Tanpa perapian ini,
   terjemahannya diam-diam berhenti ditemukan dan kalimatnya kembali ke bahasa
   Indonesia, padahal tidak ada yang salah.
   -------------------------------------------------------------------------- */
export const rapikan = (teks) => String(teks ?? '').trim().replace(/\s+/g, ' ')

const EN_RAPI = new Map(Object.entries(EN).map(([k, v]) => [rapikan(k), v]))

/* Kunci yang sudah dilaporkan, supaya satu kalimat yang dirender ratusan kali
   tidak membanjiri konsol dengan peringatan yang sama. */
const sudahDilapor = new Set()

/* --------------------------------------------------------------------------
   Tiga lapis, dan urutannya yang menentukan segalanya.

     1. KAMUS. Selalu menang. Di situlah istilah domain diputuskan manusia.
     2. MESIN PERAMBAN. Hanya mengisi lubang: kalimat yang belum ada di kamus.
        Jalan di Chromium baru, diam di peramban lain.
     3. BAHASA INDONESIA apa adanya.

   Mesin tidak pernah bisa menimpa lapis pertama. Itu bukan pembatasan teknis
   melainkan keputusan: "Nilai sementara" harus terbaca "Provisional score",
   dan mesin mana pun akan menebaknya "Temporary value".
   -------------------------------------------------------------------------- */
export function terjemah(bahasa, teks, nilai) {
  if (bahasa !== 'en') return isi(teks, nilai)

  /* Nilai kosong dianggap BELUM diterjemahkan, bukan "terjemahannya kosong".
     Perintah bahasa:sync menuliskan kunci baru dengan nilai kosong supaya
     tinggal diisi, dan selama itu kalimatnya harus tetap terbaca. */
  const padanan = EN_RAPI.get(rapikan(teks))
  if (padanan) return isi(padanan, nilai)

  /* Lapis kedua: hasil mesin yang sudah pernah dihitung di sesi ini. */
  const mesin = hasilOtomatis(teks)
  if (mesin) return isi(mesin, nilai)

  /* Belum ada: titipkan ke antrean. Pemanggilan ini tidak menunggu; hasilnya
     datang belakangan dan memicu gambar ulang lewat saatSelesai(). */
  if (OTOMATIS.aktif) mintaTerjemahan(teks)

  /* Peringatan hanya saat pengembangan. Di layar pengguna, kalimat tanpa
     padanan cukup jatuh ke bahasa Indonesia tanpa ribut. */
  const pengembangan =
    typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  if (pengembangan && teks && !sudahDilapor.has(teks)) {
    sudahDilapor.add(teks)
    console.warn(
      '[bahasa] belum ada padanan Inggris untuk:\n  ' +
        rapikan(teks) +
        '\n  Jalankan: npm run bahasa:sync',
    )
  }
  return isi(teks, nilai)
}

/* Saklar terjemahan mesin. Dipisahkan sebagai objek supaya uji bisa
   mematikannya tanpa menyentuh modul lain. */
export const OTOMATIS = { aktif: true }

export function BahasaProvider({ children }) {
  /* Selalu mulai dari Indonesia, sama seperti yang dirender di server.

     Berbeda dari tema — yang bisa dipasang lebih dulu lewat skrip kecil di
     <head> karena ia hanya sebuah kelas CSS — bahasa mengubah ISI teksnya.
     Kalau render pertama di peramban sudah memakai bahasa tersimpan sementara
     HTML dari server berbahasa Indonesia, React akan menolak hidrasinya. Jadi
     bahasa tersimpan baru dipasang setelah komponen menempel. */
  const [bahasa, setBahasa] = useState('id')
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    try {
      const tersimpan = localStorage.getItem(KUNCI)
      if (tersimpan === 'en' || tersimpan === 'id') setBahasa(tersimpan)
    } catch {
      /* penyimpanan diblokir — cukup di memori */
    }

    /* Bawaannya tetap Indonesia, BUKAN bahasa peramban. Ini sistem internal
       kampus Indonesia; banyak mahasiswanya menyetel peramban ke Inggris tanpa
       bermaksud memakai aplikasi kampus dalam bahasa Inggris, dan menebak dari
       situ akan menyambut mereka dengan bahasa yang tidak mereka minta. */
    setSiap(true)
  }, [])

  /* Bahasa pada render sebelumnya. Dipakai membedakan PERGANTIAN oleh pengguna
     dari pembacaan awal dari penyimpanan — hanya yang pertama yang pantas
     dianimasikan. Tanpa pembeda ini, setiap halaman dimuat akan berkedip. */
  const sebelumnya = useRef(null)

  /* Menulis hanya setelah pembacaan awal selesai. Tanpa penjagaan ini, render
     pertama (yang selalu 'id') akan menimpa pilihan yang tersimpan. */
  useEffect(() => {
    if (!siap) return
    /* Atribut lang ikut diperbarui: pembaca layar memilih pelafalan dari sini,
       dan tanpa itu kalimat Inggris akan dibacakan dengan lafal Indonesia. */
    document.documentElement.lang = bahasa
    try {
      localStorage.setItem(KUNCI, bahasa)
    } catch {
      /* diabaikan */
    }

    /* Seluruh tulisan di layar berganti sekaligus. Tanpa jeda apa pun, itu
       terbaca sebagai kedipan; dengan pudar sangat pendek, ia terbaca sebagai
       satu halaman yang menyusun ulang dirinya.

       Dipasang sebagai kelas di <html>, bukan state React, supaya tidak ada
       satu pun komponen halaman yang perlu tahu soal ini. Durasinya sudah
       dihormati aturan prefers-reduced-motion di index.css. */
    const awal = sebelumnya.current
    sebelumnya.current = bahasa
    if (awal === null || awal === bahasa) return

    const akar = document.documentElement
    akar.classList.add('ganti-bahasa')
    const id = setTimeout(() => akar.classList.remove('ganti-bahasa'), 300)
    return () => {
      clearTimeout(id)
      akar.classList.remove('ganti-bahasa')
    }
  }, [bahasa, siap])

  /* Hasil mesin datang belakangan dan asinkron. Nomor ini naik setiap ada
     hasil baru, dan itulah yang membuat halaman menggambar ulang dengan
     kalimat yang tadinya masih berbahasa Indonesia. */
  const [putaran, setPutaran] = useState(0)

  useEffect(() => {
    if (bahasa !== 'en') return
    return saatSelesai(() => setPutaran((n) => n + 1))
  }, [bahasa])

  /* Pembantu konsol untuk menyalin draf mesin ke teks.js. Dipasang di window
     supaya bisa dipanggil langsung dari alat pengembang peramban. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.dumpOtomatis = dumpOtomatis
  }, [])

  const t = useCallback(
    (teks, nilai) => terjemah(bahasa, teks, nilai),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bahasa, putaran],
  )
  const toggle = useCallback(() => setBahasa((b) => (b === 'id' ? 'en' : 'id')), [])

  const nilai = useMemo(() => ({ bahasa, setBahasa, toggle, t }), [bahasa, toggle, t])
  return <BahasaContext.Provider value={nilai}>{children}</BahasaContext.Provider>
}

/* Sengaja TIDAK melempar galat bila dipakai di luar penyedia: komponen kecil
   kerap dirender sendirian di dalam uji, dan bahasa bukan hal yang boleh
   membuat halaman gagal tampil. Di luar penyedia, semuanya berbahasa
   Indonesia. */
const CADANGAN = {
  bahasa: 'id',
  setBahasa: () => {},
  toggle: () => {},
  t: (teks, nilai) => isi(teks, nilai),
}

export function useBahasa() {
  return useContext(BahasaContext) ?? CADANGAN
}

/** Pintasan untuk komponen yang hanya butuh penerjemahnya. */
export const useTeks = () => useBahasa().t
