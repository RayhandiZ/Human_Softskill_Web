# Dashboard Monitoring VIBE

Purwarupa pemantauan **capaian pembelajaran (CPMK) softskill terintegrasi** di UMN, dengan nama
**VIBE** (Values, Intelligence, Behavior & Excellence).

Nilai **tidak** diajukan mahasiswa. Seluruhnya masuk dari tiga program asesmen kurikuler yang
berjalan paralel pada Semester 1–3: **PDP**, **Mata Kuliah Humaniora/Kebangsaan**, dan
**Kemahasiswaan (Student Service)**.

Nama VIBE menggantikan Human Skill (dan Softskill 5C sebelumnya) di seluruh tampilan, kecuali kutipan
motivasi halaman masuk yang sengaja tetap "human skill". Kata "softskill" di tampilan untuk sementara
ditulis "skill" (catatan transkrip sementara dan isi pesan WhatsApp). **5C bukan sumbu
penilaian**: ia materi Mentoring 5C di semester 1 yang menyumbang komponen asesmen ke aspek
A.1 sampai A.3. Sumbu penilaian adalah 10 aspek CPMK.

Pembagian sumber penilaian:

| Semester | PDP | MK Humaniora |
|---|---|---|
| 1 | PDP-1: Character & Mentoring 5C | Religiositas |
| 2 | PDP-2: Teamwork & Leadership | Pancasila |
| 3 | PDP-3: Effective Communication | Civics |

- Komponen **Mentoring 5C** (kehadiran, refleksi pribadi, partisipasi) dan **penilaian fasilitator
  Teamwork & Leadership** termasuk nilai **PDP**. ID komponennya tetap memakai `-ENG-`
  (misalnya `A1-ENG-HADIR`, `A4-ENG-FASILITATOR`) karena nilai dan riwayat merujuk ke ID itu.
- **Nilai sikap** termasuk **MK Humaniora** (komponen ber-`jenis` SIKAP).
- **Kemahasiswaan** tidak lagi punya komponen nilai. Sumbernya masih ada di kode dan basis data,
  tetapi disembunyikan di tempat yang mendaftar sumber: jalur Peta Perjalanan dan pilihan sumber
  di Input Nilai. Bobotnya di `CONFIG.BOBOT_SUMBER` tidak berpengaruh selama tidak ada komponennya.

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
npm run test:db     # setiap pintu API terhadap MySQL, termasuk kunci angkatan, data terkunci, log, kurikulum, bobot, periode,
                    # akses, tambah akun, hapus akun, izin dan data master, serta aspek CPMK; data uji (NIM dan angkatan berawalan UJI,
                    # akun uji.hapus.* dan uji.master.*, Fakultas/Prodi Uji) dihapus lagi dan izin admin uji dikembalikan
