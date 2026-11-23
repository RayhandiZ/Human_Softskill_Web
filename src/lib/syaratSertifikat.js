import { CONFIG, withConfig } from './config.js'
import { getAspek } from './curriculum.js'
import { PERIODE_AKTIF, labelPeriode, periodeSah, periodeSetelah, samaPeriode } from './data.js'
import { kelayakanSertifikat, labelSyaratTambahan, syaratSudahMulai } from './rules.js'

/* Syarat kelayakan cetak sertifikat yang diatur Super Admin di Aturan Sistem: nilai akhir minimal, dua syarat bawaan yang
   boleh dimatikan (semester dan pengesahan angkatan), dan syarat tambahan. Syarat tambahan ada dua jenis:
   - 'nilai':  { id, jenis, aspekId, nilaiMin, aktif, mulai }, nilai satu aspek minimal sekian, diperiksa otomatis;
   - 'manual': { id, jenis, nama, aktif, mulai }, bernama bebas, ditandai Super Admin per mahasiswa (tabel SyaratMahasiswa).
   `mulai`: null = langsung berlaku, atau { tahun, semester } = baru berlaku saat periode akademik sampai ke sana.
   Dipakai layar untuk pratinjau dan server untuk memutuskan, jadi hitungannya sama. Lihat README.md › Sertifikat › Mengubah
   syarat kelayakan. */

export const ALASAN_SYARAT_MIN = 10
export const SYARAT_TAMBAHAN_MAKS = 10
export const NAMA_SYARAT_MIN = 5
export const NAMA_SYARAT_MAKS = 120
export const TANDA_MAKS = 500

const JENIS_SYARAT = ['nilai', 'manual']
const rapikanNama = (s) => String(s ?? '').trim().replace(/\s+/g, ' ')

/** Satu syarat tambahan hanya dengan isian yang dikenal, dalam urutan tetap. */
export const rapikanTambahan = (s) =>
  s.jenis === 'nilai'
    ? { id: s.id ?? null, jenis: 'nilai', aspekId: s.aspekId, nilaiMin: s.nilaiMin, aktif: s.aktif !== false, mulai: periodeSah(s.mulai) }
    : { id: s.id ?? null, jenis: 'manual', nama: rapikanNama(s.nama), aktif: s.aktif !== false, mulai: periodeSah(s.mulai) }

/** Syarat yang sedang berlaku, dalam bentuk yang dikirim layar. */
export const susunanSyarat = () => ({
  nilaiMinimum: CONFIG.AMBANG_SERTIFIKAT,
  syaratSemester: CONFIG.SYARAT_SERTIFIKAT?.semester !== false,
  syaratPengesahan: CONFIG.SYARAT_SERTIFIKAT?.terkunci !== false,
  tambahan: (Array.isArray(CONFIG.SYARAT_TAMBAHAN) ? CONFIG.SYARAT_TAMBAHAN : []).filter(Boolean).map(rapikanTambahan),
})

/** Bentuk `susunanSyarat` sebagai kunci CONFIG / tabel Konfigurasi. */
export const keKonfigurasi = (s) => ({
  AMBANG_SERTIFIKAT: s.nilaiMinimum,
  SYARAT_SERTIFIKAT: { semester: s.syaratSemester, terkunci: s.syaratPengesahan },
  SYARAT_TAMBAHAN: s.tambahan,
})

// Periode mulai yang sudah tercapai sama artinya dengan langsung berlaku, jadi tidak dihitung sebagai perubahan.
const bentukBanding = (s) => ({ ...rapikanTambahan(s), mulai: syaratSudahMulai(s) ? null : periodeSah(s.mulai) })

export const samaSyarat = (a, b) =>
  a.nilaiMinimum === b.nilaiMinimum &&
  a.syaratSemester === b.syaratSemester &&
  a.syaratPengesahan === b.syaratPengesahan &&
  JSON.stringify(a.tambahan.map(bentukBanding)) === JSON.stringify(b.tambahan.map(bentukBanding))

