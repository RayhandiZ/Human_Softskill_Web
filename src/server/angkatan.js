import { db } from './db.js'
import { GalatApi } from './api.js'
import { catatLog } from './log.js'
import { SERTA_MAHASISWA, intakeDari, susunMahasiswa } from './muat.js'
import { CONFIG } from '../lib/config.js'
import { semesterKalender } from '../lib/data.js'
import { pratinjauPenguncian } from '../lib/rules.js'

// Penguncian angkatan: pratinjau dulu, lalu kunci dengan konfirmasi ketik. Mengunci angkatan TIDAK
// menutup pintu bagi admin: sesudah terkunci, nilai tetap bisa diubah atau dilengkapi (termasuk sel yang
// bolong sesudah semester 3), tetapi wajib disertai alasan dan tercatat (lihat wajibkanAlasan di nilai.js).
// Yang berubah oleh penguncian: angkatan memenuhi syarat sertifikat (R5), dan perubahan sesudahnya berjejak.

const TRANSAKSI = { timeout: 30000, maxWait: 10000 }
const BATAS_DAFTAR = 50

async function ambilAngkatan(id) {
  const a = await db.angkatan.findUnique({ where: { id: String(id ?? '') } })
  if (!a) throw new GalatApi('Angkatan tidak dikenal.', 404)
  return a
}

/** Alasan angkatan belum boleh dikunci, atau null bila boleh. Nilai yang bolong TIDAK menghalangi. */
function alasanBelumBoleh(a, kalender, jumlahMahasiswa) {
  if (a.status === 'TERKUNCI') return 'Angkatan ini sudah dikunci.'
  if (kalender <= CONFIG.TOTAL_SEMESTER_PROGRAM) {
    return (
      'Angkatan ' + a.label + ' baru di semester ' + kalender + ' dari ' + CONFIG.TOTAL_SEMESTER_PROGRAM +
      '. Penguncian baru bisa dilakukan setelah semester ' + CONFIG.TOTAL_SEMESTER_PROGRAM + ' berakhir.'
    )
  }
  if (!jumlahMahasiswa) return 'Angkatan ini belum punya mahasiswa.'
  return null
}

/**
 * Ringkasan sebelum mengunci: berapa yang berhak sertifikat, berapa yang tidak (beserta alasannya),
 * dan apakah angkatan boleh dikunci. Yang dikembalikan ringkasan, bukan transkrip lengkap.
 */
export async function pratinjau(pengguna, { angkatanId }) {
  const a = await ambilAngkatan(angkatanId)
  const mhs = await db.mahasiswa.findMany({
    where: { angkatanId: a.id },
    include: SERTA_MAHASISWA,
    orderBy: { nim: 'asc' },
  })
  const hasil = pratinjauPenguncian(mhs.map((m) => susunMahasiswa(m)))
  const kalender = semesterKalender(intakeDari(a))
  const alasanTidakBoleh = alasanBelumBoleh(a, kalender, mhs.length)

  return {
    angkatanId: a.id,
    label: a.label,
    status: a.status === 'TERKUNCI' ? 'terkunci' : 'aktif',
    semesterKalender: kalender,
    bolehDikunci: alasanTidakBoleh == null,
    alasanTidakBoleh,
    total: hasil.total,
    berhak: hasil.berhak,
    tidakBerhak: hasil.tidakBerhak,
    komponenKosong: hasil.komponenKosong,
    daftarTidakBerhak: hasil.daftarTidakBerhak.slice(0, BATAS_DAFTAR).map((x) => ({
      nim: x.mahasiswa.nim,
      nama: x.mahasiswa.name,
      alasan: x.kelayakan.alasanRingkas,
    })),
    sisaTidakBerhak: Math.max(0, hasil.tidakBerhak - BATAS_DAFTAR),
  }
}

/** Mengunci angkatan. `konfirmasi` harus sama persis dengan label angkatan. false bila sudah terkunci. */
export async function kunci(pengguna, { angkatanId, konfirmasi }) {
  const a = await ambilAngkatan(angkatanId)
  if (a.status === 'TERKUNCI') return { ok: false }
  if (String(konfirmasi ?? '').trim() !== a.label) {
    throw new GalatApi('Konfirmasi tidak cocok. Ketik persis: ' + a.label)
  }

  const p = await pratinjau(pengguna, { angkatanId: a.id })
  if (!p.bolehDikunci) throw new GalatApi(p.alasanTidakBoleh)

  return db.$transaction(async (tx) => {
    // Hanya yang masih AKTIF yang berubah: dua jendela yang mengunci bersamaan tidak saling timpa.
    const ubah = await tx.angkatan.updateMany({
      where: { id: a.id, status: 'AKTIF' },
      data: { status: 'TERKUNCI', dikunciOleh: pengguna.id, dikunciPada: new Date() },
    })
    if (ubah.count !== 1) return { ok: false }

    const ringkas = {
      total: p.total,
      berhak: p.berhak,
      tidakBerhak: p.tidakBerhak,
      komponenKosong: p.komponenKosong,
    }
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'KUNCI_ANGKATAN',
      target: 'angkatan ' + a.id,
      rincian: { label: a.label, semesterKalender: p.semesterKalender, ...ringkas },
    })
    return { ok: true, ...ringkas }
  }, TRANSAKSI)
}