```

Uji selain `test:db` berjalan tanpa server dan tanpa basis data (mode lokal, lihat
`src/lib/modeData.js`): sesi dan perubahan hidup di memori, dan halaman diisi data contoh.

`test:db` masuk memakai akun admin dan dosen dari `npm run db:seed`, jadi jalankan seed lebih dulu
bila basis data baru dikosongkan. Bila akun admin di basis datamu sudah diganti (misalnya
`admin1@umn.ac.id`), sebutkan lewat `UJI_ADMIN_EMAIL=admin1@umn.ac.id npm run test:db`; sandinya tetap
`umn12345`. `smoke` dan `assert` memakai jsdom 29, yang butuh Node
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

Struktur kurikulum (fase, area, cluster, 10 aspek) masih dibaca dari kode; periode aktif dibaca dari basis
data (lihat Periode akademik). Data contoh ada di
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
hanya bila basis data belum di-seed atau tidak bisa dibaca. Dari halaman Kurikulum CPMK,
Kemahasiswaan kini bisa mengubah bobotnya sendiri (lihat Mengubah bobot dari halaman Kurikulum), dan
dari Input Manual teks aspek, komponen asesmen, serta bobotnya (lihat Mengubah penilaian dari Input
Manual). Teks dan struktur aspek yang diubah, serta aspek yang ditambah atau diarsipkan, disimpan di
tabel `Aspek` (lihat Mengelola aspek CPMK); aspek yang belum pernah diubah tetap memakai isi
`curriculum.js`. Indikator dan pengaturan lain belum bisa diubah dari layar.

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
  bobot.js        susunan bobot yang diubah dari halaman Kurikulum: pemeriksaan, pratinjau
                  dampak (dampakDari, juga dipakai penilaian.js), porsi per komponen
  penilaian.js    penilaian satu aspek yang diubah dari Input Manual: pemeriksaan, perbedaan,
                  denganAspek() untuk pratinjau; dipakai layar dan server
  aspek.js        aspek CPMK itu sendiri: pemeriksaan tambah/ubah/arsip/pulihkan, ID dan kode baru,
                  dampakAspek() untuk pratinjau; dipakai layar dan server (lihat Mengelola aspek CPMK)
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
  aksesibilitas.js setelan menu aksesibilitas semua panel, useAksesibilitas() (lihat Menu aksesibilitas)
  bahasa.jsx      pilihan bahasa dan useTeks()
  teks.js         kamus Indonesia → Inggris — lihat Kamus dan terjemahan
  terjemahOtomatis.js  penerjemah bawaan peramban untuk kalimat yang belum ada di kamus
  nav.jsx         TautanNav, padanan <NavLink> untuk Next
  kurva.js        kurva monoton untuk grafik tren — lihat Grafik
  tunjuk.js       tooltip (WCAG 1.4.13)
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
  kurikulum.js    kurikulum dan timpaan CONFIG dari basis data; siapkanKurikulum() untuk pintu API;
                  ambilPeriode() dan siapkanPeriode() untuk periode akademik
  bobot.js        menyimpan bobot dari halaman Kurikulum (POST /api/kurikulum/bobot)
  persetujuan.js  permintaan admin kepada super admin: gerbang denganPersetujuan(), keputusan,
                  penarikan (lihat Persetujuan super admin)
  penilaian.js    menyimpan penilaian satu aspek (POST /api/kurikulum/penilaian)
  aspek.js        tambah, ubah struktur, arsipkan, pulihkan aspek CPMK (POST /api/kurikulum/aspek)
  periode.js      memindahkan periode akademik, hanya super admin (POST /api/periode)
  akses.js        daftar akun, cabut/pulihkan akses, tambah akun, hapus akun, dan izin kelola data
                  master, hanya super admin (POST /api/akses, /api/akses/ubah, /api/akses/tambah,
                  /api/akses/hapus, /api/akses/izin)
  dataMaster.js   tambah/ubah angkatan, fakultas, prodi, dan mahasiswa oleh super admin atau admin
                  berizin (POST /api/master/angkatan, /api/master/prodi, /api/master/mahasiswa)

app/api/          masuk, keluar, sesi, data, nilai, nilai/rollback, penguncian, koreksi,
                  koreksi/keputusan, usulan, usulan/keputusan, profil, angkatan,
                  angkatan/pratinjau, angkatan/kunci, log, kurikulum/bobot, kurikulum/penilaian,
                  persetujuan/keputusan, persetujuan/batal, periode, akses, akses/ubah,
                  akses/tambah, akses/hapus, akses/izin, master/angkatan, master/prodi,
                  master/mahasiswa, kurikulum/aspek (30 pintu)
src/components/PemuatData.jsx  memuat /api/data begitu ada yang masuk dan menahan panel
                  sampai datanya tiba
prisma/           skema, migrasi, seed.js (isi dasar), seed-contoh.js (data contoh),
                  tanam-kurikulum.js (kurikulum bawaan, dipakai kedua seed dan simpanan bobot
                  pertama)
scripts/          skrip uji; dataContoh.js berisi data contoh (290 mahasiswa, 5 dosen,
                  audit log) yang dimuat uji lewat isiData() — website tidak memakainya

src/components/   Ui (termasuk pola halaman Kemahasiswaan: JudulHalaman, KartuAngka, TabSaring,
                  Paginasi, GulirTabel, JUDUL_KOLOM), Icons, Navbar, Laci, MenuAkun, Footer, FilterBar, ErrorBoundary,
                  TombolBahasa, PilihanMengambang, PenyuntingFoto, LihatFoto, LayananTambahan,
                  LogoPdp, Lipat, MenuSamping (menu samping mahasiswa, dosen, Kemahasiswaan, dan
                  super admin), BilahBawah (menu bawah HP panel dosen), MenuAksesibilitas (semua panel),
                  TombolTema, CariCepat
                  (pencarian cepat Ctrl+K panel Kemahasiswaan)
src/components/charts/  ChartFrame, RadarCluster (6 sumbu), AspectBars (10 aspek), MutuDonut,
                  PerkembanganAngkatan
src/halaman/      Login, Profil (satu halaman profil untuk tiga peran)
src/halaman/student/  StudentLayout, Dashboard, Transkrip, Peta, Riwayat, Sertifikat,
                    LembarCetak, LembarSertifikat, LoncengBelumDinilai
src/halaman/dosen/    DosenLayout, Masuk (Beranda), Nilai (Penilaian tiga langkah), Usulan (Riwayat Pengiriman),
                    status (lihat Panel Dosen)
src/halaman/admin/    AdminLayout, Overview, Students, StudentDetail, Programs, Nilai, Usulan,
                    LoncengKemahasiswaan, StatusData, Kurikulum (bobot), Angkatan, CetakSertifikat,
                    PersetujuanAdmin, PermintaanTerkirim (bagian layar bersama),
                    EditorPenilaian (di Input Manual), Log (juga dipakai panel super admin),
                    DataMaster (lihat Data master), KelolaAspek (lihat Mengelola aspek CPMK)
src/halaman/super-admin/  SuperLayout, Kendali, Wewenang, Aturan, Akses (lihat Panel Super Admin)
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
| Super Admin | `super.admin@umn.ac.id` | `umn12345` |

### Super admin

Super admin adalah **wewenang tertinggi**: akun berperan `SUPER_ADMIN`. Server membacanya sebagai
admin bertanda `superAdmin`, jadi seluruh panel dan pintu API admin terbuka untuknya tanpa diubah
satu per satu. Rantai pengawasannya: super admin → admin, dosen,
mahasiswa; admin → dosen, mahasiswa; dosen → mahasiswa. Rancangan lengkapnya (persetujuan
tindakan admin, halaman pengawasan) dikerjakan bertahap; Tahap 1 berisi fondasinya:

- **Basis data**: nilai `SUPER_ADMIN` pada enum `Peran` (migrasi `peran_super_admin`, yang
  menggantikan kolom `Pengguna.superAdmin` dari migrasi `super_admin`) dan tabel
  `PermintaanAdmin` (antrean permintaan admin kepada super admin, dipakai tahap berikutnya).
- **Peran hanya dari basis data**: diisi lewat seed atau langsung di tabel; tidak ada tombol di
  website untuk mengangkat diri sendiri.
- **Server**: `penggunaDari()` (`api.js`) dan `susunAkun()` (`masuk.js`) menerjemahkan
  `SUPER_ADMIN` menjadi `peran: 'admin'` dan `superAdmin: true`. Bandingkan dengan nilai basis
  data (`akun.peran`), bukan `peran` yang sudah diterjemahkan menjadi `'admin'`. `tangani()` menerima
  syarat `'superadmin'` untuk pintu yang hanya boleh dibuka super admin (`['admin']` tetap
  meloloskan super admin). Jejak tindakannya tertulis "Super Admin", bukan "Biro Kemahasiswaan".
- **Layar**: menu akun dan halaman profil menulis peran "Super Admin".

Setelah menarik migrasi ini, hentikan `npm run dev`, jalankan `npx prisma migrate dev` (menerapkan
migrasi dan membuat ulang Prisma Client), lalu nyalakan lagi; server yang sudah jalan belum
mengenal peran `SUPER_ADMIN`.

### Persetujuan super admin (mahasiswa yang sudah lewat Semester 3)

Begitu program sebuah angkatan lewat Semester 3 (`programSelesai()` di `src/lib/data.js`:
`semesterKalender > TOTAL_SEMESTER_PROGRAM`), mahasiswanya **diurus Kemahasiswaan, bukan dosen**:

- **Dosen lepas tangan.** Mahasiswa itu tidak lagi termuat di data dosen (`muatData()`), begitu
  pula pengumpulannya, dan usulan nilai untuknya ditolak server (`usulkanNilai()`). Pengajuan
  koreksi dari mahasiswa itu tetap masuk ke Kemahasiswaan seperti biasa.
- **Admin biasa meminta, super admin menyetujui.** Tindakan admin biasa yang mengubah data
  mahasiswa itu tidak langsung disimpan, tetapi menjadi `PermintaanAdmin` berstatus `MENUNGGU`;
  datanya belum berubah sampai super admin menyetujuinya. Super admin sendiri tidak pernah tertahan.

| Tindakan (`aksi`) | Pintu API | Ditahan bila |
|---|---|---|
| `SIMPAN_NILAI` | `/api/nilai` | ada baris untuk mahasiswa yang sudah lewat Semester 3 |
| `ROLLBACK_NILAI` | `/api/nilai/rollback` | batch-nya menyentuh mahasiswa itu |
| `UBAH_PENGUNCIAN` | `/api/penguncian` | tanda final/sementara mahasiswa itu **sungguh berubah** (Input Nilai memanggil pintu ini setelah setiap simpan; yang tidak berubah tidak diantre) |
| `PUTUSKAN_USULAN` | `/api/usulan/keputusan` | menyetujui usulan untuk mahasiswa itu (menolak tidak ditahan) |
| `KUNCI_ANGKATAN` | `/api/angkatan/kunci` | selalu, karena angkatan baru boleh dikunci sesudah Semester 3 |
| `UBAH_BOBOT` | `/api/kurikulum/bobot` | nilai mahasiswa itu ikut berubah menurut pratinjau dampak |
| `UBAH_PENILAIAN` | `/api/kurikulum/penilaian` | **selalu** untuk admin biasa, apa pun mahasiswanya (lihat Mengubah penilaian dari Input Manual) |
| `KELOLA_ASPEK` | `/api/kurikulum/aspek` | **selalu** untuk admin biasa: tambah, ubah struktur, arsipkan, atau pulihkan aspek (lihat Mengelola aspek CPMK) |

Gerbangnya `denganPersetujuan(aksi)` di `src/server/persetujuan.js`, dipasang di pintu API
(`tangani(request, ['admin'], denganPersetujuan('SIMPAN_NILAI'))`), jadi tidak bisa dilewati dengan
memanggil API langsung. Alurnya:

1. **Mengajukan.** Isi yang pasti gagal (baris nilai tidak sah, konfirmasi kunci salah, versi
   kurikulum basi) ditolak saat itu juga. Alasan minimal 10 karakter wajib. Yang lolos disimpan
   apa adanya di `PermintaanAdmin.isi`, beserta `ringkasan` untuk dibaca super admin (nilai lama →
   baru, dampak, mahasiswa yang tersentuh). Jawabannya `{ menunggu: true, permintaan }`.
2. **Memutuskan** (`POST /api/persetujuan/keputusan`, hanya super admin). *Disetujui*: tindakan
   aslinya dijalankan dengan isi tersimpan **atas nama admin pengaju**, dan semua aturannya
   diperiksa ulang (data terkunci, versi, validasi). Bila datanya sudah berubah sehingga tidak bisa
   dijalankan (batch sudah dibatalkan, usulan sudah diputuskan), statusnya `GAGAL` beserta
   pesannya. *Ditolak*: catatan wajib, tidak ada yang berubah.
3. **Menarik** (`POST /api/persetujuan/batal`): admin pengaju menarik permintaannya selama masih
   menunggu (status `DIBATALKAN`).

Halaman `/admin/persetujuan`: super admin melihat semua permintaan (menu **Persetujuan Admin**,
juga di bilah atas, dengan lencana jumlah yang menunggu) beserta tombol Setujui/Tolak; admin biasa
melihat miliknya (menu **Permintaan Saya**). Di Input Nilai, Detail Mahasiswa, Persetujuan Nilai
Dosen, Angkatan, dan Kurikulum, admin biasa diberi tahu sebelum menyimpan bahwa angkatannya sudah
lewat Semester 3, dan sesudahnya melihat "Permintaan P-.. dikirim ke Super Admin". Pelaku
ditulis dengan email, karena semua akun admin bernama "Biro Kemahasiswaan".

Setelah masuk, server memasang cookie httpOnly bertanda tangan (berlaku 8 jam, diperpanjang
setiap halaman dimuat). Setiap pintu API membaca ulang pemilik cookie dari basis data, jadi akun
yang dinonaktifkan atau berganti peran langsung berlaku. Perubahan nama, prodi, atau angkatan di
basis data terlihat setelah halaman dimuat ulang — tidak perlu masuk ulang.

Kasus sertifikat ada di data contoh angkatan 2024 yang sudah dikunci, dan kini hanya dipakai
skrip uji: `DEMO-LAYAK` (berhak), `DEMO-KOSONG` (satu komponen kosong), `DEMO-RENDAH` (nilai 63).

### Panel Super Admin

Super admin punya panel sendiri di `/super` (front-end saja, memakai pintu API yang sudah ada).
Setelah masuk ia diarahkan ke sana (`panelPengguna()` di `src/lib/auth.jsx`); panel Kemahasiswaan
tetap terbuka untuknya lewat tautan "Panel Kemahasiswaan" di kaki menu samping, dan dari panel
Kemahasiswaan ada tautan balik "Super Admin". `RequireRole role="admin" superAdmin` mengembalikan
admin biasa ke `/admin`; itu hanya penjaga tampilan, pintu API tetap memeriksa ulang di server.

| Halaman | Isi | Sumber data |
|---|---|---|
| `/super` Pusat Kendali | pemilih periode di pojok kanan atas; kartu keputusan (jumlah yang menunggu saat ini, tiga yang terlama, tombol ke antrean), keadaan sistem (keputusan di periode terpilih, angkatan terkunci, aturan menunggu konfirmasi), grafik perubahan nilai per bulan dalam periode itu beserta tabelnya, enam tindakan admin terbaru di periode itu sebagai linimasa, rantai pengawasan | `PERMINTAAN`, `AUDIT_LOG`, `COHORTS`, `MENUNGGU_KONFIRMASI`, `/api/log` |
| `/super/persetujuan` | antrean Setujui/Tolak (halaman `PersetujuanAdmin` yang sama) | `PERMINTAAN`, `/api/persetujuan/keputusan` |
| `/super/penilaian` | Penilaian & Bobot: tab *Aspek & komponen* (editor Input Manual, `EditorPenilaian`) dan tab *Bobot* (halaman `Kurikulum` tanpa judulnya); simpanan super admin langsung berlaku | `/api/kurikulum/penilaian`, `/api/kurikulum/bobot` |
| `/super/akses` | Akses Pengguna: mencabut dan memulihkan akses mahasiswa, dosen, dan admin, menambah akun, dan menghapus akun yang aksesnya sudah dicabut (lihat di bawah) | `/api/akses`, `/api/akses/ubah`, `/api/akses/tambah`, `/api/akses/hapus` |
| `/super/log` | Log Aktivitas (lihat di bawah) | `/api/log` |
| `/super/wewenang` | kartu tiap peran beserta jumlah tindakan yang boleh dilakukannya, matriks siapa boleh melakukan apa (kolom Super Admin disorot), plus prinsip yang dipakai | konstanta di `Wewenang.jsx`, diturunkan dari aturan server |
| `/super/aturan` | kartu periode akademik (pindah satu semester maju atau mundur, dengan pratinjau semester tiap angkatan dan alasan; lihat Periode akademik), ringkasan berapa aturan yang masih menunggu konfirmasi, lalu aturan perhitungan yang berlaku, sumbernya (bawaan kode atau tabel Konfigurasi), dan statusnya; selain periode hanya bacaan, tautannya ke Penilaian & Bobot | `CONFIG`, `DARI_BASIS_DATA` di `src/lib/config.js`; `PERIODE_AKTIF`, `/api/periode` |

Rancangannya mengikuti praktik umum panel admin: wewenang secukupnya dan pemisahan tugas (yang
meminta tidak menyetujui) dari OWASP Authorization Cheat Sheet, pola maker-checker untuk antrean
persetujuan, serta log audit yang bisa disaring per pelaku, tindakan, sasaran, dan rentang waktu.
Matriks di `/super/wewenang` ditulis tangan: bila aturan di `src/server/persetujuan.js` berubah,
ubah juga `MATRIKS` di sana.

**Log Aktivitas** (`src/halaman/admin/Log.jsx`, dipakai `/super/log` dan `/admin/log`) membaca satu
halaman (25 baris) dari `POST /api/log` lewat `bacaLog()` di `src/lib/store.js`, tanpa memuat ulang
data. Tab *Tindakan admin* (`LogAktivitas`) bisa disaring per pelaku dan jenis tindakan, tab
*Perubahan nilai* (`AuditLog`) per pelaku dan NIM; keduanya per rentang tanggal WIB, dengan pilihan
cepat Hari ini dan 7 hari terakhir. Rincian tiap tindakan dibuka per baris. Tanpa basis data (uji),
perubahan nilai dibaca dari `AUDIT_LOG` yang termuat dan tindakan admin dinyatakan tidak tersedia.

**Penilaian & Bobot** memakai ulang dua editor panel Kemahasiswaan: `EditorPenilaian` (teks aspek,
komponen asesmen, bobotnya; komponen bisa ditambah dan diarsipkan) dan `Kurikulum` (bobot semua
aspek dan cara membagi bobot otomatis). Keduanya sudah membedakan super admin, jadi tidak ada
"Ajukan ke Super Admin" di sini. Kedua editor melaporkan draf yang belum disimpan
(`onPerubahan`); berganti aspek atau tab saat masih ada draf ditanyakan dulu. Permintaan admin
`UBAH_PENILAIAN`/`UBAH_BOBOT` yang masih menunggu diberi peringatan di atas halaman, karena
permintaan yang datanya sudah berubah akan gagal dijalankan.

**Akses Pengguna** (`src/halaman/super-admin/Akses.jsx`) mengubah `Pengguna.aktif` akun mahasiswa, dosen,
dan admin, dalam tiga tab: Dosen, Admin Kemahasiswaan, dan Mahasiswa. Server menolak akun nonaktif di
setiap permintaan (`penggunaDari()` di `src/server/api.js`) dan saat masuk (`masuk.js`, "Akun ini
dinonaktifkan"), jadi mencabut akses langsung mengakhiri sesinya. Datanya tidak disentuh: nilai dan
riwayat mahasiswa yang dicabut tetap ada dan tetap terlihat di panel Kemahasiswaan. Kedua pintunya ada
di `src/server/akses.js`. Bila server menjawab 404, halaman menyatakan fiturnya belum tersedia
(`galat.status` dari `kirim()`).

- `POST /api/akses`, hanya super admin (`tangani(request, ['superadmin'], …)`). Jawaban:
  `{ akun: [{ id, email, peran, aktif, nama?, nip?, nim?, prodi?, angkatan? }] }` untuk semua akun,
  dengan `peran` `'mahasiswa'`, `'dosen'`, `'admin'`, atau `'superadmin'`. `nama` dan `prodi` ada
  untuk dosen dan mahasiswa; `nip` hanya dosen; `nim` dan `angkatan` (label angkatan) hanya mahasiswa.
  Daftarnya belum berhalaman: seluruh akun dikirim sekaligus, lalu dicari dan disaring di peramban.
- `POST /api/akses/ubah` dengan isi `{ id, aktif, alasan }`, hanya super admin. Tolak (403) bila
  akunnya milik sendiri atau berperan `SUPER_ADMIN`; tolak (400) bila `alasan` kurang dari 10
  karakter; 404 bila akun tidak ada. Dicatat ke `LogAktivitas` dengan aksi `UBAH_AKSES` beserta email,
  peran, aktif sebelum dan sesudah, dan alasan; bila statusnya sudah sama, tidak ada yang dicatat.
  Jawaban: `{ akun }` dengan bentuk yang sama.
- `POST /api/akses/hapus` dengan isi `{ id, alasan }`, hanya super admin (`hapusAkun()`). Menghapus
  permanen baris `Pengguna` beserta `Mahasiswa`/`Dosen` dan `Profil`-nya, jadi akunnya juga hilang di
  phpMyAdmin. Aturannya:
  - Tolak (403) akun milik sendiri dan akun `SUPER_ADMIN`.
  - Tolak (400) alasan yang kurang dari 10 karakter, dan beri 404 bila akun tidak ada.
  - Tolak (409) akun yang aksesnya belum dicabut.
  - Tolak (409) akun yang masih punya data. Pesannya menyebut jumlahnya, misalnya "masih punya 12
    nilai dan 3 riwayat tindakan". Yang dihitung sebagai data:
    - milik mahasiswa: nilai, pengumpulan, pengajuan koreksi, penguncian aspek, riwayat perubahan
      nilai, dan entri usulan dosen;
    - milik dosen: usulan nilai dan pengumpulan yang diterima;
    - milik siapa pun: jejak sebagai pelaku di `AuditLog`, `LogAktivitas`, `Batch`, `Nilai.penilaiId`,
      `Penguncian`, `Angkatan`, `Komponen`/`Aspek`/`Indikator`, keputusan koreksi dan usulan, serta
      `PermintaanAdmin`. Kolom-kolom itu menyimpan id akun tanpa relasi, dan Log Aktivitas membaca
      nama pelakunya dari akun (`petaNama()`), jadi akun seperti itu cukup dibiarkan dicabut.
  - Penghapusan dan catatan `HAPUS_AKUN` (email, peran, nama, NIM/NIP, prodi, angkatan, alasan) ada
    dalam satu transaksi. Bila data baru masuk di antara pemeriksaan dan penghapusan, relasi basis data
    menolaknya dan pintunya menjawab 409.
  - Jawaban: `{ id }`.

  Di layar, tombol "Hapus akun" hanya muncul di baris yang aksesnya sudah dicabut, di samping "Pulihkan
  akses". Panelnya meminta alasan sebelum tombol "Hapus permanen" aktif. Penolakan dari server tampil
  di panel itu; bila berhasil, barisnya hilang dan pesan status muncul di atas daftar.
- `POST /api/akses/izin` dengan isi `{ id, aktif, alasan }`, hanya super admin (`aturIzinMaster()`).
  Memberi (`aktif: true`) atau mencabut izin kelola data master satu akun admin biasa (kolom
  `Pengguna.kelolaMaster`); lihat Data master. Tolak (403) akun `SUPER_ADMIN` (selalu punya izin) dan
  akun selain admin; tolak (400) alasan kurang dari 10 karakter; tolak (409) memberi izin ke akun yang
  aksesnya dicabut. Dicatat dengan aksi `UBAH_IZIN`; bila statusnya sudah sama, tidak ada yang dicatat.
  Jawaban: `{ akun }`, dan setiap akun admin di `POST /api/akses` membawa `kelolaMaster`. Di layar, baris
  admin biasa punya tombol "Beri izin data master"/"Cabut izin data master" dan lencana "Izin data master".

**Tampilan panel super admin** mengambil pola dasbor modern di Dribbble (sapaan bertanggal, satu kartu
fokus, angka dengan meter, grafik batang dengan tooltip, linimasa berikon, kepingan periode) tanpa
meninggalkan bahasa visual di bawah: warna padat, garis rambut, tanpa bayangan besar.

- **Permukaan aurora.** Menu samping, laci HP (`Laci nada="aurora"`), kartu keputusan, Super Admin di
  rantai pengawasan, dan kartu peran Super Admin memakai `.kartu-aurora`: aurora halaman masuk versi diam
  (butiran `--butiran` yang sama), dengan dasar navy sedikit lebih terang dan cahaya biru muda supaya
  tidak terlalu gelap. Menu samping dan laci memakai `.kartu-aurora-tegak`, yang menaruh biru muda di
  bawah, jauh dari logo dan label toska. Tidak beranimasi, supaya panel tidak terbebani saat dibiarkan
  terbuka. `--accent` (toska) dipakai apa adanya di atasnya, tanpa versi khusus aurora seperti emas
  dulu. Kelas ini tidak memasang `position` (laci memakai `absolute`),
  jadi elemen pemakainya wajib berposisi. Kontras teksnya diukur per piksel di kedua keadaan kartu
  keputusan, menu samping, dan laci, tema terang dan gelap, laptop dan HP: terendah 5,08:1 (keterangan
  putih 75%); tulisan toska terendah 5,65:1 ("Anda"). Bila cahayanya diubah, ukur ulang.
- **Satu titik fokus.** Pusat Kendali disusun mengikuti satu keputusan yang diambil di sana: permintaan
  admin yang menunggu. Kartu navy itu selebar halaman; sisanya bahan pengawasan. Toska hanya dipakai pada
  tombol "Buka antrean persetujuan" saat ada yang menunggu; tanpa permintaan, kartunya tenang (tanda
  centang, keterangan, keputusan terakhir) dan tombolnya putih tembus pandang.
- **Angka asli saja.** Semua angka dihitung dari data yang termuat (`PERMINTAAN`, `AUDIT_LOG`, `COHORTS`,
  `MENUNGGU_KONFIRMASI`) atau `/api/log`; tidak ada delta atau tren tanpa periode pembanding yang nyata.
- **Pemilih periode** (keping di pojok kanan atas Pusat Kendali, tepat di bawah menu akun) mendaftar semester dari intake angkatan
  tertua sampai periode aktif (`daftarPeriode()` di `src/lib/data.js`), terbaru di atas. Memilih periode
  menyaring keputusan, grafik, dan tindakan admin (`/api/log` dengan `dari`/`sampai`) ke rentang semester
  itu (`rentangPeriode()`). Antrean "Perlu keputusan Anda", angkatan terkunci, dan aturan tetap keadaan
  saat ini; saat periode lain dipilih, kartu keputusan diberi tanda "Saat ini" dan kartu keadaan sistem
  menyebutkannya. Rentangnya mengikuti Kalender Akademik UMN 2026/2027 (umn.ac.id): Ganjil dibuka
  tambah-ganti KRS 19-20 Agustus dan ditutup remedial di Januari, Genap dibuka 3-5 Februari dan ditutup
  Semester Antara di akhir Juli. Dibulatkan per bulan supaya setahun tertutup: Ganjil 1 Agustus sampai
  31 Januari, Genap 1 Februari sampai 31 Juli. Pilihan tidak disimpan; membuka Pusat Kendali lagi kembali
  ke periode aktif. Daftarnya berpola listbox: panah, Home/End, Enter atau Spasi, Escape.
- **Grafik perubahan nilai** menjawab "bulan apa saja nilai banyak berubah" dalam periode terpilih: enam
  batang bulanan; bulan yang belum berjalan di periode aktif tidak diberi batang. Satu seri, satu warna
  (`.isi-data`: `--brand` di tema terang, `#5598e7` di tema gelap karena `--brand` di bawah 3:1 di kartu
  gelap), batang paling lebar 24px dengan ujung 4px, garis bantu rambut, hanya nilai terbesar yang diberi
  label. Setiap batang bisa difokus papan ketik dan menampilkan keterangan yang sama dengan tunjuk
  tetikus; tombol Tabel di `ChartFrame` memuat keenam angkanya.
