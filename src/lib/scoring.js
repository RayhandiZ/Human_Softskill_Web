import { CONFIG } from './config.js'
import {
  AREA,
  CLUSTER,
  FASE,
  aspekPunyaDraft,
  getAspek,
  getAspekList,
  getKomponen,
} from './curriculum.js'

/* --------------------------------------------------------------------------
   Seluruh rumus penilaian tinggal di sini. Tidak ada perhitungan yang boleh
   diulang di komponen halaman.

   Modul ini tidak mengimpor rules.js — arah ketergantungannya satu arah:
   curriculum → scoring → rules → UI.
   -------------------------------------------------------------------------- */

/* ------------------------------ rubrik huruf ------------------------------ */

export const RUBRIK = [
  {
    huruf: 'A',
    min: 90,
    max: 100,
    label: 'Professional & Competent',
    deskripsi: 'Profesionalisme tinggi; siap menghadapi tantangan kerja secara mandiri.',
    warna: 'var(--good)',
  },
  {
    huruf: 'B',
    min: 80,
    max: 89,
    label: 'Emerging Professional',
    deskripsi: 'Kapabilitas solid; masih mengembangkan konsistensi, inisiatif, dan pengambilan keputusan.',
    warna: 'var(--brand-ink)',
  },
  {
    huruf: 'C',
    min: 70,
    max: 79,
    label: 'Developing Professional Skills',
    deskripsi: 'Kemampuan dasar sudah ada; masih memerlukan bimbingan dan coaching.',
    warna: 'var(--warning)',
  },
  {
    huruf: 'D',
    min: 60,
    max: 69,
    label: 'Basic Professional Awareness',
    deskripsi: 'Memahami nilai dasar profesionalisme; penerapan masih terbatas.',
    warna: 'var(--serious)',
  },
]

/* Di bawah 60 bukan huruf mutu resmi — ia sebuah status, bukan nilai. */
export const BELUM_MEMENUHI = {
  huruf: null,
  min: 0,
  max: 59,
  label: 'Belum Memenuhi',
  deskripsi: 'Capaian belum mencapai ambang huruf mutu terendah.',
  warna: 'var(--critical)',
}

export function hurufMutu(nilai) {
  if (nilai == null || Number.isNaN(nilai)) return null
  return RUBRIK.find((r) => nilai >= r.min) ?? BELUM_MEMENUHI
}

/* ------------------------------ bobot komponen ---------------------------- */

const jumlah = (arr) => arr.reduce((a, b) => a + b, 0)
const rerata = (arr) => (arr.length ? jumlah(arr) / arr.length : null)
const bulat = (n) => (n == null ? null : Math.round(n))

/**
 * Membagi `total` ke sekumpulan komponen.
 * Bila SELURUH komponen punya `bobot` eksplisit, angka itu dipakai sebagai
 * porsi relatif; selain itu dibagi rata. Campuran sengaja tidak didukung
 * supaya hasilnya selalu bisa ditebak.
 */
function bagi(komponen, total) {
  const hasil = {}
  if (!komponen.length) return hasil
  const semuaEksplisit = komponen.every((x) => typeof x.bobot === 'number')
  if (semuaEksplisit) {
    const t = jumlah(komponen.map((x) => x.bobot)) || 1
    for (const x of komponen) hasil[x.id] = (x.bobot / t) * total
  } else {
    for (const x of komponen) hasil[x.id] = total / komponen.length
  }
  return hasil
}

/**
 * Bobot tiap komponen sebuah aspek, dinormalisasi hingga berjumlah 100.
 *
 * Sumber atau jenis MK yang tidak hadir pada suatu aspek TIDAK dihitung nol —
 * porsinya dinormalisasi ulang ke sumber/jenis yang ada. Contoh: B.4 hanya
 * punya komponen MK, jadi MK memikul 100% meski CONFIG memberinya 50.
 */
