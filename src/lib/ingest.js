import { getKomponenById } from './curriculum.js'
import { uraiCSV } from './csv.js'

/* --------------------------------------------------------------------------
   Pengenal berkas nilai mentah.

   Berkas yang benar-benar dipegang dosen bukan `nim,komponen,nilai`, melainkan
   rekap lebar: satu baris per mahasiswa, satu kolom per tugas — dengan nama
   kolom seadanya ("Tugas 1", "UTS", "Nilai Sikap Dosen", "Peer 2") dan skala
   yang berbeda-beda (0–4, 0–10, 0–100).

   Modul ini menebak:
     1. format berkas (baku vs mentah)
     2. kolom mana berisi NIM dan nama
     3. kolom nilai mana memetakan ke komponen asesmen yang mana
     4. skala tiap kolom, lalu mengonversinya ke 0–100
     5. gabungan beberapa kolom yang jatuh ke satu komponen (dirata-ratakan)

   Semua tebakan WAJIB bisa dikoreksi manusia. Modul ini hanya mengusulkan;
   keputusan akhir ada di layar pemetaan.
   -------------------------------------------------------------------------- */

/* --------------------------------- teks ---------------------------------- */

const normal = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const token = (s) => normal(s).split(' ').filter(Boolean)

/* Kata yang tidak membedakan apa pun — dibuang agar tidak menaikkan skor semu. */
const STOPWORD = new Set([
  'nilai', 'the', 'dan', 'of', 'a', 'an', 'yang', 'untuk', 'pada', 'ke', 'di', 'nya',
  'mahasiswa', 'siswa', 'score', 'skor', 'total', 'akhir', 'no', 'nomor',
])

const KATA_NIM = ['nim', 'npm', 'nrp', 'student id', 'studentid', 'id mahasiswa', 'nomor induk']
const KATA_NAMA = ['nama', 'name', 'nama mahasiswa', 'student name', 'fullname']

/* Kata kunci jenis komponen — sinyal paling kuat setelah kode komponen. */
const KATA_JENIS = {
  TUGAS: ['tugas', 'task', 'assignment', 'tgs', 'project', 'proyek', 'refleksi', 'laporan'],
  SIKAP: ['sikap', 'afektif', 'attitude', 'peer', 'peer review', 'peer assessment', 'penilaian sikap'],
  UTS: ['uts', 'mid', 'midterm', 'tengah semester'],
  UAS: ['uas', 'final', 'akhir semester', 'ujian akhir'],
}

const KATA_SUMBER = {
  PDP: ['pdp', 'personal development'],
  MK: ['mk', 'kelas', 'dosen', 'kuliah'],
  ENGAGEMENT: ['mentoring', 'kehadiran', 'presensi', 'absensi', 'hadir', 'partisipasi', 'fasilitator'],
}

/* --------------------------- kemiripan kolom ------------------------------ */

/**
 * Menilai seberapa cocok satu kolom mentah dengan satu komponen asesmen.
 * Skor 0–100; di atas 55 dianggap cukup untuk diusulkan otomatis.
 */
export function skorKecocokan(namaKolom, komponen) {
  const kolom = normal(namaKolom)
  if (!kolom) return { skor: 0, alasan: [] }

  // Kode komponen ditulis apa adanya — tebakan paling pasti.
  if (kolom.replace(/ /g, '') === normal(komponen.id).replace(/ /g, '')) {
    return { skor: 100, alasan: ['kode komponen sama persis'] }
  }

  const tKolom = token(kolom).filter((t) => !STOPWORD.has(t))
  const tKomponen = token(komponen.label).filter((t) => !STOPWORD.has(t))
  const alasan = []
  let skor = 0

  // 1. kata kunci jenis (TUGAS/SIKAP/UTS/UAS)
  if (komponen.jenis) {
    const kunci = KATA_JENIS[komponen.jenis] ?? []
    if (kunci.some((k) => kolom.includes(k))) {
      skor += 34
      alasan.push('jenis ' + komponen.jenis.toLowerCase())
    } else {
      // kolom menyebut jenis LAIN — penalti, supaya UTS tidak nyasar ke UAS
      const jenisLain = Object.entries(KATA_JENIS).filter(([j]) => j !== komponen.jenis)
      if (jenisLain.some(([, kk]) => kk.some((k) => kolom.includes(k)))) skor -= 26
    }
  }

  // 2. kata kunci sumber
  const kunciSumber = KATA_SUMBER[komponen.sumber] ?? []
  if (kunciSumber.some((k) => kolom.includes(k))) {
    skor += 12
    alasan.push('sumber ' + komponen.sumber.toLowerCase())
  }

  // 3. irisan kata dengan label komponen
  if (tKomponen.length) {
    const iris = tKolom.filter((t) => tKomponen.includes(t))
    if (iris.length) {
      skor += Math.min(40, (iris.length / Math.min(tKolom.length, tKomponen.length)) * 40)
      alasan.push('kata sama: ' + iris.slice(0, 3).join(', '))
    }
  }

  // 4. angka urutan cocok ("Tugas 2" ↔ "Tugas 2: Video ...")
  const angkaKolom = kolom.match(/\b(\d{1,2})\b/)
  const angkaKomponen = normal(komponen.label).match(/\b(\d{1,2})\b/)
  if (angkaKolom && angkaKomponen) {
    if (angkaKolom[1] === angkaKomponen[1]) {
      skor += 18
      alasan.push('nomor urut sama')
    } else skor -= 12
  }

  return { skor: Math.max(0, Math.min(100, Math.round(skor))), alasan }
}

