import { db } from './db.js'
import { GalatApi } from './api.js'
import { angkaId, diKelasDosen, selesaiProgram, semesterDari } from './muat.js'
import { ALASAN_MIN, cariTerkunci, petaMahasiswa, tulisBatch, wajibkanAlasan } from './nilai.js'
import { catatLog } from './log.js'
import { ajukanDalam } from './persetujuan.js'
import { getAspek, getKomponenById } from '../lib/curriculum.js'
import { komponenDosen } from '../lib/data.js'
import { periksaUsulan, validasiBatchImport } from '../lib/rules.js'

// Pengajuan koreksi dari mahasiswa tidak mengubah nilai apa pun sebelum diputuskan (R8). Sejak rapat 24 Okt 2026
// keputusannya dua lapis: admin Kemahasiswaan meneruskannya ke super admin beserta nilai usulan (atau menolak), lalu
// super admin menyetujui dan nilainya langsung diterapkan sebagai satu batch (atau menolak). Lapis pertama hanya
// untuk admin biasa dan lapis kedua hanya untuk super admin, supaya selalu dua orang yang memeriksa.
// Nilai dari dosen dulu juga berupa usulan; kini dosen mengunggah rekap Excel kelasnya dan nilainya langsung
// tersimpan (unggahNilaiDosen), kecuali untuk angkatan yang sudah selesai atau disahkan, yang diajukan ke super admin.
// putuskanUsulan tetap ada untuk usulan lama, hanya untuk super admin.

const KEPUTUSAN = ['disetujui', 'ditolak']
const MENUNGGU_KOREKSI = ['MENUNGGU_ADMIN', 'MENUNGGU_SUPERADMIN']

/** Satu-satunya aksi tulis mahasiswa: mengajukan koreksi, tanpa mengubah angka. */
export async function ajukanKoreksi(pengguna, { komponenId, alasan, nilaiDiharapkan }) {
  const komponen = getKomponenById(komponenId)
  if (!komponen) throw new GalatApi('Komponen tidak dikenal.')
  const teks = String(alasan ?? '').trim()
  if (!teks) throw new GalatApi('Alasan pengajuan wajib diisi.')

  const angkatan = await db.angkatan.findUnique({ where: { id: pengguna.mahasiswa.angkatanId } })
  if (angkatan && getAspek(komponen.aspekId).semester > semesterDari(angkatan)) {
    throw new GalatApi('Komponen ini belum dibuka untuk semester Anda.')
  }

  const harapan = nilaiDiharapkan == null || nilaiDiharapkan === '' ? null : Number(nilaiDiharapkan)
  if (harapan != null && !(harapan >= 0 && harapan <= 100)) throw new GalatApi('Nilai yang diharapkan harus 0–100.')

  // Satu komponen satu pengajuan yang berjalan: yang kedua hanya menumpuk antrean admin.
  const berjalan = await db.pengajuanKoreksi.findFirst({
    where: { mahasiswaId: pengguna.mahasiswa.id, komponenId: komponen.id, status: { in: MENUNGGU_KOREKSI } },
  })
  if (berjalan) throw new GalatApi('Pengajuan untuk komponen ini masih diproses. Tunggu keputusannya dulu.', 409)

  const baru = await db.pengajuanKoreksi.create({
    data: { mahasiswaId: pengguna.mahasiswa.id, komponenId: komponen.id, alasan: teks, nilaiDiharapkan: harapan },
  })
  return { id: 'K-' + baru.id }
}

/**
 * Keputusan dua lapis atas pengajuan koreksi. Admin biasa memutuskan lapis pertama (MENUNGGU_ADMIN): 'disetujui'
 * meneruskannya ke super admin dengan `nilaiBaru` sebagai nilai usulan (bawaannya nilai yang diharapkan mahasiswa).
 * Super admin memutuskan lapis kedua (MENUNGGU_SUPERADMIN): 'disetujui' menerapkan `nilaiBaru` (bawaannya nilai
 * usulan admin) sebagai satu batch bercara 'koreksi'. Menolak di lapis mana pun wajib menyebut alasannya.
 * { ok: false } bila pengajuan sudah diputuskan atau sedang menunggu lapis yang lain.
 */
