import { CONFIG } from './config.js'
import { BIDANG_ASPEK, CLUSTER, denganAspekSementara, getAspek, getAspekArsip, getAspekList } from './curriculum.js'
import { BATAS_DESKRIPSI, BATAS_LABEL, komponenSementara, periksaPenilaian } from './penilaian.js'
import { dampakDari } from './bobot.js'

/* --------------------------------------------------------------------------
   Mengelola aspek CPMK itu sendiri: menambah aspek baru, mengubah strukturnya
   (kode tampilan, cluster, semester), mengarsipkan, dan memulihkan. Layar
   memakai ini untuk pemeriksaan dan pratinjau dampak; server memakainya lagi
   sebelum menyimpan (src/server/aspek.js), jadi aturannya ditulis sekali.
   Teks dan komponen aspek yang sudah ada tetap diubah lewat src/lib/penilaian.js.

   Isi satu permintaan:
     tambah    { aksi, cluster, semester, kode, nama, deskripsi, pdp, mk, engagement, komponen: [...], alasan }
     ubah      { aksi, id, kode?, cluster?, semester?, alasan }
     arsipkan  { aksi, id, alasan }
     pulihkan  { aksi, id, alasan }
   ID aspek tidak pernah berubah: ia menempel di ID komponen ('A1-MK-T1'), nilai, dan penguncian.
   -------------------------------------------------------------------------- */

export const AKSI_ASPEK = ['tambah', 'ubah', 'arsipkan', 'pulihkan']
// Sama dengan ALASAN_MIN di src/server/nilai.js; server tetap yang memutuskan.
export const ALASAN_ASPEK_MIN = 10

const POLA_KODE = /^[A-Z]{1,2}\.\d{1,2}\.?$/
const teks = (v) => String(v ?? '').trim()
const semuaAspek = () => [...getAspekList(), ...getAspekArsip()]

/** 'c.3', 'C.3', dan 'C.3.' menjadi 'C.3.'; null bila bentuknya bukan huruf, titik, angka. */
export function rapikanKode(kode) {
  const s = teks(kode).toUpperCase()
  if (!POLA_KODE.test(s)) return null
  return s.endsWith('.') ? s : s + '.'
}

/** ID aspek baru di cluster itu: huruf area lalu nomor berikutnya. ID yang pernah dipakai (termasuk arsip) dilewati. */
export function idAspekBaru(clusterId, terpakai = semuaAspek().map((a) => a.id)) {
  const area = CLUSTER.find((c) => c.id === clusterId)?.area
  if (!area) return null
  const nomor = terpakai
    .filter((id) => id.startsWith(area) && /^\d+$/.test(id.slice(area.length)))
    .map((id) => Number(id.slice(area.length)))
  return area + (Math.max(0, ...nomor) + 1)
}

/** Kode tampilan usulan untuk aspek baru di cluster itu ('C.3.'), yang belum dipakai aspek mana pun. */
export function kodeAspekBaru(clusterId) {
  const id = idAspekBaru(clusterId)
  if (!id) return ''
  const area = id.replace(/\d+$/, '')
  const dipakai = new Set(semuaAspek().map((a) => a.kode))
  let n = Number(id.slice(area.length))
  while (dipakai.has(area + '.' + n + '.')) n++
  return area + '.' + n + '.'
}

const rapikanKomponen = (k) =>
  k && typeof k === 'object'
    ? {
        id: null,
        label: teks(k.label),
        sumber: k.sumber,
        jenis: k.sumber === 'MK' ? (k.jenis ?? null) : null,
        ranah: k.ranah,
        status: k.status ?? 'resmi',
        aktif: true,
        bobot: null,
      }
    : k

