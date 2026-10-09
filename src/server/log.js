import { db } from './db.js'
import { GalatApi } from './api.js'
import { petaNama, waktuWib } from './muat.js'
import { getKomponenById } from '../lib/curriculum.js'

// Catatan tindakan admin selain perubahan nilai (yang sudah punya AuditLog): kunci angkatan, perubahan
// data terkunci beserta alasannya, dan perubahan tanda penguncian aspek.
//
// Dipanggil DI DALAM transaksi `tx` yang sama dengan perubahan datanya, supaya catatan dan perubahan
// selalu berhasil atau gagal bersama: tidak ada perubahan tanpa jejak, tidak ada jejak tanpa perubahan.

export async function catatLog(tx, { aktorId, aksi, target, rincian }) {
  await tx.logAktivitas.create({
    data: { aktorId, aksi, target, rincian: rincian ?? undefined },
  })
}

/* ------------------------------- membaca log ------------------------------ */

// Halaman Log Aktivitas membaca dua tabel dengan bentuk pencarian yang sama, jadi satu fungsi melayani
// keduanya lewat `jenis`: 'nilai' (AuditLog, setiap perubahan satu nilai) dan 'aktivitas' (LogAktivitas,
// tindakan admin). Yang dikembalikan satu halaman saja, bukan seluruh tabel. Tabel ini hanya dibaca.

export const AKSI_LOG = ['KUNCI_ANGKATAN', 'UBAH_DATA_TERKUNCI', 'ROLLBACK_DATA_TERKUNCI', 'UBAH_PENGUNCIAN']

const UKURAN_BAWAAN = 25
const UKURAN_MAKS = 100
const URUT = [{ waktu: 'desc' }, { id: 'desc' }]

/**
 * Rentang waktu dari tanggal 'YYYY-MM-DD' menurut WIB. Basis data menyimpan UTC, jadi tanggal WIB diubah
 * dulu ke batasnya yang tepat; tanpa itu log di sekitar tengah malam bergeser sehari. `sampai` ikut
 * dihitung penuh (sampai akhir harinya).
 */
function rentangWaktu(dari, sampai) {
  const WIB_HARI = /^\d{4}-\d{2}-\d{2}$/
  const awalHari = (tgl, label) => {
    if (!WIB_HARI.test(tgl)) throw new GalatApi('Tanggal ' + label + ' harus berbentuk TTTT-BB-HH.')
    // JavaScript menggeser tanggal yang tidak ada (31 Februari menjadi 3 Maret) alih-alih menolaknya,
    // jadi hari dan bulan dicocokkan ulang setelah dibentuk.
    const [t, b, h] = tgl.split('-').map(Number)
    const cek = new Date(Date.UTC(t, b - 1, h))
    if (cek.getUTCFullYear() !== t || cek.getUTCMonth() !== b - 1 || cek.getUTCDate() !== h) {
      throw new GalatApi('Tanggal ' + label + ' tidak valid.')
    }
    return new Date(tgl + 'T00:00:00+07:00')
  }
  const batas = {}
  if (dari) batas.gte = awalHari(String(dari), 'awal')
  if (sampai) batas.lt = new Date(awalHari(String(sampai), 'akhir').getTime() + 24 * 60 * 60 * 1000)
  if (batas.gte && batas.lt && batas.gte >= batas.lt) throw new GalatApi('Tanggal awal tidak boleh sesudah tanggal akhir.')
  return Object.keys(batas).length ? batas : undefined
}

const bulat = (nilai, bawaan, min, maks) => {
  if (nilai == null || nilai === '') return bawaan
  const n = Number(nilai)
  if (!Number.isInteger(n)) throw new GalatApi('Nomor halaman dan ukuran halaman harus bilangan bulat.')
  return Math.min(maks, Math.max(min, n))
}

/** Pelaku yang pernah tercatat di tabel itu, bahan pilihan penyaring di layar. */
async function daftarAktor(tabel) {
  const baris = await tabel.groupBy({ by: ['aktorId'] })
  const nama = await petaNama(baris.map((b) => b.aktorId))
  return baris.map((b) => ({ id: b.aktorId, nama: nama.get(b.aktorId) ?? 'Pengguna #' + b.aktorId })).sort((a, b) => a.nama.localeCompare(b.nama))
}

