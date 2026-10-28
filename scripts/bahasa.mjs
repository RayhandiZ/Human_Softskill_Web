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
  ...readdirSync('src/halaman/super-admin').map((f) => join('src/halaman/super-admin', f)),
  ...readdirSync('src/components').map((f) => join('src/components', f)),
  ...readdirSync('src/components/charts').map((f) => join('src/components/charts', f)),
  'src/halaman/Login.jsx',
  'src/halaman/Profil.jsx',
  // Sasaran log yang diterjemahkan menurut polanya (labelSasaran), dipakai Log Aktivitas, Pusat Kendali, dan lonceng.
  'src/lib/labelLog.js',
].filter((f) => /\.jsx?$/.test(f))

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
      else if (['siap', 'belum', 'sementara', 'pada', 'draft', 'usulan', 'contoh'].includes(k)) hasil.add(k)
    }
  }
  return hasil
}

/* Kalimat yang tidak ditulis sebagai literal di dalam t(), melainkan datang
   dari modul data dan diterjemahkan lewat t(variabel). Pemindai tidak bisa
   melihatnya, jadi didaftarkan di sini supaya tetap ikut diperiksa. */
const DARI_DATA = [
  'WhatsApp UMN', 'Customer Service', 'Surel VIBE',
  'Kirim pesan, dibalas pada jam kerja',
  'Hubungi lewat telepon pada jam kerja',
  'Untuk pertanyaan yang butuh lampiran',
  'Senin sampai Jumat, 08.00 hingga 17.00 WIB',
  /* Judul grafik: prop title/subtitle diterjemahkan di dalam ChartFrame. */
  'Grafik Sebaran Aspek', 'Dari {n} mahasiswa yang sudah punya nilai',
  'Profil enam cluster', 'Rata-rata aspek CPMK di tiap cluster',
  'Nilai per aspek CPMK', 'Aspek CPMK, dikelompokkan menurut area pengembangan',
  'Perkembangan nilai per semester',
  'Nilai tersimpan per bulan', 'Nilai tersimpan', 'Bulan',
  'Banyaknya nilai tugas yang tersimpan tiap bulan (input baru maupun perubahan), menurut tanggal WIB. Ini bukan jumlah pengajuan koreksi.',
  /* Seri grafik perkembangan nilai mahasiswa (larik SERI di student/Dashboard.jsx, diterjemahkan lewat t(r.label)). */
  'Nilai tiap semester', 'Rata-rata',
  /* Ringkasan pilihan tanda status di Input Manual (TANDA_BARIS di admin/Nilai.jsx, lewat t(ringkas)). */
  'tahan walau sudah lengkap', 'nilai berhenti berubah',
  /* Status aspek di transkrip (STATUS_LABEL, lewat t(st.teks)) dan tab Dashboard mahasiswa (lewat t(label)). */
  'Belum dibuka',
  /* Nama lengkap sumber penilaian (SUMBER di curriculum.js), di "Arti kode" transkrip dan title pil sumber. */
  'Personal Development Program', 'Mata Kuliah Humaniora / Kebangsaan', 'Student Service & Engagement',
  /* src/lib/ingest.js: label keyakinan, skala, dan cara menggabung kolom di Import CSV. */
  'Yakin', 'Perlu dicek', 'Tebakan lemah', 'Tidak cocok',
  '0–100 (tanpa konversi)', '0–10 (dikali 10)', '0–4 (dikali 25)',
  'Rata-rata', 'Ambil tertinggi', 'Pakai kolom terakhir', '— Abaikan kolom ini —',
  /* Jenis penilaian MK (LABEL_JENIS di Kurikulum dan EditorPenilaian). */
  'Tugas', 'Sikap', 'UTS', 'UAS',
  /* Cara masuknya nilai satu batch (CARA_BATCH di admin/Nilai.jsx, lewat t(CARA_BATCH[b.cara])). */
  'input manual', 'unggahan dosen', 'pengajuan koreksi',
  /* Persetujuan dua lapis (src/lib/duaLapis.js): label status koreksi dan sertifikat, kalimat keadaan sertifikat
     (KALIMAT_KEADAAN di student/Sertifikat.jsx), dan ubin Sertifikat di Dashboard (UBIN_SERTIFIKAT). */
  'Menunggu Admin', 'Menunggu Super Admin', 'Disetujui', 'Ditolak', 'Siap dicetak',
  'Semua syarat terpenuhi. Minta akses cetak untuk mendapatkan sertifikatmu.',
  'Permintaan akses cetak sedang ditinjau admin Kemahasiswaan.',
  'Admin Kemahasiswaan sudah menyetujui. Menunggu persetujuan Super Admin.',
  'Akses cetak sudah disetujui. Sertifikat siap dicetak.',
  'Permintaan akses cetak ditolak. Periksa alasannya, lalu ajukan lagi bila sudah sesuai.',
  'Belum tersedia', 'Bisa diminta', 'Minta akses cetak di halaman ini', 'Menunggu persetujuan',
  'Sedang ditinjau admin Kemahasiswaan', 'Menunggu persetujuan Super Admin', 'Buka untuk mencetak',
  'Permintaan ditolak', 'Buka untuk melihat alasannya',
  /* Akses cetak yang dicabut: label status, kalimat keadaan, dan ubin Dashboard. */
  'Dicabut', 'Akses dicabut',
  /* Unggahan dosen yang diajukan ke Super Admin (SEBAB_PERSETUJUAN dan STATUS_PERMINTAAN di dosen/Unggah.jsx), dan
     label tindakannya di Persetujuan dan Log Aktivitas (LABEL_AKSI, LABEL_LOG). */
  'angkatan sudah disahkan', 'program sudah selesai', 'aspek sudah final',
  'Menunggu persetujuan Super Admin', 'Disetujui Super Admin', 'Ditolak Super Admin', 'Gagal dijalankan', 'Ditarik',
  'Perbaikan nilai dari dosen', 'Ubah kelas dosen',
  'Akses cetak sertifikatmu dicabut. Baca alasannya, lalu minta lagi bila masalahnya sudah selesai.',
  /* Label menu panel dosen (DosenLayout, diterjemahkan MenuSamping dan BilahBawah); 'Riwayat' juga menu mahasiswa. */
  'Beranda', 'Unggah Nilai', 'Unggah', 'Riwayat', 'Profil',
  /* Unggahan nilai dosen: galat dan peringatan bacaRekap (src/lib/unggahDosen.js) dan galat bacaBerkas
     (dosen/Unggah.jsx), diterjemahkan lewat t(g.teks, g.isi) dan t(e.message); lalu isi lembar templat Excel
     (lembarTemplat di src/lib/unggahDosen.js, yang tidak dipindai). */
  'Cara mengisi templat ini', 'Kelas: {kelas}.', 'Nilai mahasiswa', 'Petunjuk',
  'Satu baris untuk satu mahasiswa. Jangan ubah baris judul, kolom NIM, dan urutan kolomnya.',
  'Nilai yang sudah tersimpan ikut terisi. Cukup ubah atau tambah yang perlu.',
  'Simpan sebagai .xlsx, lalu unggah di halaman Unggah Nilai.',
  'Berkasnya kosong: tidak ada baris judul maupun nilai.',
  'Kolom NIM tidak ditemukan di baris pertama. Pakai templat dan jangan ubah baris judulnya.',
  'Kolom "{kolom}" tidak dikenali sebagai tugas kelas Anda. Pakai judul kolom dari templat.',
  'Kolom "{kolom}" dan "{lain}" sama-sama untuk {kode}. Hapus salah satunya.',
  'Tidak ada kolom tugas yang dikenali. Pakai templat dari halaman ini.',
  'Ada angka di kolom tanpa judul: {kolom}. Pastikan setiap nilai berada di bawah judul tugasnya, lalu hapus angka di kolom tersebut.',
  'Baris {baris}: NIM kosong.',
  'Baris {baris}: NIM {nim} tidak terdaftar di kelas Anda.',
  'Baris {baris}: NIM {nim} sudah ada di baris {lain}.',
  'Baris {baris} (NIM {nim}), kolom {kode}: "{sel}" bukan angka 0 sampai 100.',
  'Baris {baris} (NIM {nim}): aspek {aspek} baru dibuka pada Semester {n}.',
  'Kolom {kode}: semua nilai barunya {maks} atau kurang. Templat memakai skala 0 sampai 100; bila rekap Anda berskala 0 sampai 10 atau 0 sampai 4, ubah dulu ke 0 sampai 100.',
  'Berkasnya lebih dari 5 MB. Pastikan ini rekap nilai kelas Anda.',
  'Berkas .xls (Excel lama) belum bisa dibaca. Buka di Excel, simpan sebagai .xlsx, lalu unggah lagi.',
  'Pilih berkas .xlsx atau .csv.',
  'Berkas ini tidak terbaca sebagai Excel. Simpan ulang sebagai .xlsx lalu unggah lagi.',
  /* Alat di menu aksesibilitas semua panel (larik KONTEN, WARNA, ALAT di MenuAksesibilitas.jsx). */
  'Sorot judul', 'Sorot tautan', 'Huruf ramah disleksia', 'Jarak huruf', 'Jarak baris', 'Huruf tebal',
  'Kontras gelap', 'Kontras terang', 'Kontras tinggi', 'Saturasi tinggi', 'Saturasi rendah', 'Monokrom',
  'Pemandu baca', 'Hentikan animasi', 'Kursor besar',
]
/* Sama, tetapi dari src/lib/rules.js: catatan kaki transkrip sementara, dan labelT/alasanT/ringkasT syarat
   sertifikat. */
