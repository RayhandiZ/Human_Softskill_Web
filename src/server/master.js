import { db } from './db.js'

/* --------------------------------------------------------------------------
   Data master dari basis data — angkatan, fakultas, dan program studi —
   dalam bentuk yang sama dengan MASTER_AWAL di src/lib/data.js, supaya
   isiMaster() tidak perlu tahu dari mana datanya.

   Dibaca app/layout.jsx setiap halaman dimuat. Data ini bukan data pribadi,
   jadi tidak perlu sesi untuk membacanya.
   -------------------------------------------------------------------------- */

export async function ambilMaster() {
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
