import { BIDANG_ASPEK, JENIS_MK, KOMPONEN, RANAH, SUMBER, getAspek, getKomponen, getKomponenArsip } from './curriculum.js'
import { angkaBobotSah, genapSeratus } from './bobot.js'

/* --------------------------------------------------------------------------
   Penilaian satu aspek yang diubah dari Input Manual: teks aspek, daftar
   komponen asesmen (tambah, ubah, hapus ke arsip, pulihkan), dan bobotnya.
   Layar memakai ini untuk pemeriksaan dan pratinjau; server memakainya lagi
   sebelum menyimpan (src/server/penilaian.js), jadi aturannya ditulis sekali.

   Bentuk "susunan penilaian" satu aspek:
     aspek     { nama, deskripsi, pdp, mk, engagement }
     komponen  [{ id | null (baru), label, sumber, jenis, ranah, status, aktif, bobot }]
               SEMUA komponen aspek itu, termasuk yang diarsipkan (aktif false);
               urutan larik = urutan tampil.
   Struktur aspek (kode, fase, area, cluster, semester) tetap di kode.
   -------------------------------------------------------------------------- */

export const BATAS_LABEL = 191
export const BATAS_DESKRIPSI = 2000
export const STATUS_KOMPONEN = ['resmi', 'draft']

const SUMBER_ID = Object.keys(SUMBER)
const RANAH_ID = Object.keys(RANAH)
const teks = (v) => String(v ?? '').trim()

const ringkasKomponen = (k) => ({
  id: k.id,
  label: k.label,
  sumber: k.sumber,
  jenis: k.jenis ?? null,
  ranah: k.ranah,
  status: k.status,
  bobot: typeof k.bobot === 'number' ? k.bobot : null,
})

/** Susunan penilaian aspek yang sedang berlaku: komponen aktif dulu, lalu yang diarsipkan. */
export function susunanPenilaian(aspekId) {
  const a = getAspek(aspekId)
  return {
    aspek: Object.fromEntries(BIDANG_ASPEK.map((b) => [b, a?.[b] ?? null])),
    komponen: [
      ...getKomponen(aspekId).map((k) => ({ ...ringkasKomponen(k), aktif: true })),
      ...getKomponenArsip(aspekId).map((k) => ({ ...ringkasKomponen(k), aktif: false })),
    ],
  }
}

/**
 * Masalah pada susunan penilaian; kosong berarti sah. Tiap masalah { indeks | bidang, pesan }: `indeks` = baris
 * komponen, `bidang` = isian aspek atau 'bobot'. `konteks` dari server: `idLama` (semua id komponen aspek ini,
 * termasuk arsip), `dinilai` (id yang sudah punya nilai), `sumberLama` (Map id → sumber).
 */
export function periksaPenilaian(susunan, { idLama, dinilai = new Set(), sumberLama = new Map() }) {
  const masalah = []
  const aspek = susunan?.aspek
  const komponen = susunan?.komponen
  if (!aspek || typeof aspek !== 'object' || !Array.isArray(komponen)) return [{ pesan: 'Susunan penilaian tidak lengkap.' }]

  if (!teks(aspek.nama)) masalah.push({ bidang: 'nama', pesan: 'Nama aspek wajib diisi.' })
  if (teks(aspek.nama).length > BATAS_LABEL) masalah.push({ bidang: 'nama', pesan: 'Nama aspek paling panjang ' + BATAS_LABEL + ' karakter.' })
  if (!teks(aspek.deskripsi)) masalah.push({ bidang: 'deskripsi', pesan: 'Deskripsi aspek wajib diisi.' })
  if (teks(aspek.deskripsi).length > BATAS_DESKRIPSI) {
    masalah.push({ bidang: 'deskripsi', pesan: 'Deskripsi aspek paling panjang ' + BATAS_DESKRIPSI + ' karakter.' })
  }
  for (const b of ['pdp', 'mk', 'engagement']) {
    if (teks(aspek[b]).length > BATAS_LABEL) masalah.push({ bidang: b, pesan: 'Isian ' + b + ' paling panjang ' + BATAS_LABEL + ' karakter.' })
  }

  const terlihat = new Set()
  komponen.forEach((k, i) => {
    const sebut = 'Komponen ' + (i + 1)
    if (!k || typeof k !== 'object') return masalah.push({ indeks: i, pesan: sebut + ' tidak dikenal.' })
    if (k.id != null) {
      if (!idLama.has(k.id)) masalah.push({ indeks: i, pesan: sebut + ' (' + k.id + ') bukan milik aspek ini.' })
      if (terlihat.has(k.id)) masalah.push({ indeks: i, pesan: sebut + ' (' + k.id + ') terkirim dua kali.' })
      terlihat.add(k.id)
      if (dinilai.has(k.id) && sumberLama.get(k.id) !== k.sumber) {
        masalah.push({ indeks: i, pesan: k.id + ' sudah punya nilai, jadi sumbernya tidak bisa diganti. Arsipkan, lalu buat komponen baru.' })
      }
    }
    if (!teks(k.label)) masalah.push({ indeks: i, pesan: sebut + ': nama komponen wajib diisi.' })
    if (teks(k.label).length > BATAS_LABEL) masalah.push({ indeks: i, pesan: sebut + ': nama paling panjang ' + BATAS_LABEL + ' karakter.' })
    if (!SUMBER_ID.includes(k.sumber)) masalah.push({ indeks: i, pesan: sebut + ': sumber penilaian tidak dikenal.' })
    if (k.sumber === 'MK' && !JENIS_MK.includes(k.jenis)) masalah.push({ indeks: i, pesan: sebut + ': komponen MK wajib punya jenis (Tugas, Sikap, UTS, UAS).' })
    if (k.sumber !== 'MK' && k.jenis != null) masalah.push({ indeks: i, pesan: sebut + ': jenis hanya untuk komponen MK.' })
    if (!RANAH_ID.includes(k.ranah)) masalah.push({ indeks: i, pesan: sebut + ': ranah harus kognitif atau afektif.' })
    if (!STATUS_KOMPONEN.includes(k.status)) masalah.push({ indeks: i, pesan: sebut + ': status harus resmi atau draft.' })
    if (typeof k.aktif !== 'boolean') masalah.push({ indeks: i, pesan: sebut + ': status aktif tidak dikenal.' })
  })
  for (const id of idLama) {
    if (!terlihat.has(id)) masalah.push({ pesan: 'Komponen ' + id + ' tidak dikirim. Komponen tidak dihapus; arsipkan bila tidak dipakai.' })
  }

  const aktif = komponen.filter((k) => k?.aktif === true)
  if (!aktif.length) masalah.push({ pesan: 'Setiap aspek harus punya minimal satu komponen aktif.' })
  const bobot = aktif.map((k) => k.bobot)
  if (bobot.some((b) => b != null)) {
    if (!bobot.every(angkaBobotSah)) {
      masalah.push({ bidang: 'bobot', pesan: 'Bobot manual harus diisi untuk setiap komponen aktif, angka 0–100 dengan paling banyak dua desimal.' })
    } else if (!genapSeratus(bobot)) {
      masalah.push({ bidang: 'bobot', pesan: 'Bobot komponen aktif harus berjumlah 100, sekarang ' + bobot.reduce((a, b) => a + b, 0).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '.' })
    }
  }
  return masalah
}

