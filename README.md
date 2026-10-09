# Dashboard Monitoring Softskill 5C

Purwarupa pemantauan **capaian pembelajaran (CPMK) softskill terintegrasi** di UMN.

Nilai **tidak** diajukan mahasiswa. Seluruhnya masuk dari tiga program asesmen kurikuler yang
berjalan paralel pada Semester 1–3: **PDP**, **Mata Kuliah Humaniora/Kebangsaan**, dan
**Kemahasiswaan (Student Service)**.

Nama produk tetap menyebut 5C karena itu istilah unit pengelola, tetapi **5C bukan sumbu
penilaian** — ia materi Mentoring 5C di semester 1 yang menyumbang komponen asesmen ke aspek
A.1 dan A.2. Sumbu penilaian adalah 10 aspek CPMK.

## Menjalankan

```bash
npm install
# basis data: nyalakan MySQL di XAMPP lebih dulu. .env berisi DATABASE_URL dan AUTH_SECRET
# (kunci acak untuk menandatangani cookie sesi).
npx prisma migrate dev   # membuat/menyesuaikan tabel — hentikan `npm run dev` dulu di Windows
npm run db:seed          # data master dan kurikulum (hanya bila belum ada) + akun awal; aman diulang
npm run db:seed:contoh   # opsional: 290 mahasiswa contoh — MENGHAPUS seluruh isi basis data

npm run dev       # http://localhost:3000
npm run build     # next build
npm start         # melayani hasil build

npm run verify      # cetak seluruh angka scoring untuk enam persona
npm run smoke       # render tiap rute di DOM sungguhan, tanpa data lalu dengan data contoh
npm run assert      # periksa transkrip mematuhi R2, R3, R4, R8
npm run test:nilai  # simpan batch, rollback, dan validasi import
npm run test:profil # penyimpanan profil: kunci akun, simpan-muat, foto
npm run test:db     # setiap pintu API terhadap MySQL, termasuk kunci angkatan, data terkunci, log, kurikulum;
                    # data uji (NIM dan angkatan berawalan UJI) dihapus lagi
```

Uji selain `test:db` berjalan tanpa server dan tanpa basis data (mode lokal, lihat
`src/lib/modeData.js`): sesi dan perubahan hidup di memori, dan halaman diisi data contoh.

`test:db` masuk memakai akun admin dan dosen dari `npm run db:seed`, jadi jalankan seed lebih dulu
bila basis data baru dikosongkan. `smoke` dan `assert` memakai jsdom 29, yang butuh Node
`^20.19`, `^22.13`, atau `>=24`. Di Node 22.11 keduanya berhenti dengan galat `ERR_REQUIRE_ESM`,
kecuali `require(esm)` dinyalakan lewat flag: `NODE_OPTIONS=--experimental-require-module npm run
smoke` (Git Bash) atau `$env:NODE_OPTIONS='--experimental-require-module'; npm run smoke`
(PowerShell).

## Kerangka: Next.js App Router

Aplikasi berjalan di **Next.js 16 (App Router)** dengan **React 19** dan **Tailwind 3**.
**Seluruh data dibaca dan ditulis lewat basis data.** Peramban tidak pernah bicara langsung
dengan MySQL; jalurnya selalu:

```
halaman (peramban) → app/api/... → src/server/... → Prisma (src/server/db.js) → MySQL
```

- **Sesi**: `/api/masuk` memasang cookie httpOnly bertanda tangan (`AUTH_SECRET`). Setiap halaman
  dimuat, `/api/sesi` membaca ulang akunnya dari basis data.
- **Data master** (angkatan, fakultas, prodi): dibaca `app/layout.jsx` di server setiap halaman
  dimuat, lalu dipasang ke `src/lib/data.js` lewat `isiMaster()`.
- **Kurikulum** (komponen, indikator, timpaan `CONFIG`): ikut dibaca bersama data master dan
  dipasang lewat `isiKurikulum()`; pintu API memuatnya ulang bila versinya naik. Lihat Kurikulum
  dari basis data.
- **Data isian** (mahasiswa, nilai, penguncian, pengumpulan, usulan, koreksi, riwayat batch,
  profil): `components/PemuatData.jsx` memanggil `/api/data` begitu ada yang masuk, lalu
  `isiData()`. Isinya disaring per peran di `src/server/muat.js`: admin melihat semuanya, dosen
  hanya kelasnya, mahasiswa hanya dirinya.
- **Penulisan**: fungsi di `src/lib/store.js` (simpan nilai, rollback, penguncian, koreksi,
  usulan) dan `simpanProfil` mengirim ke API, lalu data dimuat ulang dari basis data. Aturan
  penilaian (R1, semester komponen, kunci final, data terkunci, wewenang tiap peran) diperiksa
  ulang di server.

Struktur kurikulum (fase, area, cluster, 10 aspek) dan periode aktif masih dibaca dari kode. Data contoh ada di
`scripts/dataContoh.js` dan hanya dipakai skrip uji serta `db:seed:contoh` — website tidak
memakainya.

```
app/        berkas rute — tipis, isinya hanya menunjuk komponen di src/
app/api/    pintu API — tipis, isinya memanggil src/server/
src/halaman berkas halaman sesungguhnya (dulu src/pages; diganti namanya karena
            Next mengira folder bernama "pages" adalah Pages Router)
src/lib     domain: config → curriculum → scoring → rules, plus store & auth
src/server  hanya berjalan di server: sesi, pemeriksaan wewenang, baca/tulis basis data
```

Seluruh halaman adalah komponen klien (`'use client'`); datanya datang dari API di atas.

Dua hal yang perlu diingat saat menambah halaman:

1. Tambahkan rutenya di `app/`, **dan** daftarkan di `scripts/smoke.jsx` — uji merender
   komponen langsung tanpa server Next, jadi susunan layout ditulis ulang di sana.
2. Tautan memakai `next/link`. Untuk tautan yang perlu tahu dirinya sedang aktif, pakai
   `TautanNav` dari `src/lib/nav.jsx` — padanan `<NavLink>` yang tidak ada di Next.

## Struktur kurikulum enam lapis

```
Fase (2) → Area (3) → Cluster (6) → Aspek CPMK (10)
         → Komponen Asesmen (PDP / MK / Kemahasiswaan)
         → Indikator Perilaku
```

**Aspek CPMK adalah unit penilaian atom.** Fase, area, dan cluster tidak pernah diinput —
nilainya selalu diagregasi naik. Satu cluster boleh melintasi dua semester (CL6 = C.1 di
semester 2 + C.2 di semester 3); satu aspek selalu milik tepat satu semester.

Distribusi aspek per semester: **3 / 4 / 3**.

## Kurikulum dari basis data

Sejak `npm run db:seed`, daftar komponen (tabel `Komponen`), indikator perilaku (tabel `Indikator`),
dan pengaturan kebijakan yang ditimpa (tabel `Konfigurasi`) dibaca dari basis data. Isinya di
`curriculum.js` dan `config.js` menjadi **bawaan**: ditanam sekali oleh seed, lalu dipakai lagi
hanya bila basis data belum di-seed atau tidak bisa dibaca. Ini persiapan halaman Kurikulum CPMK,
tempat Kemahasiswaan nanti mengubahnya sendiri.

- **Penanda versi.** Baris `VERSI_KURIKULUM` di tabel `Konfigurasi` menandai bahwa kurikulum sudah
  dikelola di basis data. Seed hanya menanam kurikulum selama penanda itu belum ada, jadi isi yang
  sudah diubah admin tidak pernah ditimpa. Setiap perubahan kurikulum menaikkan angkanya.
- **Halaman.** `src/server/master.js` membawa kurikulum bersama data master; `isiMaster()`
  memasangnya lewat `isiKurikulum()` sebelum halaman dirender.
- **Pintu API.** `tangani()` memanggil `siapkanKurikulum()` (`src/server/kurikulum.js`) sebelum
  bekerja; kurikulum dibaca ulang hanya bila versinya berubah.
- **Diisi di tempat.** `KOMPONEN` dan `INDIKATOR` diganti isinya, bukan diganti lariknya, karena
  modul lain memegang rujukannya sejak dimuat — sama dengan larik di `data.js`.
