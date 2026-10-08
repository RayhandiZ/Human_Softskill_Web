/* --------------------------------------------------------------------------
   Isi dasar basis data: data master dan akun awal.

   Aman dijalankan berulang kali — tidak ada yang dihapus atau ditimpa:
   - angkatan, fakultas, dan prodi hanya ditanam bila tabelnya masih kosong.
     Setelah itu basis datalah sumbernya (halaman membacanya dari sana), jadi
     perubahan di basis data tidak boleh dikembalikan ke isi kode;
   - komponen asesmen disamakan dengan curriculum.js, karena kurikulum masih
     dibaca halaman dari kode;
   - akun hanya dibuat bila emailnya belum ada.

   Jalankan:  npm run db:seed
   Data contoh lengkap (290 mahasiswa beserta nilainya) ada di seed-contoh.js.
   -------------------------------------------------------------------------- */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { MASTER_AWAL } from '../src/lib/data.js'
import { KOMPONEN } from '../src/lib/curriculum.js'

const db = new PrismaClient()
const SANDI_AWAL = 'umn12345' // hanya untuk pengembangan

const AKUN_AWAL = [
  { email: 'admin@umn.ac.id', peran: 'ADMIN' },
  {
    email: 'rayhandi.zulmi@student.umn.ac.id',
    peran: 'MAHASISWA',
    mahasiswa: { nim: '00000103940', nama: 'Rayhandi Zulmi', prodi: 'Sistem Informasi', angkatanId: '2025B' },
  },
  {
    email: 'simon.petrus@lecturer.umn.ac.id',
    peran: 'DOSEN',
    dosen: {
      nip: '0312078801',
      nama: 'Simon Petrus Wenehenubun, S.S., M.M.',
      jabatan: 'Dosen MK Humaniora',
      sumber: 'MK',
      semester: 1,
      prodi: 'Sistem Informasi',
    },
  },
]

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed ini membuat akun dengan kata sandi bawaan. Jangan dijalankan di produksi.')
  }

  /* 1. Fakultas dan program studi — hanya bila belum ada satu pun. */
  if (await db.fakultas.count()) {
    console.log('Fakultas & prodi sudah ada, dilewati.')
  } else {
    for (const f of MASTER_AWAL.fakultas) {
      await db.fakultas.create({
        data: { nama: f.name, prodi: { create: f.programs.map((p) => ({ nama: p.nama, jenjang: p.jenjang })) } },
      })
    }
    console.log('Fakultas & prodi ditanam dari isi awal.')
  }
  const prodiId = Object.fromEntries((await db.programStudi.findMany()).map((p) => [p.nama, p.id]))

  /* 2. Angkatan — hanya bila belum ada satu pun. */
  if (await db.angkatan.count()) {
    console.log('Angkatan sudah ada, dilewati.')
  } else {
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
    console.log('Angkatan ditanam dari isi awal.')
  }
  const angkatanAda = new Set((await db.angkatan.findMany({ select: { id: true } })).map((a) => a.id))

  /* 3. Komponen asesmen, dari curriculum.js. */
  for (const k of KOMPONEN) {
    const isi = { aspekId: k.aspekId, sumber: k.sumber, label: k.label, jenis: k.jenis, resmi: k.status === 'resmi' }
    await db.komponen.upsert({ where: { id: k.id }, update: isi, create: { id: k.id, ...isi } })
  }

  /* 4. Akun awal. */
  const passwordHash = await bcrypt.hash(SANDI_AWAL, 10)
  for (const a of AKUN_AWAL) {
    if (await db.pengguna.findUnique({ where: { email: a.email } })) {
      console.log('Sudah ada, dilewati:', a.email)
      continue
    }
    const { mahasiswa: m, dosen: d } = a
    /* Data master bisa sudah diubah di basis data; akun yang rujukannya
       hilang dilewati dengan alasan, bukan membuat seed gagal di tengah jalan. */
    const kurang = [
      (m || d) && !prodiId[(m ?? d).prodi] && 'prodi ' + (m ?? d).prodi,
      m && !angkatanAda.has(m.angkatanId) && 'angkatan ' + m.angkatanId,
    ].filter(Boolean)
    if (kurang.length) {
      console.log('Dilewati, ' + kurang.join(' dan ') + ' tidak ada di basis data:', a.email)
      continue
    }
    await db.pengguna.create({
      data: {
        email: a.email,
        passwordHash,
        peran: a.peran,
        mahasiswa: m
          ? { create: { nim: m.nim, nama: m.nama, prodiId: prodiId[m.prodi], angkatanId: m.angkatanId } }
          : undefined,
        dosen: d
          ? {
              create: {
                nip: d.nip,
                nama: d.nama,
                jabatan: d.jabatan,
                sumber: d.sumber,
                semester: d.semester,
                prodiId: prodiId[d.prodi],
              },
            }
          : undefined,
      },
    })
    console.log('Dibuat:', a.email)
  }

  /* Ringkasan. */
  console.log({
    fakultas: await db.fakultas.count(),
    prodi: await db.programStudi.count(),
    angkatan: await db.angkatan.count(),
    komponen: await db.komponen.count(),
    pengguna: await db.pengguna.count(),
    mahasiswa: await db.mahasiswa.count(),
    dosen: await db.dosen.count(),
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
