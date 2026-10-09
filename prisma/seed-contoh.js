/* --------------------------------------------------------------------------
   Seed DATA CONTOH lengkap: 290 mahasiswa, 5 dosen, dan seluruh nilainya dari
   scripts/dataContoh.js. MENGHAPUS seluruh isi basis data lebih dulu.

   Jalankan:  npm run db:seed:contoh
   Untuk isi dasar tanpa data contoh, pakai seed.js (npm run db:seed).
   -------------------------------------------------------------------------- */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { MASTER_AWAL } from '../src/lib/data.js'
import { STUDENTS, DOSEN } from '../scripts/dataContoh.js'
import { tanamKurikulum } from './tanam-kurikulum.js'

const db = new PrismaClient()
const SANDI_AWAL = 'umn12345' // hanya untuk pengembangan

const potong = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed menghapus seluruh data. Jangan dijalankan di produksi.')
  }

  /* 0. Bersihkan: anak dulu, induk belakangan, supaya seed bisa diulang. */
  console.log('Membersihkan tabel…')
  await db.auditLog.deleteMany()
  await db.nilai.deleteMany()
  await db.batch.deleteMany()
  await db.penguncian.deleteMany()
  await db.pengajuanKoreksi.deleteMany()
  await db.pengumpulan.deleteMany()
  await db.usulanEntri.deleteMany()
  await db.usulan.deleteMany()
  await db.mahasiswa.deleteMany()
  await db.dosen.deleteMany()
  await db.profil.deleteMany()
  await db.pengguna.deleteMany()
  await db.programStudi.deleteMany()
  await db.fakultas.deleteMany()
  await db.angkatan.deleteMany()
  await db.komponen.deleteMany()
  await db.indikator.deleteMany()
  await db.konfigurasi.deleteMany()

  /* 1. Fakultas dan program studi. */
  for (const f of MASTER_AWAL.fakultas) {
    await db.fakultas.create({
      data: {
        nama: f.name,
        prodi: { create: f.programs.map((p) => ({ nama: p.nama, jenjang: p.jenjang })) },
      },
    })
  }
  const prodiId = Object.fromEntries((await db.programStudi.findMany()).map((p) => [p.nama, p.id]))

  /* 2. Angkatan. */
  await db.angkatan.createMany({
    data: MASTER_AWAL.angkatan.map((c) => ({
      id: c.id,
      tahun: c.angkatan,
      label: c.label,
      periodeTahun: c.intake.tahun,
      periodeSemester: c.intake.semester === 'Ganjil' ? 'GANJIL' : 'GENAP',
      status: c.status === 'terkunci' ? 'TERKUNCI' : 'AKTIF',
    })),
  })

  /* 3. Kurikulum (komponen dan indikator) dari curriculum.js, beserta penanda VERSI_KURIKULUM. */
  await tanamKurikulum(db)

  /* 4. Akun: satu admin, semua dosen, semua mahasiswa. Satu hash dipakai ulang. */
  const passwordHash = await bcrypt.hash(SANDI_AWAL, 10)
  await db.pengguna.createMany({
    data: [
      { email: 'admin@umn.ac.id', passwordHash, peran: 'ADMIN' },
      ...DOSEN.map((d) => ({ email: d.email, passwordHash, peran: 'DOSEN' })),
      ...STUDENTS.map((s) => ({ email: s.email, passwordHash, peran: 'MAHASISWA' })),
    ],
  })
  const penggunaId = Object.fromEntries((await db.pengguna.findMany()).map((p) => [p.email, p.id]))
  const adminId = penggunaId['admin@umn.ac.id']

  /* 5. Dosen dan mahasiswa. */
  await db.dosen.createMany({
    data: DOSEN.map((d) => ({
      nip: d.nip,
      nama: d.nama,
      jabatan: d.jabatan,
      sumber: d.sumber,
      semester: d.semester,
      penggunaId: penggunaId[d.email],
      prodiId: prodiId[d.prodi],
    })),
  })
  await db.mahasiswa.createMany({
    data: STUDENTS.map((s) => ({
      nim: s.nim,
      nama: s.name,
      penggunaId: penggunaId[s.email],
      prodiId: prodiId[s.program],
      angkatanId: s.angkatanId,
    })),
  })
  const mahasiswaId = Object.fromEntries((await db.mahasiswa.findMany()).map((m) => [m.nim, m.id]))

  /* 6. Nilai. Hanya komponen yang benar-benar terisi; sel kosong tidak dibuatkan baris. */
  const baris = []
  for (const s of STUDENTS) {
    for (const isi of Object.values(s.nilai)) {
      for (const [komponenId, e] of Object.entries(isi.komponen)) {
        baris.push({
          mahasiswaId: mahasiswaId[s.nim],
          komponenId,
          nilai: e.nilai,
          penilaiId: adminId,
          diperbarui: new Date(e.tanggal),
        })
      }
    }
  }
  for (const bagian of potong(baris, 1000)) await db.nilai.createMany({ data: bagian })

  /* Ringkasan. */
  console.log({
    fakultas: await db.fakultas.count(),
    prodi: await db.programStudi.count(),
    angkatan: await db.angkatan.count(),
    komponen: await db.komponen.count(),
    indikator: await db.indikator.count(),
    pengguna: await db.pengguna.count(),
    dosen: await db.dosen.count(),
    mahasiswa: await db.mahasiswa.count(),
    nilai: await db.nilai.count(),
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