- **Diarsipkan** (`aktif = false`): komponen tidak ikut dimuat, jadi tidak tampil dan tidak
  dihitung, tetapi nilainya tetap tersimpan. ID komponen tidak pernah diganti, karena dipakai nilai,
  riwayat, usulan, dan koreksi.
- **Pengaturan.** Hanya kunci di `KUNCI_DAPAT_DIUBAH` (`config.js`) yang boleh ditimpa; kunci yang
  tidak ada di tabel kembali ke bawaannya. `TOTAL_SEMESTER_PROGRAM` sengaja tidak bisa ditimpa.
- **Gagal baca tidak menghentikan apa pun.** Bila tabelnya tidak bisa dibaca, halaman dan pintu API
  tetap jalan dengan isi terakhir (atau bawaan kode) dan menulis peringatan di konsol server.

Setelah menarik perubahan skema, hentikan `npm run dev` lebih dulu: di Windows `prisma generate`
gagal (`EPERM`) selama server masih memegang berkas mesin Prisma, dan server yang sudah jalan tetap
memakai Prisma Client lama sampai dinyalakan ulang.

## Empat keadaan sebuah aspek

Membedakan keempatnya adalah aturan bisnis, bukan urusan tampilan.

| Status | Arti | Tampilan |
|---|---|---|
| `terkunci` | Semesternya belum tiba | Ikon gembok + “Dibuka pada Semester N”. **Tanpa angka, bar, `0`, atau `—`** |
| `menunggu` | Semester berjalan, nilai belum masuk | “Belum masuk dari penilai” |
| `berjalan` | Sebagian komponen terisi, atau lengkap tapi semester belum ditutup | Nilai tampil, berlabel **sementara** |
| `final` | Lengkap dan sudah dikunci (lihat di bawah) | Nilai tetap |

Komponen yang belum terisi **dikeluarkan dari pembagi**, tidak pernah dianggap nol.

Di halaman Riwayat, kalimat *disetujui oleh …* hanya dipakai untuk aspek yang sudah final. Aspek
yang masih sementara ditulis *dinilai oleh … (belum dikunci, masih bisa berubah)*, karena
menyebutnya "disetujui" akan menyesatkan.

## Peta berkas

```
src/lib/
  config.js       CONFIG — satu-satunya tempat angka kebijakan; ada pub/sub agar
                  perubahan menyebar ke seluruh perhitungan tanpa reload. Bisa ditimpa tabel
                  Konfigurasi lewat terapkanKonfigurasi()
  curriculum.js   struktur: fase, area, cluster, 10 aspek; komponen dan indikator bawaan yang
                  diisi ulang dari basis data lewat isiKurikulum()
  scoring.js      seluruh rumus: bobot, nilai aspek/cluster/area/fase, nilai akhir, rubrik
  rules.js        R1–R9 sebagai fungsi murni + validasi import
  data.js         sumber data halaman: periode akademik (semesterAktif dibatasi 3,
                  semesterKalender tidak); angkatan, fakultas, prodi (diisi dari basis data
                  lewat isiMaster); data isian (mahasiswa, nilai, pengumpulan, usulan) yang
                  dimulai kosong
  store.js        penulisan: kirim ke API lalu muat ulang dari basis data (mode lokal untuk uji:
                  diputar ulang di memori)
  kirim.js        satu pintu fetch ke API; jawaban 401 mengakhiri sesi
  modeData.js     website = server; skrip uji menyalakan mode lokal
  profil.js       telepon, alamat, foto milik pengguna — tabel Profil lewat /api/profil
  csv.js          urai/susun CSV dan pemicu unduhan, tanpa pustaka tambahan
  ingest.js       pengenalan berkas rekap mentah — lihat Pengenalan berkas mentah
  values5c.js     5C sebagai materi Mentoring — tidak dipakai untuk menghitung apa pun
  auth.jsx        masuk lewat /api/masuk, sesi dari cookie lewat /api/sesi, penjaga rute per peran
  theme.jsx       mode terang/gelap
  bahasa.jsx      pilihan bahasa dan useTeks()
  teks.js         kamus Indonesia → Inggris — lihat Kamus dan terjemahan
  terjemahOtomatis.js  penerjemah bawaan peramban untuk kalimat yang belum ada di kamus
  nav.jsx         TautanNav, padanan <NavLink> untuk Next
  kurva.js        kurva monoton untuk grafik tren — lihat Grafik
  tunjuk.js       tooltip (WCAG 1.4.13)
  penandaGeser.js sorotan menu sidebar
  layanan.js      tautan lupa sandi SSO dan kontak layanan UMN

src/server/       hanya berjalan di server, tidak pernah dikirim ke peramban
  db.js           satu PrismaClient untuk seluruh aplikasi
  sesi.js         cookie sesi bertanda tangan (jose, AUTH_SECRET)
  api.js          kerangka pintu API: baca pemilik cookie dari basis data, periksa peran, galat
  masuk.js        pemeriksaan email + kata sandi (bcrypt) terhadap tabel Pengguna
  master.js       angkatan, fakultas, prodi dari basis data — dibaca app/layout.jsx
  muat.js         data halaman per peran (GET /api/data)
  nilai.js        simpan batch, rollback (diputar ulang dari AuditLog), penguncian aspek, dan
                  aturan data terkunci (cariTerkunci, wajibkanAlasan)
  pengajuan.js    koreksi mahasiswa dan usulan dosen, beserta keputusannya
  angkatan.js     ringkasan, pratinjau, dan penguncian angkatan
  log.js          catatLog(): catatan tindakan Kemahasiswaan ke tabel LogAktivitas; bacaLog():
                  membaca log nilai dan log aktivitas (POST /api/log)
  profil.js       isian profil milik pemilik sesi
  kurikulum.js    kurikulum dan timpaan CONFIG dari basis data; siapkanKurikulum() untuk pintu API

app/api/          masuk, keluar, sesi, data, nilai, nilai/rollback, penguncian, koreksi,
                  koreksi/keputusan, usulan, usulan/keputusan, profil, angkatan,
                  angkatan/pratinjau, angkatan/kunci, log
src/components/PemuatData.jsx  memuat /api/data begitu ada yang masuk dan menahan panel
                  sampai datanya tiba
prisma/           skema, migrasi, seed.js (isi dasar), seed-contoh.js (data contoh),
                  tanam-kurikulum.js (kurikulum bawaan, dipakai kedua seed)
scripts/          skrip uji; dataContoh.js berisi data contoh (290 mahasiswa, 5 dosen,
                  audit log) yang dimuat uji lewat isiData() — website tidak memakainya

src/components/   Ui, Icons, Navbar, Laci, MenuAkun, Footer, FilterBar, ErrorBoundary,
                  TombolBahasa, PilihanMengambang, PenyuntingFoto, LayananTambahan, LogoPdp
src/components/charts/  ChartFrame, RadarCluster (6 sumbu), AspectBars (10 aspek), MutuDonut,
                  PerkembanganAngkatan
src/halaman/      Login, Profil (satu halaman profil untuk tiga peran)
src/halaman/student/  StudentLayout, Dashboard, Transkrip, Peta, Riwayat, Sertifikat,
                    LembarCetak, LembarSertifikat, LoncengBelumDinilai
src/halaman/dosen/    DosenLayout, Masuk (Data Masuk), Nilai, Usulan, status
src/halaman/admin/    AdminLayout, Overview, Students, StudentDetail, Programs, Nilai, Usulan,
                    LoncengKemahasiswaan, StatusData, Kurikulum, Angkatan, Log
                    (tiga terakhir masih "Segera Hadir")
```

Arah ketergantungan satu arah: `curriculum → scoring → rules → UI`.

## Masuk

Email dan kata sandi diperiksa ke tabel `Pengguna` lewat `POST /api/masuk`; kata sandi
dicocokkan dengan hash bcrypt, dan **peran dibaca dari basis data**, bukan ditebak dari domain.
Email yang tidak terdaftar dan kata sandi yang salah dijawab dengan pesan yang sama, supaya
tidak bisa dipakai menebak email mana yang terdaftar.

