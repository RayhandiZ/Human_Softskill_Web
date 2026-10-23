import { CONFIG, withConfig } from './config.js'
import { JENIS_MK, KOMPONEN, SUMBER_LIST, getAspekList, getKomponen } from './curriculum.js'
import { bobotKomponen } from './scoring.js'
import { kelayakanSertifikat } from './rules.js'

/* --------------------------------------------------------------------------
   Bobot yang diubah Kemahasiswaan dari halaman Kurikulum CPMK. Layar memakai
   ini untuk pratinjau langsung, server memakainya lagi untuk memeriksa ulang
   sebelum menyimpan, jadi aturannya hanya ditulis sekali di sini.

   Bentuk "susunan bobot":
     pengaturan  cara membagi bobot bawaan: MODE_BOBOT_KOMPONEN, BOBOT_SUMBER,
                 BOBOT_KOMPONEN_MK (lihat README.md › Aturan bobot)
     aspek       { A1: null | { 'A1-PDP-T2': 20, ... }, ... } untuk SETIAP aspek;
                 null = dibagi otomatis menurut pengaturan, angka = diatur manual
                 (porsi tiap komponen, jumlahnya 100)
   -------------------------------------------------------------------------- */

export const KUNCI_PENGATURAN_BOBOT = ['MODE_BOBOT_KOMPONEN', 'BOBOT_SUMBER', 'BOBOT_KOMPONEN_MK']
export const MODE_BOBOT = ['merata', 'per-sumber']

/** Daftar kunci isian tiap pengaturan berbentuk peta. */
export const ISI_PENGATURAN = {
  BOBOT_SUMBER: SUMBER_LIST.map((s) => s.id),
  BOBOT_KOMPONEN_MK: JENIS_MK,
}

const jumlah = (daftar) => daftar.reduce((a, b) => a + b, 0)

/** Angka 0–100 dengan paling banyak dua desimal. */
export const angkaBobotSah = (n) =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100 && Math.abs(Math.round(n * 100) - n * 100) < 1e-6

/** Dibandingkan per sen, supaya 14,29 × 6 + 14,26 tetap terbaca 100. */
export const genapSeratus = (daftar) => Math.round(jumlah(daftar) * 100) === 10000

const tampil = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
const kode = (a) => a.kode.replace(/\.$/, '') // 'A.1.' → 'A.1'

/** Susunan bobot yang sedang berlaku. Aspek yang hanya sebagian komponennya berbobot terbaca otomatis. */
export function susunanBobot() {
  const aspek = {}
  for (const a of getAspekList()) {
    const komponen = getKomponen(a.id)
    const manual = komponen.length > 0 && komponen.every((k) => typeof k.bobot === 'number')
    aspek[a.id] = manual ? Object.fromEntries(komponen.map((k) => [k.id, k.bobot])) : null
  }
  return {
    pengaturan: Object.fromEntries(KUNCI_PENGATURAN_BOBOT.map((k) => [k, structuredClone(CONFIG[k])])),
    aspek,
  }
}

const bentukPeta = (isi, kunci) =>
  isi != null && typeof isi === 'object' && !Array.isArray(isi) &&
  Object.keys(isi).length === kunci.length && kunci.every((k) => angkaBobotSah(isi[k]))

/**
 * Masalah pada susunan bobot; kosong berarti sah. Tiap masalah { kunci | aspekId, pesan }: `kunci` untuk
 * pengaturan, `aspekId` untuk bobot manual satu aspek. Kunci yang tidak dikenal ikut ditolak.
 */