export async function putuskanKoreksi(pengguna, { id, keputusan, catatan, nilaiBaru }) {
  if (!KEPUTUSAN.includes(keputusan)) throw new GalatApi('Keputusan harus "disetujui" atau "ditolak".')
  const k = await db.pengajuanKoreksi.findUnique({ where: { id: angkaId(id) }, include: { mahasiswa: true } })
  if (!k) throw new GalatApi('Pengajuan tidak ditemukan.', 404)
  const lapis = pengguna.superAdmin ? 'MENUNGGU_SUPERADMIN' : 'MENUNGGU_ADMIN'
  if (k.status !== lapis) return { ok: false }

  const teks = String(catatan ?? '').trim()
  const target = 'mahasiswa ' + k.mahasiswa.nim
  const rujukan = { pengajuan: 'K-' + k.id, komponen: k.komponenId, lapis: pengguna.superAdmin ? 2 : 1 }

  if (keputusan === 'ditolak') {
    if (teks.length < ALASAN_MIN) {
      throw new GalatApi('Alasan penolakan wajib diisi, minimal ' + ALASAN_MIN + ' karakter, supaya mahasiswa tahu sebabnya.')
    }
    return db.$transaction(async (tx) => {
      // Hanya yang masih menunggu lapis ini yang berubah: dua jendela yang memutuskan bersamaan tidak saling timpa.
      const hasil = await tx.pengajuanKoreksi.updateMany({
        where: { id: k.id, status: lapis },
        data: { status: 'DITOLAK', diputuskanOleh: pengguna.id, diputuskanPada: new Date(), catatan: teks },
      })
      if (hasil.count !== 1) return { ok: false }
      await catatLog(tx, { aktorId: pengguna.id, aksi: 'TOLAK_KOREKSI', target, rincian: { ...rujukan, alasan: teks } })
      return { ok: true }
    })
  }

  const usulan = pengguna.superAdmin ? k.nilaiUsulan : k.nilaiDiharapkan
  const angka = nilaiBaru == null || nilaiBaru === '' ? usulan : Number(nilaiBaru)
  if (angka == null || !Number.isFinite(angka) || angka < 0 || angka > 100) {
    throw new GalatApi('Isi nilai baru 0 sampai 100 sebelum menyetujui.')
  }
  const nilai = Math.round(angka * 100) / 100

  if (!pengguna.superAdmin) {
    // Lapis pertama: diteruskan ke super admin. Nilai mahasiswa belum berubah.
    return db.$transaction(async (tx) => {
      const hasil = await tx.pengajuanKoreksi.updateMany({
        where: { id: k.id, status: 'MENUNGGU_ADMIN' },
        data: { status: 'MENUNGGU_SUPERADMIN', adminOleh: pengguna.id, adminPada: new Date(), adminCatatan: teks || null, nilaiUsulan: nilai },
      })
      if (hasil.count !== 1) return { ok: false }
      await catatLog(tx, { aktorId: pengguna.id, aksi: 'TERUSKAN_KOREKSI', target, rincian: { ...rujukan, nilaiUsulan: nilai, catatan: teks || null } })
      return { ok: true }
    })
  }

  // Lapis kedua: nilainya diterapkan lewat jalur yang sama dengan Input Nilai, jadi tercatat di AuditLog dan bisa
  // di-rollback. Aturan sistem diperiksa ulang, dan data yang sudah final atau angkatan yang sudah disahkan menuntut
  // catatan keputusan minimal 10 karakter, sama dengan simpanBatch.
  const komponen = getKomponenById(k.komponenId)
  const aspek = komponen ? getAspek(komponen.aspekId) : null
  if (!komponen || !aspek) throw new GalatApi('Komponen pengajuan ini sudah tidak ada di kurikulum.', 409)
  const peta = await petaMahasiswa([k.mahasiswa.nim])
  const periksa = validasiBatchImport([{ nim: k.mahasiswa.nim, komponen: komponen.id, nilai }], {
    cariMahasiswa: (nim) => peta.get(nim) ?? null,
    sumber: komponen.sumber,
    semester: aspek.semester,
  })
  if (periksa.ditolak.length) throw new GalatApi('Nilai baru ditolak: ' + periksa.ditolak[0].alasan.join('; '))

  return db.$transaction(async (tx) => {
    const terkunci = await wajibkanAlasan(tx, [{ mahasiswaId: k.mahasiswaId, aspekId: komponen.aspekId }], teks, 'catatan keputusan')
    const lama = await tx.nilai.findUnique({ where: { mahasiswaId_komponenId: { mahasiswaId: k.mahasiswaId, komponenId: komponen.id } } })
    const batch = await tulisBatch(
      tx,
      {
        sumber: komponen.sumber,
        semester: aspek.semester,
        angkatanId: k.mahasiswa.angkatanId,
        cara: 'koreksi',
        entri: [{ nim: k.mahasiswa.nim, komponenId: komponen.id, nilai }],
      },
      pengguna.id,
      peta,
    )
    const hasil = await tx.pengajuanKoreksi.updateMany({
      where: { id: k.id, status: 'MENUNGGU_SUPERADMIN' },
      data: { status: 'DISETUJUI', diputuskanOleh: pengguna.id, diputuskanPada: new Date(), catatan: teks || null, nilaiUsulan: nilai, batchId: batch.id },
    })
    // Batch-nya ikut batal bersama transaksi ini bila pengajuan sudah diputuskan di jendela lain.
    if (hasil.count !== 1) throw new GalatApi('Pengajuan ini baru saja diputuskan di jendela lain.', 409)
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'SETUJUI_KOREKSI',
      target,
      rincian: { ...rujukan, nilaiLama: lama?.nilai ?? null, nilaiBaru: nilai, batch: batch.id, catatan: teks || null },
    })
    if (terkunci) {
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'UBAH_DATA_TERKUNCI',
        target: 'batch ' + batch.id,
        rincian: { ...terkunci, cara: 'koreksi', jumlahNilai: 1 },
      })
    }
    return { ok: true, batchId: batch.id }
  })
}