Akun awal dari `npm run db:seed` (kata sandi pengembangan, ganti sebelum dipakai sungguhan):

| Peran | Email | Sandi |
|---|---|---|
| Mahasiswa | `rayhandi.zulmi@student.umn.ac.id` (NIM 00000103940, angkatan 2025 Genap) | `umn12345` |
| Dosen | `simon.petrus@lecturer.umn.ac.id` (MK Humaniora Semester 1, Sistem Informasi) | `umn12345` |
| Kemahasiswaan | `admin@umn.ac.id` | `umn12345` |

Setelah masuk, server memasang cookie httpOnly bertanda tangan (berlaku 8 jam, diperpanjang
setiap halaman dimuat). Setiap pintu API membaca ulang pemilik cookie dari basis data, jadi akun
yang dinonaktifkan atau berganti peran langsung berlaku. Perubahan nama, prodi, atau angkatan di
basis data terlihat setelah halaman dimuat ulang — tidak perlu masuk ulang.

Kasus sertifikat ada di data contoh angkatan 2024 yang sudah dikunci, dan kini hanya dipakai
skrip uji: `DEMO-LAYAK` (berhak), `DEMO-KOSONG` (satu komponen kosong), `DEMO-RENDAH` (nilai 63).

## Bahasa visual: rata, bukan bertumpuk

Seluruh panel memakai satu bahasa yang sama, mengikuti gaya E-Learning UMN:

- **tanpa gradien** — navbar, footer, dan kepala kartu memakai warna padat;
  kartu identitas hanya diberi garis merek setebal 1px di atasnya;
- **bayangan nyaris tidak ada** — kartu cukup dibatasi garis rambut;
- **menu aktif diisi penuh warna merek dengan teks putih**, bukan latar samar —
  supaya halaman yang sedang dibuka terbaca sekali lihat;
- **setiap kendali harus menuju ke suatu tempat.** Tombol pesan di navbar dibuang
  karena fiturnya belum ada, lonceng hanya muncul bila memang ada yang menunggu
  dan menjadi tautan ke halaman yang menanganinya, blok "Akses Cepat" di footer
  dibuang karena keempat tombolnya mati, dan sakelar tema tidak lagi muncul dua
  kali. Footer kemudian dibangun ulang mengikuti susunan E-Learning UMN —
  pintasan berikon, helpdesk, kontak, identitas unit — tetapi **setiap pintasan
  menunjuk ke halaman yang benar-benar ada**, dan berbeda antara panel mahasiswa
  (Transkrip, Peta Perjalanan, Riwayat, Sertifikat) dan panel Kemahasiswaan
  (Data Mahasiswa, Input Nilai, Program Studi, Sertifikat).

## Ringkasan admin sengaja dibuat tenang

Penggunanya dosen dan staf dengan rentang usia dan kebiasaan digital yang lebar, jadi halaman
`/admin` **bukan** dashboard padat. Aturan yang dipegang:

- **tiga angka saja** — mahasiswa terpantau, rata-rata nilai, dan nilai yang sudah final;
- **satu grafik saja** — donat sebaran huruf mutu — dan **tidak ada filter bertingkat**;
  grafik lainnya tinggal di halaman rinciannya;
- setiap angka besar disertai **satu persentase** dengan bilah tipis; persentasenya selalu
  tertulis angkanya, bilah hanya membantu membandingkan sekilas;
- blok **Perlu dikerjakan** menuliskan tugas sebagai kalimat utuh, bukan istilah teknis, dan
  hilang sendiri kalau memang tidak ada yang tertunda;
- setiap tautan menyebut tujuannya (**Lihat selengkapnya**, *Masukkan nilai*, *Tinjau
  pengajuan*), digarisbawahi, dan bidang kliknya besar;
- ukuran huruf mulai 14,5–16 px dengan jarak antarbaris longgar; tidak ada teks abu-abu kecil
  yang membawa informasi penting;
- angka ringkasan **tidak diulang** di bilah sisi — pekerjaan yang menunggu cukup ditandai
  lencana pada menu.

Halaman rincian (Data Mahasiswa, Program Studi, Input Nilai) tetap padat sebagaimana mestinya;
kepadatan itu memang dibutuhkan di sana.

### Kenapa donat, dan kenapa warnanya satu hue

Donat dipakai karena tugas datanya memang bagian-terhadap-keseluruhan dengan lima segmen —
masih di dalam batas aman enam segmen. Donat dua irisan tidak dipakai karena itu sekadar satu
angka, dan donat untuk membandingkan nilai yang berdekatan juga dihindari; angka pastinya tetap
tertulis di daftar sebelah kanan dan pada tampilan tabel.

Huruf mutu A–D adalah **skala berurutan**, bukan empat kategori setara, jadi warnanya satu hue
biru bertingkat (`--mutu-a` … `--mutu-d` di `index.css`) — makin gelap makin baik pada latar
terang, dan dibalik pada latar gelap. Keduanya sudah lolos pemeriksaan ordinal ramp: lightness
monoton, jarak antarlangkah ≥ 0,06, dan ujung terangnya 2,11:1 terhadap latar. “Belum Memenuhi”
bukan huruf mutu melainkan status, jadi ia memakai token status merah dan selalu berlabel.

Penyebut persentasenya adalah **jumlah mahasiswa yang sudah punya nilai**, bukan seluruh
mahasiswa — kalau ada yang belum dinilai sama sekali, jumlahnya disebutkan di bawah grafik
supaya persentasenya tetap genap 100%.

## Program studi

Empat fakultas, **14 program studi jenjang S1 dan D3**. Program magister (Manajemen Teknologi
dan Ilmu Komunikasi S2) sengaja tidak disertakan karena pembinaan softskill ini hanya berjalan
pada Semester 1–3 jenjang sarjana dan diploma.

| Fakultas | Program studi |
|---|---|
| Teknik & Informatika | Informatika, Sistem Informasi, Teknik Komputer, Teknik Elektro, Teknik Fisika — semua S1 |
| Ilmu Komunikasi | Komunikasi Strategis, Jurnalistik, Ilmu Komunikasi (PJJ) — semua S1 |
| Seni & Desain | Desain Komunikasi Visual, Film & Animasi, Arsitektur — semua S1 |
| Bisnis | Akuntansi (S1), Manajemen (S1), Perhotelan (**D3**) |

Halaman `/admin/nilai` menyaring sasaran input berlapis: **semester → sumber → angkatan →
fakultas → program studi**. Filter prodi juga menjadi penjaga import: baris milik mahasiswa di
luar angkatan atau program studi yang sedang dipilih ditolak beserta alasannya, baik pada
berkas berformat baku maupun rekap mentah.

## Angkatan dan penurunan semester

`semesterAktif` **tidak pernah diinput** — dihitung dari jarak antara periode masuk angkatan
dan `PERIODE_AKTIF`, dibatasi 3.

| Angkatan | Masuk | Semester aktif | Status |
|---|---|---|---|
| 2026 | Ganjil 2026/2027 | 1 | aktif |
| 2025 Genap | Genap 2025/2026 | 2 | aktif |
| 2025 | Ganjil 2025/2026 | 3 | aktif |
| 2024 | Ganjil 2024/2025 | 3 | **terkunci** |

Angkatan penerimaan Genap sengaja disertakan. Tanpanya, pada periode aktif Ganjil semua
angkatan berada di semester ganjil (1 dan 3) dan **semester 2 tidak akan pernah bisa
didemokan**.

`semesterKalender()` di `src/lib/data.js` menghitung jarak yang sama **tanpa** batas 3. Angkatan
2024 pada periode Ganjil 2026/2027, misalnya, berada di semester kalender 5. Angka ini tidak
ditampilkan; gunanya memutuskan apakah Semester 3 sebuah angkatan sudah berakhir, yang menjadi
syarat untuk menguncinya (lihat Penguncian angkatan dan data terkunci).

## Yang masih menunggu keputusan unit pengelola

Semuanya ada di `src/lib/config.js` bertanda `// MENUNGGU KONFIRMASI`:

