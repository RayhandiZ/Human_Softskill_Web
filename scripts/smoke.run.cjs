const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const w = dom.window
w.matchMedia = (q) => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} })
w.scrollTo = () => {}
for (const k of ['document','navigator','localStorage','HTMLElement','Element','Node','MutationObserver','requestAnimationFrame','cancelAnimationFrame','SVGElement','ResizeObserver','HTMLInputElement','HTMLSelectElement','Image','FileReader','File','Blob','Event','MouseEvent','KeyboardEvent']) global[k] = w[k]
global.window = w
global.IS_REACT_ACT_ENVIRONMENT = true
w.IS_REACT_ACT_ENVIRONMENT = true
global.ResizeObserver = w.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} }
w.ResizeObserver = global.ResizeObserver

const SESI = { student: JSON.stringify({ role:'student', studentId:'DEMO-2', email:'a@student.umn.ac.id', name:'X', initials:'RZ' }),
               admin:   JSON.stringify({ role:'admin',   email:'a@umn.ac.id', name:'Y', initials:'KH' }),
               dosen:   JSON.stringify({ role:'dosen',   email:'simon.petrus@lecturer.umn.ac.id', name:'Simon Petrus Wenehenubun, S.S., M.M.',
                                         initials:'SP', nip:'0312078801', sumber:'MK', semester:1, prodi:'Sistem Informasi' }),
               super:   JSON.stringify({ role:'admin', superAdmin:true, email:'super.admin@umn.ac.id', name:'Super Admin', initials:'SA' }) }

