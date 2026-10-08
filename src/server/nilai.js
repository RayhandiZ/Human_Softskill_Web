import { db } from './db.js'
import { GalatApi } from './api.js'
import { SERTA_MAHASISWA, semesterDari, susunMahasiswa, waktuWib } from './muat.js'
import { getAspek, getKomponenById } from '../lib/curriculum.js'
import { bolehTandaiFinal, validasiBatchImport } from '../lib/rules.js'
import { CONFIG } from '../lib/config.js'
import { catatLog } from './log.js'
import { randomBytes } from 'node:crypto'

// Penulisan nilai oleh Kemahasiswaan. Setiap penyimpanan menjadi satu batch: tercatat di
// AuditLog dan bisa dibatalkan utuh. Transaksi panjang diberi waktu lebih dari bawaan 5 detik
// supaya import ratusan baris tidak terputus di tengah.
const TRANSAKSI = { timeout: 30000, maxWait: 10000 }

const idBatch = () =>
  'B-' + waktuWib(new Date()).replace(/\D/g, '') + '-' + randomBytes(4).toString('hex').toUpperCase()

/* ------------------------- data yang terkunci untuk diedit ----------------------- */

/** Panjang minimum alasan saat admin mengubah data yang terkunci. */
export const ALASAN_MIN = 10

/**
 * Dari pasangan { mahasiswaId, aspekId }, mana yang "terkunci untuk diedit": angkatannya TERKUNCI,
 * atau aspeknya ditandai final MANUAL. Aspek yang final karena otomatis (nilainya lengkap) sengaja
 * tidak dihitung: itu akibat nilainya lengkap, bukan keputusan mengunci.
 */
export async function cariTerkunci(tx, pasangan) {
  const ids = [...new Set(pasangan.map((p) => p.mahasiswaId))]
  if (!ids.length) return []
  const mhs = await tx.mahasiswa.findMany({
    where: { id: { in: ids } },
    select: { id: true, angkatan: { select: { status: true } } },
  })
  const final = await tx.penguncian.findMany({
    where: { mahasiswaId: { in: ids }, status: 'FINAL' },
    select: { mahasiswaId: true, aspekId: true },
  })
  const angkatanTerkunci = new Set(mhs.filter((m) => m.angkatan.status === 'TERKUNCI').map((m) => m.id))
  const finalManual = new Set(final.map((f) => f.mahasiswaId + '|' + f.aspekId))
  return pasangan.filter(
    (p) => angkatanTerkunci.has(p.mahasiswaId) || finalManual.has(p.mahasiswaId + '|' + p.aspekId),
  )
}

/**
 * Admin boleh mengubah data terkunci, tetapi wajib menyebut alasannya. Mengembalikan null bila tidak ada
 * yang terkunci (tanpa alasan pun boleh), atau ringkasan untuk dicatat ke log bila ada.
 * `sebutan` = nama isian di layar pemanggil ('alasan', atau 'catatan keputusan' pada persetujuan usulan).
 */
export async function wajibkanAlasan(tx, pasangan, alasan, sebutan = 'alasan') {
  const terkunci = await cariTerkunci(tx, pasangan)
  if (!terkunci.length) return null
  const teks = String(alasan ?? '').trim()
  const mahasiswa = new Set(terkunci.map((p) => p.mahasiswaId)).size
  if (teks.length < ALASAN_MIN) {
    throw new GalatApi(
      'Perubahan ini menyentuh ' + mahasiswa + ' mahasiswa pada angkatan terkunci atau aspek final manual. ' +
        'Isi ' + sebutan + ' minimal ' + ALASAN_MIN + ' karakter.',
    )
  }
  return { alasan: teks, mahasiswa, baris: terkunci.length }
}

/** Peta NIM → mahasiswa dengan semester berjalannya, bahan pemeriksaan aturan. */
export async function petaMahasiswa(nims, tx = db) {
  const daftar = await tx.mahasiswa.findMany({
    where: { nim: { in: [...new Set(nims.map((n) => String(n ?? '').trim()))] } },
    include: { angkatan: true },
  })
  return new Map(
    daftar.map((m) => [
      m.nim,
      { id: m.id, nim: m.nim, name: m.nama, angkatanId: m.angkatanId, semesterAktif: semesterDari(m.angkatan) },
    ]),
  )
}

