import { db } from './db.js'
import { getKomponenById } from '../lib/curriculum.js'
import { komponenDosen, labelPeriode, periodeAngkatan, turunkanSemesterAktif } from '../lib/data.js'

// Menyusun data halaman dari basis data, dalam bentuk yang dibaca isiData() di src/lib/data.js.
// Isinya disaring per peran: admin melihat semuanya, dosen hanya kelasnya, mahasiswa hanya dirinya.

const WIB = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 'YYYY-MM-DD HH:MM' dalam WIB. */
export const waktuWib = (d) => (d ? WIB.format(d).replace(',', '').slice(0, 16) : null)
export const tanggalWib = (d) => (d ? waktuWib(d).slice(0, 10) : null)

export const intakeDari = (a) => ({ tahun: a.periodeTahun, semester: a.periodeSemester === 'GENAP' ? 'Genap' : 'Ganjil' })
export const semesterDari = (a) => turunkanSemesterAktif(intakeDari(a))

/** Angka di balik id tampilan seperti 'K-12' atau 'U-3'. */
export const angkaId = (id) => Number(String(id ?? '').replace(/^[A-Z]+-/, '')) || 0

const kecil = (s) => String(s ?? '').toLowerCase()

const JUDUL_BERKAS = {
  TUGAS: 'Laporan tugas',
  SIKAP: 'Lembar refleksi sikap',
  UTS: 'Berkas UTS',
  UAS: 'Berkas UAS',
}

// Nama yang tampil untuk seorang pengguna. Akun Kemahasiswaan tidak punya nama orang.
export async function petaNama(ids) {
  const unik = [...new Set(ids.filter((x) => x != null))]
  if (!unik.length) return new Map()
  const daftar = await db.pengguna.findMany({ where: { id: { in: unik } }, include: { dosen: true, mahasiswa: true } })
  return new Map(daftar.map((p) => [p.id, p.dosen?.nama ?? p.mahasiswa?.nama ?? 'Biro Kemahasiswaan']))
}

export const SERTA_MAHASISWA = {
  prodi: { include: { fakultas: true } },
  angkatan: true,
  pengguna: { select: { email: true } },
  nilai: true,
  penguncian: true,
}

/** Satu mahasiswa dalam bentuk yang dibaca halaman dan aturan penilaian. */
export function susunMahasiswa(m, nama = new Map(), { komponenBoleh = null, denganEmail = true } = {}) {
  const nilai = {}
  for (const n of m.nilai ?? []) {
    if (komponenBoleh && !komponenBoleh.has(n.komponenId)) continue
    const k = getKomponenById(n.komponenId)
    if (!k) continue
    ;(nilai[k.aspekId] ??= { komponen: {} }).komponen[n.komponenId] = {
      nilai: n.nilai,
      penilai: nama.get(n.penilaiId) ?? null,
      tanggal: tanggalWib(n.diperbarui),
      batchId: n.batchId,
    }
  }

  const penguncian = {}
  for (const p of m.penguncian ?? []) {
    penguncian[p.aspekId] = {
      status: p.status === 'FINAL' ? 'final' : 'sementara',
      oleh: nama.get(p.olehId) ?? null,
      tanggal: tanggalWib(p.waktu),
    }
  }

  return {
    id: String(m.id),
    nim: m.nim,
    name: m.nama,
    email: denganEmail ? (m.pengguna?.email ?? '') : '',
    program: m.prodi.nama,
    faculty: m.prodi.fakultas.nama,
    jenjang: m.prodi.jenjang,
    angkatan: m.angkatan.tahun,
    angkatanId: m.angkatanId,
    angkatanLabel: m.angkatan.label,
    semesterAktif: semesterDari(m.angkatan),
    statusAngkatan: m.angkatan.status === 'TERKUNCI' ? 'terkunci' : 'aktif',
    periode: periodeAngkatan(intakeDari(m.angkatan)),
    nilai,
    penguncian,
  }
}

const idPengguna = (mhs) => mhs.flatMap((m) => [...m.nilai.map((n) => n.penilaiId), ...m.penguncian.map((p) => p.olehId)])

function susunKoreksi(k, nama) {
  const komponen = getKomponenById(k.komponenId)
  return {
    id: 'K-' + k.id,
    nim: k.mahasiswa.nim,
    nama: k.mahasiswa.nama,
    komponenId: k.komponenId,
    komponenLabel: komponen?.label ?? k.komponenId,
    aspekId: komponen?.aspekId ?? null,
    alasan: k.alasan,
    nilaiDiharapkan: k.nilaiDiharapkan,
    status: kecil(k.status),
    diajukan: tanggalWib(k.diajukan),
    keputusan: k.diputuskanOleh
      ? { oleh: nama.get(k.diputuskanOleh) ?? null, tanggal: tanggalWib(k.diputuskanPada), catatan: k.catatan ?? '' }
      : null,
  }
}

