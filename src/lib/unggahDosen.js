import { CONFIG } from './config.js'
import { getAspek } from './curriculum.js'
import { programSelesai } from './data.js'
import { bacaAngka, skorKecocokan } from './ingest.js'

/* --------------------------------------------------------------------------
   Unggahan nilai dosen dari rekap Excel (rapat 24 Okt 2026: integrasi eLearning dan MyUMN tidak mendapat akses, jadi
   dosen mengunggah rekap kelasnya dan nilainya langsung tersimpan, kecuali untuk angkatan yang sudah selesai atau
   disahkan dan aspek final, yang diajukan ke Super Admin; lihat unggahNilaiDosen di src/server/pengajuan.js).

   Bentuk rekap: baris pertama judul kolom, lalu satu baris per mahasiswa. Kolom NIM wajib, kolom Nama boleh ada,
   dan satu kolom per tugas. Kolom tugas dikenali berurutan dari kode komponennya (templat menulis
   "A1-MK-T1 · Tugas 1: ..."), dari nama tugasnya persis, lalu dari kemiripan yang sangat yakin (skorKecocokan di
   ingest.js) bila hanya satu tugas yang jelas menang. Kolom berisi angka yang tidak dikenali, juga angka di kolom
   tanpa judul, ditolak dengan pesan yang menyebut kolomnya, supaya nilai tidak hilang diam-diam karena judulnya diubah
   atau tempelannya bergeser.

   Hanya fungsi murni; layarnya di src/halaman/dosen/Unggah.jsx dan Pantau.jsx, dan server memeriksa ulang semuanya.
   -------------------------------------------------------------------------- */

const normal = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const KOLOM_NIM = ['nim', 'npm', 'nomor induk mahasiswa', 'student id']
const KOLOM_NAMA = ['nama', 'nama mahasiswa', 'name', 'student name']
// Kolom pelengkap yang sering ada di rekap kelas; isinya tidak dibaca.
const KOLOM_ABAIKAN = ['no', 'nomor', 'no urut', 'prodi', 'program studi', 'kelas', 'angkatan', 'email', 'keterangan', 'catatan']

const kosong = (sel) => String(sel ?? '').trim() === ''
// Angka dari Excel, atau teks angka dari CSV ("85,5").
const adaAngka = (sel) => typeof sel === 'number' || bacaAngka(sel) != null
// Huruf kolom seperti di Excel: 0 jadi A, 25 jadi Z, 26 jadi AA.
const hurufKolom = (i) => (i >= 26 ? hurufKolom(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26))
const kodeAspek = (id) => (getAspek(id)?.kode ?? id).replace(/\.$/, '')
// Galat ditulis sebagai kalimat kamus dan isiannya, supaya layar bisa menerjemahkannya lewat t(teks, isi).
const salah = (teks, isi = null) => ({ teks, isi })

/** Nilai tersimpan satu mahasiswa untuk satu komponen, atau null. */
export const nilaiTersimpan = (s, k) => s.nilai?.[k.aspekId]?.komponen?.[k.id]?.nilai ?? null

/**
 * Sebab satu nilai baru harus disetujui Super Admin dulu: 'disahkan' (angkatannya sudah disahkan), 'selesai' (programnya
 * sudah lewat Semester 3), 'final' (aspeknya sudah ditetapkan final), atau null bila langsung tersimpan. Sama dengan
 * pemilahan di unggahNilaiDosen (src/server/pengajuan.js), yang tetap memutuskannya sendiri.
 */
export function sebabPersetujuan(s, aspekId) {
  if (s.statusAngkatan === 'terkunci') return 'disahkan'
  if (s.periode?.[0] && programSelesai(s.periode[0])) return 'selesai'
  if (s.penguncian?.[aspekId]?.status === 'final') return 'final'
  return null
}

/** Komponen kelas yang dimaksud satu judul kolom: { komponen, cara: 'kode' | 'nama' | 'mirip' } atau null. */
export function cocokkanKolom(judul, komponenKelas) {
  const n = normal(judul)
  if (!n) return null
  for (const k of komponenKelas) {
    const kode = normal(k.id)
    if (n === kode || n.startsWith(kode + ' ')) return { komponen: k, cara: 'kode' }
  }
  for (const k of komponenKelas) if (n === normal(k.label)) return { komponen: k, cara: 'nama' }
  const peringkat = komponenKelas
    .map((k) => ({ k, skor: skorKecocokan(judul, k).skor }))
    .sort((a, b) => b.skor - a.skor)
  if (peringkat[0]?.skor >= 80 && (peringkat[1]?.skor ?? 0) < peringkat[0].skor - 15) {
    return { komponen: peringkat[0].k, cara: 'mirip' }
  }
  return null
}

