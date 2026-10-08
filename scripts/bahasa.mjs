/* --------------------------------------------------------------------------
   Penjaga sinkronisasi kamus dwibahasa.

   Menjawab satu pertanyaan: kalimat mana yang sudah dibungkus t(...) tetapi
   belum punya padanan Inggris di teks.js. Kalimat seperti itu tidak membuat
   aplikasi rusak — ia jatuh kembali ke bahasa Indonesia — tetapi ia muncul
   sebagai satu baris Indonesia di tengah halaman berbahasa Inggris, dan itu
   persis keluhan yang membuat alat ini dibuat.

   DUA CARA MEMAKAINYA:

     npm run test:bahasa     memeriksa saja; keluar dengan kode 1 bila ada yang
                             tertinggal, jadi bisa dipasang di CI nanti.

     npm run bahasa:sync     MENULISKAN kunci yang tertinggal ke teks.js dengan
                             sisi Inggris dikosongkan, siap diisi. Kunci yang
                             sudah tidak dipakai lagi ikut dilaporkan supaya
                             kamus tidak menggemuk sendiri.

   Yang tidak dilakukan alat ini: menerjemahkan. Mesin penerjemah akan mengarang
   istilah untuk hal seperti "aspek CPMK" atau "Kemahasiswaan", dan kesalahan
   semacam itu justru lebih sulit ditemukan daripada kalimat yang jelas-jelas
   masih berbahasa Indonesia.

   Perbandingan kuncinya DIRAPIKAN lebih dulu (spasi berlebih dipadatkan),
   sama persis dengan yang dilakukan lib/bahasa.jsx saat menerjemahkan. Tanpa
   itu, kalimat panjang yang ditata ulang penyunting kode akan terbaca sebagai
   kunci baru padahal tulisannya sama.
   -------------------------------------------------------------------------- */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { EN } from '../src/lib/teks.js'

const TULIS = process.argv.includes('--tulis')
const BERKAS_KAMUS = 'src/lib/teks.js'

const BERKAS = [
  ...readdirSync('src/halaman/student').map((f) => join('src/halaman/student', f)),
  ...readdirSync('src/halaman/dosen').map((f) => join('src/halaman/dosen', f)),
  ...readdirSync('src/halaman/admin').map((f) => join('src/halaman/admin', f)),
  ...readdirSync('src/components').map((f) => join('src/components', f)),
  ...readdirSync('src/components/charts').map((f) => join('src/components/charts', f)),
  'src/halaman/Login.jsx',
  'src/halaman/Profil.jsx',
].filter((f) => f.endsWith('.jsx'))

/* Harus sama persis dengan rapikan() di src/lib/bahasa.jsx. */
const rapikan = (teks) => String(teks ?? '').trim().replace(/\s+/g, ' ')

/* Kata yang memang identik di kedua bahasa, jadi tidak dihitung kurang. */
const SAMA = new Set(
  [
    'Dashboard', 'Email', 'Status', 'Helpdesk', 'draft', 'Admin', 'Workspace',
    'Maret', 'April', 'September', 'November', 'Februari', 'Final', 'Semester {n}',
    'Area {kode}', 'Nilai akhir', 'WhatsApp UMN', 'Customer Service',
    /* Bukan kalimat: keduanya argumen toLocaleTimeString yang kebetulan
       tertangkap pemindai. */
    '2-digit', 'id-ID',
    'Pilih Yan Akan Di Input', 'Manual', 'Semester', 'Skala', 'Keyakinan', 'Konversi',
    'Rollback', 'Import CSV', 'Overview', 'Nilai',
  ].map(rapikan),
)

const tanpaKomentar = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/* Semua literal di dalam pemanggilan t(...) atau teks(...), termasuk yang ada
   di dalam ternary. Dikembalikan bersama nama berkasnya supaya laporannya bisa
   menunjuk tempat, bukan cuma menyebut kalimat. */