function susunPengumpulan(p, dosen) {
  const komponen = getKomponenById(p.komponenId)
  const m = p.mahasiswa
  return {
    id: 'PG-' + p.id,
    nim: m.nim,
    nama: m.nama,
    program: m.prodi.nama,
    fakultas: m.prodi.fakultas.nama,
    angkatanId: m.angkatanId,
    angkatanLabel: m.angkatan.label,
    semester: dosen?.semester ?? null,
    sumber: dosen?.sumber ?? null,
    dosenNip: dosen?.nip ?? null,
    komponenId: p.komponenId,
    komponenLabel: komponen?.label ?? p.komponenId,
    aspekId: komponen?.aspekId ?? null,
    jenisBerkas: JUDUL_BERKAS[komponen?.jenis] ?? 'Berkas pengumpulan',
    bentuk: p.bentuk,
    berkas: p.berkas,
    waktu: waktuWib(p.waktu),
    terlambat: p.terlambat,
  }
}

function susunUsulan(u, dosen, mhsDariNim, nama) {
  const angkatan = [...new Set(u.entri.map((e) => mhsDariNim.get(e.nim)?.angkatanId).filter(Boolean))]
  const ditolakSistem = Array.isArray(u.ditolakSistem) ? u.ditolakSistem : undefined
  return {
    id: 'U-' + u.id,
    dosenNip: dosen?.nip ?? null,
    dosenNama: dosen?.nama ?? '',
    sumber: dosen?.sumber ?? null,
    semester: dosen?.semester ?? null,
    prodi: dosen?.prodi?.nama ?? null,
    angkatanId: angkatan.length === 1 ? angkatan[0] : 'campuran',
    cara: u.cara,
    catatan: u.catatan ?? '',
    waktu: waktuWib(u.waktu),
    status: kecil(u.status),
    entri: u.entri.map((e) => ({
      nim: e.nim,
      nama: mhsDariNim.get(e.nim)?.nama ?? e.nim,
      komponenId: e.komponenId,
      nilai: e.nilai,
    })),
    keputusan: u.diputuskanOleh
      ? { oleh: nama.get(u.diputuskanOleh) ?? null, tanggal: tanggalWib(u.diputuskanPada), catatan: u.catatanKeputusan ?? '' }
      : null,
    batchId: u.batchId,
    ditolakSistem,
    jumlahDitulis: u.status === 'DISETUJUI' ? u.entri.length - (ditolakSistem?.length ?? 0) : undefined,
  }
}

async function muatUsulan(where) {
  const daftar = await db.usulan.findMany({ where, include: { entri: true }, orderBy: [{ waktu: 'desc' }, { id: 'desc' }] })
  const dosen = await db.dosen.findMany({
    where: { id: { in: [...new Set(daftar.map((u) => u.dosenId))] } },
    include: { prodi: true },
  })
  const dosenDariId = new Map(dosen.map((d) => [d.id, d]))
  const mhs = await db.mahasiswa.findMany({
    where: { nim: { in: [...new Set(daftar.flatMap((u) => u.entri.map((e) => e.nim)))] } },
    select: { nim: true, nama: true, angkatanId: true },
  })
  const mhsDariNim = new Map(mhs.map((m) => [m.nim, m]))
  const nama = await petaNama(daftar.map((u) => u.diputuskanOleh))
  return daftar.map((u) => susunUsulan(u, dosenDariId.get(u.dosenId), mhsDariNim, nama))
}

const SERTA_PENGUMPULAN = { mahasiswa: { include: { prodi: { include: { fakultas: true } }, angkatan: true } } }

async function muatPengumpulan(where) {
  const daftar = await db.pengumpulan.findMany({ where, include: SERTA_PENGUMPULAN, orderBy: [{ waktu: 'desc' }, { id: 'desc' }] })
  const dosen = await db.dosen.findMany({ where: { id: { in: [...new Set(daftar.map((p) => p.dosenId))] } } })
  const dosenDariId = new Map(dosen.map((d) => [d.id, d]))
  return daftar.map((p) => susunPengumpulan(p, dosenDariId.get(p.dosenId)))
}

async function muatProfil(penggunaId) {
  const p = await db.profil.findUnique({ where: { penggunaId } })
  return p ? { telepon: p.telepon ?? '', ponsel: p.ponsel ?? '', alamat: p.alamat ?? '', foto: p.foto, fotoSumber: p.fotoSumber } : null
}