/** Syarat tambahan sebagai teks pendek untuk rincian log. */
function teksSyaratLog(s) {
  const [kunci, isi] = labelSyaratTambahan(s)
  const nama = isi ? kunci.replace(/\{(\w+)\}/g, (_, k) => isi[k]) : kunci
  const catatan = [s.aktif ? null : 'nonaktif', syaratSudahMulai(s) ? null : 'mulai ' + labelPeriode(s.mulai)].filter(Boolean)
  return nama + (catatan.length ? ' (' + catatan.join(', ') + ')' : '')
}

export const syaratUntukLog = (s) => ({
  nilaiMinimum: s.nilaiMinimum,
  syaratSemester: s.syaratSemester,
  syaratPengesahan: s.syaratPengesahan,
  syaratTambahan: s.tambahan.map(teksSyaratLog),
})

/** Pesan galat bila satu syarat tambahan tidak sah, atau null. `asal`: syarat yang sudah tersimpan dengan id yang sama. */
function periksaSatuTambahan(s, asal) {
  if (asal && asal.jenis !== s.jenis) return 'Jenis syarat yang sudah ada tidak bisa diganti.'
  if (s.mulai != null) {
    const mulai = periodeSah(s.mulai)
    if (!mulai) return 'Periode mulai berlaku tidak valid.'
    // Jadwal baru hanya boleh semester berikutnya; jadwal lama yang tidak diubah tetap boleh tersimpan.
    const tetap = asal?.mulai && samaPeriode(asal.mulai, mulai)
    if (!tetap && !samaPeriode(mulai, periodeSetelah(PERIODE_AKTIF, 1))) {
      return 'Syarat hanya bisa dijadwalkan mulai semester berikutnya.'
    }
  }
  if (s.jenis === 'manual') {
    const panjang = typeof s.nama === 'string' ? rapikanNama(s.nama).length : 0
    return panjang < NAMA_SYARAT_MIN || panjang > NAMA_SYARAT_MAKS ? 'Nama syarat harus 5 sampai 120 karakter.' : null
  }
  const aspek = getAspek(s.aspekId)
  if (!aspek) return 'Pilih aspek untuk syarat nilai.'
  // Aspek yang diarsipkan sesudah syaratnya dibuat tetap boleh tersimpan, supaya syarat lain masih bisa diubah.
  if (!aspek.aktif && asal?.aspekId !== s.aspekId) return 'Aspek yang dipilih sudah diarsipkan.'
  if (!Number.isInteger(s.nilaiMin) || s.nilaiMin < 0 || s.nilaiMin > 100) {
    return 'Nilai aspek minimal harus bilangan bulat 0 sampai 100.'
  }
  return null
}

/** Pesan galat bila isiannya tidak sah, atau null. `tambahanLama`: syarat tambahan yang sedang tersimpan. */
export function periksaSyarat({ nilaiMinimum, syaratSemester, syaratPengesahan, tambahan = [] } = {}, tambahanLama = []) {
  if (!Number.isInteger(nilaiMinimum) || nilaiMinimum < 0 || nilaiMinimum > 100) {
    return 'Nilai akhir minimal harus bilangan bulat 0 sampai 100.'
  }
  if (typeof syaratSemester !== 'boolean' || typeof syaratPengesahan !== 'boolean') return 'Pilihan syarat tidak valid.'
  if (!Array.isArray(tambahan)) return 'Syarat tambahan tidak valid.'
  if (tambahan.length > SYARAT_TAMBAHAN_MAKS) return 'Syarat tambahan paling banyak 10.'

  const lama = new Map(tambahanLama.map((s) => [s.id, s]))
  const idTerpakai = new Set()
  const namaTerpakai = new Set()
  const aspekTerpakai = new Set()
  for (const s of tambahan) {
    if (!s || !JENIS_SYARAT.includes(s.jenis) || typeof s.aktif !== 'boolean') return 'Syarat tambahan tidak valid.'
    // Id hanya boleh milik syarat yang sudah ada: tanda mahasiswa menempel pada id itu.
    if (s.id != null && (!lama.has(s.id) || idTerpakai.has(s.id))) {
      return 'Syarat tambahan sudah berubah. Muat ulang halaman, lalu ulangi perubahan Anda.'
    }
    if (s.id != null) idTerpakai.add(s.id)
    const masalah = periksaSatuTambahan(s, s.id == null ? null : lama.get(s.id))
    if (masalah) return masalah
    if (s.jenis === 'manual') {
      const kunci = rapikanNama(s.nama).toLowerCase()
      if (namaTerpakai.has(kunci)) return 'Nama syarat tidak boleh kembar.'
      namaTerpakai.add(kunci)
    } else {
      if (aspekTerpakai.has(s.aspekId)) return 'Satu aspek hanya boleh punya satu syarat nilai.'
      aspekTerpakai.add(s.aspekId)
    }
  }
  return null
}

