import { db } from './db.js'
import { GalatApi } from './api.js'
import { petaAkun, waktuWib } from './muat.js'
import { KOMPONEN_ARSIP, getAspek, getKomponenById } from '../lib/curriculum.js'

// Catatan setiap tindakan yang mengubah sesuatu, oleh peran apa pun: penyimpanan dan pembatalan batch nilai
// (rincian per nilainya tetap di AuditLog), kunci angkatan, perubahan data terkunci beserta alasannya, tanda
// penguncian aspek, bobot dan penilaian kurikulum, permintaan admin kepada super admin (diajukan, diputuskan,
// ditarik), akses dan izin akun, data master (angkatan, fakultas, prodi, mahasiswa), persetujuan dua lapis, serta
// tindakan mahasiswa dan pemilik akun (mengajukan koreksi, meminta akses cetak, mengubah profil).
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
// setiap tindakan). Yang dikembalikan satu halaman saja, bukan seluruh tabel. Tabel ini hanya dibaca.

export const AKSI_LOG = [
  'KUNCI_ANGKATAN',
  'UBAH_DATA_TERKUNCI',
  'ROLLBACK_DATA_TERKUNCI',
  'UBAH_PENGUNCIAN',
  'UBAH_BOBOT',
  'AJUKAN_PERSETUJUAN',
  'PUTUSKAN_PERSETUJUAN',
  'TARIK_PERMINTAAN',
  'UBAH_PENILAIAN',
  'UBAH_AKSES',
  'UBAH_PERIODE',
  'TAMBAH_AKUN',
  'UBAH_AKUN',
  'HAPUS_AKUN',
  // Kelas dosen (prodi, sumber, semester, angkatan yang diampu) dari Akses Pengguna (ubahKelasDosen di akses.js).
  'UBAH_KELAS_DOSEN',
  // Izin kelola data master (akses.js) dan perubahan data master oleh pemegangnya (dataMaster.js).
  'UBAH_IZIN',
  'TAMBAH_ANGKATAN',
  'UBAH_ANGKATAN',
  'TAMBAH_FAKULTAS',
  'UBAH_FAKULTAS',
  'TAMBAH_PRODI',
  'UBAH_PRODI',
  // Aspek CPMK itu sendiri (src/server/aspek.js).
  'TAMBAH_ASPEK',
  'UBAH_ASPEK',
  'ARSIPKAN_ASPEK',
  'PULIHKAN_ASPEK',
  // Persetujuan dua lapis (pengajuan.js, sertifikat.js): admin meneruskan, super admin menyetujui.
  'TERUSKAN_KOREKSI',
  'SETUJUI_KOREKSI',
  'TOLAK_KOREKSI',
  'SETUJUI_SERTIFIKAT',
  'TOLAK_SERTIFIKAT',
  // Sesudah disetujui: pencabutan oleh admin atau super admin, dan setiap kali sertifikat dibuka untuk dicetak.
  'CABUT_SERTIFIKAT',
  'CETAK_SERTIFIKAT',
  // Batch nilai yang tidak menyentuh data terkunci (yang menyentuh tercatat UBAH_DATA_TERKUNCI dan
  // ROLLBACK_DATA_TERKUNCI di atas): disimpan dari Input & Import Nilai atau unggahan dosen, atau dibatalkan.
  'SIMPAN_NILAI',
  'BATALKAN_BATCH',
  // Usulan nilai dosen yang lama, diputuskan super admin (putuskanUsulan di pengajuan.js).
  'SETUJUI_USULAN',
  'TOLAK_USULAN',
  // Tindakan mahasiswa dan pemilik akun sendiri.
  'AJUKAN_KOREKSI',
  'MINTA_SERTIFIKAT',
  'UBAH_PROFIL',
]

// Log yang bertarget 'batch <id>' dan menerangkan batch itu di tab Perubahan nilai: alasan perubahan data terkunci,
// dan siapa serta kapan batch-nya dibatalkan.
const LOG_ALASAN_BATCH = ['UBAH_DATA_TERKUNCI']
const LOG_BATAL_BATCH = ['BATALKAN_BATCH', 'ROLLBACK_DATA_TERKUNCI']

/** Komponen aktif atau yang sudah diarsipkan; jejak nilainya tetap ada walau komponennya diarsipkan. */
const cariKomponen = (id) => getKomponenById(id) ?? KOMPONEN_ARSIP.find((k) => k.id === id) ?? null

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