/** Seluruh data yang boleh dilihat `pengguna` (hasil penggunaDari di api.js). */
export async function muatData(pengguna) {
  const hasil = {
    peran: pengguna.peran,
    nim: pengguna.mahasiswa?.nim ?? null,
    nip: pengguna.dosen?.nip ?? null,
    mahasiswa: [],
    audit: [],
    koreksi: [],
    pengumpulan: [],
    usulan: [],
    batch: [],
    batchImport: [],
    profil: await muatProfil(pengguna.id),
  }

  if (pengguna.peran === 'student') {
    const m = await db.mahasiswa.findUnique({ where: { id: pengguna.mahasiswa.id }, include: SERTA_MAHASISWA })
    const koreksi = await db.pengajuanKoreksi.findMany({
      where: { mahasiswaId: m.id },
      include: { mahasiswa: true },
      orderBy: [{ diajukan: 'desc' }, { id: 'desc' }],
    })
    const nama = await petaNama([...idPengguna([m]), ...koreksi.map((k) => k.diputuskanOleh)])
    hasil.mahasiswa = [susunMahasiswa(m, nama)]
    hasil.koreksi = koreksi.map((k) => susunKoreksi(k, nama))
    return hasil
  }

  if (pengguna.peran === 'dosen') {
    const dosen = pengguna.dosen
    const komponenBoleh = new Set(komponenDosen(dosen).map((k) => k.id))
    const mhs = (await db.mahasiswa.findMany({ where: { prodiId: dosen.prodiId }, include: SERTA_MAHASISWA, orderBy: { nim: 'asc' } }))
      .filter((m) => semesterDari(m.angkatan) >= dosen.semester)
    const nama = await petaNama(idPengguna(mhs))
    hasil.mahasiswa = mhs.map((m) => susunMahasiswa(m, nama, { komponenBoleh, denganEmail: false }))
    hasil.pengumpulan = await muatPengumpulan({ dosenId: dosen.id })
    hasil.usulan = await muatUsulan({ dosenId: dosen.id })
    return hasil
  }

  // Kemahasiswaan.
  const [mhs, audit, koreksi, batch, angkatan] = await Promise.all([
    db.mahasiswa.findMany({ include: SERTA_MAHASISWA, orderBy: { nim: 'asc' } }),
    db.auditLog.findMany({ include: { batch: { select: { status: true } } }, orderBy: [{ waktu: 'desc' }, { id: 'desc' }] }),
    db.pengajuanKoreksi.findMany({ include: { mahasiswa: true }, orderBy: [{ diajukan: 'desc' }, { id: 'desc' }] }),
    db.batch.findMany({ include: { _count: { select: { audit: true } } }, orderBy: [{ waktu: 'desc' }, { id: 'desc' }] }),
    db.angkatan.findMany(),
  ])
  const nama = await petaNama([
    ...idPengguna(mhs),
    ...audit.map((a) => a.aktorId),
    ...koreksi.map((k) => k.diputuskanOleh),
    ...batch.map((b) => b.aktorId),
  ])
  const mhsDariId = new Map(mhs.map((m) => [m.id, m]))
  const angkatanDariId = new Map(angkatan.map((a) => [a.id, a]))

  hasil.mahasiswa = mhs.map((m) => susunMahasiswa(m, nama))

  // Jejak batch yang dibatalkan tidak ikut ditampilkan, sama seperti saat perubahan masih disimpan di peramban.
  hasil.audit = audit
    .filter((a) => a.batch?.status !== 'DIBATALKAN')
    .map((a) => {
      const m = mhsDariId.get(a.mahasiswaId)
      const komponen = getKomponenById(a.komponenId)
      return {
        id: 'L-' + a.id,
        waktu: waktuWib(a.waktu),
        aktor: nama.get(a.aktorId) ?? null,
        nim: m?.nim ?? '',
        nama: m?.nama ?? '',
        aspek: komponen?.aspekId ?? null,
        komponen: a.komponenId,
        nilaiLama: a.nilaiLama,
        nilaiBaru: a.nilaiBaru,
        sumber: komponen?.sumber ?? null,
        batchId: a.batchId,
      }
    })

  hasil.koreksi = koreksi.map((k) => susunKoreksi(k, nama))
  hasil.pengumpulan = await muatPengumpulan({})
  hasil.usulan = await muatUsulan({})

  for (const b of batch) {
    if (b.status === 'DIKUNCI') {
      const a = angkatanDariId.get(b.angkatanId)
      hasil.batchImport.push({
        id: b.id,
        sumber: b.sumber,
        angkatanId: b.angkatanId,
        periode: a ? labelPeriode(periodeAngkatan(intakeDari(a))[b.semester - 1]) : '-',
        waktu: waktuWib(b.waktu),
        aktor: nama.get(b.aktorId) ?? null,
        baris: b._count.audit,
        ditolak: 0,
        status: 'dikunci',
      })
    } else {
      hasil.batch.push({
        id: b.id,
        sumber: b.sumber,
        semester: b.semester,
        angkatanId: b.angkatanId,
        aktor: nama.get(b.aktorId) ?? null,
        cara: b.cara,
        waktu: waktuWib(b.waktu),
        status: kecil(b.status),
        jumlah: b._count.audit,
      })
    }
  }

  return hasil
}
