import { db } from './db.js'
import { GalatApi } from './api.js'
import { catatLog } from './log.js'
import { ALASAN_MIN } from './nilai.js'
import {
  AWALAN_WEWENANG,
  JENIS,
  KETERANGAN_MAKS,
  MATRIKS,
  PERAN,
  TAMBAHAN_MAKS,
  TINDAKAN_MAKS,
  TINDAKAN_MIN,
  barisBawaan,
  izinUrut,
  kunciSel,
  sakelar,
} from '../lib/wewenang.js'

// Sakelar wewenang (daftarnya di src/lib/wewenang.js): Super Admin menutup sementara satu tindakan peran lain dari
// halaman Peran & Wewenang, lalu membukanya lagi. Yang ditutup tersimpan di Konfigurasi ('WEWENANG.<id>' = false) dan
// dibaca ulang setiap kali tindakannya dicoba, jadi berlaku sejak permintaan berikutnya, tanpa menunggu pengguna memuat
// ulang halamannya. terapkanKonfigurasi() mengabaikan kunci ini karena bukan aturan perhitungan. Lihat README.md ›
// Panel Super Admin › Peran & Wewenang.

/** { id: false } untuk setiap sakelar yang sedang ditutup; yang tidak disebut terbuka. */
export async function ambilWewenang() {
  const baris = await db.konfigurasi.findMany({ where: { kunci: { startsWith: AWALAN_WEWENANG } } })
  const tertutup = {}
  for (const b of baris) {
    const id = b.kunci.slice(AWALAN_WEWENANG.length)
    if (sakelar(id) && b.nilai === false) tertutup[id] = false
  }
  return tertutup
}

/** Menolak (403) bila sakelar `id` sedang ditutup. */
export async function wajibWewenang(id) {
  const baris = await db.konfigurasi.findUnique({ where: { kunci: AWALAN_WEWENANG + id } })
  if (baris?.nilai === false) throw new GalatApi(sakelar(id).pesanTutup, 403)
}

/**
 * Pembungkus `kerja` di pintu API, polanya sama dengan denganPersetujuan: sakelar `id` diperiksa lebih dulu, baru
 * tindakannya dijalankan. Super Admin tidak pernah tertahan sakelar.
 */
export const denganWewenang = (id, kerja) => async (pengguna, isi) => {
  if (!pengguna.superAdmin) await wajibWewenang(id)
  return kerja(pengguna, isi)
}

/** Super admin menutup (`boleh` false) atau membuka lagi (`boleh` true) satu sakelar, dengan alasan. Jawabannya { wewenang }. */
export async function ubahWewenang(pengguna, { id, boleh, alasan } = {}) {
  const s = sakelar(id)
  // Hanya sakelar di daftar: sel lain di matriks, termasuk kolom Super Admin, tidak bisa diubah lewat pintu ini.
  if (!s) throw new GalatApi('Tindakan ini tidak bisa dibuka atau ditutup dari halaman Peran & Wewenang.')
  if (typeof boleh !== 'boolean') throw new GalatApi('Pilihan wewenang harus dibuka atau ditutup.')
  const teksAlasan = String(alasan ?? '').trim()
  if (teksAlasan.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')

  const kunci = AWALAN_WEWENANG + s.id
  const sebelum = (await db.konfigurasi.findUnique({ where: { kunci } }))?.nilai !== false
  // Sudah seperti yang diminta (misalnya halaman Super Admin lain belum dimuat ulang): tidak berubah, tidak dicatat.
  if (sebelum === boleh) return { wewenang: await ambilWewenang() }

  // Perubahan dan catatan lognya dalam satu transaksi: berhasil bersama atau gagal bersama.
  await db.$transaction(async (tx) => {
    await tx.konfigurasi.upsert({ where: { kunci }, update: { nilai: boleh }, create: { kunci, nilai: boleh } })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_WEWENANG',
      target: 'wewenang ' + s.peran + ': ' + s.tindakan,
      rincian: { sakelar: s.id, peran: s.peran, tindakan: s.tindakan, sebelum, sesudah: boleh, alasan: teksAlasan },
    })
  })
  return { wewenang: await ambilWewenang() }
}

