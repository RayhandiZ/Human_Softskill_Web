import { db } from './db.js'
import { GalatApi } from './api.js'

// Isian profil milik pengguna sendiri: telepon, ponsel, alamat, dan foto. Bukan data asesmen,
// jadi tidak lewat batch atau audit.

const TELEPON_SAH = /^[0-9+().\- ]{6,25}$/
const BATAS_FOTO = 8 * 1024 * 1024 // panjang data URL; foto sudah diperkecil di peramban

function teks(nilai, maks, label) {
  const s = String(nilai ?? '').trim()
  if (!s) return null
  if (s.length > maks) throw new GalatApi(label + ' terlalu panjang.')
  return s
}

function telepon(nilai, label) {
  const s = teks(nilai, 25, label)
  if (s && !TELEPON_SAH.test(s)) throw new GalatApi(label + ' hanya boleh berisi angka, spasi, dan tanda + ( ) - .')
  return s
}

function foto(nilai) {
  if (nilai == null || nilai === '') return null
  const s = String(nilai)
  if (!s.startsWith('data:image/')) throw new GalatApi('Foto harus berupa gambar.')
  if (s.length > BATAS_FOTO) throw new GalatApi('Foto terlalu besar.')
  return s
}

export async function simpanProfil(pengguna, isi) {
  const data = {
    telepon: telepon(isi.telepon, 'Nomor telepon'),
    ponsel: telepon(isi.ponsel, 'Nomor ponsel'),
    alamat: teks(isi.alamat, 500, 'Alamat'),
    foto: foto(isi.foto),
    fotoSumber: foto(isi.fotoSumber),
  }
  await db.profil.upsert({
    where: { penggunaId: pengguna.id },
    update: data,
    create: { penggunaId: pengguna.id, ...data },
  })
  return { ok: true }
}