| Kunci | Default | Kenapa belum pasti |
|---|---|---|
| `ASPEK_A3_SEMESTER` | `1` | Sheet GENERAL menaruh A.3 di semester 1, sheet DETAIL KOMPONEN di blok PDP-2 |
| `ASPEK_C1_SEMESTER` | `2` | Excel menaruh C.1 di semester 2, peta jalan visual menyatukannya dengan C.2 |
| `MODE_BOBOT_KOMPONEN` | `merata` | Usulan tim: 100 poin tiap aspek dibagi rata ke semua komponennya (lihat Aturan bobot) |
| `BOBOT_SUMBER` | 30/50/20 | Hanya dipakai mode `per-sumber`; tidak ada satu pun angka bobot di dokumen sumber |
| `BOBOT_KOMPONEN_MK` | 30/20/20/30 | Idem |
| `MODE_AGREGASI` | `per-aspek` | Hasilnya berbeda dari `per-semester` karena distribusi 3/4/3 |
| `PENGUNCIAN_ASPEK` | `otomatis` | Belum diputuskan apakah nilai boleh final sebelum semester ditutup |
| `IZINKAN_FINAL_DRAFT` | `true` | Lihat di bawah |

Di luar `config.js`, aturan penguncian angkatan dan perubahan data terkunci juga masih keputusan
sementara tim dan belum dikonfirmasi unit pengelola (lihat Penguncian angkatan dan data terkunci).

### Kenapa `IZINKAN_FINAL_DRAFT` ada

Lima aspek (A.3, A.4, B.1, B.2, C.1) belum punya komponen asesmen resmi, jadi komponennya
berstatus `draft`. Aturan R4 melarang aspek berkomponen draft menjadi `final`, sementara R5
menuntut kesepuluh aspek final untuk menerbitkan sertifikat. Dua aturan itu bersama-sama
membuat **tidak ada mahasiswa yang bisa disertifikasi** selama skema penilaian belum
diresmikan. Saklar ini melonggarkan R4 supaya alur sertifikat tetap bisa diuji; aspek draft
yang di-final tetap diberi penanda “skema belum final” di UI. Setel `false` begitu seluruh
komponen resmi.

## Aturan bobot

Bobot komponen di dalam satu aspek diatur `CONFIG.MODE_BOBOT_KOMPONEN`. Bawaannya `merata`:
**setiap aspek bernilai 100 yang dibagi rata ke seluruh komponennya**, apa pun sumbernya (PDP, MK,
Kemahasiswaan) dan jenisnya. Nilai tiap komponen tetap diisi 0–100; bobot hanya menentukan
porsinya, jadi nilai aspek sama dengan rata-rata komponen yang sudah terisi.

| Aspek | Komponen | Porsi per komponen |
|---|---|---|
| A.1, A.3, A.4, B.1, B.2, C.1 | 5 | 20 |
| A.2 | 7 | 14,29 |
| B.3 | 4 | 25 |
| B.4 | 2 | 50 |
| C.2 | 3 | 33,33 |

Contoh: tugas A.1 bernilai 80 menyumbang 16 dari 20 poin. Aturan ini usulan tim dan belum
dikonfirmasi unit pengelola. Komponen A.3, A.4, B.1, B.2, dan C.1 masih draft, jadi jumlah dan
porsinya bisa berubah.

Mode `per-sumber` adalah aturan sebelumnya dan tetap bisa dipilih:

```
bobot sumber   BOBOT_SUMBER, dinormalisasi ulang ke sumber yang HADIR pada aspek itu
bobot MK       dimodulasi per jenis (TUGAS/SIKAP/UTS/UAS), jenis absen dinormalisasi ulang
di dalam grup  dibagi rata
```

Contoh mode `per-sumber`: B.4 hanya punya komponen MK, jadi MK memikul 100% meski
`BOBOT_SUMBER.MK = 50`. A.1 tidak punya UTS, jadi porsi UTS dibagi ke TUGAS/SIKAP/UAS.

Di kedua mode, bila seluruh komponen yang dibagi (satu aspek pada `merata`, satu grup pada
`per-sumber`) diberi `bobot` eksplisit di `curriculum.js`, angka itu yang dipakai sebagai
perbandingan. Saat ini belum ada komponen yang diberi `bobot` eksplisit.

## Input nilai

Halaman `/admin/nilai` menuntut **semester dipilih lebih dahulu** — selama dropdownnya masih
kosong, area kerja tidak ditampilkan sama sekali. Alasannya bukan kosmetik: tiap aspek CPMK
hanya dinilai pada satu semester, jadi tanpa semester sistem tidak tahu komponen mana yang
boleh diisi.

Setelah semester, sumber, dan angkatan dipilih, tersedia tiga cara kerja:

- **Input manual** — tabel mahasiswa × komponen dengan sel angka 0–100. Sel yang diubah
  ditandai, sel di luar rentang ditolak, sel kosong tetap kosong (tidak pernah jadi nol).
- **Import CSV** — menerima dua bentuk berkas, dan mengenalinya sendiri:
  - *Format baku* (`nim, komponen, nilai`) — divalidasi baris per baris.
  - *Rekap mentah* dari dosen (satu baris per mahasiswa, satu kolom per tugas) — sistem
    mendeteksi kolom NIM dan nama, menebak kolom mana memetakan ke komponen mana,
    mengenali skala tiap kolom (0–4 / 0–10 / 0–100), lalu mengonversi dan mengisinya
    otomatis. Beberapa kolom yang jatuh ke satu komponen digabung (rata-rata, tertinggi,
    atau kolom terakhir).
- **Pengajuan koreksi** — antrean sanggahan mahasiswa dengan aksi setujui/tolak.

Setiap penyimpanan menjadi satu **batch** yang tercatat di audit log dan bisa **di-rollback
utuh**. Batch bertahan setelah halaman dimuat ulang dan ikut tersinkron antar tab — lihat
bagian Penyimpanan perubahan di bawah. Tombol **Hapus semua perubahan** menghapus seluruhnya.

Import menolak: NIM tak dikenal, kode komponen asing, komponen dari sumber atau semester
lain, mahasiswa di luar angkatan sasaran, nilai di luar 0–100, baris duplikat, dan **aspek
yang semesternya belum ditempuh mahasiswa** — penjaga utama R1.

Pemeriksaan yang sama diulang di server saat menyimpan (`src/server/nilai.js`), ditambah dua hal:
semester batch harus 1–3, dan setiap komponen harus milik semester batch itu. Satu baris yang gagal
menolak seluruh batch.

### Pengenalan berkas mentah

`src/lib/ingest.js` menilai kecocokan tiap kolom dengan tiap komponen memakai empat sinyal:
kata kunci jenis (tugas / sikap / UTS / UAS, dengan penalti bila kolom menyebut jenis lain),
kata kunci sumber, irisan kata dengan label komponen, dan kesamaan nomor urut. Skor ≥ 80
ditandai **Yakin**, 55–79 **Perlu dicek**, di bawah itu tidak diusulkan.

Tebakan **tidak pernah langsung dieksekusi**: layar pemetaan menampilkan tiap kolom beserta
contoh isinya, skala, komponen tujuan, dan tingkat keyakinan — semuanya bisa diganti lewat
dropdown, dan pratinjau perhitungan ikut berubah seketika. Baru setelah itu tombol
“Isi otomatis” menuliskannya sebagai satu batch yang tetap bisa di-rollback.

Tersedia tombol **Contoh rekap mentah** yang mengunduh berkas gaya dosen: nama kolom seadanya,
berisi NIM dan nama mahasiswa sungguhan dari basis data, dengan **kolom nilai kosong**. Kolom
nilainya sengaja tidak diisi: angka karangan di berkas itu akan tercatat sebagai nilai asli bila
berkasnya diunggah balik.

### Sasaran dari alamat URL