- **Menu samping berkelompok**: Utama (tempat bertindak) dan Pengawasan (hanya dibaca). Satu `MenuSamping`
  menggambar kedua kelompok supaya hanya satu butir yang tersorot. Di layar sempit, lencana Persetujuan
  pindah ke lonceng di bilah atas yang hanya muncul bila ada yang menunggu.
- **Waktu** ditulis relatif ("3 hari yang lalu", `Intl.RelativeTimeFormat`, ikut bahasa pilihan) dengan
  waktu WIB lengkap di `title`; tanggal dan sapaan memakai zona WIB, sama dengan log server.
- **Kontras**: `--text-muted` bawaan hanya 3,2:1 di kartu putih, jadi di dalam `.panel-super` nilainya
  dipertebal (5,6:1 terang, 5,3:1 gelap di `--surface-2`), begitu juga tulisan lencana "Menunggu
  konfirmasi" (`.teks-tunggu`) dan lencana "Punya akses"/"Akses dicabut" di Akses Pengguna (`.teks-baik`,
  `.teks-kritis`): nada `good` dan `critical` milik `Badge` hanya 2,85:1 dan 3,94:1 di latar lencananya.
  Panel Kemahasiswaan (`.panel-admin`) ikut sejak tampilannya diperbarui; panel mahasiswa dan dosen
  belum. Bila ingin seragam, ubah `--text-muted` di `:root` dan nada `Badge` di `Ui.jsx`.

## Bahasa visual: rata, bukan bertumpuk

Seluruh panel memakai satu bahasa yang sama, mengikuti gaya E-Learning UMN:

- **tanpa gradien** — navbar, footer, dan kepala kartu memakai warna padat. Pengecualiannya
  halaman masuk, supaya tidak mirip E-Learning UMN: seluruh halamannya berlatar "aurora" (navy
  pekat dengan cahaya sian, biru elektrik, nila, dan biru laut yang melayang pelan, plus butiran halus;
  `.latar-masuk`) dan formulirnya di kartu kaca gelap (`.kaca-masuk`), mengikuti pola halaman masuk
  modern di Dribbble. Halaman ini selalu memakai warna mode gelap (kelas `dark` di akarnya), apa
  pun tema perangkat. Cahaya dijauhkan dari judul, dan kontras setiap teksnya diukur sepanjang
  animasi (minimal 4,5:1, judul besar 3:1); bila cahaya diubah, ukur ulang. Gumpalan hanya
  menggerakkan `transform`, diam saat kurangi gerak aktif, dan kartunya menjadi padat saat kurangi
  transparansi aktif. Tombol Masuk-nya juga bergradasi biru (`.tombol-masuk`, lihat Gerak).
  Pengecualian kedua: menu samping dan kartu navy panel super admin (`.kartu-aurora`, lihat Panel
  Super Admin › Tampilan) memakai aurora yang sama versi diam, sedikit lebih terang;
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
  menunjuk ke halaman yang benar-benar ada** (di panel mahasiswa: Transkrip, Peta
  Perjalanan, Riwayat, Sertifikat). Panel Kemahasiswaan tidak lagi memakai footer
  sejak tampilannya diperbarui: semua tujuannya ada di menu samping (lihat Panel
  Kemahasiswaan › Tampilan). Panel dosen memakai footer melayang yang sama dengan
  panel mahasiswa (lihat Panel Dosen › Kerangka).

## Panel Kemahasiswaan

### Tampilan

Penggunanya staf Kemahasiswaan dan dosen dengan rentang usia yang lebar, dan panel ini dipakai bekerja
setiap hari, jadi susunannya mengutamakan "cepat sampai ke pekerjaan" di atas hiasan. Polanya diambil dari
dashboard admin modern (Dribbble, Pinterest): menu samping, bilah atas tipis dengan lokasi halaman, dan
tabel dengan alat saring di kepalanya. Visualnya tetap VIBE: navy, toska hanya untuk lencana, tanpa gradien
besar.

- **Menu samping putih** selebar 280px (`AdminLayout.jsx`; menu super admin navy, supaya dua panel itu
  tidak tertukar). Dua kelompok: *Kerja harian* (Overview, Data Mahasiswa, Input & Import Nilai,
  Persetujuan Nilai Dosen, Permintaan Saya atau Persetujuan Admin, Cetak Sertifikat, Angkatan) dan
  *Rujukan & catatan* (Kurikulum CPMK, Program Studi, Log Aktivitas). Lencana toska hanya untuk
  pekerjaan yang menunggu (koreksi, usulan dosen, permintaan). Label menu tidak pernah dipotong "…": bila
  tidak muat, misalnya saat berlencana, ia turun ke baris kedua (`MenuSamping.jsx`). Di bawah 1024px menu
  pindah ke laci di balik tombol garis tiga.
- **Bilah atas**: lokasi halaman (Kemahasiswaan › halaman › rincian), pencarian cepat, lonceng, bahasa,
  tema, dan menu akun. Di bawahnya bilah status (periode, waktu pembaruan, satu-satunya tombol Segarkan).
  Supaya lokasi halaman tidak terpotong di 1024 sampai 1366px, tombol cari yang bertulisan baru muncul
  mulai 1280px (di bawahnya tombol ikon; Ctrl+K tetap bekerja), dan nama serta email di samping avatar
  baru muncul mulai 1440px (prop `rinciDari` milik `MenuAkun`).
- **Pencarian cepat** (`CariCepat.jsx`): tombol di bilah atas atau Ctrl+K / ⌘K dari halaman mana pun.
  Mencari mahasiswa (nama, NIM, email; minimal 2 huruf, paling banyak 6 hasil) dan halaman menu. Pola
  combobox: fokus tetap di kolom ketik, panah, Home, dan End memindah sorotan (`aria-activedescendant`),
  Enter membuka, Esc menutup dan mengembalikan fokus ke unsur yang difokus sebelum dialog dibuka (bila
  unsur itu sudah tidak ada, ke tombol cari yang sedang terlihat). Penanda fokusnya garis bawah kolom,
  bukan cincin bawaan. Dialognya dipasang lewat portal ke `<body>`: bilah atas punya tumpukan
  (`z-index`) sendiri yang lebih rendah dari menu samping, jadi tanpa portal menu samping tidak ikut
  tertutup tirai dan masih bisa diklik.
- **Pola halaman bersama** di `Ui.jsx`, dipakai semua halaman panel ini supaya kepala halaman, tab, judul
  kolom, dan kaki daftar sama rupa di mana pun:
  - `JudulHalaman`: judul 26px, keterangan, dan tombol tindakan di kanan yang turun ke bawah di layar
    sempit.
  - `KartuAngka`: satu angka besar dengan satuannya, dan bila ada, satu persentase dengan bilah tipis.
    Teksnya datang sudah diterjemahkan pemanggil; komponen ini tidak memanggil `t()`, supaya kalimat
    berisian tidak diterjemahkan dua kali.
  - `TabSaring`: tab bergaris bawah di kepala kartu, masing-masing dengan jumlahnya, jadi isi tiap kelompok
    terbaca tanpa harus dipilih. Di baliknya radio: Tab masuk sekali, panah memindah pilihan.
  - `Paginasi`: "Menampilkan a–b dari n", pilihan baris per halaman (bila ada), lalu Sebelumnya, nomor
    halaman, dan Berikutnya yang selalu sebaris.
  - `GulirTabel`: wadah tabel yang bisa digulir ke samping (lihat jebakan tata letak di bawah).
  - `JUDUL_KOLOM`: kelas judul kolom tabel, huruf biasa 12,5px tebal, bukan huruf kapital kecil 11px.

  Log Aktivitas dan Persetujuan Admin juga dipakai panel super admin, jadi rupa barunya ikut tampil di
  `/super/log` dan `/super/persetujuan`.
- **Data Mahasiswa**:
  - Tab kelengkapan nilai beserta jumlahnya (Semua, Lengkap, Belum lengkap), jadi banyaknya mahasiswa
    yang nilainya masih kosong terbaca tanpa harus memilih apa pun. Tab Belum lengkap yang kosong ditulis
    sebagai kabar baik.
  - Alat saring: kolom cari lalu empat pilihan berlabel di dalam kotak, disusun grid supaya tidak ada
    pilihan yang tersisa sendirian selebar baris. Di HP keempat pilihan dilipat di balik tombol Filter
    yang menyebut berapa saringan yang aktif. Atur ulang filter muncul hanya bila ada yang disaring.
  - Tabel: setiap judul kolom bisa mengurutkan (`aria-sort`). Tombol ⋯ per baris membuka menu *Lihat
    detail & transkrip* dan *Masukkan nilai*. Menunya ber-`position: fixed` supaya tidak terpotong wadah
    gulir, dengan pola menu (panah, Home, End, Esc). Kolom ⋯ menempel di kanan (`sticky`) saat tabel
    digulir ke samping.
  - Email tidak ditampilkan di tabel. Email tetap ada di detail mahasiswa dan ekspor CSV, dan tetap bisa
    dicari. Tanpanya tabel muat utuh di layar 1366px dan lebih.
- **Input & Import Nilai**: tiga langkah bernomor (semester, sumber penilaian, angkatan). Semester dan
  sumber berupa tombol pilihan (radio) yang langsung menampilkan isinya, misalnya "3 aspek · A.1, A.2,
  A.3". Penyaring fakultas dan program studi ada di bawahnya. Setiap pilihan angkatan menyebut jumlah
  mahasiswanya atau "belum mulai", dan keterangan di bawahnya memakai semester kalender ("Belum mulai",
  "Semester 2 dari 3", "Program selesai"); lihat Input nilai untuk gerbangnya. Bila pilihan yang ada belum
  membuka area kerja sementara pengajuan koreksi menunggu, satu baris di bawah pilihan menautkan ke
  antreannya, karena tab Pengajuan koreksi hanya ada di dalam area kerja.
- **Halaman lainnya** memakai pola yang sama:
  - *Detail mahasiswa*: tautan kembali dan tombol *Masukkan nilai* di atas, transkrip versi admin
    (`<Transkrip untukAdmin />`), syarat sertifikat, dan riwayat perubahan nilai yang menampilkan 10
    terbaru lebih dulu (tombol *Tampilkan semua*). Versi admin tidak memuat kartu "Ajukan koreksi nilai"
    milik mahasiswa: pengajuan dari akun admin selalu ditolak server (403).
  - *Cetak Sertifikat*: tab Semua, Berhak, dan Belum berhak beserta jumlahnya, kolom cari dan pilihan
    angkatan, lalu tabel berhalaman. Tombol Cetak di tiap baris menyebut nama mahasiswanya bagi pembaca
    layar.
  - *Program Studi*: tiga angka ringkasan, tab satuan analisis (program studi, fakultas, angkatan), dan
    penyaring ringkas tanpa kolom cari.
  - *Persetujuan Nilai Dosen*: tiga angka (menunggu keputusan, disetujui, ditolak) lalu tab Menunggu dan
    Sudah diputuskan. *Permintaan Saya* dan *Persetujuan Admin*: tab Menunggu dan Riwayat.
  - *Angkatan*: kartu per angkatan, dengan tiga angkanya sejajar di semua kartu. Angkatan yang semester
    pertamanya belum tiba ditulis "Belum mulai" dan tidak dipilih sebagai bawaan. Di bawahnya daftar tindak
    lanjut bertab (Semua, Nilai belum lengkap, Di bawah rata-rata minimal, Masih sementara) dan berhalaman.
  - *Log Aktivitas*: tab jenis catatan, pilihan pelaku dan jenis tindakan, cari NIM (tekan Enter), tanggal
    Dari dan Sampai yang tidak bisa saling melewati, pintasan Hari ini, 7 hari terakhir, dan Semua waktu,
    lalu Atur ulang filter.
  - *Kurikulum CPMK*: kepala halaman dan judul kolom yang sama; isi kartu aspek rata atas.