/* -------------------------------- unggahan dosen -------------------------------- */

const BARIS_RINGKASAN = 20 // sama dengan BATAS_BARIS di persetujuan.js

/** Entri unggahan yang dirapikan (angka saja, NIM dirapikan); galat bila kosong atau ada pasangan NIM-komponen kembar. */
function rapikanEntri(entri) {
  const bersih = (Array.isArray(entri) ? entri : [])
    .filter((e) => e && e.nim && e.komponenId && Number.isFinite(Number(e.nilai)))
    .map((e) => ({ nim: String(e.nim).trim(), komponenId: e.komponenId, nilai: Number(e.nilai) }))
  if (!bersih.length) throw new GalatApi('Tidak ada nilai yang bisa disimpan.')
  const kembar = new Set()
  for (const e of bersih) {
    const k = e.nim + '|' + e.komponenId
    if (kembar.has(k)) throw new GalatApi('NIM ' + e.nim + ' punya dua nilai untuk komponen ' + e.komponenId + '.')
    kembar.add(k)
  }
  return bersih
}

/**
 * Komponen harus milik kelas dosen dan mahasiswanya di kelasnya (diKelasDosen di muat.js). Mengembalikan peta NIM →
 * baris Mahasiswa beserta angkatannya. `kelasSiapa` = sebutan kelas di pesan galat.
 */