/** Isi permintaan yang sudah dirapikan: teks di-trim, kode dibakukan, semester berupa angka. */
export function rapikanIsiAspek(isi = {}) {
  const angka = (v) => (v == null || v === '' ? null : Number(v))
  const kode = (v) => (v == null || v === '' ? null : (rapikanKode(v) ?? teks(v)))
  const rapi = { aksi: isi.aksi, alasan: teks(isi.alasan) }
  if (isi.aksi === 'tambah') {
    Object.assign(rapi, {
      cluster: isi.cluster ?? null,
      semester: angka(isi.semester),
      kode: kode(isi.kode),
      ...Object.fromEntries(BIDANG_ASPEK.map((b) => [b, teks(isi[b]) || null])),
      komponen: Array.isArray(isi.komponen) ? isi.komponen.map(rapikanKomponen) : [],
    })
  } else {
    rapi.id = teks(isi.id)
    if (isi.aksi === 'ubah') {
      if (isi.kode !== undefined) rapi.kode = kode(isi.kode)
      if (isi.cluster !== undefined) rapi.cluster = isi.cluster
      if (isi.semester !== undefined) rapi.semester = angka(isi.semester)
    }
  }
  return rapi
}

/** Struktur yang benar-benar berubah pada permintaan 'ubah': { kode?, cluster?, semester? }. */
export function bedaStruktur(isi) {
  const a = getAspek(isi.id)
  if (!a) return {}
  return Object.fromEntries(['kode', 'cluster', 'semester'].filter((b) => isi[b] != null && isi[b] !== a[b]).map((b) => [b, isi[b]]))
}

