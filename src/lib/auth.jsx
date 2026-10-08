'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { modeLokal } from './modeData.js'

/* Masuk lewat basis data: email dan kata sandi diperiksa /api/masuk terhadap
   tabel Pengguna (lihat src/server/masuk.js), dan server memasang cookie sesi
   bertanda tangan. Setiap halaman dimuat, akunnya dibaca ulang dari basis data
   lewat /api/sesi — perubahan nama, prodi, atau angkatan langsung terlihat.

   Skrip uji berjalan tanpa server (mode lokal): sesinya dibaca dari localStorage. */

const STORAGE_KEY = 'sk5c.session'

const ADMIN_PROFILE = {
  name: 'Biro Kemahasiswaan & Humaniora',
  unit: 'Student Development & Humanities',
  email: 'admin@umn.ac.id',
  /* Akun Kemahasiswaan di basis data tidak punya nama orang. Nama yang sama
     dipakai server sebagai pelaku setiap tindakan admin (src/server/muat.js). */
  officer: 'Biro Kemahasiswaan',
}

const AuthContext = createContext(null)

/* Tebakan peran dari domain — konvensi UMN yang sebenarnya: mahasiswa memakai
   @student.umn.ac.id, dosen @lecturer.umn.ac.id, dan alamat @umn.ac.id biasa
   dipegang unit kerja, termasuk Biro Kemahasiswaan. Hanya untuk petunjuk di
   halaman masuk; peran yang berlaku selalu dibaca dari basis data.

   Ditulis sebagai daftar, bukan rantai ternary: menambah peran keempat nanti
   cukup menambah satu baris, dan tiap pasangan domain-peran tetap terbaca
   sebagai satu kesatuan. */
const DOMAIN = [
  [/@student\.umn\.ac\.id$/i, 'student'],
  [/@lecturer\.umn\.ac\.id$/i, 'dosen'],
]

export function roleFromEmail(email) {
  const alamat = String(email ?? '').trim()
  for (const [pola, peran] of DOMAIN) if (pola.test(alamat)) return peran
  return 'admin'
}

/* --------------------------------------------------------------------------
   Tempat mendarat tiap peran.

   Dulu ini ditulis `role === 'admin' ? '/admin' : '/mahasiswa'` di tujuh tempat
   berbeda. Percabangan biner seperti itu tidak pernah salah selama perannya
   memang dua — dan diam-diam salah pada hari peran ketiga lahir: dosen akan
   dilempar ke panel mahasiswa tanpa satu pun galat muncul. Sekarang hanya ada
   SATU tempat yang tahu jawabannya.
   -------------------------------------------------------------------------- */
const PANEL = { admin: '/admin', dosen: '/dosen', student: '/mahasiswa' }

export const panelUntuk = (role) => PANEL[role] ?? '/masuk'

/** Sebutan peran yang dibaca manusia — dipakai menu akun dan halaman masuk. */
export const LABEL_PERAN = { admin: 'Kemahasiswaan', dosen: 'Dosen', student: 'Mahasiswa' }

/** Inisial dari nama tanpa gelar — "Simon Petrus Wenehenubun, S.S., M.M." → "SP". */
const inisial = (nama) =>
  String(nama ?? '')
    .split(',')[0]
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

/* Jawaban /api/masuk disusun menjadi sesi berbentuk sama seperti sebelumnya,
   supaya tidak ada satu halaman pun yang perlu tahu dari mana datanya. */
