import { db } from './db.js'
import { GalatApi } from './api.js'
import { catatLog } from './log.js'

// Isian profil milik pengguna sendiri: telepon, ponsel, alamat, dan foto. Bukan data asesmen,
// jadi tidak lewat batch atau audit. Perubahannya tercatat di Log Aktivitas (UBAH_PROFIL), tetapi hanya
// NAMA isian yang berubah, bukan isinya: nomor dan alamat adalah data pribadi, dan log tidak bisa dihapus.

// Kolom Profil → sebutan di log. Foto dan sumbernya (fotoSumber, foto sebelum dipotong) dihitung satu isian.
const SEBUTAN = { telepon: 'nomor telepon', ponsel: 'nomor ponsel', alamat: 'alamat' }

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
  const lama = await db.profil.findUnique({ where: { penggunaId: pengguna.id } })
  const diubah = Object.keys(SEBUTAN).filter((k) => (lama?.[k] ?? null) !== data[k]).map((k) => SEBUTAN[k])
  const fotoBerubah = (lama?.foto ?? null) !== data.foto || (lama?.fotoSumber ?? null) !== data.fotoSumber
  if (fotoBerubah) diubah.push('foto profil')

  await db.$transaction(async (tx) => {
    await tx.profil.upsert({
      where: { penggunaId: pengguna.id },
      update: data,
      create: { penggunaId: pengguna.id, ...data },
    })
    // Menyimpan tanpa perubahan apa pun tidak dicatat.
    if (diubah.length) {
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'UBAH_PROFIL',
        target: 'akun ' + pengguna.email,
        rincian: {
          diubah,
          ...(fotoBerubah ? { foto: data.foto ? (lama?.foto ? 'diganti' : 'ditambahkan') : 'dihapus' } : {}),
        },
      })
    }
  })
  return { ok: true }
}
