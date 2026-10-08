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
npm run db:seed          # data master (hanya bila tabelnya kosong) + akun awal; aman diulang
npm run db:seed:contoh   # opsional: 290 mahasiswa contoh — MENGHAPUS seluruh isi basis data

npm run dev       # http://localhost:3000
npm run build     # next build
npm start         # melayani hasil build

npm run verify      # cetak seluruh angka scoring untuk enam persona
npm run smoke       # render tiap rute di DOM sungguhan, tanpa data lalu dengan data contoh
npm run assert      # periksa transkrip mematuhi R2, R3, R4, R8
npm run test:nilai  # simpan batch, rollback, dan validasi import
npm run test:profil # penyimpanan profil: kunci akun, simpan-muat, foto
npm run test:db     # setiap pintu API terhadap MySQL; data uji (NIM berawalan UJI) dihapus lagi
```

Uji selain `test:db` berjalan tanpa server dan tanpa basis data (mode lokal, lihat
`src/lib/modeData.js`): sesi dan perubahan hidup di memori, dan halaman diisi data contoh.

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
- **Data isian** (mahasiswa, nilai, penguncian, pengumpulan, usulan, koreksi, riwayat batch,
  profil): `components/PemuatData.jsx` memanggil `/api/data` begitu ada yang masuk, lalu
  `isiData()`. Isinya disaring per peran di `src/server/muat.js`: admin melihat semuanya, dosen
  hanya kelasnya, mahasiswa hanya dirinya.
- **Penulisan**: fungsi di `src/lib/store.js` (simpan nilai, rollback, penguncian, koreksi,
  usulan) dan `simpanProfil` mengirim ke API, lalu data dimuat ulang dari basis data. Aturan
  penilaian (R1, kunci final, wewenang tiap peran) diperiksa ulang di server.

Kurikulum (aspek dan komponen) dan periode aktif masih dibaca dari kode. Data contoh ada di
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

## Empat keadaan sebuah aspek

Membedakan keempatnya adalah aturan bisnis, bukan urusan tampilan.

| Status | Arti | Tampilan |
|---|---|---|
| `terkunci` | Semesternya belum tiba | Ikon gembok + “Dibuka pada Semester N”. **Tanpa angka, bar, `0`, atau `—`** |
| `menunggu` | Semester berjalan, nilai belum masuk | “Belum masuk dari penilai” |
| `berjalan` | Sebagian komponen terisi, atau lengkap tapi semester belum ditutup | Nilai tampil, berlabel **sementara** |
| `final` | Lengkap dan sudah dikunci (lihat di bawah) | Nilai tetap |

Komponen yang belum terisi **dikeluarkan dari pembagi**, tidak pernah dianggap nol.

## Peta berkas

```
src/lib/
  config.js       CONFIG — satu-satunya tempat angka kebijakan; ada pub/sub agar
                  perubahan menyebar ke seluruh perhitungan tanpa reload
  curriculum.js   struktur statis: fase, area, cluster, 10 aspek, komponen, indikator
  scoring.js      seluruh rumus: bobot, nilai aspek/cluster/area/fase, nilai akhir, rubrik
  rules.js        R1–R9 sebagai fungsi murni + validasi import
  data.js         sumber data halaman: periode akademik; angkatan, fakultas, prodi (diisi dari
                  basis data lewat isiMaster); data isian (mahasiswa, nilai, pengumpulan,
                  usulan) yang dimulai kosong
  store.js        penulisan: kirim ke API lalu muat ulang dari basis data (mode lokal untuk uji:
                  diputar ulang di memori)
  kirim.js        satu pintu fetch ke API; jawaban 401 mengakhiri sesi
  modeData.js     website = server; skrip uji menyalakan mode lokal
  profil.js       telepon, alamat, foto milik pengguna — tabel Profil lewat /api/profil
  csv.js          urai/susun CSV dan pemicu unduhan, tanpa pustaka tambahan
  values5c.js     5C sebagai materi Mentoring — tidak dipakai untuk menghitung apa pun
  auth.jsx        masuk lewat /api/masuk, sesi dari cookie lewat /api/sesi, penjaga rute per peran
  theme.jsx       mode terang/gelap

src/server/       hanya berjalan di server, tidak pernah dikirim ke peramban
  db.js           satu PrismaClient untuk seluruh aplikasi
  sesi.js         cookie sesi bertanda tangan (jose, AUTH_SECRET)
  api.js          kerangka pintu API: baca pemilik cookie dari basis data, periksa peran, galat
  masuk.js        pemeriksaan email + kata sandi (bcrypt) terhadap tabel Pengguna
  master.js       angkatan, fakultas, prodi dari basis data — dibaca app/layout.jsx
  muat.js         data halaman per peran (GET /api/data)
  nilai.js        simpan batch, rollback (diputar ulang dari AuditLog), penguncian aspek
  pengajuan.js    koreksi mahasiswa dan usulan dosen, beserta keputusannya
  profil.js       isian profil milik pemilik sesi

app/api/          masuk, keluar, sesi, data, nilai, nilai/rollback, penguncian, koreksi,
                  koreksi/keputusan, usulan, usulan/keputusan, profil
src/components/PemuatData.jsx  memuat /api/data begitu ada yang masuk dan menahan panel
                  sampai datanya tiba
prisma/           skema, migrasi, seed.js (isi dasar), seed-contoh.js (data contoh)
scripts/          skrip uji; dataContoh.js berisi data contoh (290 mahasiswa, 5 dosen,
                  audit log) yang dimuat uji lewat isiData() — website tidak memakainya

