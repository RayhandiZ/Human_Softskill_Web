/* Uji penyimpanan profil: kunci akun, putaran simpan-muat, pemisahan antar
   pengguna, dan penolakan berkas foto yang tidak layak.

   localStorage dipasang SEBELUM modulnya diimpor, karena profil.js membaca
   penyimpanan sekali saat dimuat. */

const isi = new Map()
globalThis.localStorage = {
  getItem: (k) => (isi.has(k) ? isi.get(k) : null),
  setItem: (k, v) => isi.set(k, String(v)),
  removeItem: (k) => isi.delete(k),
}

await import('./modeLokal.js')
const { kunciAkun, simpanProfil, bacaFoto, BATAS_FOTO_MB } = await import('../src/lib/profil.js')

const garis = (t) => '\n' + '─'.repeat(74) + '\n' + t + '\n' + '─'.repeat(74)
let gagal = 0
const cek = (nama, ok, rinci = '') => {
  if (!ok) gagal++
  console.log((ok ? 'LULUS ' : 'GAGAL ') + nama + (rinci ? '  → ' + rinci : ''))
}

/* ------------------------------- 1. kunci akun ---------------------------- */

console.log(garis('1. KUNCI AKUN'))

const kunciA = kunciAkun({ role: 'student', nim: '00000103940' })
const kunciB = kunciAkun({ role: 'student', nim: '261321262' })
const kunciAdmin = kunciAkun({ role: 'admin', email: 'kemahasiswaan@umn.ac.id' })

cek('Mahasiswa dikunci oleh NIM', kunciA === 'nim:00000103940', kunciA)
cek('Dua mahasiswa punya kunci berbeda', kunciA !== kunciB)
cek('Kemahasiswaan punya kunci tetap', kunciAdmin === 'unit:kemahasiswaan', kunciAdmin)

/* --------------------------- 2. putaran simpan-muat ------------------------ */

console.log(garis('2. SIMPAN LALU MUAT ULANG'))

simpanProfil(kunciA, { telepon: '(021) 5422 0808', ponsel: '0811 1000 5000', alamat: 'Gading Serpong' })
simpanProfil(kunciAdmin, { telepon: '021 5422 0808 ext. 3902' })

const mentah = JSON.parse(localStorage.getItem('sk5c.profil'))
cek('Tertulis ke penyimpanan', !!mentah, Object.keys(mentah ?? {}).join(', '))
cek('Isi mahasiswa benar', mentah[kunciA]?.ponsel === '0811 1000 5000', mentah[kunciA]?.ponsel)

/* Impor kedua dengan kueri berbeda memaksa Node membuat instans modul baru —
   inilah tiruan paling dekat dari "halaman dimuat ulang". */
const segar = await import('../src/lib/profil.js?muat=2')
const sesudah = JSON.parse(localStorage.getItem('sk5c.profil'))
segar.simpanProfil(kunciB, { telepon: '0812 3456 7890' })
const gabungan = JSON.parse(localStorage.getItem('sk5c.profil'))

cek('Data lama tetap ada setelah muat ulang', sesudah[kunciA]?.alamat === 'Gading Serpong')
cek('Sesi baru tidak menghapus profil lain', !!gabungan[kunciA] && !!gabungan[kunciAdmin])
cek('Profil mahasiswa lain terpisah', gabungan[kunciB]?.telepon === '0812 3456 7890')
cek(
  'Profil B tidak bocor ke profil A',
  gabungan[kunciA]?.telepon !== gabungan[kunciB]?.telepon,
  gabungan[kunciA]?.telepon + ' vs ' + gabungan[kunciB]?.telepon,
)

/* ------------------------- 3. bidang yang tidak dikenal -------------------- */

console.log(garis('3. HANYA BIDANG MILIK PENGGUNA'))

/* Kolom milik institusi tidak boleh ikut tersimpan lewat halaman profil.
   simpanProfil memang menerima objek apa adanya, jadi yang dijaga di sini
   adalah bentuk bawaannya: empat bidang, tidak lebih. */
const bawaan = await simpanProfil('nim:uji-bawaan', {})
cek(
  'Bentuk bawaan hanya bidang milik pengguna',
  Object.keys(bawaan).sort().join(',') === 'alamat,foto,fotoSumber,ponsel,telepon',
  Object.keys(bawaan).sort().join(','),
)

/* ---------------------------- 4. penolakan foto --------------------------- */

console.log(garis('4. BERKAS FOTO YANG DITOLAK'))

const tolak = async (nama, file, potongan) => {
  try {
    await bacaFoto(file)
    cek(nama, false, 'tidak ada penolakan')
  } catch (e) {
    cek(nama, e.message.includes(potongan), e.message)
  }
}

await tolak('Tanpa berkas', null, 'Tidak ada berkas')
await tolak('Jenis salah (PDF)', { type: 'application/pdf', size: 1000 }, 'JPG, PNG, WebP, atau GIF')
await tolak(
  'Melebihi batas ukuran',
  { type: 'image/png', size: (BATAS_FOTO_MB + 1) * 1024 * 1024 },
  'melebihi batas',
)

console.log('')
console.log(gagal ? 'ADA ' + gagal + ' PEMERIKSAAN GAGAL' : 'Semua pemeriksaan lulus')
process.exit(gagal ? 1 : 0)