- **Papan ketik**: `Tabs` mengikuti pola tab APG (hanya tab terpilih yang masuk urutan Tab; panah, Home,
  dan End memindah pilihan beserta fokusnya). Laci menu (di bawah 1024px) mengurung Tab selama terbuka,
  karena ia `aria-modal`. Lonceng, menu akun, dan laci mengembalikan fokus ke tombol pembukanya saat ditutup
  dengan Esc (pencarian cepat: lihat di atas); lonceng dan menu akun juga menutup sendiri saat fokus
  berpindah keluar dengan Tab. Baris aspek di transkrip dibuka lewat tombol bertanda `aria-expanded`, bukan
  hanya klik pada barisnya.
- **Kontras**: `.panel-admin` memakai teks redup yang sama tegasnya dengan panel super admin. Nada `good`,
  `warning`, dan `critical` milik `Badge`, juga pesan "tersimpan", memakai `--teks-baik`, `--teks-tunggu`,
  dan `--teks-kritis` yang didefinisikan di kedua panel itu; warna asalnya hanya 2,85:1, 2,8:1, dan 3,94:1
  di latar lencananya. Seluruh halaman panel ini, termasuk dialog pencarian dan menu ⋯ yang terbuka, lolos
  4,5:1 di tema terang dan gelap, laptop dan HP.
- **Jebakan tata letak yang sudah terjadi di sini**:
  - Wadah tabel yang bisa digulir harus `relative` bila di dalamnya ada unsur `position: absolute`,
    misalnya label `sr-only`. Tanpa itu unsur tersebut keluar dari wadah gulir, dan Chrome di HP
    memperlebar halaman (Data Mahasiswa sampai 1110px, Cetak Sertifikat 809px, Log Aktivitas 680px).
    Karena itu setiap tabel kini dibungkus `GulirTabel`, yang sekaligus memberi `scroll-padding` dan
    menggulir wadahnya saat sesuatu di dalamnya difokus: Chrome tidak menggulir wadah untuk unsur yang sudah
    terlihat sebagian, jadi tautan yang separuh tersembunyi di tepi tetap terpotong. Wadah gulir tanpa isi
    yang bisa difokus dijadikan tempat berhenti Tab oleh Chrome, jadi cincin fokus wadah itu digambar ke
    dalam supaya tidak terpotong kartu.
  - Bilah atas menempel (`sticky`), jadi `html` diberi `scroll-padding-top: 88px`; tanpanya unsur yang
    difokus dengan Tab bisa berhenti di balik bilah itu. Kolom ⋯ yang menempel di kanan Data Mahasiswa
    menutupi sel dengan cara yang sama, jadi wadah tabelnya diberi jarak gulir seukuran kolom itu
    (`scroll-pr-[72px]`, lewat prop `jarak` milik `GulirTabel`).
  - `<select>` cocok dengan `:focus-visible` bahkan saat diklik tetikus. Di `Select` ringkas, cincin fokus
    global milik `<select>` menimpa ujung label di sebelahnya ("Program stud|i"), jadi cincinnya kini
    digambar di kotak (`has-[:focus-visible]`) dan cincin `<select>` dimatikan.
  - `<button>` meletakkan isinya di tengah secara tegak. Kartu yang berupa tombol (Kurikulum, Angkatan)
    diberi `flex flex-col` supaya isinya rata atas dan angka di kakinya sejajar antarkartu.
  - Garis antarbaris tabel dipasang di sel (`border-separate`), bukan di `<tr>`. Pada `border-collapse`,
    garis sel yang `sticky` ikut tergulir pergi.

### Gerak

Sedikit gerak supaya panel tidak terasa kaku, tanpa mengganggu kerja. Semuanya pendek (paling lama 0,7 detik),
hanya `transform` dan `opacity`, dan sekali jalan saat sesuatu muncul atau ditekan. Animasi CSS-nya
(`index.css` › gerak panel Kemahasiswaan) hanya berlaku di dalam `.panel-admin`; transisi kecil milik komponen
(garis tab, kartu terangkat) ikut tampil di panel super admin karena komponennya dipakai bersama.

- Bagian halaman (anak langsung isi halaman) naik dan memudar masuk berurutan, berselang 50 md. Bagian yang
  muncul belakangan, misalnya area kerja Input Nilai sesudah semester dipilih, ikut naik saat dipasang.
  Mode isiannya `backwards`, sama dengan `.animate-halaman` (lihat Catatan kode › Gerak).
- Bilah persentase (`KartuAngka`, `ScoreBar`) tumbuh dari kiri (`.bilah-tumbuh`), dan batang grafik
  Perkembangan per semester tumbuh dari dasarnya bergiliran (`.batang-tumbuh`).
- Garis bawah tab terpilih di `TabSaring` tumbuh dari tengah.
- Kartu yang bisa dipilih (Angkatan, Kurikulum) sedikit terangkat saat ditunjuk.
- Tombol mengecil ke 97% saat ditekan, umpan balik yang terasa juga di HP.
- Pesan status (perubahan tersimpan, permintaan dikirim ke Super Admin) dan panel saringan di HP muncul
  dengan `animate-rise`; panah bagian yang bisa dilipat di penyunting penilaian Input Manual berputar saat
  dibuka.
- **Daftar pilihan setiap `<select>`** muncul seperti menu akun dan pemilih periode super admin. Bentuknya
  kartu bersudut 16px dengan bayangan, naik 10px sambil memudar (`rise`, 0,35 detik), dengan centang di kanan
  pilihan terpilih dan panah yang berputar saat terbuka. Caranya memakai `<select>` yang bisa diberi gaya
  (`appearance: base-select`, Chrome dan Edge 135 ke atas), jadi tetap select bawaan: papan ketik, pembaca layar,
  dan `onChange` tidak berubah. Peramban lain memakai daftar bawaannya tanpa animasi; karena itu semua aturannya
  ada di dalam `@supports` (`index.css` › pilihan (select) panel Kemahasiswaan, panel dosen, dan panel super admin).
  Panel dosen dan super admin memakai aturan yang sama (`:is(.panel-admin, .panel-dosen, .panel-super)`). Di panel
  dosen: saringan Tugas dan Status di Beranda, dan pemetaan kolom unggah CSV di Penilaian. Di super admin: saringan
  Pelaku dan Jenis tindakan di Log, saringan status dan formulir Tambah akun di Akses Pengguna, dan Sumber, Jenis,
  Ranah, serta Status di tabel komponen Penilaian & Bobot. Pemilih periode di Pusat Kendali bukan `<select>`; ia sudah
  memakai `animate-rise` dan membuka ke bawah. Kalender `<input type="date">` di Log digambar sistem operasi dan
  tidak bisa diberi animasi. Hal yang sudah terbukti di sini:
  - Pengurai CSS Turbopack menolak pseudo-class sesudah `::picker(select)` (misalnya `:popover-open`), dan
    galatnya membuat seluruh `index.css` gagal dimuat. Animasinya dipasang langsung di `::picker(select)`: daftar
    itu `display: none` saat tertutup, jadi animasinya diputar ulang setiap kali dibuka. Uji dulu sintaks CSS
    baru di rute sementara sebelum memasukkannya ke `index.css`.
  - Di base-select teks terpilih ada di elemen bawaan yang tidak bisa menyempit, sehingga `truncate` milik
    `<select>` tidak berlaku dan teks panjang menimpa panah. Penggantinya `-webkit-line-clamp: 1`,
    `word-break: break-all`, dan `overflow-clip-margin: content-box`, yang menghasilkan "Desain Ko…", sama
    dengan select bawaan.
  - Base-select selebar pilihan terpilih, bukan selebar pilihan terpanjang. Select yang lebarnya tidak diatur
    wadahnya (agregasi dan skala di Import CSV) diberi `min-w` setara select bawaan. Tanpa itu kolom skala
    tidak rata dan select-nya menyempit di HP sampai teksnya terpotong.
  - Setiap select di panel ini punya panah sendiri tepat sesudahnya (`select + svg`), dipusatkan dengan
    `inset-y-0 my-auto`, bukan `translate`. Properti `rotate` yang digabung dengan `translate` milik Tailwind
    memindahkan panah ke bawah saat berputar. Select baru di panel ini perlu pola yang sama (lihat `Select`
    di `Ui.jsx` atau `PilihanSel` di `EditorPenilaian.jsx`).
  - Select ringkas (label di dalam kotak): daftarnya menempel ke tepi kotak (`.pilihan-ringkas` dengan
    `anchor-scope`), bukan ke `<select>` yang baru mulai sesudah label.
  - Semua daftar membuka ke bawah. Bawaan Chrome memilih sisi yang paling lega, sehingga dalam satu baris saringan
    daftar panjang (Tugas) bisa membuka ke atas sementara daftar pendek (Status) ke bawah. Dua aturan menyamakannya:
    `position-try-order: normal` (coba bawah dulu), dan tinggi yang dibatasi ruang di bawah kotak,
    `max(160px, min(320px, 100% - 16px - var(--tinggi-bilah-bawah, 0px)))`. Dengan `position-area`, `100%` di
    sini adalah area di bawah kotak (terukur: dengan ruang 240px daftar Tugas tetap di bawah, dipendekkan, dan bisa
    digulir), dan di panel dosen bilah bawah HP ikut dikurangkan. Daftar baru membalik ke atas bila ruang itu kurang
    dari 160px, karena daftar setipis itu tidak terpakai.
  - Lebar daftar dibatasi `min(100vw - 32px, 100% - 16px)`; `100%` di sini adalah area dari tepi kiri kotak sampai
    tepi kanan layar, jadi daftar yang lebih lebar dari kotaknya (di HP) berhenti 16px sebelum tepi layar.
  - Pilihan memakai `word-break: normal` dan `overflow-wrap: anywhere`. Nilai `break-all` dari kotak tertutup
    terwariskan ke `<option>`, sehingga pilihan yang terlipat di HP dulu patah di tengah kata ("SL H", "revie w").
  - Menu aksesibilitas › Hentikan animasi memakai `*`, yang tidak mengenai pseudo-elemen; animasi
    `::picker(select)` dimatikan dengan aturan sendiri (`.panel-dosen.a11y-diam`).
  - Select yang nonaktif diberi warna redup sendiri. Base-select tidak lagi memakai warna nonaktif bawaan
    peramban, jadi tanpa aturan ini Sumber yang "sudah dinilai" tampak bisa dipilih.
  - Pilihan yang difokus dengan papan ketik diberi latar `--brand-soft`, seperti pemilih periode, bukan cincin
    fokus global. Bila daftar dibuka dengan tetikus, pilihan itu tidak disorot; centang menandai yang terpilih.
- Saat kurangi gerak aktif, animasi muncul, tumbuh, dan daftar pilihan dilepas sama sekali (`animation: none`),
  seperti pita logo di halaman masuk. Blok `prefers-reduced-motion` di akhir `index.css` hanya memendekkan durasi, dan
  jedanya (50 sampai 360 md) tetap berjalan; karena isiannya `backwards`, bagian halaman dan batang grafik
  sempat tidak terlihat selama jeda itu lalu muncul tiba-tiba. Transisi garis tab dan efek tekan tombol
  cukup dipendekkan blok global, dan kartu hanya terangkat bila gerak diizinkan (`motion-safe:`). Saat
  mencetak, bagian halaman tidak dianimasikan.

## Panel Dosen

Penggunanya dosen yang datang sesekali untuk menilai, banyak di antaranya berusia 40 tahun ke atas. Ukuran
tampilannya sama dengan panel super admin, atas arahan pemilik produk. Kebutuhan yang berbeda-beda, misalnya
tulisan lebih besar atau kontras lebih tegas, dipenuhi lewat menu aksesibilitas yang dinyalakan sendiri oleh
pemakainya (lihat Menu aksesibilitas). Susunan dan alur halamannya diambil dari riset dan panduan
berikut, lalu disesuaikan dengan pola LMS yang sudah dikenal dosen (Moodle, Google Classroom, Canvas):

- NN/g (123 peserta berusia 65+): pengguna lansia sekitar 43% lebih lambat. Masalah yang terus berulang adalah
  huruf kecil dan pucat, tombol serta dropdown yang kecil, pesan galat yang terlewat, dan isian yang hanya
  menerima satu format. Menu yang disembunyikan di balik tombol garis tiga hampir separuh lebih sulit ditemukan.
- W3C WAI: kepekaan kontras, ketangkasan tangan, daya ingat jangka pendek, dan pemusatan perhatian menurun.
  Tinjauan WAI-AGE mencatat informasi yang berlebihan sebagai salah satu masalah yang paling sering.
- WCAG 2.2: sasaran klik minimal 24px (AA). Kendalinya berukuran standar seperti panel super admin (tombol
  sekitar 40px); ukuran tulisan sampai 150% dan jarak teks (WCAG 1.4.12) tersedia di menu aksesibilitas.
- GOV.UK: satu hal per layar, dan halaman periksa sebelum mengirim.

Pekerjaan dibagi dua tahap. Tahap 1 (kerangka dan Penilaian) sudah selesai. Tahap 2 (Beranda, Riwayat
Pengiriman, serta Profil dan bantuan) menyusul; judul Beranda dan Riwayat Pengiriman sudah disamakan dengan
nama menunya.

### Kerangka

- **Menu samping putih** seperti panel Kemahasiswaan (`DosenLayout.jsx`, selebar 264px seperti panel super admin
  dan mahasiswa) berisi Beranda, Penilaian, Riwayat Pengiriman, dan Profil. Satu lencana saja, di Penilaian:
  jumlah pengumpulan yang belum dinilai atau ditolak. Di atas menu ada kotak *Kelas Anda* (unit penilai,
  semester, dan program studi).
- **Bilah bawah berlabel di HP** (`BilahBawah.jsx`), bukan tombol garis tiga.
- **Bilah atas**: pemilih bahasa, tema, menu aksesibilitas, dan menu akun dalam ukuran bawaannya. Di HP logonya
  hanya logo PDP, supaya semuanya muat sampai lebar 360px.
- **Footer melayang seperti panel mahasiswa** (`<Footer pintasan melayang />`, komponen dan ukurannya sama):
  pintasan berikon ke empat halaman dosen, alamat Helpdesk, telepon dan surel, identitas unit, dan baris hak
  cipta. Mulai layar laptop ia menjadi kartu bersudut bulat berjarak 16px, sepasang dengan menu samping. Di HP
  baris hak cipta diberi ruang 84px di bawahnya, supaya tidak tertutup tombol bantuan saat halaman digulir ke
  ujung; ini berlaku juga di panel mahasiswa, yang sebelumnya tertutup.