export function periksaBobot(susunan) {
  const masalah = []
  const pengaturan = susunan?.pengaturan
  const aspek = susunan?.aspek
  if (!pengaturan || typeof pengaturan !== 'object' || !aspek || typeof aspek !== 'object') {
    return [{ pesan: 'Susunan bobot tidak lengkap.' }]
  }

  for (const k of Object.keys(pengaturan)) {
    if (!KUNCI_PENGATURAN_BOBOT.includes(k)) masalah.push({ kunci: k, pesan: 'Pengaturan ' + k + ' tidak bisa diubah dari sini.' })
  }
  if (!MODE_BOBOT.includes(pengaturan.MODE_BOBOT_KOMPONEN)) {
    masalah.push({ kunci: 'MODE_BOBOT_KOMPONEN', pesan: 'Cara membagi bobot tidak dikenal.' })
  }
  for (const [kunci, nama] of [['BOBOT_SUMBER', 'Bobot per sumber'], ['BOBOT_KOMPONEN_MK', 'Bobot jenis penilaian MK']]) {
    const isi = pengaturan[kunci]
    if (!bentukPeta(isi, ISI_PENGATURAN[kunci])) {
      masalah.push({ kunci, pesan: nama + ' harus diisi angka 0–100 dengan paling banyak dua desimal.' })
    } else if (!genapSeratus(Object.values(isi))) {
      masalah.push({ kunci, pesan: nama + ' harus berjumlah 100, sekarang ' + tampil(jumlah(Object.values(isi))) + '.' })
    }
  }

  const daftarAspek = getAspekList()
  for (const id of Object.keys(aspek)) {
    if (!daftarAspek.some((a) => a.id === id)) masalah.push({ aspekId: id, pesan: 'Aspek ' + id + ' tidak dikenal.' })
  }
  for (const a of daftarAspek) {
    if (!(a.id in aspek)) {
      masalah.push({ aspekId: a.id, pesan: 'Bobot aspek ' + kode(a) + ' tidak dikirim.' })
      continue
    }
    const manual = aspek[a.id]
    if (manual === null) continue
    if (!bentukPeta(manual, getKomponen(a.id).map((k) => k.id))) {
      masalah.push({ aspekId: a.id, pesan: 'Bobot ' + kode(a) + ' harus diisi untuk setiap komponen, angka 0–100 dengan paling banyak dua desimal.' })
    } else if (!genapSeratus(Object.values(manual))) {
      masalah.push({ aspekId: a.id, pesan: 'Bobot ' + kode(a) + ' harus berjumlah 100, sekarang ' + tampil(jumlah(Object.values(manual))) + '.' })
    }
  }
  return masalah
}

const samaPeta = (x, y, kunci) => (x == null || y == null ? x == null && y == null : kunci.every((k) => x[k] === y[k]))

/** Bagian mana yang berbeda di antara dua susunan: { pengaturan: [kunci], aspek: [aspekId] }. */
export function bedaBobot(lama, baru) {
  return {
    pengaturan: KUNCI_PENGATURAN_BOBOT.filter((k) =>
      k === 'MODE_BOBOT_KOMPONEN'
        ? lama.pengaturan[k] !== baru.pengaturan[k]
        : !samaPeta(lama.pengaturan[k], baru.pengaturan[k], ISI_PENGATURAN[k]),
    ),
    aspek: getAspekList()
      .map((a) => a.id)
      .filter((id) => !samaPeta(lama.aspek[id], baru.aspek[id], getKomponen(id).map((k) => k.id))),
  }
}

/**
 * Menjalankan `fn` seolah `susunan` sudah berlaku, lalu mengembalikan keadaan semula. `fn` harus sinkron:
 * selama ia berjalan tidak ada kode lain yang membaca KOMPONEN atau CONFIG, termasuk permintaan lain di server.
 */
export function denganBobot(susunan, fn) {
  const asli = KOMPONEN.map((k) => k.bobot)
  for (const k of KOMPONEN) {
    const manual = susunan.aspek?.[k.aspekId]
    k.bobot = manual ? (manual[k.id] ?? null) : null
  }
  try {
    return withConfig(susunan.pengaturan, fn)
  } finally {
    KOMPONEN.forEach((k, i) => {
      k.bobot = asli[i]
    })
  }
}

/** Porsi efektif tiap komponen satu aspek (jumlahnya 100) bila `susunan` berlaku. */
export const porsiBobot = (susunan, aspekId) => denganBobot(susunan, () => bobotKomponen(aspekId))

function hasilMahasiswa(m) {
  const k = kelayakanSertifikat(m)
  return {
    aspek: Object.fromEntries(k.transkrip.aspek.map((a) => [a.aspekId, a.nilai])),
    // Komponen kosong per aspek: menambah komponen tidak mengubah angka, tetapi membuat aspek belum lengkap.
    kosong: Object.fromEntries(k.transkrip.aspek.map((a) => [a.aspekId, a.terkunci ? 0 : a.komponenKosong.length])),
    nilai: k.transkrip.akhir.nilai,
    peringkat: k.transkrip.akhir.huruf?.min ?? null,
    layak: k.layak,
  }
}