/* ------------------------- matriks: keterangan dan kebijakan tertulis ------------------------- */

// Super Admin memberi keterangan pada satu sel matriks (KeteranganWewenang) dan menambah baris kebijakan tertulis
// (TindakanWewenang); pilihan pengguna 6 Nov 2026. Keduanya HANYA TULISAN: tidak ada pintu API yang membacanya, jadi
// kebijakan tertulis tidak dijaga server. Isi Ya/Tidak baris bawaan tetap dari kode (MATRIKS di src/lib/wewenang.js).

const AWALAN_TAMBAHAN = 'T-'

/** Angka id baris tambahan dari 'T-<id>'; null bila bukan. */
function idTambahan(baris) {
  const m = /^T-(\d+)$/.exec(typeof baris === 'string' ? baris : '')
  return m ? Number(m[1]) : null
}

/** Prisma Client lama (server belum dinyalakan ulang sesudah migrasi matriks_wewenang) belum punya kedua tabelnya. */
const matriksSiap = () => Boolean(db.tindakanWewenang && db.keteranganWewenang)

const bentukTambahan = (t) => ({ id: AWALAN_TAMBAHAN + t.id, tindakan: t.tindakan, izin: izinUrut(t.izin), aktif: t.aktif })

/** Keterangan per sel ({ 'KODE|Peran': teks }) dan baris tambahan, termasuk yang diarsipkan. Hanya untuk Super Admin. */
export async function ambilMatriks() {
  if (!matriksSiap()) return { siap: false, keterangan: {}, tambahan: [] }
  const [keterangan, tambahan] = await Promise.all([
    db.keteranganWewenang.findMany(),
    db.tindakanWewenang.findMany({ orderBy: { id: 'asc' } }),
  ])
  return {
    siap: true,
    keterangan: Object.fromEntries(keterangan.map((k) => [kunciSel(k.baris, k.peran), k.teks])),
    tambahan: tambahan.map(bentukTambahan),
  }
}

const AKSI_MATRIKS = ['keterangan', 'tambah', 'ubah', 'arsipkan', 'pulihkan']

/**
 * Super admin mengubah matriks. `aksi`: 'keterangan' ({ baris, peran, teks }; teks kosong = dihapus), 'tambah'
 * ({ tindakan, izin, keterangan }), 'ubah' ({ id, tindakan, izin }), 'arsipkan' atau 'pulihkan' ({ id }); semuanya
 * dengan `alasan`. Yang tidak berubah tidak dicatat. Jawabannya { matriks }, ditambah `id` baris baru untuk 'tambah'.
 */