/** Menulis entri yang SUDAH diperiksa sebagai satu batch, di dalam transaksi `tx`. */
export async function tulisBatch(tx, { sumber, semester, angkatanId, cara, entri }, aktorId, peta) {
  const id = idBatch()
  await tx.batch.create({ data: { id, sumber, semester, angkatanId, aktorId, cara } })

  const jejak = []
  for (const e of entri) {
    const m = peta.get(e.nim)
    const kunci = { mahasiswaId_komponenId: { mahasiswaId: m.id, komponenId: e.komponenId } }
    const lama = await tx.nilai.findUnique({ where: kunci })
    await tx.nilai.upsert({
      where: kunci,
      update: { nilai: e.nilai, penilaiId: aktorId, batchId: id },
      create: { mahasiswaId: m.id, komponenId: e.komponenId, nilai: e.nilai, penilaiId: aktorId, batchId: id },
    })
    await tx.auditLog.create({
      data: { aktorId, mahasiswaId: m.id, komponenId: e.komponenId, nilaiLama: lama?.nilai ?? null, nilaiBaru: e.nilai, batchId: id },
    })
    jejak.push({
      nim: m.nim,
      nama: m.name,
      aspek: getKomponenById(e.komponenId).aspekId,
      komponen: e.komponenId,
      nilaiLama: lama?.nilai ?? null,
      nilaiBaru: e.nilai,
    })
  }
  return { id, jumlah: jejak.length, jejak }
}

export async function simpanBatch(pengguna, { sumber, semester, angkatanId, cara, entri, alasan }) {
  if (!['PDP', 'MK', 'ENGAGEMENT'].includes(sumber)) throw new GalatApi('Sumber penilaian tidak dikenal.')
  const sem = Number(semester)
  if (!Number.isInteger(sem) || sem < 1 || sem > CONFIG.TOTAL_SEMESTER_PROGRAM) throw new GalatApi('Semester tidak valid.')
  const daftar = Array.isArray(entri) ? entri : []
  if (!daftar.length) throw new GalatApi('Tidak ada nilai yang dikirim.')

  // Halaman sudah memeriksa setiap baris; pemeriksaan diulang di sini karena aturan yang hanya
  // dijaga antarmuka akan bocor pada pemanggil berikutnya. Satu baris salah menolak seluruh batch.
  const peta = await petaMahasiswa(daftar.map((e) => e.nim))
  const periksa = validasiBatchImport(
    daftar.map((e) => ({ nim: e.nim, komponen: e.komponenId, nilai: e.nilai })),
    { cariMahasiswa: (nim) => peta.get(nim) ?? null, sumber, semester: sem },
  )
  if (periksa.ditolak.length) {
    const x = periksa.ditolak[0]
    throw new GalatApi('Baris ' + (x.nim || '(tanpa NIM)') + ' ditolak: ' + x.alasan.join('; '))
  }

  const pasangan = periksa.diterima.map((x) => ({ mahasiswaId: peta.get(x.nim).id, aspekId: x.komponen.aspekId }))

  return db.$transaction(async (tx) => {
    // Admin boleh mengubah angkatan terkunci atau aspek final manual, asal menyebut alasannya.
    // Termasuk mengisi sel yang masih bolong sesudah semester 3.
    const terkunci = await wajibkanAlasan(tx, pasangan, alasan)

    const hasil = await tulisBatch(
      tx,
      {
        sumber,
        semester: sem,
        angkatanId: String(angkatanId ?? '-'),
        cara: String(cara ?? 'manual'),
        entri: periksa.diterima.map((x) => ({ nim: x.nim, komponenId: x.komponenId, nilai: x.nilai })),
      },
      pengguna.id,
      peta,
    )

    if (terkunci) {
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'UBAH_DATA_TERKUNCI',
        target: 'batch ' + hasil.id,
        rincian: { ...terkunci, cara: String(cara ?? 'manual'), jumlahNilai: hasil.jumlah },
      })
    }
    return hasil
  }, TRANSAKSI)
}

// Nilai satu sel diputar ulang dari riwayatnya: nilai sebelum perubahan pertama, lalu setiap batch
// yang tidak dibatalkan menurut urutan waktu — cara yang sama dengan pemutaran ulang di store.js,
// jadi membatalkan batch lama tidak pernah menghapus nilai dari batch sesudahnya.
async function hitungUlangSel(tx, mahasiswaId, komponenId) {
  const riwayat = await tx.auditLog.findMany({
    where: { mahasiswaId, komponenId },
    include: { batch: { select: { status: true } } },
    orderBy: [{ waktu: 'asc' }, { id: 'asc' }],
  })
  let nilai = riwayat[0]?.nilaiLama ?? null
  let terakhir = null
  for (const r of riwayat) {
    if (r.batch?.status === 'DIBATALKAN') continue
    nilai = r.nilaiBaru
    terakhir = r
  }

  const kunci = { mahasiswaId_komponenId: { mahasiswaId, komponenId } }
  const ada = await tx.nilai.findUnique({ where: kunci })
  if (nilai == null) {
    if (ada) await tx.nilai.delete({ where: kunci })
    return
  }
  const data = { nilai, penilaiId: terakhir?.aktorId ?? ada?.penilaiId ?? 0, batchId: terakhir?.batchId ?? null }
  if (ada) await tx.nilai.update({ where: kunci, data })
  else await tx.nilai.create({ data: { mahasiswaId, komponenId, ...data } })
}

