import { useSyncExternalStore } from 'react'
import { kirim } from './kirim.js'
import { modeLokal } from './modeData.js'

/* Data milik pengguna (telepon, alamat, foto), terpisah dari nilai; lihat README.md › Halaman profil. */

const KUNCI = 'sk5c.profil'

export const UKURAN_FOTO = 256

export const UKURAN_SUMBER = 512

export const BATAS_FOTO_MB = 5

export const JENIS_FOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const KOSONG = Object.freeze({
  telepon: '',
  ponsel: '',
  alamat: '',
  foto: null,
  fotoSumber: null,
})

let data = {}
let versi = 0
const listeners = new Set()
let sedangMenulis = false

const adaPenyimpanan = () => {
  if (!modeLokal()) return false
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function muat() {
  if (!adaPenyimpanan()) return
  try {
    data = JSON.parse(localStorage.getItem(KUNCI) ?? '{}') ?? {}
  } catch {
    data = {}
  }
}

function simpan() {
  if (!adaPenyimpanan()) return
  try {
    sedangMenulis = true
    localStorage.setItem(KUNCI, JSON.stringify(data))
  } catch {
  } finally {
    sedangMenulis = false
  }
}

function berubah() {
  versi++
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const bacaVersi = () => versi

/** Kunci akun: NIM untuk mahasiswa, NIP untuk dosen, bukan email. */
export const kunciAkun = (user) => {
  if (user?.role === 'student') return 'nim:' + (user.nim ?? user.studentId ?? '?')
  if (user?.role === 'dosen') return 'nip:' + (user.nip ?? '?')
  return 'unit:kemahasiswaan'
}

/** Satu-satunya cara menyusun kunci dari komponen; jangan hitung sendiri. */
export const kunciSesi = (user, cadanganNim) =>
  kunciAkun(user?.role === 'student' ? { role: 'student', nim: user?.nim ?? cadanganNim } : user)

export function useProfil(kunci) {
  useSyncExternalStore(subscribe, bacaVersi, bacaVersi)
  return data[kunci] ?? KOSONG
}

export async function simpanProfil(kunci, tambalan) {
  const baru = { ...KOSONG, ...(data[kunci] ?? {}), ...tambalan }
  if (!modeLokal()) {
    const { telepon, ponsel, alamat, foto, fotoSumber } = baru
    await kirim('/api/profil', { metode: 'PUT', isi: { telepon, ponsel, alamat, foto, fotoSumber } })
  }
  data[kunci] = baru
  simpan()
  berubah()
  return data[kunci]
}

export function pasangProfil(kunci, profil) {
  data = { [kunci]: { ...KOSONG, ...(profil ?? {}) } }
  berubah()
}

/* ---------------------------------- foto ---------------------------------- */

const bacaBerkas = (file) =>
  new Promise((selesai, gagal) => {
    const r = new FileReader()
    r.onload = () => selesai(r.result)
    r.onerror = () => gagal(new Error('Berkas tidak dapat dibaca.'))
    r.readAsDataURL(file)
  })

/* getContext bisa ada tetapi mengembalikan null (misalnya jsdom). */
function konteksKanvas(sisi) {
  if (typeof document === 'undefined') return null
  const kanvas = document.createElement('canvas')
  if (!kanvas.getContext) return null
  kanvas.width = sisi
  kanvas.height = sisi
  let ctx = null
  try {
    ctx = kanvas.getContext('2d')
  } catch {
    return null
  }
  return ctx ? { kanvas, ctx } : null
}

const muatGambar = async (sumber) => {
  const img = new Image()
  img.src = sumber
  await (img.decode
    ? img.decode()
    : new Promise((ok, no) => {
        img.onload = ok
        img.onerror = () => no(new Error('Gambar tidak dapat dibuka.'))
      }))
  return img
}

function keDataURL(kanvas) {
  const webp = kanvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp') ? webp : kanvas.toDataURL('image/jpeg', 0.85)
}

export async function bacaFoto(file) {
  if (!file) throw new Error('Tidak ada berkas yang dipilih.')
  if (!JENIS_FOTO.includes(file.type)) {
    throw new Error('Jenis berkas harus JPG, PNG, WebP, atau GIF.')
  }
  if (file.size > BATAS_FOTO_MB * 1024 * 1024) {
    throw new Error(
      'Ukuran berkas ' +
        (file.size / 1024 / 1024).toFixed(1) +
        ' MB melebihi batas ' +
        BATAS_FOTO_MB +
        ' MB.',
    )
  }

  const asal = await bacaBerkas(file)

  const kotak = konteksKanvas(UKURAN_SUMBER)
  if (!kotak) return asal

  const img = await muatGambar(asal)
  const sisiTerpanjang = Math.max(img.width, img.height)
  if (sisiTerpanjang <= UKURAN_SUMBER) return asal

  const rasio = UKURAN_SUMBER / sisiTerpanjang
  const lebar = Math.round(img.width * rasio)
  const tinggi = Math.round(img.height * rasio)
  kotak.kanvas.width = lebar
  kotak.kanvas.height = tinggi
  kotak.ctx.fillStyle = '#ffffff'
  kotak.ctx.fillRect(0, 0, lebar, tinggi)
  kotak.ctx.drawImage(img, 0, 0, lebar, tinggi)
  return keDataURL(kotak.kanvas)
}

export async function potongFoto(sumber, { skala = 1, x = 0, y = 0, tampil = 240 } = {}) {
  const kotak = konteksKanvas(UKURAN_FOTO)
  if (!kotak) return sumber

  const img = await muatGambar(sumber)

  const k = Math.max(tampil / img.width, tampil / img.height)
  const efektif = k * skala
  const sisiSumber = tampil / efektif

  const sx = img.width / 2 - sisiSumber / 2 - x / efektif
  const sy = img.height / 2 - sisiSumber / 2 - y / efektif

  /* Latar putih dulu: JPEG tidak menyimpan transparansi. */
  kotak.ctx.fillStyle = '#ffffff'
  kotak.ctx.fillRect(0, 0, UKURAN_FOTO, UKURAN_FOTO)
  kotak.ctx.drawImage(img, sx, sy, sisiSumber, sisiSumber, 0, 0, UKURAN_FOTO, UKURAN_FOTO)

  return keDataURL(kotak.kanvas)
}

muat()

if (typeof window !== 'undefined' && adaPenyimpanan()) {
  window.addEventListener('storage', (e) => {
    if (e.key === KUNCI && !sedangMenulis) {
      muat()
      berubah()
    }
  })
}