Lonceng panel Kemahasiswaan menautkan ke `/admin/nilai` lengkap dengan semester, sumber, angkatan,
program studi, aspek, dan kadang NIM, sehingga sekali klik daftar mahasiswa yang perlu dinilai
sudah terbuka. Setiap nilai dari alamat diperiksa dulu: alamat bisa diketik tangan atau sudah
usang, jadi pilihan yang tidak dikenal jatuh ke bawaan, bukan membuat halaman kosong.

## Kapan aspek berubah dari sementara menjadi final

Dua mekanisme berjalan berdampingan; **penandaan manual selalu menang atas mode otomatis**,
dan apa pun pilihannya, aspek yang komponennya belum lengkap tidak pernah bisa final.

`CONFIG.PENGUNCIAN_ASPEK` mengatur perilaku bawaan:

| Mode | Kapan menjadi final |
|---|---|
| `otomatis` (bawaan) | begitu seluruh komponen asesmennya terisi |
| `manual` | hanya bila ditandai Kemahasiswaan, walau sudah lengkap |
| `semester` | bila lengkap **dan** semesternya sudah ditutup |

Kendali manualnya ada di dua tempat:

- **Saat menyimpan nilai** (`/admin/nilai`) — pilihan *Ikuti aturan sistem* / *Tandai final* /
  *Tahan sebagai sementara*, berlaku untuk aspek yang tersentuh penyimpanan itu saja.
- **Per aspek per mahasiswa** (`/admin/mahasiswa/:id`) — panel Status penguncian aspek dengan
  tombol Tandai final, Tahan sementara, dan Ikuti aturan. Tombol Tandai final nonaktif beserta
  alasannya bila komponennya belum lengkap.

Di sisi mahasiswa, badge status selalu disertai **alasan** bila belum final — misalnya
“Baru 2 dari 5 komponen asesmen yang dinilai” atau “Ditahan sebagai sementara oleh …”. Aspek
yang sudah final menampilkan siapa yang mengunci dan kapan.

Tanda final yang dipasang **manual** juga membuat aspek itu terkunci untuk diedit: mengubah
nilainya sesudah itu wajib beralasan (lihat bagian berikut). Setiap perubahan tanda dicatat di
`LogAktivitas` sebagai `UBAH_PENGUNCIAN`; tanda yang tidak berubah tidak dicatat.

## Penguncian angkatan dan data terkunci

Mengunci angkatan menandai bahwa program tiga semesternya sudah selesai, dengan dua akibat:
angkatan memenuhi syarat sertifikat *Angkatan sudah dikunci oleh Kemahasiswaan* (R5), dan setiap
perubahan nilai sesudahnya wajib beralasan dan tercatat. Penguncian **tidak** menutup pintu bagi
Kemahasiswaan untuk memperbaiki atau melengkapi nilai.

Ketiga pintu di bawah hanya untuk Kemahasiswaan (`src/server/angkatan.js`). Daftar angkatan untuk layar
dibaca lewat `GET /api/angkatan`: satu baris per angkatan berisi jumlah mahasiswa, kelengkapan nilai
(hanya aspek yang semesternya sudah tiba; persentasenya tidak pernah 100 selama masih ada komponen
kosong), semester kalender, boleh dikunci atau belum beserta alasannya, serta siapa yang mengunci dan
kapan. Tanda `siapKunciOtomatis` (boleh dikunci **dan** semua nilai lengkap) hanya penanda; belum ada
yang mengunci angkatan secara otomatis.

Menguncinya dua langkah:

1. `POST /api/angkatan/pratinjau` dengan `{ angkatanId }` — ringkasan yang dihitung seolah
   angkatan sudah dikunci: jumlah mahasiswa, berapa yang berhak dan tidak berhak sertifikat, sampai 50 mahasiswa
   yang tidak berhak beserta alasannya, berapa yang terganjal komponen kosong, dan apakah angkatan
   boleh dikunci (beserta alasannya bila belum).
2. `POST /api/angkatan/kunci` dengan `{ angkatanId, konfirmasi }` — `konfirmasi` harus sama
   persis dengan label angkatan, misalnya `2025 Genap`. Status berubah menjadi `TERKUNCI`,
   pengunci dan waktunya disimpan di kolom `dikunciOleh` dan `dikunciPada`, dan tindakannya
   dicatat di `LogAktivitas`. Dua jendela yang mengunci bersamaan tidak saling timpa.

Angkatan boleh dikunci bila semester kalendernya sudah lewat Semester 3 (`semesterKalender` ≥ 4)
dan angkatan itu sudah punya mahasiswa. Nilai yang masih bolong **tidak** menghalangi; jumlahnya
hanya tampil di pratinjau sebagai peringatan.

Halaman `/admin/angkatan` belum dibuat, jadi ketiga pintu ini baru dipakai oleh `npm run test:db`.

### Mengubah data yang terkunci

Satu nilai dianggap **terkunci untuk diedit** bila angkatan mahasiswanya `TERKUNCI` **atau**
aspeknya ditandai final **secara manual** (`cariTerkunci()` di `src/server/nilai.js`). Aspek yang
final secara otomatis tidak dihitung: itu akibat nilainya lengkap, bukan keputusan mengunci.

- **Kemahasiswaan** tetap boleh mengubah atau melengkapi nilai terkunci, termasuk sel yang masih
  bolong sesudah Semester 3, asal menyertakan `alasan` minimal 10 karakter. Aturan ini berlaku
  untuk simpan nilai (`/api/nilai`) dan rollback (`/api/nilai/rollback`), karena membatalkan
  batch juga mengubah nilai.
- **Dosen** tetap boleh mengirim usulan untuk data terkunci; yang memutuskan tetap Kemahasiswaan.
  Menyetujui usulan seperti itu berarti mengubah data terkunci, jadi catatan keputusannya wajib
  minimal 10 karakter dan berfungsi sebagai alasan.
- **Mahasiswa** tetap hanya bisa mengajukan koreksi (R8).

Bila alasannya kurang, server menolak seluruh penyimpanan dan menyebut berapa mahasiswa yang
tersentuh. Perubahan yang tidak menyentuh data terkunci tidak membutuhkan alasan. Aturan di bagian
ini belum dikonfirmasi unit pengelola.

Di layar Input Nilai, kolom **Alasan perubahan** ada di bawah tabel Input manual dan di atas tombol
*Isi otomatis* pada Import CSV, sedangkan kolom **Alasan rollback** ada di atas daftar Riwayat batch.
`simpanBatch()` dan `rollbackBatch()` di `src/lib/store.js` meneruskannya ke server. Kolom itu boleh
dikosongkan; server baru menuntutnya bila penyimpanan atau rollback menyentuh data terkunci.

### Log aktivitas

Perubahan nilai sudah tercatat per sel di `AuditLog`. Tindakan Kemahasiswaan lainnya dicatat di
tabel `LogAktivitas` lewat `catatLog()` (`src/server/log.js`), **di dalam transaksi yang sama**
dengan perubahannya: tidak ada perubahan tanpa jejak, dan tidak ada jejak tanpa perubahan.

| `aksi` | Kapan dicatat | Isi `rincian` |
|---|---|---|
| `KUNCI_ANGKATAN` | angkatan dikunci | ringkasan pratinjau saat dikunci |
| `UBAH_DATA_TERKUNCI` | simpan nilai atau persetujuan usulan menyentuh data terkunci | alasan, jumlah mahasiswa dan nilai |
| `ROLLBACK_DATA_TERKUNCI` | batch yang menyentuh data terkunci dibatalkan | alasan dan jumlah mahasiswa |
| `UBAH_PENGUNCIAN` | tanda final/sementara aspek berubah | jumlah perubahan, berapa yang dicabut dari final, sampai 20 contoh |

Kedua log dibaca lewat `POST /api/log` (`bacaLog()`, hanya Kemahasiswaan), satu halaman setiap kali:

- `jenis`: `'nilai'` (AuditLog) atau `'aktivitas'` (LogAktivitas);
- penyaring, semuanya opsional: `aktorId`, `dari`/`sampai` (tanggal `TTTT-BB-HH` menurut WIB;
  `sampai` dihitung sampai akhir harinya), `nim` untuk jenis nilai, dan `aksi` untuk jenis aktivitas;