function kunciDi(sumber) {
  const hasil = new Set()
  const teks = tanpaKomentar(sumber)
  const re = /\b(?:t|teks|tr)\(/g
  let m
  while ((m = re.exec(teks))) {
    let i = re.lastIndex
    let dalam = 1
    const mulai = i
    while (i < teks.length && dalam > 0) {
      const c = teks[i]
      if (c === '(') dalam++
      else if (c === ')') dalam--
      i++
    }
    const isi = teks.slice(mulai, i - 1)
    for (const lit of isi.matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
      const k = lit[1].replace(/\\'/g, "'")
      /* Nama properti dan potongan kode ikut tertangkap; yang diambil hanya
         yang benar-benar terbaca sebagai kalimat. */
      if (k && /[A-Za-z]/.test(k) && !/^[a-z]+$/.test(k.trim())) hasil.add(k)
      else if (['siap', 'belum', 'sementara', 'pada', 'draft'].includes(k)) hasil.add(k)
    }
  }
  return hasil
}

/* Kalimat yang tidak ditulis sebagai literal di dalam t(), melainkan datang
   dari modul data dan diterjemahkan lewat t(variabel). Pemindai tidak bisa
   melihatnya, jadi didaftarkan di sini supaya tetap ikut diperiksa. */
const DARI_DATA = [
  'WhatsApp UMN', 'Customer Service', 'Surel Softskill 5C',
  'Kirim pesan, dibalas pada jam kerja',
  'Hubungi lewat telepon pada jam kerja',
  'Untuk pertanyaan yang butuh lampiran',
  'Senin sampai Jumat, 08.00 hingga 17.00 WIB',
]

/* kunci rapi -> { asli, berkas } */
const dipakai = new Map()
const catat = (k, berkas) => {
  const r = rapikan(k)
  if (!dipakai.has(r)) dipakai.set(r, { asli: k, berkas })
}

for (const k of DARI_DATA) catat(k, 'src/lib/layanan.js')
for (const f of BERKAS) for (const k of kunciDi(readFileSync(f, 'utf8'))) catat(k, f)

/* Kamus, juga dirapikan, supaya pembandingannya setara. */
const kamus = new Map(Object.entries(EN).map(([k, v]) => [rapikan(k), v]))

const hilang = [...dipakai.entries()]
  .filter(([r]) => !SAMA.has(r) && !kamus.get(r))
  .sort((a, b) => a[0].localeCompare(b[0]))

/* --------------------------------------------------------------------------
   Kunci yang ada di kamus tapi sudah tidak dipakai di mana pun.

   Pemindai t(...) saja TIDAK cukup untuk menentukan ini. Banyak kalimat masuk
   lewat data — nama bulan di sebuah larik, label tab, judul prop, kalimat yang
   dirakit scoring.js — lalu baru diterjemahkan sebagai t(variabel). Kalau
   hanya mengandalkan pemindai, kunci seperti 'Agustus' atau 'Berjalan' akan
   dilaporkan menganggur padahal justru sedang dipakai, dan laporan itu akan
   memancing orang menghapus terjemahan yang masih hidup.

   Karena itu kunci dianggap terpakai bila kalimatnya MUNCUL DI MANA PUN di
   dalam src/, bukan hanya di dalam t(). Longgar memang, tetapi salah arah yang
   benar: lebih baik menahan satu kunci mati daripada menghapus satu yang
   hidup.
   -------------------------------------------------------------------------- */
function semuaSumber(dir) {
  const keluar = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const jalur = join(dir, e.name)
    if (e.isDirectory()) keluar.push(...semuaSumber(jalur))
    else if (/\.(jsx?|mjs)$/.test(e.name)) keluar.push(jalur)
  }
  return keluar
}

const SELURUH_SUMBER = semuaSumber('src')
  .filter((f) => f !== BERKAS_KAMUS)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const menganggur = [...kamus.entries()]
  .filter(([r, asli]) => {
    if (dipakai.has(r) || SAMA.has(r)) return false
    /* Potongan pendek saja sudah cukup: kalimat panjang di sumber kerap
       dipecah beberapa baris, jadi mencocokkan seluruhnya justru meleset. */
    const petik = r.slice(0, 40)
    return !SELURUH_SUMBER.includes(petik) && Boolean(asli)
  })
  .map(([r]) => r)
  .sort()

console.log('kunci terpakai di seluruh panel :', dipakai.size)
console.log('punya padanan Inggris           :', dipakai.size - hilang.length)
if (menganggur.length) console.log('kunci kamus tak terpakai lagi   :', menganggur.length)

if (!hilang.length) {
  console.log('\nSeluruh kalimat aplikasi punya padanan Inggris')
  if (menganggur.length) {
    console.log('\nBisa dibuang dari teks.js (tidak mendesak):')
    for (const r of menganggur.slice(0, 12)) console.log('  - ' + r.slice(0, 96))
    if (menganggur.length > 12) console.log('  …dan ' + (menganggur.length - 12) + ' lagi')
  }
  process.exit(0)
}

console.log('\nBELUM diterjemahkan (' + hilang.length + '):')
for (const [, { asli, berkas }] of hilang) {
  console.log('  - ' + asli.slice(0, 100))
  console.log('    ' + berkas)
}

if (!TULIS) {
  console.log('\nJalankan: npm run bahasa:sync')
  console.log('Perintah itu menuliskan kunci di atas ke teks.js, tinggal Anda isi sisi Inggrisnya.')
  process.exitCode = 1
} else {
  /* Ditulis dengan sisi Inggris KOSONG, bukan disalin dari bahasa Indonesia.
     Nilai kosong dibaca terjemah() sebagai "belum ada padanan" dan tetap jatuh
     ke bahasa Indonesia — sedangkan salinan Indonesia akan terlihat seperti
     sudah diterjemahkan, dan tidak pernah ada yang memperbaikinya. */
  const baris = hilang.map(([, { asli }]) => {
    const kunci = "'" + asli.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
    return '  ' + kunci + ": '',"
  })

  const blok =
    '\n  /* ----------------------------------------------------------------------\n' +
    '     BELUM DITERJEMAHKAN — ditulis otomatis oleh `npm run bahasa:sync`.\n' +
    '     Isi sisi kanannya, lalu pindahkan barisnya ke bagian yang sesuai di\n' +
    '     atas. Selama masih kosong, kalimatnya tampil dalam bahasa Indonesia.\n' +
    '     ---------------------------------------------------------------------- */\n' +
    baris.join('\n') +
    '\n}\n'

  const isi = readFileSync(BERKAS_KAMUS, 'utf8').replace(/\}\s*$/, '')
  writeFileSync(BERKAS_KAMUS, isi.replace(/\s*$/, '') + '\n' + blok, 'utf8')

  console.log('\n' + hilang.length + ' kunci ditulis ke ' + BERKAS_KAMUS)
  console.log('Cari blok "BELUM DITERJEMAHKAN" di bagian bawahnya.')
}
