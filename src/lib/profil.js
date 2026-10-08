import { useSyncExternalStore } from 'react'
import { kirim } from './kirim.js'
import { modeLokal } from './modeData.js'

/* --------------------------------------------------------------------------
   Data profil yang dimiliki penggunanya sendiri.

   Di website isinya tersimpan di tabel Profil: dimuat bersama data halaman
   (store.js → pasangProfil) dan disimpan lewat /api/profil. Dalam mode lokal
   (skrip uji) isinya tersimpan di localStorage.

   Dipisah dari store.js dengan sengaja. store.js menyimpan DAFTAR PERUBAHAN
   NILAI — data akademik milik institusi yang harus bisa di-rollback dan masuk
   audit log. Yang di sini sifatnya lain sama sekali: nomor telepon, alamat, dan
   foto, milik orangnya, tidak pernah memengaruhi perhitungan apa pun, dan tidak
   perlu jejak audit. Menyatukan keduanya dalam satu kunci penyimpanan berarti
   sekali kuota penuh, keduanya ikut gagal.

   Nama, NIM, email, program studi, dan angkatan TIDAK disimpan di sini. Semua
   itu berasal dari sistem akademik; kalau bisa ditimpa dari halaman profil,
   seorang mahasiswa dapat menampilkan NIM orang lain pada transkripnya sendiri.
   -------------------------------------------------------------------------- */

const KUNCI = 'sk5c.profil'

/** Sisi foto akhir yang dipakai avatar di seluruh aplikasi. 256 px sudah tajam
    untuk avatar terbesar (64 px) pada layar 2×, dan hasilnya cukup kecil untuk
    localStorage. */
export const UKURAN_FOTO = 256

/** Sisi terpanjang gambar asal yang ikut disimpan agar foto bisa DISUNTING
    ULANG posisinya tanpa mengunggah berkas lagi. Tanpa ini, menyunting ulang
    berarti memperbesar gambar 256 px dan hasilnya pecah. */
export const UKURAN_SUMBER = 512

/** Batas berkas sumber. Yang disimpan jauh lebih kecil karena diperkecil dulu,
    tetapi berkas raksasa tetap ditolak lebih awal agar peramban tidak
    tercekik saat membacanya. */
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
    /* kuota penuh atau penyimpanan diblokir — isian tetap hidup di memori */
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

/**
 * Kunci akun. Mahasiswa dibedakan oleh NIM dan dosen oleh NIP — bukan email,
 * karena email bisa berubah sedangkan nomor induk tidak. Peran Kemahasiswaan
 * hanya satu, jadi cukup ditandai perannya.
 *
 * Dosen WAJIB punya kunci sendiri. Sebelum peran ini ada, semua yang bukan
 * mahasiswa jatuh ke 'unit:kemahasiswaan' — dan kalau dibiarkan, seluruh dosen
 * akan berbagi satu profil: foto dan nomor telepon dosen A muncul di akun
 * dosen B.
 */
export const kunciAkun = (user) => {
  if (user?.role === 'student') return 'nim:' + (user.nim ?? user.studentId ?? '?')
  if (user?.role === 'dosen') return 'nip:' + (user.nip ?? '?')
  return 'unit:kemahasiswaan'
}

/**
 * Kunci akun untuk sesi yang sedang berjalan.
 *
 * Satu-satunya cara yang benar untuk menyusun kunci dari dalam komponen. Kalau
 * tiap tempat menghitungnya sendiri, navbar dan halaman profil bisa memakai
 * kunci berbeda untuk orang yang sama — foto tersimpan, tetapi avatar di pojok
 * kanan tidak pernah menemukannya. `cadanganNim` menutup celah sesi lama yang
 * belum sempat menyimpan NIM.
 */
export const kunciSesi = (user, cadanganNim) =>
  kunciAkun(user?.role === 'student' ? { role: 'student', nim: user?.nim ?? cadanganNim } : user)

/** Isi profil satu akun, ikut menyegarkan komponen bila berubah di tab lain. */
export function useProfil(kunci) {
  useSyncExternalStore(subscribe, bacaVersi, bacaVersi)
  return data[kunci] ?? KOSONG
}

/** Menimpa sebagian isi profil satu akun. */
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

/** Profil pemilik sesi dari basis data. Profil akun lain tidak pernah dimuat ke peramban. */
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

/* Konteks gambar milik sebuah canvas, atau null bila lingkungannya tidak punya
   canvas sama sekali (misalnya jsdom saat pengujian). Memeriksa keberadaan
   getContext saja tidak cukup: metodenya ada, tetapi hasilnya bisa null. */
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

/** Mengeluarkan hasil kanvas sebagai data URL, WebP bila didukung. */
function keDataURL(kanvas) {
  const webp = kanvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp') ? webp : kanvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Memeriksa berkas lalu mengembalikan gambar asalnya sebagai data URL,
 * diperkecil sampai sisi terpanjangnya UKURAN_SUMBER.
 *
 * Sengaja TIDAK memotong apa pun: pemotongan menunggu pengguna mengatur sendiri
 * posisi dan perbesarannya.
 */
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

  /* Tanpa canvas, gambar dipakai apa adanya — lebih baik daripada gagal. */
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

/**
 * Memotong gambar menjadi bujur sangkar UKURAN_FOTO sesuai posisi dan
 * perbesaran yang dipilih pengguna.
 *
 * `tampil` adalah lebar kotak pratinjau di layar, dan `x`/`y` adalah geseran
 * dalam piksel layar pada kotak itu. Perhitungan di bawah menerjemahkannya
 * kembali ke piksel gambar asli, sehingga yang terlihat di pratinjau persis
 * sama dengan yang tersimpan.
 */
export async function potongFoto(sumber, { skala = 1, x = 0, y = 0, tampil = 240 } = {}) {
  const kotak = konteksKanvas(UKURAN_FOTO)
  if (!kotak) return sumber

  const img = await muatGambar(sumber)

  // k = perbesaran "cover": gambar minimal menutupi seluruh kotak pratinjau.
  const k = Math.max(tampil / img.width, tampil / img.height)
  const efektif = k * skala
  const sisiSumber = tampil / efektif

  const sx = img.width / 2 - sisiSumber / 2 - x / efektif
  const sy = img.height / 2 - sisiSumber / 2 - y / efektif

  /* Latar putih dulu: JPEG tidak menyimpan transparansi, dan tanpa ini bagian
     tembus pandang pada PNG akan menjadi hitam pekat. */
  kotak.ctx.fillStyle = '#ffffff'
  kotak.ctx.fillRect(0, 0, UKURAN_FOTO, UKURAN_FOTO)
  kotak.ctx.drawImage(img, sx, sy, sisiSumber, sisiSumber, 0, 0, UKURAN_FOTO, UKURAN_FOTO)

  return keDataURL(kotak.kanvas)
}

muat()

/* Profil yang diubah di tab lain ikut tampil di sini. */
if (typeof window !== 'undefined' && adaPenyimpanan()) {
  window.addEventListener('storage', (e) => {
    if (e.key === KUNCI && !sedangMenulis) {
      muat()
      berubah()
    }
  })
}
