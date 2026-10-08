import { db } from './db.js'
import { GalatApi } from './api.js'
import { angkaId, semesterDari } from './muat.js'
import { petaMahasiswa, tulisBatch, wajibkanAlasan } from './nilai.js'
import { catatLog } from './log.js'
import { getAspek, getKomponenById } from '../lib/curriculum.js'
import { komponenDosen } from '../lib/data.js'
import { periksaUsulan } from '../lib/rules.js'

// Dua antrean yang menunggu keputusan Kemahasiswaan: pengajuan koreksi dari mahasiswa dan
// usulan nilai dari dosen. Keduanya tidak mengubah nilai apa pun sebelum diputuskan (R8).

const KEPUTUSAN = ['disetujui', 'ditolak']

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

  const baru = await db.pengajuanKoreksi.create({
    data: { mahasiswaId: pengguna.mahasiswa.id, komponenId: komponen.id, alasan: teks, nilaiDiharapkan: harapan },
  })
  return { id: 'K-' + baru.id }
}

export async function putuskanKoreksi(pengguna, { id, keputusan, catatan }) {
  if (!KEPUTUSAN.includes(keputusan)) throw new GalatApi('Keputusan harus "disetujui" atau "ditolak".')
  // Hanya yang masih menunggu yang berubah — dua jendela yang memutuskan bersamaan tidak saling timpa.
  const hasil = await db.pengajuanKoreksi.updateMany({
    where: { id: angkaId(id), status: 'MENUNGGU' },
    data: {
      status: keputusan.toUpperCase(),
      diputuskanOleh: pengguna.id,
      diputuskanPada: new Date(),
      catatan: String(catatan ?? '').trim() || null,
    },
  })
  return { ok: hasil.count === 1 }
}

/** Dosen mengusulkan nilai untuk kelasnya. Belum ada satu angka pun yang masuk transkrip. */
export async function usulkanNilai(pengguna, { cara, catatan, entri }) {
  const dosen = pengguna.dosen
  const bersih = (Array.isArray(entri) ? entri : [])
    .filter((e) => e && e.nim && e.komponenId && Number.isFinite(Number(e.nilai)))
    .map((e) => ({ nim: String(e.nim).trim(), komponenId: e.komponenId, nilai: Number(e.nilai) }))
  if (!bersih.length) throw new GalatApi('Tidak ada nilai yang bisa diusulkan.')

  const komponenKelas = new Set(komponenDosen(dosen).map((k) => k.id))
  const luar = bersih.find((e) => !komponenKelas.has(e.komponenId))
  if (luar) throw new GalatApi('Komponen ' + luar.komponenId + ' bukan bagian kelas Anda.')

  const mhs = await db.mahasiswa.findMany({ where: { nim: { in: [...new Set(bersih.map((e) => e.nim))] } } })
  const kelas = new Set(mhs.filter((m) => m.prodiId === dosen.prodiId).map((m) => m.nim))
  const asing = bersih.find((e) => !kelas.has(e.nim))
  if (asing) throw new GalatApi('NIM ' + asing.nim + ' tidak terdaftar di kelas Anda.')

  const u = await db.usulan.create({
    data: {
      dosenId: dosen.id,
      cara: cara === 'import' ? 'import' : 'manual',
      catatan: String(catatan ?? '').trim() || null,
      entri: { create: bersih },
    },
  })
  return { id: 'U-' + u.id }
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