async function periksaKelas(dosen, bersih, kelasSiapa = 'kelas Anda') {
  const komponenKelas = new Set(komponenDosen(dosen).map((k) => k.id))
  const luar = bersih.find((e) => !komponenKelas.has(e.komponenId))
  if (luar) throw new GalatApi('Komponen ' + luar.komponenId + ' bukan bagian ' + kelasSiapa + '.')
  const mhs = await db.mahasiswa.findMany({
    where: { nim: { in: [...new Set(bersih.map((e) => e.nim))] } },
    include: { angkatan: true },
  })
  const kelas = new Map(mhs.filter((m) => diKelasDosen(dosen, m)).map((m) => [m.nim, m]))
  const asing = bersih.find((e) => !kelas.has(e.nim))
  if (asing) throw new GalatApi('NIM ' + asing.nim + ' tidak terdaftar di ' + kelasSiapa + '.')
  return kelas
}

/** Nilai yang lolos aturan sistem (rentang, semester aspek) dan berbeda dari yang tersimpan, beserta nilai lamanya. */
async function nilaiBerubah(tx, dosen, bersih) {
  const peta = await petaMahasiswa(bersih.map((e) => e.nim), tx)
  const periksa = periksaUsulan(bersih, { cariMahasiswa: (nim) => peta.get(nim) ?? null, sumber: dosen.sumber })
  if (periksa.ditolak.length) {
    const x = periksa.ditolak[0]
    throw new GalatApi('NIM ' + (x.nim || '(kosong)') + ', komponen ' + x.komponenId + ' ditolak: ' + x.alasan.join('; '))
  }
  const lama = await tx.nilai.findMany({
    where: { OR: periksa.diterima.map((x) => ({ mahasiswaId: peta.get(x.nim).id, komponenId: x.komponenId })) },
    select: { mahasiswaId: true, komponenId: true, nilai: true },
  })
  const nilaiLama = new Map(lama.map((n) => [n.mahasiswaId + '|' + n.komponenId, n.nilai]))
  const berubah = periksa.diterima.filter((x) => nilaiLama.get(peta.get(x.nim).id + '|' + x.komponenId) !== x.nilai)
  return { peta, nilaiLama, berubah, sama: periksa.diterima.length - berubah.length }
}

const batchDosen = (tx, dosen, daftar, aktorId, peta) => {
  const angkatan = [...new Set(daftar.map((x) => peta.get(x.nim).angkatanId))]
  return tulisBatch(
    tx,
    {
      sumber: dosen.sumber,
      semester: dosen.semester,
      angkatanId: angkatan.length === 1 ? angkatan[0] : 'campuran',
      cara: 'unggah-dosen',
      entri: daftar.map((x) => ({ nim: x.nim, komponenId: x.komponenId, nilai: x.nilai })),
    },
    aktorId,
    peta,
  )
}

/**
 * Dosen mengunggah nilai kelasnya (rekap Excel yang dicocokkan di layar). Diperiksa ulang di sini: komponennya milik
 * kelas dosen, mahasiswanya di kelasnya (angkatan yang diampu), dan aturan sistem (rentang nilai, semester aspek). Nilai
 * yang sama dengan yang tersimpan dilewati, jadi mengunggah ulang berkas yang sama tidak menambah jejak di AuditLog.
 * Sisanya dipilah (keputusan pengguna 25 Oktober):
 *   angkatan berjalan       → langsung tersimpan sebagai satu batch atas nama dosen; super admin bisa membatalkannya
 *   angkatan yang programnya sudah selesai atau sudah disahkan, atau aspek yang sudah final
 *                           → menjadi satu permintaan PERBAIKAN_NILAI_DOSEN ke super admin, dengan `alasan` wajib;
 *                             nilainya belum berubah sampai disetujui (terapkanPerbaikanDosen)
 * Keduanya dalam satu transaksi. Satu baris salah menolak seluruh unggahan, sama seperti import Kemahasiswaan.
 * Jawabannya { id, jumlah, sama, permintaan }: batch yang tersimpan (id null bila tidak ada) dan permintaan bila ada.
 */