- **Kontras**: teks redup memakai warna panel admin (`--text-muted` #63677f, 5,6:1 di kartu putih; sebelumnya
  #8a8ea9, 3,2:1), begitu juga nada `Badge`. Ikon di atas isian `--brand-ink` (langkah yang selesai, pilihan cara
  isi yang aktif) memakai warna `--surface`, bukan putih: di tema gelap `--brand-ink` biru muda, dan centang putih
  di atasnya hanya 1,8:1.
- **Bilah bawah, bilah aksi, footer, dan tombol bantuan tidak saling menutupi**: tinggi bilah bawah disimpan
  sebagai `--tinggi-bilah-bawah` (68px tautan + 1px garis atas). Kolom isi (`.kolom-dosen`) berakhir setinggi bilah
  bawah di atas dasar layar, supaya baris hak cipta footer tidak tertutup. Tombol bantuan (`posisi="bantuan-dosen"`,
  prop `posisi` milik `LayananTambahan`) melayang 8px di atas bilah aksi Penilaian selama bilah itu menempel atau
  baru lepas, lalu kembali ke tempatnya: `useBantuanDiAtasBilah` di `Nilai.jsx` menulis `--naik-bantuan`, jadi di
  ujung halaman tombol itu tidak menutupi footer.

### Penilaian

`/dosen/nilai` terdiri dari tiga langkah yang selalu terlihat di bagian atas (*Pilih tugas*, *Isi nilai*,
*Periksa & kirim*). Setiap langkah punya alamatnya sendiri, jadi tombol Kembali peramban bekerja:

| Alamat | Langkah |
|---|---|
| `/dosen/nilai` | kartu per tugas dengan jumlah belum dinilai, menunggu persetujuan, dan tercatat, serta bilah progres. Tugas yang masih punya pekerjaan ditaruh paling atas. |
| `?komponen=<id>` (opsional `&cari=<NIM>`, dipakai tautan dari Beranda) | isi nilai |
| `?komponen=<id>&periksa=1` | periksa lalu kirim |
| `?komponen=<id>&terkirim=<id usulan>` | layar berhasil dan langkah berikutnya |

Saat langkah berganti, fokus pindah ke judul langkah, supaya pembaca layar dan pengguna papan ketik ikut
berpindah. Penandanya disimpan di `sessionStorage`, yang dibungkus `try/catch` karena bisa ditolak peramban.

**Isi nilai**

- Kotak nilai berupa `<input type="text" inputmode="decimal">` setinggi 40px, bukan `type="number"`. Diuji di
  Chrome: pada `type="number"` yang sedang fokus, tiga putaran roda tetikus mengubah 85 menjadi 82, dan "85,5"
  dibaca menurut bahasa peramban (85,5 di Chrome berbahasa Indonesia, 855 di Chrome berbahasa Inggris).
- `bacaNilai()` menerima "85", "85,5", dan "85.5" (paling banyak dua angka desimal, 0 sampai 100). "85," dibaca
  85, supaya tanda salah tidak berkedip di tengah mengetik.
- Galat muncul di bawah kotaknya setelah kotak ditinggalkan, beserta cara membetulkannya.
- Enter dan panah bawah pindah ke baris berikutnya, Shift+Enter dan panah atas ke baris sebelumnya, seperti
  lembar kerja.
- **Draf tersimpan otomatis** di peramban, per dosen dan per tugas (`sk5c.draf-nilai.<nip>.<komponenId>`). Setiap
  kotak yang benar bertanda "Tersimpan sebagai draf", dan pukul terakhir tersimpan ditulis. Draf dihapus setelah
  terkirim. Draf hanya ada di perangkat itu; menyimpannya di server butuh dukungan back-end.
- **Bila peramban menolak menyimpan** (penyimpanan penuh atau diblokir), tanda "Tersimpan sebagai draf" tidak
  muncul dan bilah info meminta dosen mengirim sebelum menutup halaman. Drafnya dipegang di memori (`cadangan`),
  karena setiap langkah membaca drafnya sendiri. Tanpa cadangan ini, nilai yang diketik hilang saat pindah ke
  *Periksa & kirim*.
- **Bilah aksi** menempel di dasar layar, berisi "N dari M nilai sudah diisi" dan tombol *Periksa & kirim*. Bila
  masih ada nilai yang salah, tombol itu menahan langkah, mengosongkan pencarian bila baris yang salah
  tersaring, dan memindah fokus ke kotak yang salah.
- **Unggah CSV** (cara kedua): templat berisi NIM dan nama yang belum dinilai, dengan kode tugas sebagai judul
  kolom nilainya, sehingga kolom itu tertebak sendiri saat berkasnya diunggah kembali. Kolom NIM, kolom nilai,
  dan skala tetap bisa dibetulkan. Hasilnya dimasukkan ke tabel yang sama untuk diperiksa, tidak langsung
  terkirim. Usulannya tercatat `cara: 'import'` bila nilainya berasal dari berkas.
  - Sel nilai yang kosong dilewati dan hanya disebut jumlahnya ("2 baris tanpa nilai dilewati"), seperti Import
    CSV Kemahasiswaan. Yang disebut bermasalah hanya baris yang sungguh tidak bisa dipakai, beserta sebabnya.
  - Nilai disimpan sampai dua desimal (`konversi(n, skala, 2)`), sama dengan isian manual: 92,5 tetap 92,5.
    Import CSV Kemahasiswaan tetap membulatkan ke bilangan bulat seperti sebelumnya.
- Baris yang menunggu persetujuan atau sudah tercatat tampil sebagai bacaan saja. Waktu kumpul dan pukul draf
  mengikuti bahasa aktif: "6 Sep 2026, 16.35" atau "6 Sept 2026, 16:35".

**Periksa & kirim** menampilkan ringkasan nama, NIM, dan nilai, kolom catatan opsional, dan penjelasan bahwa
nilai belum terlihat mahasiswa sampai disetujui. Pengirimannya tetap `usulkanNilai()` seperti sebelumnya (lihat
Catatan kode › Usulan nilai dosen).

**Uji**: `scripts/smoke.run.cjs` memeriksa langkah 1 dan langkah 2 (`/dosen/nilai?komponen=A1-MK-T1`). Setiap
kotak nilai berlabel, `inputmode="decimal"`, tidak ada `type="number"`, dan tidak ada tombol "Simpan nilai".
`ujiBilahBawah` memastikan bilah bawah berisi 4 tautan berlabel, menandai halaman aktif, dan tanpa tombol garis
tiga. Halaman Beranda dosen juga diperiksa: footer berpintasan, Helpdesk, dan tombol menu aksesibilitas di bilah
atas.

## Menu aksesibilitas

Ada di keempat panel: mahasiswa, dosen, Kemahasiswaan, dan super admin. Tombol bergambar orang di bilah atas
(di samping tombol tema) membuka menu alat yang dinyalakan sendiri oleh pemakainya. Susunannya mengikuti contoh dari
pemilik produk (`src/components/MenuAksesibilitas.jsx`). Setelannya ada di `src/lib/aksesibilitas.js` (kunci
`sk5c.aksesibilitas`): satu setelan untuk semua panel di peramban itu, disamakan antartab, dan tetap berlaku di
memori bila peramban menolak menyimpan. Selama ada setelan yang menyala, tombolnya bertanda titik toska; tombol
putar di kepala menu mengembalikan semuanya.

Setiap kerangka panel memakai `useAkarAksesibilitas()` dari komponen yang sama, yang memberi tiga hal:

- `kelasAkar` untuk div akar panel: penanda `.akar-a11y`, variabel huruf Lexend, dan kelas `a11y-*` setelan yang
  menyala. Semua aturan di `index.css` › menu aksesibilitas ditulis `.akar-a11y.a11y-…`.
- `gayaIsi` (zoom dan `--skala`) untuk pembungkus `.isi-zoom` di sekeliling isi halaman, ditambah footer di panel
  mahasiswa dan dosen.
- `pemandu` untuk memasang `<PemanduBaca />`. Filter warna dipasang di `<html>` dan dilepas lagi saat panel
  ditutup, misalnya saat keluar ke halaman masuk.

Di HP, panel berlaci (Kemahasiswaan, super admin, mahasiswa) memindahkan pemilih bahasa ke laci di bawah 640px,
supaya tombol menu aksesibilitas muat sampai lebar 360px. Panel Kemahasiswaan sudah begitu sejak awal; panel dosen
tidak berlaci dan tetap memuat semuanya di bilah atas.

| Bagian | Alat | Cara kerjanya |
|---|---|---|
| Penyesuaian konten | Ukuran tulisan 90 sampai 150% | `zoom` pada `.isi-zoom` (isi halaman dan footer). Bilah atas, menu samping, dan bilah bawah tidak ikut, supaya kendalinya tidak terdorong keluar layar HP. Bilah aksi membagi jarak menempelnya dengan `--skala`. |
| | Sorot judul, Sorot tautan | garis tepi pada h1 sampai h3; garis bawah tebal dan bingkai `box-shadow` pada tautan (bukan outline, supaya cincin fokus papan ketik tetap terlihat) |
| | Huruf ramah disleksia | Lexend lewat `next/font` dengan `preload: false`, jadi baru diunduh saat dinyalakan |
| | Jarak huruf, Jarak baris, Huruf tebal | 0,12em huruf dan 0,16em kata (WCAG 1.4.12), tinggi baris 1,8, tebal 700 |
| Penyesuaian warna | Kontras gelap, Kontras terang, Kontras tinggi | gelap dan terang: palet token hitam/putih yang lebih tegas, terlepas dari tema, dengan permukaan kaca dan tulisan bergradasi dibuat padat; tinggi: `filter: contrast(1.35)`. Ketiganya saling menggantikan. |
| | Saturasi tinggi, Saturasi rendah, Monokrom | `filter` saturate atau grayscale, saling menggantikan. Filter dipasang di `<html>`, bukan di panel: filter pada elemen lain menjadi bingkai bagi elemen fixed di dalamnya (menu samping, bilah bawah, tombol bantuan). |
| Alat | Pemandu baca, Hentikan animasi, Kursor besar | pita mendatar yang mengikuti penunjuk (portal ke `<body>`, di luar zoom); semua animasi dan transisi dimatikan; kursor SVG 48px (panah, dan tangan untuk yang bisa ditekan) |

- Menu ini dialog nonmodal. Saat dibuka, fokus pindah ke judulnya; Esc menutup dan mengembalikan fokus ke
  tombolnya; klik atau Tab ke luar menutupnya. Setiap alat adalah tombol `aria-pressed`, dan keadaan nyala
  ditandai garis tepi, latar, dan centang, bukan warna saja.
- Menu ada di dalam bilah atas (sticky, z-20). Selama menu terbuka bilah atas dinaikkan ke z-50
  (`header:has([role='dialog'])`), supaya tombol bantuan dan bilah bawah tidak menutupinya. Di HP menu menjadi
  lembar selebar layar yang berhenti di atas bilah bawah.
- Semua aturan aksesibilitas ada di dalam `@media screen`, dan `@media print` melepas zoom `.isi-zoom` serta filter
  `<html>`. Transkrip dan sertifikat tetap tercetak seperti aslinya walau pemakainya sedang memakai kontras gelap
  atau tulisan 150%.
- Mode kontras: akar panel menetapkan ulang `color: var(--text-primary)`. Warna teks yang diwariskan dihitung di
  `<body>` dengan token tema biasa, jadi tanpa ini teks dan ikon yang tidak punya kelas warna sendiri tetap #14162f
  di atas latar hitam. Kelas warna status yang dipatok (`.teks-baik`, `.teks-kritis`, `.teks-tunggu`, misalnya
  lencana "Berhak") juga diarahkan ke token palet; hijau tua #15731a di latar kontras gelap hanya 2,55:1.
- Sorot tautan di permukaan gelap (footer, menu samping dan laci super admin `.kartu-aurora`) memakai `--accent`,
  karena `--accent-ink` tidak terbaca di sana.
- Uji smoke membundel komponen dengan esbuild, di luar kompiler Next. Di sana modul `next/font/google` kosong, jadi
  diarahkan ke tiruan `scripts/palsu-next-font.js` (lihat `scripts/bundle.cjs`).

## Ringkasan admin sengaja dibuat tenang

Penggunanya dosen dan staf dengan rentang usia dan kebiasaan digital yang lebar, jadi halaman
`/admin` **bukan** dashboard padat. Aturan yang dipegang:

- **pekerjaan dulu, angka kemudian** — blok **Perlu dikerjakan** ada paling atas;
- **tiga angka saja** — mahasiswa terpantau, rata-rata nilai, dan nilai yang sudah final;
- **dua grafik saja** — perkembangan nilai per semester dan donat sebaran huruf mutu — dan
  **tidak ada filter bertingkat**; grafik lainnya tinggal di halaman rinciannya;
- setiap angka besar disertai **satu persentase** dengan bilah tipis; persentasenya selalu
  tertulis angkanya, bilah hanya membantu membandingkan sekilas;
- blok **Perlu dikerjakan** menuliskan tugas sebagai kalimat utuh, bukan istilah teknis: usulan
  dosen dan koreksi mahasiswa lebih dulu, lalu paling banyak tiga kelompok nilai yang belum diisi
  (sisanya disebut jumlahnya dan ada di lonceng). Kalau tidak ada yang tertunda, blok itu menjadi
  satu baris tenang "Tidak ada pekerjaan yang menunggu";
- kartu **Halaman lain** dibuang: semua halaman sudah ada di menu samping;
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

### Periode akademik

`PERIODE_AKTIF` (`src/lib/data.js`) adalah periode yang sedang berjalan dan menjadi dasar semua
hitungan di atas: `semesterAktif`, `semesterKalender`, `programSelesai` (sudah lewat Semester 3, yang
menentukan gerbang persetujuan super admin dan batas wewenang dosen), serta boleh-tidaknya angkatan
dikunci. Nilainya disimpan di tabel `Konfigurasi` dengan kunci `PERIODE_AKTIF`, misalnya
`{ "tahun": "2026/2027", "semester": "Ganjil" }`. Selama baris itu belum ada, angka di kode yang dipakai.
Tidak perlu migrasi: tabel `Konfigurasi` sudah ada.

- **Dibaca** lewat `ambilPeriode()` dan `siapkanPeriode()` di `src/server/kurikulum.js`. `tangani()`
  memanggil `siapkanPeriode()` di setiap pintu API, begitu juga `periksaMasuk()` dan `akunDariId()` di
  `masuk.js`, karena pintu masuk dan sesi tidak lewat `tangani()`. Data master (`ambilMaster()`)
  membawanya ke peramban dan `isiMaster()` memasangnya. Bila gagal dibaca, periode terakhir tetap dipakai.
  Kunci ini bukan bagian dari kurikulum: tidak menaikkan `VERSI_KURIKULUM`, dan `terapkanKonfigurasi()`
  mengabaikannya.