export async function rollbackBatch(pengguna, { id, alasan }) {
  return db.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id: String(id ?? '') } })
    if (!batch || batch.status !== 'DIPROSES') return { ok: false }

    const sel = await tx.auditLog.findMany({ where: { batchId: batch.id }, select: { mahasiswaId: true, komponenId: true } })
    const unik = [...new Map(sel.map((s) => [s.mahasiswaId + '|' + s.komponenId, s])).values()]

    // Membatalkan batch juga mengubah nilai, jadi aturan data terkunci berlaku sama seperti saat menyimpan.
    const pasangan = unik.flatMap((s) => {
      const k = getKomponenById(s.komponenId)
      return k ? [{ mahasiswaId: s.mahasiswaId, aspekId: k.aspekId }] : []
    })
    const terkunci = await wajibkanAlasan(tx, pasangan, alasan)

    await tx.batch.update({ where: { id: batch.id }, data: { status: 'DIBATALKAN' } })
    for (const s of unik) await hitungUlangSel(tx, s.mahasiswaId, s.komponenId)

    if (terkunci) {
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'ROLLBACK_DATA_TERKUNCI',
        target: 'batch ' + batch.id,
        rincian: terkunci,
      })
    }
    return { ok: true }
  }, TRANSAKSI)
}

/**
 * Menandai aspek: status 'final', 'sementara', atau null (ikuti aturan sistem).
 * `daftar` berbentuk [{ nim, aspekId }].
 */
export async function setPenguncian(pengguna, { daftar, status }) {
  const tanda = status === 'final' ? 'FINAL' : status === 'sementara' ? 'SEMENTARA' : null
  if (status != null && !tanda) throw new GalatApi('Status penguncian tidak dikenal.')
  const pasangan = (Array.isArray(daftar) ? daftar : []).filter((p) => p?.nim && getAspek(p.aspekId))
  if (!pasangan.length) throw new GalatApi('Tidak ada aspek yang ditandai.')

  const mhs = await db.mahasiswa.findMany({
    where: { nim: { in: [...new Set(pasangan.map((p) => String(p.nim)))] } },
    include: SERTA_MAHASISWA,
  })
  const dariNim = new Map(mhs.map((m) => [m.nim, m]))
  for (const p of pasangan) {
    const m = dariNim.get(String(p.nim))
    if (!m) throw new GalatApi('NIM ' + p.nim + ' tidak dikenal.')
    // Aspek yang komponennya belum lengkap tidak pernah boleh dikunci, walau diminta.
    if (tanda === 'FINAL') {
      const cek = bolehTandaiFinal(susunMahasiswa(m), p.aspekId)
      if (!cek.boleh) throw new GalatApi(m.nama + ', aspek ' + getAspek(p.aspekId).kode + ': ' + cek.alasan)
    }
  }

  await db.$transaction(async (tx) => {
    // Status lama dibaca dulu supaya hanya perubahan yang sungguh terjadi yang dicatat.
    // (Layar Input Nilai memanggil ini dengan status null setelah tiap simpan; yang tidak berubah tidak dicatat.)
    const lama = await tx.penguncian.findMany({
      where: { mahasiswaId: { in: [...new Set(pasangan.map((p) => dariNim.get(String(p.nim)).id))] } },
      select: { mahasiswaId: true, aspekId: true, status: true },
    })
    const statusLama = new Map(lama.map((l) => [l.mahasiswaId + '|' + l.aspekId, l.status]))
    const berubah = []

    for (const p of pasangan) {
      const m = dariNim.get(String(p.nim))
      const sebelum = statusLama.get(m.id + '|' + p.aspekId) ?? null
      if (sebelum !== tanda) berubah.push({ nim: m.nim, aspekId: p.aspekId, dari: sebelum, ke: tanda })
      if (tanda) {
        await tx.penguncian.upsert({
          where: { mahasiswaId_aspekId: { mahasiswaId: m.id, aspekId: p.aspekId } },
          update: { status: tanda, olehId: pengguna.id, waktu: new Date() },
          create: { mahasiswaId: m.id, aspekId: p.aspekId, status: tanda, olehId: pengguna.id },
        })
      } else {
        await tx.penguncian.deleteMany({ where: { mahasiswaId: m.id, aspekId: p.aspekId } })
      }
    }

    if (berubah.length) {
      const nimUnik = [...new Set(berubah.map((b) => b.nim))]
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'UBAH_PENGUNCIAN',
        target: nimUnik.length === 1 ? 'mahasiswa ' + nimUnik[0] : 'penguncian (' + nimUnik.length + ' mahasiswa)',
        rincian: {
          jumlah: berubah.length,
          dariFinal: berubah.filter((b) => b.dari === 'FINAL').length,
          contoh: berubah.slice(0, 20),
        },
      })
    }
  }, TRANSAKSI)
  return { ok: true }
}