/**
 * Membaca rekap (`baris`: larik baris, tiap baris larik sel, baris pertama judul) untuk kelas dosen.
 * Hasil: { galat, kolom, perubahan, sama, kosong, mahasiswa, perluPersetujuan }. `perubahan` = [{ nim, nama, komponen,
 * lama, baru, persetujuan }], hanya sel yang nilainya beda dari yang tersimpan; `persetujuan` = sebabPersetujuan (null
 * bila langsung tersimpan), dan `perluPersetujuan` = banyaknya yang tidak null. `galat` = [{ teks, isi }]; galat apa pun
 * berarti belum ada yang boleh disimpan. `peringatan` (bentuknya sama) tidak menghalangi simpan.
 */
export function bacaRekap(baris, { mahasiswa, komponenKelas }) {
  const galat = []
  const hasil = { galat, peringatan: [], kolom: [], perubahan: [], sama: 0, kosong: 0, mahasiswa: 0, perluPersetujuan: 0 }
  const tabel = (Array.isArray(baris) ? baris : []).map((r) => (Array.isArray(r) ? r : []))
  while (tabel.length && tabel[0].every(kosong)) tabel.shift()
  if (!tabel.length) {
    galat.push(salah('Berkasnya kosong: tidak ada baris judul maupun nilai.'))
    return hasil
  }

  const judul = tabel[0].map((s) => String(s ?? '').trim())
  const iNim = judul.findIndex((j) => KOLOM_NIM.includes(normal(j)))
  const iNama = judul.findIndex((j) => KOLOM_NAMA.includes(normal(j)))
  if (iNim < 0) galat.push(salah('Kolom NIM tidak ditemukan di baris pertama. Pakai templat dan jangan ubah baris judulnya.'))

  const sudah = new Map()
  judul.forEach((j, i) => {
    if (i === iNim || i === iNama || !j || KOLOM_ABAIKAN.includes(normal(j))) return
    const c = cocokkanKolom(j, komponenKelas)
    if (!c) {
      if (tabel.slice(1).some((r) => !kosong(r[i]))) {
        galat.push(salah('Kolom "{kolom}" tidak dikenali sebagai tugas kelas Anda. Pakai judul kolom dari templat.', { kolom: j }))
      }
      return
    }
    if (sudah.has(c.komponen.id)) {
      galat.push(
        salah('Kolom "{kolom}" dan "{lain}" sama-sama untuk {kode}. Hapus salah satunya.', {
          kolom: j,
          lain: sudah.get(c.komponen.id),
          kode: c.komponen.id,
        }),
      )
      return
    }
    sudah.set(c.komponen.id, j)
    hasil.kolom.push({ indeks: i, judul: j, komponen: c.komponen, cara: c.cara })
  })
  // Angka di kolom tanpa judul, termasuk di luar baris judul (CSV), biasanya tempelan dari rekap lain yang bergeser:
  // bila dilewati, nilai di sebelahnya bisa tersimpan di tugas yang salah tanpa ada yang tahu (temuan 25 Okt 2026).
  const isiBaris = tabel.slice(1)
  const lebar = tabel.reduce((n, r) => Math.max(n, r.length), 0)
  const tanpaJudul = []
  for (let i = 0; i < lebar; i++) {
    if (!judul[i] && isiBaris.some((r) => adaAngka(r[i]))) tanpaJudul.push(hurufKolom(i))
  }
  if (tanpaJudul.length) {
    galat.push(
      salah('Ada angka di kolom tanpa judul: {kolom}. Pastikan setiap nilai berada di bawah judul tugasnya, lalu hapus angka di kolom tersebut.', {
        kolom: tanpaJudul.join(', '),
      }),
    )
  }
  if (iNim >= 0 && !hasil.kolom.length && !galat.length) {
    galat.push(salah('Tidak ada kolom tugas yang dikenali. Pakai templat dari halaman ini.'))
  }
  if (iNim < 0) return hasil

  // NIM bisa terbaca sebagai angka oleh Excel sehingga nol di depannya hilang; dicocokkan juga tanpa nol depan.
  const dariNim = new Map(mahasiswa.map((s) => [s.nim, s]))
  const tanpaNol = new Map(mahasiswa.map((s) => [s.nim.replace(/^0+/, ''), s]))
  const terlihat = new Map()
  const tersentuh = new Set()
  const belumDibuka = new Set()

  isiBaris.forEach((r, k) => {
    const nomor = k + 2
    if (r.every(kosong)) return
    const nim = String(r[iNim] ?? '').trim()
    if (!nim) {
      galat.push(salah('Baris {baris}: NIM kosong.', { baris: nomor }))
      return
    }
    const s = dariNim.get(nim) ?? tanpaNol.get(nim.replace(/\.0+$/, '').replace(/^0+/, ''))
    if (!s) {
      galat.push(salah('Baris {baris}: NIM {nim} tidak terdaftar di kelas Anda.', { baris: nomor, nim }))
      return
    }
    if (terlihat.has(s.nim)) {
      galat.push(salah('Baris {baris}: NIM {nim} sudah ada di baris {lain}.', { baris: nomor, nim: s.nim, lain: terlihat.get(s.nim) }))
      return
    }
    terlihat.set(s.nim, nomor)

    for (const c of hasil.kolom) {
      const mentah = r[c.indeks]
      if (kosong(mentah)) {
        hasil.kosong++
        continue
      }
      const n = typeof mentah === 'number' ? mentah : bacaAngka(mentah)
      if (n == null || n < 0 || n > 100) {
        galat.push(
          salah('Baris {baris} (NIM {nim}), kolom {kode}: "{sel}" bukan angka 0 sampai 100.', {
            baris: nomor,
            nim: s.nim,
            kode: c.komponen.id,
            sel: String(mentah).trim(),
          }),
        )
        continue
      }
      const baru = Math.round(n * 100) / 100
      const lama = nilaiTersimpan(s, c.komponen)
      if (lama === baru) {
        hasil.sama++
        continue
      }
      const aspek = getAspek(c.komponen.aspekId)
      if (aspek && aspek.semester > s.semesterAktif) {
        // Sekali per baris untuk tiap aspek, bukan sekali untuk tiap tugasnya.
        if (!belumDibuka.has(nomor + '|' + aspek.id)) {
          belumDibuka.add(nomor + '|' + aspek.id)
          galat.push(
            salah('Baris {baris} (NIM {nim}): aspek {aspek} baru dibuka pada Semester {n}.', {
              baris: nomor,
              nim: s.nim,
              aspek: kodeAspek(aspek.id),
              n: aspek.semester,
            }),
          )
        }
        continue
      }
      // Angkatan yang sudah disahkan atau selesai, dan aspek final, tidak ditolak: nilainya diajukan ke Super Admin.
      const persetujuan = sebabPersetujuan(s, c.komponen.aspekId)
      hasil.perubahan.push({ nim: s.nim, nama: s.name, komponen: c.komponen, lama, baru, persetujuan })
      tersentuh.add(s.nim)
    }
  })
  hasil.mahasiswa = tersentuh.size
  hasil.perluPersetujuan = hasil.perubahan.filter((p) => p.persetujuan).length

  // Rekap berskala 0–10 atau 0–4 lolos pemeriksaan 0–100 padahal artinya salah. Diperingatkan, tidak ditolak: satu
  // dua nilai kecil bisa saja benar.
  for (const c of hasil.kolom) {
    const baru = hasil.perubahan.filter((p) => p.komponen.id === c.komponen.id && p.baru > 0).map((p) => p.baru)
    if (baru.length >= 2 && Math.max(...baru) <= 10) {
      hasil.peringatan.push(
        salah(
          'Kolom {kode}: semua nilai barunya {maks} atau kurang. Templat memakai skala 0 sampai 100; bila rekap Anda berskala 0 sampai 10 atau 0 sampai 4, ubah dulu ke 0 sampai 100.',
          { kode: c.komponen.id, maks: Math.max(...baru) },
        ),
      )
    }
  }
  return hasil
}

