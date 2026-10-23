import { db } from './db.js'
import { ambilKurikulum, ambilPeriode } from './kurikulum.js'

/* --------------------------------------------------------------------------
   Data master dari basis data — angkatan, fakultas, dan program studi —
   dalam bentuk yang sama dengan MASTER_AWAL di src/lib/data.js, supaya
   isiMaster() tidak perlu tahu dari mana datanya. Kurikulum ikut dibawa
   (null = belum di-seed, isi dari kode yang dipakai).

   Dibaca app/layout.jsx setiap halaman dimuat. Data ini bukan data pribadi,
   jadi tidak perlu sesi untuk membacanya.
   -------------------------------------------------------------------------- */

/**
 * Angkatan, fakultas, dan prodi saja, tanpa kurikulum dan periode. Dipakai juga jawaban pintu data master
 * (src/server/dataMaster.js), supaya layar langsung memasang isi terbaru lewat isiMaster() tanpa memuat ulang.
 */
export async function ambilAngkatanProdi() {
  const [angkatan, fakultas] = await Promise.all([
    db.angkatan.findMany(),
    db.fakultas.findMany({ orderBy: { id: 'asc' }, include: { prodi: { orderBy: { id: 'asc' } } } }),
  ])
  return {
    angkatan: angkatan.map((a) => ({
      id: a.id,
      angkatan: a.tahun,
      label: a.label,
      intake: { tahun: a.periodeTahun, semester: a.periodeSemester === 'GENAP' ? 'Genap' : 'Ganjil' },
      status: a.status === 'TERKUNCI' ? 'terkunci' : 'aktif',
    })),
    fakultas: fakultas.map((f) => ({
      name: f.nama,
      programs: f.prodi.map((p) => ({ nama: p.nama, jenjang: p.jenjang })),
    })),
  }
}

export async function ambilMaster() {
  const [dasar, kurikulum, periode] = await Promise.all([
    ambilAngkatanProdi(),
    // Kurikulum yang gagal dibaca tidak ikut menggagalkan angkatan dan prodi.
    ambilKurikulum().catch((e) => {
      console.warn('Kurikulum dibaca dari kode karena basis data tidak bisa dibaca:', e.message)
      return null
    }),
    // null = belum disimpan atau gagal dibaca: periode dari kode yang dipakai.
    ambilPeriode().catch((e) => {
      console.warn('Periode aktif dibaca dari kode karena basis data tidak bisa dibaca:', e.message)
      return null
    }),
  ])

  return { ...dasar, kurikulum, periode }
}