const samaKomponen = (a, b) =>
  a.label === teks(b.label) && a.sumber === b.sumber && (a.jenis ?? null) === (b.jenis ?? null) && a.ranah === b.ranah && a.status === b.status

/** Apa saja yang berbeda di antara dua susunan penilaian satu aspek. */
export function bedaPenilaian(lama, baru) {
  const dariId = new Map(lama.komponen.map((k) => [k.id, k]))
  const beda = { aspek: [], ditambah: [], diubah: [], diarsipkan: [], dipulihkan: [], bobot: false, urutan: false }
  for (const b of BIDANG_ASPEK) if ((teks(lama.aspek[b]) || null) !== (teks(baru.aspek[b]) || null)) beda.aspek.push(b)
  for (const k of baru.komponen) {
    if (k.id == null) {
      beda.ditambah.push(teks(k.label))
      continue
    }
    const l = dariId.get(k.id)
    if (!l) continue
    if (!samaKomponen(l, k)) beda.diubah.push(k.id)
    if (l.aktif && !k.aktif) beda.diarsipkan.push(k.id)
    if (!l.aktif && k.aktif) beda.dipulihkan.push(k.id)
  }
  const bobotAktif = (s) => JSON.stringify(s.komponen.filter((k) => k.aktif).map((k) => [k.id, k.bobot ?? null]))
  beda.bobot = bobotAktif(lama) !== bobotAktif(baru)
  beda.urutan = JSON.stringify(lama.komponen.map((k) => k.id)) !== JSON.stringify(baru.komponen.map((k) => k.id))
  beda.ada = Boolean(
    beda.aspek.length || beda.ditambah.length || beda.diubah.length || beda.diarsipkan.length || beda.dipulihkan.length ||
      beda.bobot || beda.urutan,
  )
  return beda
}

/** Komponen aktif `susunan` dalam bentuk larik KOMPONEN; komponen baru diberi id sementara. */
export function komponenSementara(aspekId, susunan) {
  return susunan.komponen
    .filter((k) => k.aktif)
    .map((k, i) => ({
      id: k.id ?? 'BARU-' + (i + 1),
      aspekId,
      sumber: k.sumber,
      jenis: k.jenis ?? null,
      label: teks(k.label),
      ranah: k.ranah,
      bobot: typeof k.bobot === 'number' ? k.bobot : null,
      status: k.status,
    }))
}

/**
 * Menjalankan `fn` seolah komponen aspek `aspekId` sudah diganti `daftar`, lalu mengembalikan keadaan semula.
 * `fn` harus sinkron: selama ia berjalan tidak ada kode lain yang membaca KOMPONEN (lihat denganBobot).
 */
export function denganAspek(aspekId, daftar, fn) {
  const asli = KOMPONEN.slice()
  KOMPONEN.splice(0, KOMPONEN.length, ...asli.filter((k) => k.aspekId !== aspekId), ...daftar)
  try {
    return fn()
  } finally {
    KOMPONEN.splice(0, KOMPONEN.length, ...asli)
  }
}
