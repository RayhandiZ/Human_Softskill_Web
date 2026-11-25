# VIBE

Dashboard pemantauan **capaian pembelajaran (CPMK) softskill** mahasiswa Universitas Multimedia Nusantara pada Semester 1
sampai 3. VIBE adalah singkatan dari Values, Intelligence, Behavior & Excellence.

Mahasiswa tidak mengisi nilainya sendiri. Nilai datang dari dua program asesmen kurikuler yang berjalan paralel, lalu diolah
menjadi 10 aspek CPMK, transkrip, dan sertifikat.

| Semester | PDP (Personal Development Program) | MK Humaniora/Kebangsaan |
|---|---|---|
| 1 | PDP-1: Character & Mentoring 5C | Religiositas |
| 2 | PDP-2: Teamwork & Leadership | Pancasila |
| 3 | PDP-3: Effective Communication | Civics |

- Sumber ketiga, Kemahasiswaan (Student Service), masih ada di kode dan basis data, tetapi tidak punya komponen nilai, jadi
  tidak ditampilkan.
- 5C adalah materi Mentoring di Semester 1 yang menyumbang komponen ke aspek A.1 sampai A.3, bukan sumbu penilaian.
- Komponen Mentoring 5C dan penilaian fasilitator Teamwork & Leadership termasuk PDP walau ID-nya memakai `-ENG-` (misalnya
  `A1-ENG-HADIR`), karena nilai dan riwayat merujuk ke ID itu.

**Teknologi:** Next.js 16 (App Router), React 19, Tailwind CSS 3, Prisma 6 dengan MySQL, Recharts.

## Daftar isi

