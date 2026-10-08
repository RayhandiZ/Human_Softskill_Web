'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { modeLokal } from './modeData.js'

const STORAGE_KEY = 'sk5c.session'

const ADMIN_PROFILE = {
  name: 'Biro Kemahasiswaan & Humaniora',
  unit: 'Student Development & Humanities',
  /* Nama ini juga dipakai server sebagai pelaku tindakan admin. */
  officer: 'Biro Kemahasiswaan',
}

const AuthContext = createContext(null)

/* Tebakan dari domain hanya untuk petunjuk; peran yang berlaku dibaca dari basis data. */
const DOMAIN = [
  [/@student\.umn\.ac\.id$/i, 'student'],
  [/@lecturer\.umn\.ac\.id$/i, 'dosen'],
]

export function roleFromEmail(email) {
  const alamat = String(email ?? '').trim()
  for (const [pola, peran] of DOMAIN) if (pola.test(alamat)) return peran
  return 'admin'
}

const PANEL = { admin: '/admin', dosen: '/dosen', student: '/mahasiswa' }

export const panelUntuk = (role) => PANEL[role] ?? '/masuk'

export const LABEL_PERAN = { admin: 'Kemahasiswaan', dosen: 'Dosen', student: 'Mahasiswa' }

const inisial = (nama) =>
  String(nama ?? '')
    .split(',')[0]
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

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

  /* Sesi dibaca sesudah komponen menempel; lihat README.md › Hidrasi. */
  useEffect(() => {
    if (!modeLokal()) {
      let batal = false
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
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
    }
    setSiap(true)
    return undefined
  }, [])

  /* Tulis hanya setelah pembacaan awal; render pertama (user null) akan menghapus sesi. */
  useEffect(() => {
    if (!siap || !modeLokal()) return
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
    }
  }, [user, siap])

  const login = useCallback(async ({ email, password }) => {
    if (!email.trim() || !password) throw new Error('Email dan kata sandi wajib diisi.')

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

/** Penjaga peran: pindah rute di dalam efek dan tunggu sesi selesai dibaca. */
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
