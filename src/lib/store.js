import { useSyncExternalStore } from 'react'
import { KOMPONEN, KURIKULUM_TERPASANG, getAspek, getKomponenById, isiKurikulum } from './curriculum.js'
import { updateConfig } from './config.js'
import { periksaBobot } from './bobot.js'
import { kelayakanSertifikat, periksaUsulan } from './rules.js'
import {
  AUDIT_LOG,
  COHORTS,
  PENGAJUAN_KOREKSI,
  STUDENTS,
  USULAN_AWAL,
  getStudentByNim,
  isiData,
  komponenDosen,
  isiMaster,
  mahasiswaKelas,
  pasangPeriode,
  resetTranskripCache,
} from './data.js'
import { kirim } from './kirim.js'
import { sebabPersetujuan } from './unggahDosen.js'
import { modeLokal } from './modeData.js'
import { kunciAkun, pasangProfil } from './profil.js'

/* Setiap penulisan lewat batch (rollback, audit log); lihat README.md › Penyimpanan perubahan. */

export const SIMPAN_PERUBAHAN = true
const KUNCI = 'sk5c.perubahan'

const KUNCI_LAMA = 'sk5c.nilai'

let versi = 0
const listeners = new Set()

let waktuPerubahan = new Date()

export const terakhirDiperbarui = () => waktuPerubahan

