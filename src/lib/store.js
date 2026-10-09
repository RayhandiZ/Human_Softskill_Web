import { useSyncExternalStore } from 'react'
import { getKomponenById } from './curriculum.js'
import { periksaUsulan } from './rules.js'
import {
  AUDIT_LOG,
  COHORTS,
  PENGAJUAN_KOREKSI,
  STUDENTS,
  USULAN_AWAL,
  getStudentByNim,
  isiData,
  resetTranskripCache,
} from './data.js'
import { kirim } from './kirim.js'
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

function putuskanKoreksiLokal(id, keputusan, { aktor, catatan }) {
  const k = PENGAJUAN_KOREKSI.find((x) => x.id === id)
  if (!k) return false
  k.status = keputusan
  k.keputusan = { oleh: aktor, tanggal: new Date().toISOString().slice(0, 10), catatan }
  berubah()
  simpanKePenyimpanan()
  return true
}

/* --------------------------- usulan nilai dosen --------------------------- */

/* Dosen tidak menulis ke transkrip; lihat README.md › Usulan nilai dosen. */

export const USULAN_NILAI = [...USULAN_AWAL]

let urutUsulan = 0

function usulkanNilaiLokal({ dosen, cara = 'manual', catatan = '', entri }) {
  if (!dosen?.nip) throw new Error('Usulan harus punya dosen pengusul.')
  const bersih = (entri ?? []).filter(
    (e) => e && e.nim && e.komponenId && Number.isFinite(Number(e.nilai)),
  )
  if (!bersih.length) throw new Error('Tidak ada nilai yang bisa diusulkan.')

  const angkatan = [
    ...new Set(bersih.map((e) => getStudentByNim(e.nim)?.angkatanId).filter(Boolean)),
  ]

  urutUsulan++
  const usulan = {
    id: 'U-' + String(urutUsulan).padStart(3, '0'),
    dosenNip: dosen.nip,
    dosenNama: dosen.nama ?? dosen.name ?? dosen.nip,
    sumber: dosen.sumber,
    semester: dosen.semester,
    prodi: dosen.prodi ?? null,
    angkatanId: angkatan.length === 1 ? angkatan[0] : 'campuran',
    cara,
    catatan: String(catatan ?? '').trim(),
    waktu: waktuSekarang(),
    status: 'menunggu',
    entri: bersih.map(({ nim, komponenId, nilai }) => ({
      nim,
      nama: getStudentByNim(nim)?.name ?? nim,
      komponenId,
      nilai: Number(nilai),
    })),
    keputusan: null,
    batchId: null,
  }

  USULAN_NILAI.unshift(usulan)
  berubah()
  simpanKePenyimpanan()
  return usulan
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

export const usulanDosen = (nip) => USULAN_NILAI.filter((u) => u.dosenNip === nip)

let petaUsulan = null
let petaVersi = -1

function segarkanPeta() {
  if (petaVersi === versi && petaUsulan) return petaUsulan
  petaUsulan = new Map()
  /* Dibaca dari belakang supaya usulan terbaru yang menang. */
  for (let i = USULAN_NILAI.length - 1; i >= 0; i--) {
    const u = USULAN_NILAI[i]
    for (const e of u.entri) petaUsulan.set(e.nim + '|' + e.komponenId, { usulan: u, entri: e })
  }
  petaVersi = versi
  return petaUsulan
}

/** Dihitung, bukan disimpan: masuk | menunggu | ditolak | dinilai. */
export function statusPengumpulan({ nim, komponenId, aspekId }) {
  const tersimpan = getStudentByNim(nim)?.nilai?.[aspekId]?.komponen?.[komponenId]
  if (tersimpan) return { id: 'dinilai', nilai: tersimpan.nilai, oleh: tersimpan.penilai }

  const jejak = segarkanPeta().get(nim + '|' + komponenId)
  if (jejak?.usulan.status === 'menunggu') {
    return { id: 'menunggu', nilai: jejak.entri.nilai, oleh: jejak.usulan.dosenNama }
  }
  if (jejak?.usulan.status === 'ditolak') {
    return {
      id: 'ditolak',
      nilai: jejak.entri.nilai,
      catatan: jejak.usulan.keputusan?.catatan ?? '',
    }
  }
  return { id: 'masuk', nilai: null }
}

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
        urutUsulan,
        usulan: USULAN_NILAI,
        batch: BATCH_SESI.map(({ id, sumber, semester, angkatanId, aktor, cara, waktu, status, entri }) => ({
          id, sumber, semester, angkatanId, aktor, cara, waktu, status, entri,
        })),
        penguncian: PENGUNCIAN,
        koreksi: Object.fromEntries(
          PENGAJUAN_KOREKSI.filter((k) => k.keputusan).map((k) => [k.id, { status: k.status, keputusan: k.keputusan }]),
        ),
        koreksiBaru: PENGAJUAN_KOREKSI.filter((k) => k.baru),
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
    urutUsulan = data.urutUsulan ?? 0
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
  urut = 0
  urutUsulan = 0
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
    USULAN_NILAI.splice(0, USULAN_NILAI.length, ...isi.usulan)
    BATCH_SESI.splice(0, BATCH_SESI.length, ...isi.batch)
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
  muat = { keadaan: 'belum', pesan: null }
  berubah()
}