export async function unggahNilaiDosen(pengguna, { entri, alasan }) {
  const dosen = pengguna.dosen
  const bersih = rapikanEntri(entri)
  const kelas = await periksaKelas(dosen, bersih)

  return db.$transaction(
    async (tx) => {
      const { peta, nilaiLama, berubah, sama } = await nilaiBerubah(tx, dosen, bersih)
      if (!berubah.length) return { id: null, jumlah: 0, sama, permintaan: null }

      const kunci = new Set(
        (await cariTerkunci(tx, berubah.map((x) => ({ mahasiswaId: peta.get(x.nim).id, aspekId: x.komponen.aspekId })))).map(
          (p) => p.mahasiswaId + '|' + p.aspekId,
        ),
      )
      const perluSetuju = (x) =>
        selesaiProgram(kelas.get(x.nim).angkatan) || kunci.has(peta.get(x.nim).id + '|' + x.komponen.aspekId)
      const minta = berubah.filter(perluSetuju)
      const langsung = berubah.filter((x) => !perluSetuju(x))

      let permintaan = null
      if (minta.length) {
        const mahasiswa = [...new Map(minta.map((x) => [x.nim, kelas.get(x.nim)])).values()]
        const diajukan = await ajukanDalam(
          tx,
          pengguna,
          'PERBAIKAN_NILAI_DOSEN',
          { entri: minta.map((x) => ({ nim: x.nim, komponenId: x.komponenId, nilai: x.nilai })), alasan },
          {
            mahasiswa: mahasiswa.map((m) => ({ nim: m.nim, nama: m.nama, angkatan: m.angkatan.label })),
            ringkasan: {
              judul: 'Perbaikan ' + minta.length + ' nilai ' + dosen.sumber + ' Semester ' + dosen.semester + ' dari ' + dosen.nama,
              baris: minta.slice(0, BARIS_RINGKASAN).map((x) => {
                const lama = nilaiLama.get(peta.get(x.nim).id + '|' + x.komponenId)
                return x.nim + ' ' + peta.get(x.nim).name + ' · ' + x.komponenId + ': ' + (lama ?? '–') + ' → ' + x.nilai
              }),
            },
          },
        )
        permintaan = { ...diajukan.permintaan, jumlah: minta.length }
      }

      const batch = langsung.length ? await batchDosen(tx, dosen, langsung, pengguna.id, peta) : null
      return { id: batch?.id ?? null, jumlah: batch?.jumlah ?? 0, sama, permintaan }
    },
    { timeout: 30000, maxWait: 10000 },
  )
}

/**
 * Menjalankan permintaan PERBAIKAN_NILAI_DOSEN yang disetujui super admin (putuskanPermintaan di persetujuan.js), atas
 * nama dosen pengaju. Semuanya diperiksa ulang (kelas dosen, aturan sistem), nilai yang kini sudah sama dilewati, lalu
 * ditulis sebagai satu batch unggahan dosen. Alasan dosen menjadi alasan perubahan data terkunci, dan tercatat di log.
 */
export async function terapkanPerbaikanDosen(pengaju, { entri, alasan }) {
  const dosen = pengaju.dosen
  if (!dosen) throw new GalatApi('Akun pengaju sudah bukan dosen.')
  const bersih = rapikanEntri(entri)
  await periksaKelas(dosen, bersih, 'kelas dosen pengaju')

  return db.$transaction(
    async (tx) => {
      const { peta, berubah } = await nilaiBerubah(tx, dosen, bersih)
      if (!berubah.length) return { id: null, jumlah: 0 }
      const pasangan = berubah.map((x) => ({ mahasiswaId: peta.get(x.nim).id, aspekId: x.komponen.aspekId }))
      const terkunci = await wajibkanAlasan(tx, pasangan, alasan, 'alasan')
      const batch = await batchDosen(tx, dosen, berubah, pengaju.id, peta)
      if (terkunci) {
        await catatLog(tx, {
          aktorId: pengaju.id,
          aksi: 'UBAH_DATA_TERKUNCI',
          target: 'batch ' + batch.id,
          rincian: { ...terkunci, cara: 'perbaikan dosen', jumlahNilai: batch.jumlah },
        })
      }
      return { id: batch.id, jumlah: batch.jumlah }
    },
    { timeout: 30000, maxWait: 10000 },
  )
}