- **Dipasang di tempat**: `pasangPeriode()` mengganti isi objek `PERIODE_AKTIF`, bukan objeknya, jadi
  semua fungsi yang memakainya sebagai nilai bawaan ikut berubah. Semester tiap angkatan di `COHORTS`
  dihitung ulang dan cache transkrip dikosongkan. Bila periodenya sama, tidak ada yang dikerjakan.
- **Diubah** hanya oleh super admin dari kartu Periode akademik di `/super/aturan`, lewat
  `POST /api/periode` (`src/server/periode.js`) dengan isi `{ tahun, semester, alasan }`. Periode hanya
  bisa dipindah satu semester maju atau mundur dari yang sekarang, supaya salah ketik tidak melompat jauh
  dan pemindahan bisa dibatalkan. Alasan minimal 10 karakter, dan setiap pemindahan dicatat sebagai
  `UBAH_PERIODE`. Admin biasa dan dosen ditolak 403. Sebelum disimpan, kartunya menampilkan semester tiap
  angkatan sekarang dan sesudah dipindah, serta berapa angkatan yang akan lewat Semester 3. Sesudahnya
  `ubahPeriode()` di `src/lib/store.js` memasang periode baru dan memuat ulang data, karena semester
  mahasiswa dihitung di server.
- Periode tidak berganti otomatis menurut tanggal: super admin yang memindahkannya saat semester baru
  dimulai.

## Halaman Angkatan

`/admin/angkatan` memantau setiap angkatan yang tercatat di basis data (terbaru lebih dulu):
semester yang sedang berjalan, persentase nilai yang sudah terisi, dan berapa mahasiswa yang
perlu ditindaklanjuti. Satu angkatan dipilih lewat kartunya atau `?angkatan=<id>`, lalu tampil:

- **Nilai yang belum masuk** per semester dan unit penilai (sama dengan lonceng), masing-masing
  bertaut ke Input Nilai dengan sasaran terisi;
- **Mahasiswa yang perlu ditindaklanjuti**, yaitu yang punya komponen kosong pada semester yang
  sudah dibuka, nilai akhirnya di bawah rata-rata minimal setelah sampai Semester 3, atau
  aspeknya masih sementara padahal programnya sudah selesai;
- **Penguncian angkatan**: baru bisa setelah Semester 3 berakhir, dengan pratinjau berapa yang
  akan berhak sertifikat dan konfirmasi berupa mengetik nama angkatan. Angkatan yang terkunci
  bertaut ke Cetak Sertifikat yang sudah tersaring ke angkatan itu.

API angkatan dari back-end **belum final**, jadi halaman ini sengaja dibuat sedikit bergantung
padanya:

- Pemantauan dan pratinjau dihitung di front-end dari data yang sudah dimuat (`COHORTS`,
  `STUDENTS`, transkrip), memakai aturan yang sama dengan server: `semesterKalender`,
  `pekerjaanPenilaian`, dan `pratinjauPenguncian`. `GET /api/angkatan` dan
  `POST /api/angkatan/pratinjau` belum dipakai.
- Satu-satunya pemanggil API adalah `kunciAngkatan()` di `src/lib/store.js`
  (`POST /api/angkatan/kunci` dengan `{ angkatanId, konfirmasi }`). Bila bentuk API berubah,
  cukup fungsi itu yang disesuaikan. Sesudah berhasil, status angkatan di data master ikut
  disamakan di peramban, karena data master baru dimuat ulang saat halaman dibuka lagi.

## Data master

Angkatan, fakultas, program studi, dan data mahasiswa bisa ditambah dan diubah dari `/admin/data-master`
(`src/halaman/admin/DataMaster.jsx`, tab Angkatan, Fakultas & Prodi, dan Mahasiswa) oleh **super admin**
dan **admin yang diberi izin** olehnya di Akses Pengguna. Izinnya satu untuk semua jenis data master,
berlaku sampai dicabut, dan tidak mencakup menghapus.

- **Izin.** Kolom `Pengguna.kelolaMaster` (migrasi `20261023030000_izin_data_master`, bawaannya `false`).
  `penggunaDariId()` di `src/server/api.js` membacanya ulang di setiap permintaan (`punyaIzinMaster()`:
  `SUPER_ADMIN` selalu, `ADMIN` bila kolomnya `true`), dan penjaga `['master']` di `tangani()` hanya
  meloloskan pemiliknya. Mencabut izin langsung berlaku di permintaan berikutnya tanpa masuk ulang. Sesi
  (`masuk.js`, `auth.jsx`) ikut membawa `kelolaMaster` hanya untuk menampilkan menu Data Master; menu dan
  tombolnya baru berubah setelah halaman dimuat ulang. Admin tanpa izin yang membuka alamatnya hanya
  melihat penjelasan.
- **Pintu API** (semuanya `POST`, penjaga `['master']`, isi `aksi: 'tambah' | 'ubah'`; logika di
  `src/server/dataMaster.js`; setiap perubahan dan log-nya dalam satu transaksi):
  - `/api/master/angkatan`: tambah `{ tahun, semester: 'Ganjil' | 'Genap' }`. Kode, label, dan periode
    dibentuk server (`2027`/`2027B`, `2027`/`2027 Genap`, `2027/2028`), tahunnya 2000 sampai satu tahun
    di depan periode aktif, kembar 409. Ubah `{ id, label, alasan }`: hanya label, unik, dan bukan
    angkatan terkunci (409). Periode masuk tidak bisa diubah karena semester setiap mahasiswanya
    dihitung dari situ.
  - `/api/master/prodi`: `jenis: 'fakultas'` (tambah `{ nama }`, ubah `{ nama, namaBaru, alasan }`) atau
    `jenis: 'prodi'` (tambah `{ nama, jenjang: 'S1' | 'D3', fakultas }`, ubah `{ nama, namaBaru?,
    jenjang?, fakultas?, alasan }`). Dikenali dari namanya; nama kembar 409. Ganti nama aman karena
    mahasiswa dan dosen menyambung lewat id.
  - `/api/master/mahasiswa`: tambah memakai `tambahAkun()` (isi sama dengan Akses Pengguna: email, sandi
    awal, NIM, nama, prodi, angkatan), jadi tercatat `TAMBAH_AKUN`. Ubah `{ nim, nama?, email?, prodi?,
    angkatanId?, alasan }`, dicatat `UBAH_AKUN` dengan sebelum/sesudah. **NIM tidak bisa diubah**:
    `UsulanEntri` menyambung ke mahasiswa lewat teks NIM, bukan id. Prodi dan angkatan hanya bisa diubah
    selama mahasiswanya belum punya nilai, pengumpulan, koreksi, penguncian, atau usulan nilai (409
    menyebut jumlahnya), dan angkatan asal maupun tujuannya tidak terkunci.
- **Angkatan terkunci menolak mahasiswa baru**, baik dari sini maupun dari Akses Pengguna
  (`isianMahasiswa()` di `akses.js`).
- Jawaban angkatan dan prodi membawa `master` terbaru (`ambilAngkatanProdi()` di `master.js`);
  `tulisMaster()` di `store.js` memasangnya lewat `isiMaster()` lalu memuat ulang `/api/data`, jadi
  pilihan angkatan dan prodi di semua halaman langsung ikut tanpa memuat ulang halaman.
- Akun dosen dan penghapusan tetap hanya lewat super admin di Akses Pengguna.

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

Kotak surat `vibe@umn.ac.id` (helpdesk di footer dan layanan bantuan) belum dibuat. Alamat itu sengaja
dipasang sebagai penanda tempat, bertanda `// TODO` di `src/lib/layanan.js`; ganti atau aktifkan sebelum
aplikasi dipakai mahasiswa.

### Kenapa `IZINKAN_FINAL_DRAFT` ada

Komponen berstatus `draft` menandai skema penilaian yang belum diresmikan. Aturan R4 melarang
aspek berkomponen draft menjadi `final`, sementara R5 menuntut kesepuluh aspek final untuk
menerbitkan sertifikat. Selama masih ada komponen draft, dua aturan itu bersama-sama membuat
**tidak ada mahasiswa yang bisa disertifikasi**. Saklar ini melonggarkan R4 supaya alur
sertifikat tetap bisa diuji; aspek draft yang di-final tetap diberi penanda “skema belum final”
di UI.

Kini seluruh komponen di `curriculum.js` berstatus `resmi`, termasuk A.3, A.4, B.1, B.2, dan
C.1 yang dulu draft. Penanda (Draft) dan “skema belum final” tidak muncul lagi, dan saklar ini
tidak berpengaruh. Saklar sengaja dibiarkan `true` sampai kolom `Komponen.resmi` di basis data
yang memakai kurikulum dari basis data juga diperbarui; setelah itu setel `false`.

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
dikonfirmasi unit pengelola.

Mode `per-sumber` adalah aturan sebelumnya dan tetap bisa dipilih:

```
bobot sumber   BOBOT_SUMBER, dinormalisasi ulang ke sumber yang HADIR pada aspek itu
bobot MK       dimodulasi per jenis (TUGAS/SIKAP/UTS/UAS), jenis absen dinormalisasi ulang
di dalam grup  dibagi rata
```

Contoh mode `per-sumber`: B.4 hanya punya komponen MK, jadi MK memikul 100% meski
`BOBOT_SUMBER.MK = 50`. A.1 tidak punya UTS, jadi porsi UTS dibagi ke TUGAS/SIKAP/UAS.

Bila **seluruh** komponen sebuah aspek punya `bobot` (kolom `Komponen.bobot`, diisi lewat halaman
Kurikulum CPMK), angka itu yang dipakai, **di mode apa pun**: aspek itu "diatur manual". Aspek
yang komponennya tidak berbobot (bawaannya `null`) "dibagi otomatis" menurut mode di atas.

### Mengubah penilaian dari Input Manual

Di Input Manual, tombol **Atur penilaian A.x** membuka penyunting untuk aspek yang sedang dipilih
(`src/halaman/admin/EditorPenilaian.jsx`). Yang bisa diubah:

- **Teks aspek**: nama, deskripsi, kegiatan PDP, mata kuliah, kegiatan Kemahasiswaan. Disimpan di
  tabel `Aspek` (migrasi `aspek_dari_layar`) dan menimpa teks di `curriculum.js`. Struktur aspek
  (kode, cluster, semester) serta menambah dan mengarsipkan aspek diatur terpisah; lihat Mengelola
  aspek CPMK. Aspek yang diarsipkan tidak bisa diubah penilaiannya sampai dipulihkan (409).
- **Komponen asesmen**: tambah (ID baru `<aspek>-<sumber>-B<n>`, mis. `A1-MK-B1`, tidak pernah
  diganti), ubah nama, sumber, jenis MK, ranah, status resmi/draft, dan urutan. Komponen yang
  **sudah dinilai** (punya nilai atau pernah tercatat di riwayat) tidak bisa diganti sumbernya;
  arsipkan lalu buat yang baru.
- **Hapus = arsip** (`Komponen.aktif = false`): tidak tampil dan tidak dihitung, nilainya tetap, dan
  bisa **dipulihkan** dari bagian *Arsip komponen*. Komponen tidak pernah dihapus dari basis data;
  setiap aspek wajib punya minimal satu komponen aktif.
- **Bobot**: dibagi otomatis, atau diatur manual dengan jumlah 100 (tombol *Bagi rata* membantu).

Sebelum menyimpan, layar menghitung **dampak**: hasil mahasiswa yang berubah, termasuk yang aspeknya
**menjadi belum lengkap** karena ada komponen baru (angkanya tidak berubah, tetapi status final dan
kelayakan sertifikat bisa gugur). Server menghitung ulang dari seluruh mahasiswa, termasuk nilai lama
komponen yang dipulihkan. Bila hasil angkatan terkunci atau aspek final manual ikut berubah, alasan
wajib.

**Siapa:** super admin menyimpan langsung (`POST /api/kurikulum/penilaian`). Admin biasa **selalu**
mengajukan (`UBAH_PENILAIAN`, lihat Persetujuan super admin), apa pun mahasiswanya; dosen ditolak 403.
Semua ditulis dalam satu transaksi: teks aspek, komponen, versi kurikulum baru, dan log
`UBAH_PENILAIAN` (sebelum/sesudah, alasan, dampak). `src/lib/penilaian.js` dipakai layar dan server
(`src/server/penilaian.js`), dan `ambilKurikulum()` kini juga membawa komponen arsip dan teks aspek.

Setelah menarik migrasi `aspek_dari_layar`, hentikan `npm run dev`, jalankan `npx prisma generate`,
lalu nyalakan lagi.

### Mengelola aspek CPMK

Aspek itu sendiri (A.1, B.1, ...), bukan hanya isinya, bisa **ditambah**, **diubah strukturnya**,
**diarsipkan**, dan **dipulihkan** (`src/halaman/admin/KelolaAspek.jsx`) dari tiga tempat:

- **Input & Import Nilai**: begitu semester dipilih, kartu *Aspek CPMK Semester N* (`AspekSemester`) muncul di
  bawah langkah memilih sasaran, walau angkatannya belum siap. Setiap aspek semester itu punya tombol **Edit**
  (teks dan komponen lewat `EditorPenilaian`), **Ubah** (kode, semester, cluster), dan **Hapus** (= arsip);
  **Tambah aspek** membuat aspek baru tepat di semester itu, dengan area dan cluster mengikuti aspek terakhir
  semester itu. Aspek semester itu yang pernah dihapus bisa dipulihkan dari kartu yang sama;
- **Penilaian & Bobot** (super admin), di bawah editor: panel *Struktur aspek*, *Tambah aspek*, *Aspek
  diarsipkan*;
- **Kurikulum CPMK** (panel Kemahasiswaan), di bawah halaman: panel yang sama (`app/admin/kurikulum/page.jsx`).

Formulir tambah meminta **area dulu** (A/B/C), lalu cluster di area itu; kodenya diusulkan **nomor kosong
berikutnya** di huruf area itu (Semester 1 berisi A.1–A.3 dan A.4 milik Semester 2, jadi aspek baru di
Semester 1 menjadi A.5) dan bisa diketik ulang sebelum disimpan. Menghapus aspek **tidak** merapatkan kode
aspek lain.