- `halaman` dan `ukuran` (bawaan 25 baris, paling banyak 100). Jawabannya menyertakan `total`,
  `jumlahHalaman`, dan daftar pelaku (serta daftar aksi) untuk pilihan penyaring di layar;
- jejak batch yang sudah dibatalkan tetap tampil dengan tanda `dibatalkan`, karena log yang
  menghapus jejaknya sendiri tidak berguna sebagai bukti.

Pintunya memakai POST karena kerangka API (`tangani`) hanya membaca isi permintaan pada POST; log
tidak diubah olehnya. Supaya pengurutan dan penyaringan tetap cepat, `AuditLog` diberi indeks pada
`waktu` dan `aktorId` (migrasi `indeks_audit`). Halaman `/admin/log` yang memakai pintu ini belum
dibuat.

## Penyimpanan perubahan

Di website setiap perubahan disimpan di basis data: satu penyimpanan menjadi satu baris
`Batch`, nilai terbaru di `Nilai`, dan setiap perubahan tercatat di `AuditLog`. ID batch
berbentuk `B-<tanggal dan jam WIB>-<8 karakter acak>`, misalnya `B-202610091030-3F9A1C2B`;
bagian acaknya mencegah ID bertabrakan bila dua penyimpanan terjadi pada menit yang sama.
Rollback menandai batch `DIBATALKAN` lalu memutar ulang tiap sel yang disentuhnya dari riwayat
`AuditLog` — nilai sebelum perubahan pertama, lalu setiap batch yang tidak dibatalkan menurut
urutan waktu — sehingga membatalkan batch lama tidak pernah menghapus nilai dari batch
sesudahnya. Rollback batch yang menyentuh data terkunci wajib beralasan, sama seperti saat
menyimpan. Tombol *Hapus semua perubahan* hanya ada dalam mode lokal; di basis data batch
dibatalkan satu per satu.

Dalam **mode lokal** (skrip uji, tanpa server) perubahan disimpan di peramban, dengan
pembatasan:

- yang disimpan **bukan salinan basis data**, melainkan hanya daftar batch perubahan
  (`{ id, sumber, semester, angkatan, aktor, waktu, status, entri }`) di kunci
  `sk5c.perubahan` (di website kunci ini dan kunci lama `sk5c.nilai` dibuang saat aplikasi
  dimuat);
- saat modul dimuat, batch itu **diputar ulang** di atas data yang sedang termuat di
  `data.js`, sehingga hasilnya selalu sama;
- rollback dan `bersihkanPerubahan()` memutar ulang dari keadaan bawaan, bukan menambal;
- perubahan dari tab lain ikut diserap lewat event `storage`, jadi panel admin dan panel
  mahasiswa yang dibuka berdampingan selalu menampilkan angka yang sama.

Setel `SIMPAN_PERUBAHAN = false` di `src/lib/store.js` untuk kembali ke perilaku murni di
memori.

## Panel mahasiswa: satu fakta, satu tempat

Nilai akhir sempat muncul tiga kali (kartu profil, kartu sapaan, dan StatTile)
dan perjalanan program dua kali. Sekarang masing-masing punya satu rumah:

| Fakta | Tempatnya |
|---|---|
| Siapa saya + nilai akhir ringkas | kartu profil di kolom kiri |
| Nilai akhir beserta penjelasannya | kartu sapaan di Ringkasan |
| Perjalanan tiga semester | kartu Perjalanan program di Ringkasan |
| Status sertifikat | satu baris bertaut di kartu sapaan |

Halaman Ringkasan mahasiswa turun dari 29.802 menjadi 21.186 karakter.

Aturan tampilan dashboard mahasiswa:

- urutannya mengikuti pertanyaan mahasiswa: berapa nilai saya, sudah sejauh mana, aspek mana
  saja beserta statusnya, lalu apa yang masih ditunggu;
- **satu angka besar saja** (nilai akhir); angka lain lebih kecil supaya mata tahu harus mulai
  dari mana;
- nilai akhir selalu disertai status dan dasar hitungnya (R3);
- aspek terkunci tampil dengan gembok dan semester pembukaannya, tidak pernah sebagai 0 (R2);
- grafik di kartu nilai akhir mengikuti data yang ada, lihat *Grafik* di bagian Catatan kode.

Tombol **Ajukan koreksi nilai** yang sebelumnya mati kini membuka formulir
sungguhan: mahasiswa memilih komponen, menuliskan alasan, dan pengajuannya masuk
ke antrean Kemahasiswaan. Ini tetap satu-satunya aksi tulis milik mahasiswa (R8)
— pengajuan tidak mengubah nilai apa pun.

## Rambatan nilai ke dashboard mahasiswa

Nilai disimpan dengan memutakhirkan objek mahasiswa, membuang cache transkrip, lalu memberi
tahu seluruh pelanggan store. Setiap halaman yang membaca nilai memanggil `useStore()`, jadi
begitu Kemahasiswaan menyimpan satu batch, semuanya ikut menghitung ulang:

- nilai komponen dan **nilai aspek**
- **cluster, area, fase**, dan rata-rata per semester
- **nilai akhir** beserta huruf mutu dan basis perhitungannya
- status aspek (`menunggu` → `berjalan` → `final`)
- kelayakan sertifikat dan daftar “yang perlu diperhatikan”
- riwayat perubahan mahasiswa serta audit log admin

Mahasiswa tidak perlu melakukan apa pun; halaman miliknya sudah terisi. Rollback batch
membatalkan seluruh rambatan itu sekaligus.

Untuk memperagakan: masuk sebagai `admin@umn.ac.id`, buka Input Nilai, pilih semester dan
angkatan mahasiswa yang ada di basis data, isi nilainya, lalu simpan. Nilai tercatat di tabel
`Nilai` dan `AuditLog`; masuk sebagai mahasiswa itu di jendela lain (atau muat ulang) dan
angkanya sudah berubah.

Usulan nilai dosen hanya bisa dibuat untuk mahasiswa yang sudah mengumpulkan berkas, dan
belum ada halaman bagi mahasiswa untuk mengumpulkannya. Sampai halaman itu dibuat, baris
`Pengumpulan` diisi langsung di basis data.

## Catatan migrasi dari Vite + react-router

Proyek ini sebelumnya berjalan di Vite dengan `react-router-dom`. Tiga hal yang berubah dan
tidak boleh dikembalikan begitu saja:

- **Sesi dibaca sesudah komponen menempel**, bukan saat render pertama (`src/lib/auth.jsx`).
  Di server `localStorage` tidak ada; membacanya saat render membuat HTML server berbeda
  dengan render pertama di peramban, dan React menolak hidrasinya.
- **Tema ditetapkan skrip kecil di `<head>`** sebelum halaman digambar (`src/lib/theme.jsx`),
  supaya pengguna bertema gelap tidak melihat kedipan putih.
- **Penjaga peran berpindah lewat router di dalam efek**, bukan mengembalikan `<Navigate>`:
  mengubah rute selagi merender ditolak React.

## Catatan kode

Penjelasan yang dulu tersebar sebagai komentar panjang di kode front-end. Komentar di kode kini
pendek dan menunjuk ke sini, misalnya `lihat README.md › Hidrasi`.

### Hidrasi

Next merender halaman di server lebih dulu, lalu peramban menghidrasinya. Apa pun yang hanya ada
di peramban harus menunggu komponen menempel:

- **Sesi** (`src/lib/auth.jsx`) dibaca sesudah menempel. `siap` menandai pembacaan selesai;
  sebelum itu pintu depan (`app/page.jsx`) dan penjaga peran tidak boleh menyimpulkan "belum
  masuk", kalau tidak pengguna yang sudah masuk ikut ditendang ke halaman masuk.
- **Tema** dipasang skrip kecil di `<head>` (`src/lib/theme.jsx`) sebelum halaman digambar,
  jadi `<html>` wajib memakai `suppressHydrationWarning`.
- **Bahasa** selalu mulai dari Indonesia, sama dengan HTML dari server. Pilihan tersimpan baru
  dipasang setelah menempel. Bawaannya Indonesia, bukan bahasa peramban.