/**
 * Keputusan Kemahasiswaan atas satu usulan.
 *   'disetujui' → baris yang lolos pemeriksaan sistem ditulis sebagai satu batch atas nama
 *                 dosen pengusul; penyetujunya dicatat di usulan.
 *   'ditolak'   → tidak ada nilai yang berpindah; alasannya wajib dan tersimpan.
 */
export async function putuskanUsulan(pengguna, { id, keputusan, catatan }) {
  if (!KEPUTUSAN.includes(keputusan)) throw new GalatApi('Keputusan harus "disetujui" atau "ditolak".')
  const teks = String(catatan ?? '').trim()

  return db.$transaction(
    async (tx) => {
      const u = await tx.usulan.findUnique({ where: { id: angkaId(id) }, include: { entri: true } })
      if (!u || u.status !== 'MENUNGGU') return { ok: false }
      const putusan = { diputuskanOleh: pengguna.id, diputuskanPada: new Date(), catatanKeputusan: teks || null }

      if (keputusan === 'ditolak') {
        if (!teks) throw new GalatApi('Alasan penolakan wajib diisi. Dosen perlu tahu apa yang harus diperbaiki.')
        await tx.usulan.update({ where: { id: u.id }, data: { status: 'DITOLAK', ...putusan } })
        return { ok: true }
      }

      const dosen = await tx.dosen.findUnique({ where: { id: u.dosenId } })
      if (!dosen) throw new GalatApi('Dosen pengusul tidak ditemukan.')
      const peta = await petaMahasiswa(u.entri.map((e) => e.nim), tx)
      const periksa = periksaUsulan(
        u.entri.map((e) => ({ nim: e.nim, komponenId: e.komponenId, nilai: e.nilai })),
        { cariMahasiswa: (nim) => peta.get(nim) ?? null, sumber: dosen.sumber },
      )
      if (!periksa.diterima.length) {
        throw new GalatApi('Tidak ada baris yang lolos pemeriksaan sistem: ' + (periksa.ditolak[0]?.alasan[0] ?? '-'))
      }

      // Dosen boleh mengusulkan untuk data terkunci; yang menentukan tetap admin. Karena menyetujui berarti
      // mengubah data terkunci, catatan keputusan wajib diisi dan berfungsi sebagai alasan.
      const terkunci = await wajibkanAlasan(
        tx,
        periksa.diterima.map((x) => ({ mahasiswaId: peta.get(x.nim).id, aspekId: x.komponen.aspekId })),
        teks,
        'catatan keputusan',
      )

      const angkatan = [...new Set(periksa.diterima.map((x) => peta.get(x.nim).angkatanId))]
      const batch = await tulisBatch(
        tx,
        {
          sumber: dosen.sumber,
          semester: dosen.semester,
          angkatanId: angkatan.length === 1 ? angkatan[0] : 'campuran',
          cara: u.cara,
          entri: periksa.diterima.map((x) => ({ nim: x.nim, komponenId: x.komponenId, nilai: x.nilai })),
        },
        // Pelakunya tetap dosen pengusul — dialah yang menilai.
        dosen.penggunaId,
        peta,
      )
      if (terkunci) {
        await catatLog(tx, {
          aktorId: pengguna.id,
          aksi: 'UBAH_DATA_TERKUNCI',
          target: 'batch ' + batch.id,
          rincian: { ...terkunci, cara: 'persetujuan usulan', usulanId: u.id, jumlahNilai: batch.jumlah },
        })
      }
      await tx.usulan.update({
        where: { id: u.id },
        data: {
          status: 'DISETUJUI',
          batchId: batch.id,
          ditolakSistem: periksa.ditolak.map((x) => ({ nim: x.nim, komponenId: x.komponenId, alasan: x.alasan })),
          ...putusan,
        },
      })
      return { ok: true }
    },
    { timeout: 30000, maxWait: 10000 },
  )
}