/**
 * Satu halaman log. Filter (semuanya opsional): `aktorId`, `dari`/`sampai` (TTTT-BB-HH, WIB), dan
 *   jenis 'nilai'     → `nim` (persis)
 *   jenis 'aktivitas' → `aksi` (salah satu AKSI_LOG)
 * Jejak dari batch yang DIBATALKAN tetap ditampilkan dan diberi tanda `dibatalkan`: log yang menghilangkan
 * jejaknya sendiri tidak berguna sebagai bukti.
 */
export async function bacaLog(pengguna, { jenis = 'nilai', halaman, ukuran, aktorId, dari, sampai, nim, aksi } = {}) {
  if (jenis !== 'nilai' && jenis !== 'aktivitas') throw new GalatApi('Jenis log harus "nilai" atau "aktivitas".')
  const noHalaman = bulat(halaman, 1, 1, Number.MAX_SAFE_INTEGER)
  const isi = bulat(ukuran, UKURAN_BAWAAN, 1, UKURAN_MAKS)

  const where = {}
  const waktu = rentangWaktu(dari, sampai)
  if (waktu) where.waktu = waktu
  if (aktorId != null && aktorId !== '') {
    if (!Number.isInteger(Number(aktorId))) throw new GalatApi('Pelaku tidak valid.')
    where.aktorId = Number(aktorId)
  }
  const halamanKe = { skip: (noHalaman - 1) * isi, take: isi }

  if (jenis === 'aktivitas') {
    if (aksi) {
      if (!AKSI_LOG.includes(aksi)) throw new GalatApi('Jenis aksi tidak dikenal.')
      where.aksi = aksi
    }
    const [baris, total, aktor] = await Promise.all([
      db.logAktivitas.findMany({ where, orderBy: URUT, ...halamanKe }),
      db.logAktivitas.count({ where }),
      daftarAktor(db.logAktivitas),
    ])
    const nama = await petaNama(baris.map((b) => b.aktorId))
    return {
      jenis,
      halaman: noHalaman,
      ukuran: isi,
      total,
      jumlahHalaman: Math.max(1, Math.ceil(total / isi)),
      pilihanAksi: AKSI_LOG,
      pilihanAktor: aktor,
      baris: baris.map((b) => ({
        id: 'A-' + b.id,
        waktu: waktuWib(b.waktu),
        aktor: nama.get(b.aktorId) ?? null,
        aksi: b.aksi,
        target: b.target,
        rincian: b.rincian ?? null,
      })),
    }
  }

  // jenis 'nilai': AuditLog tidak punya relasi ke mahasiswa, jadi NIM diterjemahkan ke id lebih dulu.
  if (nim) {
    const m = await db.mahasiswa.findUnique({ where: { nim: String(nim).trim() }, select: { id: true } })
    where.mahasiswaId = m ? m.id : -1 // NIM tidak dikenal: hasilnya kosong, bukan semua
  }
  const [baris, total, aktor] = await Promise.all([
    db.auditLog.findMany({ where, include: { batch: { select: { status: true } } }, orderBy: URUT, ...halamanKe }),
    db.auditLog.count({ where }),
    daftarAktor(db.auditLog),
  ])
  const mhs = await db.mahasiswa.findMany({
    where: { id: { in: [...new Set(baris.map((b) => b.mahasiswaId))] } },
    select: { id: true, nim: true, nama: true },
  })
  const mhsDariId = new Map(mhs.map((m) => [m.id, m]))
  const nama = await petaNama(baris.map((b) => b.aktorId))
  return {
    jenis,
    halaman: noHalaman,
    ukuran: isi,
    total,
    jumlahHalaman: Math.max(1, Math.ceil(total / isi)),
    pilihanAktor: aktor,
    baris: baris.map((b) => {
      const m = mhsDariId.get(b.mahasiswaId)
      const komponen = getKomponenById(b.komponenId)
      return {
        id: 'L-' + b.id,
        waktu: waktuWib(b.waktu),
        aktor: nama.get(b.aktorId) ?? null,
        nim: m?.nim ?? '',
        nama: m?.nama ?? '',
        aspek: komponen?.aspekId ?? null,
        komponen: b.komponenId,
        nilaiLama: b.nilaiLama,
        nilaiBaru: b.nilaiBaru,
        sumber: komponen?.sumber ?? null,
        batchId: b.batchId,
        dibatalkan: b.batch?.status === 'DIBATALKAN',
      }
    }),
  }
}