/**
 * Akibat sebuah perubahan kurikulum terhadap mahasiswa yang nilainya sudah masuk. `jalankan(fn)` menjalankan fn
 * seolah perubahan itu sudah berlaku (denganBobot, atau denganAspek di src/lib/penilaian.js). Yang dihitung: siapa
 * yang nilai aspek atau nilai akhirnya (yang dibulatkan, seperti yang tampil di layar) berubah, yang aspeknya
 * menjadi belum lengkap, huruf yang naik atau turun, dan kelayakan sertifikat yang berubah. `terkunci` = mahasiswa
 * yang berubah pada angkatan terkunci atau pada aspek yang ditandai final manual; bila ada, menyimpan wajib
 * disertai alasan (aturan data terkunci).
 */
export function dampakDari(mahasiswa, jalankan, batas = 50, susunUlang = null) {
  const sebelum = mahasiswa.map(hasilMahasiswa)
  // susunUlang: menyusun ulang data mahasiswa DI DALAM keadaan baru (urutan sama), mis. supaya nilai komponen
  // yang dipulihkan dari arsip ikut terbaca. Tanpa itu, data yang sama dihitung ulang.
  const sesudah = jalankan(() => (susunUlang ? susunUlang() : mahasiswa).map(hasilMahasiswa))

  const hasil = {
    total: mahasiswa.length,
    berubah: 0,
    naik: 0,
    turun: 0,
    jadiLayak: 0,
    tidakLagiLayak: 0,
    jadiBelumLengkap: 0,
    terkunci: 0,
  }
  const angkatanTerkunci = new Set()
  const daftar = []
  mahasiswa.forEach((m, i) => {
    const a = sebelum[i]
    const b = sesudah[i]
    // Gabungan aspek sebelum dan sesudah: aspek yang ditambah atau diarsipkan hanya ada di salah satunya.
    const aspek = [...new Set([...Object.keys(a.aspek), ...Object.keys(b.aspek)])].filter(
      (id) => (a.aspek[id] ?? null) !== (b.aspek[id] ?? null) || (a.kosong[id] ?? 0) !== (b.kosong[id] ?? 0),
    )
    if (!aspek.length && a.nilai === b.nilai && a.layak === b.layak) return

    hasil.berubah++
    if (a.peringkat != null && b.peringkat != null && b.peringkat > a.peringkat) hasil.naik++
    if (a.peringkat != null && b.peringkat != null && b.peringkat < a.peringkat) hasil.turun++
    if (!a.layak && b.layak) hasil.jadiLayak++
    if (a.layak && !b.layak) hasil.tidakLagiLayak++
    if (aspek.some((id) => !(a.kosong[id] ?? 0) && (b.kosong[id] ?? 0))) hasil.jadiBelumLengkap++
    const terkunci = m.statusAngkatan === 'terkunci' || aspek.some((id) => m.penguncian?.[id]?.status === 'final')
    if (terkunci) hasil.terkunci++
    if (m.statusAngkatan === 'terkunci') angkatanTerkunci.add(m.angkatanLabel)
    daftar.push({
      nim: m.nim,
      nama: m.name,
      angkatan: m.angkatanLabel,
      aspek,
      nilaiSebelum: a.nilai,
      nilaiSesudah: b.nilai,
      layakSebelum: a.layak,
      layakSesudah: b.layak,
      terkunci,
    })
  })

  // Yang terkunci lebih dulu: merekalah yang menuntut alasan.
  daftar.sort((x, y) => Number(y.terkunci) - Number(x.terkunci))
  return {
    ...hasil,
    angkatanTerkunci: [...angkatanTerkunci].sort(),
    daftar: daftar.slice(0, batas),
    sisa: Math.max(0, daftar.length - batas),
  }
}

/** dampakDari() untuk susunan bobot (lihat atas). */
export const dampakBobot = (mahasiswa, susunan, batas = 50) =>
  dampakDari(mahasiswa, (fn) => denganBobot(susunan, fn), batas)