- **ID aspek tidak pernah berubah** dan tidak dipakai ulang, karena menempel di ID komponen (`A1-MK-T1`),
  nilai, dan penguncian. Aspek baru diberi huruf area dari cluster-nya + nomor berikutnya (`C3`), termasuk
  melewati ID aspek yang diarsipkan. Yang bisa diubah: **kode tampilan** (`A.1.`, tidak boleh kembar dengan
  aspek mana pun termasuk arsip), **semester** (1–3), dan **cluster** (CL1–CL6; area dan fase mengikuti
  cluster). Semester yang ditetapkan di sini menggantikan angka "menunggu konfirmasi" A.3/C.1 di `config.js`.
  Cluster, area, dan fase baru tidak bisa ditambah.
- **Tambah aspek** wajib menyertakan teks (nama, deskripsi, PDP/MK/Engagement opsional) dan **minimal satu
  komponen**, yang langsung dibuat dengan ID `<aspek>-<sumber>-B<n>`. Komponen lain ditambah sesudahnya di
  editor penilaian.
- **Hapus = arsip** (`Aspek.aktif = false`): aspek tidak tampil, tidak dihitung, tidak menerima nilai
  (import dan Input Manual menolak komponennya), dan tidak bisa diubah; komponen dan nilainya tidak
  disentuh. Aspek aktif terakhir tidak bisa diarsipkan. Tidak ada hapus permanen.
- **Angkatan terkunci tidak ikut berubah.** Saat angkatan dikunci, ID aspek aktif disimpan di
  `Angkatan.aspekSaatKunci` (migrasi `20261023060000_kelola_aspek` mengisi angkatan yang sudah terkunci
  dengan sepuluh aspek bawaan). `aspekUntuk(mahasiswa)` di `curriculum.js` memakai daftar itu untuk
  transkrip (`hitungTranskrip`) dan tampilan (`aspekTerlihat`), jadi aspek yang ditambah sesudahnya tidak
  ikut dan aspek yang diarsipkan sesudahnya tetap dihitung. Kode, semester, dan cluster yang diubah tetap
  berlaku untuk tampilan semua angkatan; dengan `MODE_AGREGASI` per semester, memindah semester bisa
  mengubah nilai akhir angkatan terkunci (bawaannya per aspek, aman).
- **Alasan selalu wajib** (minimal 10 karakter). Sebelum menyimpan, layar menghitung dampak terhadap
  seluruh mahasiswa yang termuat (`dampakAspek` di `src/lib/aspek.js`, memakai `denganAspekSementara` di
  `curriculum.js`), termasuk yang menjadi belum lengkap karena aspek baru masih kosong.
- **Siapa:** super admin menyimpan langsung (`POST /api/kurikulum/aspek`, isi `aksi: 'tambah' | 'ubah' |
  'arsipkan' | 'pulihkan'`). Admin biasa **selalu** mengajukan (`KELOLA_ASPEK`); dosen dan mahasiswa 403.
  Satu transaksi: baris `Aspek` (aspek bawaan dibuatkan baris berisi teksnya yang sekarang), komponen aspek
  baru, versi kurikulum baru, dan log `TAMBAH_ASPEK`/`UBAH_ASPEK`/`ARSIPKAN_ASPEK`/`PULIHKAN_ASPEK`.
  Aturannya ditulis sekali di `src/lib/aspek.js`, dipakai layar dan server (`src/server/aspek.js`).
- Keanggotaan cluster (`CLUSTER[].aspek`) dihitung ulang dari aspek aktif setiap kurikulum dipasang;
  nilai cluster di transkrip dihitung dari aspek milik mahasiswa itu.

Setelah menarik migrasi `kelola_aspek`, hentikan `npm run dev`, jalankan `npx prisma migrate deploy` lalu
`npx prisma generate`, kemudian nyalakan lagi.

### Mengubah bobot dari halaman Kurikulum

`/admin/kurikulum` (hanya Kemahasiswaan) mengubah dua hal:

- **Bobot per aspek.** Setiap aspek bisa *dibagi otomatis* atau *diatur manual*. Pada mode manual,
  porsi tiap komponen diisi dalam persen (0–100, paling banyak dua desimal) dan jumlahnya harus
  tepat 100. Beralih ke manual mengisi porsi yang sedang berlaku sebagai titik awal.
- **Cara membagi bobot otomatis**: `merata` atau `per-sumber`, beserta `BOBOT_SUMBER` dan
  `BOBOT_KOMPONEN_MK` (masing-masing berjumlah 100). Disimpan sebagai timpaan di tabel `Konfigurasi`.

Nilai yang diinput tidak pernah berubah; yang berubah porsinya, jadi nilai aspek, nilai akhir,
huruf mutu, dan kelayakan sertifikat **semua angkatan** ikut dihitung ulang. Karena itu:

- **Pratinjau dampak** dihitung langsung di layar sebelum menyimpan: berapa mahasiswa yang nilainya
  berubah (yang dibandingkan nilai bulat, seperti yang tampil), berapa yang naik atau turun huruf,
  dan berapa yang berubah kelayakan sertifikatnya, beserta contoh per mahasiswa.
- **Alasan wajib** (minimal 10 karakter) bila hasil mahasiswa di angkatan terkunci atau pada aspek
  yang ditandai final manual ikut berubah, sama dengan aturan data terkunci.
- **Versi.** Layar mengirim `VERSI_KURIKULUM` yang ia buka. Bila kurikulum sudah diubah orang lain
  sejak itu, penyimpanan ditolak (409) dan halaman harus dimuat ulang. Versinya dibaca dengan
  `SELECT … FOR UPDATE`, jadi dua penyimpanan bersamaan tidak saling timpa.
- **Satu transaksi**: bobot komponen (beserta `diubahOleh`/`diubahPada`), pengaturan, versi baru,
  dan catatan `UBAH_BOBOT` di log aktivitas. Bila basis data belum di-seed, isi kurikulum dari kode
  ditanam dulu di transaksi yang sama.

Pemeriksaan dan pratinjau ditulis sekali di `src/lib/bobot.js` dan dipakai layar maupun server
(`src/server/bobot.js`, `POST /api/kurikulum/bobot`); server menghitung ulang dampaknya dari seluruh
mahasiswa dan tidak memercayai hitungan layar.

## Input nilai

Halaman `/admin/nilai` menuntut **semester dipilih lebih dahulu** — selama belum ada tombol
semester yang dipilih (langkah 1), area kerja tidak ditampilkan sama sekali. Alasannya bukan kosmetik: tiap aspek CPMK
hanya dinilai pada satu semester, jadi tanpa semester sistem tidak tahu komponen mana yang
boleh diisi.

Angkatan juga harus sudah sampai semester itu. Angkatan yang Semester 1-nya belum tiba, atau yang belum
sampai semester terpilih, tidak membuka area kerja; layar menyebut kapan semesternya dimulai. Pemeriksaannya
memakai `semesterKalender`, bukan `semesterAktif`: `semesterAktif` dibatasi minimal 1
(`turunkanSemesterAktif`), jadi dulu angkatan yang belum mulai lolos gerbang Semester 1, ditulis "Kini di
Semester 1", dan nilainya bisa diisi sebelum semesternya tiba. Angkatan bawaan adalah angkatan terbaru yang
sudah mulai dan punya mahasiswa; dulu angkatan terbaru apa pun, sehingga halaman dibuka dengan "Tidak ada
mahasiswa pada pilihan ini".

Server belum ikut memeriksa ini. `semesterDari()` di `src/server/muat.js` masih memakai
`turunkanSemesterAktif`, jadi nilai Semester 1 untuk angkatan yang belum mulai tetap diterima bila dikirim
langsung ke API. Penjaganya perlu ditambahkan di back-end.

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
utuh** setelah dikonfirmasi (dulu tombol Rollback langsung membatalkan batch). Batch bertahan
setelah halaman dimuat ulang dan ikut tersinkron antar tab — lihat bagian Penyimpanan perubahan
di bawah. Tombol **Hapus semua perubahan** menghapus seluruhnya.

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

Halaman diberi `key` dari parameter alamatnya (`app/admin/nilai/page.jsx`). App Router mempertahankan state
komponen bila yang berubah hanya parameter, sedangkan pilihan halaman ini dibaca dari alamat hanya saat
dipasang. Tanpa `key`, tautan lonceng yang diklik saat Input Nilai sudah terbuka hanya mengganti alamat, dan
semester serta angkatan di layar tetap yang lama.

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
- **Dosen** tetap boleh mengirim usulan untuk data terkunci selama mahasiswanya belum lewat
  Semester 3 (aspek final manual); yang memutuskan tetap Kemahasiswaan. Menyetujui usulan seperti
  itu berarti mengubah data terkunci, jadi catatan keputusannya wajib minimal 10 karakter dan
  berfungsi sebagai alasan. Angkatan yang dikunci selalu sudah lewat Semester 3, jadi untuk
  angkatan terkunci dosen tidak lagi bisa mengusulkan, dan perubahan oleh admin biasa menunggu
  persetujuan super admin (lihat Persetujuan super admin).
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
| `UBAH_BOBOT` | bobot disimpan dari halaman Kurikulum | alasan, bobot tiap aspek dan pengaturan sebelum/sesudah, ringkasan dampak, sampai 20 contoh |
| `AJUKAN_PERSETUJUAN` | admin biasa mengajukan permintaan kepada super admin | aksi, judul, alasan, jumlah mahasiswa yang tersentuh |
| `PUTUSKAN_PERSETUJUAN` | super admin menyetujui atau menolak (pelakunya super admin) | aksi, keputusan (disetujui/ditolak/gagal), catatan, pesan galat, id pengaju |
| `TARIK_PERMINTAAN` | admin menarik permintaannya sendiri | — |
| `UBAH_PENILAIAN` | penilaian satu aspek disimpan dari Input Manual | alasan, teks aspek sebelum/sesudah, komponen ditambah/diubah/diarsipkan/dipulihkan, bobot sebelum/sesudah, ringkasan dampak |
| `TAMBAH_ASPEK`, `UBAH_ASPEK`, `ARSIPKAN_ASPEK`, `PULIHKAN_ASPEK` | aspek CPMK ditambah, diubah strukturnya, diarsipkan, atau dipulihkan (lihat Mengelola aspek CPMK) | alasan, ID, kode, nama, struktur sebelum/sesudah (kode, cluster, semester, aktif), komponen yang ditambah, ringkasan dampak |
| `UBAH_PERIODE` | super admin memindahkan periode akademik (lihat Periode akademik) | periode sebelum/sesudah, alasan |
| `UBAH_AKSES` | super admin mencabut atau memulihkan akses akun (lihat Panel Super Admin › Akses Pengguna) | email, peran, aktif sebelum/sesudah, alasan |
| `HAPUS_AKUN` | super admin menghapus permanen akun yang aksesnya sudah dicabut dan belum punya data | email, peran, nama, NIM/NIP, prodi, angkatan, alasan |
| `TAMBAH_AKUN` | akun baru dibuat dari Akses Pengguna atau Data Master | email, peran, nama, NIM/NIP, prodi, angkatan (tanpa sandi) |
| `UBAH_AKUN` | data mahasiswa diubah dari Data Master | NIM, nama/email/prodi/angkatan sebelum dan sesudah (hanya yang berubah), alasan |
| `UBAH_IZIN` | super admin memberi atau mencabut izin kelola data master (lihat Data master) | email, izin, sebelum/sesudah, alasan |
| `TAMBAH_ANGKATAN`, `UBAH_ANGKATAN` | angkatan ditambah atau labelnya diubah | kode, label, periode; untuk ubah: label sebelum/sesudah dan alasan |
| `TAMBAH_FAKULTAS`, `UBAH_FAKULTAS` | fakultas ditambah atau namanya diubah | nama; untuk ubah: sebelum/sesudah dan alasan |
| `TAMBAH_PRODI`, `UBAH_PRODI` | program studi ditambah atau diubah | nama, jenjang, fakultas; untuk ubah: hanya yang berubah, sebelum/sesudah, dan alasan |

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
`waktu` dan `aktorId` (migrasi `indeks_audit`). Halaman Log Aktivitas (`Log.jsx`, di `/admin/log` dan
`/super/log`) membaca pintu ini; susunannya ada di Panel Kemahasiswaan › Tampilan.

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
- **Bahasa** mulai dari bawaan jalurnya, sama dengan HTML dari server: halaman masuk Inggris
  (penggunanya tidak hanya orang Indonesia), panel Indonesia (`bahasaBawaan()` di
  `src/lib/bahasa.jsx`), bukan bahasa peramban. Pilihan tersimpan baru dipasang setelah menempel
  dan berlaku di semua halaman. Tanpa pilihan, masuk dari halaman masuk yang berbahasa Inggris
  tetap membuka panel berbahasa Indonesia.
- **Hanya pilihan yang disimpan**: bahasa ditulis ke `localStorage` (`sk5c.bahasa.pilihan`)
  hanya saat pengguna memakai pemilih ID/EN, termasuk menekan bahasa yang sedang tampil. Bawaan
  tidak pernah ditulis; kalau ditulis, ia membeku menjadi "pilihan" dan bawaan halaman masuk tidak
  akan pernah tampil lagi. Kunci lama `sk5c.bahasa` menyimpan bawaan seperti itu, jadi isinya
  dibuang saat halaman dibuka.
- **Tulis setelah baca**: sesi dan tema baru ditulis ke `localStorage` setelah pembacaan awal
  selesai. Tanpa penjagaan itu, render pertama menimpa pilihan yang tersimpan.
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
  tidak terdeteksi pemindai `test:bahasa`, jadi dijaga manual di bagian akhir `teks.js`. Kalimat yang datang
  dari modul data juga didaftarkan di `scripts/bahasa.mjs`: `DARI_DATA` untuk kontak layanan, judul grafik,
  label `ingest.js`, dan jenis penilaian, `DARI_ATURAN` untuk kalimat `rules.js`. Kata tunggal berhuruf kecil
  dilewati pemindai kecuali ada di daftar kata yang tetap diperiksa (siap, belum, sementara, pada, draft,
  usulan).
- Kalimat berisian disusun dengan penanda, bukan disambung: `ChartFrame` menerima `subtitleNilai` untuk
  isian `subtitle`, dan syarat sertifikat (`kelayakanSertifikat` di `rules.js`) membawa `labelT`, `alasanT`,
  dan `ringkasT` berupa pasangan `[kunci, isian]` di samping `label`, `alasan`, dan `ringkas` yang lama.
  Layar memakai pasangan itu (`t(...s.labelT)`).