/** Judul kolom satu tugas di templat, misalnya "A1-MK-T1 · Tugas 1: ...". */
export const judulKolom = (k) => k.id + ' · ' + k.label

/** Isi templat: { judul, isi }. Nilai yang sudah tersimpan ikut terisi, jadi dosen cukup mengubah yang berubah. */
export function isiTemplat({ mahasiswa, komponenKelas }) {
  return {
    judul: ['NIM', 'Nama', ...komponenKelas.map(judulKolom)],
    isi: [...mahasiswa]
      .sort((a, b) => a.nim.localeCompare(b.nim))
      .map((s) => [s.nim, s.name, ...komponenKelas.map((k) => nilaiTersimpan(s, k))]),
  }
}

// Isian kepala templat: toska muda, sewarna aksen VIBE.
const LATAR_JUDUL = '#D9F2EF'

/**
 * Lembar templat untuk write-excel-file: "Nilai mahasiswa" lalu "Petunjuk", ditulis dalam bahasa aktif lewat `t`.
 * NIM ditulis sebagai teks supaya nol di depannya tidak hilang; bacaRekap membaca lembar pertama.
 */
export function lembarTemplat({ mahasiswa, komponenKelas, kelas, t }) {
  const { judul, isi } = isiTemplat({ mahasiswa, komponenKelas })
  const kepala = judul.map((j, i) => ({
    value: i === 1 ? t('Nama') : j,
    type: String,
    fontWeight: 'bold',
    backgroundColor: LATAR_JUDUL,
    wrap: true,
    alignVertical: 'center',
  }))
  const data = [
    kepala,
    ...isi.map(([nim, nama, ...nilai]) => [
      { value: nim, type: String },
      { value: nama, type: String },
      ...nilai.map((n) => (n == null ? null : { value: n, type: Number })),
    ]),
  ]
  const teks = (s) => ({ value: s, type: String, wrap: true })
  const petunjuk = [
    [{ value: t('Cara mengisi templat ini'), type: String, fontWeight: 'bold' }],
    [teks(t('Kelas: {kelas}.', { kelas }))],
    [teks(t('Satu baris untuk satu mahasiswa. Jangan ubah baris judul, kolom NIM, dan urutan kolomnya.'))],
    [teks(t('Tulis nilai 0 sampai 100. Desimal boleh, misalnya 85,5.'))],
    [teks(t('Nilai yang sudah tersimpan ikut terisi. Cukup ubah atau tambah yang perlu.'))],
    [teks(t('Sel yang dikosongkan dilewati; nilai yang sudah tersimpan tidak terhapus.'))],
    [teks(t('Simpan sebagai .xlsx, lalu unggah di halaman Unggah Nilai.'))],
  ]
  return [
    {
      data,
      sheet: t('Nilai mahasiswa'),
      columns: [{ width: 16 }, { width: 32 }, ...komponenKelas.map(() => ({ width: 26 }))],
      stickyRowsCount: 1,
      stickyColumnsCount: 2,
    },
    { data: petunjuk, sheet: t('Petunjuk'), columns: [{ width: 96 }] },
  ]
}