export function bobotKomponen(aspekId) {
  const komponen = getKomponen(aspekId)
  if (!komponen.length) return {}

  const perSumber = {}
  for (const x of komponen) (perSumber[x.sumber] ??= []).push(x)

  const sumberHadir = Object.keys(perSumber)
  const totalSumber = jumlah(sumberHadir.map((s) => CONFIG.BOBOT_SUMBER[s] ?? 0)) || 1

  const hasil = {}
  for (const s of sumberHadir) {
    const porsiSumber = ((CONFIG.BOBOT_SUMBER[s] ?? 0) / totalSumber) * 100
    const daftar = perSumber[s]

    if (s !== 'MK') {
      Object.assign(hasil, bagi(daftar, porsiSumber))
      continue
    }

    // MK dimodulasi per jenis (TUGAS / SIKAP / UTS / UAS), lalu dibagi rata
    // di dalam tiap jenis. Jenis yang tidak hadir dinormalisasi ulang.
    const perJenis = {}
    for (const x of daftar) (perJenis[x.jenis ?? 'TUGAS'] ??= []).push(x)
    const jenisHadir = Object.keys(perJenis)
    const totalJenis = jumlah(jenisHadir.map((j) => CONFIG.BOBOT_KOMPONEN_MK[j] ?? 0)) || 1

    for (const j of jenisHadir) {
      const porsiJenis = ((CONFIG.BOBOT_KOMPONEN_MK[j] ?? 0) / totalJenis) * porsiSumber
      Object.assign(hasil, bagi(perJenis[j], porsiJenis))
    }
  }
  return hasil
}

/* ------------------------------- nilai aspek ------------------------------ */

/** Membaca nilai satu komponen dari data mahasiswa. */
function bacaNilai(entri) {
  if (entri == null) return null
  const v = typeof entri === 'object' ? entri.nilai : entri
  return typeof v === 'number' && !Number.isNaN(v) ? v : null
}

export function semesterDitutup(student, semester) {
  if (!student) return false
  if (student.statusAngkatan === 'terkunci') return true
  return semester < student.semesterAktif
}

/**
 * Status sebuah aspek bagi seorang mahasiswa.
 *   terkunci  semesternya belum tiba
 *   menunggu  semester berjalan, belum ada satu pun nilai masuk
 *   berjalan  sebagian komponen terisi, atau lengkap tapi semester belum ditutup
 *   final     seluruh komponen terisi, semester sudah ditutup, dan lolos R4
 */
export function statusAspek(student, aspekId) {
  return telaahAspek(student, aspekId).status
}

/**
 * Menimbang status sebuah aspek sekaligus alasannya bila belum final.
 *
 * Urutan pertimbangan:
 *   1. semester belum tiba              → terkunci
 *   2. belum ada nilai sama sekali      → menunggu
 *   3. komponen belum lengkap           → berjalan (tidak pernah bisa final)
 *   4. ditahan Kemahasiswaan            → berjalan
 *   5. skema komponen masih draft (R4)  → berjalan
 *   6. ditandai final Kemahasiswaan     → final
 *   7. selebihnya mengikuti CONFIG.PENGUNCIAN_ASPEK
 */
export function telaahAspek(student, aspekId) {
  const aspek = getAspek(aspekId)
  if (!aspek) return { status: 'terkunci', alasan: null, siapDikunci: false }
  if (aspek.semester > student.semesterAktif) {
    return { status: 'terkunci', alasan: 'Dibuka pada Semester ' + aspek.semester, siapDikunci: false }
  }

  const komponen = getKomponen(aspekId)
  const nilaiAspek = student.nilai?.[aspekId]?.komponen ?? {}
  const terisi = komponen.filter((x) => bacaNilai(nilaiAspek[x.id]) != null).length
  const tanda = student.penguncian?.[aspekId] ?? null

  if (terisi === 0) {
    return { status: 'menunggu', alasan: 'Belum ada nilai yang masuk dari penilai', siapDikunci: false, tanda }
  }
  if (terisi < komponen.length) {
    return {
      status: 'berjalan',
      alasan: 'Baru ' + terisi + ' dari ' + komponen.length + ' komponen asesmen yang dinilai',
      siapDikunci: false,
      tanda,
    }
  }

  // Lengkap. Penandaan manual selalu menang atas mode otomatis.
  if (tanda?.status === 'sementara') {
    return {
      status: 'berjalan',
      alasan: 'Ditahan sebagai sementara oleh ' + (tanda.oleh ?? 'Kemahasiswaan'),
      siapDikunci: true,
      tanda,
    }
  }

  // R4 — aspek berkomponen draft tidak boleh final, kecuali saklar demo dibuka.
  if (aspekPunyaDraft(aspekId) && !CONFIG.IZINKAN_FINAL_DRAFT) {
    return { status: 'berjalan', alasan: 'Skema penilaian aspek ini belum diresmikan', siapDikunci: false, tanda }
  }

  if (tanda?.status === 'final') return { status: 'final', alasan: null, siapDikunci: false, tanda }

  if (CONFIG.PENGUNCIAN_ASPEK === 'otomatis') {
    return { status: 'final', alasan: null, siapDikunci: false, tanda }
  }
  if (CONFIG.PENGUNCIAN_ASPEK === 'semester') {
    if (semesterDitutup(student, aspek.semester)) {
      return { status: 'final', alasan: null, siapDikunci: false, tanda }
    }
    return {
      status: 'berjalan',
      alasan: 'Seluruh komponen sudah dinilai, menunggu semester ini ditutup',
      siapDikunci: true,
      tanda,
    }
  }

  // mode 'manual'
  return {
    status: 'berjalan',
    alasan: 'Seluruh komponen sudah dinilai, menunggu penguncian oleh Kemahasiswaan',
    siapDikunci: true,
    tanda,
  }
}