- `KartuAngka` tidak memanggil `t()`; pemanggilnya mengirim teks yang sudah diterjemahkan. Dulu Overview
  menerjemahkan kalimat yang sudah diterjemahkan, dan kamus memperingatkan kalimat Inggris yang tidak
  dikenalnya.
- Isi data (nama fakultas, program studi, angkatan) tidak dilewatkan ke `t()`. `FilterBar` hanya
  menerjemahkan pilihan "Semua"; dulu seluruh pilihan dilewatkan ke `t()` dan memicu peringatan "belum ada
  padanan Inggris" untuk nama fakultas seperti "Teknik & Informatika".
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
- Pemilih juga ada di pojok kanan atas halaman masuk (`nada="onbrand"`), di atas alas gelap
  `--surface` 62% supaya label yang tidak aktif tetap minimal 4,5:1 saat cahaya sian aurora lewat
  di belakangnya (terukur paling rendah 5,98:1; tanpa alas hanya 4,50:1 di HP).

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
- **Aksen merek toska**, menggantikan emas. Ungu sempat dicoba, tetapi di atas navy terasa redup:
  keduanya dingin dan gelap-terangnya berdekatan. Dari 220 palet ber-navy populer di Color Hunt,
  ungu hanya muncul di 8; toska termasuk pasangan yang paling sering dipakai, dan WGSN/Coloro memilih
  Transformative Teal (paduan biru tua dan hijau aqua) sebagai warna tahun 2026. Toska dipilih dari
  empat calon (pink, koral, toska, lime) yang dicoba langsung di aplikasi; koral ditolak karena mirip
  merah galat dan oranye Area B, lime karena jadi hijau zaitun kusam di latar terang.
  - `--accent` (`#5eead4`) untuk tulisan, garis, dan isian di latar gelap: tulisan VIBE di navbar,
    footer, laci, dan menu samping super admin, label Super Admin, garis menu aktif, lencana jumlah,
    tombol antrean (5,52:1 di `--brand`, 5,33:1 di `--brand` gelap).
  - `--accent-on` (`#042f2e`, 9,78:1) untuk tulisan di atas isian `--accent`.
  - `--accent-ink` (`#0f766e`, 5,47:1 di kartu putih) untuk tulisan toska di latar terang, seperti
    VIBE di menu samping mahasiswa; di tema gelap sama dengan `--accent`.
  - Di halaman masuk judul VIBE terendah 6,14:1 terhadap aurora yang bergerak.
  - Toska bersebelahan dengan hijau Area C (`#1baf7a`), tetapi jauh lebih muda dan kebiruan, dan aksen
    tidak dipakai di grafik.
- **Toska bergradasi tipis**, satu rona dari terang ke pekat, supaya lebih berkilau tanpa menambah warna:
  - Tulisan VIBE memakai `.teks-vibe`, yaitu teks bergradasi `--gradasi-toska` (`#99f6e4` → `#5eead4` →
    `#2dd4bf`) dengan `background-clip: text`. Di latar terang ditambah `.teks-vibe-terang`, yang memakai
    `--gradasi-toska-tua` (`#0d9488` → `#115e59`).
  - Warna polos dari kelas `text-[...]` tetap jadi cadangan bila peramban tidak mendukung teks bergradasi,
    dan juga dipakai saat mode kontras tinggi Windows.
  - Tulisan VIBE adalah nama merek, jadi WCAG mengecualikannya, tetapi tetap dijaga di atas 3:1: paling
    rendah 4,24:1 di navbar gelap dan 3,74:1 di kartu putih.
  - Tombol antrean dan lencana jumlah memakai `.isi-toska` dengan gradasi yang sama; tulisan di atasnya
    paling rendah 7,77:1.
  - Teks kecil toska dan garis menu aktif (bayangan 3px) tetap polos, karena di ukuran itu gradasinya tidak
    terlihat.
  - Tanda huruf V di kotak sempat dicoba di depan tulisan VIBE, lalu dilepas.
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
- Sorotan menu samping mahasiswa dan super admin (`.menu-sorot`, komponen `MenuSamping.jsx`)
  digambar tiap butir sendiri dengan `::before`/`::after` di bawah isinya (`isolation: isolate`).
  Warnanya dari variabel `--sorot-latar`, `--sorot-garis`, dan `--sorot-teks`; di menu berlatar
  gelap (`.menu-sorot-gelap`, panel super admin) latarnya putih tembus pandang dan garisnya toska.
  Butir aktif (`.menu-aktif`)
  menampilkannya penuh; butir lain memunculkannya saat ditunjuk atau difokus: latarnya memudar
  masuk sambil sedikit membesar, lalu garis kirinya tergambar dari tengah ke atas dan bawah
  (`clip-path`). Efek tunjuk hanya untuk perangkat berkursor (`hover: hover`) supaya ketukan di
  HP tidak meninggalkan sorotan.
- Sorotan **tidak meluncur** antarbutir. Saat diklik, butir tujuan sudah tersorot karena
  ditunjuk, jadi sorotan yang meluncur dari butir lama tampak dobel; kini sorotan lama memudar
  dan yang baru tetap di tempat. Sorotan pindah seketika saat diklik (`tujuan`), sedangkan
  `aria-current` tetap mengikuti halaman yang benar-benar terbuka.
- Semua gerak dimatikan oleh blok `prefers-reduced-motion` di akhir `index.css`.
- Semester di Peta Perjalanan membuka dan menutup lewat `Lipat.jsx`: tingginya meluncur dengan
  baris grid `0fr` ↔ `1fr` (tanpa mengukur tinggi) dan isinya memudar. Isi baru dipasang saat
  dibuka dan dilepas sesaat setelah animasi tutup selesai. Selama menutup, `id`-nya langsung
  dilepas dan isinya `inert`, jadi bagi pembaca layar, Tab, dan uji, semester itu sudah tertutup.
- Di halaman masuk, logo PDP ada di pita kertas yang kakinya tergulung ke luar (gulungan di depan
  kertas), dengan tongkat berkenop toska (`--warna-kenop` `#14b8a6`, lebih pekat dari `--accent` supaya
  gradasi kenopnya terbaca) di kedua ujung gulungan. Saat halaman dibuka, pita digelar sekali dari tepi
  atas panel kiri: gulungan turun dan kertas terbuka mengikutinya, lalu pita memantul kecil. Kertas
  dibuka oleh "jendela" ber-`overflow: clip` (`.pita-jendela`) yang turun bersama gulungan (keyframe
  `pita-gulung` yang sama), sementara kertas di dalamnya digeser balik sejauh yang sama
  (`pita-kertas-buka`), jadi kertas tampak diam. Semuanya `transform`, digeser compositor tanpa raster
  ulang. Dulu kertasnya dibuka dengan `clip-path` beranimasi, dan Chrome menjalankannya lewat paint
  worklet yang me-raster ulang kertas, bayangan, dan logonya di setiap bingkai. Hasil uji A/B di halaman
  yang sama: 110 tugas raster dalam 0,8 detik (kini 0), utas compositor 1,6 kali lebih sibuk, dan ada
  bingkai yang tampil tanpa seluruh pembaruannya, sehingga gerak turunnya terasa patah-patah. Rupanya
  tidak berubah: potret di sembilan titik waktu animasi sama persis. Jangan menganimasikan `clip-path`
  atau `mask` pada pita ini. Jarak tempuh gulungan diambil dari
  `--tinggi-kertas` (194px: ruang atas 76 + logo 84 + ruang bawah 34), jadi ubah bersama bila
  ukuran logo atau ruangnya diganti. Pita menjorok 24px ke balik tepi atas supaya tetap menempel
  saat memantul. Saat kurangi gerak aktif, animasinya dilepas sama sekali (`animation: none`),
  karena blok global hanya memendekkan durasi dan jeda awalnya tetap berjalan.
- Setelah digelar, pita diterpa angin dalam siklus 8 detik: hembusan datang cepat, lalu reda pelan.
  Pita berayun dari titik gantungnya (`rotate` + `skewX`), tepi kiri-kanannya bergelombang 4px
  dengan ombak yang merambat ke bawah, dan bayangan lipatannya menebal saat hembusan. Logo tidak
  ikut melengkung supaya tetap tajam. Semua animasi angin berdurasi dan berjeda sama, dan hanya
  menggerakkan `transform`, `translate`, dan `opacity` supaya dikerjakan GPU (di bawah 1% utas
  utama; versi dengan `mask`/`background-position` beranimasi memakan sekitar 25%). Dua jebakan
  yang sudah dicoba: lekuk yang diperbesar-perkecil dengan `scale` memunculkan garis tipis terang
  di tepi kertas, dan `opacity` yang dianimasikan di induk unsur yang bergeser membuat keduanya
  kembali dikerjakan utas utama. Rinciannya ada di komentar `index.css` › pita logo masuk.
- Tombol Masuk (`.tombol-masuk`) hanya bergerak saat dipakai, jadi tidak menambah beban saat halaman
  dibiarkan terbuka. Saat ditunjuk (hanya perangkat berkursor), gradasinya bergeser, kilau menyapu
  sekali, cahaya di bawahnya menguat ke sian, dan panahnya maju 4px; saat ditekan, tombolnya mengecil
  ke 98%. Saat memverifikasi, tombolnya mati tanpa dipudarkan: pemutar berputar dan kilau menyapu
  berulang, satu-satunya umpan balik gerak di HP. Kilau (`::before`, di bawah teks) ikut menerangkan
  latar teks, jadi gradasinya sengaja cukup gelap (`#143f99 → #2048d4 → #0b5394`) dan kilaunya hanya
  0,2: kontras teks putih terburuk saat puncak kilau lewat 4,62:1 (tanpa kilau minimal 7,08:1),
  diukur di setiap posisi kilau dan gradasi, di layar laptop dan HP. Versi pertama (gradasi
  `#12508f → #2563eb → #0b74c6`, kilau 0,32) menurunkannya ke 2,8:1, jadi bila warna atau kilaunya
  diubah, ukur ulang. Saat kurangi gerak aktif, kilau dilepas dan pemutarnya berhenti; teks
  "Memverifikasi…" tetap menandai prosesnya.

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
- Kemahasiswaan mencetak sertifikat atas nama mahasiswa di halaman **Cetak Sertifikat**
  (`/admin/sertifikat`), untuk mahasiswa yang kesulitan mencetak sendiri. Halaman ini bisa dicari
  per nama atau NIM, disaring per angkatan dan kelayakan, dan menerima `?cari=` (dipakai tautan
  dari halaman detail mahasiswa). Syaratnya sama persis dan lembarnya sama
  (`LembarSertifikat.jsx`). Lembar itu baru dipasang langsung di `<body>` saat tombol ditekan dan
  dilepas lagi pada `afterprint`. Selama terpasang, aturan cetak di `index.css` menyembunyikan
  seluruh aplikasi, sehingga hanya sertifikat yang tercetak.
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
- Foto tersimpan bisa dilihat besar lewat `LihatFoto.jsx` (tekan fotonya atau tombol Lihat). Yang
  ditampilkan potongan 256 px itu sendiri, paling lebar 320 px supaya tidak pecah. Penampilnya
  dipasang di `<body>` lewat portal supaya tidak terpotong kartu, ditutup dengan Esc, tombol X,
  atau klik latar, dan fokus kembali ke tombol pemicunya.
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
| 8 | Kurikulum, Angkatan & Sertifikat, Log | sebagian: halaman Angkatan, ubah bobot di halaman Kurikulum, aturan data terkunci, pencatatan dan pembacaan log, halaman Log Aktivitas, serta kurikulum yang dibaca dari basis data sudah ada |
| 9 | Poles cetak, responsif, aksesibilitas | sebagian (cetak & reduced-motion sudah) |
| — | Panel Kemahasiswaan lainnya: Overview, Data Mahasiswa beserta detailnya, Program Studi, Persetujuan Nilai Dosen | selesai |
| — | Panel dosen: Beranda, Penilaian (usulan nilai), Riwayat Pengiriman | selesai; tampilan baru: kerangka, Penilaian, footer, dan menu aksesibilitas selesai, Beranda dan Riwayat Pengiriman menyusul (lihat Panel Dosen) |
| — | Basis data MySQL: 21 tabel, 12 migrasi, 30 pintu API, sesi cookie | selesai |
| — | Mengelola aspek CPMK: tambah, ubah kode/semester/cluster, arsip, pulihkan | selesai; super admin langsung, admin biasa lewat persetujuan, angkatan terkunci tetap memakai aspek saat dikunci |
| — | Data master (angkatan, fakultas, prodi, mahasiswa) oleh super admin dan admin yang diberi izin | selesai; tanpa hapus, NIM tetap (lihat Data master) |
| — | Penilaian per aspek dari Input Manual (teks aspek, komponen, arsip, bobot) | selesai; super admin langsung, admin biasa lewat persetujuan |
| — | Super admin | sebagian: Tahap 1 (akun berperan `SUPER_ADMIN`, penjaga `'superadmin'`) dan Tahap 2 (persetujuan perubahan data mahasiswa yang sudah lewat Semester 3, halaman Persetujuan Admin, dosen lepas tangan) selesai; halaman pengawasan selesai di panel `/super` (Pusat Kendali, Persetujuan, Log Aktivitas, Peran & Wewenang, Aturan Sistem) |

Yang belum dikerjakan:

- mengubah indikator perilaku dan pengaturan selain bobot (ambang sertifikat, mode penguncian,
  mode agregasi, dan lain-lain) dari layar; menambah cluster, area, atau fase baru. Aspek (tambah,
  kode, semester, cluster, arsip), teks aspek, komponen, dan bobot sudah bisa diubah;
- halaman bagi mahasiswa untuk mengumpulkan berkas (kini baris `Pengumpulan` diisi langsung di
  basis data);
- penerbitan sertifikat yang membekukan nomor, tanggal, dan nilai — kini kelayakan dihitung
  langsung, jadi sertifikat ikut berubah bila nilai diubah sesudah angkatan dikunci;
- ganti dan lupa kata sandi di aplikasi ini, masuk lewat SSO kampus, serta pembatasan percobaan
  masuk;
- menghapus angkatan, fakultas, atau prodi, mengganti NIM, dan mengelola akun dosen dari panel
  Kemahasiswaan. Angkatan, fakultas, prodi, dan data mahasiswa sudah bisa ditambah dan diubah oleh admin
  yang diberi izin super admin (lihat Data master).