const ISI = {
  '/mahasiswa': [
    [/Nilai akhir/, 'ubin nilai akhir ada'],
    [/(Sementara|Final)[\s\S]{0,40}berdasarkan \d+ dari \d+ aspek/, 'nilai akhir disertai status dan dasar hitungnya (R3)'],
    [/Aspek dinilai[\s\S]{0,80}\/ \d+/, 'ubin jumlah aspek dinilai'],
    [/Semua \d+[\s\S]{0,60}Final \d+[\s\S]{0,60}Berjalan \d+[\s\S]{0,60}Terkunci \d+/, 'tab aspek lengkap dengan jumlahnya'],
    [/Perjalanan semester/, 'perjalanan semester ada'],
    /* Komponen yang belum dinilai pindah ke lonceng bilah atas — kartunya
       tidak boleh tertinggal di badan halaman. */
    [/<h2[^>]*>Belum dinilai<\/h2>/, 'kartu Belum dinilai tidak lagi di badan halaman', false, true],
    [/aria-label="\d+ komponen belum dinilai"/, 'lonceng Belum dinilai ada di bilah atas', true, true],
    [/Sertifikat[\s\S]{0,60}(Siap diunduh|Belum tersedia)/, 'status sertifikat tetap terlihat'],
    /* Ditambatkan ke elemen <footer>, bukan ke judul bagiannya: judulnya teks
       yang bebas diganti ("Pintasan" pernah menjadi "Short Cuts"), sedangkan
       keberadaan pintasannya sendiri yang ingin dijaga. */
    [/<footer[\s\S]*?Peta Perjalanan[\s\S]{0,900}Riwayat/, 'footer punya pintasan berikon', true, true],
    [/Helpdesk[\s\S]{0,300}vibe@umn\.ac\.id/, 'helpdesk dan kontak tercantum'],
    /* Nama lama tidak boleh tersisa; "Humaniora" di footer tidak ikut tertangkap karena polanya peka huruf. */
    [/>\s*VIBE\s*<\/span>/, 'merek VIBE di menu samping', true, true],
    [/HUMAN|[Hh]uman [Ss]kill/, 'nama lama Human Skill sudah tidak tampil', false],
    [/Akses Cepat/, 'tidak ada lagi blok tombol mati', false],
    /* Aksesoris rujukan yang sengaja tidak dibawa. */
    [/<input[^>]*type="search"/, 'tidak ada kotak pencarian hiasan', false, true],
    [/Upgrade|Kalender/, 'tidak ada kartu promosi atau kalender kosong', false],
  ],
  '/admin': [
    /* Kartu "Requires Review" dilebur ke lonceng — isinya mengulang angka yang
       sama dengan daftar "Belum dinilai" di sana. */
    [/Requires Review/, 'kartu Requires Review sudah tidak ada di Ringkasan', false],
    /* Kartu "Halaman lain" dilepas: menu samping sudah memuat semua halaman. Yang dibuka di atas sekarang
       pekerjaan yang menunggu, atau satu baris tenang bila tidak ada. */
    [/Perlu dikerjakan|Tidak ada pekerjaan yang menunggu/, 'pekerjaan yang menunggu dibuka paling atas'],
    [/Halaman lain/, 'tidak ada lagi kartu Halaman lain', false],
    [/Mahasiswa terpantau[\s\S]{0,400}Rata-rata nilai[\s\S]{0,400}Nilai sudah final/, 'hanya tiga angka utama'],
    /* Catatan "bobot sementara" DIHAPUS dari halaman oleh pemilik proyek, jadi
       pemeriksaannya ikut dilepas — bukan karena tidak penting. Kalimat itu yang
       dulu memberi tahu bahwa rata-rata masih memakai bobot MENUNGGU_KONFIRMASI
       dan bisa berubah. Bila nanti dipasang lagi, kembalikan baris ini. */
    [/Grafik Sebaran Aspek/, 'ada satu grafik sebaran'],
    [/Nilai yang sudah masuk[\s\S]{0,40}%/, 'persentase nilai yang sudah masuk'],
    [/Di atas batas 70[\s\S]{0,40}%/, 'persentase di atas batas kelulusan'],
    [/Sudah dikunci[\s\S]{0,40}%/, 'persentase nilai yang sudah final'],
    [/Huruf A[\s\S]{0,200}Huruf B[\s\S]{0,200}Huruf C/, 'tiap irisan diberi label huruf, bukan warna saja'],
    [/sudah dinilai/, 'pusat donat menyebut dasar penghitungannya'],
    [/Kelengkapan nilai/, 'tidak ada lagi tabel kelengkapan padat', false],
    [/Rata-rata per aspek CPMK/, 'tidak ada lagi bar sepuluh aspek', false],
    [/Fakultas[\s\S]{0,60}Program studi[\s\S]{0,60}Angkatan[\s\S]{0,60}Semester/, 'tidak ada filter bertingkat', false],
  ],
  '/mahasiswa/riwayat': [
    [/FASE 4|Segera hadir/i, 'bukan lagi halaman segera hadir', false],
    [/Riwayat penilaian/, 'ada daftar riwayat penilaian'],
    [/disetujui oleh/, 'komponen final menyebut siapa yang menyetujui'],
    [/dari (PDP|MK Humaniora|Kemahasiswaan)/, 'tiap catatan menyebut jalur penilaiannya'],
    [/Final berarti aspeknya sudah dikunci/, 'arti Final dijelaskan'],
    /* Yang belum dinilai tempatnya di lonceng, bukan di riwayat. */
    [/belum masuk/, 'komponen yang belum dinilai tidak ikut masuk riwayat', false],
  ],
  '/mahasiswa/peta': [
    [/FASE 4|Segera hadir/i, 'bukan lagi halaman segera hadir', false],
    [/Anda sedang menjalani Semester 2 dari 3/, 'posisi mahasiswa disebut di kepala halaman'],
    [/Anda di sini/, 'penanda posisi ada'],
    [/Anda di sini[\s\S]*Anda di sini/, 'penanda posisi hanya satu', false],
    [/PDP-2: Teamwork[\s\S]{0,4000}Pancasila/, 'semester berjalan terbuka lebih dulu'],
    [/Religiositas|Civics/, 'semester lain tertutup saat halaman dibuka', false],
  ],
  '/mahasiswa/profil': [
    [/Nomor induk mahasiswa/, 'NIM tercantum di profil mahasiswa'],
    [/Umum/, 'bagian Umum ada'],
    [/Foto profil/, 'bagian Foto profil ada'],
    [/Akademik/, 'bagian Akademik ada'],
    [/Opsional/, 'bagian Opsional ada'],
    [/Seret berkas ke sini/, 'area seret-dan-lepas foto tersedia'],
    [/Perbarui profil/, 'ada tombol simpan yang benar-benar menyimpan'],
    /* Inti pembedaan kolom: data milik institusi tidak boleh pernah dirender
       sebagai kendali yang bisa diketik. Kalau email atau NIM sampai muncul di
       dalam <input>, seseorang bisa menampilkan identitas orang lain. */
    [/<input[^>]*type="tel"/, 'kolom telepon memang sebuah input', true, true],
    [/<input[^>]*student\.umn\.ac\.id/, 'email tidak pernah menjadi kolom isian', false, true],
    [/<input[^>]*value="\d{9,}"/, 'NIM tidak pernah menjadi kolom isian', false, true],
  ],
  '/admin/profil': [
    [/Unit pengelola/, 'identitas unit tercantum'],
    [/Penanggung jawab/, 'penanggung jawab tercantum'],
    [/Periode kerja/, 'bagian Periode kerja ada'],
    [/Perbarui profil/, 'ada tombol simpan yang benar-benar menyimpan'],
    [/<input[^>]*type="tel"/, 'kolom telepon memang sebuah input', true, true],
    [/<input[^>]*kemahasiswaan@umn\.ac\.id/, 'email unit tidak pernah menjadi kolom isian', false, true],
  ],
  '/admin/nilai': [
    [/Pilih semester terlebih dahulu/, 'gerbang semester menutup area kerja'],
    [/Semester wajib dipilih sebelum data bisa dimasukkan/, 'dropdown semester ditandai wajib'],
    [/Semester 1 .*3 aspek/, 'tiap pilihan semester menyebut jumlah aspeknya'],
    /* Sumber penilaian kini tombol pilihan (radio name="sumber"), bukan <option>. */
    /* React memasang atribut name paling akhir pada input, jadi urutannya tidak dipatok. */
    [/<input(?=[^>]*name="sumber")(?=[^>]*value="PDP")[^>]*>/, 'pilihan sumber penilaian tampil', true, true],
    [/<input(?=[^>]*name="sumber")(?=[^>]*value="ENGAGEMENT")[^>]*>/, 'Kemahasiswaan tanpa komponen tidak ditawarkan sebagai sumber', false, true],
  ],

  '/dosen': [
    /* Judulnya kini sama dengan nama menunya (Beranda); lihat README.md › Panel Dosen. */
    [/<h1[^>]*>Beranda<\/h1>/, 'judul halaman Beranda, sama dengan menunya', true, true],
    [/Menunggu dinilai/, 'angka utama: yang belum dinilai'],
    [/Nilai tidak pernah datang dari mahasiswa/, 'R8 dinyatakan di halaman dosen'],
    [/MK Humaniora Semester 1, Sistem Informasi/, 'kelas yang dipegang disebut di kerangka'],
    [/Tugas yang dikumpulkan/, 'kolom tugas ada di tabel'],
    [/Belum dinilai/, 'status pengumpulan berlabel, bukan warna saja'],
    [/tidak langsung masuk transkrip/, 'dijelaskan bahwa nilainya perlu disetujui'],
    [/aria-label="Nilai untuk /, 'tidak ada kolom nilai di daftar pengumpulan', false, true],
    /* Footer melayang seperti panel mahasiswa; pintasannya keempat halaman dosen. */
    [/<footer[\s\S]*?Penilaian[\s\S]{0,900}Riwayat Pengiriman/, 'footer punya pintasan berikon', true, true],
    [/Helpdesk[\s\S]{0,300}vibe@umn\.ac\.id/, 'helpdesk dan kontak tercantum'],
    /* Ukuran panel seperti super admin; tulisan besar, kontras, dan alat lain lewat menu aksesibilitas. */
    [/<header[\s\S]*?aria-label="Menu aksesibilitas"/, 'tombol menu aksesibilitas di bilah atas', true, true],
  ],

  /* Penilaian dosen kini tiga langkah (README.md › Panel Dosen › Penilaian). Langkah 1 memilih tugas; langkah 2
     (?komponen=) mengisi nilai. Janji lamanya tetap dijaga: tidak ada tombol simpan langsung, akibat pengiriman
     dijelaskan, dan setiap kotak nilai berlabel. */
  '/dosen/nilai': [
    [/Pilih tugas yang ingin Anda nilai/, 'langkah pertama: memilih tugas'],
    [/aria-label="Langkah penilaian"/, 'langkah-langkah penilaian tertulis', true, true],
    [/Pilih tugas[\s\S]*Isi nilai[\s\S]*Periksa &amp; kirim/, 'tiga langkah: pilih tugas, isi nilai, periksa & kirim'],
    [/Nilai tugas ini/, 'tiap tugas punya tombol untuk mulai menilai'],
    [/Simpan nilai/, 'tidak ada tombol simpan langsung', false],
    [/Nilai baru masuk transkrip setelah disetujui/, 'dijelaskan bahwa nilainya perlu disetujui'],
  ],

  '/dosen/nilai?komponen=A1-MK-T1': [
    [/Tugas yang sedang dinilai/, 'langkah kedua: tugas yang dinilai disebut'],
    [/Ketik nilai satu per satu/, 'ada cara mengetik'],
    [/Unggah dari berkas CSV/, 'ada cara mengunggah'],
    [/Periksa &amp; kirim/, 'tombolnya menuju periksa dan kirim, bukan simpan'],
    [/Simpan nilai/, 'tidak ada tombol simpan langsung', false],
    [/belum terlihat oleh mahasiswa/, 'akibat pengiriman dijelaskan'],
    [/aria-label="Nilai untuk /, 'tiap kotak nilai punya label untuk pembaca layar', true, true],
    [/inputmode="decimal"/, 'kotak nilai menerima koma desimal', true, true],
    [/type="number"/, 'tidak ada kotak type=number (roda tetikus bisa mengubah angkanya)', false, true],
  ],

  '/dosen/usulan': [
    [/Riwayat pengiriman/, 'judul halaman Riwayat pengiriman, sama dengan menunya'],
    [/Menunggu keputusan/, 'angka utama: yang menunggu diputuskan'],
  ],

  '/admin/usulan': [
    /* Judulnya kini 'Persetujuan Nilai Dosen', sama dengan menu; huruf besar atau kecil sama-sama sah. */
    [/Persetujuan [Nn]ilai [Dd]osen/, 'judul halaman persetujuan'],
    [/Usulan menunggu keputusan/, 'angka utama: usulan yang tertahan'],
    [/Rahmat Nugroho/, 'usulan dosen pertama tampil'],
    [/Maria Ulfah/, 'usulan dosen kedua tampil'],
    [/Tidak satu pun sudah masuk transkrip/, 'ditegaskan nilainya masih tertahan'],
    [/Sudah diputuskan/, 'ada tab riwayat keputusan'],
  ],
  '/admin/angkatan': [
    [/Pantau kelengkapan nilai tiap angkatan/, 'judul dan penjelasan halaman angkatan'],
    [/2026[\s\S]{0,400}2025 Genap[\s\S]{0,400}2024/, 'kartu angkatan, terbaru lebih dulu'],
    [/Nilai yang belum masuk/, 'ringkasan nilai yang belum masuk'],
    [/Mahasiswa yang perlu ditindaklanjuti/, 'daftar mahasiswa yang perlu ditindaklanjuti'],
    [/Penguncian angkatan/, 'bagian penguncian angkatan'],
  ],
  '/admin/kurikulum': [
    [/Fase 8|Segera hadir/i, 'bukan lagi halaman segera hadir', false],
    [/Atur bobot komponen asesmen di setiap aspek/, 'judul dan penjelasan halaman kurikulum'],
    [/A\.1\.[\s\S]{0,3000}C\.2\./, 'kartu kesepuluh aspek'],
    [/Porsi berlaku[\s\S]{0,40}Porsi baru/, 'tabel porsi per komponen'],
    [/Dibagi otomatis[\s\S]{0,200}Atur manual/, 'pilihan otomatis atau manual'],
    [/Cara membagi bobot otomatis/, 'pengaturan pembagian otomatis'],
    [/Tinjau dan simpan/, 'bagian tinjau dan simpan'],
  ],
  '/admin/log': [
    [/Log Aktivitas/, 'judul Log Aktivitas'],
    [/Fase \d/, 'bukan lagi halaman segera hadir', false],
    [/Tindakan admin[\s\S]{0,40}Perubahan nilai/, 'tab tindakan admin dan perubahan nilai'],
  ],
  '/super': [
    [/Pusat Kendali/, 'judul Pusat Kendali'],
    [/permintaan menunggu/, 'jumlah permintaan yang menunggu di kartu keputusan'],
    [/Perlu keputusan Anda/, 'daftar yang perlu diputuskan'],
    [/Rantai pengawasan/, 'rantai pengawasan'],
    [/aria-label="Menu super admin"/, 'menu samping super admin', true, true],
  ],
  '/super/persetujuan': [
    [/Persetujuan Admin/, 'super admin melihat judul Persetujuan Admin'],
    [/Menunggu[\s\S]{0,40}Riwayat/, 'tab menunggu dan riwayat'],
  ],
  '/super/penilaian': [
    [/Pilih aspek yang ingin diubah/, 'pemilih aspek'],
    [/Penilaian A\.1/, 'editor penilaian aspek pertama terbuka'],
    [/Tambah komponen/, 'komponen bisa ditambah manual'],
    [/Ajukan ke Super Admin/, 'super admin tidak diminta mengajukan', false],
  ],
  '/super/akses': [
    [/Akses Pengguna/, 'judul Akses Pengguna'],
    [/Tentukan mahasiswa, dosen, dan admin Kemahasiswaan/, 'penjelasan siapa yang diatur'],
    [/Akses Super Admin tidak bisa dicabut atau dihapus dari sini/, 'catatan batas wewenang'],
  ],
  '/super/log': [
    [/Log Aktivitas/, 'judul Log Aktivitas'],
    [/Jenis tindakan/, 'penyaring jenis tindakan'],
    [/Hari ini[\s\S]{0,80}7 hari terakhir/, 'pilihan cepat rentang waktu'],
  ],
  '/super/wewenang': [
    [/Matriks wewenang/, 'matriks wewenang'],
    [/Mengunci angkatan[\s\S]{0,400}Selalu perlu persetujuan/, 'kunci angkatan oleh admin selalu perlu persetujuan'],
    [/Yang meminta tidak menyetujui/, 'prinsip pemisahan tugas'],
  ],
  '/super/aturan': [
    [/Aturan Sistem/, 'judul Aturan Sistem'],
    [/Nilai minimum sertifikat[\s\S]{0,200}70/, 'ambang sertifikat 70'],
    [/Menunggu konfirmasi/, 'tanda menunggu konfirmasi'],
  ],
  '/super/profil': [[/Super Admin/, 'profil berperan Super Admin']],
  '/admin/persetujuan': [
    [/Permintaan Saya/, 'admin biasa melihat judul Permintaan Saya'],
    [/menunggu persetujuan Super Admin sebelum berlaku/, 'penjelasan alur persetujuan'],
    [/Menunggu[\s\S]{0,40}Riwayat/, 'tab menunggu dan riwayat'],
    [/Setujui dan jalankan/, 'admin biasa tidak melihat tombol menyetujui', false],
  ],
  '/admin/sertifikat': [
    /* Judulnya kini 'Cetak Sertifikat', sama dengan menu; huruf s besar atau kecil sama-sama sah. */
    [/Cetak [Ss]ertifikat/, 'judul halaman cetak sertifikat'],
    [/[0-9]+ dari [0-9]+ mahasiswa sudah berhak atas sertifikat/, 'jumlah yang berhak tertulis'],
    [/Semua [0-9]+[\s\S]{0,40}Berhak [0-9]+[\s\S]{0,40}Belum berhak [0-9]+/, 'tab kelayakan lengkap dengan jumlahnya'],
    [/Simpan sebagai PDF/, 'petunjuk simpan PDF untuk dikirim ke mahasiswa'],
    [/aria-label="Cetak sertifikat [^"]+"/, 'tiap baris punya tombol cetak berlabel nama mahasiswa', true, true],
  ],
}

const RUTE = [
  ['student', '/mahasiswa', 'Ringkasan mahasiswa'],
  ['student', '/mahasiswa/transkrip', 'Transkrip'],
  ['student', '/mahasiswa/peta', 'Peta Perjalanan'],
  ['student', '/mahasiswa/riwayat', 'History'],
  ['student', '/mahasiswa/sertifikat', 'Sertifikat'],
  ['student', '/mahasiswa/profil', 'Profil mahasiswa'],
  ['admin', '/admin', 'Ringkasan admin'],
  ['admin', '/admin/mahasiswa', 'Data mahasiswa'],
  ['admin', '/admin/mahasiswa/DEMO-3', 'Detail mahasiswa'],
  ['admin', '/admin/program-studi', 'Program studi'],
  ['admin', '/admin/nilai', 'Input nilai'],
  ['admin', '/admin/profil', 'Profil admin'],
  ['admin', '/admin/usulan', 'Persetujuan nilai dosen'],
  ['admin', '/admin/sertifikat', 'Cetak sertifikat'],
  ['admin', '/admin/angkatan', 'Angkatan'],
  ['admin', '/admin/kurikulum', 'Kurikulum CPMK'],
  ['admin', '/admin/persetujuan', 'Permintaan Saya'],
  ['admin', '/admin/log', 'Log aktivitas'],
  ['super', '/super', 'Pusat Kendali'],
  ['super', '/super/persetujuan', 'Persetujuan (super admin)'],
  ['super', '/super/penilaian', 'Penilaian & bobot'],
  ['super', '/super/akses', 'Akses pengguna'],
  ['super', '/super/log', 'Log aktivitas (super admin)'],
  ['super', '/super/wewenang', 'Peran & wewenang'],
  ['super', '/super/aturan', 'Aturan sistem'],
  ['super', '/super/profil', 'Profil super admin'],
  ['dosen', '/dosen', 'Beranda dosen'],
  ['dosen', '/dosen/nilai', 'Penilaian dosen: pilih tugas'],
  ['dosen', '/dosen/nilai?komponen=A1-MK-T1', 'Penilaian dosen: isi nilai'],
  ['dosen', '/dosen/usulan', 'Riwayat pengiriman dosen'],
  ['dosen', '/dosen/profil', 'Profil dosen'],
]

;(async () => {
  const bundle = require('./bundle.cjs')
  const mod = require(bundle('smoke.jsx', '.smoke.cjs', { platform: 'browser', format: 'cjs', loader: { '.jsx': 'jsx' }, jsx: 'automatic' }))
  const { render, daftarUji, ujiMenuHp, ujiBilahBawah, ujiAspek, ujiRingkasHp, ujiPeta, ujiRiwayat, ujiLoncengAdmin, ujiSasaranInput, ujiKeputusanKoreksi, ujiSasaranDanTanda, ujiPenyuntingFoto, ujiLihatFoto, ujiSegarkanData, ujiLaciAdmin, ujiStatusData, ujiLipatOverview, ujiAlurDosen, ujiBahasa, ujiSeretBahasa, ujiLayanan, ujiPanelLain, ujiKamus, ujiOtomatis, ujiStatusPolos, ujiCetakTranskrip, ujiTandaDraft, ujiTrenSemester, ujiKurva, ujiPerkembangan, ujiPenandaMenu, ujiSertifikat, ujiSertifikatAdmin, ujiAngkatan, ujiKurikulum, ujiSuperAdmin, ujiPanelSuper, ujiMataSandi, ujiBahasaMasuk, ujiPenilaian, perAngkatan, BATAS_BARIS_ASPEK } = mod
  let gagal = 0

  /* ----------------------------- tanpa data ------------------------------ */
  /* Halaman asli dimulai kosong. Tiap rute harus tetap terbuka tanpa galat,
     menyebut keadaan kosongnya dengan jujur, dan tidak memuat satu pun NIM
     data contoh — kecuali NIM pemilik sesi mahasiswa, yang datang dari login. */
  mod.kosongkanData()
  const sesiKosong = {
    student: mod.sesiLogin('rayhandi.zulmi@student.umn.ac.id'),
    admin: JSON.parse(SESI.admin),
    dosen: mod.sesiLogin('simon.petrus@lecturer.umn.ac.id'),
    super: JSON.parse(SESI.super),
  }
  const ISI_KOSONG = {
    '/mahasiswa': [[/berdasarkan 0 dari 10 aspek/, 'nilai akhir dihitung dari 0 aspek'], [/Belum dinilai/, 'aspek tertulis belum dinilai']],
    '/mahasiswa/transkrip': [[/Belum ada nilai yang masuk dari penilai/, 'transkrip menyebut nilai belum masuk']],
    '/mahasiswa/riwayat': [[/0 komponen sudah dinilai/, 'riwayat menyebut 0 komponen dinilai']],
    '/mahasiswa/sertifikat': [[/5 dari 5 syarat belum terpenuhi/, 'sertifikat belum memenuhi syarat']],
    '/admin': [[/Mahasiswa terpantau 0/, 'nol mahasiswa terpantau'], [/Belum ada mahasiswa yang punya nilai/, 'donat menjelaskan kosongnya']],
    '/admin/mahasiswa': [[/Belum ada data mahasiswa/, 'daftar mahasiswa kosong']],
    '/admin/mahasiswa/DEMO-3': [[/Mahasiswa tidak ditemukan/, 'persona contoh tidak ditemukan']],
    '/admin/program-studi': [[/Belum ada data mahasiswa/, 'perbandingan prodi kosong']],
    '/admin/nilai?semester=1&sumber=MK': [[/Belum ada data mahasiswa/, 'input nilai menunggu data mahasiswa']],
    '/admin/usulan': [[/Belum ada usulan dari dosen/, 'antrean usulan kosong']],
    '/admin/sertifikat': [[/Belum ada data mahasiswa/, 'halaman cetak sertifikat kosong'], [/0 dari 0 mahasiswa/, 'jumlahnya nol, bukan angka contoh']],
    '/admin/angkatan': [[/Angkatan ini belum punya mahasiswa/, 'angkatan tanpa mahasiswa disebut apa adanya'], [/2025 Genap/, 'angkatan tetap dari data master']],
    '/dosen': [[/Belum ada pengumpulan/, 'pengumpulan kosong'], [/MK Humaniora Semester 1, Sistem Informasi/, 'kelas dosen tetap dari sesi login']],
    '/dosen/nilai': [[/Belum ada yang mengumpulkan tugas ini/, 'input nilai dosen kosong']],
    '/dosen/usulan': [[/Belum ada usulan terkirim/, 'status usulan kosong']],
  }
  /* Nama penilai dan dosen contoh yang dulu tampil di antrean dan riwayat. */
  const NAMA_CONTOH = /Rahmat Nugroho|Maria Ulfah|Bambang Setiawan|Yohanes Kurniawan|Tim PDP|Student Service:/
  const semuaNim = mod.nimContoh()
  for (const [peran, rute, nama] of [...RUTE, ['admin', '/admin/nilai?semester=1&sumber=MK', 'Input nilai semester 1']]) {
    w.localStorage.setItem('sk5c.session', JSON.stringify(sesiKosong[peran]))
    try {
      const html = await render(rute)
      const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      const nimSendiri = peran === 'student' ? sesiKosong.student.nim : null
      const bocor = semuaNim.filter((n) => n !== nimSendiri && html.includes(n))
      const cek = [
        ['terbuka tanpa galat', !html.includes('Aplikasi gagal dimuat')],
        ['tidak ada NIM data contoh', bocor.length === 0, bocor.slice(0, 3).join(', ')],
        ['tidak ada nama penilai contoh', !NAMA_CONTOH.test(teks), (teks.match(NAMA_CONTOH) || [])[0]],
        ...(ISI_KOSONG[rute] || []).map(([pola, ket]) => [ket, pola.test(teks)]),
      ]
      const rusak = cek.filter(([, ok]) => !ok)
      gagal += rusak.length
      console.log((rusak.length ? 'GAGAL  ' : 'OK     ') + 'kosong ' + rute.padEnd(36) + nama)
      for (const [ket, ok, rinci] of rusak) console.log('       x ' + ket + (rinci ? '  → ' + rinci : ''))
    } catch (e) { gagal++; console.log('CRASH  kosong ' + rute + '  ' + e.message) }
  }

  /* Data master dari basis data: daftar angkatan mengikuti isiMaster (terbaru
     lebih dulu, isi awal kode tidak tersisa), dan daftar yang kosong tidak
     boleh menjatuhkan halaman Input Nilai. */
  w.localStorage.setItem('sk5c.session', SESI.admin)
  mod.pakaiMaster({
    angkatan: [
      { id: 'U1', angkatan: 2023, label: 'Uji Lama', intake: { tahun: '2023/2024', semester: 'Ganjil' }, status: 'terkunci' },
      { id: 'U2', angkatan: 2026, label: 'Uji Baru', intake: { tahun: '2026/2027', semester: 'Ganjil' }, status: 'aktif' },
    ],
  })
  const tMaster = (await render('/admin/mahasiswa')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  mod.pakaiMaster({ angkatan: [] })
  const hTanpaAngkatan = await render('/admin/nilai?semester=1')
  mod.pakaiMaster(mod.MASTER_AWAL)
  const cekMaster = [
    ['filter memakai angkatan dari master, terbaru lebih dulu', /Uji Baru[\s\S]*Uji Lama/.test(tMaster)],
    ['angkatan isi awal kode tidak tersisa', !/2025 Genap/.test(tMaster)],
    ['Input Nilai tanpa angkatan tetap terbuka', !hTanpaAngkatan.includes('Aplikasi gagal dimuat')],
    ['Input Nilai tanpa angkatan menjelaskan sebabnya', hTanpaAngkatan.includes('Belum ada data angkatan')],
  ]
  const rusakMaster = cekMaster.filter(([, ok]) => !ok)
  gagal += rusakMaster.length
  console.log((rusakMaster.length ? 'GAGAL  ' : 'OK     ') + 'data master dari basis data')
  for (const [ket, ok] of cekMaster) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  mod.pakaiDataContoh()
  console.log('')

  for (const [peran, rute, nama] of RUTE) {
    w.localStorage.setItem('sk5c.session', SESI[peran])
    try {
      const html = await render(rute)
      const err = html.includes('Aplikasi gagal dimuat')
      if (err) { gagal++; console.log('GAGAL  ' + rute + '  ' + html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,180)) }
      else {
        console.log('OK     ' + rute.padEnd(30) + String(html.length).padStart(7) + ' char   ' + nama)
        const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
        /* Slot keempat: uji terhadap MARKUP MENTAH, bukan teks. Tanpa ini pola
           berbentuk tag seperti /<input[^>]*email/ tidak akan pernah cocok
           karena seluruh tag sudah dibuang di baris atas — dan pemeriksaan
           negatifnya akan selalu "lulus" tanpa benar-benar memeriksa apa pun. */
        for (const [pola, keterangan, harusAda = true, mentah = false] of (ISI[rute] || [])) {
          const ada = pola.test(mentah ? html : teks)
          const ok = harusAda ? ada : !ada
          if (!ok) gagal++
          console.log('       ' + (ok ? 'v ' : 'x ') + keterangan)
        }
      }
    } catch (e) { gagal++; console.log('CRASH  ' + rute + '  ' + e.message) }
  }
  /* Identitas panel mahasiswa harus mengikuti sesi, bukan persona bawaan. */
  console.log('')
  for (const m of daftarUji()) {
    w.localStorage.setItem(
      'sk5c.session',
      JSON.stringify({ role: 'student', studentId: m.id, nim: m.nim, email: m.email, name: m.name, initials: 'XX' }),
    )
    const html = await render('/mahasiswa')
    const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const namaTampil = teks.includes(m.name)
    const nimTampil = teks.includes(m.nim)
    /* Kebocoran identitas diperiksa lewat NIM, bukan nama. Nama pengembang
       kebetulan sama dengan nama persona demo dan tercantum di baris hak cipta
       footer, sehingga pemeriksaan berbasis nama akan salah menuduh. NIM unik
       dan tidak pernah muncul di luar area identitas. */
    const nimPersona = daftarUji()[0].nim
    const bukanPersona = m.nim === nimPersona || !teks.includes(nimPersona)
    const ok = namaTampil && nimTampil && bukanPersona
    if (!ok) gagal++
    console.log(
      (ok ? 'OK     ' : 'GAGAL  ') + 'sesi ' + m.email.padEnd(36) +
        'menampilkan ' + m.name + ' (' + m.nim + ')' + (bukanPersona ? '' : ' TAPI IDENTITAS PERSONA BOCOR'),
    )
  }

  /* --------------------------- sinkronisasi foto --------------------------- */
  /* Foto yang disimpan di halaman profil harus muncul di SETIAP avatar pemilik
     sesi, bukan hanya di halaman profilnya. Pernah lolos sebaliknya: fotonya
     tersimpan rapi, tetapi avatar pojok kanan tetap menampilkan inisial karena
     Avatar tidak pernah membaca simpanan itu. */
  console.log('')
  const mFoto = daftarUji()[0]
  const TANDA = 'data:image/webp;base64,UJIFOTO'
  w.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'student', studentId: mFoto.id, nim: mFoto.nim, email: mFoto.email, name: mFoto.name, initials: 'XX' }),
  )
  mod.simpanProfil(mod.kunciSesi({ role: 'student', nim: mFoto.nim }), { foto: TANDA })

  for (const [rute, minimal] of [['/mahasiswa', 1], ['/mahasiswa/profil', 2]]) {
    const html = await render(rute)
    const jumlah = (html.match(/<img[^>]*UJIFOTO/g) || []).length
    /* Avatar pojok kanan dikenali dari tombol "Menu akun" yang membungkusnya,
       bukan dari ukurannya — ukuran berubah mengikuti desain, perannya tidak. */
    const diNavbar = /aria-label="Menu akun"[^>]*>\s*<img[^>]*UJIFOTO/.test(html)
    const ok = jumlah >= minimal && diNavbar
    if (!ok) gagal++
    console.log(
      (ok ? 'OK     ' : 'GAGAL  ') +
        'foto pada ' + rute.padEnd(24) +
        jumlah + ' avatar memakai foto' +
        (diNavbar ? ' (termasuk pojok kanan)' : ' — AVATAR POJOK KANAN MASIH INISIAL'),
    )
  }

  /* ------------------------------ menu di ponsel --------------------------- */
  console.log('')
  for (const [peran, rute, harapTautan] of [['student', '/mahasiswa', 6], ['admin', '/admin', 11]]) {
    w.localStorage.setItem('sk5c.session', SESI[peran])
    const h = await ujiMenuHp(rute)

    const wajib = [
      ['tombol garis tiga ada', h.adaHamburger],
      ['laci tertutup sebelum disentuh', h.laciTertutupAwal],
      ['laci terbuka setelah ditekan', h.laciTerbuka],
      ['laci memuat ' + harapTautan + ' tautan', h.tautanDiLaci === harapTautan, h.tautanDiLaci],
      ['gulir halaman dikunci selama terbuka', h.gulirTerkunci],
      ['laci menutup setelah memilih tautan', h.laciTertutupSetelahPilih],
      ['gulir pulih setelah ditutup', h.gulirPulih],
    ]
    const rusak = wajib.filter(([, ok]) => !ok)
    if (rusak.length) gagal += rusak.length
    console.log((rusak.length ? 'GAGAL  ' : 'OK     ') + 'menu ponsel ' + rute)
    for (const [ket, ok, rinci] of wajib) {
      console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
    }
  }

  /* Panel dosen di ponsel memakai bilah bawah berlabel, bukan tombol garis tiga; lihat README.md › Panel Dosen. */
  {
    w.localStorage.setItem('sk5c.session', SESI.dosen)
    const b = await ujiBilahBawah('/dosen')
    const wajib = [
      ['tidak ada tombol garis tiga', !b.adaHamburger],
      ['bilah bawah ada', b.ada],
      ['bilah bawah memuat 4 tautan', b.tautan.length === 4, b.tautan.join(', ')],
      ['setiap tautan berlabel teks', b.tautan.every((x) => x.length > 0), b.tautan.join(', ')],
      ['halaman yang terbuka ditandai aria-current', b.aktif === 'Beranda', b.aktif],
    ]
    const rusak = wajib.filter(([, ok]) => !ok)
    if (rusak.length) gagal += rusak.length
    console.log((rusak.length ? 'GAGAL  ' : 'OK     ') + 'menu ponsel /dosen (bilah bawah)')
    for (const [ket, ok, rinci] of wajib) {
      console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
    }
  }

  /* ------------------------- aspek di dashboard mahasiswa ------------------ */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const ha = await ujiAspek('/mahasiswa')
  const cekAspek = [
    /* Tab menulis jumlah SEBENARNYA; yang tampil dibatasi BATAS_BARIS_ASPEK.
       Bila ada yang terpotong, tautan bawah wajib menyebut berapa sisanya —
       kalau tidak, lima baris itu terbaca seolah seluruh aspeknya. */
    ...Object.entries(ha.tabSesuai).map(([nama, x]) => {
      const harap = Math.min(x.tertulis, BATAS_BARIS_ASPEK)
      const sisa = x.tertulis - harap
      /* Label tautannya ditentukan pemilik proyek: "Lihat Selengkapnya" saat
         masih ada sisa, "Lihat transkrip lengkap" saat semua sudah tampil. */
      const tautanBenar = sisa > 0
        ? x.tautan.some((t) => t.includes('Lihat Selengkapnya'))
        : x.tautan.some((t) => t.includes('Lihat transkrip lengkap'))
      return [
        'tab ' + nama + ': ' + x.tampil + ' dari ' + x.tertulis + ' tampil' + (sisa ? ', tautan menyebut ' + sisa + ' sisanya' : ''),
        x.terpilih && x.tampil === harap && tautanBenar,
        'tertulis ' + x.tertulis + ', tampil ' + x.tampil + ', tautan: ' + x.tautan.join(' | '),
      ]
    }),
    ['rincian tertutup sebelum diketuk', ha.rinciTertutupAwal],
    ['rincian terbuka setelah diketuk', ha.rinciTerbuka],
    ['rincian menutup saat diketuk lagi', ha.rinciTertutupLagi],
  ]
  const rusakAspek = cekAspek.filter(([, ok]) => !ok)
  gagal += rusakAspek.length
  console.log((rusakAspek.length ? 'GAGAL  ' : 'OK     ') + 'aspek di dashboard mahasiswa')
  for (const [ket, ok, rinci] of cekAspek) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok ? '' : '  → ' + rinci))
  }

  /* ------------------------ penghemat gulir di ponsel --------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const hr = await ujiRingkasHp('/mahasiswa')
  const cekRingkas = [
    ['ubin ringkasan terlipat saat dibuka', hr.ubinTerlipatAwal],
    ['ubin membentang setelah Rincian ditekan', hr.ubinTerbuka],
    ['nilai akhir tetap di luar lipatan (R3)', hr.nilaiAkhirTetapDiLuar],
    ['di layar lebar keempat ubin tetap utuh', hr.tetapUtuhDiLayarLebar],
    ['lonceng Belum dinilai ada', hr.adaLonceng],
    ['panel lonceng tertutup sebelum ditekan', hr.panelTertutupAwal],
    ['panel lonceng terbuka setelah ditekan', hr.panelTerbuka],
    ['angka di lonceng sama dengan isi panel', hr.itemDiPanel === hr.angkaLonceng && hr.angkaLonceng > 0,
      'lonceng ' + hr.angkaLonceng + ', panel ' + hr.itemDiPanel],
    ['panel menutup dengan Escape', hr.panelTutupDenganEscape],
  ]
  const rusakRingkas = cekRingkas.filter(([, ok]) => !ok)
  gagal += rusakRingkas.length
  console.log((rusakRingkas.length ? 'GAGAL  ' : 'OK     ') + 'penghemat gulir di ponsel')
  for (const [ket, ok, rinci] of cekRingkas) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* -------------------------------- road map ------------------------------ */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const hp = await ujiPeta('/mahasiswa/peta')
  const sama = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const cekPeta = [
    ['semester berjalan (2) terbuka lebih dulu', sama(hp.awal, [2]), JSON.stringify(hp.awal)],
    ['membuka Semester 1 menutup Semester 2', sama(hp.setelahSem1, [1]), JSON.stringify(hp.setelahSem1)],
    ['Semester 1 memuat kegiatan yang sudah dijalani', /Kegiatan yang sudah dijalani/.test(hp.sem1) && /Religiositas/.test(hp.sem1)],
    ['Semester 1: Mentoring 5C ada di jalur PDP', /PDP-1: Character & Mentoring 5C[\s\S]*Mentoring 5C: Kehadiran[\s\S]*Religiositas/.test(hp.sem1)],
    ['Semester 1: tanpa jalur Kemahasiswaan', !/Student Service & Engagement/.test(hp.sem1)],
    ['Semester 3: Effective Communication di jalur PDP, tanpa jalur Kemahasiswaan', /PDP-3: Effective Communication/.test(hp.sem3) && !/Student Service & Engagement/.test(hp.sem3)],
    ['Semester 3 (terkunci) tetap bisa dibuka', sama(hp.setelahSem3, [3]), JSON.stringify(hp.setelahSem3)],
    ['Semester 3 memperlihatkan kegiatan yang akan datang', /Kegiatan yang akan dijalani/.test(hp.sem3) && /Civics/.test(hp.sem3)],
    /* R2: aspek yang belum dibuka tidak pernah punya angka, dan kegiatannya
       tidak boleh ditulis "belum masuk" seolah terlambat. */
    ['Semester 3 tanpa angka: tiap aspek bertanda gembok', (hp.sem3.match(/Dibuka pada Semester 3/g) || []).length === 3],
    ['Semester 3 tidak menulis "belum masuk"', !/belum masuk/.test(hp.sem3)],
    ['semester bisa ditutup kembali', sama(hp.setelahTutup, []), JSON.stringify(hp.setelahTutup)],
  ]
  const rusakPeta = cekPeta.filter(([, ok]) => !ok)
  gagal += rusakPeta.length
  console.log((rusakPeta.length ? 'GAGAL  ' : 'OK     ') + 'road map')
  for (const [ket, ok, rinci] of cekPeta) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* Road Map untuk tiap posisi semester, bukan hanya persona Semester 2. */
  for (const m of perAngkatan()) {
    w.localStorage.setItem(
      'sk5c.session',
      JSON.stringify({ role: 'student', studentId: m.id, nim: m.nim, email: m.email, name: m.name, initials: 'XX' }),
    )
    const html = await render('/mahasiswa/peta')
    const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const galat = html.includes('Aplikasi gagal dimuat')
    const tamat = m.statusAngkatan === 'terkunci'
    const kalimat = tamat
      ? /Seluruh 3 semester program sudah Anda selesaikan/.test(teks)
      : new RegExp('Anda sedang menjalani Semester ' + m.semesterAktif + ' dari 3').test(teks)
    const penanda = (teks.match(/Anda di sini/g) || []).length === (tamat ? 0 : 1)
    const ok = !galat && kalimat && penanda
    if (!ok) gagal++
    console.log(
      (ok ? 'OK     ' : 'GAGAL  ') + 'road map angkatan ' + m.angkatanLabel.padEnd(11) +
        (tamat ? 'tamat' : 'semester ' + m.semesterAktif) +
        (galat ? ' — GALAT RENDER' : '') + (kalimat ? '' : ' — kalimat posisi salah') + (penanda ? '' : ' — penanda posisi salah'),
    )
  }

  /* --------------------------------- history ------------------------------ */
  console.log('')
  const mR = daftarUji()[0]
  w.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'student', studentId: mR.id, nim: mR.nim, email: mR.email, name: mR.name, initials: 'XX' }),
  )
  const hh = await ujiRiwayat('/mahasiswa/riwayat')
  const cekRiwayat = [
    ['Final + Sementara = Semua', hh.jumlah.Final + hh.jumlah.Sementara === hh.jumlah.Semua,
      hh.jumlah.Final + ' + ' + hh.jumlah.Sementara + ' vs ' + hh.jumlah.Semua],
    ['tab Semua menampilkan semua catatan', hh.barisSemua === hh.jumlah.Semua, hh.barisSemua + ' baris'],
    ['tab Final menyaring dengan benar', hh.barisFinal === hh.jumlah.Final, hh.barisFinal + ' baris'],
    ['tab Sementara menyaring dengan benar', hh.barisSementara === hh.jumlah.Sementara, hh.barisSementara + ' baris'],
    /* Kata "disetujui" hanya boleh dipakai untuk nilai yang sudah dikunci —
       nilai sementara masih bisa berubah. */
    ['tiap catatan final menyebut siapa yang menyetujui', hh.finalSelaluDisetujui],
    ['catatan sementara tidak pernah disebut disetujui', hh.sementaraTidakDisetujui],
    ['jumlah yang ditunggu sama dengan angka di lonceng', hh.kalimat && hh.kalimat.ditunggu === hh.lonceng,
      hh.kalimat ? hh.kalimat.ditunggu + ' vs lonceng ' + hh.lonceng : 'kalimat tidak ditemukan'],
    ['jumlah yang sudah dinilai sama dengan tab Semua', hh.kalimat && hh.kalimat.dinilai === hh.jumlah.Semua],
    ['pengajuan koreksi mahasiswa ikut tercatat', hh.adaKoreksi],
  ]
  const rusakRiwayat = cekRiwayat.filter(([, ok]) => !ok)
  gagal += rusakRiwayat.length
  console.log((rusakRiwayat.length ? 'GAGAL  ' : 'OK     ') + 'history')
  for (const [ket, ok, rinci] of cekRiwayat) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* ------------------- lonceng Kemahasiswaan → input nilai ----------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hl = await ujiLoncengAdmin()
  const cekLonceng = [
    ['lonceng ada di bilah atas', hl.adaLonceng],
    ['panel tertutup sebelum ditekan', hl.panelTertutupAwal],
    ['panel terbuka setelah ditekan', hl.panelTerbuka],
    ['angka lonceng sama dengan jumlah baris', hl.angka === hl.jumlahBaris, hl.angka + ' vs ' + hl.jumlahBaris],
    ['panel memuat pengajuan koreksi', hl.adaKoreksi],
    ['panel memuat pekerjaan yang belum dinilai', hl.adaBelumDinilai],
    ['panel memuat bagian Perlu ditinjau', hl.adaPerluDitinjau],
    ['mahasiswa di bawah ambang ikut tercatat', hl.adaAmbang],
    ['angkatan siap dikunci ikut tercatat', hl.adaSiapDikunci],
    ['setiap baris menuju halaman yang menanganinya', hl.semuaPunyaTujuan],
  ]

  /* Janji fiturnya: sekali diketuk, sasaran di halaman input sudah terisi. */
  if (hl.tautanKelompok) {
    const h = await ujiSasaranInput(hl.tautanKelompok)
    const semDiminta = 'Semester ' + new URL('http://x' + hl.tautanKelompok).searchParams.get('semester')
    cekLonceng.push(
      ['tautan kelompok membuka area kerja, bukan gerbang semester', !h.gerbangMasihTertutup],
      ['semester ikut terpilih sendiri', h.semesterTerpilih === semDiminta, h.semesterTerpilih + ' vs ' + semDiminta],
    )
  }
  if (hl.tautanTunggal) {
    const q = new URL('http://x' + hl.tautanTunggal).searchParams
    const h = await ujiSasaranInput(hl.tautanTunggal)
    cekLonceng.push(
      ['kelompok satu mahasiswa: NIM terisi di kotak pencarian', h.kotakCari === q.get('cari'),
        h.kotakCari + ' vs ' + q.get('cari')],
      ['kelompok satu mahasiswa: barisnya tampil', h.teks.includes(q.get('cari'))],
    )
  } else {
    cekLonceng.push(['ada kelompok yang tinggal satu mahasiswa untuk diuji', false, 'tidak ditemukan'])
  }

  /* Pengajuan koreksi punya perlakuan sendiri: ia membuka tab koreksi, bukan
     tabel input, jadi yang diperiksa keberadaan barisnya di sana. */
  if (hl.tautanKoreksi) {
    const q = new URL('http://x' + hl.tautanKoreksi).searchParams
    const h = await ujiSasaranInput(hl.tautanKoreksi)
    cekLonceng.push(
      ['koreksi: tab Pengajuan koreksi yang terbuka', /diajukan \d{4}-\d{2}-\d{2}/.test(h.teks)],
      ['koreksi: NIM pengajunya tampil', h.teks.includes(q.get('cari'))],
    )
  }

  const rusakLonceng = cekLonceng.filter(([, ok]) => !ok)
  gagal += rusakLonceng.length
  console.log((rusakLonceng.length ? 'GAGAL  ' : 'OK     ') + 'lonceng Kemahasiswaan')
  for (const [ket, ok, rinci] of cekLonceng) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* Dijalankan PALING AKHIR: menyetujui koreksi mengubah keadaan bersama,
     dan uji lain menghitung berapa pengajuan yang masih menunggu. */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  /* Alamatnya diambil dari lonceng, bukan dikarang — sekaligus membuktikan
     tautan yang dihasilkan lonceng memang membuka tombol keputusannya. */
  const hk = await ujiKeputusanKoreksi(hl.tautanKoreksi ?? '/admin/nilai?tab=koreksi&semester=1&sumber=MK')
  const cekKoreksi = [
    ['tombol Setujui ada di tab koreksi', hk.adaTombol],
    ['menekan Setujui tidak melempar galat', !hk.galat, hk.galat],
    ['pengajuannya berubah menjadi Disetujui', hk.adaLencanaDisetujui],
    ['tombol keputusannya hilang setelah diputuskan', hk.tombolnyaHilang],
  ]
  const rusakKoreksi = cekKoreksi.filter(([, ok]) => !ok)
  gagal += rusakKoreksi.length
  console.log((rusakKoreksi.length ? 'GAGAL  ' : 'OK     ') + 'keputusan pengajuan koreksi')
  for (const [ket, ok, rinci] of cekKoreksi) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci == null ? '' : '  → ' + rinci))
  }

  /* ---------------- sasaran input: prodi, fakultas, dan tanda -------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const ht = await ujiSasaranDanTanda(
    '/admin/nilai?semester=1&sumber=MK&angkatan=2026',
    'Sistem Informasi',
    'Teknik & Informatika',
  )
  const cekTanda = [
    ['kotak Fakultas dan Program studi ada', ht.adaKeduaKotak],
    ['memilih prodi menarik fakultasnya', ht.fakultasIkut, ht.fakultasAwal + ' → ' + ht.fakultasSesudah],
    ['baris mahasiswa menyebut program studinya', ht.barisMenyebutProdi],
    ['tidak ada lagi pilihan status global', ht.tanpaPilihanGlobal],
    ['tombol pensil ada di tiap baris', ht.adaKolomTanda],
    ['pensil mati selama barisnya belum diisi', ht.tandaMatiSebelumDiisi],
    ['pensil hidup setelah barisnya diisi', ht.tandaHidupSetelahDiisi],
    ['baris lain yang belum diisi tetap mati', ht.tandaLainTetapMati],
    ['menu tertutup sebelum pensil ditekan', ht.menuTertutupAwal],
    ['menunya tepat dua pilihan', ht.jumlahPilihan === 2, 'ada ' + ht.jumlahPilihan],
    ['tidak ada lagi "Ikuti pilihan di atas"', ht.tanpaIkutiPilihan],
    ['menunya melayang, bukan di dalam sel', ht.menuMelayang],
    ['menunya memakai lapisan kaca', ht.menuBerkaca],
    ['menunya punya animasi masuk', ht.menuBeranimasi],
    ['tombol tanda rata tengah sebaris kotak nilai', ht.selRataTengah],
    ['memilih Final menandai barisnya', ht.terpilihFinal],
    ['menu menutup sendiri setelah memilih', ht.menuTertutupSesudah],
  ]
  const rusakTanda = cekTanda.filter(([, ok]) => !ok)
  gagal += rusakTanda.length
  console.log((rusakTanda.length ? 'GAGAL  ' : 'OK     ') + 'sasaran input & tanda per baris')
  for (const [ket, ok, rinci] of cekTanda) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* ---------------------------- penyunting foto --------------------------- */
  console.log('')
  const mFoto2 = daftarUji()[0]
  w.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'student', studentId: mFoto2.id, nim: mFoto2.nim, email: mFoto2.email, name: mFoto2.name, initials: 'XX' }),
  )
  mod.simpanProfil(mod.kunciSesi({ role: 'student', nim: mFoto2.nim }), {
    foto: 'data:image/webp;base64,UJIFOTO',
    fotoSumber: 'data:image/webp;base64,UJISUMBER',
  })
  const hf = await ujiPenyuntingFoto('/mahasiswa/profil')
  const cekFoto = [
    ['ada tombol edit pada foto tersimpan', hf.adaTombolAtur],
    ['penyunting tertutup sebelum ditekan', hf.tertutupAwal],
    ['penyunting terbuka setelah ditekan', hf.terbuka],
    ['ada area geser untuk mengatur posisi', hf.adaAreaGeser],
    ['ada penggeser perbesaran', hf.adaPenggeser],
    ['perbesaran mulai dari 100%', hf.persenAwal],
    ['menggeser mengubah perbesaran jadi 200%', hf.persenBerubah],
    ['penyunting menutup setelah dipakai', hf.tertutupSesudah],
    ['hasilnya masuk sebagai foto siap disimpan', hf.adaPratinjau],
  ]
  const rusakFoto = cekFoto.filter(([, ok]) => !ok)
  gagal += rusakFoto.length
  console.log((rusakFoto.length ? 'GAGAL  ' : 'OK     ') + 'penyunting foto profil')
  for (const [ket, ok] of cekFoto) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* -------------------------- penampil foto profil ------------------------ */
  console.log('')
  const hLihat = await ujiLihatFoto('/mahasiswa/profil')
  const cekLihat = [
    ['fotonya dan tombol Lihat sama-sama bisa membuka penampil', hLihat.duaPemicu],
    ['penampil tertutup sebelum ditekan', hLihat.tertutupAwal],
    ['penampil terbuka setelah tombol Lihat ditekan', hLihat.terbuka],
    ['penampil dipasang langsung di body', hLihat.diBody],
    ['yang ditampilkan foto yang tersimpan', hLihat.fotoTersimpan],
    ['fokus pindah ke tombol tutup', hLihat.fokusDiTutup],
    ['Esc menutup penampil', hLihat.tertutupEsc],
    ['fokus kembali ke tombol Lihat', hLihat.fokusKembali],
    ['menekan fotonya juga membuka penampil', hLihat.terbukaDariFoto],
    ['tombol tutup menutup penampil', hLihat.tertutupTombol],
  ]
  const rusakLihat = cekLihat.filter(([, ok]) => !ok)
  gagal += rusakLihat.length
  console.log((rusakLihat.length ? 'GAGAL  ' : 'OK     ') + 'penampil foto profil')
  for (const [ket, ok] of cekLihat) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------------- segarkan data mahasiswa ---------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hs = await ujiSegarkanData()
  const cekSegar = [
    ['tombol Segarkan di bilah status ada di Data Mahasiswa', hs.adaTombol],
    ['hanya satu tombol segarkan di halaman itu', hs.satuTombol],
    ['menekannya benar-benar memuat ulang data', hs.termuatUlang],
    ['daftar mahasiswa tetap utuh setelah disegarkan', hs.daftarTetapAda],
  ]
  const rusakSegar = cekSegar.filter(([, ok]) => !ok)
  gagal += rusakSegar.length
  console.log((rusakSegar.length ? 'GAGAL  ' : 'OK     ') + 'segarkan data mahasiswa')
  for (const [ket, ok] of cekSegar) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* --------------------------- laci panel admin --------------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hla = await ujiLaciAdmin()
  const cekLaci = [
    ['tombol garis tiga ada', hla.adaTombol],
    ['di layar lebar menu samping yang tampil, garis tiga hanya di layar sempit', hla.menuSampingDiLayarLebar],
    ['laci terbuka saat ditekan', hla.terbuka],
    ['panelnya terang, sama dengan menu samping', hla.panelTerang],
    ['ada judul kelompok Kerja harian dan Rujukan', hla.adaJudulKelompok],
    ['semua halaman tercantum di laci', hla.adaHalamanTersembunyi],
    ['halaman yang sedang dibuka ditandai', hla.adaPenandaAktif],
  ]
  const rusakLaci = cekLaci.filter(([, ok]) => !ok)
  gagal += rusakLaci.length
  console.log((rusakLaci.length ? 'GAGAL  ' : 'OK     ') + 'laci panel Kemahasiswaan')
  for (const [ket, ok] of cekLaci) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* -------------------- penanda kesegaran data panel admin ---------------- */
  /* Paling akhir: uji ini memutuskan satu pengajuan koreksi untuk membuktikan
     penandanya bergeser, dan itu mengubah keadaan bersama. */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hsd = await ujiStatusData()
  const cekStatus = [
    ['penanda "Terakhir diperbarui" tampil', hsd.adaPenanda],
    ['zona waktunya ditulis tegas (WIB)', hsd.adaZona],
    ['ada keterangan relatif yang berdetak', hsd.adaRelatif],
    ['ada tombol segarkan di sebelahnya', hsd.adaTombolSegarkan],
    ['penandanya bergeser saat data berubah', hsd.bergeserSaatDataBerubah],
  ]
  const rusakStatus = cekStatus.filter(([, ok]) => !ok)
  gagal += rusakStatus.length
  console.log((rusakStatus.length ? 'GAGAL  ' : 'OK     ') + 'kesegaran data panel admin')
  for (const [ket, ok] of cekStatus) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------ Ringkasan admin: hemat gulir di ponsel --------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hlo = await ujiLipatOverview()
  const cekLipat = [
    ['angka: kartu pertama tetap terlihat', hlo.angka.kartuPertamaTetapTampil],
    ['angka: ada kaki lipat di dalam kartu', hlo.angka.adaKaki],
    ['angka: ringkasannya tertulis di kaki itu', hlo.angka.ringkasTertulis],
    ['angka: dua kartu lain terlipat saat dibuka', hlo.angka.terlipatAwal],
    ['angka: membentang setelah ditekan', hlo.angka.terbukaSetelahDitekan],
    ['angka: tetap utuh di layar lebar', hlo.angka.tetapUtuhDiLayarLebar],
    ['angka: kakinya hanya ada di ponsel', hlo.angka.kakiKhususPonsel],
  ]
  const rusakLipat = cekLipat.filter(([, ok]) => !ok)
  gagal += rusakLipat.length
  console.log((rusakLipat.length ? 'GAGAL  ' : 'OK     ') + 'Ringkasan admin di ponsel')
  for (const [ket, ok] of cekLipat) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------------- Pemilih bahasa ID / EN ------------------------ */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const bh = await ujiBahasa()
  const cekBahasa = [
    ['pemilih ID / EN ada di bilah atas', bh.adaPemilih],
    ['render pertama panel selalu Indonesia', bh.mulaiIndonesia],
    ['isinya memang Indonesia', bh.isiIndonesia],
    ['menekan EN mengaktifkan Inggris', bh.inggrisAktif],
    ['isi halaman ikut berganti', bh.isiInggris],
    ['judul kartu ikut berganti', bh.judulIkutBerganti],
    ['menu navigasi ikut berganti', bh.menuIkutBerganti],
    ['pilihannya tersimpan', bh.tersimpan],
    ['atribut lang ikut diperbarui', bh.langDiperbarui],
    ['penanda {n} terisi, tidak tampil mentah', bh.penandaTerisi],
    ['bisa kembali ke Indonesia', bh.kembaliIndonesia],
  ]
  const rusakBahasa = cekBahasa.filter(([, ok]) => !ok)
  gagal += rusakBahasa.length
  console.log((rusakBahasa.length ? 'GAGAL  ' : 'OK     ') + 'Pemilih bahasa')
  for (const [ket, ok] of cekBahasa) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ---------------------- Ketahanan pencarian kamus ------------------------ */
  console.log('')
  const km = await ujiKamus()
  const cekKamus = [
    ['kalimat satu baris ditemukan', km.menerjemahkan],
    ['kalimat yang ditata ulang TETAP ditemukan', km.tahanTataUlang],
    ['mode Indonesia tidak menyentuh kamus', km.indonesiaUtuh],
    ['penanda {n} terisi di sisi Inggris', km.penandaTerisi],
    ['kalimat tanpa padanan jatuh ke Indonesia', km.kosongJatuhKeIndonesia],
    ['kamusnya memang terisi', km.kamusTidakKosong],
  ]
  const rusakKamus = cekKamus.filter(([, ok]) => !ok)
  gagal += rusakKamus.length
  console.log((rusakKamus.length ? 'GAGAL  ' : 'OK     ') + 'Ketahanan kamus terjemahan')
  for (const [ket, ok] of cekKamus) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------- Status polos & transkrip yang dicetak --------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const sp = await ujiStatusPolos('/mahasiswa')
  const st = await ujiStatusPolos('/mahasiswa/transkrip')
  const ct = await ujiCetakTranskrip()
  const cekPolos = [
    ['dashboard: ada penanda status', sp.adaPenanda],
    ['dashboard: tanpa warna status', sp.tanpaWarna],
    ['dashboard: pembungkusnya pun tanpa warna', sp.pembungkusTanpaWarna],
    ['dashboard: tanpa ikon, hanya teks', sp.tanpaIkon],
    ['dashboard: katanya tetap terbaca', sp.tetapTerbaca],
    ['transkrip: tanpa warna status', st.tanpaWarna],
    ['transkrip: tanpa ikon, hanya teks', st.tanpaIkon],
    ['transkrip: dua grafik tetap ada di layar', ct.grafikAda],
    ['cetak: lembar resmi hanya muncul di kertas', ct.lembarHanyaDiKertas],
    ['cetak: tampilan layar tidak ikut tercetak', ct.layarTakTercetak],
    ['cetak: kartu ajukan koreksi tidak tercetak', ct.ajukanTakTercetak],
    ['cetak: judul Transkrip Sementara', ct.judul],
    ['cetak: kolom No, Kode, Aspek, Semester, Nilai, Predikat', ct.kepala === 'No|Kode|Aspek CPMK|Semester|Nilai|Predikat'],
    ['cetak: sepuluh aspek tercantum', ct.jumlahBaris === 10],
    ['cetak: aspek belum dibuka tertulis ..., bukan 0 (R2)', ct.belumBukanNol],
    ['cetak: ringkasan 7/10 aspek, nilai 79 sementara, predikat C', ct.ringkasan],
    ['cetak: keterangan predikat A sampai D', ct.keterangan],
    ['cetak: tempat, tanggal, dan tanda tangan', ct.tandaTangan],
    ['cetak: alamat kampus di kaki halaman', ct.alamat],
    ['cetak: tanpa grafik di kertas, hanya logo', ct.tanpaGrafik],
  ]
  const dpResmi = await ujiTandaDraft('/mahasiswa/peta')
  const dtResmi = await ujiTandaDraft('/mahasiswa/transkrip')
  // A4-PDP-T ada di Semester 2, semester yang terbuka untuk DEMO-2.
  const dp = await ujiTandaDraft('/mahasiswa/peta', 'A4-PDP-T')
  const dt = await ujiTandaDraft('/mahasiswa/transkrip', 'A4-PDP-T')
  cekPolos.push(
    ['peta: semua komponen resmi, tanpa penanda draft', !dpResmi.ada],
    ['transkrip: semua komponen resmi, tanpa penanda draft', !dtResmi.ada],
    ['peta: ada penanda draft', dp.ada],
    ['peta: berkurung, bukan pil', dp.berkurung && dp.tanpaPil],
    ['peta: merah, bukan kuning', dp.merah],
    ['peta: kuning tak terbaca sudah hilang', dp.tanpaKuningTakTerbaca],
    ['transkrip: ada penanda draft', dt.ada],
    ['transkrip: berkurung, bukan pil', dt.berkurung && dt.tanpaPil],
    ['transkrip: kuning tak terbaca sudah hilang', dt.tanpaKuningTakTerbaca],
  )

  /* ------------- Grafik ringkas di kartu nilai akhir ----------------------- */
  const tr3 = await ujiTrenSemester(3)
  const tr2 = await ujiTrenSemester(2)
  const tr1 = await ujiTrenSemester(1)
  const cekTren = [
    /* DEMO-3: tiga semester bernilai 80, 81, 82. */
    ['tiga semester: tren yang tampil', tr3.adaTren && !tr3.adaSebaran],
    ['legenda menyebut kedua garis', tr3.legenda],
    ['satu titik per semester, di tiap garis', tr3.jumlahTitikSemester === 3 && tr3.jumlahTitikKumulatif === 3],
    ['satu jalur utuh per garis, tanpa putus', tr3.jumlahJalur === 2],
    ['dua ruas antar semester berurutan, di tiap garis', tr3.jumlahRuas === 4],
    ['jalurnya garis, bukan bidang terisi', tr3.takTerisi],
    ['kurva tidak melampaui rentang datanya sendiri', tr3.takMelampaui],
    ['tebal garis tidak ikut teregang', tr3.garisTakTeregang],
    ['kenaikannya dinyatakan sebagai angka', tr3.ringkasNaik],
    ['ada garis bantu horizontal', tr3.garisBantu >= 3],
    ['tiap garis bantu punya labelnya', tr3.labelSecocokGaris],
    ['label sumbu berupa kelipatan bulat', tr3.sumbuBulat],
    ['jendela sumbu tidak lebih sempit dari 20', tr3.lebarJendela >= 20],
    ['nama semester ditulis lengkap, termasuk yang terkunci', tr3.labelSemuaSemester],
    ['label tidak diredupkan (kontras tetap terbaca)', tr3.tanpaRedup && tr2.tanpaRedup],
    ['belum ada kotak info sebelum titik dipilih', tr3.tanpaTipAwal],
    ['fokus semester 3: kotak info seperti contoh', tr3.isiTip === 'Semester:3Nilai semester:84Nilai kumulatif:82'],
    ['garis tegak penanda semester muncul', tr3.garisTegak === 1],
    ['titik terpilih jadi berongga, di kedua garis', tr3.titikBerongga === 2],
    ['nama semester terpilih ditebalkan', tr3.labelTerpilihTebal],
    ['kumulatif terakhir sama dengan angka besar di kartu', tr3.kumulatifSamaAngkaBesar],
    ['kotak info tidak dibaca dua kali oleh pembaca layar', tr3.tipTersembunyiDariSR],
    ['pembaca layar mendapat kalimat lengkap per semester', tr3.kalimatKolom === 'Semester 3: Nilai semester 84, Nilai kumulatif 82'],
    ['Escape menyembunyikan kotak info, fokus tetap', tr3.escapeMenyembunyikan],
    ['tunjuk dengan tetikus menampilkan, pergi menyembunyikan', tr3.tunjukMenampilkan && tr3.lepasMenyembunyikan],

    /* DEMO-2: dua semester, 71 lalu 85. */
    ['dua semester: kenaikannya dinyatakan', tr2.adaTren && tr2.ringkasNaik],
    ['dua titik ditarik satu ruas lurus, di tiap garis', tr2.jumlahRuas === 2],
    ['semester terkunci tidak ikut digambar (R2)', tr2.jumlahTitikSemester === 2 && tr2.jumlahTitikKumulatif === 2],
    ['semester terkunci tidak bisa dipilih', tr2.jumlahKolom === 2],
    ['semester terkunci bergembok', tr2.gembokTerkunci === 1],
    ['nama semester ditulis lengkap', tr2.labelSemuaSemester],
    ['kotak info semester 2: 85 dan kumulatif 79', tr2.isiTip === 'Semester:2Nilai semester:85Nilai kumulatif:79'],
    ['kumulatif terakhir sama dengan angka besar (79)', tr2.kumulatifSamaAngkaBesar],

    /* DEMO-1: satu semester saja. Tren belum punya arti di sana. */
    ['satu semester: berganti ke sebaran aspek', tr1.adaSebaran && !tr1.adaTren],
  ]

  /* Jaminan anti-lampauan, diuji pada fungsinya sendiri dengan deret yang
     berbalik arah -- bentuk yang tidak dipunyai satu pun persona demo. */
  const kv = ujiKurva()
  cekTren.push(
    ['kurva: puncak 86-85-86 tidak melampaui', kv.puncakAman],
    ['kurva: lembah 65-65-62 tidak melampaui', kv.lembahAman],
    ['kurva: lonjakan 40-95-42 tidak melampaui', kv.tajamAman],
    ['kurva: deret menanjak tidak melampaui', kv.naikAman],
    ['kurva: mendatar di titik balik', kv.balikMendatar],
    ['kurva: jumlah ruasnya benar', kv.ruasBenar],
    ['kurva: dua titik ditarik lurus', kv.duaTitikLurus],
    ['kurva: nilai yang tidak berubah tergambar datar', kv.tetapTergambarDatar],
    ['kurva: kurang dari dua titik tidak menggambar apa pun', kv.satuTitikKosong],
  )
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const pk = await ujiPerkembangan()
  w.localStorage.setItem('sk5c.session', SESI.student)
  const cekPk = [
    ['grafiknya ada di Overview', pk.ada],
    ['dropdown tertutup, bawaan "Semester 3"', pk.tertutupAwal],
    ['klik membuka panel berisi tiga pilihan, beranimasi masuk', pk.bukaKlik],
    ['tiap pilihan menyebut jumlah mahasiswanya', pk.keteranganOpsi === '290 mahasiswa|219 mahasiswa|148 mahasiswa'],
    ['fokus langsung ke pilihan yang sedang aktif', pk.fokusKeTerpilih],
    ['panah atas memindahkan sorotan', pk.fokusNaik],
    ['Enter memilih, menutup, dan fokus kembali ke tombol', pk.enterMemilih],
    ['panel beranimasi tutup lalu dicabut', pk.tutupBeranimasi],
    ['batang mengikuti pilihan: 3, 2, 1, lalu 3', pk.jumlahBatang === '3,2,1,3'],
    ['panah bawah pada tombol membuka ke pilihan aktif', pk.panahBawahMembuka],
    ['Home lalu Spasi memilih Semester 1', pk.homeSpasiMemilih],
    ['Escape menutup tanpa mengubah pilihan', pk.escapeBatal],
    ['klik di luar menutup panel', pk.klikLuarMenutup],
    ['klik pilihan dengan tetikus', pk.klikOpsi],
    ['penjelasan ikut: 219 mahasiswa, naik 3', pk.penjelasanDua],
    ['tinggi batang sebanding nilainya dari nol', pk.dariNol],
    ['angka pada batang: 77, 80, 82', pk.angkaBatang === '77,80,82'],
    ['warna batang dari ramp ordinal semester', pk.rampOrdinal],
    ['ujung data membulat, pangkal persegi', pk.ujungBulat],
    ['angka memakai warna teks, bukan warna batang', pk.angkaWarnaTeks],
    ['sumbu samping 0 sampai 100, ambang 70 ditandai', pk.sumbuNilai === '0,20,40,60,80,100,70'],
    ['garis ambang putus-putus di 70', pk.ambangPutus],
    ['tiap batang punya kalimat lengkap untuk pembaca layar',
      /^Semester 1: 77\. \d+ dari 148 mahasiswa di atas rata-rata minimal 70$/.test(pk.kalimatBatang[0] ?? '') &&
      /^Semester 3: 82\. Naik 2 dari Semester 2\. \d+ dari 148 mahasiswa/.test(pk.kalimatBatang[2] ?? '')],
    ['tunjuk batang: tooltip muncul dengan nilainya', pk.tipMuncul],
    ['tooltip menyebut perubahan dari semester sebelumnya', pk.tipPerubahan],
    ['tooltip menyebut jumlah yang lolos rata-rata', pk.tipAmbang],
    ['batang yang ditunjuk menyala', pk.batangDuaMenyala],
    ['tooltip tidak dibaca dua kali oleh pembaca layar', pk.tipTersembunyiDariSR],
    ['tetikus bisa pindah ke tooltip tanpa ia lenyap', pk.tetapSaatDiTip],
    ['tooltip hilang setelah tetikus pergi', pk.hilangSetelahLepas],
    ['fokus papan ketik menampilkan tooltip yang sama', pk.tipFokus],
    ['Escape menyembunyikan tooltip, fokus tetap', pk.escapeMenyembunyikan],
    ['tidak ada tooltip bawaan peramban yang ikut muncul', pk.tanpaTitleBawaan],
    ['penjelasan: naik 5, 148 mahasiswa, angkatan 2024 dan 2025', pk.penjelasan3],
    ['penjelasan: yang di atas rata-rata 84% → 85% → 91%', pk.ambangNaik],
    ['tabel memuat jumlah mahasiswa dan ketiga semester', /Mahasiswa.*Semester 1.*Semester 2.*Semester 3/.test(pk.kepalaTabel)],
    ['tabel per angkatan, tertua dulu, lalu gabungan', pk.barisTabel === '2024,2025,Gabungan'],
    ['baris gabungan sama dengan batangnya', pk.gabunganSamaDenganBatang],
  ]
  const rusakPk = cekPk.filter(([, ok]) => !ok)
  gagal += rusakPk.length
  console.log('')
  console.log((rusakPk.length ? 'GAGAL  ' : 'OK     ') + 'Perkembangan per semester (Overview admin)')
  for (const [ket, ok] of cekPk) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const srBelum = await ujiSertifikat(null)
  const srLayak = await ujiSertifikat('DEMO-LAYAK')
  const srKosong = await ujiSertifikat('DEMO-KOSONG')
  const cekSr = [
    ['belum layak: tombol cetak ada tapi mati', srBelum.adaTombol && srBelum.mati],
    ['belum layak: klik tidak mencetak apa pun', srBelum.dicetak === 0],
    ['belum layak: tidak ada lembar sertifikat sama sekali', !srBelum.adaLembar],
    ['kelima syarat tercantum beserta statusnya', srBelum.jumlahSyarat === 5 && srBelum.belum === 4],
    ['satu komponen kosong saja sudah mematikan tombol', srKosong.mati && !srKosong.adaLembar],
    ['layak: tombol hidup dan klik mencetak', !srLayak.mati && srLayak.dicetak === 1],
    ['layak: lembar sertifikat memuat nama dan nilai', /Kirana Wulandari/.test(srLayak.isiLembar) && /nilai akhir [0-9]+ dan predikat [A-D]/.test(srLayak.isiLembar)],
  ]
  const rusakSr = cekSr.filter(([, ok]) => !ok)
  gagal += rusakSr.length
  console.log((rusakSr.length ? 'GAGAL  ' : 'OK     ') + 'Tombol cetak sertifikat')
  for (const [ket, ok] of cekSr) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const saLayak = await ujiSertifikatAdmin('DEMO-LAYAK')
  const saKosong = await ujiSertifikatAdmin('DEMO-KOSONG')
  const cekSa = [
    ['?cari= mengisi kotak cari dan menyaring ke satu mahasiswa', saLayak.cariTerisi && saLayak.satuBaris && saKosong.satuBaris],
    ['layak: tertulis Berhak', /^Berhak/.test(saLayak.status)],
    ['belum layak: tertulis Belum berhak beserta alasannya', /^Belum berhak./.test(saKosong.status) && saKosong.alasanTerkait],
    ['belum layak: tombol cetak ada tapi mati', saKosong.adaTombol && saKosong.mati],
    ['belum layak: klik tidak mencetak apa pun', saKosong.dicetak === 0 && !saKosong.langsungDiBody],
    ['sebelum diklik tidak ada lembar sertifikat di halaman', !saLayak.sebelumKlik],
    ['layak: tombol hidup dan klik mencetak sekali', !saLayak.mati && saLayak.dicetak === 1],
    ['layak: saat print() dipanggil lembarnya sudah langsung di <body>', saLayak.langsungDiBody],
    ['layak: lembarnya sama persis dengan yang dicetak mahasiswa', saLayak.isiLembar === srLayak.isiLembar],
    ['layak: lembar bertahan sampai afterprint, lalu dilepas', saLayak.bertahanSampaiAfterprint && saLayak.dilepasSesudahAfterprint],
  ]
  const rusakSa = cekSa.filter(([, ok]) => !ok)
  gagal += rusakSa.length
  console.log((rusakSa.length ? 'GAGAL  ' : 'OK     ') + 'Halaman Cetak Sertifikat (admin)')
  for (const [ket, ok] of cekSa) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const ak = await ujiAngkatan()
  const cekAk = [
    ['satu kartu per angkatan di data master, terbaru lebih dulu', ak.kartuSesuaiBasisData],
    ['angkatan terbaru terpilih lebih dulu', ak.bawaanTerbaru],
    ['angkatan terkunci tertulis Terkunci', ak.terkunciTertulis],
    ['memilih kartu memindahkan rincian', ak.pilihBerpindah],
    ['angkatan yang belum selesai belum bisa dikunci, beserta alasannya', ak.belumBisaDikunci],
    ['jumlah di kartu sama dengan daftar yang perlu ditindaklanjuti', ak.jumlahCocok],
    ['tautan Masukkan nilai membawa angkatan dan NIM', ak.tautanInputLengkap],
    ['angkatan yang selesai: pratinjau berhak sertifikat tampil', ak.pratinjauTampil],
    ['admin biasa: tombolnya "Ajukan penguncian" beserta catatan persetujuan', ak.ajukanUntukAdminBiasa],
    ['tombol kunci mati sebelum nama angkatan diketik persis', ak.matiSebelumDiketik && ak.matiBilaSalahKetik],
    ['tombol kunci hidup setelah diketik persis', ak.hidupBilaCocok],
    ['sesudah dikunci, statusnya dan tautan cetak sertifikat tampil', ak.terkunciSesudahnya && ak.tautanSertifikat],
    ['Cetak Sertifikat menerima ?angkatan=', ak.sertifikatTersaring],
  ]
  const rusakAk = cekAk.filter(([, ok]) => !ok)
  gagal += rusakAk.length
  console.log((rusakAk.length ? 'GAGAL  ' : 'OK     ') + 'Halaman Angkatan (admin)')
  for (const [ket, ok] of cekAk) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const pn = await ujiPenilaian()
  const cekPn = [
    ['Input Manual punya tombol "Atur penilaian A.1"', pn.adaTombol],
    ['penyunting terbuka: teks aspek, deskripsi, tambah komponen', pn.editorTerbuka],
    ['tombol simpan baru muncul bila ada perubahan', pn.belumAdaSimpan],
    ['komponen baru tanpa nama ditandai', pn.barisBaruDiperiksa],
    ['pratinjau: mahasiswa menjadi belum lengkap karena komponen baru', pn.pratinjauBelumLengkap],
    ['super admin: tombol "Simpan penilaian"', pn.simpanUntukSuperAdmin],
    ['admin biasa: tombol "Ajukan ke Super Admin"', pn.ajukanUntukAdminBiasa],
  ]
  const rusakPn = cekPn.filter(([, ok]) => !ok)
  gagal += rusakPn.length
  console.log((rusakPn.length ? 'GAGAL  ' : 'OK     ') + 'Penyunting penilaian di Input Manual')
  for (const [ket, ok] of cekPn) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const supa = await ujiSuperAdmin()
  const cekSupa = [
    ['super admin membuka panel admin tanpa galat', supa.panelAdminTerbuka],
    ['profil super admin berlencana Super Admin', supa.lencanaSuperAdmin],
    ['menu akun super admin menulis Super Admin', supa.menuAkunSuperAdmin],
    ['admin biasa tetap berlabel Kemahasiswaan', supa.adminBiasaTetap],
  ]
  const rusakSupa = cekSupa.filter(([, ok]) => !ok)
  gagal += rusakSupa.length
  console.log((rusakSupa.length ? 'GAGAL  ' : 'OK     ') + 'Super admin (label peran)')
  for (const [ket, ok] of cekSupa) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const ps = await ujiPanelSuper()
  const cekPs = [
    ['super admin diarahkan ke /super, admin biasa ke /admin', ps.arahSuper && ps.arahAdminBiasa],
    ['admin biasa yang membuka /super dikembalikan ke /admin', ps.adminBiasaDitolak],
    ['menu samping: tujuh butir, semuanya di /super', ps.menuTujuh],
    ['tiga tugas utama tepat di bawah Pusat Kendali: persetujuan, penilaian, akses', ps.urutanTugas],
    ['menu samping memakai sorotan gelap', ps.menuGelap],
    ['Pusat Kendali tersorot sebagai menu aktif', ps.kendaliAktif],
    ['ada tautan kembali ke panel Kemahasiswaan', ps.keKemahasiswaan],
    ['Pusat Kendali memuat antrean dan rantai pengawasan', ps.isiKendali],
    ['tanpa basis data, log tindakan admin dinyatakan tidak tersedia', ps.tanpaServerJujur],
    ['menu samping dikelompokkan: Utama (4) dan Pengawasan (3)', ps.menuBerkelompok],
    ['tanpa permintaan menunggu, lonceng tidak muncul', ps.tanpaLonceng],
    ['ada permintaan menunggu: lonceng muncul dengan jumlahnya', ps.loncengMenunggu],
    ['grafik perubahan nilai: enam batang bulanan yang bisa difokus', ps.grafikBulanan],
    ['pemilih periode: memilih periode lain menyaring isi dan menandai antrean "Saat ini"', ps.pilihPeriode],
    ['log perubahan nilai terisi', ps.logNilaiTerisi],
    ['penyaring NIM hanya menyisakan mahasiswa itu', ps.saringNim],
    ['Penilaian & Bobot: semua aspek bisa dipilih, aspek pertama terbuka', ps.kartuSemuaAspek],
    ['Penilaian & Bobot: super admin menyimpan langsung, tanpa mengajukan', ps.simpanLangsung],
    ['draf yang belum disimpan ditanyakan sebelum berganti aspek', ps.drafDitanyakan],
    ['tab Bobot memasang halaman Kurikulum tanpa judulnya, aspek terpilih ikut', ps.bobotTertanam],
    ['Akses Pengguna: daftar dosen beserta status aksesnya', ps.aksesDaftarDosen],
    ['mencabut akses butuh alasan, lalu statusnya berubah', ps.cabutAkses],
    ['hapus akun hanya untuk akses yang dicabut, butuh alasan, lalu barisnya hilang', ps.hapusAkun],
    ['pencarian NIP menyisakan dosen itu', ps.cariAkun],
    ['akun super admin (milik sendiri) tidak bisa dicabut', ps.superTidakBisaDicabut],
    ['tab Mahasiswa: NIM, prodi, dan angkatan tampil, pencarian NIM jalan, akses bisa dicabut', ps.aksesMahasiswa],
    ['pintu API yang belum dibuat (404) dikenali', ps.apiBelumAdaDikenali],
  ]
  const rusakPs = cekPs.filter(([, ok]) => !ok)
  gagal += rusakPs.length
  console.log((rusakPs.length ? 'GAGAL  ' : 'OK     ') + 'Panel Super Admin')
  for (const [ket, ok] of cekPs) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const ms = await ujiMataSandi()
  const cekMs = [
    ['kolom sandi berikon mata, tanpa tulisan Tampilkan/Sembunyikan', ms.adaMata],
    ['ditunjuk tetikus: sandi tampil, lalu tersembunyi lagi saat kursor pergi', ms.tunjukTetikus],
    ['ditahan jari: sandi tampil, lalu tersembunyi lagi saat dilepas', ms.tahanSentuh],
    ['klik tetikus diabaikan; Enter/Spasi menyalakan dan mematikan (aria-pressed)', ms.papanKetik],
  ]
  const rusakMs = cekMs.filter(([, ok]) => !ok)
  gagal += rusakMs.length
  console.log((rusakMs.length ? 'GAGAL  ' : 'OK     ') + 'Mata kata sandi di halaman masuk')
  for (const [ket, ok] of cekMs) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const bm = await ujiBahasaMasuk()
  const cekBm = [
    ['halaman masuk berbahasa Inggris selama belum ada pilihan', bm.masukInggris],
    ['halaman masuk punya pemilih ID / EN', bm.adaPemilih],
    ['kunci lama (bawaan yang ikut tersimpan) dibuang', bm.kunciLamaDibuang],
    ['bahasa bawaan tidak disimpan sebagai pilihan', bm.bawaanTidakDisimpan],
    ['menekan EN yang sudah aktif tetap tercatat sebagai pilihan', bm.enAktifTetapDisimpan],
    ['tanpa pilihan, panel tetap Indonesia', bm.panelIndonesia],
    ['memilih ID di halaman masuk mengganti bahasa dan disimpan', bm.pilihIndonesia],
    ['pilihan itu diingat saat halaman masuk dibuka lagi', bm.pilihanDiingat],
  ]
  const rusakBm = cekBm.filter(([, ok]) => !ok)
  gagal += rusakBm.length
  console.log((rusakBm.length ? 'GAGAL  ' : 'OK     ') + 'Bahasa bawaan halaman masuk')
  for (const [ket, ok] of cekBm) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const kr = await ujiKurikulum()
  const cekKr = [
    ['sepuluh aspek bisa dipilih', kr.sepuluhAspek],
    ['bawaan: dibagi otomatis, belum ada perubahan', kr.bawaanOtomatis],
    ['beralih ke manual mengisi porsi yang berlaku', kr.manualDiisiPorsiBerlaku],
    ['jumlah bukan 100 ditandai dan tombol simpan tidak muncul', kr.jumlahSalahDitandai],
    ['pratinjau dampak tampil', kr.dampakTampil],
    ['menyentuh angkatan terkunci: alasan wajib, tombol mati', kr.alasanWajib],
    ['admin biasa: menyentuh angkatan lewat Semester 3 → tombol "Ajukan ke Super Admin" beserta catatannya', kr.ajukanUntukAdminBiasa],
    ['tombol simpan hidup sesudah alasan diisi', kr.hidupSesudahAlasan],
    ['tersimpan dan langsung dipakai menghitung', kr.tersimpan],
    ['kartu aspek tertulis Manual', kr.kartuManual],
  ]
  const rusakKr = cekKr.filter(([, ok]) => !ok)
  gagal += rusakKr.length
  console.log((rusakKr.length ? 'GAGAL  ' : 'OK     ') + 'Halaman Kurikulum: bobot (admin)')
  for (const [ket, ok] of cekKr) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const pm = await ujiPenandaMenu()
  const cekPm = [
    ['lima butir menu', pm.jumlahButir === 5],
    ['sorotan awal ada di halaman aktif', pm.awalDiHalamanAktif],
    ['semua butir bisa disorot saat ditunjuk', pm.semuaBisaDisorot],
    ['tidak ada lagi sorotan yang meluncur antarbutir', pm.tanpaSorotanMeluncur],
    ['isi halaman dibungkus animasi masuk', pm.isiBeranimasi],
    ['Ctrl+klik tidak memindahkan penanda', pm.pengubahDiam],
    ['klik biasa memindahkan penanda seketika', pm.pindahSeketika],
    ['aria-current tetap di halaman yang benar-benar terbuka', pm.ariaTetapJujur],
  ]
  const rusakPm = cekPm.filter(([, ok]) => !ok)
  gagal += rusakPm.length
  console.log((rusakPm.length ? 'GAGAL  ' : 'OK     ') + 'Penanda menu mahasiswa')
  for (const [ket, ok] of cekPm) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const rusakTren = cekTren.filter(([, ok]) => !ok)
  gagal += rusakTren.length
  console.log('')
  console.log((rusakTren.length ? 'GAGAL  ' : 'OK     ') + 'Grafik ringkas nilai akhir')
  for (const [ket, ok] of cekTren) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  const rusakPolos = cekPolos.filter(([, ok]) => !ok)
  gagal += rusakPolos.length
  console.log((rusakPolos.length ? 'GAGAL  ' : 'OK     ') + 'Status polos & lembar cetak')
  for (const [ket, ok] of cekPolos) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* --------------------- Lapis terjemahan mesin ---------------------------- */
  console.log('')
  const ot = await ujiOtomatis()
  const cekOtomatis = [
    ['peramban tanpa penerjemah: diam, tidak rusak', ot.diamTanpaApi],
    ['mesin dipanggil saat kamus tidak punya padanan', ot.mesinDipanggil],
    ['hasilnya masuk singgahan', ot.hasilMasuk],
    ['hasilnya dipakai terjemah()', ot.dipakaiTerjemah],
    ['hasil yang kehilangan penanda DIBUANG', ot.penandaHilangDibuang],
    ['kalimat itu jatuh ke Indonesia yang utuh', ot.jatuhKeIndonesia],
    ['kamus manusia tetap menang atas mesin', ot.kamusMenang],
  ]
  const rusakOtomatis = cekOtomatis.filter(([, ok]) => !ok)
  gagal += rusakOtomatis.length
  console.log((rusakOtomatis.length ? 'GAGAL  ' : 'OK     ') + 'Terjemahan mesin sebagai jaring pengaman')
  for (const [ket, ok] of cekOtomatis) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------- Bahasa & bantuan di panel admin dan dosen ---------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const pa = await ujiPanelLain('/admin')
  w.localStorage.setItem('sk5c.session', SESI.dosen)
  const pd = await ujiPanelLain('/dosen')
  const cekPanel = [
    ['pemilih bahasa ada di panel Kemahasiswaan', pa.adaPemilihBahasa],
    ['isi panel Kemahasiswaan ikut berganti', pa.isiIkutBerganti],
    ['pemilih bahasa ada di panel dosen', pd.adaPemilihBahasa],
    ['isi panel dosen ikut berganti', pd.isiIkutBerganti],
    ['tombol bantuan ADA di panel dosen', pd.adaTombolBantuan],
    ['tombol bantuan TIDAK ada di panel Kemahasiswaan', !pa.adaTombolBantuan],
  ]
  const rusakPanel = cekPanel.filter(([, ok]) => !ok)
  gagal += rusakPanel.length
  console.log((rusakPanel.length ? 'GAGAL  ' : 'OK     ') + 'Bahasa & bantuan lintas panel')
  for (const [ket, ok] of cekPanel) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ---------------------- Layanan tambahan mengambang ---------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const ly = await ujiLayanan()
  const lyLain = await ujiLayanan('/mahasiswa/transkrip')
  const cekLayanan = [
    ['tombol bantuan ada di panel mahasiswa', ly.adaTombol],
    ['ada juga di halaman lain, bukan cuma dashboard', lyLain.adaTombol],
    ['benar-benar mengambang, bukan ikut tergulir', ly.mengambang],
    ['tidak ikut tercetak bersama transkrip', ly.takIkutTercetak],
    ['lapisannya di bawah laci navigasi', ly.diBawahLaci],
    ['panel tertutup sebelum ditekan', ly.tertutupAwal],
    ['tombolnya menyebut keadaannya', ly.menyebutKeadaan],
    ['panel terbuka setelah ditekan', ly.terbuka],
    ['keadaan tombol ikut berubah', ly.keadaanIkutBerubah],
    ['berisi tiga saluran', ly.tigaSaluran],
    ['ada tautan WhatsApp', ly.adaWhatsapp],
    ['ada tautan telepon', ly.adaTelepon],
    ['ada tautan surel', ly.adaSurel],
    ['nomor tel: tanpa spasi', ly.telSah],
    ['tautan keluar memakai rel noopener', ly.tautanKeluarAman],
    ['jam layanan dicantumkan', ly.adaJamLayanan],
    ['panelnya memakai bahan kaca', ly.berkaca],
    ['barisnya muncul berurutan', ly.berurutanMasuk],
    ['Escape menutup panelnya', ly.escMenutup],
  ]
  const rusakLayanan = cekLayanan.filter(([, ok]) => !ok)
  gagal += rusakLayanan.length
  console.log((rusakLayanan.length ? 'GAGAL  ' : 'OK     ') + 'Layanan tambahan mengambang')
  for (const [ket, ok] of cekLayanan) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------------ Seret pil pemilih bahasa ----------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const sb = await ujiSeretBahasa()
  const cekSeret = [
    ['ada pil penanda yang bergerak', sb.adaPil],
    ['pilnya memakai bahan kaca', sb.pilBerkaca],
    ['mulai menempel di segmen kiri', sb.mulaiDiKiri],
    ['KLIK BIASA mengganti bahasa', sb.klikBiasaMengganti],
    ['klik susulan tidak menghitungnya dua kali', sb.klikSusulanDiabaikan],
    ['klik biasa bisa kembali ke segmen kiri', sb.klikBiasaBisaKembali],
    ['pil mengikuti jari saat diseret', sb.pilIkutJari],
    ['transisi dimatikan selama diseret', sb.transisiMatiSaatDiseret],
    ['seret lalu dilepas di kanan: bahasa berganti', sb.seretMengganti],
    ['transisi pulih setelah dilepas', sb.transisiPulih],
    ['klik susulan sesudah seret tidak membalikkannya', sb.seretTakDibalikSentuhan],
    ['seret pendek kembali ke tempat semula', sb.seretPendekKembali],
    ['papan ketik tetap dilayani', sb.papanKetikJalan],
  ]
  const rusakSeret = cekSeret.filter(([, ok]) => !ok)
  gagal += rusakSeret.length
  console.log((rusakSeret.length ? 'GAGAL  ' : 'OK     ') + 'Pemilih bahasa: klik, seret, papan ketik')
  for (const [ket, ok] of cekSeret) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ---------------- Alur dosen: usul, setujui, tolak, tahan ---------------- */
  console.log('')
  const ad = await ujiAlurDosen()
  const cekDosen = [
    ['ada pengumpulan yang bisa dinilai', ad.adaAntrean],
    ['usulan tercatat sebagai menunggu', ad.usulanTercatat],
    ['nilainya BELUM masuk transkrip', ad.belumMasukTranskrip],
    ['status pengumpulan jadi menunggu', ad.statusJadiMenunggu],
    ['masuk antrean persetujuan admin', ad.masukAntreanAdmin],
    ['admin bisa menyetujui', ad.disetujui],
    ['barulah nilainya masuk transkrip', ad.masukTranskrip],
    ['status pengumpulan jadi tercatat', ad.statusJadiDinilai],
    ['tercatat sebagai batch yang bisa dibatalkan', ad.punyaBatch],
    ['tidak bisa diputuskan dua kali', ad.tidakBisaDiputusDuaKali],
    ['penolakan tidak menulis nilai apa pun', ad.tolakTidakMenulis],
    ['status pengumpulan jadi ditolak', ad.statusJadiDitolak],
    ['sistem menahan usulan yang melanggar', ad.sistemMenahan],
    ['usulan yang ditahan tetap menunggu', ad.tetapMenunggu],
  ]
  const rusakDosen = cekDosen.filter(([, ok]) => !ok)
  gagal += rusakDosen.length
  console.log((rusakDosen.length ? 'GAGAL  ' : 'OK     ') + 'Alur nilai dosen -> persetujuan')
  for (const [ket, ok] of cekDosen) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  console.log(gagal ? '\n' + gagal + ' rute bermasalah' : '\nSeluruh rute merender tanpa galat')
  process.exit(0)
})()