/**
 * Hitung satu aspek. Komponen kosong dikeluarkan dari pembagi — tidak pernah
 * dianggap nol (larangan keras nomor 2).
 */
export function hitungAspek(student, aspekId) {
  const aspek = getAspek(aspekId)
  const komponen = getKomponen(aspekId)
  const bobot = bobotKomponen(aspekId)
  const tersimpan = student?.nilai?.[aspekId]?.komponen ?? {}

  const rinci = komponen.map((x) => {
    const entri = tersimpan[x.id]
    const nilai = bacaNilai(entri)
    return {
      ...x,
      bobotEfektif: bobot[x.id] ?? 0,
      nilai,
      terisi: nilai != null,
      penilai: entri?.penilai ?? null,
      tanggal: entri?.tanggal ?? null,
      batchId: entri?.batchId ?? null,
    }
  })

  const terisi = rinci.filter((x) => x.terisi)
  const pembagi = jumlah(terisi.map((x) => x.bobotEfektif))
  const nilai = pembagi > 0 ? jumlah(terisi.map((x) => x.nilai * x.bobotEfektif)) / pembagi : null
  const telaah = telaahAspek(student, aspekId)
  const status = telaah.status

  return {
    aspekId,
    aspek,
    status,
    // Kenapa belum final — dipakai transkrip dan panel admin supaya statusnya
    // tidak sekadar label tanpa penjelasan.
    alasanSementara: telaah.alasan,
    siapDikunci: telaah.siapDikunci,
    penguncian: telaah.tanda ?? null,
    terkunci: status === 'terkunci',
    nilai: status === 'terkunci' ? null : bulat(nilai),
    nilaiMentah: status === 'terkunci' ? null : nilai,
    huruf: status === 'terkunci' ? null : hurufMutu(bulat(nilai)),
    komponenTerisi: terisi.length,
    komponenTotal: komponen.length,
    komponenKosong: rinci.filter((x) => !x.terisi),
    adaDraft: aspekPunyaDraft(aspekId),
    sementara: status === 'berjalan' || status === 'menunggu',
    komponen: rinci,
  }
}

/* --------------------------- agregasi lapis atas -------------------------- */

function agregat(daftarAspek) {
  const dinilai = daftarAspek.filter((a) => a.nilai != null)
  return {
    nilai: bulat(rerata(dinilai.map((a) => a.nilaiMentah))),
    huruf: hurufMutu(bulat(rerata(dinilai.map((a) => a.nilaiMentah)))),
    dinilai: dinilai.length,
    total: daftarAspek.length,
    lengkap: dinilai.length === daftarAspek.length,
    aspek: daftarAspek,
  }
}

/* ------------------------------- nilai akhir ------------------------------ */

function bobotAspek(aspekId) {
  if (CONFIG.BOBOT_ASPEK === 'kustom') return CONFIG.BOBOT_ASPEK_KUSTOM[aspekId] ?? 0
  return 1
}