async function tulis(alamat, isi) {
  const hasil = await kirim(alamat, { isi })
  await muatDariServer()
  return hasil
}

export async function simpanBatch(isi) {
  if (modeLokal()) return simpanBatchLokal(isi)
  const { sumber, semester, angkatanId, cara, entri, alasan } = isi
  return tulis('/api/nilai', { sumber, semester, angkatanId, cara, entri, alasan })
}

/** false bila sudah dibatalkan. `alasan` hanya dituntut server bila batch menyentuh data terkunci. */
export async function rollbackBatch(id, alasan) {
  if (modeLokal()) return rollbackBatchLokal(id)
  return (await tulis('/api/nilai/rollback', { id, alasan })).ok
}

/** status: 'final' | 'sementara' | null (ikuti CONFIG.PENGUNCIAN_ASPEK). */
export async function setPenguncian(isi) {
  if (modeLokal()) return setPenguncianLokal(isi)
  await tulis('/api/penguncian', { daftar: [{ nim: isi.nim, aspekId: isi.aspekId }], status: isi.status ?? null })
}

export async function setPenguncianBanyak(daftar, opsi) {
  if (modeLokal()) return setPenguncianBanyakLokal(daftar, opsi)
  await tulis('/api/penguncian', {
    daftar: daftar.map(({ nim, aspekId }) => ({ nim, aspekId })),
    status: opsi.status ?? null,
  })
}

/** false bila pengajuannya tidak ditemukan atau sudah diputuskan. */
export async function putuskanKoreksi(id, keputusan, opsi) {
  if (modeLokal()) return putuskanKoreksiLokal(id, keputusan, opsi)
  return (await tulis('/api/koreksi/keputusan', { id, keputusan, catatan: opsi?.catatan ?? null })).ok
}

export async function usulkanNilai(isi) {
  if (modeLokal()) return usulkanNilaiLokal(isi)
  const { id } = await tulis('/api/usulan', { cara: isi.cara, catatan: isi.catatan, entri: isi.entri })
  return USULAN_NILAI.find((u) => u.id === id) ?? { id, entri: isi.entri ?? [] }
}

/** false bila sudah diputuskan sebelumnya. */
export async function putuskanUsulan(id, keputusan, opsi = {}) {
  if (modeLokal()) return putuskanUsulanLokal(id, keputusan, opsi)
  return (await tulis('/api/usulan/keputusan', { id, keputusan, catatan: opsi.catatan ?? '' })).ok
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

/** Satu-satunya pemanggil API penguncian angkatan (API-nya belum final); false bila sudah terkunci. */
export async function kunciAngkatan({ angkatanId, konfirmasi }) {
  if (modeLokal()) return kunciAngkatanLokal({ angkatanId, konfirmasi })
  const hasil = await tulis('/api/angkatan/kunci', { angkatanId, konfirmasi })
  // Status angkatan di data master baru ikut berubah saat halaman dimuat ulang, jadi disamakan di sini.
  if (hasil.ok) tandaiAngkatanTerkunci(angkatanId)
  return Boolean(hasil.ok)
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

  const pengajuan = {
    id: 'K-' + Date.now().toString(36).toUpperCase().slice(-5),
    nim: student.nim,
    nama: student.name,
    komponenId,
    komponenLabel: komponen.label,
    aspekId: komponen.aspekId,
    alasan: String(alasan).trim(),
    nilaiDiharapkan,
    status: 'menunggu',
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