/** Pelaku yang pernah tercatat di tabel itu, bahan pilihan penyaring di layar; email membedakan admin yang bernama sama. */
async function daftarAktor(tabel) {
  const baris = await tabel.groupBy({ by: ['aktorId'] })
  const akun = await petaAkun(baris.map((b) => b.aktorId))
  return baris
    .map((b) => {
      const a = akun.get(b.aktorId)
      return { id: b.aktorId, nama: a?.nama ?? 'Pengguna #' + b.aktorId, peran: a?.peran ?? null, email: a?.email ?? null }
    })
    .sort((a, b) => a.nama.localeCompare(b.nama) || String(a.email).localeCompare(String(b.email)))
}

/** Siapa pelakunya, dalam bentuk yang sama di kedua jenis log: nama, peran (nilai basis data), dan email akunnya. */
const pelaku = (akun, id) => {
  const a = akun.get(id)
  return { aktor: a?.nama ?? null, aktorPeran: a?.peran ?? null, aktorEmail: a?.email ?? null }
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
    const akun = await petaAkun(baris.map((b) => b.aktorId))
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
        ...pelaku(akun, b.aktorId),
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
    db.auditLog.findMany({
      where,
      include: { batch: { select: { status: true, cara: true, semester: true } } },
      orderBy: URUT,
      ...halamanKe,
    }),
    db.auditLog.count({ where }),
    daftarAktor(db.auditLog),
  ])
  // Keterangan batch dari Log Aktivitas: alasan bila menyentuh data terkunci, dan siapa serta kapan membatalkannya.
  const targetBatch = [...new Set(baris.map((b) => b.batchId).filter(Boolean))].map((id) => 'batch ' + id)
  const [mhs, logBatch] = await Promise.all([
    db.mahasiswa.findMany({
      where: { id: { in: [...new Set(baris.map((b) => b.mahasiswaId))] } },
      select: { id: true, nim: true, nama: true },
    }),
    targetBatch.length
      ? db.logAktivitas.findMany({
          where: { target: { in: targetBatch }, aksi: { in: [...LOG_ALASAN_BATCH, ...LOG_BATAL_BATCH] } },
          orderBy: URUT,
        })
      : [],
  ])
  const mhsDariId = new Map(mhs.map((m) => [m.id, m]))
  const akun = await petaAkun([...baris.map((b) => b.aktorId), ...logBatch.map((l) => l.aktorId)])
  const alasanBatch = new Map()
  const batalBatch = new Map()
  for (const l of logBatch) {
    const id = l.target.slice('batch '.length)
    // Urutannya terbaru dulu, jadi yang pertama ditemui adalah catatan terakhir untuk batch itu.
    if (LOG_ALASAN_BATCH.includes(l.aksi) && !alasanBatch.has(id)) alasanBatch.set(id, l.rincian?.alasan ?? null)
    if (LOG_BATAL_BATCH.includes(l.aksi) && !batalBatch.has(id)) {
      batalBatch.set(id, { oleh: akun.get(l.aktorId)?.nama ?? null, waktu: waktuWib(l.waktu), alasan: l.rincian?.alasan ?? null })
    }
  }
  return {
    jenis,
    halaman: noHalaman,
    ukuran: isi,
    total,
    jumlahHalaman: Math.max(1, Math.ceil(total / isi)),
    pilihanAktor: aktor,
    baris: baris.map((b) => {
      const m = mhsDariId.get(b.mahasiswaId)
      const komponen = cariKomponen(b.komponenId)
      const aspek = komponen ? getAspek(komponen.aspekId) : null
      const dibatalkan = b.batch?.status === 'DIBATALKAN'
      return {
        id: 'L-' + b.id,
        waktu: waktuWib(b.waktu),
        ...pelaku(akun, b.aktorId),
        nim: m?.nim ?? '',
        nama: m?.nama ?? '',
        aspek: komponen?.aspekId ?? null,
        aspekKode: aspek?.kode ?? null,
        aspekNama: aspek?.nama ?? null,
        komponen: b.komponenId,
        komponenLabel: komponen?.label ?? null,
        nilaiLama: b.nilaiLama,
        nilaiBaru: b.nilaiBaru,
        sumber: komponen?.sumber ?? null,
        semester: b.batch?.semester ?? aspek?.semester ?? null,
        // manual | import | import-mentah | koreksi | unggah-dosen: dari mana nilainya masuk.
        cara: b.batch?.cara ?? null,
        batchId: b.batchId,
        alasan: b.batchId ? (alasanBatch.get(b.batchId) ?? null) : null,
        dibatalkan,
        // { oleh, waktu, alasan }; null bila batalnya terjadi sebelum pembatalan ikut dicatat.
        pembatalan: dibatalkan ? (batalBatch.get(b.batchId) ?? null) : null,
      }
    }),
  }
}