function nilaiAkhirPerAspek(semua) {
  const dinilai = semua.filter((a) => a.nilai != null)
  const pembagi = jumlah(dinilai.map((a) => bobotAspek(a.aspekId)))
  if (!pembagi) return null
  return jumlah(dinilai.map((a) => a.nilaiMentah * bobotAspek(a.aspekId))) / pembagi
}

function nilaiAkhirPerSemester(semua) {
  const perSemester = []
  for (let s = 1; s <= CONFIG.TOTAL_SEMESTER_PROGRAM; s++) {
    const dinilai = semua.filter((a) => a.aspek?.semester === s && a.nilai != null)
    if (dinilai.length) perSemester.push(rerata(dinilai.map((a) => a.nilaiMentah)))
  }
  return perSemester.length ? rerata(perSemester) : null
}

/** Nilai akhir bila hanya aspek sampai Semester `sampai` yang dihitung, dengan mode agregasi yang sama.
    Pada semester terakhir yang bernilai, hasilnya sama persis dengan transkrip.akhir.nilai. */
export function nilaiKumulatif(transkrip, sampai) {
  const semua = transkrip.aspek.filter((a) => (a.aspek?.semester ?? Infinity) <= sampai)
  return bulat(CONFIG.MODE_AGREGASI === 'per-semester' ? nilaiAkhirPerSemester(semua) : nilaiAkhirPerAspek(semua))
}

/* ------------------------------ transkrip utuh ---------------------------- */

/**
 * Satu panggilan menghasilkan seluruh angka yang dibutuhkan transkrip, ringkasan,
 * sertifikat, dan agregasi admin. Komponen halaman cukup membaca hasilnya.
 */
export function hitungTranskrip(student) {
  const semua = getAspekList().map((a) => hitungAspek(student, a.id))
  const perId = Object.fromEntries(semua.map((a) => [a.aspekId, a]))

  const cluster = Object.fromEntries(
    CLUSTER.map((c) => [c.id, { ...agregat(c.aspek.map((id) => perId[id])), cluster: c }]),
  )
  const area = Object.fromEntries(
    AREA.map((a) => [a.id, { ...agregat(semua.filter((x) => x.aspek?.area === a.id)), area: a }]),
  )
  const fase = Object.fromEntries(
    FASE.map((f) => [f.id, { ...agregat(semua.filter((x) => x.aspek?.fase === f.id)), fase: f }]),
  )

  const semester = {}
  for (let s = 1; s <= CONFIG.TOTAL_SEMESTER_PROGRAM; s++) {
    const daftar = semua.filter((x) => x.aspek?.semester === s)
    semester[s] = {
      ...agregat(daftar),
      semester: s,
      terkunci: daftar.length > 0 && daftar.every((x) => x.terkunci),
      ditutup: semesterDitutup(student, s),
    }
  }

  const mentah = CONFIG.MODE_AGREGASI === 'per-semester' ? nilaiAkhirPerSemester(semua) : nilaiAkhirPerAspek(semua)
  const nilai = bulat(mentah)
  const aspekDinilai = semua.filter((a) => a.nilai != null).length
  const aspekFinal = semua.filter((a) => a.status === 'final').length

  // R3 — nilai akhir tidak pernah final sebelum seluruh aspek final.
  const status = aspekFinal === semua.length && semua.length > 0 ? 'final' : 'sementara'

  return {
    student,
    aspek: semua,
    aspekById: perId,
    cluster,
    area,
    fase,
    semester,
    akhir: {
      nilai,
      nilaiMentah: mentah,
      huruf: hurufMutu(nilai),
      status,
      aspekDinilai,
      aspekFinal,
      aspekTotal: semua.length,
      basis:
        'berdasarkan ' + aspekDinilai + ' dari ' + semua.length + ' aspek',
      mode: CONFIG.MODE_AGREGASI,
    },
  }
}

/* --------------------------- pembantu untuk admin ------------------------- */

/** Persentase komponen asesmen yang sudah terisi — bahan panel kelengkapan. */
export function kelengkapan(student) {
  const t = hitungTranskrip(student)
  const terbuka = t.aspek.filter((a) => !a.terkunci)
  const total = jumlah(terbuka.map((a) => a.komponenTotal))
  const terisi = jumlah(terbuka.map((a) => a.komponenTerisi))
  return { terisi, total, persen: total ? Math.round((terisi / total) * 100) : 0 }
}

export { rerata, jumlah }