export async function ubahMatriks(pengguna, isi = {}) {
  if (!AKSI_MATRIKS.includes(isi.aksi)) throw new GalatApi('Aksi matriks tidak dikenal.')
  if (!matriksSiap()) {
    throw new GalatApi('Server belum mengenal tabel matriks wewenang. Matikan npm run dev, jalankan npx prisma generate, lalu nyalakan lagi.', 503)
  }
  const alasan = String(isi.alasan ?? '').trim()
  if (alasan.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')
  if (isi.aksi === 'keterangan') return simpanKeterangan(pengguna, isi, alasan)
  if (isi.aksi === 'tambah') return tambahTindakan(pengguna, isi, alasan)
  if (isi.aksi === 'ubah') return ubahTindakan(pengguna, isi, alasan)
  return aturArsip(pengguna, isi, alasan)
}

/** Baris tambahan 'T-<id>'; 400 bila tidak ada, atau bila sudah diarsipkan padahal harus aktif. */
async function cariTambahan(baris, wajibAktif = true) {
  const id = idTambahan(baris)
  const t = id ? await db.tindakanWewenang.findUnique({ where: { id } }) : null
  if (!t || (wajibAktif && !t.aktif)) throw new GalatApi('Baris kebijakan tidak dikenal atau sudah diarsipkan.')
  return t
}

/** Nama tindakan pada baris `baris`: baris bawaan, atau baris tambahan yang masih aktif. */
async function namaBaris(baris) {
  const bawaan = typeof baris === 'string' ? barisBawaan(baris) : null
  if (bawaan) return bawaan.tindakan
  if (idTambahan(baris) == null) throw new GalatApi('Baris matriks tidak dikenal.')
  return (await cariTambahan(baris)).tindakan
}

/** Teks keterangan dari layar, dirapikan. Kosong berarti tidak ada keterangan. */
function bacaTeks(teks) {
  const hasil = String(teks ?? '').trim()
  if (hasil.length > KETERANGAN_MAKS) throw new GalatApi('Keterangan paling panjang 300 karakter.')
  return hasil
}

/** Izin baris tambahan: tiap peran salah satu JENIS, disimpan dalam urutan PERAN. */
function bacaIzin(izin) {
  if (!izin || typeof izin !== 'object' || PERAN.some((p) => !JENIS.includes(izin[p]))) {
    throw new GalatApi('Pilih Ya, Ya dengan syarat, Selalu perlu persetujuan, atau Tidak untuk setiap peran.')
  }
  return izinUrut(izin)
}

/** Nama tindakan baru atau yang diubah: panjangnya wajar, dan tidak kembar dengan baris bawaan atau baris aktif lain. */
async function bacaNama(tindakan, kecuali = null) {
  const nama = String(tindakan ?? '').trim().replace(/\s+/g, ' ')
  if (nama.length < TINDAKAN_MIN || nama.length > TINDAKAN_MAKS) throw new GalatApi('Nama tindakan harus 5 sampai 150 karakter.')
  const sama = (x) => x.toLowerCase() === nama.toLowerCase()
  const aktif = await db.tindakanWewenang.findMany({ where: { aktif: true }, select: { id: true, tindakan: true } })
  if (MATRIKS.some((m) => sama(m.tindakan)) || aktif.some((t) => t.id !== kecuali && sama(t.tindakan))) {
    throw new GalatApi('Tindakan dengan nama itu sudah ada di matriks.', 409)
  }
  return nama
}

/** Keterangan awal baris baru, { peran: teks }; yang kosong dilewati. */
function bacaKeteranganAwal(keterangan) {
  if (keterangan == null) return {}
  if (typeof keterangan !== 'object' || Array.isArray(keterangan)) throw new GalatApi('Peran tidak dikenal.')
  const hasil = {}
  for (const [peran, teks] of Object.entries(keterangan)) {
    if (!PERAN.includes(peran)) throw new GalatApi('Peran tidak dikenal.')
    const isi = bacaTeks(teks)
    if (isi) hasil[peran] = isi
  }
  return hasil
}

const jumlahAktif = () => db.tindakanWewenang.count({ where: { aktif: true } })

async function simpanKeterangan(pengguna, { baris, peran, teks }, alasan) {
  const tindakan = await namaBaris(baris)
  if (!PERAN.includes(peran)) throw new GalatApi('Peran tidak dikenal.')
  const baru = bacaTeks(teks)
  const kunci = { baris_peran: { baris, peran } }
  const lama = (await db.keteranganWewenang.findUnique({ where: kunci }))?.teks ?? ''
  if (lama === baru) return { matriks: await ambilMatriks() }

  // Keterangan dan catatan lognya dalam satu transaksi.
  await db.$transaction(async (tx) => {
    if (baru) {
      await tx.keteranganWewenang.upsert({
        where: kunci,
        update: { teks: baru, diubahOleh: pengguna.id },
        create: { baris, peran, teks: baru, diubahOleh: pengguna.id },
      })
    } else {
      await tx.keteranganWewenang.deleteMany({ where: { baris, peran } })
    }
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_KETERANGAN_WEWENANG',
      target: 'wewenang ' + peran + ': ' + tindakan,
      rincian: { baris, peran, tindakan, sebelum: lama || null, sesudah: baru || null, alasan },
    })
  })
  return { matriks: await ambilMatriks() }
}