1. [Fitur per peran](#fitur-per-peran)
2. [Menjalankan](#menjalankan)
3. [Akun pengembangan](#akun-pengembangan)
4. [Arsitektur](#arsitektur)
5. [Aturan penilaian](#aturan-penilaian)
6. [Alur kerja](#alur-kerja)
7. [Panel](#panel)
8. [Catatan kode](#catatan-kode)
9. [Yang belum selesai](#yang-belum-selesai)

Bagian 6 sampai 8 adalah catatan pengembang. Komentar di kode merujuk ke sana dengan pola `lihat README.md › Nama bagian`.

## Fitur per peran

| Peran | Halaman | Yang bisa dilakukan |
|---|---|---|
| Mahasiswa | Beranda, Transkrip, Peta Perjalanan, Riwayat, Sertifikat, Profil | membaca nilai dan statusnya, mengajukan koreksi nilai, meminta akses cetak sertifikat lalu mencetaknya |
| Dosen | Beranda, Unggah Nilai, Profil | memantau kelasnya dan mengunggah rekap Excel yang langsung tersimpan; perbaikan untuk angkatan yang sudah selesai atau disahkan, atau aspek yang sudah final, diajukan ke Super Admin |
| Admin | Beranda, Data Mahasiswa, Nilai Mahasiswa, Cetak Sertifikat, Angkatan, Kurikulum CPMK, Program Studi, Data Master, Log Aktivitas, Permintaan Saya | melihat nilai angkatan yang terbuka untuknya, menjadi lapis pertama koreksi nilai dan akses cetak sertifikat, mencabut akses cetak, mencetak sertifikat; tanda final, bobot, penilaian aspek, aspek CPMK, dan pengesahan angkatan diajukan ke Super Admin |
| Super Admin | Pusat Kendali, Persetujuan, Penilaian & Bobot, Akses Pengguna, Log Aktivitas, Peran & Wewenang, Aturan Sistem, ditambah seluruh panel admin | menyimpan, mengimpor, dan membatalkan nilai; memutuskan semua permintaan dan lapis kedua; mengelola akun, data master, periode akademik, syarat sertifikat, dan wewenang |

Panel admin dipegang Biro Kemahasiswaan dan Biro Humaniora. Di layar semua akun admin bernama **Admin**, tetapi setiap orang
tetap masuk dengan akunnya sendiri (misalnya admin1 dan admin2) dan dibedakan lewat emailnya, termasuk di Log Aktivitas.

Rinciannya ada di [Hak peran](#hak-peran) dan di halaman Peran & Wewenang di aplikasi.

## Menjalankan

Butuh Node.js 22.23.4 atau lebih baru di jalur 22 (atau 24 LTS) dan MySQL, misalnya dari XAMPP.

1. Buat berkas `.env`. Jangan pernah meng-commit-nya, karena repo ini publik.

   | Variabel | Isi |
   |---|---|
   | `DATABASE_URL` | koneksi MySQL, misalnya `mysql://USER:SANDI@localhost:3306/NAMA_DB` |
   | `AUTH_SECRET` | kunci acak untuk menandatangani cookie sesi |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_PENGIRIM` | pengirim email lupa kata sandi. Tanpa `SMTP_HOST`, `next dev` mencetak emailnya di konsol server |
   | `APP_URL` | alamat situs untuk tautan di email, wajib di produksi |

2. Pasang paket, siapkan basis data, lalu jalankan:

   ```bash
   npm install
   npx prisma migrate dev   # membuat tabel; di Windows hentikan npm run dev lebih dulu
   npm run db:seed          # data master, kurikulum, dan akun awal; aman diulang
   npm run dev              # http://localhost:3000
   ```

- `npm run build` lalu `npm start` untuk versi produksi.
- `npm run db:seed:contoh` mengisi 290 mahasiswa contoh, tetapi **menghapus seluruh isi basis data** lebih dulu.
- Sesudah menarik perubahan skema: hentikan `npm run dev`, jalankan `npx prisma migrate deploy` dan `npx prisma generate`, lalu
  nyalakan lagi. Di Windows `generate` gagal (EPERM) selama server dev masih berjalan, dan server yang sudah jalan tetap
  memakai Prisma Client lama sampai dinyalakan ulang.
- **Versi.** Tetap di Prisma 6.19.3. Jangan ikuti kotak "Update available": versi 7 dan 8 butuh migrasi dan merusak semua
  kueri. Next.js minimal 16.4.3, karena versi di bawahnya punya celah eksekusi kode jarak jauh. Blok `overrides` di
  `package.json` memaksa `deepmerge-ts` 8.0.2 di dalam `@prisma/config`. `npm audit` harus menjawab 0 celah.

### Uji

| Perintah | Isi |
|---|---|
| `npm run smoke` | merender setiap rute di DOM sungguhan (jsdom), tanpa data lalu dengan data contoh |
| `npm run assert` | memeriksa transkrip mematuhi aturan R2, R3, R4, dan R8 |
| `npm run verify` | mencetak seluruh angka scoring untuk enam persona |
| `npm run test:nilai` | simpan batch, rollback, dan validasi import |
| `npm run test:profil` | penyimpanan profil |
| `npm run test:bahasa` | setiap kalimat Indonesia punya padanan Inggris; `npm run bahasa:sync` menulis kunci baru yang masih kosong |
| `npm run test:db` | setiap pintu API terhadap MySQL |

Semua uji kecuali `test:db` berjalan tanpa server dan basis data (mode lokal, `src/lib/modeData.js`). `test:db` memakai akun dari
`npm run db:seed` (bila email admin sudah diganti: `UJI_ADMIN_EMAIL=... npm run test:db`), membuat data uji berawalan UJI, lalu
menghapusnya lagi.

## Akun pengembangan

Dibuat `npm run db:seed`, semuanya bersandi `umn12345`. Ganti sebelum dipakai sungguhan.

| Peran | Email |
|---|---|
| Mahasiswa | `rayhandi.zulmi@student.umn.ac.id` |
| Dosen | `simon.petrus@lecturer.umn.ac.id` |
| Admin | `admin@umn.ac.id` |
| Super Admin | `super.admin@umn.ac.id` |

## Arsitektur

```
halaman (peramban) → app/api/... → src/server/... → Prisma (src/server/db.js) → MySQL
```

- Seluruh halaman adalah komponen klien. Peramban tidak pernah bicara langsung dengan MySQL.
- **Sesi:** `/api/masuk` memasang cookie httpOnly bertanda tangan (`AUTH_SECRET`, 8 jam, diperpanjang setiap halaman dimuat).
  Setiap pintu API membaca ulang akunnya dari basis data, jadi akun yang dicabut atau berganti peran langsung berlaku.
- **Data master** (angkatan, fakultas, prodi, kurikulum, periode, sakelar wewenang) dibaca `app/layout.jsx` di server setiap
  halaman dimuat.
- **Data isian** (mahasiswa, nilai, pengajuan, profil) dimuat `PemuatData.jsx` dari `/api/data`, disaring per peran di
  `src/server/muat.js`: super admin melihat semuanya, admin angkatan yang terbuka untuknya, dosen kelasnya, mahasiswa dirinya.
- **Penulisan** lewat `src/lib/store.js`: kirim ke API, lalu data dimuat ulang. Semua aturan diperiksa ulang di server.

```
app/                  alamat website (rute Next); tiap page.jsx hanya menunjuk berkas di src/halaman
app/api/              pintu API, tipis, memanggil src/server
src/halaman/          isi halaman, satu folder per panel, bernama sama dengan alamatnya
  akun/               Masuk, LupaSandi, AturSandi, dan Profil (dipakai keempat panel)
  mahasiswa/          /mahasiswa
  dosen/              /dosen
  admin/              /admin
  super/              /super
  <panel>/bagian/     potongan yang bukan halaman menu: lonceng, lembar cetak, formulir, editor
src/components/       komponen bersama: Ui.jsx (pola halaman), Icons.jsx, PilihanTurun, FilterBar
  kerangka/           bingkai di sekeliling isi: menu samping, bilah atas dan tombolnya, laci HP, footer,
                      tombol bantuan, kerangka halaman masuk
  charts/             grafik
src/lib/              domain: config → curriculum → scoring → rules, plus store, data, auth, bahasa, teks
src/server/           hanya berjalan di server: sesi, wewenang, persetujuan, baca/tulis basis data
prisma/               skema, migrasi, seed.js, seed-contoh.js, tanam-kurikulum.js
scripts/              skrip uji; dataContoh.js hanya dipakai uji dan db:seed:contoh
public/               kampus-umn.webp, latar halaman masuk
```

Nama berkas halaman sama dengan label menunya di website. Menu samping dan bilah atas tiap panel ada di layout-nya
(`MahasiswaLayout`, `DosenLayout`, `AdminLayout`, `SuperLayout`).

| Panel | Menu di website | Alamat | Berkas di `src/halaman/` |
|---|---|---|---|
| Semua | Masuk, Lupa kata sandi, Buat kata sandi baru | `/masuk`, `/lupa-sandi`, `/atur-sandi` | `akun/Masuk.jsx`, `akun/LupaSandi.jsx`, `akun/AturSandi.jsx` |
| | Profil | `/<panel>/profil` | `akun/Profil.jsx` |
| Mahasiswa | Beranda | `/mahasiswa` | `mahasiswa/Beranda.jsx` |
| | Transkrip | `/mahasiswa/transkrip` | `mahasiswa/Transkrip.jsx`, isinya `mahasiswa/bagian/IsiTranskrip.jsx` |
| | Peta Perjalanan | `/mahasiswa/peta` | `mahasiswa/PetaPerjalanan.jsx` |
| | Riwayat | `/mahasiswa/riwayat` | `mahasiswa/Riwayat.jsx` |
| | Sertifikat | `/mahasiswa/sertifikat` | `mahasiswa/Sertifikat.jsx` |
| Dosen | Beranda | `/dosen` | `dosen/Beranda.jsx` |
| | Unggah Nilai | `/dosen/nilai` | `dosen/UnggahNilai.jsx` |
| Admin | Beranda | `/admin` | `admin/Beranda.jsx` |
| | Data Mahasiswa | `/admin/mahasiswa` | `admin/DataMahasiswa.jsx`; satu mahasiswa: `admin/DetailMahasiswa.jsx` |
| | Nilai Mahasiswa (Super Admin: Input & Import Nilai) | `/admin/nilai` | `admin/NilaiMahasiswa.jsx` |
| | Persetujuan Nilai Dosen | `/admin/usulan` | `admin/PersetujuanNilaiDosen.jsx` |
| | Permintaan Saya (Super Admin: Persetujuan Admin) | `/admin/persetujuan` | `admin/Persetujuan.jsx` |
| | Cetak Sertifikat | `/admin/sertifikat` | `admin/CetakSertifikat.jsx` |
| | Angkatan | `/admin/angkatan` | `admin/Angkatan.jsx` |
| | Kurikulum CPMK | `/admin/kurikulum` | `admin/KurikulumCPMK.jsx` |
| | Program Studi | `/admin/program-studi` | `admin/ProgramStudi.jsx` |
| | Data Master | `/admin/data-master` | `admin/DataMaster.jsx` |
| | Log Aktivitas | `/admin/log` | `admin/LogAktivitas.jsx` |
| Super Admin | Pusat Kendali | `/super` | `super/PusatKendali.jsx` |
| | Persetujuan | `/super/persetujuan` | `admin/Persetujuan.jsx` |
| | Penilaian & Bobot | `/super/penilaian` | `super/PenilaianBobot.jsx` |
| | Akses Pengguna | `/super/akses` | `super/AksesPengguna.jsx` |
| | Log Aktivitas | `/super/log` | `admin/LogAktivitas.jsx` |
| | Peran & Wewenang | `/super/wewenang` | `super/PeranWewenang.jsx` |
| | Aturan Sistem | `/super/aturan` | `super/AturanSistem.jsx` |

Ketergantungan satu arah: `curriculum → scoring → rules → UI`.

| Mencari | Berkas |
|---|---|
| Angka kebijakan (ambang, mode bobot, dan lainnya) | `src/lib/config.js` |
| Fase, area, cluster, aspek, komponen bawaan | `src/lib/curriculum.js` |
| Rumus nilai dan huruf mutu | `src/lib/scoring.js` |
| Aturan R1 sampai R9, validasi import, kelayakan sertifikat | `src/lib/rules.js` |
| Kamus Indonesia ke Inggris | `src/lib/teks.js` |
| Persetujuan Super Admin | `src/server/persetujuan.js` |
| Sakelar dan matriks wewenang | `src/lib/wewenang.js`, `src/server/wewenang.js` |
| Log aktivitas | `src/server/log.js`, `src/lib/labelLog.js` |
| Menu samping, bilah atas, laci HP, footer, tombol bantuan | `src/components/kerangka/` |

Menambah halaman: buat rutenya di `app/`, isinya di `src/halaman/<panel>/` dengan nama seperti label menunya, **dan**
daftarkan di `scripts/smoke.jsx`, karena uji merender komponen tanpa server Next. Tautan yang perlu tahu dirinya sedang
aktif memakai `TautanNav` dari `src/lib/nav.jsx`.

## Aturan penilaian

### Struktur kurikulum enam lapis

```
Fase (2) → Area (3) → Cluster (6) → Aspek CPMK (10) → Komponen asesmen → Indikator perilaku
```

Aspek adalah unit penilaian. Fase, area, dan cluster tidak pernah diinput; nilainya diagregasi naik. Satu aspek milik tepat
satu semester:

| Semester | Aspek |
|---|---|
| 1 | A.1 Integrity & Ethical Responsibility, A.2 Emotional Resilience & Self-Management, A.3 Self-Leadership & Professional Discipline |
| 2 | A.4 Critical Thinking & Decision-Making, B.1 Teamwork & Collaboration, B.2 Trust, Respect & Inclusion, C.1 Leadership & Influence |
| 3 | B.3 Communication & Interpersonal Skills, B.4 Conflict Management & Negotiation, C.2 Professional Citizenship & Social Responsibility |

- Area A Personal Development, B Interpersonal Development, C Professional Career Development. Cluster CL1 sampai CL6 ada di
  `CLUSTER` (`src/lib/curriculum.js`); satu cluster boleh melintasi dua semester (CL6 = C.1 + C.2).
- Nama aspek mengikuti revisi kampus November 2026. Nama cluster disusun dari nama aspek, bukan dari dokumen kampus.
- Nama di kode hanya bawaan. Aspek yang pernah diubah dari layar punya baris di tabel `Aspek`, dan isi baris itu yang tampil.
- Semester A.3 dan C.1 masih menunggu konfirmasi (`ASPEK_A3_SEMESTER`, `ASPEK_C1_SEMESTER`).

### Empat keadaan sebuah aspek

| Status | Arti | Tampilan |
|---|---|---|
| `terkunci` | semesternya belum tiba | gembok dan "Dibuka pada Semester N", tanpa angka, bar, `0`, atau `—` |
| `menunggu` | semester berjalan, nilai belum masuk | "Belum masuk dari penilai" |
| `berjalan` | sebagian komponen terisi, atau lengkap tetapi belum final | nilai tampil, berlabel sementara |
| `final` | lengkap dan sudah final | nilai tetap |

Komponen yang belum terisi **dikeluarkan dari pembagi**, tidak pernah dianggap nol. Di Riwayat, "Ditetapkan oleh" hanya untuk
aspek final; aspek sementara ditulis "Dinilai oleh ... (belum final, masih bisa berubah)".

### Kapan aspek berubah dari sementara menjadi final

Aspek yang komponennya belum lengkap tidak pernah bisa final. Selebihnya diatur `CONFIG.PENGUNCIAN_ASPEK`:

| Mode | Kapan menjadi final |
|---|---|
| `otomatis` (bawaan) | begitu seluruh komponennya terisi |
| `manual` | hanya bila ditandai, walau sudah lengkap |
| `semester` | bila lengkap dan semesternya sudah ditutup |

- Tanda manual selalu menang atas mode. Tempatnya: pilihan saat menyimpan nilai (*Ikuti aturan sistem*, *Tandai final*,
  *Tahan sebagai sementara*) dan panel status aspek di detail mahasiswa.
- Tanda final manual juga mengunci nilai untuk diedit (lihat Mengubah data yang terkunci). Setiap perubahan tanda tercatat
  `UBAH_PENGUNCIAN`; dari admin biasa, perubahan ini diajukan ke Super Admin.
- Di panel mahasiswa, status final tertulis *Sudah lengkap*, dan status yang belum final selalu disertai alasannya.

### Huruf mutu

`RUBRIK` di `src/lib/scoring.js`:

| Huruf | Kategori kompetensi | Rentang |
|---|---|---|
| A | Professional & Competent | 85–100 |
| A- | Emerging Professional | 80–<85 |
| B+, B | Developing Professional Skills | 75–<80, 70–<75 |
| B-, C+, C | Basic Professional Awareness | 65–<70, 60–<65, 55–<60 |
| D | Belum Memenuhi | 0–<55 |

- Huruf diberikan dari nilai yang sudah dibulatkan, sama dengan angka di layar (84,6 tampil 85, huruf A). Tidak ada huruf E.
- Nilai yang belum ada tertulis *Belum dinilai* di layar dan "..." di lembar cetak, tidak pernah 0 (R2).
- `AMBANG_SERTIFIKAT` (70) tidak bergantung pada huruf. Warna lencana dan irisan donat mengikuti kategori, bukan huruf.

### Aturan bobot

Bawaannya `MODE_BOBOT_KOMPONEN = 'merata'`: setiap aspek bernilai 100 yang dibagi rata ke komponennya, jadi nilai aspek sama
dengan rata-rata komponen yang sudah terisi. Contoh: A.1 punya 5 komponen, jadi tugas bernilai 80 menyumbang 16 dari 20 poin.

- Mode `per-sumber`: `BOBOT_SUMBER` dinormalisasi ke sumber yang ada di aspek itu, lalu bobot MK dibagi per jenis
  (`BOBOT_KOMPONEN_MK`: tugas, sikap, UTS, UAS).
- Bila **seluruh** komponen sebuah aspek punya `Komponen.bobot` (diatur manual dari layar), angka itu yang dipakai di mode
  apa pun.
- Selama aturan ini belum dikonfirmasi, aspek yang bobotnya sama rata diberi tanda *(contoh)* (`bobotMasihContoh` di
  `src/lib/bobot.js`).

### Angkatan dan semester

- `semesterAktif` tidak pernah diinput: dihitung dari periode masuk angkatan sampai `PERIODE_AKTIF`, dibatasi 3.
  `semesterKalender()` menghitung hal yang sama tanpa batas; dari situ `programSelesai()` (sudah lewat Semester 3) dan boleh
  tidaknya angkatan disahkan.
- Angkatan penerimaan Genap ada supaya Semester 2 tetap terisi saat periode aktif Ganjil.

### Periode akademik

- `PERIODE_AKTIF` disimpan di tabel `Konfigurasi` (misalnya `{ "tahun": "2026/2027", "semester": "Ganjil" }`); tanpa baris
  itu, angka di `src/lib/data.js` yang dipakai. Dibaca `ambilPeriode()` dan `siapkanPeriode()` di `src/server/kurikulum.js`.
- Hanya Super Admin yang memindahkannya, dari Aturan Sistem (`POST /api/periode`): satu semester maju atau mundur, beralasan
  minimal 10 karakter, tercatat `UBAH_PERIODE`, dengan pratinjau semester tiap angkatan.
- Periode tidak berganti otomatis menurut tanggal.

### Sertifikat

Kelayakan dihitung `kelayakanSertifikat()` di `src/lib/rules.js`. Syarat bawaannya: sudah menempuh Semester 3, seluruh aspek
final, tidak ada komponen kosong, nilai akhir minimal `AMBANG_SERTIFIKAT`, dan nilai angkatannya sudah disahkan.

1. Mahasiswa yang layak menekan *Minta akses cetak*. Server menghitung ulang kelayakannya.
2. Admin meninjaunya dan selalu meneruskannya dengan rekomendasi beserta alasan (lihat Persetujuan dua lapis).
3. Super Admin menyetujui atau menolak. Yang disetujui menjadi *Siap dicetak*.
4. Admin atau Super Admin bisa mencabut akses yang sudah disetujui, dengan alasan yang dibaca mahasiswa.

- Halaman mahasiswa memisahkan *Izin cetak* (keadaan permintaan, `keadaanSertifikat()` di `src/lib/duaLapis.js`) dari
  *Kelayakan akademik* (daftar syarat).
- Sesudah ditolak atau dicabut, mahasiswa boleh mengajukan peninjauan cetak dengan penjelasan wajib (10 sampai 1000 karakter).
- Sertifikat dicetak atau disimpan sebagai PDF lewat dialog cetak, tidak dikirim lewat email. Kelayakan dihitung ulang setiap
  kali dicetak (lihat Cetak).

#### Mengubah syarat kelayakan

Super Admin mengaturnya di **Aturan Sistem › Syarat kelayakan cetak sertifikat** (`POST /api/sertifikat/syarat`, logika di
`src/lib/syaratSertifikat.js` untuk layar dan server):

- Nilai minimum bisa diubah (0 sampai 100). *Sudah menempuh Semester 3* dan *Nilai angkatan sudah disahkan* bisa dimatikan.
  *Seluruh aspek final* dan *Tidak ada komponen kosong* tidak bisa, karena lembar sertifikat menyatakan keduanya.
- Paling banyak 10 syarat tambahan: *ditandai Super Admin per mahasiswa* (tabel `SyaratMahasiswa`) atau *nilai aspek minimal*.
  Syarat tambahan bisa dinonaktifkan, dihapus, atau dijadwalkan mulai berlaku semester berikutnya.
- Perubahan beralasan, tercatat `UBAH_SYARAT_SERTIFIKAT`, menaikkan `VERSI_KURIKULUM`, dan langsung berlaku untuk seluruh
  mahasiswa, juga yang aksesnya sudah disetujui. Isian yang hilang atau rusak dibaca aktif, supaya tidak melonggarkan syarat.

### Yang masih menunggu keputusan unit pengelola

Semuanya di `src/lib/config.js`, bertanda `// MENUNGGU KONFIRMASI`:

| Kunci | Bawaan | Kenapa belum pasti |
|---|---|---|
| `ASPEK_A3_SEMESTER` | `1` | dua sheet sumber menaruh A.3 di semester berbeda |
| `ASPEK_C1_SEMESTER` | `2` | Excel menaruh C.1 di semester 2, peta jalan menyatukannya dengan C.2 |
| `MODE_BOBOT_KOMPONEN` | `merata` | usulan tim; dokumen sumber tidak memuat angka bobot |
| `BOBOT_SUMBER`, `BOBOT_KOMPONEN_MK` | 30/50/20, 30/20/20/30 | hanya dipakai mode `per-sumber` |
| `MODE_AGREGASI` | `per-aspek` | hasilnya berbeda dari `per-semester` karena distribusi 3/4/3 |
| `PENGUNCIAN_ASPEK` | `otomatis` | belum diputuskan apakah nilai boleh final sebelum semester ditutup |
| `IZINKAN_FINAL_DRAFT` | `true` | lihat di bawah |

Aturan pengesahan angkatan dan perubahan data terkunci juga keputusan sementara tim.

#### Kenapa `IZINKAN_FINAL_DRAFT` ada

R4 melarang aspek berkomponen `draft` menjadi final, sedangkan R5 menuntut seluruh aspek final untuk sertifikat. Selama ada
komponen draft, keduanya membuat tidak ada mahasiswa yang bisa disertifikasi, jadi sakelar ini melonggarkan R4. Kini seluruh
komponen di `curriculum.js` berstatus `resmi`, jadi sakelar ini tidak berpengaruh. Setel `false` setelah kolom
`Komponen.resmi` di basis data juga diperbarui.

## Alur kerja

### Masuk

Email dan kata sandi diperiksa ke tabel `Pengguna` (bcrypt), dan peran dibaca dari basis data, bukan ditebak dari domain
email. Email yang tidak terdaftar dan kata sandi yang salah dijawab dengan pesan yang sama.

#### Lupa kata sandi

Untuk akun mahasiswa dan dosen yang aktif; akun admin dan Super Admin tidak dikirimi. Kode: `src/server/lupaSandi.js`,
`src/server/email.js`, `src/halaman/akun/LupaSandi.jsx`, `src/halaman/akun/AturSandi.jsx`.

1. `/lupa-sandi`: pengguna mengisi email, lalu menerima tautan `/atur-sandi?token=...` yang berlaku 30 menit dan sekali pakai,
   dalam bahasa yang sedang dipilih.
2. `/atur-sandi`: token dibaca sekali, dihapus dari bilah alamat, lalu diperiksa lewat `POST`. Sandi baru 8 sampai 72 byte.
   Sesudah berhasil, semua tautan akun itu mati dan tercatat `ATUR_ULANG_SANDI`.

- Jawabannya sama untuk email terdaftar, tidak terdaftar, admin, dan nonaktif, dan email dikirim tanpa ditunggu.
- Hanya hash SHA-256 token yang disimpan (tabel `ResetSandi`). Batas per akun: satu tautan per menit, lima per jam.
- Tautan memakai `APP_URL`, bukan Host permintaan. Di produksi tanpa `SMTP_HOST` atau `APP_URL`, `/api/lupa-sandi` menjawab 503.
- `nodemailer` dimuat saat dipakai saja: impor statis membuat Turbopack menolak seluruh aplikasi selama paketnya belum terpasang.

### Hak peran

Super Admin adalah peran `SUPER_ADMIN` di basis data. Server membacanya sebagai admin bertanda `superAdmin`, jadi pintu
`['admin']` ikut terbuka untuknya, sedangkan `['superadmin']` hanya untuknya. Peran hanya diatur di basis data.

- Hanya Super Admin: `/api/nilai`, `/api/nilai/rollback`, `/api/usulan/keputusan`, dan `/api/master/*` (tambah dan ubah).
- Hanya dosen: `/api/nilai/dosen`. Hanya mahasiswa: `/api/koreksi` dan `/api/sertifikat`.
- `RequireRole` di layar hanya penjaga tampilan; pintu API selalu memeriksa ulang.

#### Akses angkatan

Per akun admin biasa dan per angkatan:

| Angkatan | Bawaan | Super Admin bisa |
|---|---|---|
| Semester 1–3 atau belum mulai | terlihat | menonaktifkannya |
| sudah lewat Semester 3 | tersembunyi | membukanya |

- Tabel `AdminAngkatan` hanya menyimpan yang berbeda dari bawaan. Penentunya `angkatanTersembunyi()` di `src/server/muat.js`,
  dihitung ulang setiap permintaan, jadi berlaku langsung saat periode dipindah.
- Angkatan tersembunyi tidak dikirim `/api/data` ke admin itu, dan tindakan padanya ditolak 403 (`wajibAksesAngkatan()`).
  Permintaan yang sudah terkirim tetap bisa disetujui Super Admin.
- Diatur dari Akses Pengguna › tombol *Akses angkatan* (`POST /api/akses/angkatan`, tercatat `UBAH_AKSES_ANGKATAN`).

### Persetujuan super admin

Tindakan admin biasa yang perlu persetujuan tidak langsung disimpan, tetapi menjadi `PermintaanAdmin` berstatus `MENUNGGU`.
Gerbangnya `denganPersetujuan(aksi)` di `src/server/persetujuan.js`, dipasang di pintu API, jadi tidak bisa dilewati.

| `aksi` | Ditahan bila |
|---|---|
| `UBAH_PENGUNCIAN`, `UBAH_BOBOT`, `UBAH_PENILAIAN`, `KELOLA_ASPEK`, `KUNCI_ANGKATAN`, `AKSES_DATA_MASTER` | selalu, untuk admin biasa |
| `PERBAIKAN_NILAI_DOSEN` | dosen mengunggah nilai untuk angkatan yang sudah selesai atau disahkan, atau aspek final |
| `SIMPAN_NILAI`, `ROLLBACK_NILAI`, `PUTUSKAN_USULAN` | tidak lagi dibuat; tetap terdaftar untuk permintaan lama |

1. **Mengajukan:** isi yang pasti gagal ditolak saat itu juga, alasan minimal 10 karakter wajib, dan ringkasannya disimpan
   untuk dibaca Super Admin.
2. **Memutuskan** (`POST /api/persetujuan/keputusan`): bila disetujui, tindakan aslinya dijalankan atas nama pengaju dengan
   semua aturan diperiksa ulang; bila datanya sudah berubah, statusnya `GAGAL`. Menolak wajib bercatatan.
3. **Menarik** (`POST /api/persetujuan/batal`): pengaju menarik permintaannya selama masih menunggu.

Super Admin melihat antreannya di Persetujuan; admin biasa melihat miliknya di Permintaan Saya.

### Persetujuan dua lapis

Pengajuan koreksi nilai dan akses cetak sertifikat diputuskan dua orang: admin lebih dulu (lapis 1), lalu Super Admin
(lapis 2). Lapisnya ditentukan peran pemutus, dan keputusan kedua atas hal yang sama ditolak.

| | Lapis 1 (admin) | Lapis 2 (Super Admin) |
|---|---|---|
| Koreksi nilai | meneruskan dengan nilai usulan, atau menolak | menyetujui (nilainya masuk sebagai batch bercara `koreksi`, bisa di-rollback) atau menolak |
| Akses cetak sertifikat | selalu meneruskan, dengan rekomendasi *disarankan* atau *tidak disarankan* dan alasan | menyetujui (`SIAP_DICETAK`) atau menolak |

- Menolak wajib beralasan minimal 10 karakter, dan alasannya terbaca mahasiswa.
- Satu komponen hanya boleh punya satu koreksi yang berjalan, dan satu mahasiswa satu permintaan akses cetak yang berjalan.
- **Pencabutan** (`POST /api/sertifikat/cabut`): cukup satu orang, admin atau Super Admin, dengan alasan. Tercatat
  `CABUT_SERTIFIKAT` beserta jumlah cetak saat itu.
- **Catatan cetak** (`POST /api/sertifikat/cetak`) dipanggil tepat sebelum dialog cetak dibuka, sekaligus gerbang terakhir:
  akses yang dicabut atau syarat yang gugur dijawab 409.
- Admin meninjau di detail mahasiswa dalam mode tinjau (`?tinjau=sertifikat`). Label status ada di `src/lib/duaLapis.js`.

### Usulan nilai dosen

Dosen tidak lagi mengusulkan nilai; rekap Excel-nya langsung tersimpan (lihat Panel Dosen). Usulan lama yang masih menunggu
diputuskan Super Admin di `/admin/usulan`. Yang disetujui ditulis lewat `simpanBatch()`, jalur yang sama dengan input admin,
setelah diperiksa ulang dengan `validasiBatchImport()`. Usulan yang menyentuh data terkunci wajib bercatatan.

### Input nilai

Halaman `/admin/nilai` milik Super Admin (*Input & Import Nilai*). Admin biasa membukanya sebagai *Nilai Mahasiswa*: hanya
melihat, ditambah tab Pengajuan koreksi untuk lapis pertama, tanpa import dan tanpa rollback.

- **Semester dipilih lebih dulu**, karena tiap aspek hanya dinilai di satu semester. Angkatan juga harus sudah sampai semester
  itu (dihitung dengan `semesterKalender`).
- Tiga cara kerja: **input manual** (tabel mahasiswa × komponen, sel 0 sampai 100, sel kosong tetap kosong), **import Excel/CSV**
  (format baku `nim, komponen, nilai` atau rekap mentah dosen), dan **pengajuan koreksi**.
- Import menolak NIM tak dikenal, komponen asing atau dari sumber dan semester lain, mahasiswa di luar angkatan atau prodi
  sasaran, nilai di luar 0 sampai 100, baris ganda, dan aspek yang semesternya belum ditempuh (R1).
- Server mengulang pemeriksaan yang sama (`src/server/nilai.js`). Satu baris yang gagal menolak seluruh batch.
- Tautan lonceng membawa sasaran lewat alamat. `app/admin/nilai/page.jsx` memberi halaman `key` dari parameter alamatnya, supaya
  sasaran baru terpasang walau halaman sudah terbuka.

#### Pengenalan berkas mentah

`src/lib/ingest.js` mencocokkan tiap kolom dengan tiap komponen memakai empat sinyal: kata kunci jenis (tugas, sikap, UTS, UAS),
kata kunci sumber, irisan kata dengan label komponen, dan nomor urut. Skor 80 ke atas *Yakin*, 55 sampai 79 *Perlu dicek*, di
bawahnya tidak diusulkan. Skala tiap kolom (0–4, 0–10, 0–100) dikenali dan dikonversi.

Tebakan tidak pernah langsung dijalankan: layar pemetaan bisa diubah dulu, baru *Isi otomatis* menyimpannya sebagai satu batch.
Berkas *Contoh rekap mentah* sengaja berkolom nilai kosong, supaya angka karangan tidak ikut terunggah sebagai nilai asli.

### Penyimpanan perubahan

- Satu penyimpanan menjadi satu baris `Batch`, nilai terbaru di `Nilai`, dan setiap perubahan sel di `AuditLog`. ID batch
  `B-<tanggal dan jam WIB>-<8 karakter acak>`.
- Rollback menandai batch `DIBATALKAN` lalu memutar ulang setiap sel dari `AuditLog`, jadi membatalkan batch lama tidak
  menghapus nilai dari batch sesudahnya.
- Mode lokal (skrip uji) menyimpan daftar batch di peramban (`sk5c.perubahan`) dan memutarnya ulang di atas data contoh.

### Penguncian angkatan dan data terkunci

Di layar, angkatan yang dikunci tertulis *disahkan* dan aspek yang dikunci *final*; nama di kode tetap `terkunci`,
`KUNCI_ANGKATAN`, dan `/api/penguncian`.

- Angkatan boleh disahkan setelah lewat Semester 3 (`semesterKalender` ≥ 4) dan sudah punya mahasiswa. Nilai yang masih kosong
  tidak menghalangi, hanya tampil di pratinjau.
- Dua langkah: `POST /api/angkatan/pratinjau`, lalu `POST /api/angkatan/kunci` dengan konfirmasi berupa label angkatan.
- Mengesahkan angkatan memenuhi salah satu syarat sertifikat, dan setiap perubahan nilai sesudahnya wajib beralasan.

#### Mengubah data yang terkunci

Nilai terkunci bila angkatannya `TERKUNCI` atau aspeknya ditandai final secara manual (`cariTerkunci()` di
`src/server/nilai.js`). Final otomatis tidak dihitung.

- Super Admin tetap boleh mengubah dan melengkapinya, termasuk rollback, dengan alasan minimal 10 karakter.
- Dosen mengajukannya ke Super Admin (`PERBAIKAN_NILAI_DOSEN`). Mahasiswa hanya bisa mengajukan koreksi (R8).
- Kolom *Alasan perubahan* dan *Alasan rollback* ada di Input Nilai; server baru menuntutnya bila data terkunci tersentuh.

#### Log aktivitas

- Setiap tindakan yang mengubah sesuatu, oleh peran apa pun, tercatat di `LogAktivitas` lewat `catatLog()` di **transaksi
  yang sama** dengan perubahannya. Perubahan nilai juga tercatat per sel di `AuditLog`. Yang hanya membaca tidak dicatat.
- Jenis tindakannya (`aksi`) dan labelnya ada di `LABEL_LOG` (`src/lib/labelLog.js`). Rincian profil hanya menyimpan nama
  isian yang berubah, bukan isinya.
- Dibaca lewat `POST /api/log` (`bacaLog()`), satu halaman 25 baris, dengan saringan pelaku, tanggal WIB, NIM, dan jenis
  tindakan. Batch yang dibatalkan tetap tampil bertanda.
- Admin biasa tidak membaca tindakan Super Admin; yang berkaitan dengannya sampai lewat lonceng.

### Kurikulum dari basis data

- Komponen (`Komponen`), indikator (`Indikator`), dan timpaan kebijakan (`Konfigurasi`) dibaca dari basis data. Isi
  `curriculum.js` dan `config.js` hanya bawaan yang ditanam seed.
- Baris `VERSI_KURIKULUM` menandai kurikulum sudah dikelola di basis data; seed tidak menimpanya. Setiap perubahan menaikkan
  angkanya, dan pintu API memuat ulang kurikulum hanya bila versinya berubah (`siapkanKurikulum()`).
- `KOMPONEN` dan `INDIKATOR` diisi ulang di tempat, karena modul lain memegang rujukannya.
- Komponen diarsipkan (`aktif = false`), tidak pernah dihapus; ID-nya tidak pernah diganti.
- Hanya kunci di `KUNCI_DAPAT_DIUBAH` yang boleh ditimpa. Bila tabel gagal dibaca, aplikasi tetap jalan dengan isi terakhir.

### Mengelola aspek CPMK

Aspek bisa ditambah, diubah strukturnya, diarsipkan, dan dipulihkan (`src/halaman/admin/bagian/KelolaAspek.jsx`) dari Input & Import
Nilai, Penilaian & Bobot, dan Kurikulum CPMK.

- **ID aspek tidak pernah berubah** dan tidak dipakai ulang. Yang bisa diubah: kode tampilan, semester, dan cluster.
- Aspek baru wajib punya nama, deskripsi, dan minimal satu komponen. Menghapus berarti mengarsipkan; aspek aktif terakhir
  tidak bisa diarsipkan.
- Angkatan yang sudah disahkan memakai daftar aspek saat dikunci (`Angkatan.aspekSaatKunci`), jadi aspek yang ditambah
  sesudahnya tidak ikut.
- Alasan selalu wajib, dengan pratinjau dampak. Super Admin menyimpan langsung (`POST /api/kurikulum/aspek`); admin biasa
  mengajukan `KELOLA_ASPEK`. Aturannya di `src/lib/aspek.js`, dipakai layar dan server.

### Mengubah penilaian dari Input Manual

Tombol *Atur penilaian A.x* membuka `EditorPenilaian.jsx`:

- **Teks aspek** beserta padanan Inggrisnya, disimpan di tabel `Aspek`.
- **Komponen:** tambah (ID `<aspek>-<sumber>-B<n>`), ubah, arsipkan, pulihkan. Komponen yang sudah dinilai tidak bisa diganti
  sumbernya.
- **Bobot:** dibagi otomatis atau diatur manual dengan jumlah 100.

Layar menghitung dampaknya sebelum menyimpan; server menghitung ulang dari seluruh mahasiswa. Super Admin menyimpan langsung
(`POST /api/kurikulum/penilaian`); admin biasa selalu mengajukan `UBAH_PENILAIAN`.

### Mengubah bobot dari halaman Kurikulum

`/admin/kurikulum` mengubah bobot per aspek (otomatis atau manual, jumlah tepat 100) dan cara membagi bobot otomatis
(`merata` atau `per-sumber`).

- Nilai yang diinput tidak berubah; yang berubah porsinya, jadi hasil semua angkatan dihitung ulang. Pratinjau dampak tampil
  sebelum menyimpan.
- Alasan wajib bila hasil angkatan terkunci atau aspek final manual ikut berubah.
- Layar mengirim `VERSI_KURIKULUM` yang dibukanya; versi yang sudah basi ditolak 409. Semuanya satu transaksi, tercatat
  `UBAH_BOBOT`. Aturannya di `src/lib/bobot.js`, dipakai layar dan server.

### Data master

Angkatan, fakultas, program studi, kelas, dan mahasiswa ada di `/admin/data-master`.

- Hanya Super Admin yang menambah dan mengubah (`/api/master/angkatan`, `/prodi`, `/kelas`, `/mahasiswa`). Tidak ada yang
  bisa menghapus.
- Admin biasa boleh **melihat** setelah diberi izin di Akses Pengguna (`Pengguna.kelolaMaster`) atau setelah permintaan
  aksesnya disetujui.
- NIM tidak bisa diubah. Prodi dan angkatan mahasiswa hanya bisa diubah selama ia belum punya data. Angkatan terkunci menolak
  mahasiswa baru.
- Setiap prodi punya kelas (misalnya Kelas A dan B). Mahasiswa masuk satu kelas di prodinya; dosen melihat mahasiswa menurut
  kelas yang diampunya (lihat Kelas dosen).
- Isi seed: 4 fakultas dan 14 program studi S1 dan D3. Program magister tidak disertakan.

### Halaman Angkatan

`/admin/angkatan` memantau setiap angkatan: semester berjalan, kelengkapan nilai, nilai yang belum masuk, mahasiswa yang perlu
ditindaklanjuti, dan pengesahan angkatan. Hitungannya di front-end dari data yang sudah dimuat, dengan aturan yang sama dengan
server. Satu-satunya pemanggil API adalah `kunciAngkatan()` di `src/lib/store.js`.

## Panel

### Panel kerja

Kerangka bersama panel dosen, admin, dan Super Admin (`src/components/kerangka/KerangkaKerja.jsx`). Kerangka ini hanya mengatur
tampilan; menu dan hak akses tetap ditentukan `DosenLayout`, `AdminLayout`, dan `SuperLayout`.

- Warna tetap navy dan toska; jangan ditimpa di `.panel-kerja`.
- Menu samping dan footer **menempel**, tidak melayang: menu samping setinggi layar di tepi kiri (272px, panel mahasiswa 264px),
  footer di dasar kolom isi. Tidak ada tombol untuk menciutkan menu samping.
- Lebar isi 1320px dengan jarak samping 20px (panel mahasiswa 1600px dan 32px). Di bawah 1024px menu pindah ke laci.
- Judul tab peramban mengikuti halaman ("Nilai Mahasiswa · VIBE", `useJudulTab` di `src/lib/judulTab.js`).
- `KartuAngka` tidak memuat delta atau panah tren, karena datanya keadaan saat ini tanpa pembanding.

### Panel mahasiswa: satu fakta, satu tempat

| Fakta | Tempatnya |
|---|---|
| Siapa saya dan nilai akhir ringkas | kartu profil |
| Nilai akhir beserta grafiknya | kartu nilai akhir di Beranda |
| Perjalanan tiga semester | kartu Perjalanan semester |
| Status sertifikat | satu baris bertaut |

- Satu angka besar saja (nilai akhir). Aspek yang belum dibuka tampil bergembok, tidak pernah sebagai 0 (R2).
- Transkrip menjelaskan kodenya sendiri (panduan kode di bawah tabel), dan rincian aspek menandai tugas yang paling
  menurunkan nilai.
- *Ajukan koreksi nilai* adalah satu-satunya aksi tulis mahasiswa (R8); pengajuannya tidak mengubah nilai.
- Menyimpan nilai di panel mana pun langsung menghitung ulang semua halaman yang memakai `useStore()`.

### Panel Dosen

Penggunanya dosen yang datang sesekali, banyak yang berusia 40 tahun ke atas. Kebutuhan seperti tulisan lebih besar dipenuhi
lewat menu aksesibilitas. Dosen mengunggah rekap Excel kelasnya, dan nilainya langsung tersimpan tanpa persetujuan (tercatat
di log, dan Super Admin bisa membatalkan satu unggahan).

- **Beranda** (`dosen/Beranda.jsx`) hanya memantau: kelengkapan nilai, tiga angka ringkas, kelengkapan per tugas, dan daftar
  mahasiswa. Angkanya dari `ringkasKelas()` di `src/lib/unggahDosen.js`.
- **Unggah Nilai** (`dosen/UnggahNilai.jsx`), empat langkah:
  1. Unduh templat .xlsx (nilai tersimpan ikut terisi, NIM ditulis sebagai teks).
  2. Unggah .xlsx atau .csv, paling besar 5 MB.
  3. Periksa (`bacaRekap()`): berkas ditolak seluruhnya bila ada kolom tak dikenal, NIM yang tidak ada di kelas atau ganda,
     atau nilai di luar 0 sampai 100. Nilai untuk angkatan yang sudah selesai atau disahkan, atau aspek final, ditandai dan
     diajukan dengan alasan wajib. Hanya sel yang berbeda yang ditulis; sel kosong tidak menghapus nilai.
  4. Simpan (`POST /api/nilai/dosen`): yang biasa menjadi batch `unggah-dosen`, sisanya permintaan `PERBAIKAN_NILAI_DOSEN`.
- Pustaka Excel: `read-excel-file` dan `write-excel-file`, dimuat saat dipakai. `exceljs` dan `xlsx` sengaja tidak dipakai
  karena celah keamanannya.

#### Kelas dosen

Akun dosen berisi prodi, sumber (MK atau PDP), semester, angkatan yang diampu (`DosenAngkatan`), dan kelas yang diampu
(`DosenKelas`, boleh dari prodi lain). Mahasiswanya disaring dua langkah:

1. **Kelas:** bila kelas sudah dipilih, anggota kelas-kelas itu saja; bila belum, semua mahasiswa prodi dosen.
2. **Angkatan:** bila sudah dipilih, angkatan itu saja (termasuk yang sudah selesai); bila belum, angkatan yang sudah sampai
   semester kelas itu dan belum lewat Semester 3.

Aturannya satu fungsi di server, `diKelasDosen()` (`src/server/muat.js`), dengan padanan layar `mahasiswaKelas()` di
`src/lib/data.js`. Kelas diatur Super Admin di Akses Pengguna (`POST /api/akses/kelas`).

#### Kaca

Prinsipnya: **navigasi dan kendali berbahan kaca, data nilai tetap padat**. Bilah atas, menu aktif, menu akun, dan tombol bantuan
berkaca; kartu, tabel, formulir, dan tombol utama tidak. Panel mahasiswa, admin, dan Super Admin memakai bahan yang sama
(token `--kaca-*`).

- Blur bilah atas ada di `.bilah-kerja::before`, bukan di bilahnya. `backdrop-filter` di induk membuat kaca menu di dalamnya
  hanya mengaburkan isi induk itu (Backdrop Root). Karena alasan yang sama, jangan animasikan `opacity` atau `transform` di
  induk panel kaca.
- Cahaya latar tanpa `background-attachment: fixed`, yang membuat halaman dilukis ulang di setiap langkah gulir.
- Kurangi transparansi, peramban tanpa `backdrop-filter`, mode kontras, dan warna paksa membuat semuanya padat. Semua aturan ada
  di `@media screen`, jadi hasil cetak tidak berubah.
- `scripts/smoke.run.cjs` menolak aturan kaca yang menyasar `<main>`, tabel, formulir, atau kartu, dan aturan yang tidak terikat
  ke salah satu panel.
- Kontras tulisan di atas kaca diukur per piksel saat isi halaman lewat di belakangnya. Bila isian atau warnanya diubah, ukur
  ulang.

### Panel Admin

#### Tampilan

- **Menu samping putih** dengan dua kelompok: *Kerja harian* dan *Rujukan & catatan*. Lencana hanya untuk pekerjaan yang
  menunggu. Label menu tidak dipotong "…"; bila tidak muat, ia turun ke baris kedua.
- **Bilah atas:** lokasi halaman, pencarian cepat (Ctrl+K, `CariCepat.jsx`), lonceng, bahasa, tema, dan menu akun.
- **Pola halaman bersama** di `Ui.jsx`: `JudulHalaman`, `KartuAngka` (menerima teks yang sudah diterjemahkan), `TabSaring`,
  `Paginasi`, `GulirTabel`, dan `JUDUL_KOLOM`. Log Aktivitas dan Persetujuan juga dipakai panel Super Admin.
- **Papan ketik:** tab mengikuti pola APG; laci, lonceng, dan menu akun mengembalikan fokus ke tombol pembukanya.
- **Jebakan tata letak:** wadah tabel yang bisa digulir harus `relative` (karena itu setiap tabel dibungkus `GulirTabel`);
  bilah atas menempel, jadi `html` diberi `scroll-padding-top`; garis antarbaris dipasang di sel (`border-separate`), karena
  pada `border-collapse` garis sel `sticky` ikut tergulir.
- **Kontras:** lencana dan pesan status memakai `--teks-baik`, `--teks-tunggu`, dan `--teks-kritis`, karena warna aslinya di
  bawah 4,5:1.

#### Lonceng

`admin/bagian/LoncengAdmin.jsx` berisi dua hal:

- **Perlu dikerjakan:** pekerjaan yang menunggu akun ini, dihitung dari data yang sudah dimuat. Inilah satu-satunya tempatnya.
- **Pembaruan**, hanya untuk admin biasa: tindakan Super Admin yang berkaitan dengan admin itu (akunnya dan permintaannya),
  dari `GET /api/notifikasi`.

Status dibaca disimpan per akun di basis data (`Pengguna.notifDibacaId`), bukan di peramban, karena komputer kampus dipakai
bergantian. Daftarnya dibaca ulang saat data dimuat, saat tab kembali terlihat, dan tiap menit.

#### Gerak

Gerak pendek (paling lama 0,7 detik), hanya `transform` dan `opacity`, sekali jalan saat sesuatu muncul atau ditekan:
bagian halaman naik berurutan, bilah persentase dan batang grafik tumbuh, garis tab tumbuh dari tengah, dan tombol mengecil
saat ditekan.

**Semua dropdown** memakai `PilihanTurun` (`src/components/PilihanTurun.jsx`), dropdown buatan sendiri berpola listbox, bukan
`<select>`. Firefox tidak mengenal `appearance: base-select`, jadi daftar `<select>` di sana tidak bisa diberi animasi, arah,
dan potongan "…".

- Daftarnya popover di top layer (`popover="manual"`), membuka ke bawah dan baru membalik ke atas bila ruangnya kurang dari
  160px. Saat ditutup ia memudar (`tutup-pilihan`) lalu dilepas.
- Papan ketik seperti `<select>`: panah, Home/End, PageUp/PageDown, Enter atau Spasi, Escape, Tab, dan ketik huruf.
- Jangan bungkus dengan `<label>`: klik pada pilihan ikut "menekan" tombolnya lagi, jadi daftar terbuka kembali. Pakai
  `labelOleh` (id label) atau `ariaLabel`.
- Nilai dibandingkan sebagai teks. Uji memakai pembantu `kotakPilihan`, `bacaPilihan`, `kotakDengan`, dan `kotakBerlabel` di
  `scripts/smoke.jsx`.
- Blok `appearance: base-select` di `index.css` kini tidak lagi mengenai dropdown mana pun.
- Pengurai CSS Turbopack menolak pseudo-class sesudah `::picker(select)`, dan galatnya menggagalkan seluruh `index.css`. Uji
  sintaks CSS baru lebih dulu dengan `getBindingsSync().css.lightning.transform` dari `next/dist/build/swc`.

Saat kurangi gerak atau *Hentikan animasi* aktif, animasi ini dilepas sama sekali (`animation: none`).

#### Kaca

Bahannya sama dengan panel dosen (lihat Panel Dosen › Kaca). Bedanya, blur di sini tanpa `saturate()`, karena saturasi membuat
Chrome melepas ClearType sehingga tulisan di bawah kaca tampak lebih tipis. Pencarian cepat dipasang lewat portal ke `<body>`,
jadi diberi `lingkup="portal-admin"` dan `useKelasAkarAksesibilitas()` supaya token kaca dan setelan aksesibilitas ikut berlaku.

### Panel Super Admin

Super Admin punya panel sendiri di `/super`, dan tetap bisa membuka panel admin dari menu samping.

| Halaman | Isi |
|---|---|
| `/super` Pusat Kendali | permintaan yang menunggu, keadaan sistem, grafik nilai tersimpan per bulan, aktivitas admin terbaru, rantai pengawasan; pemilih periode menyaring ke rentang semester (Ganjil Agustus sampai Januari, Genap Februari sampai Juli) |
| `/super/persetujuan` | antrean Setujui/Tolak |
| `/super/penilaian` | Penilaian & Bobot: editor penilaian aspek dan bobot, langsung berlaku |
| `/super/akses` | Akses Pengguna |
| `/super/log` | Log Aktivitas lengkap |
| `/super/wewenang` | Peran & Wewenang |
| `/super/aturan` | periode akademik, syarat sertifikat, dan aturan perhitungan yang berlaku |

Semua angkanya dihitung dari data yang termuat; tidak ada delta atau tren tanpa pembanding nyata.

#### Akses Pengguna

`src/halaman/super/AksesPengguna.jsx` dan `src/server/akses.js`, tiga tab: Dosen, Admin, Mahasiswa. Semua tindakan
beralasan minimal 10 karakter dan tercatat.

- **Cabut dan pulihkan akses** (`POST /api/akses/ubah`, `UBAH_AKSES`): akun nonaktif ditolak di setiap permintaan, jadi sesinya
  langsung berakhir. Datanya tidak disentuh. Akun sendiri dan akun `SUPER_ADMIN` tidak bisa dicabut.
- **Tambah akun** (`POST /api/akses/tambah`, `TAMBAH_AKUN`).
- **Hapus akun** (`POST /api/akses/hapus`, `HAPUS_AKUN`), hanya untuk akun yang aksesnya sudah dicabut:
  - Mahasiswa dan dosen boleh dihapus walau sudah punya data; ini aturan sementara sampai ditetapkan bersama back-end.
  - Data mahasiswa ikut terhapus; nilai yang pernah dimasukkan dosen tetap ada.
  - Akun admin yang masih punya data ditolak 409.
  - Nama akun yang sudah dihapus tetap tampil di riwayat lewat catatan `HAPUS_AKUN`.
- **Izin lihat data master** (`POST /api/akses/izin`, `UBAH_IZIN`) dan **akses angkatan** (`POST /api/akses/angkatan`) untuk
  admin biasa.
- **Kelas dosen** (`POST /api/akses/kelas`, `UBAH_KELAS_DOSEN`).

Daftar akun dikirim sekaligus (`POST /api/akses`), lalu dicari dan disaring di peramban.

#### Peran & Wewenang

Empat sakelar bisa menutup sementara sebuah wewenang, dan servernya ikut menolak (403):

| Sakelar | Peran | Pintu yang ditutup |
|---|---|---|
| `AJUKAN_KOREKSI` | Mahasiswa | `POST /api/koreksi` |
| `MINTA_SERTIFIKAT` | Mahasiswa | `POST /api/sertifikat` |
| `UNGGAH_NILAI_DOSEN` | Dosen | `POST /api/nilai/dosen` |
| `BACA_LOG_ADMIN` | Admin | `POST /api/log` |

- Disimpan di `Konfigurasi` dengan kunci `WEWENANG.<id>`; tanpa baris, sakelarnya terbuka. `denganWewenang()` di
  `src/server/wewenang.js` menjaga keempat pintu. Super Admin tidak pernah tertahan.
- Diubah lewat `POST /api/wewenang`, beralasan, tercatat `UBAH_WEWENANG`. Yang sudah berjalan sebelum ditutup tetap diproses.
- *Ubah matriks* menambah keterangan per sel (`KeteranganWewenang`) dan kebijakan tertulis (`TindakanWewenang`). Keduanya
  **tidak dijaga server**.
- `MATRIKS` di `src/lib/wewenang.js` ditulis tangan. Bila aturan di `src/server/persetujuan.js` berubah, ubah juga matriksnya.

#### Tampilan

- Menu samping navy memakai `.kartu-aurora` (diam, tanpa animasi). Kelas ini tidak memasang `position`, jadi elemen pemakainya
  wajib berposisi. Butir aktifnya berpil kaca putih.
- Toska hanya dipakai pada tombol antrean saat ada yang menunggu.
- Di dalam `.panel-super` teks redup dipertebal supaya lolos 4,5:1.
- Waktu ditulis relatif ("3 hari yang lalu"), dengan waktu WIB lengkap di `title`.

### Ringkasan admin sengaja dibuat tenang

Penggunanya staf dengan rentang usia yang lebar, jadi Beranda admin bukan dashboard padat:

- empat kartu angka: mahasiswa terpantau, rata-rata nilai, nilai sudah final, dan kelengkapan nilai;
- dua grafik selebar halaman: perkembangan nilai per semester dan sebaran huruf mutu, tanpa filter bertingkat;
- pekerjaan yang menunggu ada di lonceng, tidak diulang di halaman;
- setiap tautan menyebut tujuannya, dan huruf mulai 14,5px.

Halaman rincian (Data Mahasiswa, Program Studi, Input Nilai) tetap padat sebagaimana mestinya.

#### Kenapa donat, dan kenapa warnanya satu hue

- Datanya bagian dari keseluruhan dengan lima irisan, satu per kategori kompetensi (bukan per huruf, karena delapan huruf
  melewati batas aman enam irisan).
- Kategorinya berurutan, jadi empat yang teratas memakai satu hue biru bertingkat (`--mutu-a` sampai `--mutu-d`). *Belum
  Memenuhi* memakai merah status dan selalu berlabel.
- Penyebut persentasenya jumlah mahasiswa yang sudah punya nilai. Yang belum dinilai disebutkan di bawah grafik.
- Saat irisan ditunjuk, rinciannya tampil di label tengah, tanpa kotak keterangan melayang (dulu kotak Tooltip menimpa label
  tengah).

## Catatan kode

### Bahasa visual

- **Rata, bukan bertumpuk:** tanpa gradien di navbar, footer, dan kepala kartu; bayangan nyaris tidak ada; kartu cukup dibatasi
  garis rambut. Bayangan besar hanya untuk menu mengambang dan dialog.
- **Warna merek navy dan toska.** Ungu dan peach sudah dicoba dan ditolak. Emas hanya di kenop panji halaman masuk.
- **Setiap kendali menuju ke suatu tempat.** Tombol yang fiturnya belum ada dibuang; lonceng hanya muncul bila ada yang
  menunggu (kecuali lonceng admin biasa); setiap pintasan footer menunjuk ke halaman yang ada.
- **Pengecualian halaman masuk:** latarnya foto udara kampus (`public/kampus-umn.webp`) yang diredupkan hitam 55%, ditambah
  gradasi di sepertiga atas. Tulisan di atas foto dibantu bayangan `.teks-foto`. Formulirnya kartu kaca bening (`.kaca-masuk`,
  `blur(12px) saturate(160%) brightness(0.62)`); pembungkusnya memakai `.animate-masuk`, bukan `.animate-rise`, karena pembungkus
  beranimasi membuat kaca tidak melihat foto. Halaman ini selalu bermode gelap. Bila foto atau redupnya diubah, ukur ulang
  kontrasnya.
- Pengecualian lain: menu samping Super Admin (`.kartu-aurora`) dan navigasi berbahan kaca (lihat Panel Dosen › Kaca).

### Hidrasi

Next merender halaman di server lebih dulu, lalu peramban menghidrasinya. Apa pun yang hanya ada di peramban harus menunggu
komponen menempel:

- **Sesi** (`src/lib/auth.jsx`) dibaca sesudah menempel. Sebelum `siap`, pintu depan dan penjaga peran tidak boleh
  menyimpulkan "belum masuk".
- **Tema** dipasang skrip kecil di `<head>` (`src/lib/theme.jsx`), jadi `<html>` memakai `suppressHydrationWarning`.
- **Bahasa** mulai dari bawaan jalurnya: halaman masuk Inggris, panel Indonesia (`bahasaBawaan()` di `src/lib/bahasa.jsx`).
  Hanya pilihan pengguna yang disimpan (`sk5c.bahasa.pilihan`); bawaan tidak pernah ditulis.
- Sesi dan tema baru ditulis ke `localStorage` setelah pembacaan awal selesai.
- Penjaga peran berpindah lewat router di dalam efek, bukan mengembalikan `<Navigate>` saat render.

### Data dan store

- Halaman yang membaca nilai memanggil `useStore()` dan memasukkan `versi` darinya ke dependensi `useMemo`.
- Larik di `src/lib/data.js` diisi ulang di tempat, tidak pernah diganti, karena halaman dan `store.js` memegang rujukannya.
- Data master dipasang `app/penyedia.jsx` sebelum anak pertama dirender, jadi render server sama dengan render peramban.
- `PemuatData.jsx` menahan panel sampai `/api/data` selesai. Pemuatan yang sudah didahului pemuatan lebih baru diabaikan, dan
  data dikosongkan saat keluar.
- Mode lokal hanya untuk skrip uji (`scripts/modeLokal.js`); website selalu lewat server.

### Kamus dan terjemahan

- Kunci kamus (`src/lib/teks.js`) adalah **kalimat Indonesia** persis seperti di halaman, dirapikan spasinya sebelum
  dicocokkan. Kalimat tanpa padanan jatuh kembali ke bahasa Indonesia.
- Urutan pencarian: kolom Inggris di basis data, kamus `teks.js`, pola pesan server (`POLA_EN`), penerjemah bawaan peramban
  (Chromium), lalu bahasa Indonesia.
- Penanda `{nama}` wajib ada di sisi Inggris, dan namanya tidak boleh bertanda hubung.
- Kunci yang dioper sebagai prop (judul `ChartFrame`, kepala tabel cetak) tidak terdeteksi `test:bahasa`, jadi dijaga manual di
  akhir `teks.js` dan di `scripts/bahasa.mjs`.
- Pilihan dropdown tampil dalam bahasa aktif, tetapi nilai yang dikirim tetap kalimat Indonesianya.

#### Isi kurikulum

Nama tugas dan deskripsi CPMK ikut diterjemahkan lewat `t()`. Isi bawaan `curriculum.js` ada di kamus, dan `test:bahasa`
membacanya langsung. Isian dari layar disimpan di kolom `Komponen.labelEn` dan `Aspek.namaEn`, `deskripsiEn`, dan seterusnya,
lalu dipasang ke `src/lib/kamusData.js`; kolom ini menang atas kamus.

#### Nama fakultas, program studi, dan angkatan

Nama bawaan ada di kamus. Label angkatan diterjemahkan `POLA_EN` (`2025 Genap` menjadi `2025 Even`). Isian dari layar ada di
`Fakultas.namaEn`, `ProgramStudi.namaEn`, dan `Angkatan.labelEn`. Yang dibandingkan dengan data tetap nama aslinya: nilai
saringan, parameter tautan, isi permintaan, dan log.

#### Pesan server

Pesan `GalatApi` dan pesan aturan ditulis dalam bahasa Indonesia, lalu diterjemahkan layar saat diterima
(`setGalat(t(e.message))`). Pesan yang dirakit dengan angka atau nama dicocokkan dengan `POLA_EN`; saat menambah pesan seperti
itu, tambahkan juga polanya dan contohnya di `ujiIsiInggris` (`scripts/smoke.jsx`). Isian pengguna dan log lama tidak
diterjemahkan.

### Pemilih bahasa

`src/components/kerangka/TombolBahasa.jsx` membungkus `GlassSegmented` dari `@zakisheriff/liquid-glass` (MIT).

- Lensa yang membesar saat ditahan adalah bagian yang disengaja; jangan dimatikan.
- Pustaka menulis kendalinya sebagai tab. `TombolBahasa` menggantinya menjadi tombol `aria-pressed` lewat `MutationObserver`.
- Menekan bahasa yang sedang tampil tetap dicatat sebagai pilihan lewat `onPointerUp`.
- `app/layout.jsx` mengimpor `styles.css` pustaka sebelum `src/index.css`. Kalau urutannya dibalik, ukuran dan warnanya kalah.
- Efek pembiasan penuh hanya di Chrome dan Edge (`backdrop-filter: url()`).
- Saat ganti bahasa, `<main>` memudar 300 ms; di halaman masuk yang dipudarkan isi kartunya saja, supaya blur kaca tidak
  berkedip.

### Grafik

- Kartu nilai akhir mahasiswa menampilkan tren dua garis (*Nilai tiap semester* dan *Rata-rata Anda*) bila ada minimal dua
  semester bernilai; selain itu sebaran aspek.
- Labelnya *Rata-rata*, bukan "kumulatif": angkanya rata-rata, bukan jumlah.
- Kurva monoton (`src/lib/kurva.js`) tidak pernah melampaui titik datanya. Sumbu Y tren boleh dipotong asal dilabeli; grafik
  batang selalu mulai dari nol.
- Setiap grafik punya tampilan tabel lewat `ChartFrame`. Tooltip (`src/lib/tunjuk.js`) muncul lewat tetikus, fokus, atau
  ketukan, dan ditutup dengan Escape.

### Warna dan kontras

- Status ditulis sebagai kata biasa tanpa warna atau pil; tingkatannya dibedakan berat huruf.
- Teks redup memakai `#63677f` (gelap `#8b96ad`) di semua panel, karena bawaannya hanya 3,2:1.
- Aksen toska: `--accent` untuk latar gelap, `--accent-on` untuk tulisan di atas isian toska, dan `--accent-ink` untuk latar
  terang. Tulisan VIBE bergradasi toska (`.teks-vibe`), dengan warna polos sebagai cadangan.
- Warna identitas hanya milik area (tiga slot kategorikal). Cluster dan aspek dikenali lewat kode dan label.

### Gerak

- Lompatan gulir memakai `scroll-behavior: smooth`, kecuali saat kurangi gerak aktif.
- **Gulir roda halus di panel mahasiswa** memakai Lenis (`lenis` 1.3.27, dikunci persis; `useGulirHalus` di
  `src/lib/gulirHalus.js`): roda tetikus dan touchpad meluncur, tidak melompat per langkah roda, dengan jarak yang sama
  dengan gulir bawaan.
  - Tetap milik peramban: sentuh, papan ketik, batang gulir, lompatan jangkar, Ctrl/Shift + roda, dan roda di atas wadah
    yang bisa digulir sendiri (`allowNestedScroll`; wadah lain bisa ditandai `data-lenis-prevent`).
  - Lenis tidak dibuat di perangkat tanpa tetikus, saat kurangi gerak aktif, atau saat *Hentikan animasi* menyala.
  - Selama laci atau penampil foto mengunci gulir (`overflow: hidden` di `<body>`), roda tidak menggerakkan halaman.
  - Lenis mengabaikan gulir dari luar selama ia beranimasi, jadi `useGulirHalus` menghentikannya (`reset()`) begitu posisi
    halaman berbeda dari posisi animasinya.
  - `app/layout.jsx` memuat `lenis/dist/lenis.css`. Aturan `html.lenis { height: auto }` di dalamnya wajib, karena
    `index.css` memasang `height: 100%` di `html` dan `body`.
- `.animate-halaman` memakai `animation-fill-mode: backwards`, **bukan** `both`: dengan `both`, setiap elemen `fixed` di
  halaman ikut mengacu ke pembungkus itu, bukan ke layar.
- Sorotan menu samping (`.menu-sorot`) digambar tiap butir sendiri dan tidak meluncur antarbutir.
- Semester di Peta Perjalanan membuka lewat `Lipat.jsx` (baris grid `0fr` ke `1fr`); selama menutup, isinya `inert`.
- Panji logo halaman masuk (`PanjiPdp.jsx`) berayun sekali saat halaman dibuka. Hanya `transform` dan `opacity` yang
  dianimasikan.
- Tombol Masuk (`.tombol-masuk`) hanya bergerak saat ditunjuk atau ditekan. Bila warna atau kilaunya diubah, ukur ulang kontras
  teksnya.
- Semua gerak dimatikan blok `prefers-reduced-motion` di akhir `index.css`.

### Menu aksesibilitas

Ada di keempat panel (`src/components/kerangka/MenuAksesibilitas.jsx`), dengan setelan di `src/lib/aksesibilitas.js` (kunci
`sk5c.aksesibilitas`), berlaku untuk semua panel di peramban itu.

- **Konten:** ukuran tulisan 90 sampai 150% (`zoom` pada `.isi-zoom`), sorot judul dan tautan, huruf ramah disleksia (Lexend),
  jarak huruf dan baris, huruf tebal.
- **Warna:** kontras gelap, terang, dan tinggi; saturasi tinggi, rendah, dan monokrom. Filter dipasang di `<html>`, karena
  filter di elemen lain menjadi bingkai bagi elemen `fixed` di dalamnya.
- **Alat:** pemandu baca, hentikan animasi, kursor besar.
- Setiap kerangka panel memakai `useAkarAksesibilitas()`. Semua aturannya di `@media screen`, dan `@media print` melepas zoom
  serta filter, jadi transkrip dan sertifikat tercetak seperti aslinya.

### Cetak

- Transkrip mencetak `LembarTranskrip.jsx`, lembar resmi yang hanya ada di kertas. Tampilan layar, grafik, dan tombol tidak ikut.
- Tabel lebar diberi `print:overflow-visible print:min-w-0`, dan latar belang memakai `print-color-adjust: exact`.
- Alamat kampus di kaki lembar adalah `div` ber-`fixed`, bukan `<footer>`, karena aturan cetak menyembunyikan semua `<footer>`.
- Sertifikat dicetak A4 lanskap (`LembarSertifikat.jsx`). Lembarnya baru dipasang sesudah `POST /api/sertifikat/cetak`
  mengizinkan, lalu dilepas pada `afterprint`. Jadi Ctrl+P biasa tidak mencetak sertifikat, dan setiap cetak tercatat.
- Admin bisa mencetak atas nama mahasiswa dari Cetak Sertifikat, dengan syarat yang sama.

### Halaman profil

- Satu halaman untuk semua peran. Kolom abu-abu milik institusi (nama, NIM, email, prodi, angkatan) dan tidak bisa disunting;
  kolom putih milik pengguna (telepon, ponsel, alamat, foto).
- Kunci akun selalu disusun lewat `kunciSesi()`: NIM untuk mahasiswa dan NIP untuk dosen.
- Foto disimpan 256px, dengan berkas sumber paling besar 5 MB. Isian diperiksa ulang di `src/server/profil.js`.

## Yang belum selesai

- **Back-end:** `semesterDari()` di `src/server/muat.js` masih menerima nilai Semester 1 untuk angkatan yang belum mulai bila
  dikirim langsung ke API.
- **Lupa kata sandi:** sesi lama tidak dicabut saat sandi diganti, dan belum ada batas per alamat IP.
- **Akses angkatan:** admin belum bisa meminta aksesnya sendiri, dan tab Aktivitas di Log belum disaring per angkatan.
- **Hapus akun mahasiswa:** riwayat nilainya tampil tanpa NIM dan nama di Log Aktivitas, dan masih terlihat admin yang
  angkatannya tersembunyi.
- **Wewenang:** baru empat sakelar; belum ada jadwal buka-tutup otomatis dan kabar di lonceng.
- **Belum bisa diatur dari layar:** rubrik huruf mutu dan indikator perilaku. Rubrik dan catatan dosen per tugas belum disimpan.
- **Halaman Angkatan** menghitung di front-end; `GET /api/angkatan` dan `POST /api/angkatan/pratinjau` belum dipakai layar.
- **Lonceng mahasiswa** untuk status akses cetak sertifikat belum ada.
- **Terjemahan:** draf isi kurikulum dan nama prodi menunggu diperiksa tim.
- **Kotak surat** `vibe@umn.ac.id` belum dibuat (bertanda `// TODO` di `src/lib/layanan.js`).
- **Akses Pengguna:** daftar akun belum berhalaman.
- **Kaca panel dosen dan mahasiswa** masih memakai `saturate()`, yang membuat tulisan sedikit lebih tipis di Chrome.