const DARI_ATURAN = [
  'Dokumen ini bukan bukti kelulusan pembinaan skill.',
  'Sudah menempuh Semester {n}', 'Baru menempuh Semester {n} dari {total}', 'program baru sampai Semester {n}',
  'Seluruh {n} aspek berstatus final', 'Belum final: {daftar}', 'aspek {daftar} belum final',
  'Tidak ada komponen asesmen yang kosong', 'Komponen kosong pada {daftar}',
  'komponen {komponen} pada {kode} belum dinilai',
  'Nilai akhir minimal {n}', 'Nilai akhir belum bisa dihitung', 'Nilai akhir {nilai}, di bawah rata-rata minimal {n}',
  'nilai akhir belum bisa dihitung', 'nilai akhir {nilai} di bawah rata-rata minimal {n}',
  'Nilai angkatan sudah disahkan Kemahasiswaan', 'Nilai angkatan {label} belum disahkan', 'nilai angkatan {label} belum disahkan',
]

/* kunci rapi -> { asli, berkas } */
const dipakai = new Map()
const catat = (k, berkas) => {
  const r = rapikan(k)
  if (!dipakai.has(r)) dipakai.set(r, { asli: k, berkas })
}

for (const k of DARI_DATA) catat(k, 'src/lib/layanan.js')
for (const k of DARI_ATURAN) catat(k, 'src/lib/rules.js')
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
  /* Dibandingkan dengan garis miring biasa: di Windows join() menghasilkan src\lib\teks.js, sehingga kamus dulu ikut
     terbaca sebagai sumber dan tidak satu kunci pun pernah dilaporkan menganggur. */
  .filter((f) => f.replace(/\\/g, '/') !== BERKAS_KAMUS)
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