src/components/   Ui, Icons, Navbar, SideMenu, Footer, FilterBar, ErrorBoundary
src/components/charts/  ChartFrame, RadarCluster (6 sumbu), AspectBars (10 aspek)
src/pages/student/  StudentLayout, Dashboard, Transkrip, Peta, Riwayat, Sertifikat
src/pages/admin/    AdminLayout, Overview, Students, StudentDetail, Programs,
                    Nilai, Kurikulum, Angkatan, Log
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
skrip uji: `DEMO-LAYAK` (berhak), `DEMO-KOSONG` (satu komponen kosong), `DEMO-RENDAH` (nilai 64).

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

## Yang masih menunggu keputusan unit pengelola

Semuanya ada di `src/lib/config.js` bertanda `// MENUNGGU KONFIRMASI`:

| Kunci | Default | Kenapa belum pasti |
|---|---|---|
| `ASPEK_A3_SEMESTER` | `1` | Sheet GENERAL menaruh A.3 di semester 1, sheet DETAIL KOMPONEN di blok PDP-2 |
| `ASPEK_C1_SEMESTER` | `2` | Excel menaruh C.1 di semester 2, peta jalan visual menyatukannya dengan C.2 |
| `BOBOT_SUMBER` | 30/50/20 | Tidak ada satu pun angka bobot di dokumen sumber |
| `BOBOT_KOMPONEN_MK` | 30/20/20/30 | Idem |
| `MODE_AGREGASI` | `per-aspek` | Hasilnya berbeda dari `per-semester` karena distribusi 3/4/3 |
| `PENGUNCIAN_ASPEK` | `otomatis` | Belum diputuskan apakah nilai boleh final sebelum semester ditutup |
| `IZINKAN_FINAL_DRAFT` | `true` | Lihat di bawah |

### Kenapa `IZINKAN_FINAL_DRAFT` ada

Lima aspek (A.3, A.4, B.1, B.2, C.1) belum punya komponen asesmen resmi, jadi komponennya
berstatus `draft`. Aturan R4 melarang aspek berkomponen draft menjadi `final`, sementara R5
menuntut kesepuluh aspek final untuk menerbitkan sertifikat. Dua aturan itu bersama-sama
membuat **tidak ada mahasiswa yang bisa disertifikasi** selama skema penilaian belum
diresmikan. Saklar ini melonggarkan R4 supaya alur sertifikat tetap bisa diuji; aspek draft
yang di-final tetap diberi penanda “skema belum final” di UI. Setel `false` begitu seluruh
komponen resmi.

## Aturan bobot

```
bobot sumber   dinormalisasi ulang ke sumber yang HADIR pada aspek itu
bobot MK       dimodulasi per jenis (TUGAS/SIKAP/UTS/UAS), jenis absen dinormalisasi ulang
di dalam grup  dibagi rata, kecuali seluruh komponen punya `bobot` eksplisit
```

Contoh: B.4 hanya punya komponen MK, jadi MK memikul 100% meski `BOBOT_SUMBER.MK = 50`.
A.1 tidak punya UTS, jadi porsi UTS dibagi ke TUGAS/SIKAP/UAS.

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

### Pengenalan berkas mentah

`src/lib/ingest.js` menilai kecocokan tiap kolom dengan tiap komponen memakai empat sinyal:
kata kunci jenis (tugas / sikap / UTS / UAS, dengan penalti bila kolom menyebut jenis lain),
kata kunci sumber, irisan kata dengan label komponen, dan kesamaan nomor urut. Skor ≥ 80
ditandai **Yakin**, 55–79 **Perlu dicek**, di bawah itu tidak diusulkan.

Tebakan **tidak pernah langsung dieksekusi**: layar pemetaan menampilkan tiap kolom beserta
contoh isinya, skala, komponen tujuan, dan tingkat keyakinan — semuanya bisa diganti lewat
dropdown, dan pratinjau perhitungan ikut berubah seketika. Baru setelah itu tombol
“Isi otomatis” menuliskannya sebagai satu batch yang tetap bisa di-rollback.

Tersedia tombol **Contoh rekap mentah** yang mengunduh berkas gaya dosen (nama kolom
seadanya, skala 0–10) untuk mencoba alurnya tanpa menyiapkan data sendiri.

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

## Penyimpanan perubahan

Di website setiap perubahan disimpan di basis data: satu penyimpanan menjadi satu baris
`Batch`, nilai terbaru di `Nilai`, dan setiap perubahan tercatat di `AuditLog`. Rollback
menandai batch `DIBATALKAN` lalu memutar ulang tiap sel yang disentuhnya dari riwayat
`AuditLog` — nilai sebelum perubahan pertama, lalu setiap batch yang tidak dibatalkan menurut
urutan waktu — sehingga membatalkan batch lama tidak pernah menghapus nilai dari batch
sesudahnya. Tombol *Hapus semua perubahan* hanya ada dalam mode lokal; di basis data batch
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

## Status pengerjaan

| Fase | Isi | Status |
|---|---|---|
| 1 | Fondasi domain: config, curriculum, scoring, rules, mockData | selesai, terverifikasi |
| 2 | Pembersihan model poin, rute & menu baru | selesai |
| 3 | Transkrip mahasiswa dengan drill-down & gating | selesai |
| 4 | Peta Perjalanan, Riwayat | belum |
| 5 | Sertifikat | belum |
| 6 | Admin: panel input nilai | belum |
| 7 | Input & Import Nilai: gerbang semester, input manual, import CSV, rollback, koreksi | selesai |
| 8 | Kurikulum, Angkatan & Sertifikat, Log | belum |
| 9 | Poles cetak, responsif, aksesibilitas | sebagian (cetak & reduced-motion sudah) |
| — | Basis data MySQL | belum |