/**
 * Akibat syarat `baru` terhadap `mahasiswa`. `nimSiapCetak`: mahasiswa yang aksesnya sudah disetujui; kelayakan dihitung
 * ulang setiap kali dicetak, jadi yang tidak lagi layak (`aksesTerhenti`) tidak bisa mencetak sampai memenuhi syarat.
 * `akanTertahan`: yang masih layak sesudah disimpan, tetapi tertahan begitu syarat yang dijadwalkan mulai berlaku.
 */
export function dampakSyarat(mahasiswa, baru, nimSiapCetak = []) {
  const hitung = () => mahasiswa.map((m) => kelayakanSertifikat(m).layak)
  const sebelum = hitung()
  const sesudah = withConfig(keKonfigurasi(baru), hitung)
  const nanti = baru.tambahan.some((s) => s.aktif && !syaratSudahMulai(s))
    ? withConfig(keKonfigurasi({ ...baru, tambahan: baru.tambahan.map((s) => ({ ...s, mulai: null })) }), hitung)
    : sesudah
  const siap = new Set(nimSiapCetak)
  const hasil = {
    total: mahasiswa.length,
    layakSebelum: 0,
    layakSesudah: 0,
    jadiLayak: 0,
    tidakLagiLayak: 0,
    aksesTerhenti: 0,
    akanTertahan: 0,
  }
  mahasiswa.forEach((m, i) => {
    if (sebelum[i]) hasil.layakSebelum++
    if (sesudah[i]) hasil.layakSesudah++
    if (!sebelum[i] && sesudah[i]) hasil.jadiLayak++
    if (sebelum[i] && !sesudah[i]) hasil.tidakLagiLayak++
    if (!sesudah[i] && siap.has(m.nim)) hasil.aksesTerhenti++
    if (sesudah[i] && !nanti[i]) hasil.akanTertahan++
  })
  return hasil
}

/**
 * Syarat tambahan yang keadaannya berubah bila periode akademik dipindah ke `tujuan`: `mulai` jadi berlaku, `batal` kembali
 * belum berlaku. `tertahan`: mahasiswa yang sekarang berhak tetapi belum memenuhi syarat yang mulai berlaku.
 */
export function syaratSaatPindahPeriode(tujuan, mahasiswa) {
  const sekarang = susunanSyarat()
  const nyala = sekarang.tambahan.filter((s) => s.aktif)
  const mulai = nyala.filter((s) => !syaratSudahMulai(s) && syaratSudahMulai(s, tujuan))
  const batal = nyala.filter((s) => syaratSudahMulai(s) && !syaratSudahMulai(s, tujuan))
  if (!mulai.length) return { mulai, batal, tertahan: 0 }
  const idMulai = new Set(mulai.map((s) => s.id))
  const tambahan = sekarang.tambahan.map((s) => (idMulai.has(s.id) ? { ...s, mulai: null } : s))
  return { mulai, batal, tertahan: dampakSyarat(mahasiswa, { ...sekarang, tambahan }).tidakLagiLayak }
}