function sesiDari(akun) {
  if (akun.peran === 'admin') {
    return {
      role: 'admin',
      email: akun.email,
      name: ADMIN_PROFILE.name,
      initials: 'KH',
      subtitle: ADMIN_PROFILE.unit,
    }
  }

  if (akun.peran === 'dosen') {
    const d = akun.dosen
    return {
      role: 'dosen',
      nip: d.nip,
      email: akun.email,
      name: d.nama,
      initials: inisial(d.nama),
      subtitle: d.jabatan,
      /* Kewenangan menilai: satu unit asesmen pada satu semester. Dipakai
         halaman dosen untuk menyaring pengumpulan yang memang menjadi
         tanggung jawabnya — bukan sekadar hiasan di kartu profil. */
      sumber: d.sumber,
      semester: d.semester,
      prodi: d.prodi,
      fakultas: d.fakultas,
    }
  }

  const m = akun.mahasiswa
  return {
    role: 'student',
    studentId: m.id,
    nim: m.nim,
    email: akun.email,
    name: m.nama,
    initials: inisial(m.nama),
    subtitle: m.prodi,
    cohort: m.angkatanId,
    semesterAktif: m.semesterAktif,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [siap, setSiap] = useState(false)

  /* --------------------------------------------------------------------------
     Sesi dibaca SESUDAH komponen menempel, bukan saat state pertama dibuat.

     Di Next.js halaman dirender lebih dulu di server, dan di sana localStorage
     tidak ada. Kalau sesi ikut dibaca pada render pertama, HTML dari server
     (belum masuk) berbeda dengan render pertama di peramban (sudah masuk), dan
     React akan menolak hidrasinya. `siap` menandai bahwa pembacaan itu sudah
     selesai — sebelum itu, penjaga peran tidak boleh menyimpulkan apa pun.
     -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!modeLokal()) {
      let batal = false
      try {
        // Sesi lama di localStorage berasal dari masa sebelum login lewat basis data.
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* diabaikan */
      }
      fetch('/api/sesi')
        .then(async (r) => {
          const isi = await r.json().catch(() => ({}))
          if (!batal) setUser(r.ok && isi.akun ? sesiDari(isi.akun) : null)
        })
        .catch(() => {
          if (!batal) setUser(null)
        })
        .finally(() => {
          if (!batal) setSiap(true)
        })
      return () => {
        batal = true
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      /* localStorage bisa diblokir — sesi cukup di memori */
    }
    setSiap(true)
    return undefined
  }, [])

  /* Menulis hanya setelah pembacaan awal selesai. Tanpa penjagaan ini,
     render pertama (user masih null) akan menghapus sesi yang tersimpan. */
  useEffect(() => {
    if (!siap || !modeLokal()) return
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* diabaikan */
    }
  }, [user, siap])

  const login = useCallback(async ({ email, password }) => {
    if (!email.trim() || !password) throw new Error('Email dan kata sandi wajib diisi.')

    /* Identitas ditentukan oleh akun di basis data, bukan oleh tebakan dari
       domain. Alamat yang tidak terdaftar ditolak — masuk sebagai orang lain
       jauh lebih berbahaya daripada gagal masuk. */
    let jawaban
    try {
      jawaban = await fetch('/api/masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      throw new Error('Server tidak bisa dihubungi. Periksa koneksi, lalu coba lagi.')
    }
    const isi = await jawaban.json().catch(() => ({}))
    if (!jawaban.ok || !isi.akun) throw new Error(isi.galat ?? 'Gagal masuk. Coba lagi.')

    const next = sesiDari(isi.akun)
    setUser(next)
    return next
  }, [])

  const logout = useCallback(() => {
    if (!modeLokal()) fetch('/api/keluar', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, siap, login, logout, admin: ADMIN_PROFILE }),
    [user, siap, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

/**
 * Penjaga peran. Berbeda dari versi react-router yang mengembalikan <Navigate>,
 * di Next perpindahan dilakukan lewat router di dalam efek — mengubah rute
 * selagi merender akan ditolak React.
 *
 * Selama sesi belum selesai dibaca, tidak ada yang dirender: menebak "belum
 * masuk" lalu melempar ke halaman login akan menendang keluar pengguna yang
 * sebenarnya sudah masuk.
 */
export function RequireRole({ role, children }) {
  const { user, siap } = useAuth()
  const router = useRouter()

  const tujuan = !siap
    ? null
    : !user
      ? '/masuk'
      : user.role !== role
        ? panelUntuk(user.role)
        : null

  useEffect(() => {
    if (tujuan) router.replace(tujuan)
  }, [tujuan, router])

  if (!siap || tujuan) return null
  return children
}