function berubah() {
  versi++
  waktuPerubahan = new Date()
  resetTranskripCache()
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const bacaVersi = () => versi

/** Komponen yang memanggil ini ikut menghitung ulang setiap data berubah. */
export function useStore() {
  return useSyncExternalStore(subscribe, bacaVersi, bacaVersi)
}

/* ------------------------------ keadaan asli ------------------------------ */

const ASLI = new Map()
const kunciSel = (nim, komponenId) => nim + '|' + komponenId

function catatAsli(mahasiswa, komponen) {
  const k = kunciSel(mahasiswa.nim, komponen.id)
  if (!ASLI.has(k)) {
    ASLI.set(k, mahasiswa.nilai?.[komponen.aspekId]?.komponen?.[komponen.id] ?? null)
  }
}

function kembalikanSemua() {
  for (const [k, lama] of ASLI) {
    const [nim, komponenId] = k.split('|')
    const mahasiswa = getStudentByNim(nim)
    const komponen = getKomponenById(komponenId)
    const slot = mahasiswa?.nilai?.[komponen?.aspekId]
    if (!slot) continue
    if (lama) slot.komponen[komponenId] = lama
    else delete slot.komponen[komponenId]
  }
}

/* --------------------------------- batch ---------------------------------- */

export const BATCH_SESI = []

let urut = 0

const waktuSekarang = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

function terapkanBatch(batch) {
  batch.jejak = []
  const tanggal = batch.waktu.slice(0, 10)

  batch.entri.forEach((e, i) => {
    const mahasiswa = getStudentByNim(e.nim)
    const komponen = getKomponenById(e.komponenId)
    if (!mahasiswa || !komponen) return

    catatAsli(mahasiswa, komponen)

    const slot = (mahasiswa.nilai[komponen.aspekId] ??= { komponen: {} })
    const lama = slot.komponen[e.komponenId] ?? null
    slot.komponen[e.komponenId] = { nilai: e.nilai, penilai: batch.aktor, tanggal, batchId: batch.id }

    batch.jejak.push({
      id: 'L-' + batch.id + '-' + i,
      waktu: batch.waktu,
      aktor: batch.aktor,
      nim: mahasiswa.nim,
      nama: mahasiswa.name,
      aspek: komponen.aspekId,
      komponen: e.komponenId,
      nilaiLama: lama?.nilai ?? null,
      nilaiBaru: e.nilai,
      sumber: komponen.sumber,
      batchId: batch.id,
    })
  })

  batch.jumlah = batch.jejak.length
}

/* --------------------------- penguncian aspek ----------------------------- */

export const PENGUNCIAN = []

const NIM_KUNCI = new Set()

function terapkanPenguncian() {
  for (const nim of NIM_KUNCI) {
    const m = getStudentByNim(nim)
    if (m) m.penguncian = {}
  }
  for (const p of PENGUNCIAN) {
    const m = getStudentByNim(p.nim)
    if (!m) continue
    NIM_KUNCI.add(p.nim)
    m.penguncian[p.aspekId] = { status: p.status, oleh: p.aktor, tanggal: p.waktu.slice(0, 10) }
  }
}

function setPenguncianLokal({ nim, aspekId, status, aktor }) {
  const i = PENGUNCIAN.findIndex((p) => p.nim === nim && p.aspekId === aspekId)
  if (i >= 0) PENGUNCIAN.splice(i, 1)
  if (status) PENGUNCIAN.push({ nim, aspekId, status, aktor, waktu: waktuSekarang() })
  NIM_KUNCI.add(nim)
  terapkanUlang()
  simpanKePenyimpanan()
}

function setPenguncianBanyakLokal(daftar, { status, aktor }) {
  for (const { nim, aspekId } of daftar) {
    const i = PENGUNCIAN.findIndex((p) => p.nim === nim && p.aspekId === aspekId)
    if (i >= 0) PENGUNCIAN.splice(i, 1)
    if (status) PENGUNCIAN.push({ nim, aspekId, status, aktor, waktu: waktuSekarang() })
    NIM_KUNCI.add(nim)
  }
  terapkanUlang()
  simpanKePenyimpanan()
}

function terapkanUlang() {
  kembalikanSemua()

  for (let i = AUDIT_LOG.length - 1; i >= 0; i--) {
    if (String(AUDIT_LOG[i].batchId ?? '').startsWith('B-SESI')) AUDIT_LOG.splice(i, 1)
  }

  const kronologis = [...BATCH_SESI].reverse()
  for (const b of kronologis) {
    if (b.status !== 'diproses') {
      b.jejak = []
      b.jumlah = b.entri.length
      continue
    }
    terapkanBatch(b)
    for (const j of b.jejak) AUDIT_LOG.unshift(j)
  }

  terapkanPenguncian()
  berubah()
}

function simpanBatchLokal({ sumber, semester, angkatanId, aktor, cara, entri }) {
  urut++
  const batch = {
    id: 'B-SESI-' + String(urut).padStart(2, '0'),
    sumber,
    semester,
    angkatanId,
    aktor,
    cara,
    waktu: waktuSekarang(),
    status: 'diproses',
    entri: entri.map(({ nim, komponenId, nilai }) => ({ nim, komponenId, nilai })),
    jejak: [],
    jumlah: entri.length,
  }

  BATCH_SESI.unshift(batch)
  terapkanUlang()
  simpanKePenyimpanan()
  return batch
}

function rollbackBatchLokal(id) {
  const batch = BATCH_SESI.find((b) => b.id === id)
  if (!batch || batch.status === 'dibatalkan') return false
  batch.status = 'dibatalkan'
  terapkanUlang()
  simpanKePenyimpanan()
  return true
}

/* ---------------------------- pengajuan koreksi --------------------------- */

/* Dua lapis sejak rapat 24 Okt 2026, sama dengan putuskanKoreksi di src/server/pengajuan.js: admin biasa
   meneruskan (menunggu_admin → menunggu_superadmin, dengan nilai usulan), super admin menyetujui dan nilainya
   diterapkan sebagai batch sesi bercara 'koreksi'. `superAdmin` menentukan lapis yang boleh diputuskan. */
const ALASAN_TOLAK_MIN = 10

function putuskanKoreksiLokal(id, keputusan, { aktor, catatan, nilaiBaru = null, superAdmin = false } = {}) {
  const k = PENGAJUAN_KOREKSI.find((x) => x.id === id)
  if (!k || k.status !== (superAdmin ? 'menunggu_superadmin' : 'menunggu_admin')) return false
  const teks = String(catatan ?? '').trim()
  const tanggal = new Date().toISOString().slice(0, 10)
  if (keputusan === 'ditolak') {
    if (teks.length < ALASAN_TOLAK_MIN) {
      throw new Error('Alasan penolakan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.')
    }
    k.status = 'ditolak'
    k.keputusan = { oleh: aktor, tanggal, catatan: teks }
  } else {
    const usulan = superAdmin ? k.nilaiUsulan : k.nilaiDiharapkan
    const angka = nilaiBaru == null || nilaiBaru === '' ? usulan : Number(nilaiBaru)
    if (angka == null || !Number.isFinite(angka) || angka < 0 || angka > 100) {
      throw new Error('Isi nilai baru 0 sampai 100 sebelum menyetujui.')
    }
    k.nilaiUsulan = Math.round(angka * 100) / 100
    if (!superAdmin) {
      k.status = 'menunggu_superadmin'
      k.lapis1 = { oleh: aktor, tanggal, catatan: teks }
    } else {
      const komponen = getKomponenById(k.komponenId)
      const batch = simpanBatchLokal({
        sumber: komponen.sumber,
        semester: getAspek(komponen.aspekId).semester,
        angkatanId: getStudentByNim(k.nim)?.angkatanId,
        aktor,
        cara: 'koreksi',
        entri: [{ nim: k.nim, komponenId: k.komponenId, nilai: k.nilaiUsulan }],
      })
      k.status = 'disetujui'
      k.batchId = batch.id
      k.keputusan = { oleh: aktor, tanggal, catatan: teks }
    }
  }
  berubah()
  simpanKePenyimpanan()
  return true
}

/* --------------------------- akses cetak sertifikat ------------------------- */

/* Permintaan akses cetak sertifikat dua lapis (rapat 24 Okt 2026), dari /api/data: mahasiswa menerima miliknya,
   Kemahasiswaan semuanya, terbaru di atas. Lihat src/server/sertifikat.js dan README.md › Sertifikat. */
export const PERMINTAAN_SERTIFIKAT = []

/** Permintaan terbaru seorang mahasiswa, atau null. */
export const sertifikatMilik = (nim) => PERMINTAAN_SERTIFIKAT.find((p) => p.nim === nim) ?? null

let urutSertifikat = 0

// Yang menghalangi permintaan baru, sama dengan BERJALAN di src/server/sertifikat.js; ditolak dan dicabut boleh diulang.
const SERTIFIKAT_BERJALAN = ['menunggu_admin', 'menunggu_superadmin', 'siap_dicetak']

function mintaSertifikatLokal({ student }) {
  const k = kelayakanSertifikat(student)
  if (!k.layak) throw new Error('Sertifikat belum bisa diminta: syaratnya belum terpenuhi.')
  if (PERMINTAAN_SERTIFIKAT.some((p) => p.nim === student.nim && SERTIFIKAT_BERJALAN.includes(p.status))) {
    throw new Error('Permintaan akses cetak Anda sudah ada.')
  }
  const p = {
    id: 'S-' + ++urutSertifikat,
    nim: student.nim,
    nama: student.name,
    status: 'menunggu_admin',
    diajukan: new Date().toISOString().slice(0, 10),
    lapis1: null,
    lapis2: null,
    ditolak: null,
    dicabut: null,
    cetak: { jumlah: 0, terakhir: null, oleh: null },
  }
  PERMINTAAN_SERTIFIKAT.unshift(p)
  berubah()
  simpanKePenyimpanan()
  return { id: p.id }
}

/** Mahasiswa yang layak meminta akses cetak; `isi.student` hanya dipakai mode lokal. */
export async function mintaSertifikat(isi = {}) {
  if (modeLokal()) return mintaSertifikatLokal(isi)
  return tulis('/api/sertifikat', {})
}

function putuskanSertifikatLokal(id, keputusan, { aktor, catatan, superAdmin = false } = {}) {
  const p = PERMINTAAN_SERTIFIKAT.find((x) => x.id === id)
  if (!p || p.status !== (superAdmin ? 'menunggu_superadmin' : 'menunggu_admin')) return false
  const teks = String(catatan ?? '').trim()
  const jejak = { oleh: aktor, tanggal: new Date().toISOString().slice(0, 10) }
  if (keputusan === 'ditolak') {
    if (teks.length < ALASAN_TOLAK_MIN) {
      throw new Error('Alasan penolakan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.')
    }
    p.status = 'ditolak'
    p.ditolak = { ...jejak, catatan: teks }
  } else {
    const s = getStudentByNim(p.nim)
    if (s && !kelayakanSertifikat(s).layak) {
      throw new Error('Mahasiswa ini sudah tidak memenuhi syarat sertifikat. Tolak permintaannya dengan alasan itu.')
    }
    if (superAdmin) {
      p.status = 'siap_dicetak'
      p.lapis2 = jejak
    } else {
      p.status = 'menunggu_superadmin'
      p.lapis1 = jejak
    }
  }
  berubah()
  simpanKePenyimpanan()
  return true
}

/**
 * Keputusan atas permintaan akses cetak: admin biasa lapis pertama, super admin lapis kedua (`opsi.superAdmin`
 * dipakai mode lokal; server membaca perannya sendiri). false bila sudah diputuskan atau menunggu lapis lain.
 */
export async function putuskanSertifikat(id, keputusan, opsi = {}) {
  if (modeLokal()) return putuskanSertifikatLokal(id, keputusan, opsi)
  return (await tulis('/api/sertifikat/keputusan', { id, keputusan, catatan: opsi.catatan ?? null })).ok
}

function cabutSertifikatLokal(id, alasan, { aktor } = {}) {
  const p = PERMINTAAN_SERTIFIKAT.find((x) => x.id === id)
  if (!p || p.status !== 'siap_dicetak') return false
  const teks = String(alasan ?? '').trim()
  if (teks.length < ALASAN_TOLAK_MIN) {
    throw new Error('Alasan pencabutan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.')
  }
  p.status = 'dicabut'
  p.dicabut = { oleh: aktor, tanggal: new Date().toISOString().slice(0, 10), alasan: teks }
  berubah()
  simpanKePenyimpanan()
  return true
}

/**
 * Mencabut akses cetak yang sudah Siap dicetak (admin biasa atau super admin, langsung, dengan alasan); lihat
 * cabutSertifikat di src/server/sertifikat.js. false bila aksesnya sudah tidak Siap dicetak.
 */
export async function cabutSertifikat(id, alasan, opsi = {}) {
  if (modeLokal()) return cabutSertifikatLokal(id, alasan, opsi)
  return (await tulis('/api/sertifikat/cabut', { id, alasan })).ok
}

function catatCetakLokal(id, { aktor } = {}) {
  const p = PERMINTAAN_SERTIFIKAT.find((x) => x.id === id)
  if (p?.status === 'dicabut') throw new Error('Akses cetak sertifikat ini sudah dicabut.')
  if (p?.status !== 'siap_dicetak') throw new Error('Akses cetak sertifikat ini belum disetujui.')
  p.cetak = {
    jumlah: (p.cetak?.jumlah ?? 0) + 1,
    terakhir: new Date().toISOString().slice(0, 16).replace('T', ' '),
    oleh: aktor ?? p.nama,
  }
  berubah()
  simpanKePenyimpanan()
  return { ok: true, jumlahCetak: p.cetak.jumlah }
}

/**
 * Dipanggil tepat SEBELUM window.print(): server mencatatnya dan menolak (galat) bila akses cetaknya sudah dicabut
 * atau syaratnya gugur, juga dari halaman yang dimuat sebelum pencabutan. Data tidak dimuat ulang di sini, supaya
 * dialog cetak langsung terbuka; pemanggil memuat ulang bila gagal.
 */
export async function catatCetakSertifikat(id, opsi = {}) {
  if (modeLokal()) return catatCetakLokal(id, opsi)
  return kirim('/api/sertifikat/cetak', { isi: { id } })
}

/* --------------------------- usulan nilai dosen --------------------------- */

/* Usulan lama dari sebelum rapat 24 Okt 2026; dosen kini mengunggah langsung (unggahNilaiDosen di bawah). Yang masih
   menunggu diputuskan super admin; lihat README.md › Usulan nilai dosen. */

export const USULAN_NILAI = [...USULAN_AWAL]

/* ---------------------------- unggahan nilai dosen ---------------------------- */

/* Riwayat unggahan dosen yang sedang masuk, dari /api/data (batch atas namanya). Di mode lokal dibaca dari batch sesi
   bercara 'unggah-dosen'; lihat unggahanDosen(). */
export const UNGGAHAN_DOSEN = []

let urutPermintaanLokal = 0

/**
 * Sama dengan unggahNilaiDosen di src/server/pengajuan.js, tanpa basis data: yang langsung tersimpan menjadi batch sesi,
 * dan nilai untuk angkatan yang sudah selesai atau disahkan, atau aspek final, menjadi permintaan PERBAIKAN_NILAI_DOSEN
 * yang menunggu di PERMINTAAN. Keputusan super admin hanya ada di server (putuskanPermintaan).
 */
function unggahNilaiDosenLokal({ dosen, entri, alasan }) {
  if (!dosen?.nip) throw new Error('Unggahan harus punya dosen.')
  const komponenKelas = new Set(komponenDosen(dosen).map((k) => k.id))
  const bersih = (entri ?? [])
    .filter((e) => e && e.nim && e.komponenId && Number.isFinite(Number(e.nilai)))
    .map((e) => ({ nim: String(e.nim).trim(), komponenId: e.komponenId, nilai: Number(e.nilai) }))
  if (!bersih.length) throw new Error('Tidak ada nilai yang bisa disimpan.')
  const luar = bersih.find((e) => !komponenKelas.has(e.komponenId))
  if (luar) throw new Error('Komponen ' + luar.komponenId + ' bukan bagian kelas Anda.')
  const kelas = new Set(mahasiswaKelas(dosen).map((s) => s.nim))
  const asing = bersih.find((e) => !kelas.has(e.nim))
  if (asing) throw new Error('NIM ' + asing.nim + ' tidak terdaftar di kelas Anda.')

  const beda = bersih.filter((e) => {
    const k = getKomponenById(e.komponenId)
    return getStudentByNim(e.nim)?.nilai?.[k.aspekId]?.komponen?.[e.komponenId]?.nilai !== e.nilai
  })
  if (!beda.length) return { id: null, jumlah: 0, sama: bersih.length, permintaan: null }
  const perluSetuju = (e) => Boolean(sebabPersetujuan(getStudentByNim(e.nim), getKomponenById(e.komponenId).aspekId))
  const minta = beda.filter(perluSetuju)
  const langsung = beda.filter((e) => !perluSetuju(e))
  if (minta.length && String(alasan ?? '').trim().length < ALASAN_TOLAK_MIN) {
    throw new Error(
      'Sebagian nilai ini untuk angkatan yang sudah selesai atau disahkan, atau aspek yang sudah final, jadi perlu persetujuan ' +
        'Super Admin. Isi alasan minimal 10 karakter supaya Super Admin bisa menimbangnya.',
    )
  }

  let permintaan = null
  if (minta.length) {
    const id = 'P-L' + ++urutPermintaanLokal
    const judul = 'Perbaikan ' + minta.length + ' nilai ' + dosen.sumber + ' Semester ' + dosen.semester + ' dari ' + dosen.nama
    const mahasiswa = [...new Set(minta.map((e) => e.nim))].map((nim) => {
      const s = getStudentByNim(nim)
      return { nim, nama: s.name, angkatan: s.angkatanLabel }
    })
    PERMINTAAN.unshift({
      id,
      aksi: 'PERBAIKAN_NILAI_DOSEN',
      status: 'menunggu',
      ringkasan: {
        judul,
        baris: minta.map((e) => {
          const s = getStudentByNim(e.nim)
          const lama = s.nilai?.[getKomponenById(e.komponenId).aspekId]?.komponen?.[e.komponenId]?.nilai
          return e.nim + ' ' + s.name + ' · ' + e.komponenId + ': ' + (lama ?? '–') + ' → ' + e.nilai
        }),
        jumlahMahasiswa: mahasiswa.length,
        mahasiswa,
      },
      alasan: String(alasan).trim(),
      diajukanOleh: dosen.email || dosen.nip,
      milikSaya: true,
      diajukanPada: new Date().toISOString().slice(0, 16).replace('T', ' '),
      diputuskanOleh: null,
      diputuskanPada: null,
      catatanKeputusan: '',
      hasil: null,
    })
    permintaan = { id, aksi: 'PERBAIKAN_NILAI_DOSEN', judul, jumlah: minta.length }
  }

  let batch = null
  if (langsung.length) {
    const angkatan = [...new Set(langsung.map((e) => getStudentByNim(e.nim)?.angkatanId).filter(Boolean))]
    batch = simpanBatchLokal({
      sumber: dosen.sumber,
      semester: dosen.semester,
      angkatanId: angkatan.length === 1 ? angkatan[0] : 'campuran',
      aktor: dosen.nama ?? dosen.nip,
      cara: 'unggah-dosen',
      entri: langsung,
    })
  } else {
    berubah() // hanya permintaan: simpanBatchLokal tidak dipanggil, jadi layar diberi tahu di sini
  }
  return { id: batch?.id ?? null, jumlah: batch?.jumlah ?? 0, sama: bersih.length - beda.length, permintaan }
}

/** Riwayat unggahan dosen: { id, waktu, jumlah, status: 'tersimpan' | 'dibatalkan' }, terbaru di atas. */
export function unggahanDosen() {
  if (!modeLokal()) return UNGGAHAN_DOSEN
  return BATCH_SESI.filter((b) => b.cara === 'unggah-dosen').map((b) => ({
    id: b.id,
    waktu: b.waktu,
    jumlah: b.jumlah,
    cara: b.cara,
    status: b.status === 'dibatalkan' ? 'dibatalkan' : 'tersimpan',
  }))
}

function putuskanUsulanLokal(id, keputusan, { aktor, catatan = '' } = {}) {
  const u = USULAN_NILAI.find((x) => x.id === id)
  if (!u) return false
  if (u.status !== 'menunggu') return false
  if (keputusan !== 'disetujui' && keputusan !== 'ditolak') {
    throw new Error('Keputusan harus "disetujui" atau "ditolak".')
  }

  if (keputusan === 'disetujui') {
    /* Diperiksa di sini, bukan hanya di halaman: aturan yang dijaga antarmuka saja akan bocor. */
    const periksa = periksaUsulan(u.entri, { cariMahasiswa: getStudentByNim, sumber: u.sumber })
    u.ditolakSistem = periksa.ditolak.map((x) => ({
      nim: x.nim,
      komponenId: x.komponenId,
      alasan: x.alasan,
    }))

    if (!periksa.diterima.length) {
      throw new Error(
        'Tidak ada baris yang lolos pemeriksaan sistem: ' + (periksa.ditolak[0]?.alasan[0] ?? '-'),
      )
    }

    const batch = simpanBatchLokal({
      sumber: u.sumber,
      semester: u.semester,
      angkatanId: u.angkatanId,
      /* Pelakunya tetap dosen pengusul; penyetujunya dicatat terpisah. */
      aktor: u.dosenNama,
      cara: u.cara,
      entri: periksa.diterima.map(({ nim, komponenId, nilai }) => ({ nim, komponenId, nilai })),
    })
    u.batchId = batch.id
    u.jumlahDitulis = periksa.diterima.length
  }

  u.status = keputusan
  u.keputusan = {
    oleh: aktor,
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: String(catatan ?? '').trim(),
  }
  berubah()
  simpanKePenyimpanan()
  return true
}

export const usulanMenunggu = () => USULAN_NILAI.filter((u) => u.status === 'menunggu')

/* ------------------------------- penyimpanan ------------------------------ */

const adaPenyimpanan = () => {
  if (!SIMPAN_PERUBAHAN) return false
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

let sedangMenulis = false

function simpanKePenyimpanan() {
  if (!adaPenyimpanan()) return
  try {
    sedangMenulis = true
    localStorage.setItem(
      KUNCI,
      JSON.stringify({
        versi: 1,
        urut,
        usulan: USULAN_NILAI,
        batch: BATCH_SESI.map(({ id, sumber, semester, angkatanId, aktor, cara, waktu, status, entri }) => ({
          id, sumber, semester, angkatanId, aktor, cara, waktu, status, entri,
        })),
        penguncian: PENGUNCIAN,
        koreksi: Object.fromEntries(
          PENGAJUAN_KOREKSI.filter((k) => k.keputusan || k.lapis1).map((k) => [
            k.id,
            { status: k.status, keputusan: k.keputusan, lapis1: k.lapis1 ?? null, nilaiUsulan: k.nilaiUsulan ?? null, batchId: k.batchId ?? null },
          ]),
        ),
        koreksiBaru: PENGAJUAN_KOREKSI.filter((k) => k.baru),
        sertifikat: PERMINTAAN_SERTIFIKAT,
        urutSertifikat,
      }),
    )
  } catch {
  } finally {
    sedangMenulis = false
  }
}

export function muatDariPenyimpanan() {
  if (!adaPenyimpanan()) return
  let data
  try {
    data = JSON.parse(localStorage.getItem(KUNCI) ?? 'null')
  } catch {
    return
  }
  if (!data?.batch) return

  BATCH_SESI.length = 0
  for (const b of data.batch) BATCH_SESI.push({ ...b, jejak: [], jumlah: b.entri.length })
  urut = data.urut ?? BATCH_SESI.length

  if (Array.isArray(data.usulan)) {
    USULAN_NILAI.length = 0
    for (const u of data.usulan) USULAN_NILAI.push(u)
  }

  PENGUNCIAN.length = 0
  for (const p of data.penguncian ?? []) {
    PENGUNCIAN.push(p)
    NIM_KUNCI.add(p.nim)
  }

  for (const k of data.koreksiBaru ?? []) {
    if (!PENGAJUAN_KOREKSI.some((x) => x.id === k.id)) PENGAJUAN_KOREKSI.unshift(k)
  }

  for (const [id, nilai] of Object.entries(data.koreksi ?? {})) {
    const k = PENGAJUAN_KOREKSI.find((x) => x.id === id)
    if (k) Object.assign(k, nilai)
  }

  PERMINTAAN_SERTIFIKAT.splice(0, PERMINTAAN_SERTIFIKAT.length, ...(data.sertifikat ?? []))
  urutSertifikat = data.urutSertifikat ?? PERMINTAAN_SERTIFIKAT.length

  terapkanUlang()
}

/* ------------------------------ segarkan data ----------------------------- */

let waktuSegar = null

export const terakhirSegar = () => waktuSegar

/** Satu-satunya pintu memuat ulang data. */
export async function segarkanData() {
  if (!modeLokal()) {
    try {
      await muatDariServer()
    } catch {
    }
    return waktuSegar
  }
  muatDariPenyimpanan()
  waktuSegar = new Date()
  berubah()
  return waktuSegar
}

export function bersihkanPerubahan() {
  if (!modeLokal()) throw new Error('Perubahan di basis data dibatalkan per batch lewat tombol Rollback.')
  BATCH_SESI.length = 0
  PENGUNCIAN.length = 0
  USULAN_NILAI.length = 0
  USULAN_NILAI.push(...USULAN_AWAL)
  PERMINTAAN_SERTIFIKAT.length = 0
  urut = 0
  urutSertifikat = 0
  terapkanUlang()
  try {
    localStorage.removeItem(KUNCI)
  } catch {
  }
}

/* -------------------------------- ke server ------------------------------- */

let muat = { keadaan: 'belum', pesan: null } // belum | memuat | siap | galat
let urutMuat = 0

function aturMuat(keadaan, pesan = null) {
  muat = { keadaan, pesan }
  versi++
  listeners.forEach((fn) => fn())
}

export function useStatusMuat() {
  useSyncExternalStore(subscribe, bacaVersi, bacaVersi)
  return muat
}

export async function muatDariServer() {
  const ke = ++urutMuat
  if (muat.keadaan !== 'siap') aturMuat('memuat')
  try {
    const isi = await kirim('/api/data', { metode: 'GET' })
    if (ke !== urutMuat) return // sudah ada pemuatan yang lebih baru
    isiData({
      mahasiswa: isi.mahasiswa,
      audit: isi.audit,
      koreksi: isi.koreksi,
      pengumpulan: isi.pengumpulan,
      usulan: isi.usulan,
      batchImport: isi.batchImport,
    })
    USULAN_NILAI.splice(0, USULAN_NILAI.length, ...(isi.usulan ?? []))
    BATCH_SESI.splice(0, BATCH_SESI.length, ...(isi.batch ?? []))
    PERMINTAAN.splice(0, PERMINTAAN.length, ...(isi.permintaan ?? []))
    UNGGAHAN_DOSEN.splice(0, UNGGAHAN_DOSEN.length, ...(isi.unggahan ?? []))
    PERMINTAAN_SERTIFIKAT.splice(0, PERMINTAAN_SERTIFIKAT.length, ...(isi.sertifikat ?? []))
    pasangProfil(kunciAkun({ role: isi.peran, nim: isi.nim, nip: isi.nip }), isi.profil)
    waktuSegar = new Date()
    muat = { keadaan: 'siap', pesan: null }
    berubah()
  } catch (e) {
    if (ke === urutMuat && muat.keadaan !== 'siap') aturMuat('galat', e.message)
    throw e
  }
}

/** Dikosongkan saat keluar supaya akun berikutnya tidak melihat sisa akun sebelumnya. */
export function kosongkanDataServer() {
  urutMuat++
  isiData()
  USULAN_NILAI.length = 0
  BATCH_SESI.length = 0
  PERMINTAAN.length = 0
  UNGGAHAN_DOSEN.length = 0
  PERMINTAAN_SERTIFIKAT.length = 0
  muat = { keadaan: 'belum', pesan: null }
  berubah()
}

async function tulis(alamat, isi) {
  const hasil = await kirim(alamat, { isi })
  await muatDariServer()
  return hasil
}

/* ------------------------------ log aktivitas ------------------------------ */

/* Satu halaman log dari /api/log (src/server/log.js). Hanya membaca, jadi data tidak dimuat ulang sesudahnya.
   Tanpa server, perubahan nilai dibaca dari AUDIT_LOG yang sudah termuat; tindakan admin tidak tercatat. */
export async function bacaLog(saring = {}) {
  if (modeLokal()) return bacaLogLokal(saring)
  return kirim('/api/log', { isi: saring })
}

function bacaLogLokal({ jenis = 'nilai', halaman = 1, ukuran = 25, aktorId, dari, sampai, nim } = {}) {
  const dasar = { jenis, halaman: 1, ukuran, total: 0, jumlahHalaman: 1, pilihanAktor: [], baris: [], lokal: true }
  if (jenis !== 'nilai') return dasar
  const cocok = AUDIT_LOG.filter((l) => {
    const tanggal = String(l.waktu ?? '').slice(0, 10)
    return (
      (!aktorId || l.aktor === aktorId) &&
      (!nim || l.nim === String(nim).trim()) &&
      (!dari || tanggal >= dari) &&
      (!sampai || tanggal <= sampai)
    )
  })
  const jumlahHalaman = Math.max(1, Math.ceil(cocok.length / ukuran))
  const ke = Math.min(Math.max(1, halaman), jumlahHalaman)
  const aktor = [...new Set(AUDIT_LOG.map((l) => l.aktor).filter(Boolean))].sort()
  return {
    ...dasar,
    halaman: ke,
    total: cocok.length,
    jumlahHalaman,
    pilihanAktor: aktor.map((nama) => ({ id: nama, nama })),
    baris: cocok.slice((ke - 1) * ukuran, ke * ukuran).map((l) => ({ ...l, dibatalkan: false })),
  }
}

/* --------------------- permintaan admin kepada super admin ------------------ */

/* Admin biasa yang mengubah data mahasiswa yang sudah lewat Semester 3 tidak langsung menyimpan: server
   menjawab { menunggu: true, permintaan } dan perubahannya menunggu super admin (src/server/persetujuan.js).
   Super admin melihat semua permintaan, admin biasa hanya miliknya. */
export const PERMINTAAN = []

export const permintaanMenunggu = () => PERMINTAAN.filter((p) => p.status === 'menunggu')

/** Jawaban server untuk tindakan yang ditahan menunggu persetujuan super admin. */
export const menungguPersetujuan = (hasil) => Boolean(hasil?.menunggu)

const TANPA_SERVER = 'Persetujuan Super Admin hanya tersedia saat terhubung ke basis data.'

/** Super admin memutuskan; false bila sudah diputuskan. Jawaban berisi status 'disetujui' | 'ditolak' | 'gagal'. */
export async function putuskanPermintaan(id, keputusan, catatan) {
  if (modeLokal()) throw new Error(TANPA_SERVER)
  const hasil = await tulis('/api/persetujuan/keputusan', { id, keputusan, catatan })
  // Permintaan ubah bobot yang dijalankan membawa kurikulum baru; dipasang supaya transkrip ikut dihitung ulang.
  if (hasil.kurikulum) {
    isiKurikulum(hasil.kurikulum)
    berubah()
  }
  return hasil
}

/** Admin menarik permintaannya sendiri; false bila sudah diputuskan. */
export async function batalkanPermintaan(id) {
  if (modeLokal()) throw new Error(TANPA_SERVER)
  return (await tulis('/api/persetujuan/batal', { id })).ok
}

/* ------------------------------ akses pengguna ------------------------------ */

/* Akun mahasiswa, dosen, dan admin beserta status aksesnya (Pengguna.aktif), hanya untuk super admin; lihat README.md ›
   Panel Super Admin › Akses Pengguna. Daftarnya tidak ikut /api/data, jadi dibaca terpisah dan perubahan tidak
   memuat ulang data lain. Tanpa server, daftarnya diisi skrip uji lewat AKUN_LOKAL. */
export const AKUN_LOKAL = []

// Sama dengan aturan yang diminta untuk /api/akses/ubah; server tetap yang memutuskan.
export const ALASAN_AKSES_MIN = 10

/**
 * { akun: [{ id, email, peran: 'mahasiswa' | 'dosen' | 'admin' | 'superadmin', aktif, nama?, nip?, nim?, prodi?,
 * angkatan? }] }; nip untuk dosen, nim dan angkatan (label) untuk mahasiswa.
 */
export async function muatAkses() {
  if (modeLokal()) return { akun: AKUN_LOKAL.map((a) => ({ ...a })) }
  return kirim('/api/akses', { isi: {} })
}

/** Mencabut (aktif false) atau memulihkan (aktif true) akses satu akun; jawabannya { akun } yang baru. */
export async function ubahAkses({ id, aktif, alasan }) {
  if (!modeLokal()) return kirim('/api/akses/ubah', { isi: { id, aktif, alasan } })
  const a = AKUN_LOKAL.find((x) => x.id === id)
  if (!a) throw new Error('Akun tidak ditemukan.')
  if (a.peran === 'superadmin') throw new Error('Akses Super Admin diatur langsung di basis data.')
  if (String(alasan ?? '').trim().length < ALASAN_AKSES_MIN) throw new Error('Alasan wajib diisi, minimal 10 karakter.')
  a.aktif = Boolean(aktif)
  return { akun: { ...a } }
}
// Sama dengan aturan /api/akses/tambah; server tetap yang memutuskan.
export const SANDI_AWAL_MIN = 8

/** Menambah akun mahasiswa, dosen, atau admin; jawabannya { akun } baru dalam bentuk yang sama dengan muatAkses. */
export async function tambahAkun(isi) {
  if (modeLokal()) throw new Error('Menambah akun hanya bisa saat terhubung ke basis data.')
  return kirim('/api/akses/tambah', { isi })
}

/**
 * Mengubah kelas seorang dosen: `isi` = { id, prodi, sumber, semester, angkatan: [id angkatan] } ([] = otomatis);
 * jawabannya { akun }. Lihat ubahKelasDosen di src/server/akses.js.
 */
export async function ubahKelasDosen(isi) {
  if (modeLokal()) throw new Error('Kelas dosen hanya bisa diubah saat terhubung ke basis data.')
  return kirim('/api/akses/kelas', { isi })
}

/**
 * Menghapus permanen akun yang aksesnya sudah dicabut; jawabannya { id }. Server menolak akun yang masih punya
 * data (nilai, pengumpulan, riwayat tindakan) dengan pesan yang menyebut datanya; lihat hapusAkun() di
 * src/server/akses.js.
 */
export async function hapusAkun({ id, alasan }) {
  if (!modeLokal()) return kirim('/api/akses/hapus', { isi: { id, alasan } })
  const i = AKUN_LOKAL.findIndex((x) => x.id === id)
  if (i < 0) throw new Error('Akun tidak ditemukan. Mungkin sudah dihapus.')
  if (AKUN_LOKAL[i].peran === 'superadmin') throw new Error('Akun Super Admin diatur langsung di basis data.')
  if (AKUN_LOKAL[i].aktif) throw new Error('Cabut dulu akses akun ini sebelum menghapusnya.')
  if (String(alasan ?? '').trim().length < ALASAN_AKSES_MIN) throw new Error('Alasan wajib diisi, minimal 10 karakter.')
  AKUN_LOKAL.splice(i, 1)
  return { id }
}

/**
 * Memberi (aktif true) atau mencabut (aktif false) izin lihat data master satu akun admin; jawabannya { akun }
 * baru. Hanya super admin; lihat aturIzinMaster() di src/server/akses.js.
 */
export async function aturIzinMaster({ id, aktif, alasan }) {
  if (!modeLokal()) return kirim('/api/akses/izin', { isi: { id, aktif, alasan } })
  const a = AKUN_LOKAL.find((x) => x.id === id)
  if (!a) throw new Error('Akun tidak ditemukan.')
  if (a.peran !== 'admin') throw new Error('Izin lihat data master hanya untuk akun admin Kemahasiswaan.')
  if (String(alasan ?? '').trim().length < ALASAN_AKSES_MIN) throw new Error('Alasan wajib diisi, minimal 10 karakter.')
  a.kelolaMaster = Boolean(aktif)
  return { akun: { ...a } }
}

/* -------------------------------- data master ------------------------------- */

/**
 * Admin biasa meminta akses baca data master; selalu menjadi permintaan ke super admin, jadi jawabannya
 * { menunggu, permintaan }. Lihat AKSES_DATA_MASTER di src/server/persetujuan.js.
 */
export async function mintaAksesMaster({ alasan }) {
  if (modeLokal()) throw new Error('Permintaan akses hanya bisa dikirim saat terhubung ke basis data.')
  return tulis('/api/master/akses', { alasan })
}

/* Tambah/ubah angkatan, fakultas, prodi, dan mahasiswa oleh super admin; admin yang diberi izin hanya melihat. Lihat
   src/server/dataMaster.js dan README.md › Data master. Data master dipasang app/layout.jsx sekali saat halaman
   dimuat, jadi jawaban server yang membawa `master` dipasang di sini supaya pilihan angkatan dan prodi di semua
   halaman langsung ikut berubah, lalu data mahasiswa dimuat ulang (nama prodi atau mahasiswa bisa berubah). */

async function tulisMaster(alamat, isi) {
  if (modeLokal()) throw new Error('Data master hanya bisa diubah saat terhubung ke basis data.')
  const hasil = await kirim(alamat, { isi })
  if (hasil.master) isiMaster(hasil.master)
  await muatDariServer()
  return hasil
}

/** { aksi: 'tambah', tahun, semester: 'Ganjil' | 'Genap' } atau { aksi: 'ubah', id, label, alasan }. */
export const simpanAngkatan = (isi) => tulisMaster('/api/master/angkatan', isi)

/**
 * Fakultas: { jenis: 'fakultas', aksi: 'tambah', nama } atau { jenis: 'fakultas', aksi: 'ubah', nama, namaBaru, alasan }.
 * Prodi: { jenis: 'prodi', aksi: 'tambah', nama, jenjang, fakultas } atau { ..., aksi: 'ubah', nama, namaBaru?,
 * jenjang?, fakultas?, alasan }. Fakultas dan prodi dikenali dari namanya.
 */
export const simpanProdi = (isi) => tulisMaster('/api/master/prodi', isi)

/**
 * { aksi: 'tambah', email, sandi, nim, nama, prodi, angkatanId } atau { aksi: 'ubah', nim, nama?, email?, prodi?,
 * angkatanId?, alasan }. NIM tidak bisa diubah.
 */
export const simpanMahasiswa = (isi) => tulisMaster('/api/master/mahasiswa', isi)

/* ---------------------------------- nilai --------------------------------- */

/** Batch yang tersimpan, atau { menunggu, permintaan } bila menunggu persetujuan super admin. */
export async function simpanBatch(isi) {
  if (modeLokal()) return simpanBatchLokal(isi)
  const { sumber, semester, angkatanId, cara, entri, alasan } = isi
  return tulis('/api/nilai', { sumber, semester, angkatanId, cara, entri, alasan })
}

/**
 * false bila sudah dibatalkan; { menunggu, permintaan } bila menunggu persetujuan super admin.
 * `alasan` dituntut server bila batch menyentuh data terkunci atau mahasiswa yang sudah lewat Semester 3.
 */
export async function rollbackBatch(id, alasan) {
  if (modeLokal()) return rollbackBatchLokal(id)
  const hasil = await tulis('/api/nilai/rollback', { id, alasan })
  return menungguPersetujuan(hasil) ? hasil : hasil.ok
}

/** status: 'final' | 'sementara' | null (ikuti CONFIG.PENGUNCIAN_ASPEK). Jawaban server diteruskan. */
export async function setPenguncian(isi) {
  if (modeLokal()) return setPenguncianLokal(isi)
  return tulis('/api/penguncian', {
    daftar: [{ nim: isi.nim, aspekId: isi.aspekId }],
    status: isi.status ?? null,
    alasan: isi.alasan,
  })
}

export async function setPenguncianBanyak(daftar, opsi) {
  if (modeLokal()) return setPenguncianBanyakLokal(daftar, opsi)
  return tulis('/api/penguncian', {
    daftar: daftar.map(({ nim, aspekId }) => ({ nim, aspekId })),
    status: opsi.status ?? null,
    alasan: opsi.alasan,
  })
}

/** false bila pengajuannya tidak ditemukan atau sudah diputuskan. */
/**
 * Keputusan dua lapis atas pengajuan koreksi; `opsi` = { catatan, nilaiBaru, aktor, superAdmin }. Admin biasa
 * meneruskan dengan nilai usulan, super admin menerapkannya. false bila sudah diputuskan atau menunggu lapis lain.
 */
export async function putuskanKoreksi(id, keputusan, opsi = {}) {
  if (modeLokal()) return putuskanKoreksiLokal(id, keputusan, opsi)
  return (
    await tulis('/api/koreksi/keputusan', { id, keputusan, catatan: opsi.catatan ?? null, nilaiBaru: opsi.nilaiBaru ?? null })
  ).ok
}

/**
 * Dosen mengunggah nilai kelasnya: `isi` = { dosen, entri: [{ nim, komponenId, nilai }], alasan }. Yang biasa langsung
 * tersimpan; nilai untuk angkatan yang sudah selesai atau disahkan, atau aspek final, diajukan ke Super Admin dengan
 * `alasan`. Jawabannya { id, jumlah, sama, permintaan } (id null bila tidak ada yang langsung tersimpan, permintaan null
 * bila tidak ada yang diajukan). Lihat unggahNilaiDosen di server.
 */
export async function unggahNilaiDosen(isi) {
  if (modeLokal()) return unggahNilaiDosenLokal(isi)
  return tulis('/api/nilai/dosen', { entri: isi.entri, alasan: isi.alasan ?? null })
}

/** false bila sudah diputuskan sebelumnya; { menunggu, permintaan } bila menunggu persetujuan super admin. */
export async function putuskanUsulan(id, keputusan, opsi = {}) {
  if (modeLokal()) return putuskanUsulanLokal(id, keputusan, opsi)
  const hasil = await tulis('/api/usulan/keputusan', { id, keputusan, catatan: opsi.catatan ?? '' })
  return menungguPersetujuan(hasil) ? hasil : hasil.ok
}

/** Satu-satunya aksi tulis mahasiswa (R8); tidak mengubah nilai. */
export async function ajukanKoreksi(isi) {
  if (modeLokal()) return ajukanKoreksiLokal(isi)
  const { id } = await tulis('/api/koreksi', {
    komponenId: isi.komponenId,
    alasan: isi.alasan,
    nilaiDiharapkan: isi.nilaiDiharapkan ?? null,
  })
  return PENGAJUAN_KOREKSI.find((k) => k.id === id) ?? { id }
}

/* ---------------------------- penguncian angkatan ------------------------- */

function tandaiAngkatanTerkunci(angkatanId) {
  const c = COHORTS.find((x) => x.id === angkatanId)
  if (c) c.status = 'terkunci'
  for (const s of STUDENTS) if (s.angkatanId === angkatanId) s.statusAngkatan = 'terkunci'
  berubah()
}

function kunciAngkatanLokal({ angkatanId, konfirmasi }) {
  const c = COHORTS.find((x) => x.id === angkatanId)
  if (!c) throw new Error('Angkatan tidak dikenal.')
  if (c.status === 'terkunci') return false
  if (String(konfirmasi ?? '').trim() !== c.label) throw new Error('Konfirmasi tidak cocok. Ketik persis: ' + c.label)
  tandaiAngkatanTerkunci(angkatanId)
  return true
}

/**
 * Satu-satunya pemanggil API penguncian angkatan. false bila sudah terkunci; { menunggu, permintaan } bila admin
 * biasa: angkatan baru boleh dikunci sesudah Semester 3, jadi selalu menunggu persetujuan super admin.
 */
export async function kunciAngkatan({ angkatanId, konfirmasi, alasan }) {
  if (modeLokal()) return kunciAngkatanLokal({ angkatanId, konfirmasi })
  const hasil = await tulis('/api/angkatan/kunci', { angkatanId, konfirmasi, alasan })
  if (menungguPersetujuan(hasil)) return hasil
  // Status angkatan di data master baru ikut berubah saat halaman dimuat ulang, jadi disamakan di sini.
  if (hasil.ok) tandaiAngkatanTerkunci(angkatanId)
  return Boolean(hasil.ok)
}

/* ------------------------------ bobot kurikulum --------------------------- */

/* Mode lokal: bobot hanya diganti di memori dan hilang saat halaman dimuat ulang. */
function simpanBobotLokal({ pengaturan, aspek }) {
  const masalah = periksaBobot({ pengaturan, aspek })
  if (masalah.length) throw new Error(masalah[0].pesan)
  for (const k of KOMPONEN) k.bobot = aspek[k.aspekId]?.[k.id] ?? null
  updateConfig(pengaturan)
  berubah()
  return { ok: true }
}

/**
 * Menyimpan susunan bobot (lihat src/lib/bobot.js). Kurikulum yang tersimpan di basis data langsung dipasang,
 * jadi transkrip di layar ikut dihitung ulang tanpa memuat ulang halaman.
 */
export async function simpanBobot({ pengaturan, aspek, alasan }) {
  if (modeLokal()) return simpanBobotLokal({ pengaturan, aspek })
  const hasil = await kirim('/api/kurikulum/bobot', {
    isi: { versi: KURIKULUM_TERPASANG.versi, pengaturan, aspek, alasan },
  })
  // Menunggu persetujuan super admin: kurikulum belum berubah, hanya daftar permintaan yang dimuat ulang.
  if (menungguPersetujuan(hasil)) {
    await muatDariServer()
    return hasil
  }
  isiKurikulum(hasil.kurikulum ?? {})
  berubah()
  return hasil
}

/* ------------------------------ periode akademik --------------------------- */

/**
 * Super admin memindahkan periode akademik satu semester maju atau mundur (src/server/periode.js). Semester
 * mahasiswa dihitung server, jadi data dimuat ulang sesudahnya. Jawabannya { periode }.
 */
export async function ubahPeriode({ tahun, semester, alasan }) {
  if (modeLokal()) throw new Error('Mengubah periode hanya tersedia saat terhubung ke basis data.')
  const hasil = await kirim('/api/periode', { isi: { tahun, semester, alasan } })
  pasangPeriode(hasil.periode)
  await muatDariServer()
  return hasil
}

/* ----------------------- penilaian satu aspek (Input Manual) --------------------- */

/**
 * Menyimpan susunan penilaian satu aspek (lihat src/lib/penilaian.js). Super admin: kurikulum baru langsung
 * dipasang dan data dimuat ulang (nilai komponen yang dipulihkan ikut terbaca lagi). Admin biasa: jawabannya
 * { menunggu, permintaan } dan belum ada yang berubah.
 */
export async function simpanPenilaian({ aspekId, aspek, komponen, alasan }) {
  if (modeLokal()) throw new Error('Mengubah penilaian hanya tersedia saat terhubung ke basis data.')
  const hasil = await kirim('/api/kurikulum/penilaian', {
    isi: { versi: KURIKULUM_TERPASANG.versi, aspekId, aspek, komponen, alasan },
  })
  if (!menungguPersetujuan(hasil)) isiKurikulum(hasil.kurikulum ?? {})
  await muatDariServer()
  return hasil
}

/* ----------------------------- aspek CPMK itu sendiri ---------------------------- */

/**
 * Menambah, mengubah struktur (kode, cluster, semester), mengarsipkan, atau memulihkan aspek; bentuk isinya di
 * src/lib/aspek.js. Super admin: kurikulum baru langsung dipasang. Admin biasa: jawabannya { menunggu, permintaan }
 * dan belum ada yang berubah. Lihat src/server/aspek.js.
 */
export async function simpanAspek(isi) {
  if (modeLokal()) throw new Error('Mengelola aspek hanya tersedia saat terhubung ke basis data.')
  const hasil = await kirim('/api/kurikulum/aspek', { isi: { versi: KURIKULUM_TERPASANG.versi, ...isi } })
  if (!menungguPersetujuan(hasil)) isiKurikulum(hasil.kurikulum ?? {})
  await muatDariServer()
  return hasil
}

/* ------------------------------- saat dimuat ------------------------------ */

if (adaPenyimpanan()) {
  try {
    localStorage.removeItem(KUNCI_LAMA)
    if (!modeLokal()) localStorage.removeItem(KUNCI)
  } catch {
  }
}

if (modeLokal()) {
  muatDariPenyimpanan()

  if (typeof window !== 'undefined' && adaPenyimpanan()) {
    window.addEventListener('storage', (e) => {
      if (e.key === KUNCI && !sedangMenulis) muatDariPenyimpanan()
    })
  }
}

export const peringatanSesi = () =>
  !modeLokal()
    ? 'Setiap penyimpanan langsung tercatat di basis data dan bisa dibatalkan per batch.'
    : SIMPAN_PERUBAHAN
      ? 'Perubahan tersimpan di peramban ini dan bertahan setelah halaman dimuat ulang. Purwarupa ini belum terhubung ke basis data kampus.'
      : 'Perubahan tersimpan selama sesi ini saja dan hilang bila halaman dimuat ulang.'


/* ------------------------- pengajuan koreksi mahasiswa -------------------- */

function ajukanKoreksiLokal({ student, komponenId, alasan, nilaiDiharapkan = null }) {
  const komponen = getKomponenById(komponenId)
  if (!komponen) throw new Error('Komponen tidak dikenal.')
  if (!String(alasan ?? '').trim()) throw new Error('Alasan pengajuan wajib diisi.')
  if (nilaiDiharapkan != null && !(nilaiDiharapkan >= 0 && nilaiDiharapkan <= 100)) {
    throw new Error('Nilai yang diharapkan harus 0–100.')
  }
  if (PENGAJUAN_KOREKSI.some((k) => k.nim === student.nim && k.komponenId === komponenId && k.status.startsWith('menunggu'))) {
    throw new Error('Pengajuan untuk komponen ini masih diproses. Tunggu keputusannya dulu.')
  }

  const pengajuan = {
    id: 'K-' + Date.now().toString(36).toUpperCase().slice(-5),
    nim: student.nim,
    nama: student.name,
    komponenId,
    komponenLabel: komponen.label,
    aspekId: komponen.aspekId,
    alasan: String(alasan).trim(),
    nilaiDiharapkan,
    nilaiUsulan: null,
    lapis1: null,
    status: 'menunggu_admin',
    diajukan: new Date().toISOString().slice(0, 10),
    keputusan: null,
    baru: true,
  }

  PENGAJUAN_KOREKSI.unshift(pengajuan)
  berubah()
  simpanKePenyimpanan()
  return pengajuan
}

export const koreksiMilik = (nim) => PENGAJUAN_KOREKSI.filter((k) => k.nim === nim)