export function keyakinan(skor) {
  if (skor >= 80) return { level: 'tinggi', label: 'Yakin' }
  if (skor >= 55) return { level: 'sedang', label: 'Perlu dicek' }
  if (skor > 0) return { level: 'rendah', label: 'Tebakan lemah' }
  return { level: 'nihil', label: 'Tidak cocok' }
}

/* ------------------------------ angka & skala ----------------------------- */

/** Membaca angka dari sel mentah: "85", "8,5", "85%", " 90 ". */
export function bacaAngka(sel) {
  const s = String(sel ?? '').trim()
  if (!s) return null
  const bersih = s.replace(/%/g, '').replace(/\s/g, '').replace(',', '.')
  const n = Number(bersih)
  return Number.isFinite(n) ? n : null
}

/**
 * Menebak skala sebuah kolom dari nilai terbesarnya.
 * Sengaja konservatif: kalau ragu, pilih skala yang TIDAK mengubah angka.
 */
export function deteksiSkala(angka) {
  const ada = angka.filter((n) => n != null)
  if (!ada.length) return { skala: 100, maks: null, otomatis: false }
  const maks = Math.max(...ada)
  if (maks <= 4.0) return { skala: 4, maks, otomatis: true }
  if (maks <= 10.0) return { skala: 10, maks, otomatis: true }
  return { skala: 100, maks, otomatis: true }
}

export const SKALA_PILIHAN = [
  { nilai: 100, label: '0–100 (tanpa konversi)' },
  { nilai: 10, label: '0–10 (dikali 10)' },
  { nilai: 4, label: '0–4 (dikali 25)' },
]

export const konversi = (n, skala) => (n == null ? null : Math.round((n / skala) * 100))

/* ------------------------------ analisa berkas ---------------------------- */

function cariKolom(kepala, kandidat) {
  for (const k of kepala) {
    const n = normal(k)
    if (kandidat.some((c) => n === normal(c))) return k
  }
  for (const k of kepala) {
    const n = normal(k)
    if (kandidat.some((c) => n.includes(normal(c)))) return k
  }
  return null
}

/**
 * Menganalisa isi berkas dan mengusulkan pemetaan kolom → komponen.
 * Tidak menyentuh data mahasiswa; murni membaca.
 */
export function analisaBerkas(teks, { komponenList }) {
  const { kepala, kepalaNormal, baris } = uraiCSV(teks)
  if (!kepala.length) return { kosong: true, kepala: [], baris: [] }

  // Format baku sudah punya kolom komponen + nilai — tidak perlu ditebak.
  const baku = ['nim', 'komponen', 'nilai'].every((k) => kepalaNormal.includes(k))
  if (baku) return { format: 'baku', kepala, baris }

  const kolomNim = cariKolom(kepala, KATA_NIM)
  const kolomNama = cariKolom(kepala, KATA_NAMA)

  const kolomNilai = kepala
    .filter((k) => k !== kolomNim && k !== kolomNama && k !== '')
    .map((k) => {
      const angka = baris.map((r) => bacaAngka(r[k]))
      const terisi = angka.filter((n) => n != null).length
      const skala = deteksiSkala(angka)

      const peringkat = komponenList
        .map((komp) => ({ komponen: komp, ...skorKecocokan(k, komp) }))
        .sort((a, b) => b.skor - a.skor)

      const teratas = peringkat[0]
      return {
        nama: k,
        angka,
        terisi,
        kosong: angka.length - terisi,
        numerik: terisi > 0,
        skala: skala.skala,
        skalaMaks: skala.maks,
        usulan: teratas && teratas.skor >= 55 ? teratas.komponen.id : null,
        skor: teratas?.skor ?? 0,
        alasan: teratas?.alasan ?? [],
        peringkat: peringkat.slice(0, 4),
        contoh: baris.slice(0, 3).map((r) => r[k]).filter((v) => v !== ''),
      }
    })

  // Satu komponen boleh menerima beberapa kolom (mis. Sikap = nilai dosen + peer
  // review), jadi tidak ada pembatasan satu-lawan-satu di sini.
  return {
    format: 'mentah',
    kepala,
    baris,
    kolomNim,
    kolomNama,
    kolomNilai,
    kolomNumerik: kolomNilai.filter((k) => k.numerik).length,
    terpetakan: kolomNilai.filter((k) => k.usulan).length,
  }
}