async function tambahTindakan(pengguna, { tindakan, izin, keterangan }, alasan) {
  const nama = await bacaNama(tindakan)
  const izinBersih = bacaIzin(izin)
  const ket = bacaKeteranganAwal(keterangan)
  if ((await jumlahAktif()) >= TAMBAHAN_MAKS) {
    throw new GalatApi('Kebijakan tertulis paling banyak 30 baris aktif. Arsipkan yang tidak dipakai lagi.', 409)
  }

  const id = await db.$transaction(async (tx) => {
    const t = await tx.tindakanWewenang.create({ data: { tindakan: nama, izin: izinBersih, dibuatOleh: pengguna.id } })
    const baris = AWALAN_TAMBAHAN + t.id
    for (const [peran, teks] of Object.entries(ket)) {
      await tx.keteranganWewenang.upsert({
        where: { baris_peran: { baris, peran } },
        update: { teks, diubahOleh: pengguna.id },
        create: { baris, peran, teks, diubahOleh: pengguna.id },
      })
    }
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'TAMBAH_TINDAKAN_WEWENANG',
      target: 'kebijakan wewenang ' + nama,
      rincian: { baris, tindakan: nama, izin: izinBersih, ...(Object.keys(ket).length ? { keterangan: ket } : {}), alasan },
    })
    return baris
  })
  return { id, matriks: await ambilMatriks() }
}

async function ubahTindakan(pengguna, { id, tindakan, izin }, alasan) {
  const lama = await cariTambahan(id)
  const nama = await bacaNama(tindakan, lama.id)
  const izinBersih = bacaIzin(izin)
  const izinLama = izinUrut(lama.izin)
  if (lama.tindakan === nama && PERAN.every((p) => izinLama[p] === izinBersih[p])) return { matriks: await ambilMatriks() }

  await db.$transaction(async (tx) => {
    await tx.tindakanWewenang.update({
      where: { id: lama.id },
      data: { tindakan: nama, izin: izinBersih, diubahOleh: pengguna.id, diubahPada: new Date() },
    })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_TINDAKAN_WEWENANG',
      target: 'kebijakan wewenang ' + nama,
      rincian: {
        baris: AWALAN_TAMBAHAN + lama.id,
        sebelum: { tindakan: lama.tindakan, ...izinLama },
        sesudah: { tindakan: nama, ...izinBersih },
        alasan,
      },
    })
  })
  return { matriks: await ambilMatriks() }
}

async function aturArsip(pengguna, { aksi, id }, alasan) {
  const t = await cariTambahan(id, false)
  const aktif = aksi === 'pulihkan'
  if (t.aktif === aktif) return { matriks: await ambilMatriks() }
  if (aktif) {
    // Dipulihkan berarti tampil lagi, jadi batas jumlah dan nama kembar diperiksa seperti baris baru.
    if ((await jumlahAktif()) >= TAMBAHAN_MAKS) {
      throw new GalatApi('Kebijakan tertulis paling banyak 30 baris aktif. Arsipkan yang tidak dipakai lagi.', 409)
    }
    await bacaNama(t.tindakan, t.id)
  }

  await db.$transaction(async (tx) => {
    await tx.tindakanWewenang.update({ where: { id: t.id }, data: { aktif, diubahOleh: pengguna.id, diubahPada: new Date() } })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: aktif ? 'PULIHKAN_TINDAKAN_WEWENANG' : 'ARSIPKAN_TINDAKAN_WEWENANG',
      target: 'kebijakan wewenang ' + t.tindakan,
      rincian: { baris: AWALAN_TAMBAHAN + t.id, tindakan: t.tindakan, alasan },
    })
  })
  return { matriks: await ambilMatriks() }
}