const rerata = (a) => Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10

/** Ringkasan kelas untuk Beranda dosen, dari nilai yang tersimpan: per tugas, per mahasiswa, dan seluruh kelas. */
export function ringkasKelas({ mahasiswa, komponenKelas }) {
  const perTugas = komponenKelas.map((k) => {
    const angka = mahasiswa.map((s) => nilaiTersimpan(s, k)).filter((n) => n != null)
    return { komponen: k, terisi: angka.length, rata: angka.length ? rerata(angka) : null }
  })
  const perMahasiswa = mahasiswa.map((s) => {
    const isi = komponenKelas.map((k) => ({ komponen: k, nilai: nilaiTersimpan(s, k) }))
    const ada = isi.filter((x) => x.nilai != null)
    return {
      mahasiswa: s,
      isi,
      terisi: ada.length,
      rata: ada.length ? rerata(ada.map((x) => x.nilai)) : null,
      terendah: ada.length ? ada.reduce((a, b) => (b.nilai < a.nilai ? b : a)) : null,
    }
  })
  const semua = perMahasiswa.flatMap((m) => m.isi.filter((x) => x.nilai != null).map((x) => x.nilai))
  return {
    perTugas,
    perMahasiswa,
    terisi: semua.length,
    total: mahasiswa.length * komponenKelas.length,
    rata: semua.length ? rerata(semua) : null,
    dibawahAmbang: perMahasiswa.filter((m) => m.rata != null && m.rata < CONFIG.AMBANG_SERTIFIKAT).length,
  }
}