- **Tulis setelah baca**: sesi, tema, dan bahasa baru ditulis ke `localStorage` setelah
  pembacaan awal selesai. Tanpa penjagaan itu, render pertama menimpa pilihan yang tersimpan.
- **Jam** di penanda kesegaran data (`StatusData.jsx`) dirender sesudah menempel karena jam
  server dan peramban berbeda.

### Data dan store

- Setiap halaman yang membaca nilai memanggil `useStore()` dan memasukkan `versi` darinya ke
  dependensi `useMemo`, supaya ikut menghitung ulang setiap data berubah.
- Larik di `src/lib/data.js` (master maupun isian) **diisi ulang di tempat, tidak pernah
  diganti**: halaman dan `store.js` memegang rujukannya sejak modul dimuat.
- Data master dipasang `app/penyedia.jsx` sebelum anak pertama dirender, jadi isi awal dari kode
  tidak sempat tampil dan render server sama dengan render peramban. `app/layout.jsx` dirender
  per permintaan; kalau basis data mati, isi awal dari kode yang dipakai supaya situs tetap jalan.
- `PemuatData.jsx` menahan panel sampai `/api/data` selesai, supaya halaman tidak sempat
  menulis "belum ada data" selagi datanya masih di jalan.
- Setiap penulisan dikirim ke API, lalu seluruh data dimuat ulang dari basis data. Pemuatan yang
  sudah didahului pemuatan lebih baru diabaikan. Saat keluar, data dikosongkan supaya akun
  berikutnya tidak melihat sisa akun sebelumnya.
- Status pengumpulan (`masuk`, `menunggu`, `ditolak`, `dinilai`) **dihitung**, tidak disimpan.
  Sebagai kolom tersendiri ia akan jadi sumber kebenaran kedua yang bisa berselisih dengan nilai
  setelah satu rollback saja.
- Mode lokal hanya untuk skrip uji (`scripts/modeLokal.js`); website selalu lewat server.

### Usulan nilai dosen

- Dosen **tidak pernah menulis ke transkrip**. Halaman dosen hanya memanggil `usulkanNilai()`,
  dan nilainya masuk ke antrean usulan.
- Kemahasiswaan memutuskan di `/admin/usulan`. *Disetujui*: nilainya ditulis lewat
  `simpanBatch()`, jalur yang sama dengan input admin, jadi tercatat di audit log dan bisa
  di-rollback. *Ditolak*: tidak ada nilai yang berpindah; usulannya tetap tersimpan beserta
  alasannya.
- Konfirmasinya dua lapis. **Sistem** memeriksa yang bisa diperiksa mesin (NIM terdaftar,
  komponen cocok dengan unit asesmennya, nilai 0 sampai 100, dan R1); **orang** menilai apakah
  angkanya masuk akal. Pemeriksaan sistem memakai `validasiBatchImport()` yang sama dengan
  import, dan dijalankan ulang saat tombol ditekan; yang tampil di halaman hanya salinannya.
  Baris yang gagal tidak ikut ditulis.
- Pelaku nilai tetap dosen pengusul; penyetujunya dicatat terpisah.
- Usulan boleh menyasar data terkunci. Menyetujuinya berarti mengubah data terkunci, jadi catatan
  keputusan wajib minimal 10 karakter dan tindakannya dicatat di `LogAktivitas` (lihat
  Penguncian angkatan dan data terkunci).

### Kamus dan terjemahan

- Kunci kamus adalah **kalimat Indonesia** persis seperti di halaman, bukan kode seperti
  `dashboard.nilaiAkhir`. Kalimat tanpa padanan jatuh kembali ke bahasa Indonesia, tidak pernah
  tampil sebagai kode mentah.
- Kunci dirapikan sebelum dicocokkan (spasi dan baris baru dipadatkan), jadi penataan ulang kode
  tidak memutus terjemahan.
- Urutannya: kamus `teks.js`, lalu penerjemah bawaan peramban, lalu bahasa Indonesia. Penerjemah
  peramban hanya ada di Chromium versi baru dan berjalan di perangkat; ia hanya mengisi kalimat
  yang belum ada di kamus dan tidak pernah menimpanya. Hasil mesin yang kehilangan penanda `{n}`
  dibuang. `dumpOtomatis()` di konsol mencetak hasil mesin untuk ditempel ke `teks.js`.
- Kata yang ejaannya sama di kedua bahasa (Dashboard, Email, Status, Helpdesk, …) tidak
  didaftarkan. Nilai kosong berarti belum diterjemahkan; `npm run bahasa:sync` menulis kunci
  baru dengan nilai kosong.
- Penanda `{dalamKurungKurawal}` wajib ada juga di sisi Inggris. Nama penanda tidak boleh memakai
  tanda hubung: `{ rata-rata: … }` dibaca sebagai pengurangan dan menggagalkan kompilasi.
- Kunci yang dioper sebagai prop (judul dan kepala tabel `ChartFrame`, kepala tabel lembar cetak)
  tidak terdeteksi pemindai `test:bahasa`, jadi dijaga manual di bagian akhir `teks.js`.
- Pilihan dropdown ditampilkan dalam bahasa aktif, tetapi nilai yang dikirim tetap kalimat
  Indonesianya, karena penyaringnya membandingkan dengan data.
- Menu admin memakai kata "Penilaian", bukan "Nilai": kunci `'Nilai'` sudah berarti kepala
  kolom tabel (satu angka), dan satu kunci tidak bisa melayani dua arti.

### Pemilih bahasa

`src/components/TombolBahasa.jsx` bisa diklik, diseret, dan dipakai dengan papan ketik (Tab lalu
panah kiri/kanan). Bagian yang mudah rusak:

- Pemilihan lewat penunjuk diselesaikan di **`pointerup`**, bukan di `onClick` tombolnya.
  Karena `setPointerCapture`, peramban mengirim `click` ke wadah, bukan ke tombol tempat jari
  turun, sehingga `onClick` tombol tidak pernah menyala. Penangkapan penunjuk tetap dipakai
  karena tanpanya seretan berhenti begitu jari keluar dari kendali selebar 74 px.
- `onClick` tombol hanya melayani klik yang bukan dari penunjuk (papan ketik dan `.click()` dari
  kode), dikenali dari `event.detail === 0`.
- Sesudah seretan, peramban ponsel mengirim klik kesesuaian (detail-nya bisa 0) ke tombol tempat
  jari turun. Klik itu diabaikan supaya tidak membalikkan pilihan yang baru diseret.
- Selama diseret, transisi pil dimatikan, dan `touch-none` wajib supaya seretan di ponsel tidak
  ikut menggulir halaman.

### Grafik

- **Kartu nilai akhir mahasiswa**: tren dua garis (nilai semester dan kumulatif) baru tampil bila
  ada minimal dua semester bernilai; selain itu tampil sebaran aspek.
- **Sumbu Y tren boleh dipotong, asal dilabeli**: lebar jendelanya minimal 20 angka
  (`src/lib/kurva.js`) dan angka di ujung sumbu selalu ditulis. Grafik batang selalu mulai dari
  nol.
- **Kurva monoton** (Fritsch-Carlson, `kurva.js`) tidak pernah melampaui titik datanya: nilai 86,
  85, 86 tidak boleh tergambar menyentuh 84. Kurva hanya ditarik melintasi semester yang
  berurutan, dan semester yang belum dibuka tidak digambar (R2).
- SVG tren memakai `preserveAspectRatio="none"`, jadi titiknya ditulis sebagai HTML (`<circle>`
  akan jadi lonjong) dan garisnya memakai `vectorEffect="non-scaling-stroke"` supaya tebalnya
  tidak ikut teregang.
- **Sebaran aspek** memakai titik pada jalur 0 sampai 100 bertanda rata-rata minimal, bukan
  batang: selisih 84 dan 87 pada batang setinggi 40 px hanya satu piksel. Titiknya satu warna,
  karena warna area hanya 2,76:1 dan 2,43:1 di atas jalur (di bawah 3:1).