/** Masalah pada permintaan (yang sudah dirapikan); kosong berarti sah. Tiap masalah { bidang?, pesan }. */
export function periksaAspek(isi) {
  const masalah = []
  if (!AKSI_ASPEK.includes(isi?.aksi)) return [{ pesan: 'Aksi aspek harus tambah, ubah, arsipkan, atau pulihkan.' }]
  if (teks(isi.alasan).length < ALASAN_ASPEK_MIN) {
    masalah.push({ bidang: 'alasan', pesan: 'Alasan wajib diisi, minimal ' + ALASAN_ASPEK_MIN + ' karakter.' })
  }

  const cekCluster = () => {
    if (!CLUSTER.some((c) => c.id === isi.cluster)) masalah.push({ bidang: 'cluster', pesan: 'Cluster tidak dikenal.' })
  }
  const cekSemester = () => {
    if (!Number.isInteger(isi.semester) || isi.semester < 1 || isi.semester > CONFIG.TOTAL_SEMESTER_PROGRAM) {
      masalah.push({ bidang: 'semester', pesan: 'Semester harus 1 sampai ' + CONFIG.TOTAL_SEMESTER_PROGRAM + '.' })
    }
  }
  // Kode tidak boleh kembar dengan aspek mana pun, termasuk yang diarsipkan (supaya bisa dipulihkan tanpa bentrok).
  const cekKode = (kecuali = null) => {
    if (!rapikanKode(isi.kode)) {
      masalah.push({ bidang: 'kode', pesan: 'Kode harus berbentuk huruf, titik, angka, misalnya C.3.' })
    } else if (semuaAspek().some((a) => a.id !== kecuali && a.kode === isi.kode)) {
      masalah.push({ bidang: 'kode', pesan: 'Kode ' + isi.kode + ' sudah dipakai aspek lain.' })
    }
  }

  if (isi.aksi === 'tambah') {
    cekCluster()
    cekSemester()
    cekKode()
    if (!idAspekBaru(isi.cluster) && !masalah.some((m) => m.bidang === 'cluster')) masalah.push({ pesan: 'ID aspek baru tidak bisa dibentuk.' })
    if (!teks(isi.nama)) masalah.push({ bidang: 'nama', pesan: 'Nama aspek wajib diisi.' })
    if (teks(isi.nama).length > BATAS_LABEL) masalah.push({ bidang: 'nama', pesan: 'Nama aspek paling panjang ' + BATAS_LABEL + ' karakter.' })
    if (!teks(isi.deskripsi)) masalah.push({ bidang: 'deskripsi', pesan: 'Deskripsi aspek wajib diisi.' })
    if (teks(isi.deskripsi).length > BATAS_DESKRIPSI) {
      masalah.push({ bidang: 'deskripsi', pesan: 'Deskripsi aspek paling panjang ' + BATAS_DESKRIPSI + ' karakter.' })
    }
    for (const b of ['pdp', 'mk', 'engagement']) {
      if (teks(isi[b]).length > BATAS_LABEL) masalah.push({ bidang: b, pesan: 'Isian ' + b + ' paling panjang ' + BATAS_LABEL + ' karakter.' })
    }
    // Komponen baru diperiksa dengan aturan yang sama dengan editor penilaian; minimal satu.
    const komponen = Array.isArray(isi.komponen) ? isi.komponen : []
    if (!komponen.length) masalah.push({ bidang: 'komponen', pesan: 'Aspek baru harus punya minimal satu komponen.' })
    else {
      const aspekSementara = { nama: isi.nama || '-', deskripsi: isi.deskripsi || '-' }
      for (const m of periksaPenilaian({ aspek: aspekSementara, komponen }, { idLama: new Set() })) {
        masalah.push({ bidang: 'komponen', pesan: m.pesan })
      }
    }
    return masalah
  }

  const a = getAspek(isi.id)
  if (!a) return [...masalah, { pesan: 'Aspek tidak dikenal.' }]

  if (isi.aksi === 'ubah') {
    if (!a.aktif) masalah.push({ pesan: 'Aspek ' + a.kode + ' sudah diarsipkan. Pulihkan dulu sebelum mengubahnya.' })
    if (isi.cluster != null) cekCluster()
    if (isi.semester != null) cekSemester()
    if (isi.kode != null) cekKode(a.id)
    if (!masalah.length && !Object.keys(bedaStruktur(isi)).length) masalah.push({ pesan: 'Tidak ada perubahan struktur aspek untuk disimpan.' })
  }
  if (isi.aksi === 'arsipkan') {
    if (!a.aktif) masalah.push({ pesan: 'Aspek ' + a.kode + ' sudah diarsipkan.' })
    else if (getAspekList().length <= 1) masalah.push({ pesan: 'Aspek aktif terakhir tidak bisa diarsipkan.' })
  }
  if (isi.aksi === 'pulihkan' && a.aktif) masalah.push({ pesan: 'Aspek ' + a.kode + ' tidak sedang diarsipkan.' })
  return masalah
}

/**
 * Perubahan sebagai timpaan aspek untuk denganAspekSementara(): { id, timpa, komponen }. `komponen` hanya untuk
 * aspek baru, dengan ID sementara ('BARU-1'); ID aslinya dibentuk server saat menyimpan.
 */
export function susunPerubahan(isi) {
  if (isi.aksi === 'tambah') {
    const id = idAspekBaru(isi.cluster)
    return {
      id,
      timpa: {
        ...Object.fromEntries(BIDANG_ASPEK.map((b) => [b, isi[b] ?? null])),
        kode: isi.kode,
        cluster: isi.cluster,
        semester: isi.semester,
        aktif: true,
      },
      komponen: komponenSementara(id, { komponen: isi.komponen }),
    }
  }
  if (isi.aksi === 'ubah') return { id: isi.id, timpa: bedaStruktur(isi), komponen: null }
  return { id: isi.id, timpa: { aktif: isi.aksi === 'pulihkan' }, komponen: null }
}

/** Dampak perubahan terhadap `mahasiswa` (bentuk dampakDari di src/lib/bobot.js). */
export function dampakAspek(mahasiswa, perubahan, batas = 20) {
  return dampakDari(mahasiswa, (fn) => denganAspekSementara(perubahan.id, perubahan.timpa, perubahan.komponen, fn), batas)
}