/* ---------------------------- hitung hasil akhir -------------------------- */

export const AGREGASI = [
  { id: 'rata', label: 'Rata-rata' },
  { id: 'maks', label: 'Ambil tertinggi' },
  { id: 'terakhir', label: 'Pakai kolom terakhir' },
]

function gabung(nilai, cara) {
  const ada = nilai.filter((n) => n != null)
  if (!ada.length) return null
  if (cara === 'maks') return Math.max(...ada)
  if (cara === 'terakhir') return ada[ada.length - 1]
  return Math.round(ada.reduce((a, b) => a + b, 0) / ada.length)
}

/**
 * Menerjemahkan berkas mentah menjadi entri { nim, komponenId, nilai } dengan
 * nilai yang sudah dikonversi ke 0–100 dan digabung per komponen.
 *
 * `peta` = { namaKolom: { komponenId | null, skala } } hasil suntingan admin.
 */
export function hitungEntri(analisa, peta, { agregasi = 'rata', cariMahasiswa, batas }) {
  const entri = []
  const ditolak = []
  const perKomponen = new Map()

  analisa.baris.forEach((r, i) => {
    const nomor = i + 2
    const nimMentah = String(r[analisa.kolomNim] ?? '').trim()
    const alasan = []

    if (!analisa.kolomNim) alasan.push('Kolom NIM tidak terdeteksi')
    else if (!nimMentah) alasan.push('NIM kosong')

    const mahasiswa = nimMentah ? cariMahasiswa(nimMentah) : null
    if (nimMentah && !mahasiswa) alasan.push('NIM ' + nimMentah + ' tidak dikenal')

    // Penjaga sasaran: angkatan dan program studi yang sedang dipilih admin.
    if (mahasiswa && typeof batas === 'function') {
      const tolak = batas(mahasiswa)
      if (tolak) alasan.push(tolak)
    }

    if (alasan.length) {
      ditolak.push({ nomor, nim: nimMentah, nama: r[analisa.kolomNama] ?? '', alasan })
      return
    }

    // kumpulkan nilai per komponen untuk baris ini
    const kumpul = new Map()
    for (const kol of analisa.kolomNilai) {
      const aturan = peta[kol.nama]
      if (!aturan?.komponenId) continue
      const mentah = bacaAngka(r[kol.nama])
      if (mentah == null) continue
      const skala = aturan.skala ?? kol.skala
      const nilai = konversi(mentah, skala)
      if (nilai == null) continue
      if (nilai < 0 || nilai > 100) {
        ditolak.push({
          nomor,
          nim: nimMentah,
          nama: mahasiswa.name,
          alasan: ['Kolom "' + kol.nama + '" bernilai ' + mentah + ', di luar skala ' + skala],
        })
        continue
      }
      if (!kumpul.has(aturan.komponenId)) kumpul.set(aturan.komponenId, [])
      kumpul.get(aturan.komponenId).push({ nilai, kolom: kol.nama, mentah, skala })
    }

    for (const [komponenId, daftar] of kumpul) {
      const nilai = gabung(daftar.map((d) => d.nilai), agregasi)
      if (nilai == null) continue
      entri.push({
        nim: mahasiswa.nim,
        nama: mahasiswa.name,
        komponenId,
        nilai,
        dari: daftar,
      })
      perKomponen.set(komponenId, (perKomponen.get(komponenId) ?? 0) + 1)
    }
  })

  return {
    entri,
    ditolak,
    perKomponen: [...perKomponen.entries()].map(([id, jumlah]) => ({
      komponen: getKomponenById(id),
      jumlah,
    })),
    ringkas:
      entri.length + ' nilai siap diisi untuk ' + new Set(entri.map((e) => e.nim)).size + ' mahasiswa' +
      (ditolak.length ? ', ' + ditolak.length + ' baris ditolak' : ''),
  }
}