- **Tooltip** (`src/lib/tunjuk.js`, WCAG 1.4.13) muncul lewat tetikus, fokus papan ketik, atau
  ketukan; tetap ada saat tetikus singgah di atasnya; Escape menyembunyikannya tanpa memindahkan
  fokus. Isinya `aria-hidden` karena sudah dibacakan lewat `aria-label`, dan di layar sentuh ia
  tembus ketukan.
- **Perkembangan per semester** (Ringkasan admin): pilihan "Semester N" berisi mahasiswa yang
  sudah bernilai di Semester 1 sampai N, jadi tiap batang dihitung dari orang yang sama dan
  selisihnya adalah perkembangan. Garis putus-putus hanya untuk rata-rata minimal.
- Setiap grafik punya tampilan tabel lewat `ChartFrame`. Penyebut persentase donat adalah jumlah
  seluruh irisan, lihat *Kenapa donat* di atas.

### Warna dan kontras

- **Status ditulis polos**: kata biasa tanpa warna, ikon, atau pil. Status muncul di hampir setiap
  baris, jadi warna di sana berhenti menandai apa pun. Tingkatannya dibedakan berat huruf (final
  pekat, berjalan lebih ringan), dan teks redupnya memakai `ink-2` (6,89:1), bukan `ink-3`
  (3,22:1).
- **Penanda (Draft)** ditulis merah dalam kurung, bukan pil kuning. `--warning` hanya 1,83:1
  sebagai teks di kartu putih, sedangkan `--critical` 4,80:1 (terang) dan 6,18:1 (gelap). Yang
  jarang boleh berwarna.
- Teks amber memakai `--warning-ink` (5,09:1), bukan `--warning`.
- Lencana lonceng mahasiswa biru, bukan merah: komponen yang belum dinilai bukan galat.
- Warna identitas hanya milik **area** (tiga slot kategorikal di `index.css`); cluster dan aspek
  dikenali lewat kode dan label. `--brand-ink` sengaja jauh lebih gelap dari `--c1` (ΔE 19,5)
  supaya tidak tertukar dengan Area A.
- Teks putih 55% di atas biru tua masih 5,32:1; bilah atas mahasiswa (latar 74%) 7,37:1 pada
  kasus terburuk.

### Gerak

- Isi halaman memudar singkat setiap pindah menu (pembungkusnya diberi `key` per jalur).
  `.animate-halaman` memakai `animation-fill-mode: backwards`, **bukan** `both`: dengan `both`,
  Chrome menahan `transform` sesudah animasi dan setiap elemen `fixed` di halaman ikut mengacu ke
  pembungkus itu, bukan ke layar.
- Sorotan menu sidebar (`src/lib/penandaGeser.js`) diukur sebelum dilukis; penempatan pertama
  dan perubahan ukuran langsung melompat tanpa meluncur.
- Semua gerak dimatikan oleh blok `prefers-reduced-motion` di akhir `index.css`.

### Cetak

- Transkrip mencetak `LembarCetak.jsx`, lembar resmi yang hanya ada di kertas. Tampilan layar,
  grafik, tombol, dan bantuan mengambang tidak ikut tercetak.
- Tabel lebar diberi `print:overflow-visible print:min-w-0`: di kertas tidak ada yang bisa
  digulir, dan A4 potret bermargin 14 mm hanya menyisakan sekitar 688 px. Kerangka mahasiswa
  memakai `print:pl-0` karena sidebar disembunyikan saat mencetak.
- Latar belang tabel memakai `print-color-adjust: exact`; tanpa itu peramban membuang warna latar.
- Alamat kampus di kaki lembar adalah `div` dengan posisi `fixed` (diulang di setiap halaman),
  bukan `<footer>`, karena aturan cetak global menyembunyikan semua `<footer>`.
- Sertifikat dicetak A4 lanskap dan tidak dirender sama sekali selama belum layak, jadi Ctrl+P
  tidak pernah menghasilkan sertifikat.
- Kemahasiswaan bisa mencetak sertifikat atas nama mahasiswa dari halaman detailnya
  (`/admin/mahasiswa/:id`), untuk mahasiswa yang kesulitan mencetak sendiri. Syaratnya sama
  persis dan lembarnya sama (`LembarSertifikat.jsx`). Lembar itu baru dipasang langsung di
  `<body>` saat tombol ditekan dan dilepas lagi pada `afterprint`. Selama terpasang, aturan
  cetak di `index.css` menyembunyikan seluruh aplikasi, sehingga transkrip dan baris periode
  admin tidak ikut tercetak. Ctrl+P biasa di halaman itu tetap mencetak transkrip.
- Nilai yang belum ada ditulis "...", bukan 0 (R2).

### Halaman profil

- Satu halaman untuk tiga peran. **Kolom abu** milik institusi (nama, NIM, email, program studi,
  angkatan) dan tidak bisa disunting: kalau bisa, mahasiswa dapat menampilkan NIM orang lain di
  transkripnya. **Kolom putih** milik pengguna (telepon, ponsel, alamat, foto) dan tidak
  memengaruhi nilai apa pun.
- Kunci akun: NIM untuk mahasiswa dan NIP untuk dosen, bukan email. Kunci selalu disusun lewat
  `kunciSesi()`; kalau tiap tempat menghitung sendiri, avatar dan halaman profil bisa memakai
  kunci berbeda untuk orang yang sama.
- Foto disimpan 256 px, ditambah gambar asal yang diperkecil supaya bisa disunting ulang tanpa
  pecah. Berkas sumber dibatasi 5 MB.
- Isian diperiksa ulang di server (`src/server/profil.js`): telepon dan ponsel 6–25 karakter
  berisi angka, spasi, atau `+ ( ) - .`; alamat paling panjang 500 karakter (kolom
  `VARCHAR(500)`); foto harus berupa gambar.

## Status pengerjaan

| Fase | Isi | Status |
|---|---|---|
| 1 | Fondasi domain: config, curriculum, scoring, rules, mockData | selesai, terverifikasi |
| 2 | Pembersihan model poin, rute & menu baru | selesai |
| 3 | Transkrip mahasiswa dengan drill-down & gating | selesai |
| 4 | Peta Perjalanan, Riwayat | selesai |
| 5 | Sertifikat | selesai: halaman mahasiswa dan cetak dari panel Kemahasiswaan |
| 6 | Admin: panel input nilai | selesai (lihat fase 7) |
| 7 | Input & Import Nilai: gerbang semester, input manual, import CSV, rollback, koreksi | selesai |
| 8 | Kurikulum, Angkatan & Sertifikat, Log | sebagian: back-end ringkasan dan kunci angkatan, aturan data terkunci, pencatatan dan pembacaan log, serta kurikulum yang dibaca dari basis data sudah ada; ketiga halamannya masih "Segera Hadir" |
| 9 | Poles cetak, responsif, aksesibilitas | sebagian (cetak & reduced-motion sudah) |
| — | Panel Kemahasiswaan lainnya: Overview, Data Mahasiswa beserta detailnya, Program Studi, Persetujuan Nilai Dosen | selesai |
| — | Panel dosen: Data Masuk, Input & Import Nilai sebagai usulan, Status Usulan | selesai |
| — | Basis data MySQL: 19 tabel, 7 migrasi, 16 pintu API, sesi cookie | selesai |

Yang belum dikerjakan:

- tampilan halaman `/admin/angkatan`, `/admin/kurikulum`, dan `/admin/log` (kini masih "Segera
  Hadir"). Pintu API untuk Angkatan dan Log sudah ada; untuk mengubah kurikulum dan pengaturan
  belum (kurikulum baru bisa dibaca dari basis data);
- halaman bagi mahasiswa untuk mengumpulkan berkas (kini baris `Pengumpulan` diisi langsung di
  basis data);
- penerbitan sertifikat yang membekukan nomor, tanggal, dan nilai — kini kelayakan dihitung
  langsung, jadi sertifikat ikut berubah bila nilai diubah sesudah angkatan dikunci;
- ganti dan lupa kata sandi di aplikasi ini, masuk lewat SSO kampus, serta pembatasan percobaan
  masuk;
- kelola data master (angkatan, fakultas, prodi) dan akun dari panel Kemahasiswaan.
