/* Kamus Indonesia ke Inggris; aturan penulisan: lihat README.md › Kamus dan terjemahan. */

export const EN = {
  /* ------------------------------ kerangka ------------------------------- */
  'Menu navigasi': 'Navigation menu',
  'Buka menu navigasi': 'Open navigation menu',
  'Tutup menu navigasi': 'Close navigation menu',
  'Menu mahasiswa': 'Student menu',
  'Menu akun': 'Account menu',
  'Pilih bahasa': 'Choose language',
  'Aktifkan mode gelap': 'Switch to dark mode',
  'Aktifkan mode terang': 'Switch to light mode',
  Profil: 'Profile',
  Keluar: 'Sign out',
  'Memuat data…': 'Loading data…',
  'Coba lagi': 'Try again',
  'Setiap penyimpanan langsung tercatat di basis data dan bisa dibatalkan per batch.':
    'Every save is recorded straight to the database and can be rolled back per batch.',
  Pintasan: 'Shortcuts',
  // Sama di kedua bahasa (SAMA di scripts/bahasa.mjs), tetapi perlu entri supaya terjemah() tidak memperingatkan.
  Helpdesk: 'Helpdesk',
  'Kelas saya': 'My class',
  'Rujukan & catatan': 'Reference & logs',
  'Biro Kemahasiswaan & Humaniora': 'Student Affairs & Humanities Bureau',
  'Senin sampai Jumat, 08.00 hingga 17.00 WIB': 'Monday to Friday, 08.00 to 17.00 WIB',

  /* -------------------------------- peran -------------------------------- */
  'Super Admin': 'Super Admin',
  Kemahasiswaan: 'Student Affairs',
  Dosen: 'Lecturer',
  Mahasiswa: 'Student',
  Pengguna: 'User',

  /* ------------------------------- navigasi ------------------------------ */
  Transkrip: 'Transcript',
  'Peta Perjalanan': 'Road Map',
  Riwayat: 'History',
  Sertifikat: 'Certificate',

  /* -------------------------------- masuk -------------------------------- */
  'Dashboard Monitoring': 'Monitoring Dashboard',
  'Tiga area pengembangan, sepuluh aspek CPMK, dinilai lewat PDP, mata kuliah humaniora, dan program kampus sepanjang Semester 1 sampai 3.':
    'Three development areas and ten CPMK aspects, graded through PDP, humanities courses, and campus programmes across Semesters 1 to 3.',
  'Masuk ke dashboard': 'Sign in to the dashboard',
  'Masuk menggunakan akun SSO kampus.':
    'Sign in using your UMN SSO account.',
  'Ayo semangat mencari human skill kamu.': 'Come on, let’s discover your human skills.',
  'Kata sandi': 'Password',
  'Lupa kata sandi?': 'Forgot password?',
  'Lihat kata sandi': 'Show password',
  Sembunyikan: 'Hide',
  Tampilkan: 'Show',
  Masuk: 'Sign in',
  'Memverifikasi…': 'Verifying…',
  'Pengembangan diri: etika, pengendalian emosi, kemandirian, dan penalaran.':
    'Personal growth: ethics, emotional regulation, independence, and reasoning.',
  'Pengembangan relasi: kolaborasi, kepercayaan, empati, dan penanganan konflik.':
    'Relational growth: collaboration, trust, empathy, and conflict handling.',
  'Pengembangan peran profesional: kepemimpinan dan kewargaan organisasi.':
    'Professional growth: leadership and organisational citizenship.',
  'Apa sih VIBE itu?': 'What is VIBE?',
  'VIBE (Values, Intelligence, Behavior & Excellence) merupakan sistem penilaian yang dirancang untuk mengevaluasi dan mengembangkan kemampuan interpersonal, keterampilan teknis, dan kompetensi lainnya pada mahasiswa Universitas Multimedia Nusantara. Diantaranya ada tiga penilaian seperti dibawah ini:':
    'VIBE (Values, Intelligence, Behavior & Excellence) is an assessment system designed to evaluate and develop the interpersonal abilities, technical skills, and other competencies of Universitas Multimedia Nusantara students. It covers the three assessment areas below:',
  /* Pesan galat masuk, dari src/lib/auth.jsx dan src/server/masuk.js. */
  'Email dan kata sandi wajib diisi.': 'Email and password are required.',
  'Email atau kata sandi salah.': 'Incorrect email or password.',
  'Akun ini dinonaktifkan. Hubungi Biro Kemahasiswaan.':
    'This account has been deactivated. Contact the Student Affairs Bureau.',
  'Data akun ini belum lengkap. Hubungi Biro Kemahasiswaan.':
    'This account’s details are incomplete. Contact the Student Affairs Bureau.',
  'Server tidak bisa dihubungi. Periksa koneksi, lalu coba lagi.':
    'Cannot reach the server. Check your connection, then try again.',
  'Gagal masuk. Coba lagi.': 'Sign-in failed. Try again.',
  'Server sedang bermasalah. Coba lagi sebentar lagi.':
    'The server is having problems. Try again in a moment.',
  'Basis data tidak bisa dihubungi. Pastikan MySQL sudah berjalan.':
    'Cannot reach the database. Make sure MySQL is running.',

  /* -------------------------------- sapaan ------------------------------- */
  'Selamat pagi': 'Good morning',
  'Selamat siang': 'Good afternoon',
  'Selamat sore': 'Good evening',
  'Selamat malam': 'Good evening',

  /* ------------------------------ status umum ---------------------------- */
  Semua: 'All',
  Berjalan: 'In progress',
  /* Istilah sejak rapat 24 Okt 2026: angkatan "disahkan" (dulu dikunci), aspek "final", dan aspek yang semesternya
     belum tiba "belum dibuka" (dulu terkunci). */
  Disahkan: 'Ratified',
  'Sudah final': 'Already final',
  Sementara: 'Provisional',
  sementara: 'provisional',
  'Menunggu nilai': 'Awaiting score',
  'Belum dinilai': 'Not yet graded',
  'Belum Memenuhi': 'Not Met',
  Menunggu: 'Pending',
  Disetujui: 'Approved',
  Ditolak: 'Rejected',
  'Menunggu keputusan': 'Awaiting decision',
  'belum masuk': 'awaiting score',
  'Dibuka pada Semester {n}': 'Opens in Semester {n}',
  'Dibuka Semester {n}': 'Opens in Semester {n}',
  'Fase {n}': 'Phase {n}',

  /* ------------------------------- dashboard ----------------------------- */
  'Nilai akhir': 'Final score',
  'Grade {huruf}': 'Grade {huruf}',
  'Aspek dinilai': 'Aspects graded',
  'Aspek final': 'Final aspects',
  'Semester {n} dari {total}': 'Semester {n} of {total}',
  '{n} dari {total}': '{n} of {total}',
  'Periode {periode}': 'Period {periode}',
  'Buka Transkrip': 'Open Transcript',
  '{n}/{total} dinilai · sertifikat {keadaan}': '{n}/{total} graded · certificate {keadaan}',
  siap: 'ready',
  belum: 'not ready',
  Rincian: 'Details',
  Tutup: 'Close',
  'Aspek yang sudah dinilai': 'Aspects already graded',
  /* --------------------------- sebaran aspek ----------------------------- */
  'Sebaran nilai aspek': 'Aspect score spread',
  '{n} aspek dinilai': '{n} aspects graded',
  '{n} belum dibuka': '{n} not open yet',
  'rata-rata minimal {n}': 'minimum average {n}',
  'Sebaran nilai {n} aspek pada skala 0 sampai 100, terendah {rendah}, tertinggi {tinggi}':
    'Spread of {n} aspect scores on a 0 to 100 scale, lowest {rendah}, highest {tinggi}',
  '{n} aspek belum dibuka': '{n} aspects not open yet',
  'Semua aspek sudah dibuka': 'All aspects are open',
  'Belum tersedia': 'Not available yet',
  '{n} syarat belum terpenuhi': '{n} requirements not met',

  'Aspek penilaian': 'Assessment aspects',
  'Ketuk salah satu untuk melihat komponen nilainya':
    'Tap one to see the components behind its score',
  'Saring aspek': 'Filter aspects',
  'Belum ada aspek di kelompok ini.': 'No aspects in this group yet.',
  'Lihat Selengkapnya': 'See more',
  'Lihat transkrip lengkap': 'See the full transcript',

  '{n} dari {total} aspek dinilai': '{n} of {total} aspects graded',

  'Perjalanan semester': 'Semester journey',
  'Selesai · {total} aspek': 'Complete · {total} aspects',
  'Sedang berjalan · {n} dari {total} aspek dinilai':
    'In progress · {n} of {total} aspects graded',
  'Belum dibuka · {total} aspek': 'Not open yet · {total} aspects',
  'Buka Peta Perjalanan': 'Open Road Map',

  /* --------------------------------- lonceng ----------------------------- */
  '{n} komponen belum dinilai': '{n} components not yet graded',
  'Komponen belum dinilai': 'Components not yet graded',
  '{n} komponen': '{n} components',
  'Menunggu konfirmasi lebih lanjut kepada dosen terkait.':
    'Awaiting further confirmation from the lecturer concerned.',
  'dari {sumber}': 'from {sumber}',
  'Nilai akan diunggah dosen pengampu atau unit kemahasiswaan pada akhir periode ujian.':
    'Scores are uploaded by the course lecturer or the student affairs unit at the end of the exam period.',
  'Lihat di transkrip': 'See it in the transcript',

  /* ------------------------------ peta perjalanan ------------------------ */
  'Anda sedang menjalani Semester {n} dari {total}.': 'You are in Semester {n} of {total}.',
  'Seluruh {total} semester program sudah Anda selesaikan.':
    'You have completed all {total} semesters of the programme.',
  'Program Anda belum dimulai.': 'Your programme has not started yet.',
  'Ketuk satu semester untuk melihat kegiatan dan nilainya.':
    'Tap a semester to see its activities and scores.',
  'Anda di sini': 'You are here',
  'nilai semester': 'semester score',
  Selesai: 'Complete',
  'Sedang berjalan': 'In progress',
  'Belum dibuka': 'Not open yet',
  'belum dibuka': 'not open yet',
  '{nilai} · {dinilai}/{total} aspek': '{nilai} · {dinilai}/{total} aspects',
  '{n} cluster belum dibuka sehingga sumbunya kosong, bukan bernilai nol.':
    '{n} clusters are not open yet, so their axes are empty, not zero.',
  '{daftar} baru dinilai sebagian karena aspeknya melintasi dua semester.':
    '{daftar} is only partly graded because its aspects span two semesters.',
  /* Arti kode di bawah tabel transkrip dan tugas yang paling menurunkan nilai aspek (rincian aspek). */
  'Arti kode di tabel': 'What the codes mean',
  'Kode aspek': 'Aspect codes',
  'A.1 berarti aspek pertama di area A, dan seterusnya.': 'A.1 is the first aspect in area A, and so on.',
  'Personal Development Program': 'Personal Development Program',
  'Mata Kuliah Humaniora / Kebangsaan': 'Humanities / National Studies Courses',
  'Student Service & Engagement': 'Student Service & Engagement',
  'Paling menurunkan nilai': 'Pulls the score down most',
  '{komponen}, nilai {nilai} dengan bobot {bobot}%.': '{komponen}, score {nilai} with a weight of {bobot}%.',
  'paling menurunkan': 'pulls down most',
  /* Sama di kedua bahasa; dicatat supaya lapisan bahasa tidak memperingatkan kunci yang hilang. */
  Dashboard: 'Dashboard',
  'Area {kode}': 'Area {kode}',
  PDP: 'PDP',
  '{total} aspek': '{total} aspects',
  'semua final': 'all final',
  '{total} aspek · dibuka pada Semester {semester}':
    '{total} aspects · opens in Semester {semester}',
  'Semester ini belum dibuka. Berikut kegiatan yang akan Anda jalani. Nilainya baru muncul setelah Semester {n} dimulai dan penilai mengunggahnya.':
    'This semester has not opened yet. Below are the activities you will take. Scores appear only after Semester {n} begins and the assessor uploads them.',
  'Aspek yang dibentuk': 'Aspects formed',
  'Kegiatan yang akan dijalani': 'Activities to come',
  'Kegiatan yang sudah dijalani': 'Activities completed',
  'Kegiatan semester ini': 'Activities this semester',
  '{n} dari {total} dinilai': '{n} of {total} graded',
  'Program ini dijalani, tetapi tidak menghasilkan komponen nilai.':
    'This programme runs, but produces no graded component.',
  'Lihat rincian bobot di transkrip': 'See the weighting detail in the transcript',
  'Nilai datang dari jalur {daftar}.': 'Scores come from these tracks: {daftar}.',
  'Kode kecil di samping tiap kegiatan menunjukkan aspek mana yang menerima nilainya.':
    'The small code beside each activity shows which aspect receives its score.',

  /* --------------------------------- riwayat ----------------------------- */
  'Catatan nilai yang sudah masuk: komponen apa, dari jalur mana, siapa yang menetapkannya, dan kapan.':
    'A record of the scores that have arrived: which component, from which track, who set it, and when.',
  '{n} komponen sudah dinilai': '{n} components have been graded',
  ' dan {n} masih ditunggu dari penilai': ' and {n} are still awaited from assessors',
  'Riwayat penilaian': 'Assessment history',
  'berarti aspeknya sudah ditetapkan final oleh Kemahasiswaan dan nilainya tidak akan berubah lagi.':
    'means Student Affairs has marked the aspect final and its score will not change again.',
  'Saring riwayat': 'Filter history',
  'Belum ada catatan pada kelompok ini.': 'No records in this group yet.',
  'Lihat bobot tiap komponen di transkrip': 'See each component weighting in the transcript',
  'Pengajuan koreksi saya': 'My correction requests',
  'Keberatan yang Anda kirim lewat transkrip, beserta keputusannya.':
    'Objections you submitted from the transcript, with their decisions.',
  'disetujui oleh': 'approved by',
  'dinilai oleh': 'graded by',
  'penilai tidak tercatat': 'assessor not recorded',
  ' (belum final, masih bisa berubah)': ' (not final yet, can still change)',
  'Anda ajukan {tanggal}': 'You submitted this on {tanggal}',
  Diputuskan: 'Decided by',
  pada: 'on',
  'Belum ada keputusan dari Biro Kemahasiswaan.':
    'No decision from the Student Affairs Bureau yet.',
  'Tanpa tanggal': 'No date',

  /* --------------------------------- bulan ------------------------------- */
  Januari: 'January',
  Februari: 'February',
  Maret: 'March',
  Mei: 'May',
  Juni: 'June',
  Juli: 'July',
  Agustus: 'August',
  Oktober: 'October',
  Desember: 'December',

  /* -------------------------------- transkrip ---------------------------- */
  'Transkrip Capaian VIBE': 'VIBE Achievement Transcript',
  'Program pembinaan VIBE terintegrasi, Semester 1 sampai {total}':
    'Integrated VIBE development programme, Semester 1 to {total}',
  'Dokumen final': 'Final document',
  // Catatan kaki transkrip sementara, dari statusDokumenTranskrip() di src/lib/rules.js.
  'Dokumen ini bukan bukti kelulusan pembinaan skill.': 'This document is not proof of completing the skill development programme.',
  Nama: 'Name',
  'Program studi': 'Study programme',
  Fakultas: 'Faculty',
  Angkatan: 'Cohort',
  'Semester berjalan': 'Current semester',
  'Periode cetak': 'Print period',
  'Nomor dokumen': 'Document number',
  'Cetak / simpan PDF': 'Print / save as PDF',
  'Rincian capaian per semester': 'Achievement detail by semester',
  'Klik baris aspek untuk melihat komponen asesmen yang membentuk nilainya':
    'Click an aspect row to see the assessment components behind its score',
  Kode: 'Code',
  'Aspek CPMK': 'CPMK aspect',
  'Sumber penilaian': 'Assessment source',
  Nilai: 'Score',
  Penilaian: 'Scores',
  Huruf: 'Grade',
  Predikat: 'Grade',
  'skema belum final': 'scheme not final',
  'Skema belum final': 'Draft scheme',
  Draft: 'Draft',
  'Aspek yang semesternya belum tiba ditandai gembok dan sengaja tidak diberi angka, bukan bernilai nol.':
    'Aspects whose semester has not arrived are marked with a padlock and deliberately given no number, not a zero.',
  'Bobot masih bersifat sementara dan dapat berubah.':
    'Weightings are still provisional and may change.',
  'Ada nilai yang menurutmu keliru?': 'Think a score is wrong?',
  'Kamu tidak bisa mengubah nilai sendiri. Ajukan koreksi dan Biro Kemahasiswaan akan menelusurinya bersama dosen atau unit yang memberi nilai.':
    'You cannot change a score yourself. Submit a correction request and the Student Affairs Bureau will trace it with the lecturer or unit that gave the score.',
  'Tutup formulir': 'Close the form',
  'Ajukan koreksi nilai': 'Request a score correction',
  'Pengajuan kamu': 'Your requests',
  'diajukan {tanggal}': 'submitted {tanggal}',
  'Final, ditetapkan oleh {oleh} pada {tanggal}.': 'Final, set by {oleh} on {tanggal}.',
  'Final, seluruh komponen asesmen sudah dinilai.':
    'Final, every assessment component has been graded.',
  'Nilai aspek ini tidak berubah lagi.': 'This aspect score will not change again.',
  Sumber: 'Source',
  'Komponen asesmen': 'Assessment component',
  Ranah: 'Domain',
  Bobot: 'Weight',
  Penilai: 'Assessor',
  'Tanggal masuk': 'Recorded on',
  Kognitif: 'Cognitive',
  Afektif: 'Affective',
  'Indikator perilaku': 'Behavioural indicators',
  'Rincian indikator belum ditetapkan untuk mata kuliah ini.':
    'Indicator detail has not been set for this course.',
  'Pemetaan indikator perilaku baru tersedia untuk mata kuliah semester 1. Untuk semester berikutnya, rinciannya menyusul setelah skema asesmen diresmikan.':
    'Behavioural indicator mapping is available only for semester 1 courses so far. Detail for later semesters follows once the assessment scheme is confirmed.',
  'Belum ada komponen asesmen yang bisa dikoreksi karena semesternya belum dibuka.':
    'No assessment component can be corrected yet because its semester has not opened.',
  'Komponen yang dipersoalkan': 'Component in question',
  '(nilai {n})': '(score {n})',
  '(belum dinilai)': '(not graded)',
  Alasan: 'Reason',
  'Jelaskan apa yang menurutmu keliru, dan bukti apa yang kamu punya.':
    'Explain what you think is wrong, and what evidence you have.',
  'Kirim pengajuan': 'Submit request',
  Batal: 'Cancel',

  /* ------------------------------- sertifikat ---------------------------- */
  'Daftar periksa lima syarat kelayakan beserta alasannya, pratinjau sertifikat yang masih dikaburkan selama belum layak, dan unduhan A4 lanskap begitu seluruh syarat terpenuhi.':
    'A checklist of the five eligibility requirements with a reason for each, a blurred certificate preview while any requirement is unmet, and an A4 landscape download once all of them are met.',

  /* --------------------- kalimat dari modul perhitungan ------------------ */
  'Belum ada nilai yang masuk dari penilai': 'No score has arrived from the assessor yet',
  'Seluruh komponen sudah dinilai, menunggu semester ini ditutup':
    'All components graded, waiting for this semester to close',
  'Seluruh komponen sudah dinilai, menunggu ditetapkan final oleh Kemahasiswaan':
    'All components graded, waiting for Student Affairs to mark it final',
  'Seluruh {total} aspek sudah dinilai dan final.':
    'All {total} aspects have been graded and are final.',
  'Nilai sementara berdasarkan {n} dari {total} aspek. Nilai final terbit setelah Semester {semester}.':
    'Provisional score based on {n} of {total} aspects. The final score is issued after Semester {semester}.',

  /* --------------------------------- profil ------------------------------ */
  Umum: 'General',
  Opsional: 'Optional',
  'Foto profil': 'Profile photo',
  'Buka semua': 'Expand all',
  'Tutup semua': 'Collapse all',
  'Nama depan': 'First name',
  'Nama belakang': 'Last name',
  'Nomor induk mahasiswa': 'Student ID number',
  'Nomor induk dosen': 'Lecturer ID number',
  'Unit pengelola': 'Managing unit',
  'Nama resmi': 'Official name',
  'Penanggung jawab': 'Person in charge',
  'Alamat email': 'Email address',
  'Foto saat ini': 'Current photo',
  'Foto baru': 'New photo',
  Terpasang: 'Set',
  'Belum ada, inisial nama yang dipakai': 'None yet, initials are used instead',
  'Edit foto profil': 'Edit profile photo',
  'Lihat foto profil': 'View profile photo',
  'Tutup foto profil': 'Close profile photo',
  Lihat: 'View',
  'Siap disimpan': 'Ready to save',
  'Foto akan dihapus': 'Photo will be removed',
  'JPG, PNG, WebP, atau GIF. Maksimal {mb} MB.': 'JPG, PNG, WebP, or GIF. Maximum {mb} MB.',
  Akademik: 'Academic',
  'Penugasan mengajar': 'Teaching assignment',
  'Periode kerja': 'Working period',
  'Unit asesmen': 'Assessment unit',
  'Kelas yang dipegang': 'Class taught',
  'Menentukan pengumpulan mana yang masuk ke antrean Anda dan komponen mana yang boleh Anda nilai.':
    'Determines which submissions enter your queue and which components you may grade.',
  'Periode aktif': 'Active period',
  'Cakupan program': 'Programme scope',
  'Semester 1 sampai {total}': 'Semester 1 to {total}',
  'Rata-rata minimal sertifikat': 'Certificate minimum average',
  'Rata-rata minimal diubah lewat berkas konfigurasi oleh pengelola sistem. Bobot diubah di halaman Kurikulum CPMK.':
    'The minimum average is changed in the configuration file by the system administrator. Weightings are changed on the CPMK Curriculum page.',
  Telepon: 'Phone',
  Ponsel: 'Mobile',
  Alamat: 'Address',
  'Perbarui profil': 'Update profile',
  'Perubahan tersimpan': 'Changes saved',
  'Nomor telepon hanya boleh berisi angka, spasi, dan tanda + ( ) - .':
    'A phone number may contain only digits, spaces, and the characters + ( ) - .',
  'Nomor ponsel hanya boleh berisi angka, spasi, dan tanda + ( ) - .':
    'A mobile number may contain only digits, spaces, and the characters + ( ) - .',

  /* --------------------------- layanan tambahan -------------------------- */
  'Layanan tambahan': 'Additional services',
  'Tutup layanan tambahan': 'Close additional services',
  'Butuh bantuan?': 'Need help?',
  'Pilih saluran yang paling cocok dengan pertanyaan Anda.':
    'Pick the channel that best fits your question.',
  'Kirim pesan, dibalas pada jam kerja': 'Send a message, answered during office hours',
  'Hubungi lewat telepon pada jam kerja': 'Call us during office hours',
  'Surel VIBE': 'VIBE email',
  'Untuk pertanyaan yang butuh lampiran': 'For questions that need an attachment',

  /* --------------------- panel dosen & Kemahasiswaan ---------------------- */

  /* --------------------------- kerangka & nav ---------------------------- */
  'Halaman lain': 'More pages',
  'Lihat selengkapnya': 'See more',
  'Angkatan & Sertifikat': 'Cohorts & Certificates',
  'Kurikulum CPMK': 'CPMK Curriculum',
  'Log Aktivitas': 'Activity Log',
  'Data Mahasiswa': 'Student Data',
  'Input & Import Nilai': 'Enter & Import Scores',
  /* Admin biasa hanya membaca nilai sejak rapat 24 Okt 2026 (halaman nilai, lonceng, riwayat batch). */
  'Nilai Mahasiswa': 'Student Scores',
  'Pilih semester, sumber penilaian, dan angkatan untuk melihat nilai yang tersimpan. Nilai diunggah dosen lewat Excel; perubahan nilai lewat Super Admin.':
    'Choose a semester, assessment source, and cohort to see the stored scores. Lecturers upload scores through Excel; score changes go through the Super Admin.',
  'Sel kosong berarti nilainya belum diunggah dosen. Admin hanya melihat; perubahan nilai lewat Super Admin.':
    'An empty cell means the lecturer has not uploaded that score yet. Admins only view; score changes go through the Super Admin.',
  'belum ada': 'none yet',
  Tersimpan: 'Saved',
  'unggahan dosen': 'lecturer upload',
  'Setiap penyimpanan nilai tercatat sebagai satu batch; hanya Super Admin yang bisa membatalkannya':
    'Every score save is recorded as one batch; only the Super Admin can roll it back',
  'Persetujuan Nilai Dosen': 'Lecturer Score Approval',
  'Data Masuk': 'Incoming Submissions',
  'Input Nilai': 'Enter Scores',
  'Status Usulan': 'Proposal Status',
  Pengumpulan: 'Submissions',
  'Program Studi': 'Study Programme',
  Overview: 'Overview',

  /* ------------------------------ umum tabel ----------------------------- */
  Baris: 'Row',
  'baris {n}': 'row {n}',
  '{n} baris': '{n} rows',
  Tindakan: 'Action',
  terlambat: 'late',
  Komponen: 'Component',
  Tugas: 'Task',
  Keterangan: 'Notes',
  'Di berkas': 'In file',
  'Jadi nilai': 'Becomes',
  Tabel: 'Table',
  Sebelumnya: 'Previous',
  Berikutnya: 'Next',
  Menampilkan: 'Showing',
  dari: 'of',
  'dari {n}': 'of {n}',
  'Cari mahasiswa': 'Search students',
  'Nama atau NIM…': 'Name or student ID…',
  'Nama, NIM, atau prodi…': 'Name, student ID, or programme…',
  Semester: 'Semester',
  'Kelengkapan nilai': 'Score completeness',
  Berhak: 'Eligible',
  Belum: 'Not yet',
  Terpenuhi: 'Met',
  Dibatalkan: 'Cancelled',
  Tolak: 'Reject',
  Setujui: 'Approve',
  Tandai: 'Mark',
  Tanda: 'Mark',
  'sementara atau final': 'provisional or final',
  'Tandai final': 'Mark as final',
  'Tahan sementara': 'Hold as provisional',
  'Ikuti aturan': 'Follow the rule',
  'Tandai status untuk {nama}': 'Mark status for {nama}',
  'harus 0–100': 'must be 0–100',
  'di luar rentang 0–100': 'outside the 0–100 range',
  '{n} sel di luar rentang 0–100': '{n} cells outside the 0–100 range',
  'nilai {n}': 'score {n}',
  '{n} nilai': '{n} scores',
  '{n} kosong': '{n} empty',
  '{n} mahasiswa': '{n} students',
  '{n} transkrip final': '{n} final transcripts',
  '{n} final': '{n} final',
  'rata-rata {n}': 'average {n}',
  'aspek {kode}': 'aspect {kode}',
  '{n} aspek': '{n} aspects',
  'Angkatan {label}': 'Cohort {label}',
  'angkatan {id}': 'cohort {id}',
  'beberapa angkatan': 'several cohorts',
  // Jenis tindakan baru di Log Aktivitas (LABEL_LOG di src/lib/labelLog.js, diterjemahkan lewat t(label)).
  'Teruskan pengajuan ubah nilai': 'Forward score change request',
  'Setujui dan terapkan ubah nilai': 'Approve and apply score change',
  'Tolak pengajuan ubah nilai': 'Reject score change request',
  'Setujui akses cetak sertifikat': 'Approve certificate print access',
  'Tolak akses cetak sertifikat': 'Reject certificate print access',
  'Cabut akses cetak sertifikat': 'Revoke certificate print access',
  'Buka sertifikat untuk dicetak': 'Open certificate for printing',
  'batch {id}': 'batch {id}',
  'Buka transkrip {nama}': 'Open {nama}’s transcript',
  'Ekspor CSV': 'Export CSV',
  Segarkan: 'Refresh',
  'Segarkan data sekarang': 'Refresh data now',
  'Terakhir diperbarui {tanggal}, {jam} WIB': 'Last updated {tanggal}, {jam} WIB',
  'baru saja': 'just now',
  '{n} menit lalu': '{n} minutes ago',
  '{n} jam lalu': '{n} hours ago',

  /* ------------------------------ ringkasan ------------------------------ */
  'Mahasiswa terpantau': 'Students tracked',
  'Nilai sudah final': 'Scores already final',
  'Nilai yang sudah masuk': 'Scores already in',
  'Di atas batas {ambang}': 'Above the {ambang} threshold',
  'Tampilkan 6 halaman lainnya': 'Show 6 more pages',
  'Masukkan nilai satu per satu, atau unggah rekap dari Excel.':
    'Enter scores one by one, or upload a summary from Excel.',
  'Setujui atau tolak nilai yang dikirim dosen pengampu.':
    'Approve or reject the scores sent by course lecturers.',
  'Cari mahasiswa, lihat nilainya, dan buka transkrip lengkapnya.':
    'Find a student, see their scores, and open the full transcript.',
  'Bandingkan capaian antar program studi, fakultas, dan angkatan.':
    'Compare achievement across study programmes, faculties, and cohorts.',
  'Sepuluh aspek penilaian, komponen asesmen, dan bobotnya.':
    'Ten assessment aspects, their components, and their weightings.',
  'Catatan setiap perubahan nilai beserta siapa yang mengubahnya.':
    'A record of every score change and who made it.',

  /* --------------------------- capaian per unit -------------------------- */
  'Bandingkan capaian CPMK antar program studi, fakultas, dan angkatan.':
    'Compare CPMK achievement across study programmes, faculties, and cohorts.',
  'Unduh rekap': 'Download summary',
  'Unit terpantau': 'Units tracked',
  'Program studi pada filter aktif': 'Study programmes under the active filter',
  'Rata-rata gabungan': 'Combined average',
  'Transkrip final': 'Final transcripts',
  'Tabel perbandingan': 'Comparison table',
  'Tidak ada data pada filter ini': 'No data under this filter',
  'Ubah pilihan fakultas, angkatan, atau semester.':
    'Change the faculty, cohort, or semester selection.',
  'Angka ini bukan peringkat. Komposisi mata kuliah, jadwal asesmen, dan program kemahasiswaan tiap unit berbeda, dan angkatan yang berbeda berada pada semester yang berbeda pula, sehingga jumlah aspek yang sudah dinilai tidak sama.':
    'These numbers are not a ranking. Course composition, assessment schedules, and student programmes differ per unit, and different cohorts are in different semesters, so the number of graded aspects is not the same.',
  'Warna menandai area pengembangan, bukan peringkat.':
    'Colour marks the development area, not a ranking.',
  'Dari {n} mahasiswa yang sudah punya nilai': 'Of {n} students who already have a score',
  'Belum ada mahasiswa yang punya nilai, jadi sebarannya belum bisa digambar.':
    'No student has a score yet, so the distribution cannot be drawn.',

  /* ---------------------------- data mahasiswa --------------------------- */
  'Belum ada data mahasiswa': 'No student data yet',
  'Data mahasiswa akan tampil di sini begitu tersedia.':
    'Student data will appear here once it is available.',
  'Tidak ada mahasiswa yang cocok': 'No matching students',
  'Longgarkan filter, ubah kata kunci, atau setel kelengkapan nilai kembali ke “Semua”.':
    'Loosen the filters, change the keyword, or set score completeness back to “All”.',
  'Kolom “Aspek dinilai” menghitung aspek yang sudah punya nilai, bukan aspek yang sudah dibuka. Aspek yang semesternya belum tiba tidak pernah ikut dihitung.':
    'The “Aspects graded” column counts aspects that already have a score, not aspects that are open. Aspects whose semester has not arrived are never counted.',
  'Mahasiswa tidak ditemukan': 'Student not found',
  'Tidak ada data dengan tanda pengenal {id}.': 'There is no record with the identifier {id}.',
  'Kembali ke daftar': 'Back to the list',
  'Kembali ke data mahasiswa': 'Back to student data',
  'Kelayakan sertifikat': 'Certificate eligibility',
  'Lima syarat yang diperiksa sistem': 'The five requirements the system checks',
  'Buka di Cetak Sertifikat': 'Open in Print Certificates',
  'Riwayat perubahan nilai': 'Score change history',

  /* ---------------------------- cetak sertifikat --------------------------- */
  'Cetak Sertifikat': 'Print Certificates',
  '{n} dari {total} mahasiswa sudah berhak atas sertifikat': '{n} of {total} students are eligible for a certificate',
  'Belum berhak': 'Not yet eligible',
  Kelayakan: 'Eligibility',
  Aksi: 'Action',
  '+{n} syarat lain': '+{n} more',
  Cetak: 'Print',
  'Cetak sertifikat {nama}': 'Print certificate for {nama}',
  'Ubah kata kunci, angkatan, atau pilihan kelayakan.': 'Change the keyword, cohort, or eligibility filter.',

  /* -------------------------------- angkatan ------------------------------- */
  'Pantau kelengkapan nilai tiap angkatan, temukan mahasiswa yang perlu ditindaklanjuti, lalu sahkan nilai angkatan yang programnya sudah selesai.':
    'Monitor score completeness for each cohort, find the students who need follow-up, then ratify the scores of cohorts whose programme has finished.',
  'Angkatan yang ditambahkan di basis data akan tampil di sini.': 'Cohorts added to the database will appear here.',
  Aktif: 'Active',
  'Masuk {periode}': 'Intake {periode}',
  'Program selesai': 'Programme finished',
  'Nilai terisi': 'Scores in',
  'Perlu tindak lanjut': 'Needs follow-up',
  'Nilai yang belum masuk': 'Scores not yet in',
  'Per semester dan unit penilai, hanya semester yang sudah dibuka': 'By semester and assessing unit, opened semesters only',
  '{n} nilai kosong pada {m} mahasiswa': '{n} empty scores across {m} students',
  'Masukkan nilai': 'Enter scores',
  'Semua nilai sudah masuk': 'All scores are in',
  'Angkatan ini belum punya mahasiswa': 'This cohort has no students yet',
  'Angkatan ini belum punya mahasiswa.': 'This cohort has no students yet.',
  'Tidak ada komponen kosong pada semester yang sudah dibuka.': 'No component is empty in the semesters already opened.',
  'Mahasiswa yang perlu ditindaklanjuti': 'Students who need follow-up',
  '{n} dari {total} mahasiswa': '{n} of {total} students',
  'Nilai belum lengkap': 'Incomplete scores',
  'Di bawah rata-rata minimal': 'Below the minimum average',
  'Masih sementara': 'Still provisional',
  'Yang perlu ditindaklanjuti': 'What needs follow-up',
  'Nilai akhir {nilai}, di bawah rata-rata minimal {n}': 'Final score {nilai}, below the minimum average of {n}',
  'Aspek {daftar} masih sementara': 'Aspects {daftar} are still provisional',
  'Lihat transkrip': 'View transcript',
  'Tidak ada yang perlu ditindaklanjuti': 'Nothing needs follow-up',
  'Belum ada nilai yang kosong, di bawah rata-rata minimal, atau tertahan sementara di angkatan ini.':
    'No score in this cohort is empty, below the minimum average, or held as provisional.',
  'Pengesahan nilai angkatan': 'Cohort score ratification',
  'Angkatan yang nilainya sudah disahkan memenuhi syarat sertifikat.':
    'A cohort with ratified scores meets the certificate requirement.',
  'Nilai angkatan {label} sudah disahkan.': 'Cohort {label} scores are ratified.',
  'Nilainya masih bisa diubah atau dilengkapi Kemahasiswaan, asal disertai alasan yang tercatat.':
    'Student Affairs can still change or complete its scores, as long as a recorded reason is given.',
  'Cetak sertifikat angkatan ini': 'Print certificates for this cohort',
  'Belum bisa disahkan': 'Cannot be ratified yet',
  'Angkatan ini baru di Semester {n} dari {total}. Pengesahan bisa dilakukan setelah Semester {total} berakhir.':
    'This cohort is only in Semester {n} of {total}. Its scores can be ratified once Semester {total} has ended.',
  'Bila disahkan sekarang, {b} dari {n} mahasiswa berhak atas sertifikat.':
    'If ratified now, {b} of {n} students will be eligible for a certificate.',
  '{n} belum berhak, {k} di antaranya karena nilainya belum lengkap. Nilai masih bisa dilengkapi sesudah disahkan, asal disertai alasan yang tercatat.':
    '{n} are not yet eligible, {k} of them because their scores are incomplete. Scores can still be completed after ratification, as long as a recorded reason is given.',
  'Ketik {label} untuk mengonfirmasi': 'Type {label} to confirm',
  'Sahkan nilai angkatan': 'Ratify cohort scores',
  'Pengesahan tidak bisa dibatalkan dari halaman ini.': 'Ratification cannot be undone from this page.',
  'Setiap perubahan tercatat beserta aktornya': 'Every change is recorded with who made it',
  'Belum ada perubahan tercatat': 'No change recorded yet',
  'Nilai mahasiswa ini masuk sekali lewat batch import dan belum pernah diperbaiki.':
    'This student’s scores arrived once through an import batch and have never been corrected.',
  'Status final aspek': 'Aspect final status',
  'Mode berlaku: {mode}.': 'Active mode: {mode}.',
  'Penandaan di sini selalu menang atas mode.': 'A mark set here always overrides the mode.',
  '{n}/{total} komponen dinilai': '{n}/{total} components graded',
  'Ditandai {tanda} oleh {oleh} pada {tanggal}': 'Marked {tanda} by {oleh} on {tanggal}',
  'Belum ada aspek yang terbuka untuk mahasiswa ini.':
    'No aspect is open for this student yet.',
  'Aspek yang komponennya belum lengkap tidak pernah bisa ditandai final, tombolnya nonaktif beserta alasannya. Tanda final hanya menghentikan perubahan status, bukan mengubah angka.':
    'An aspect whose components are incomplete can never be marked final; the button is disabled together with the reason. The final mark only stops the status from changing, it does not change the number.',

  /* ------------------------------ input nilai ---------------------------- */
  'Input nilai': 'Enter scores',
  'Pilih Yan Akan Di Input': 'Pilih Yan Akan Di Input',
  'Semester wajib dipilih sebelum data bisa dimasukkan':
    'A semester must be chosen before any data can be entered',
  'Semester yang diisi': 'Semester being filled',
  'Belum dipilih': 'Not chosen yet',
  '{n} aspek CPMK berada di semester ini': '{n} CPMK aspects sit in this semester',
  'mengikuti program studi': 'follows the study programme',
  '{n} fakultas': '{n} faculties',
  '{n} program studi': '{n} study programmes',
  'pada pilihan ini': 'in this selection',
  'jenjang {jenjang}': 'level {jenjang}',
  'Pilih semester terlebih dahulu': 'Choose a semester first',
  'Setiap aspek CPMK hanya dinilai pada satu semester tertentu. Tanpa memilih semester, sistem tidak tahu komponen asesmen mana yang boleh diisi, dan nilai yang salah semester akan ditolak.':
    'Each CPMK aspect is graded in one particular semester only. Without a semester the system cannot tell which assessment components may be filled, and scores from the wrong semester are rejected.',
  'Tidak ada komponen {unit} pada Semester {semester}':
    'No {unit} component in Semester {semester}',
  'Dokumen kurikulum memang belum mencantumkan komponen asesmen dari sumber ini untuk semester tersebut. Pilih sumber lain, atau tambahkan komponennya lewat halaman':
    'The curriculum document does not list an assessment component from this source for that semester yet. Choose another source, or add the component from the page',
  'Nilai baru bisa dimasukkan setelah data mahasiswa tersedia.':
    'Scores can be entered once student data is available.',
  'Belum ada data angkatan': 'No cohort data yet',
  'Tambahkan angkatan di basis data lebih dulu; nilai selalu dimasukkan per angkatan.':
    'Add a cohort to the database first; scores are always entered per cohort.',
  'Tidak ada mahasiswa pada pilihan ini': 'No students in this selection',
  'program studi {prodi}': 'study programme {prodi}',
  'fakultas {fakultas}': 'faculty {fakultas}',
  'belum punya mahasiswa terdaftar. Longgarkan pilihan fakultas atau program studi.':
    'has no registered students. Loosen the faculty or study programme selection.',
  'Angkatan {label} belum sampai Semester {semester}':
    'Cohort {label} has not reached Semester {semester}',
  'Angkatan ini baru menempuh Semester {aktif}. Nilai untuk Semester {semester} belum boleh dimasukkan; bila dipaksakan lewat import, seluruh barisnya akan ditolak.':
    'This cohort is only in Semester {aktif}. Scores for Semester {semester} may not be entered yet; if forced through an import, every row will be rejected.',
  'Aspek pada semester ini': 'Aspects in this semester',
  'Komponen dari sumber ini': 'Components from this source',
  'Mahasiswa sasaran': 'Target students',
  'Input manual': 'Manual entry',
  'Import CSV': 'CSV import',
  'Pengajuan koreksi': 'Correction requests',
  'Tidak ada aspek yang bisa diisi dari sumber ini.':
    'No aspect can be filled from this source.',
  '{n} komponen dari {unit}.': '{n} components from {unit}.',
  'Kosongkan sel yang belum dinilai; sel kosong tidak dihitung sebagai nol.':
    'Leave ungraded cells empty; an empty cell is not counted as zero.',
  'Baris yang tidak ditandai mengikuti aturan sistem: aspeknya menjadi final sendiri begitu seluruh komponennya terisi.':
    'An unmarked row follows the system rule: its aspect becomes final on its own once every component is filled.',
  '{n} nilai siap disimpan': '{n} scores ready to save',
  'Belum ada perubahan': 'No change yet',
  'Simpan nilai': 'Save scores',
  '{n} nilai tersimpan sebagai batch {id}.': '{n} scores saved as batch {id}.',
  '{n} aspek ditandai final': '{n} aspects marked final',
  '{n} ditahan sebagai sementara': '{n} held as provisional',
  '{n} mengikuti aturan sistem': '{n} follow the system rule',
  'Status aspek tidak diubah.': 'Aspect status was not changed.',
  '{n} aspek diminta final tetapi komponennya belum lengkap, jadi tetap sementara.':
    '{n} aspects were asked to be final but their components are incomplete, so they stay provisional.',
  'Transkrip dan dashboard {n} mahasiswa berikut sudah dihitung ulang tanpa tindakan tambahan.':
    'The transcript and dashboard of the following {n} students have been recalculated with no further action.',
  'dan {n} mahasiswa lain': 'and {n} other students',

  /* ------------------------------ import CSV ----------------------------- */
  'Unggah rekap nilai': 'Upload a score summary',
  'Berkas mentah dari dosen bisa langsung diunggah: sistem mengenali kolom NIM, menebak kolom mana memetakan ke komponen asesmen mana, mendeteksi skala nilai, lalu mengisi dan menghitungnya otomatis. Semua tebakan bisa Anda koreksi sebelum diproses.':
    'A raw file from a lecturer can be uploaded as is: the system finds the student ID column, guesses which column maps to which assessment component, detects the score scale, then fills and calculates automatically. Every guess can be corrected before processing.',
  'Contoh rekap mentah': 'Sample raw summary',
  'Template baku': 'Standard template',
  'Berkas CSV': 'CSV file',
  'langsung dianalisa setelah dipilih': 'analysed as soon as it is chosen',
  'atau tempel isinya di sini': 'or paste its contents here',
  'Analisa berkas': 'Analyse file',
  'Berkas tidak berisi baris data. Pastikan baris pertama adalah kepala kolom.':
    'The file contains no data rows. Make sure the first row is the column header.',
  'Rekap mentah': 'Raw summary',
  'tidak terdeteksi': 'not detected',
  'Format terbaca': 'Format read',
  'Kolom NIM': 'Student ID column',
  'Baris data': 'Data rows',
  'Kolom terpetakan': 'Columns mapped',
  'Kolom NIM tidak ditemukan. Beri nama kolom itu “NIM” atau “NPM”, lalu unggah ulang.':
    'No student ID column found. Name that column “NIM” or “NPM”, then upload again.',
  'Pemetaan kolom, periksa dan koreksi bila perlu':
    'Column mapping, check and correct if needed',
  'Bila satu komponen menerima beberapa kolom:':
    'When one component receives several columns:',
  'Kolom di berkas': 'Column in file',
  'Contoh isi': 'Sample value',
  Skala: 'Scale',
  'Dipetakan ke komponen': 'Mapped to component',
  Keyakinan: 'Confidence',
  'Asal kolom': 'Source column',
  Konversi: 'Conversion',
  '{n} nilai akan diisi': '{n} scores will be filled',
  '{n} baris ditolak': '{n} rows rejected',
  'Pratinjau hasil perhitungan': 'Calculation preview',
  'Baris ditolak': 'Rejected rows',
  'Format baku terdeteksi': 'Standard format detected',
  'Isi otomatis {n} nilai': 'Auto-fill {n} scores',
  'Konversi skala dan penggabungan kolom hanya mengubah cara nilai dibaca dari berkas; perhitungan aspek, cluster, dan nilai akhir tetap memakai bobot di Kurikulum CPMK. Baris ditolak bila NIM tak dikenal, komponen dari sumber atau semester lain, mahasiswa di luar angkatan sasaran, atau nilai melebihi skala yang dipilih.':
    'Scale conversion and column merging only change how a score is read from the file; aspect, cluster, and final score calculations still use the weightings in the CPMK Curriculum. A row is rejected when the student ID is unknown, the component belongs to another source or semester, the student is outside the target cohort, or the score exceeds the chosen scale.',
  'Mahasiswa bukan angkatan {label}': 'Student is not in cohort {label}',
  'Mahasiswa bukan dari program studi {prodi}':
    'Student is not from the {prodi} study programme',
  'Komponen ini bukan milik Semester {n}': 'This component does not belong to Semester {n}',

  /* ----------------------------- riwayat batch --------------------------- */
  'Riwayat batch': 'Batch history',
  'Batch yang Anda buat bisa dibatalkan; batch periode lalu hanya tercatat':
    'Batches you created can be rolled back; batches from past periods are recorded only',
  'Hapus seluruh perubahan: batch nilai, tanda final aspek, dan usulan dosen? Tindakan ini tidak bisa dibatalkan.':
    'Delete every change: score batches, aspect final marks, and lecturer proposals? This cannot be undone.',
  'Hapus semua perubahan': 'Delete all changes',
  'input manual': 'manual entry',
  'import CSV': 'CSV import',
  'pengajuan koreksi': 'correction request',
  'unggah berkas': 'file upload',
  Rollback: 'Roll back',
  'Batch ini sudah dibatalkan sebelumnya.': 'This batch was already rolled back.',
  'Belum ada batch perubahan': 'No change batch yet',
  'Setiap penyimpanan, baik lewat input manual maupun import, dicatat sebagai satu batch yang bisa dibatalkan sekaligus, dan bertahan setelah halaman dimuat ulang.':
    'Every save, whether by manual entry or import, is recorded as one batch that can be rolled back in full, and survives a page reload.',
  'Batch periode sebelumnya': 'Batches from earlier periods',
  '{n} ditolak': '{n} rejected',
  'Alasan perubahan': 'Reason for change',
  'Alasan rollback': 'Reason for rollback',
  'Wajib, minimal 10 karakter, bila nilai angkatan sudah disahkan atau aspek sudah final':
    'Required, at least 10 characters, if the cohort scores are ratified or the aspect is final',

  /* -------------------------- pengajuan koreksi -------------------------- */
  'Belum ada pengajuan koreksi dari mahasiswa.':
    'No correction request from students yet.',
  'Nilai yang diharapkan': 'Expected score',
  'Catatan keputusan': 'Decision note',

  /* ------------------------------- lonceng ------------------------------- */
  '{n} hal menunggu ditangani': '{n} things waiting to be handled',
  'Pekerjaan yang menunggu': 'Work waiting',
  'Usulan nilai dosen': 'Lecturer score proposals',
  'menunggu persetujuan': 'awaiting approval',
  'Perlu ditinjau': 'Needs review',
  '{n} mahasiswa belum berhak atas sertifikat':
    '{n} students are not yet eligible for a certificate',
  'Sudah sampai Semester {semester}, nilainya masih di bawah {ambang}':
    'Already in Semester {semester}, still scoring below {ambang}',
  '{n} angkatan siap disahkan': '{n} cohorts ready to ratify',
  // Pembaruan dari Super Admin untuk admin biasa (fase 4 rapat 24 Okt 2026; src/server/notifikasi.js).
  '{n} pembaruan belum dibaca': '{n} unread updates',
  'Pemberitahuan, tidak ada yang baru': 'Notifications, nothing new',
  Pemberitahuan: 'Notifications',
  'Jenis pemberitahuan': 'Notification type',
  Pembaruan: 'Updates',
  'Tidak ada pekerjaan yang menunggu.': 'No work is waiting.',
  'Dari Super Admin': 'From the Super Admin',
  'Tandai semua sudah dibaca': 'Mark all as read',
  'Menandai…': 'Marking…',
  'belum dibaca': 'unread',
  'Belum ada pembaruan dari Super Admin.': 'No updates from the Super Admin yet.',
  'Rincian lengkap dan pembaruan yang lebih lama ada di Log Aktivitas':
    'Full details and older updates are in the Activity Log',
  'Tiga semester sudah tuntas, sertifikatnya bisa diterbitkan':
    'Three semesters are complete, the certificates can be issued',

  /* ------------------------- persetujuan nilai dosen --------------------- */
  'Usulan menunggu keputusan': 'Proposals awaiting a decision',
  'berisi {n} nilai': 'holding {n} scores',
  'Dari {n} dosen pengampu.': 'From {n} lecturers.',
  'Tidak satu pun sudah masuk transkrip.': 'Not one has reached a transcript.',
  'Tidak ada yang tertahan. Seluruh usulan dosen sudah diputuskan.':
    'Nothing is held. Every lecturer proposal has been decided.',
  'Belum ada usulan dari dosen.': 'No proposals from lecturers yet.',
  'Antrean usulan': 'Proposal queue',
  'Buka satu usulan untuk melihat nilainya dan hasil pemeriksaan sistem':
    'Open a proposal to see its scores and the system check result',
  'Sudah diputuskan': 'Already decided',
  'Tidak ada usulan yang menunggu': 'No proposal is waiting',
  'Belum ada usulan yang diputuskan': 'No proposal has been decided yet',
  'Keputusan yang sudah diambil akan tercatat di sini lengkap dengan alasannya.':
    'Decisions already made are recorded here together with their reasons.',
  'Usulan yang disetujui masuk sebagai satu batch di Riwayat Batch halaman Input Nilai. Bila ternyata keliru, seluruh nilainya masih bisa dibatalkan sekaligus.':
    'An approved proposal enters as one batch in the Batch History of the Enter Scores page. If it turns out to be wrong, all of its scores can still be rolled back at once.',
  'Alasan penolakan wajib diisi. Dosen perlu tahu apa yang harus diperbaiki.':
    'A rejection reason is required. The lecturer needs to know what to fix.',
  'Usulan ini sudah diputuskan sebelumnya.': 'This proposal was already decided.',
  '{n} nilai, {unit} Semester {semester}': '{n} scores, {unit} Semester {semester}',
  '{n} ditolak sistem': '{n} rejected by the system',
  'Catatan dosen': 'Lecturer’s note',
  'Pemeriksaan sistem': 'System check',
  '{n} baris lolos': '{n} rows passed',
  ', {n} ditolak dan tidak akan ikut ditulis':
    ', {n} rejected and will not be written',
  ', seluruhnya bersih': ', all clean',
  '…dan {n} baris lagi.': '…and {n} more rows.',
  'Menampilkan 30 dari {n} baris. Seluruhnya tetap ikut diproses.':
    'Showing 30 of {n} rows. All of them are still processed.',
  'Catatan keputusan (wajib bila menolak)': 'Decision note (required when rejecting)',
  'Misalnya: nilai UAS belum termasuk komponen presentasi.':
    'For example: the final exam score does not yet include the presentation component.',
  'Setujui {n} nilai': 'Approve {n} scores',
  'Tolak usulan': 'Reject proposal',
  'Tidak ada baris yang lolos pemeriksaan sistem, jadi tidak ada yang bisa disetujui. Tolak usulannya dengan alasan agar dosen bisa mengirim ulang.':
    'No row passed the system check, so there is nothing to approve. Reject the proposal with a reason so the lecturer can resend it.',
  'Disetujui oleh': 'Approved by',
  'Ditolak oleh': 'Rejected by',
  'tercatat sebagai batch {id}': 'recorded as batch {id}',
  '{n} baris tidak ikut ditulis karena ditolak sistem':
    '{n} rows were not written because the system rejected them',

  /* ------------------------------ panel dosen ---------------------------- */
  '{unit} Semester {semester}, {prodi}': '{unit} Semester {semester}, {prodi}',
  'Akun ini belum terdaftar sebagai dosen pengampu':
    'This account is not registered as a course lecturer',
  'Hubungi Biro Kemahasiswaan untuk didaftarkan pada satu kelas.':
    'Contact the Student Affairs Bureau to be assigned to a class.',
  'Menunggu persetujuan': 'Awaiting approval',
  Manual: 'Manual',
  Otomatis: 'Automatic',
  'Unduh templat': 'Download template',
  'Kolom nilai': 'Score column',
  'NIM kosong': 'empty student ID',

  /* ------------------------ halaman yang belum jadi ---------------------- */
  'CRUD terbatas untuk sepuluh aspek, komponen asesmen, bobot sumber dan komponen MK, rubrik huruf mutu, dan mode agregasi — lengkap dengan simulasi dampak sebelum menyimpan: berapa mahasiswa naik atau turun huruf mutu dan berapa yang berubah status kelayakan sertifikat.':
    'Limited CRUD for the ten aspects, assessment components, source and course component weightings, the letter grade rubric, and the aggregation mode, together with an impact simulation before saving: how many students move up or down a letter grade and how many change certificate eligibility.',
  'Tabel audit setiap perubahan nilai — waktu, aktor, aspek, komponen, nilai lama, nilai baru, dan sumber — dengan filter aktor, jenis aksi, dan rentang tanggal.':
    'An audit table of every score change (time, actor, aspect, component, old score, new score, and source) with filters for actor, action type, and date range.',

  // 'No' dioper sebagai kepala tabel lembar cetak, jadi tidak terlihat pemindai test:bahasa.
  No: 'No.',
  'Garis putus-putus: ambang {n}': 'Dashed line: threshold {n}',
  'Grafik nilai per semester, Semester {a} sebesar {na} sampai Semester {b} sebesar {nb}. {ringkas}':
    'Score by semester chart, Semester {a} at {na} through Semester {b} at {nb}. {ringkas}',
  'Naik {d} sejak Semester {n}': 'Up {d} since Semester {n}',
  'Perkembangan nilai': 'Score progress',
  'Nilai tiap semester': 'Score each semester',
  // Label garisnya 'Rata-rata' ('Average'), kunci yang sudah ada di bagian lain kamus.
  'Rata-rata: dihitung dari semua aspek sejak Semester 1 sampai semester itu, sehingga titik terakhirnya sama dengan nilai akhir.':
    'Average: calculated from every aspect from Semester 1 up to that semester, so its last point equals the final score.',
  'Tetap sejak Semester {n}': 'Unchanged since Semester {n}',
  'Turun {d} sejak Semester {n}': 'Down {d} since Semester {n}',

  /* Kunci di bawah dioper sebagai prop sehingga tidak terdeteksi test:bahasa; jaga manual. */
  'Perkembangan nilai per semester': 'Score progress by semester',
  'Pilih sampai semester berapa yang ingin dilihat. Batang hanya menghitung mahasiswa yang sudah punya nilai di semua semester yang tampil.':
    'Choose how far to look. Bars only count students who have a score in every semester shown.',
  'Nilai per aspek CPMK': 'Score by CPMK aspect',
  'Aspek CPMK, dikelompokkan menurut area pengembangan': 'CPMK aspects, grouped by development area',
  Angkatan: 'Cohort',
  Selisih: 'Change',
  Gabungan: 'Combined',
  'Semester 1': 'Semester 1',
  'Semester 2': 'Semester 2',
  'Semester 3': 'Semester 3',

  /* ---------------------- perkembangan per semester ----------------------- */
  'Baru satu semester, belum ada pembanding': 'Only one semester so far, nothing to compare',
  'Belum ada nilai semester yang masuk, jadi perkembangan belum bisa dihitung. Masukkan nilai lewat halaman Input & Import Nilai, atau setujui usulan nilai dari dosen.':
    'No semester scores have come in yet, so progress cannot be calculated. Enter scores from the Score Entry & Import page, or approve a lecturer submission.',
  'angkatan {daftar}': 'cohorts {daftar}',
  'Di atas rata-rata minimal {n}': 'Above the minimum average of {n}',
  'Nilai rata-rata': 'Average score',
  'Semester 1 sampai {n}': 'Semester 1 to {n}',
  'Tampilkan sampai semester': 'Show up to semester',

  /* ---------------------------- tooltip batang ---------------------------- */
  'rata-rata': 'average',
  'Naik {d} dari Semester {n}': 'Up {d} from Semester {n}',
  'Turun {d} dari Semester {n}': 'Down {d} from Semester {n}',
  'Sama dengan Semester {n}': 'Same as Semester {n}',
  '{a} dari {b} mahasiswa di atas rata-rata minimal {n}': '{a} of {b} students above the minimum average of {n}',

  /* ---------------------------- halaman masuk ----------------------------- */
  '(membuka SSO UMN di tab baru)': '(opens UMN SSO in a new tab)',

  /* ------------------------ lembar cetak transkrip ------------------------ */
  No: 'No.',
  'Aspek belum dinilai': 'Aspects not yet scored',
  'belum dinilai atau belum dibuka': 'not yet scored or not yet open',
  'Head of Department': 'Head of Department',
  'di bawah {n}': 'below {n}',
  'NIM': 'Student ID',
  'Program Pembinaan VIBE, Semester 1 sampai {total}': 'VIBE Development Programme, Semester 1 to {total}',
  'Transkrip Sementara': 'Provisional Transcript',

  /* -------------------------- halaman sertifikat -------------------------- */
  '{n} dari {total} syarat belum terpenuhi.': '{n} of {total} requirements not yet met.',
  'atas keberhasilannya menyelesaikan seluruh {n} aspek CPMK, Semester 1 sampai {total}, dengan nilai akhir {nilai} dan predikat {huruf} ({label}).': 'for successfully completing all {n} CPMK aspects, Semester 1 to {total}, with a final score of {nilai} and grade {huruf} ({label}).',
  'Belum terpenuhi': 'Not yet met',
  'Cetak sertifikat': 'Print certificate',
  'diberikan kepada': 'awarded to',
  'Nilai akhir {nilai}, predikat {huruf}.': 'Final score {nilai}, grade {huruf}.',
  'Nomor': 'Number',
  'Program Pembinaan VIBE': 'VIBE Development Programme',
  'Sertifikat Pembinaan VIBE': 'VIBE Development Certificate',
  'Syarat kelayakan': 'Eligibility requirements',

  /* ----------------------------- kurikulum: bobot ----------------------------- */
  'Atur bobot komponen asesmen di setiap aspek. Bobot berlaku untuk semua angkatan, dan nilai yang sudah masuk langsung dihitung ulang dengannya.':
    'Set the weights of the assessment components in each aspect. Weights apply to every cohort, and scores already entered are recalculated with them straight away.',
  'Perlu diperbaiki': 'Needs fixing',
  'Semester {n} · {k} komponen asesmen': 'Semester {n} · {k} assessment components',
  'Cara menentukan bobot aspek ini': 'How this aspect is weighted',
  'Dibagi otomatis': 'Split automatically',
  'Atur manual': 'Set manually',
  'Isi porsi setiap komponen dalam persen. Jumlahnya harus 100.': "Enter each component's share as a percentage. They must add up to 100.",
  'Porsi dibagi rata ke semua komponen aspek ini.': 'The share is split evenly across every component of this aspect.',
  'Porsi diturunkan dari bobot per sumber dan per jenis penilaian MK di bawah.':
    'Shares follow the weights per source and per Humanities course assessment type below.',
  'Porsi berlaku': 'Current share',
  'Porsi baru': 'New share',
  'Porsi baru {label}': 'New share for {label}',
  Jumlah: 'Total',
  Sikap: 'Attitude',
  'Jumlah porsi harus 100%, sekarang {n}. Setiap isian berupa angka 0–100 dengan paling banyak dua desimal.':
    'The shares must add up to 100%; they are now {n}. Each entry is a number from 0 to 100 with at most two decimals.',
  'Setiap komponen harus diisi angka 0–100 dengan paling banyak dua desimal.':
    'Every component needs a number from 0 to 100 with at most two decimals.',
  'Cara membagi bobot otomatis': 'How automatic weights are split',
  'Dipakai semua aspek yang bobotnya tidak diatur manual.': 'Used by every aspect whose weights are not set manually.',
  'Rata ke semua komponen': 'Evenly across all components',
  'Setiap komponen dalam satu aspek mendapat porsi yang sama, apa pun sumber dan jenisnya.':
    'Every component in an aspect gets the same share, whatever its source and type.',
  'Menurut sumber dan jenis penilaian': 'By source and assessment type',
  'Porsi dibagi dulu per sumber penilaian, lalu porsi MK Humaniora dibagi lagi per jenis penilaian.':
    'Shares are split by assessment source first, then the Humanities course share is split again by assessment type.',
  'Bobot per sumber': 'Weight per source',
  'Bobot per jenis penilaian MK Humaniora': 'Weight per Humanities course assessment type',
  'Harus berjumlah 100%.': 'Must add up to 100%.',
  'Sumber atau jenis yang tidak ada di sebuah aspek dilewati, lalu sisanya dibagi ulang supaya aspek itu tetap berjumlah 100.':
    'Sources or types an aspect does not have are skipped, and the rest are re-split so the aspect still adds up to 100.',
  'Tinjau dan simpan': 'Review and save',
  '{n} bagian diubah dan belum disimpan': '{n} sections changed and not yet saved',
  'Ubah bobot salah satu aspek di atas untuk melihat dampaknya pada nilai mahasiswa di sini.':
    'Change the weights of an aspect above to see the effect on student scores here.',
  'Perbaiki isian yang ditandai lebih dulu: porsi setiap kelompok harus berjumlah 100.':
    'Fix the marked entries first: the shares in each group must add up to 100.',
  'Menghitung dampak…': 'Calculating the impact…',
  'Alasan perubahan (wajib)': 'Reason for change (required)',
  'Alasan perubahan (opsional)': 'Reason for change (optional)',
  'Simpan bobot': 'Save weights',
  'Batalkan perubahan': 'Discard changes',
  'Bobot tersimpan.': 'Weights saved.',
  'Bobot tersimpan. Nilai {n} mahasiswa dihitung ulang dengan bobot baru.':
    'Weights saved. The scores of {n} students were recalculated with the new weights.',
  'Setiap penyimpanan tercatat di log aktivitas beserta bobot sebelum dan sesudahnya. Nilai yang diinput tidak berubah; yang berubah hanya porsinya dalam nilai aspek.':
    'Every save is recorded in the activity log with the weights before and after. Entered scores do not change; only their share of the aspect score does.',
  'Tidak ada nilai mahasiswa yang berubah, karena aspek yang diubah belum punya nilai yang masuk. Bobot baru berlaku untuk nilai yang masuk berikutnya.':
    'No student scores change, because the changed aspects have no scores entered yet. The new weights apply to scores entered from now on.',
  '{n} naik huruf mutu': '{n} move up a grade',
  '{n} turun huruf mutu': '{n} move down a grade',
  '{n} menjadi berhak atas sertifikat': '{n} become eligible for a certificate',
  '{n} tidak lagi berhak atas sertifikat': '{n} are no longer eligible for a certificate',
  'Bila disimpan, nilai {n} dari {total} mahasiswa berubah.': 'If saved, the scores of {n} of {total} students change.',
  'Huruf mutu dan kelayakan sertifikat tidak ada yang berubah.': 'No grades or certificate eligibility change.',
  '{n} di antaranya ada di angkatan yang sudah disahkan atau aspek yang sudah ditandai final. Alasan wajib diisi dan ikut tercatat.':
    '{n} of them are in a ratified cohort or an aspect already marked final. A reason is required and will be recorded.',
  'Angkatan: {daftar}.': 'Cohorts: {daftar}.',
  'Aspek yang berubah': 'Changed aspects',
  'menjadi berhak sertifikat': 'becomes eligible for a certificate',
  'tidak lagi berhak sertifikat': 'no longer eligible for a certificate',
  'Ditampilkan {n} dari {total} mahasiswa yang berubah.': 'Showing {n} of {total} changed students.',

  /* --------------------- persetujuan super admin ---------------------- */
  'Persetujuan Admin': 'Admin Approvals',
  'Permintaan Saya': 'My Requests',
  Persetujuan: 'Approvals',
  'Tidak ada permintaan yang menunggu': 'No pending requests',
  'Belum ada riwayat permintaan': 'No request history yet',
  'Permintaan yang disetujui dijalankan dengan isi yang sama seperti saat diajukan, atas nama admin pengaju, dan diperiksa ulang lebih dulu. Bila datanya sudah berubah, statusnya gagal dan perlu diajukan ulang. Setiap pengajuan dan keputusan tercatat di log aktivitas.':
    'An approved request is carried out with exactly what was submitted, on behalf of the requesting admin, and is checked again first. If the data has changed in the meantime, it fails and must be submitted again. Every request and decision is recorded in the activity log.',
  'Catatan penolakan wajib diisi. Admin perlu tahu alasannya.': 'A rejection note is required. The admin needs to know why.',
  'Permintaan ini sudah diputuskan sebelumnya.': 'This request has already been decided.',
  'Diajukan {oleh} pada {waktu}': 'Submitted by {oleh} on {waktu}',
  'Diputuskan {oleh} pada {waktu}': 'Decided by {oleh} on {waktu}',
  'Ditarik {oleh} pada {waktu}': 'Withdrawn by {oleh} on {waktu}',
  '{n} mahasiswa yang sudah lewat Semester 3 tersentuh': '{n} students past Semester 3 affected',
  Catatan: 'Note',
  'Tersimpan sebagai batch {id}.': 'Saved as batch {id}.',
  'Catatan keputusan (wajib bila ditolak)': 'Decision note (required when rejecting)',
  'Setujui dan jalankan': 'Approve and carry out',
  'Tarik permintaan': 'Withdraw request',
  'Batalkan batch nilai': 'Roll back a score batch',
  'Ubah tanda final/sementara': 'Change final/provisional flag',
  /* Sasaran log dari server, diterjemahkan menurut polanya (labelSasaran di src/lib/labelLog.js). */
  'tanda final ({n} mahasiswa)': 'final marks ({n} students)',
  'aspek {kode} (kurikulum versi {v})': 'aspect {kode} (curriculum version {v})',
  'kurikulum versi {v}': 'curriculum version {v}',
  'periode {nama}': 'period {nama}',
  'akun {nama}': 'account {nama}',
  'angkatan {nama}': 'cohort {nama}',
  'batch {nama}': 'batch {nama}',
  'fakultas {nama}': 'faculty {nama}',
  'prodi {nama}': 'study program {nama}',
  'mahasiswa {nim}': 'student {nim}',
  'permintaan {id}': 'request {id}',
  'Setujui usulan nilai dosen': 'Approve lecturer score proposal',
  'Ubah bobot': 'Change weights',
  Ditarik: 'Withdrawn',
  'Gagal dijalankan': 'Could not be carried out',
  'Angkatan ini sudah lewat Semester 3. Perubahan yang Anda simpan dikirim ke Super Admin sebagai permintaan dan baru berlaku setelah disetujui. Alasan wajib diisi.':
    'This cohort is past Semester 3. Changes you save are sent to the Super Admin as a request and take effect only once approved. A reason is required.',
  /* Tindakan yang dari admin biasa SELALU diajukan sejak rapat 24 Okt 2026. */
  'Tanda final atau sementara dari admin dikirim ke Super Admin sebagai permintaan dan baru berlaku setelah disetujui. Alasan wajib diisi.':
    'Final or provisional marks from an admin are sent to the Super Admin as a request and take effect only once approved. A reason is required.',
  'Tanda dari admin baru berlaku setelah Super Admin menyetujuinya.':
    'Marks from an admin take effect only after the Super Admin approves them.',
  'Perubahan bobot dari admin dikirim ke Super Admin sebagai permintaan dan baru berlaku setelah disetujui. Alasan wajib diisi.':
    'Weight changes from an admin are sent to the Super Admin as a request and take effect only once approved. A reason is required.',
  'Perubahan bobot dari admin baru berlaku setelah Super Admin menyetujuinya.':
    'Weight changes from an admin take effect only after the Super Admin approves them.',
  'Permintaan {id} dikirim ke Super Admin.': 'Request {id} sent to the Super Admin.',
  'Perubahan ini menyentuh mahasiswa yang sudah lewat Semester 3, jadi baru berlaku setelah Super Admin menyetujuinya.':
    'This change affects students who are past Semester 3, so it takes effect only once the Super Admin approves it.',
  'Lihat permintaan': 'View request',
  'Ajukan pengesahan': 'Request ratification',
  'Ajukan ke Super Admin': 'Send to Super Admin',

  /* ------------------ penilaian aspek (Input Manual) ------------------ */
  'Atur penilaian {kode}': 'Edit assessment for {kode}',
  'Tutup pengaturan penilaian': 'Close assessment settings',
  'Penilaian {kode}': 'Assessment for {kode}',
  'Ubah teks aspek, komponen asesmen, dan bobotnya. Perubahan langsung berlaku untuk semua angkatan; nilai yang sudah diinput tidak berubah.':
    'Edit the aspect text, its assessment components, and their weights. Changes apply to every cohort straight away; scores already entered do not change.',
  'Ubah teks aspek, komponen asesmen, dan bobotnya. Perubahan dikirim ke Super Admin dan baru berlaku setelah disetujui.':
    'Edit the aspect text, its assessment components, and their weights. Changes are sent to the Super Admin and take effect only once approved.',
  Aspek: 'Aspect',
  'Nama aspek': 'Aspect name',
  'Kegiatan PDP': 'PDP activity',
  'Mata kuliah': 'Course',
  'Kegiatan Kemahasiswaan': 'Student Affairs activity',
  Deskripsi: 'Description',
  Urutan: 'Order',
  Jenis: 'Type',
  'Bagi rata': 'Split evenly',
  'Naikkan {label}': 'Move {label} up',
  'Turunkan {label}': 'Move {label} down',
  'komponen baru': 'new component',
  'Nama komponen': 'Component name',
  'Misalnya: Tugas 3: Refleksi akhir': 'For example: Assignment 3: Final reflection',
  'baru, ID dibuat saat disimpan': 'new, ID assigned on save',
  'Sudah punya nilai: sumbernya tidak bisa diganti.': 'Already scored: its source cannot be changed.',
  'sudah dinilai': 'already scored',
  Resmi: 'Official',
  'Bobot {label}': 'Weight of {label}',
  Hapus: 'Remove',
  'Tambah komponen': 'Add component',
  'Jumlah {n}': 'Total {n}',
  'Hapus memindahkan komponen ke arsip: tidak tampil dan tidak dihitung, tetapi nilainya tetap tersimpan dan bisa dipulihkan. Komponen yang sudah punya nilai tidak bisa diganti sumbernya.':
    'Remove moves a component to the archive: it is hidden and not counted, but its scores are kept and it can be restored. A component that already has scores cannot change its source.',
  'Arsip komponen ({n})': 'Archived components ({n})',
  Pulihkan: 'Restore',
  'Bila disimpan, hasil {n} dari {total} mahasiswa berubah.': 'If saved, the results of {n} of {total} students change.',
  'Tidak ada hasil mahasiswa yang berubah.': 'No student results change.',
  '{n} menjadi belum lengkap karena ada komponen baru': '{n} become incomplete because of the new component',
  '{n} di angkatan yang sudah disahkan atau aspek final': '{n} in a ratified cohort or final aspect',
  'Nilai lama komponen yang dipulihkan ikut dihitung lagi; pratinjau di layar belum memasukkannya, server yang menghitungnya.':
    'Earlier scores of restored components count again; the on-screen preview does not include them yet, the server does.',
  'Perubahan penilaian oleh admin baru berlaku setelah Super Admin menyetujuinya.':
    'Assessment changes by an admin take effect only once the Super Admin approves them.',
  'Penilaian {kode} tersimpan dan langsung berlaku untuk semua angkatan.': 'Assessment for {kode} saved and in effect for every cohort.',
  'Simpan penilaian': 'Save assessment',
  'Ubah penilaian aspek': 'Change aspect assessment',
  '{n} mahasiswa terdampak': '{n} students affected',

  /* ---------------------------- panel super admin ---------------------------- */
  'Pusat Kendali': 'Control Center',
  'Peran & Wewenang': 'Roles & Permissions',
  'Aturan Sistem': 'System Rules',
  'Panel Kemahasiswaan': 'Student Affairs panel',
  'Panel Admin': 'Admin panel',
  'Panel Super Admin': 'Super Admin panel',
  'Menu super admin': 'Super admin menu',
  Utama: 'Main',
  Pengawasan: 'Oversight',
  '{n} permintaan menunggu keputusan': '{n} requests awaiting a decision',
  'Pengawasan seluruh sistem VIBE: permintaan yang perlu diputuskan, jejak tindakan, dan aturan yang berlaku.':
    'Oversight of the whole VIBE system: requests awaiting a decision, action trails, and the rules in effect.',
  'Memegang nilai dan data master, menyetujui permintaan admin, dan mengawasi seluruh jejak.':
    'Holds scores and master data, approves admin requests, and oversees every trail.',
  'Membaca nilai, mengurus koreksi, angkatan, kurikulum, dan sertifikat.':
    'Reads scores and handles corrections, cohorts, curriculum, and certificates.',
  'Mengunggah nilai kelasnya lewat Excel dan memantau hasilnya.': 'Uploads class scores through Excel and monitors the results.',
  'Melihat capaian dan mengajukan koreksi nilai.': 'Views their achievements and requests score corrections.',
  'Permintaan admin menunggu persetujuan Anda.': 'Admin requests are waiting for your approval.',
  'Tidak ada yang menunggu.': 'Nothing is waiting.',
  'Buka antrean': 'Open the queue',
  'Diputuskan 7 hari terakhir': 'Decided in the last 7 days',
  'Disetujui, ditolak, atau gagal dijalankan.': 'Approved, rejected, or failed to run.',
  'Perubahan nilai 7 hari terakhir': 'Score changes in the last 7 days',
  'Dari {n} mahasiswa terdaftar.': 'Across {n} registered students.',
  'Telusuri di log': 'Trace in the log',
  'Angkatan disahkan': 'Ratified cohorts',
  'Perlu keputusan Anda': 'Needs your decision',
  'Diurutkan dari yang paling lama menunggu.': 'Oldest requests first.',
  'Diajukan {siapa} pada {kapan}': 'Submitted by {siapa} on {kapan}',
  'Buka antrean persetujuan': 'Open the approval queue',
  'Lihat riwayat keputusan': 'View decision history',
  'Aktivitas terbaru': 'Latest activity',
  'Enam catatan terakhir dari Log Aktivitas.': 'The six most recent Activity Log entries.',
  'Memuat…': 'Loading…',
  'Aktivitas hanya tercatat saat website terhubung ke basis data.':
    'Activity is only recorded while the website is connected to the database.',
  'Belum ada aktivitas yang tercatat': 'No activity recorded yet',
  'Lihat seluruh log': 'View the full log',
  'Rantai pengawasan': 'Chain of oversight',
  'Setiap peran diawasi peran di atasnya.': 'Each role is overseen by the role above it.',
  'Permintaan admin dan dosen, diurutkan dari yang paling lama menunggu.': 'Admin and lecturer requests, oldest first.',
  'permintaan menunggu': 'requests waiting',
  'Terlama menunggu {n} hari, sejak {tanggal}.': 'The oldest has waited {n} days, since {tanggal}.',
  'Yang terlama diajukan hari ini.': 'The oldest was submitted today.',
  'dan {n} lainnya di antrean': 'and {n} more in the queue',
  'Tidak ada yang perlu Anda putuskan sekarang.': 'Nothing needs your decision right now.',
  'Keputusan terakhir: {status}, {kapan}.': 'Last decision: {status}, {kapan}.',
  'Keadaan sistem': 'System status',
  '{n} disetujui': '{n} approved',
  '{n} gagal dijalankan': '{n} failed to run',
  'Belum ada keputusan di periode ini.': 'No decisions in this period.',
  'Diputuskan di {periode}': 'Decided in {periode}',
  'Angkatan dan aturan di bawah ini menunjukkan keadaan saat ini.':
    'The cohorts and rules below show the current state.',
  'Saat ini': 'Current',
  Ganjil: 'Odd',
  Genap: 'Even',
  'Periode yang ditampilkan: {periode}': 'Period shown: {periode}',
  'Pilih periode': 'Choose a period',
  'Disahkan: {daftar}': 'Ratified: {daftar}',
  'Belum ada angkatan yang disahkan.': 'No cohort has been ratified yet.',
  'Aturan menunggu konfirmasi': 'Rules awaiting confirmation',
  'Lihat aturan': 'View rules',
  'Nilai tersimpan per bulan': 'Scores saved per month',
  'Banyaknya nilai tugas yang tersimpan tiap bulan (input baru maupun perubahan), menurut tanggal WIB. Ini bukan jumlah pengajuan koreksi.':
    'Number of task scores saved each month (new entries and changes), by WIB date. This is not the number of correction requests.',
  Bulan: 'Month',
  'Nilai tersimpan': 'Scores saved',
  '{n} nilai tersimpan untuk {m} mahasiswa.': '{n} scores saved for {m} students.',
  'Nilai tersimpan per bulan di {periode}': 'Scores saved per month in {periode}',
  'belum berjalan': 'not started yet',
  'Belum berjalan': 'Not started yet',
  '{n} nilai tersimpan': '{n} scores saved',
  'Belum ada nilai yang tersimpan di {periode}': 'No scores saved in {periode}',
  'Nilai yang diinput, diimpor, atau disetujui akan terhitung di sini per bulan.':
    'Scores that are entered, imported, or approved are counted here per month.',
  'Enam catatan terakhir di {periode}.': 'The six most recent entries in {periode}.',
  'Pengesahan angkatan, perubahan bobot, dan keputusan persetujuan akan tercatat di sini.':
    'Cohort ratifications, weight changes, and approval decisions will be recorded here.',
  'Lihat matriks': 'View matrix',
  Anda: 'You',
  'Lihat matriks peran & wewenang': 'View the roles & permissions matrix',
  'Siapa boleh melakukan apa di VIBE. Halaman ini hanya bacaan: peran diatur lewat basis data, bukan dari website.':
    'Who may do what in VIBE. This page is read-only: roles are set in the database, not from the website.',
  /* Matriks wewenang sejak rapat 24 Okt 2026 (super-admin/Wewenang.jsx). */
  'Mengunggah nilai angkatan yang diampunya lewat Excel dan memantau hasilnya; perbaikan untuk angkatan yang sudah disahkan diajukan ke Super Admin.':
    'Uploads scores for the cohorts they teach through Excel and monitors the results; fixes for ratified cohorts go to the Super Admin for approval.',
  'Melihat capaiannya sendiri, mengajukan koreksi bila nilainya keliru, dan meminta akses cetak sertifikat.':
    'Views their own achievements, requests a correction when a score is wrong, and requests certificate print access.',
  'Membaca nilai dan memantau kelengkapannya, memutuskan lapis pertama pengajuan koreksi dan akses cetak sertifikat, serta mengurus angkatan dan kurikulum.':
    'Reads scores and monitors their completeness, decides the first layer of correction and certificate print access requests, and handles cohorts and curriculum.',
  'Wewenang tertinggi: memegang nilai dan data master, memutuskan lapis kedua koreksi dan akses cetak sertifikat, menyetujui permintaan admin, mengatur penilaian dan akses, dan mengawasi seluruh jejak.':
    'Highest authority: holds scores and master data, decides the second layer of corrections and certificate print access, approves admin requests, manages assessment and access, and oversees every trail.',
  'Melihat capaian mahasiswa': 'View student achievements',
  'Mengajukan koreksi nilai': 'Request a score correction',
  'Memutuskan pengajuan koreksi nilai': 'Decide score correction requests',
  'lapis pertama: meneruskan atau menolak': 'first layer: forward or reject',
  'lapis kedua: menyetujui dan menerapkan nilai, atau menolak': 'second layer: approve and apply the score, or reject',
  'Meminta akses cetak sertifikat': 'Request certificate print access',
  'bila seluruh syarat terpenuhi': 'once every requirement is met',
  'Menyetujui akses cetak sertifikat': 'Approve certificate print access',
  'lapis pertama': 'first layer',
  'lapis kedua, sesudah admin': 'second layer, after the admin',
  'Mencetak sertifikat': 'Print certificates',
  'sesudah akses cetaknya disetujui': 'after its print access is approved',
  'Mencabut akses cetak sertifikat': 'Revoke certificate print access',
  'langsung, wajib beralasan': 'directly, with a required reason',
  // Pencabutan akses cetak dan catatan cetak (student/Sertifikat.jsx, admin/CetakSertifikat.jsx, Dashboard).
  Dicabut: 'Revoked',
  'Akses cetak sertifikatmu dicabut. Baca alasannya, lalu minta lagi bila masalahnya sudah selesai.':
    'Your certificate print access was revoked. Read the reason, then request it again once the issue is resolved.',
  'Alasan pencabutan': 'Reason for revocation',
  'Sertifikat hanya bisa dicetak lewat tombol Cetak sertifikat di halaman ini, setelah akses cetaknya disetujui.':
    'The certificate can only be printed with the Print certificate button on this page, after its print access is approved.',
  'Sertifikat dicetak, atau disimpan sebagai PDF lewat dialog cetak, dari tombol di halaman ini, dan setiap pembukaan dialog cetak tercatat. Sertifikat tidak dikirim lewat surel.':
    'Print the certificate, or save it as a PDF through the print dialog, with the button on this page; every time the print dialog opens is recorded. Certificates are not sent by email.',
  'Tombol cetak hanya aktif untuk sertifikat yang akses cetaknya sudah disetujui admin Kemahasiswaan dan Super Admin. Akses itu bisa dicabut lagi, dan setiap pembukaan dialog cetak tercatat. Sertifikat dicetak atau disimpan sebagai PDF dari website ini; jangan kirim lewat surel.':
    'The print button is only active for certificates whose print access was approved by the Student Affairs admin and the Super Admin. That access can be revoked again, and every time the print dialog opens is recorded. Certificates are printed or saved as PDF from this website; do not send them by email.',
  'dicabut {tanggal}': 'revoked {tanggal}',
  'dibuka untuk dicetak {n} kali, terakhir {waktu}': 'opened for printing {n} times, last {waktu}',
  'belum pernah dibuka untuk dicetak': 'never opened for printing',
  'Cabut akses cetak {nama}': 'Revoke print access for {nama}',
  'Alasan pencabutan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.':
    'A revocation reason is required, at least 10 characters, so the student knows why.',
  'Akses cetak ini sudah tidak Siap dicetak, mungkin sudah dicabut di jendela lain.':
    'This print access is no longer Ready to print; it may have been revoked in another window.',
  'Sesudah dicabut, mahasiswa tidak bisa mencetak lagi sampai permintaan barunya disetujui admin Kemahasiswaan dan Super Admin. Sertifikat yang sudah telanjur tercetak tidak ikut tertarik.':
    'Once revoked, the student cannot print again until a new request is approved by the Student Affairs admin and the Super Admin. Certificates already printed are not recalled.',
  'Sudah dibuka untuk dicetak {n} kali, terakhir {waktu} oleh {oleh}.': 'Opened for printing {n} times, last on {waktu} by {oleh}.',
  'Belum pernah dibuka untuk dicetak.': 'Never opened for printing.',
  'Alasan pencabutan (wajib, terbaca mahasiswa)': 'Reason for revocation (required, shown to the student)',
  'Cabut akses cetak': 'Revoke print access',
  'Mengunggah nilai kelasnya dari Excel': 'Upload class scores from Excel',
  'langsung tersimpan untuk angkatan berjalan': 'saved right away for running cohorts',
  'Memperbaiki nilai angkatan yang sudah disahkan atau selesai, atau aspek final':
    'Fix scores of ratified or finished cohorts, or final aspects',
  'Mengatur kelas dosen dan angkatan yang diampu': 'Set a lecturer’s class and the cohorts they teach',
  // Angkatan yang diampu dosen dan perbaikan nilai lewat Super Admin (dosen/Unggah.jsx, dosen/Pantau.jsx,
  // super-admin/Akses.jsx, PersetujuanAdmin, Log Aktivitas).
  'Perbaikan untuk angkatan yang sudah disahkan atau selesai diajukan ke Super Admin dulu.':
    'Fixes for cohorts that are ratified or finished go to the Super Admin first.',
  '{n} nilai diajukan ke Super Admin ({id}). Nilainya berubah setelah disetujui.':
    '{n} scores sent to the Super Admin ({id}). They change once approved.',
  'diajukan ke Super Admin: {sebab}': 'sent to the Super Admin: {sebab}',
  'angkatan sudah disahkan': 'cohort already ratified',
  'program sudah selesai': 'programme already finished',
  'aspek sudah final': 'aspect already final',
  'Disetujui Super Admin': 'Approved by the Super Admin',
  'Ditolak Super Admin': 'Rejected by the Super Admin',
  'Gagal dijalankan': 'Could not be applied',
  Ditarik: 'Withdrawn',
  '{n} nilai untuk angkatan yang sudah disahkan atau programnya selesai, atau aspek yang sudah final, akan diajukan ke Super Admin. Nilainya belum berubah sampai Super Admin menyetujui.':
    '{n} scores for cohorts that are ratified or finished, or for final aspects, will be sent to the Super Admin. They stay unchanged until the Super Admin approves.',
  'Alasan perbaikan (wajib, minimal {n} karakter)': 'Reason for the fix (required, at least {n} characters)',
  'Misalnya: nilai UAS dikoreksi sesudah peninjauan lembar jawaban': 'For example: final exam score corrected after reviewing the answer sheet',
  'Ajukan {n} nilai ke Super Admin': 'Send {n} scores to the Super Admin',
  'Simpan {n} nilai, ajukan {m}': 'Save {n} scores, send {m}',
  'Unggahan dan perbaikan yang diajukan atas nama Anda, terbaru di atas.': 'Uploads and fixes submitted under your name, newest first.',
  Tarik: 'Withdraw',
  'Perbaikan yang masih menunggu Super Admin bisa Anda tarik.': 'You can withdraw fixes still waiting for the Super Admin.',
  'Permintaan ini sudah diputuskan, jadi tidak bisa ditarik lagi.': 'This request has already been decided, so it can no longer be withdrawn.',
  '{prodi}, angkatan {daftar}.': '{prodi}, cohort {daftar}.',
  'Di sini akan muncul mahasiswa {prodi} angkatan {daftar}.': '{prodi} students of cohort {daftar} will appear here.',
  'Bila Anda mengampu angkatan tertentu, termasuk yang sudah disahkan, minta Super Admin memilihnya di akun Anda.':
    'If you teach specific cohorts, including ratified ones, ask the Super Admin to select them on your account.',
  'Angkatan yang Anda ampu ({daftar}) belum berisi mahasiswa {prodi}.': 'The cohorts you teach ({daftar}) have no {prodi} students yet.',
  'Saat ini tidak ada mahasiswa {prodi} yang sudah sampai Semester {n} dan programnya belum selesai.':
    'Right now there are no {prodi} students who have reached Semester {n} and whose programme has not ended.',
  'Bila angkatannya keliru, minta Super Admin mengubahnya di akun Anda.': 'If the cohorts are wrong, ask the Super Admin to change them on your account.',
  'Templat dan unggahan bisa dipakai setelah kelas Anda berisi mahasiswa.': 'The template and upload become available once your class has students.',
  'angkatan otomatis': 'cohorts set automatically',
  'Ubah kelas': 'Change class',
  'Angkatan yang diampu': 'Cohorts taught',
  '(disahkan)': '(ratified)',
  'Kosongkan untuk otomatis: angkatan yang sedang di semester yang diampu. Untuk angkatan yang sudah disahkan atau selesai, perbaikan nilai dari dosen diajukan ke Super Admin dulu.':
    'Leave empty for automatic: the cohorts currently in the semester taught. For ratified or finished cohorts, score fixes from the lecturer go to the Super Admin first.',
  'Kelas menentukan mahasiswa yang terlihat dan bisa diunggah nilainya oleh dosen ini. Nilai yang sudah tersimpan tidak berubah.':
    'The class decides which students this lecturer sees and can upload scores for. Saved scores do not change.',
  'Simpan kelas': 'Save class',
  'Perbaikan nilai dari dosen': 'Score fix from a lecturer',
  'Ubah kelas dosen': 'Change lecturer class',
  'Memutuskan usulan nilai dosen yang tersisa': 'Decide remaining lecturer score proposals',
  'Menyimpan dan mengimpor nilai': 'Save and import scores',
  'Membatalkan batch nilai': 'Roll back a score batch',
  'Membatalkan batch nilai, termasuk unggahan dosen': 'Roll back a score batch, including lecturer uploads',
  'Melihat halaman Data Master': 'View the Master Data page',
  'bila diberi izin atau permintaannya disetujui Super Admin': 'if granted, or once the Super Admin approves the request',
  'Memberi dan mencabut izin lihat data master': 'Grant and revoke master data view permission',
  'Mengubah tanda final/sementara': 'Change final/provisional marks',
  'Mengubah bobot kurikulum': 'Change curriculum weights',
  'Mengubah penilaian aspek': 'Change aspect assessments',
  'Mengesahkan nilai angkatan': 'Ratify cohort scores',
  'Memutuskan permintaan admin': 'Decide admin requests',
  'Menarik permintaan yang belum diputuskan': 'Withdraw a pending request',
  'Memindahkan periode akademik': 'Move the academic period',
  'Mencabut dan memulihkan akses mahasiswa, dosen, dan admin': 'Revoke and restore student, lecturer, and admin access',
  'Ubah akses akun': 'Change account access',
  'Ubah periode akademik': 'Change academic period',

  // Penilaian & Bobot
  'Penilaian & Bobot': 'Assessment & Weights',
  'Ubah aspek, komponen asesmen, dan bobotnya, termasuk menambah komponen secara manual. Sebagai Super Admin, perubahan Anda langsung berlaku untuk semua angkatan tanpa menunggu persetujuan, dan tetap tercatat di Log Aktivitas.':
    'Change aspects, assessment components, and their weights, including adding components manually. As Super Admin, your changes apply to every cohort right away without waiting for approval, and are still recorded in the Activity Log.',
  '{n} permintaan admin untuk mengubah penilaian atau bobot menunggu keputusan Anda.':
    '{n} admin requests to change assessments or weights are waiting for your decision.',
  'Putuskan lebih dulu: permintaan yang datanya sudah berubah akan gagal dijalankan.':
    'Decide on them first: a request whose data has since changed will fail to run.',
  'Aspek & komponen': 'Aspects & components',
  'Pilih aspek yang ingin diubah.': 'Choose the aspect to change.',
  'bobot manual': 'manual weights',
  'bobot otomatis': 'automatic weights',
  /* Label angka contoh: bobot yang dibagi rata sambil menunggu angka resmi (rapat 24 Okt 2026). */
  contoh: 'sample',
  'Bobot komponen aspek ini masih dibagi rata sambil menunggu bobot resmi dari unit pengelola. Angkanya tetap dipakai menghitung nilai sampai diganti.':
    "This aspect's component weights are still split evenly while the official weights from the managing unit are pending. They are still used to calculate scores until replaced.",
  'Angka contoh': 'Sample numbers',
  '{n} berisi angka contoh': '{n} hold sample numbers',
  'Angka contoh: isian awal yang belum dipakai menghitung, sampai unit pengelola menetapkan angka resmi.':
    'Sample numbers: starting values that are not used in calculations until the managing unit sets official numbers.',
  'Perubahan yang belum disimpan akan hilang. Lanjutkan?': 'Unsaved changes will be lost. Continue?',

  // Akses Pengguna
  'Akses Pengguna': 'User Access',
  'Tentukan mahasiswa, dosen, dan admin Kemahasiswaan yang boleh masuk ke VIBE. Mencabut akses langsung mengakhiri sesinya dan menolak login berikutnya; datanya tetap tersimpan dan aksesnya bisa dipulihkan kapan saja.':
    'Decide which students, lecturers, and Student Affairs admins may sign in to VIBE. Revoking access ends their session immediately and blocks later sign-ins; their data stays and access can be restored at any time.',
  'Pengaturan akses belum tersedia': 'Access settings are not available yet',
  'Server belum menyediakan daftar akun. Halaman ini langsung berfungsi begitu pintu /api/akses dibuat; rinciannya ada di README › Akses Pengguna.':
    'The server does not provide the account list yet. This page works as soon as the /api/akses endpoint exists; details are in README › Akses Pengguna.',
  'Daftar akun gagal dimuat': 'The account list could not be loaded',
  'Admin Kemahasiswaan': 'Student Affairs admins',
  'Cari nama, email, atau NIP': 'Search name, email, or NIP',
  'Cari email': 'Search email',
  'Cari nama, email, atau NIM': 'Search name, email, or student ID (NIM)',
  'Semua status': 'All statuses',
  'Punya akses': 'Has access',
  'Akses dicabut': 'Access revoked',
  '{n} akun · {m} aksesnya dicabut': '{n} accounts · {m} revoked',
  'Memuat daftar akun…': 'Loading accounts…',
  'Tidak ada akun yang cocok.': 'No accounts match.',
  'Belum ada akun dosen.': 'No lecturer accounts yet.',
  'Belum ada akun admin.': 'No admin accounts yet.',
  'Belum ada akun mahasiswa.': 'No student accounts yet.',
  'Akses Super Admin tidak bisa dicabut atau dihapus dari sini, termasuk akun Anda sendiri; itu diatur langsung di basis data. Hanya akun yang aksesnya sudah dicabut dan belum punya data yang bisa dihapus. Setiap perubahan akses dan penghapusan akun tercatat di Log Aktivitas beserta alasannya.':
    'Super Admin accounts cannot be revoked or deleted here, including your own; they are managed directly in the database. Only accounts whose access is revoked and that have no data can be deleted. Every access change and account deletion is recorded in the Activity Log with its reason.',
  'Cabut akses': 'Revoke access',
  'Pulihkan akses': 'Restore access',
  // Hapus akun; juga label HAPUS_AKUN di Log Aktivitas, bersama dua label akun lain yang dibaca lewat LABEL_LOG.
  'Hapus akun': 'Delete account',
  'Tambah akun': 'Add account',
  'Ubah akun': 'Edit account',
  'Hapus permanen': 'Delete permanently',
  'Akun ini dihapus permanen dari basis data beserta profilnya, dan tidak bisa dikembalikan. Akun yang masih punya nilai, pengumpulan, atau riwayat tindakan tidak bisa dihapus; biarkan aksesnya tetap dicabut.':
    'This account and its profile are permanently deleted from the database and cannot be restored. Accounts that still have scores, submissions, or an action history cannot be deleted; keep their access revoked instead.',
  'Akun {nama} sudah dihapus dari basis data.': 'Account {nama} was deleted from the database.',
  // Formulir tambah akun.
  'Nama lengkap': 'Full name',
  Jabatan: 'Position',
  'Sandi awal (minimal {n} karakter)': 'Initial password (at least {n} characters)',
  'Semester yang diampu': 'Semester taught',
  'Simpan akun': 'Save account',
  'Tambah dosen': 'Add lecturer',
  'Tambah admin': 'Add admin',
  'Tambah mahasiswa': 'Add student',
  'Akun Anda': 'Your account',
  'Diatur di basis data': 'Managed in the database',
  'Akun ini tidak bisa masuk lagi, dan sesi yang sedang terbuka langsung berakhir. Datanya tetap tersimpan.':
    'This account can no longer sign in, and any open session ends immediately. Its data stays.',
  'Akun ini bisa masuk lagi seperti semula.': 'This account can sign in again as before.',
  'Alasan (wajib, minimal {n} karakter)': 'Reason (required, at least {n} characters)',
  'Membaca Log Aktivitas': 'Read the Activity Log',
  'Mengangkat Super Admin dari website': 'Appoint a Super Admin from the website',
  'hanya miliknya': 'own only',
  'mahasiswa di kelasnya': 'students in their classes',
  'hanya menarik permintaannya sendiri': 'can only withdraw their own requests',
  'Wewenang secukupnya': 'Least privilege',
  'Setiap peran hanya bisa melakukan yang dibutuhkan tugasnya.': 'Each role can only do what its job requires.',
  'Yang meminta tidak menyetujui': 'Requesters do not approve',
  'Admin mengajukan, Super Admin memutuskan. Tidak ada yang menyetujui permintaannya sendiri.':
    'Admins submit, the Super Admin decides. Nobody approves their own request.',
  'Dijaga di server': 'Enforced on the server',
  'Setiap pintu API memeriksa ulang peran pengirimnya. Menyembunyikan tombol saja tidak cukup.':
    'Every API endpoint re-checks the sender’s role. Hiding a button is not enough.',
  'Semua tercatat': 'Everything is recorded',
  'Pengajuan, keputusan, dan penarikan masuk Log Aktivitas dan tidak bisa dihapus dari website.':
    'Submissions, decisions, and withdrawals go into the Activity Log and cannot be deleted from the website.',
  Ya: 'Yes',
  Tidak: 'No',
  'Selalu perlu persetujuan': 'Always needs approval',
  'Matriks wewenang': 'Permissions matrix',
  'Boleh {n} dari {total} tindakan': 'Allowed {n} of {total} actions',
  '{n} lainnya lewat persetujuan Super Admin': '{n} more through Super Admin approval',
  'Mengikuti aturan yang dijaga server saat ini.': 'Follows the rules the server currently enforces.',
  'Prinsip yang dipakai': 'Principles applied',
  'Aturan perhitungan yang sedang berlaku. Periode akademik dipindah dari halaman ini; aturan lainnya diubah lewat tabel Konfigurasi di basis data, sedangkan bobot dan penilaian aspek lewat halaman Penilaian & Bobot.':
    'The calculation rules currently in effect. The academic period is moved from this page; other rules are changed through the Konfigurasi table in the database, while weights and aspect assessments are changed on the Assessment & Weights page.',
  'Periode akademik': 'Academic period',
  'Semester tiap mahasiswa, siapa yang sudah lewat Semester 3, dan angkatan yang nilainya boleh disahkan dihitung dari periode ini.':
    "Each student's semester, who is already past Semester 3, and which cohorts may have their scores ratified are all calculated from this period.",
  'Tersimpan di basis data': 'Stored in the database',
  'Bawaan kode, belum pernah dipindah': 'Code default, never moved',
  'Pindah ke {periode}': 'Move to {periode}',
  'Kembalikan ke {periode}': 'Move back to {periode}',
  'Dampak bila dipindah ke {periode}': 'Impact of moving to {periode}',
  Sekarang: 'Now',
  'Sesudah dipindah': 'After the move',
  'Belum mulai': 'Not started',
  'Lewat Semester {n}': 'Past Semester {n}',
  'Belum ada angkatan yang terdampak.': 'No cohort is affected.',
  '{n} angkatan akan lewat Semester {batas}: mahasiswanya tidak lagi ditangani dosen, perubahan datanya oleh admin biasa perlu persetujuan Super Admin, dan nilai angkatannya boleh disahkan.':
    '{n} cohorts will pass Semester {batas}: their students are no longer handled by lecturers, changes to their data by a regular admin need Super Admin approval, and the cohort scores may be ratified.',
  '{n} angkatan akan kembali ke Semester {batas} dan kembali ditangani dosen.':
    '{n} cohorts will return to Semester {batas} and be handled by lecturers again.',
  'Pindahkan ke {periode}': 'Move to {periode}',
  'Hanya bisa satu semester maju atau mundur setiap kali, dan setiap perpindahan tercatat di Log Aktivitas beserta alasannya.':
    'The period can only move one semester forward or back at a time, and every move is recorded in the Activity Log with its reason.',
  'Buka Penilaian & Bobot': 'Open Assessment & Weights',
  'aturan masih menunggu konfirmasi': 'rules still awaiting confirmation',
  '{n} sudah ditetapkan': '{n} confirmed',
  Aturan: 'Rule',
  'Yang berlaku': 'In effect',
  'Basis data': 'Database',
  'Bawaan kode': 'Code default',
  'bawaan: {nilai}': 'default: {nilai}',
  'Menunggu konfirmasi': 'Awaiting confirmation',
  Ditetapkan: 'Confirmed',
  'Menunggu konfirmasi: angka usulan tim yang belum dikonfirmasi unit pengelola, jadi masih bisa berubah.':
    'Awaiting confirmation: figures proposed by the team that the managing unit has not confirmed yet, so they may still change.',
  'Semester aspek A.3': 'Semester for aspect A.3',
  'Semester aspek C.1': 'Semester for aspect C.1',
  'Pembagian bobot komponen': 'Component weight split',
  'Bobot per sumber': 'Weight per source',
  'Bobot komponen MK Humaniora': 'Humanities course component weights',
  'Bobot antaraspek': 'Weight between aspects',
  'Bobot aspek kustom': 'Custom aspect weights',
  'Cara menggabungkan nilai': 'How scores are combined',
  'Nilai minimum sertifikat': 'Minimum certificate score',
  'Kapan aspek menjadi final': 'When an aspect becomes final',
  'Aspek berkomponen draft boleh final': 'Aspects with draft components may be final',
  'Dipakai bila pembagian bobotnya per sumber.': 'Used when weights are split by source.',
  'Dipakai bila bobot antaraspeknya kustom.': 'Used when aspect weights are custom.',
  'Dibagi rata ke semua komponen': 'Split evenly across all components',
  'Per sumber penilaian': 'By assessment source',
  'Sama untuk semua aspek': 'Equal for every aspect',
  'Kustom per aspek': 'Custom per aspect',
  'Per aspek': 'Per aspect',
  'Per semester': 'Per semester',
  'Otomatis saat komponennya lengkap': 'Automatically once its components are complete',
  'Ditandai manual oleh admin': 'Marked manually by an admin',
  'Saat semester ditutup': 'When the semester closes',
  'Lama program': 'Programme length',
  'Struktur program, tidak bisa ditimpa dari basis data.': 'Programme structure; cannot be overridden from the database.',
  '{n} semester': '{n} semesters',
  'MK Humaniora': 'Humanities course',
  'Jejak setiap tindakan untuk menelusuri siapa mengubah apa dan kapan. Log hanya bisa dibaca, tidak bisa diubah atau dihapus dari website.':
    'A trail of every action, to trace who changed what and when. The log is read-only; it cannot be edited or deleted from the website.',
  'Ubah data yang sudah final': 'Change finalized data',
  'Batalkan perubahan data yang sudah final': 'Roll back a change to finalized data',
  'Ajukan persetujuan': 'Submit for approval',
  'Putuskan persetujuan': 'Decide an approval',
  'Tidak ada rincian tambahan.': 'No further details.',
  Aktivitas: 'Activity',
  'Perubahan nilai': 'Score changes',
  Pelaku: 'Actor',
  'Semua pelaku': 'All actors',
  'Jenis tindakan': 'Action type',
  'Semua tindakan': 'All actions',
  'NIM mahasiswa': 'Student ID (NIM)',
  'Hari ini': 'Today',
  '7 hari terakhir': 'Last 7 days',
  'Semua waktu': 'All time',
  '{n} catatan': '{n} entries',
  'Tidak ada catatan': 'No entries',
  'Coba longgarkan penyaringnya.': 'Try loosening the filters.',
  'Belum ada yang tercatat.': 'Nothing has been recorded yet.',
  'Waktu (WIB)': 'Time (WIB)',
  Sasaran: 'Target',
  'Lama → baru': 'Old → new',
  'Batch dibatalkan': 'Batch rolled back',
  menjadi: 'to',
  /* Log Aktivitas yang mencatat semua tindakan (README.md › Log aktivitas): jenis tindakan baru (LABEL_LOG), sebutan
     peran, cara masuk nilai, dan nama isian rincian (LABEL_PERAN, LABEL_CARA, LABEL_RINCIAN di admin/Log.jsx, semuanya
     lewat t(label)), lalu tabel sebelum/sesudah dan keterangan batch di tab Perubahan nilai. */
  'Tolak usulan nilai dosen': 'Reject lecturer score proposal',
  'Minta akses cetak sertifikat': 'Request certificate print access',
  'Ubah profil': 'Edit profile',
  'usulan {id}': 'proposal {id}',
  'perbaikan nilai dosen': 'lecturer score fix',
  'persetujuan usulan dosen': 'lecturer proposal approval',
  'Tidak ada': 'None',
  Diberi: 'Granted',
  Isian: 'Field',
  Sebelum: 'Before',
  Sesudah: 'After',
  Perubahan: 'Change',
  'Dibatalkan {oleh} pada {waktu}': 'Rolled back by {oleh} on {waktu}',
  'Pesan galat': 'Error message',
  Peran: 'Role',
  NIP: 'Staff ID (NIP)',
  Label: 'Label',
  Periode: 'Period',
  Tahun: 'Year',
  'Semester kalender': 'Calendar semester',
  'Cara masuk nilai': 'Entry method',
  'Jumlah nilai': 'Number of scores',
  'Baris data terkunci': 'Locked rows',
  'Nilai saat diajukan': 'Score when submitted',
  Pengajuan: 'Request',
  Permintaan: 'Request',
  Usulan: 'Proposal',
  Pengaju: 'Requested by',
  Lapis: 'Stage',
  Keputusan: 'Decision',
  Judul: 'Title',
  Dampak: 'Impact',
  Contoh: 'Examples',
  Ditambah: 'Added',
  Diubah: 'Changed',
  Diarsipkan: 'Archived',
  Dipulihkan: 'Restored',
  Pengaturan: 'Setting',
  Izin: 'Permission',
  Ke: 'To',
  'Dicabut dari final': 'Removed from final',
  'Berhak sertifikat': 'Eligible for a certificate',
  'Belum berhak sertifikat': 'Not yet eligible for a certificate',
  'Komponen kosong': 'Empty components',
  'Menjadi belum lengkap': 'Became incomplete',
  'Tidak lagi berhak sertifikat': 'No longer eligible for a certificate',
  'Dilewati (nilai sama)': 'Skipped (same score)',
  'Diajukan ke Super Admin': 'Submitted to the Super Admin',
  'Jumlah diajukan': 'Number submitted',
  'Ditolak sistem': 'Rejected by the system',
  'Batch dibuat oleh': 'Batch created by',
  'Batch dibuat pada': 'Batch created on',
  'Versi kurikulum': 'Curriculum version',
  'Sudah dibuka untuk dicetak': 'Times opened for printing',
  'Terakhir dibuka untuk dicetak': 'Last opened for printing',

  /* ---------------- panel Kemahasiswaan: kerangka dan pencarian cepat ---------------- */
  // 'Kerja harian' dan 'Detail mahasiswa' dibaca lewat data menu dan lokasi halaman, jadi tidak terlihat pemindai.
  'Kerja harian': 'Daily work',
  'Detail mahasiswa': 'Student details',
  'Menu Kemahasiswaan': 'Student Affairs menu',
  'Lokasi halaman': 'Breadcrumb',
  'Cari mahasiswa atau halaman': 'Search students or pages',
  'Pencarian cepat': 'Quick search',
  'Ketik nama, NIM, atau nama halaman': 'Type a name, student ID, or page name',
  'Hasil pencarian': 'Search results',
  Halaman: 'Pages',
  'Ketik minimal 2 huruf untuk mencari mahasiswa.': 'Type at least 2 letters to search for students.',
  'Tidak ada mahasiswa atau halaman yang cocok dengan "{kata}".': 'No students or pages match "{kata}".',
  'Panah atas/bawah untuk memilih, Enter untuk membuka, Esc untuk menutup.':
    'Use the up and down arrows to choose, Enter to open, Esc to close.',

  /* ------------------------------- Overview ------------------------------- */
  'Pekerjaan yang menunggu Anda dan capaian mahasiswa periode ini.': 'Work waiting for you and student achievement this period.',
  'Perlu dikerjakan': 'To do',
  'Urut dari yang menunggu keputusan Anda, lalu nilai yang belum diisi.':
    'Items awaiting your decision come first, then scores not yet filled in.',
  '{n} hal': '{n} items',
  '{n} usulan nilai dari dosen menunggu persetujuan': '{n} score proposals from lecturers await approval',
  '{n} pengajuan koreksi nilai dari mahasiswa belum diputuskan': '{n} score correction requests from students await a decision',
  '{n} nilai {sumber} Semester {semester} belum diisi': '{n} {sumber} scores for Semester {semester} are not filled in yet',
  'dan {n} lainnya': 'and {n} more',
  'Tinjau usulan': 'Review proposals',
  'Tinjau koreksi': 'Review corrections',
  'Buka Angkatan': 'Open Cohorts',
  'Lihat mahasiswa': 'View students',
  '{n} kelompok nilai lain juga belum lengkap; semuanya ada di lonceng di kanan atas.':
    '{n} more score groups are incomplete; all of them are listed under the bell at the top right.',
  'Tidak ada pekerjaan yang menunggu': 'Nothing is waiting for you',
  'Koreksi mahasiswa dan nilai yang wajib diisi sudah tertangani.':
    'Student corrections and required scores are all handled.',
  'Lihat nilai': 'View scores',
  'Ringkasan angka': 'Key figures',

  /* ---------------------------- Data Mahasiswa ---------------------------- */
  'Cari nama, NIM, atau prodi': 'Search name, student ID, or programme',
  'Atur ulang filter': 'Reset filters',
  'Baris per halaman': 'Rows per page',
  'Aksi untuk {nama}': 'Actions for {nama}',
  'Lihat detail & transkrip': 'View details & transcript',
  Lengkap: 'Complete',
  'Belum lengkap': 'Incomplete',
  Filter: 'Filters',
  '{n} aktif': '{n} active',
  'Tidak ada nilai yang kosong': 'No missing scores',
  'Semua {n} mahasiswa pada saringan ini sudah lengkap nilainya.': 'All {n} students in this filter have complete scores.',

  /* ------------------------------ Input Nilai ----------------------------- */
  'Pilih semester, sumber penilaian, dan angkatan, lalu isi nilai satu per satu atau unggah rekapnya.':
    'Choose a semester, assessment source, and cohort, then enter scores one by one or upload a recap.',
  '1. Semester yang diisi': '1. Semester to fill in',
  '2. Sumber penilaian': '2. Assessment source',
  '3. Angkatan': '3. Cohort',
  'mahasiswa pada pilihan ini': 'students in this selection',

  /* -------- perbaikan bug panel Kemahasiswaan -------- */
  '{n} baris siap diproses': '{n} rows ready to process',
  '{n} pengajuan koreksi dari mahasiswa menunggu keputusan.': '{n} score correction requests from students are waiting for a decision.',
  '{terisi} terisi · {kosong} kosong': '{terisi} filled · {kosong} empty',
  'Aktor': 'Actor',
  'Angka di kanan: banyaknya nilai dalam usulan dosen, atau nilai komponen yang masih kosong pada kelompok itu.': 'Number on the right: how many scores a lecturer proposal contains, or how many component scores are still empty in that group.',
  'Angkatan {label} belum mulai': 'Cohort {label} has not started',
  'Angkatan ini belum mulai; Semester 1-nya dimulai {periode}. Pengesahan bisa dilakukan setelah Semester {total} berakhir.': 'This cohort has not started; its Semester 1 begins in {periode}. Its scores can be ratified after Semester {total} ends.',
  'Atur lagi': 'Adjust again',
  'Batalkan batch {id}? Semua nilai di batch ini dikembalikan ke nilai sebelumnya.': 'Roll back batch {id}? Every score in this batch returns to its previous value.',
  'Batalkan pilihan': 'Cancel selection',
  'Batch': 'Batch',
  'belum mulai': 'not started yet',
  'belum punya mahasiswa terdaftar. Pilih angkatan lain di langkah 3.': 'has no registered students yet. Choose another cohort in step 3.',
  'dan {n} nilai lain': 'and {n} more scores',
  'dari 100': 'out of 100',
  'Edit': 'Edit',
  'Fakultas {nama}': 'Faculty of {nama}',
  'Hapus foto': 'Remove photo',
  'Komponen tujuan kolom {nama}': 'Target component for column {nama}',
  'Nilai baru': 'New score',
  'Nilai lama': 'Previous score',
  'pilih berkas': 'choose a file',
  'Pilih satuan analisis: program studi, fakultas, atau angkatan.': 'Choose the unit of analysis: study programme, faculty, or cohort.',
  'Pratinjau foto baru': 'New photo preview',
  'Rata-rata nilai': 'Average score',
  'Rincian aspek {kode}': 'Details for aspect {kode}',
  'Semester {n}: {periode}': 'Semester {n}: {periode}',
  'Semester 1 angkatan ini dimulai {periode}. Nilainya belum boleh dimasukkan sebelum semesternya tiba.': 'This cohort\'s Semester 1 begins in {periode}. Scores cannot be entered before that semester starts.',
  'Seret berkas ke sini, atau': 'Drag a file here, or',
  'Skala kolom {nama}': 'Scale for column {nama}',
  'tertinggi {n}': 'highest {n}',
  'tidak dipakai': 'not used',
  'Tinjau pengajuan': 'Review requests',
  'Waktu': 'Time',
  'Grafik Sebaran Aspek': 'Aspect Distribution Chart',
  'Profil enam cluster': 'Six-cluster profile',
  'Rata-rata aspek CPMK di tiap cluster': 'Average CPMK aspect score in each cluster',
  'Yakin': 'Confident',
  'Perlu dicek': 'Needs checking',
  'Tebakan lemah': 'Weak guess',
  'Tidak cocok': 'No match',
  '0–100 (tanpa konversi)': '0–100 (no conversion)',
  '0–10 (dikali 10)': '0–10 (multiplied by 10)',
  '0–4 (dikali 25)': '0–4 (multiplied by 25)',
  'Rata-rata': 'Average',
  'Ambil tertinggi': 'Take the highest',
  'Pakai kolom terakhir': 'Use the last column',
  '— Abaikan kolom ini —': 'Ignore this column',
  'UTS': 'Midterm',
  'UAS': 'Final exam',
  'Sem': 'Sem',
  'Cluster': 'Cluster',
  'Final': 'Final',
  'final': 'final',
  'Status': 'Status',
  'Semester {n}': 'Semester {n}',
  'Sudah menempuh Semester {n}': 'Has completed Semester {n}',
  'Baru menempuh Semester {n} dari {total}': 'Only at Semester {n} of {total}',
  'program baru sampai Semester {n}': 'programme only up to Semester {n}',
  'Seluruh {n} aspek berstatus final': 'All {n} aspects are final',
  'Belum final: {daftar}': 'Not final yet: {daftar}',
  'aspek {daftar} belum final': 'aspect {daftar} not final yet',
  'Tidak ada komponen asesmen yang kosong': 'No assessment component is empty',
  'Komponen kosong pada {daftar}': 'Empty components in {daftar}',
  'komponen {komponen} pada {kode} belum dinilai': 'component {komponen} in {kode} not graded yet',
  'Nilai akhir minimal {n}': 'Final score of at least {n}',
  'Nilai akhir belum bisa dihitung': 'Final score cannot be calculated yet',
  'nilai akhir belum bisa dihitung': 'final score cannot be calculated yet',
  'nilai akhir {nilai} di bawah rata-rata minimal {n}': 'final score {nilai} below the minimum average of {n}',
  'Nilai angkatan sudah disahkan Kemahasiswaan': 'Cohort scores ratified by Student Affairs',
  'Nilai angkatan {label} belum disahkan': 'Cohort {label} scores are not ratified yet',
  'nilai angkatan {label} belum disahkan': 'cohort {label} scores not ratified yet',

  /* -------- label predikat (sama di kedua bahasa) -------- */
  'Professional & Competent': 'Professional & Competent',
  'Emerging Professional': 'Emerging Professional',
  'Developing Professional Skills': 'Developing Professional Skills',
  'Basic Professional Awareness': 'Basic Professional Awareness',

  /* -------- nama area (sama di kedua bahasa) -------- */
  'Personal Development': 'Personal Development',
  'Interpersonal Development': 'Interpersonal Development',
  'Professional Career Development': 'Professional Career Development',

  /* -------- desain ulang halaman Kemahasiswaan -------- */
  '(kosong)': '(empty)',
  'Cari NIM, lalu tekan Enter': 'Search a student ID, then press Enter',
  'Dari': 'From',
  'Dikembalikan ke dosen beserta alasannya.': 'Returned to the lecturer with the reason.',
  'Jenis catatan': 'Record type',
  'Jenis tindak lanjut': 'Follow-up type',
  'Masuk sebagai batch di Riwayat Batch halaman Input Nilai.': 'Entered as a batch in the Batch History of the Score Input page.',
  'Menampilkan {n} dari {total} perubahan': 'Showing {n} of {total} changes',
  'Permintaan yang sudah diputuskan atau ditarik tercatat di sini.': 'Requests that were decided or withdrawn are recorded here.',
  'program studi': 'study programmes',
  'Program studi yang punya mahasiswa pada saringan ini.': 'Study programmes with students under this filter.',
  'Sampai': 'To',
  'Satuan analisis': 'Unit of analysis',
  'Tampilkan 10 terbaru': 'Show the 10 latest',
  'Tampilkan semua': 'Show all',

  /* -------- satuan kartu angka -------- */
  'usulan': 'proposals',

  /* -------- panel dosen sejak rapat 24 Okt 2026: Beranda memantau (dosen/Pantau.jsx), nilai masuk lewat
     unggahan Excel (dosen/Unggah.jsx, galatnya dari src/lib/unggahDosen.js) -------- */
  'Unggah Nilai': 'Upload Scores',
  Unggah: 'Upload',
  'Unggah nilai': 'Upload scores',
  'Pantau kelengkapan dan sebaran nilai kelas Anda. Nilai masuk lewat unggahan Excel.':
    'Monitor how complete your class scores are and how they spread. Scores come in through Excel uploads.',
  'dari {n} nilai': 'of {n} scores',
  'Belum ada mahasiswa atau tugas di kelas Anda.': 'Your class has no students or tasks yet.',
  'Belum ada nilai yang masuk. Unggah rekap Excel kelas Anda.': 'No scores have come in yet. Upload your class recap from Excel.',
  '{n} nilai belum masuk.': '{n} scores have not come in yet.',
  'Semua nilai kelas Anda sudah masuk.': 'All of your class scores are in.',
  'Unggahan terakhir {waktu}, {n} nilai.': 'Last upload {waktu}, {n} scores.',
  'Jumlah mahasiswa': 'Students',
  '{prodi} dari Semester {n} sampai programnya selesai.': '{prodi}, from Semester {n} until their programme ends.',
  'Rata-rata kelas': 'Class average',
  'Dari seluruh nilai tugas yang sudah masuk.': 'From every task score that has come in.',
  'Rata-rata di bawah {n}': 'Average below {n}',
  'Mahasiswa yang rata-rata nilai tugasnya perlu perhatian.': 'Students whose task average needs attention.',
  'Kelengkapan per tugas': 'Completeness per task',
  'Berapa mahasiswa yang nilainya sudah masuk untuk tiap tugas.': 'How many students have a score in for each task.',
  'Belum ada tugas untuk kelas Anda': 'Your class has no tasks yet',
  'Tugas kelas ditetapkan Super Admin lewat halaman Penilaian & Bobot.': 'The Super Admin sets class tasks on the Assessment & Weights page.',
  'Nilai mahasiswa': 'Student scores',
  '{n} mahasiswa di kelas Anda': '{n} students in your class',
  Terisi: 'Filled in',
  Terendah: 'Lowest',
  'Tutup rincian': 'Hide details',
  'Belum ada mahasiswa di kelas Anda': 'Your class has no students yet',
  'Di sini akan muncul mahasiswa {prodi} yang sudah sampai Semester {n} dan programnya belum selesai.':
    '{prodi} students who have reached Semester {n} and whose programme has not ended will appear here.',
  'Nilai yang Anda unggah langsung tersimpan dan tampil di transkrip mahasiswa. Bila ada yang keliru, unggah ulang dengan nilai yang benar, atau minta Super Admin membatalkan unggahannya.':
    'Scores you upload are saved right away and appear on student transcripts. If something is wrong, upload again with the right scores, or ask the Super Admin to cancel the upload.',
  'Unggah rekap nilai kelas Anda dari Excel. Periksa perubahannya, lalu simpan: nilainya langsung masuk transkrip mahasiswa.':
    'Upload your class score recap from Excel. Review the changes, then save: the scores go straight onto student transcripts.',
  'Templat berisi {n} mahasiswa kelas Anda dan satu kolom untuk tiap tugas ({k} tugas). Nilai yang sudah tersimpan ikut terisi.':
    'The template lists the {n} students in your class with one column per task ({k} tasks). Scores already saved are filled in.',
  'Jangan ubah baris judul dan kolom NIM.': 'Do not change the title row or the NIM (student ID) column.',
  'Tulis nilai 0 sampai 100. Desimal boleh, misalnya 85,5.': 'Write scores from 0 to 100. Decimals are fine, for example 85.5.',
  'Sel yang dikosongkan dilewati; nilai yang sudah tersimpan tidak terhapus.': 'Empty cells are skipped; scores already saved are not deleted.',
  'Menyiapkan templat…': 'Preparing the template…',
  'Unduh templat (.xlsx)': 'Download template (.xlsx)',
  'Templat gagal dibuat. Muat ulang halaman, lalu coba lagi.': 'The template could not be created. Reload the page, then try again.',
  'Unggah berkas': 'Upload the file',
  'Pilih rekap yang sudah diisi. Isinya dibaca dulu untuk Anda periksa; belum ada yang tersimpan.':
    'Choose the filled-in recap. It is read first for you to review; nothing is saved yet.',
  'Tarik berkas ke sini, atau': 'Drag the file here, or',
  'Membaca berkas…': 'Reading the file…',
  'Ganti berkas': 'Change file',
  'Pilih berkas': 'Choose file',
  'Berkas .xlsx atau .csv, paling besar 5 MB.': 'An .xlsx or .csv file, up to 5 MB.',
  '{n} nilai tersimpan dan sudah tampil di transkrip mahasiswa.': '{n} scores saved and now shown on student transcripts.',
  'Tidak ada nilai yang berubah, jadi tidak ada yang disimpan.': 'No score changed, so nothing was saved.',
  'Periksa sebelum menyimpan': 'Review before saving',
  'Hanya nilai yang berbeda dari yang tersimpan yang akan ditulis.': 'Only scores that differ from the saved ones will be written.',
  'Nilai berubah': 'Scores changed',
  'Mahasiswa terdampak': 'Students affected',
  'Sama dengan tersimpan': 'Same as saved',
  'Sel kosong dilewati': 'Empty cells skipped',
  'Kolom tugas yang dibaca': 'Task columns read',
  '{n} kolom sama persis dengan templat.': '{n} columns match the template exactly.',
  '(dicocokkan dari kemiripan nama, periksa lagi)': '(matched by a similar name, check again)',
  'Tidak ada kolomnya di berkas, jadi nilainya tidak berubah: {daftar}.': 'Not in the file, so their scores stay the same: {daftar}.',
  'Belum bisa disimpan. Perbaiki {n} masalah ini di berkas, lalu unggah lagi:':
    'Cannot be saved yet. Fix these {n} problems in the file, then upload again:',
  'dan {n} masalah lainnya': 'and {n} more problems',
  'Nilai yang akan disimpan': 'Scores to be saved',
  'dan {n} perubahan lainnya': 'and {n} more changes',
  'Tidak ada nilai yang berubah. Semua nilai di berkas sama dengan yang tersimpan atau selnya kosong.':
    'No score changed. Every score in the file matches the saved one or its cell is empty.',
  'Menyimpan…': 'Saving…',
  'Simpan {n} nilai': 'Save {n} scores',
  'Riwayat unggahan': 'Upload history',
  'usulan lama yang disetujui': 'approved earlier proposal',
  'Dibatalkan Super Admin': 'Cancelled by the Super Admin',
  'Belum ada unggahan': 'No uploads yet',
  'Unggahan yang Anda simpan akan tercatat di sini.': 'Uploads you save will be listed here.',
  'Setiap unggahan tercatat di log. Bila ada nilai yang keliru, unggah ulang dengan nilai yang benar, atau minta Super Admin membatalkan unggahannya.':
    'Every upload is recorded in the log. If a score is wrong, upload again with the right score, or ask the Super Admin to cancel the upload.',
  // Lembar templat Excel.
  'Petunjuk': 'Instructions',
  'Cara mengisi templat ini': 'How to fill in this template',
  'Kelas: {kelas}.': 'Class: {kelas}.',
  'Satu baris untuk satu mahasiswa. Jangan ubah baris judul, kolom NIM, dan urutan kolomnya.':
    'One row per student. Do not change the title row, the NIM column, or the column order.',
  'Nilai yang sudah tersimpan ikut terisi. Cukup ubah atau tambah yang perlu.': 'Scores already saved are filled in. Change or add only what you need.',
  'Simpan sebagai .xlsx, lalu unggah di halaman Unggah Nilai.': 'Save it as .xlsx, then upload it on the Upload Scores page.',
  // Galat dan peringatan bacaRekap (src/lib/unggahDosen.js) dan bacaBerkas (dosen/Unggah.jsx).
  'Berkasnya kosong: tidak ada baris judul maupun nilai.': 'The file is empty: it has no title row and no scores.',
  'Kolom NIM tidak ditemukan di baris pertama. Pakai templat dan jangan ubah baris judulnya.':
    'No NIM column in the first row. Use the template and do not change its title row.',
  'Kolom "{kolom}" tidak dikenali sebagai tugas kelas Anda. Pakai judul kolom dari templat.':
    'Column "{kolom}" is not recognised as a task in your class. Use the column titles from the template.',
  'Kolom "{kolom}" dan "{lain}" sama-sama untuk {kode}. Hapus salah satunya.': 'Columns "{kolom}" and "{lain}" are both for {kode}. Remove one of them.',
  'Tidak ada kolom tugas yang dikenali. Pakai templat dari halaman ini.': 'No task column was recognised. Use the template from this page.',
  'Ada angka di kolom tanpa judul: {kolom}. Pastikan setiap nilai berada di bawah judul tugasnya, lalu hapus angka di kolom tersebut.':
    'There are numbers in untitled columns: {kolom}. Make sure every score sits under its task title, then delete the stray numbers.',
  'Baris {baris}: NIM kosong.': 'Row {baris}: the NIM is empty.',
  'Baris {baris}: NIM {nim} tidak terdaftar di kelas Anda.': 'Row {baris}: NIM {nim} is not in your class.',
  'Baris {baris}: NIM {nim} sudah ada di baris {lain}.': 'Row {baris}: NIM {nim} already appears in row {lain}.',
  'Baris {baris} (NIM {nim}), kolom {kode}: "{sel}" bukan angka 0 sampai 100.':
    'Row {baris} (NIM {nim}), column {kode}: "{sel}" is not a number from 0 to 100.',
  'Baris {baris} (NIM {nim}): aspek {aspek} baru dibuka pada Semester {n}.': 'Row {baris} (NIM {nim}): aspect {aspek} only opens in Semester {n}.',
  'Kolom {kode}: semua nilai barunya {maks} atau kurang. Templat memakai skala 0 sampai 100; bila rekap Anda berskala 0 sampai 10 atau 0 sampai 4, ubah dulu ke 0 sampai 100.':
    'Column {kode}: every new score is {maks} or lower. The template uses a 0 to 100 scale; if your recap uses 0 to 10 or 0 to 4, convert it to 0 to 100 first.',
  'Berkasnya lebih dari 5 MB. Pastikan ini rekap nilai kelas Anda.': 'The file is larger than 5 MB. Make sure it is your class score recap.',
  'Berkas .xls (Excel lama) belum bisa dibaca. Buka di Excel, simpan sebagai .xlsx, lalu unggah lagi.':
    '.xls files (old Excel) cannot be read yet. Open it in Excel, save it as .xlsx, then upload again.',
  'Pilih berkas .xlsx atau .csv.': 'Choose an .xlsx or .csv file.',
  'Berkas ini tidak terbaca sebagai Excel. Simpan ulang sebagai .xlsx lalu unggah lagi.': 'This file cannot be read as Excel. Save it again as .xlsx, then upload again.',
  // Persetujuan Nilai Dosen (admin/Usulan.jsx) kini hanya untuk usulan lama.
  'Usulan nilai dosen dari sebelum dosen mengunggah langsung. Hanya Super Admin yang memutuskannya; Anda bisa melihat isinya.':
    'Lecturer score proposals from before lecturers uploaded directly. Only the Super Admin decides them; you can view what they contain.',
  'Usulan nilai dosen dari sebelum dosen mengunggah langsung. Nilainya tertahan di sini sampai Anda putuskan, dan sistem sudah memeriksa tiap barisnya lebih dulu.':
    'Lecturer score proposals from before lecturers uploaded directly. Their scores are held here until you decide, and the system has already checked every row.',
  'Dosen kini mengunggah nilai langsung, jadi tidak ada usulan baru yang masuk ke sini.': 'Lecturers now upload scores directly, so no new proposals arrive here.',
  'Menunggu keputusan Super Admin.': 'Waiting for the Super Admin to decide.',
  // Pilihan wajib di formulir tambah akun dan data master, tanpa nilai bawaan (Select › kosong).
  'Pilih program studi': 'Choose a study programme',
  'Pilih angkatan': 'Choose a cohort',
  'Pilih fakultas': 'Choose a faculty',
  'Pilih sumber penilaian': 'Choose an assessment source',
  'Pilih semester': 'Choose a semester',
  'Pilih program studi lebih dulu.': 'Choose a study programme first.',
  'Pilih angkatan lebih dulu.': 'Choose a cohort first.',
  'Pilih sumber penilaian lebih dulu.': 'Choose an assessment source first.',
  'Pilih semester yang diampu lebih dulu.': 'Choose the semester taught first.',

  /* -------- persetujuan dua lapis (rapat 24 Okt 2026): ubah nilai dan akses cetak sertifikat -------- */
  // Status (src/lib/duaLapis.js).
  'Menunggu Admin': 'Waiting for Admin',
  'Menunggu Super Admin': 'Waiting for Super Admin',
  'Siap dicetak': 'Ready to print',
  // Halaman Sertifikat mahasiswa.
  'Semua syarat terpenuhi. Minta akses cetak untuk mendapatkan sertifikatmu.':
    'All requirements are met. Request print access to get your certificate.',
  'Permintaan akses cetak sedang ditinjau admin Kemahasiswaan.': 'Your print access request is being reviewed by Student Affairs.',
  'Admin Kemahasiswaan sudah menyetujui. Menunggu persetujuan Super Admin.':
    'Student Affairs has approved it. Waiting for the Super Admin to approve.',
  'Akses cetak sudah disetujui. Sertifikat siap dicetak.': 'Print access is approved. Your certificate is ready to print.',
  'Permintaan akses cetak ditolak. Periksa alasannya, lalu ajukan lagi bila sudah sesuai.':
    'Your print access request was rejected. Check the reason, then request again once it is resolved.',
  'Akses cetak bisa diminta setelah seluruh syarat di bawah terpenuhi, tanpa terlewat satu pun.':
    'You can request print access once every requirement below is met, without exception.',
  'Minta akses cetak': 'Request print access',
  'Minta akses cetak lagi': 'Request print access again',
  'Alasan penolakan': 'Reason for rejection',
  '{oleh}, {tanggal}': '{oleh}, {tanggal}',
  'Langkah akses cetak': 'Print access steps',
  'Diajukan {tanggal}': 'Requested {tanggal}',
  'Disetujui {tanggal}': 'Approved {tanggal}',
  'Sedang ditinjau': 'Under review',
  'Bisa dicetak sekarang': 'Can be printed now',
  // Ubin Sertifikat di Dashboard mahasiswa.
  'Bisa diminta': 'Can be requested',
  'Minta akses cetak di halaman ini': 'Request print access on this page',
  'Sedang ditinjau admin Kemahasiswaan': 'Being reviewed by Student Affairs',
  'Menunggu persetujuan Super Admin': 'Waiting for Super Admin approval',
  'Buka untuk mencetak': 'Open to print',
  'Permintaan ditolak': 'Request rejected',
  'Buka untuk melihat alasannya': 'Open to see the reason',
  // Pengajuan koreksi mahasiswa (Transkrip, Riwayat).
  'Nilai yang menurutmu benar (opsional)': 'The score you think is correct (optional)',
  'Nilai yang diharapkan harus 0–100.': 'The expected score must be 0–100.',
  'Nilai baru {nilai} sudah masuk transkrip.': 'The new score {nilai} is now on your transcript.',
  'Admin Kemahasiswaan sudah meneruskannya. Menunggu keputusan Super Admin.':
    'Student Affairs has forwarded it. Waiting for the Super Admin to decide.',
  // Keputusan koreksi (admin/DaftarKoreksi.jsx).
  'Nilai sekarang': 'Current score',
  'Nilai usulan': 'Proposed score',
  'Catatan (wajib bila menolak)': 'Note (required when rejecting)',
  'Alasan meneruskan atau menolak…': 'Reason for forwarding or rejecting…',
  'Alasan menyetujui atau menolak…': 'Reason for approving or rejecting…',
  'Isi nilai baru 0 sampai 100 sebelum menyetujui.': 'Enter a new score from 0 to 100 before approving.',
  'Alasan penolakan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.':
    'A reason for rejection is required, at least 10 characters, so the student knows why.',
  'Pengajuan ini sudah diputuskan, mungkin di jendela lain.': 'This request has already been decided, perhaps in another window.',
  'Setujui dan terapkan nilai': 'Approve and apply score',
  'Teruskan ke Super Admin': 'Forward to Super Admin',
  'Setelah disetujui, nilai baru langsung masuk transkrip sebagai satu batch yang tercatat di Riwayat Batch.':
    'Once approved, the new score goes straight onto the transcript as one batch recorded in Batch History.',
  'Meneruskan belum mengubah nilai. Super Admin yang memutuskan dan menerapkan nilai barunya.':
    'Forwarding does not change the score yet. The Super Admin decides and applies the new score.',
  'Menunggu keputusan admin Kemahasiswaan (lapis pertama).': 'Waiting for Student Affairs to decide (first layer).',
  'Diteruskan {oleh} pada {tanggal} dengan nilai usulan {nilai}.': 'Forwarded by {oleh} on {tanggal} with a proposed score of {nilai}.',
  'Disetujui {oleh} pada {tanggal}.': 'Approved by {oleh} on {tanggal}.',
  'Ditolak {oleh} pada {tanggal}.': 'Rejected by {oleh} on {tanggal}.',
  'Nilai baru {nilai}.': 'New score {nilai}.',
  'Tidak ada pengajuan ubah nilai yang menunggu Anda': 'No score change requests are waiting for you',
  // Cetak Sertifikat dan Persetujuan.
  'Putuskan lapis pertama permintaan akses cetak, dan bantu mahasiswa yang kesulitan mencetak sertifikatnya sendiri.':
    'Decide the first layer of print access requests, and help students who struggle to print their own certificate.',
  'Putuskan lapis kedua permintaan akses cetak, dan bantu mahasiswa yang kesulitan mencetak sertifikatnya sendiri.':
    'Decide the second layer of print access requests, and help students who struggle to print their own certificate.',
  'Menunggu Anda': 'Waiting for you',
  'Akses cetak': 'Print access',
  'Belum diminta': 'Not requested',
  Tinjau: 'Review',
  'Tidak ada permintaan yang menunggu Anda': 'No requests are waiting for you',
  'Admin Kemahasiswaan sudah menyetujui permintaan ini pada {tanggal}. Setujui untuk membuka akses cetak mahasiswa.':
    'Student Affairs approved this request on {tanggal}. Approve to open print access for the student.',
  'Periksa syarat dan nilainya. Bila sesuai, teruskan ke Super Admin; akses cetak baru terbuka setelah Super Admin menyetujui.':
    'Check the requirements and scores. If they are correct, forward it to the Super Admin; print access opens only after the Super Admin approves.',
  'Mahasiswa ini sudah tidak memenuhi syarat. Tolak permintaannya dengan alasan itu.':
    'This student no longer meets the requirements. Reject the request with that reason.',
  'Setujui akses cetak': 'Approve print access',
  'Permintaan ini sudah diputuskan, mungkin di jendela lain.': 'This request has already been decided, perhaps in another window.',
  'Akses cetak sertifikat': 'Certificate print access',
  'Pengajuan ubah nilai': 'Score change requests',
  'Sudah diteruskan admin Kemahasiswaan. Setujui untuk menerapkan nilai barunya, atau tolak dengan alasan.':
    'Forwarded by Student Affairs. Approve to apply the new score, or reject with a reason.',
  'Sudah disetujui admin Kemahasiswaan. Setujui untuk membuka akses cetak mahasiswa, atau tolak dengan alasan.':
    'Approved by Student Affairs. Approve to open print access for the student, or reject with a reason.',
  'Tidak ada permintaan akses cetak yang menunggu Anda': 'No print access requests are waiting for you',
  'Nilai akhir {nilai}': 'Final score {nilai}',
  'Permintaan admin dan dosen yang perlu persetujuan Anda, misalnya tanda final, bobot, pengesahan angkatan, akses data master, dan perbaikan nilai untuk angkatan yang sudah disahkan. Setujui untuk menjalankannya persis seperti yang diajukan, atau tolak dengan catatan.':
    'Admin and lecturer requests that need your approval, such as final marks, weights, cohort ratification, master data access, and score fixes for ratified cohorts. Approve to run them exactly as submitted, or reject with a note.',
  'Perubahan yang Anda ajukan menunggu persetujuan Super Admin sebelum berlaku. Selama masih menunggu, permintaan bisa Anda tarik.':
    'Changes you submit wait for Super Admin approval before taking effect. While a request is still waiting, you can withdraw it.',
  'Permintaan baru muncul di sini begitu admin mengajukan perubahan yang perlu persetujuan Super Admin.':
    'New requests appear here as soon as an admin submits a change that needs Super Admin approval.',
  // Overview, Pusat Kendali, lonceng.
  '{n} permintaan akses cetak sertifikat menunggu keputusan Anda': '{n} certificate print access requests are waiting for your decision',
  'Tinjau permintaan': 'Review requests',
  'Juga menunggu Anda: {koreksi} pengajuan ubah nilai dan {sertifikat} akses cetak sertifikat.':
    'Also waiting for you: {koreksi} score change requests and {sertifikat} certificate print access requests.',
  'Tidak ada permintaan admin yang menunggu.': 'No admin requests are waiting.',
  'Permintaan admin, pengajuan ubah nilai, dan akses cetak sertifikat yang perlu keputusan Anda muncul di halaman Persetujuan.':
    'Admin requests, score change requests, and certificate print access requests that need your decision appear on the Approvals page.',

  /* -------- kerangka panel dosen (DosenLayout.jsx) -------- */
  'Beranda': 'Home',
  'Berkas: {nama}': 'File: {nama}',
  'Cari nama atau NIM': 'Search name or student ID',
  'Keadaan': 'Status',
  'Kelas Anda': 'Your class',
  'Menu dosen': 'Lecturer menu',
  'NIM {nim}': 'Student ID {nim}',
  'Perbesar tulisan': 'Larger text',
  // Menu aksesibilitas panel dosen (MenuAksesibilitas.jsx).
  'Menu aksesibilitas': 'Accessibility menu',
  'Kembalikan semua setelan': 'Reset all settings',
  'Tutup menu aksesibilitas': 'Close accessibility menu',
  'Penyesuaian konten': 'Content adjustments',
  'Penyesuaian warna': 'Color adjustments',
  'Alat': 'Tools',
  'Ukuran tulisan': 'Text size',
  'Perkecil tulisan': 'Smaller text',
  'Sorot judul': 'Highlight titles',
  'Sorot tautan': 'Highlight links',
  'Huruf ramah disleksia': 'Dyslexia-friendly font',
  'Jarak huruf': 'Letter spacing',
  'Jarak baris': 'Line height',
  'Huruf tebal': 'Bold text',
  'Kontras gelap': 'Dark contrast',
  'Kontras terang': 'Light contrast',
  'Kontras tinggi': 'High contrast',
  'Saturasi tinggi': 'High saturation',
  'Saturasi rendah': 'Low saturation',
  'Monokrom': 'Monochrome',
  'Pemandu baca': 'Reading guide',
  'Hentikan animasi': 'Stop animations',
  'Kursor besar': 'Big cursor',

  /* -------- data master dan izinnya (admin/DataMaster.jsx, super-admin/Akses.jsx, Log, Wewenang) -------- */
  'Admin ini bisa melihat angkatan, fakultas, program studi, dan data mahasiswa di halaman Data Master untuk mencocokkan ulang, tanpa bisa mengubahnya. Menambah dan mengubah data master tetap hanya oleh Super Admin.':
    'This admin can view cohorts, faculties, study programmes, and student data on the Master Data page to cross-check them, without changing them. Only the Super Admin adds and changes master data.',
  'Admin ini tidak bisa lagi membuka halaman Data Master. Halaman lain yang menampilkan mahasiswa dan angkatan tetap terbaca seperti biasa.':
    'This admin can no longer open the Master Data page. Other pages showing students and cohorts stay readable as usual.',
  'Akan dibuat: {label} (kode {id}), masuk {periode}.': 'Will be created: {label} (code {id}), intake {periode}.',
  'Angkatan {label} sudah ada.': 'Cohort {label} already exists.',
  'Angkatan {label} sudah ditambahkan.': 'Cohort {label} has been added.',
  'Angkatan {label} sudah diubah.': 'Cohort {label} has been updated.',
  'Nilai angkatan mahasiswa ini sudah disahkan, jadi ia tidak bisa dipindah.': 'This student’s cohort scores are ratified, so they cannot be moved.',
  'Belum ada mahasiswa.': 'No students yet.',
  'Beri izin lihat data master': 'Grant master data view permission',
  'Cabut izin lihat data master': 'Revoke master data view permission',
  'Data {nama} sudah diubah.': '{nama}’s data has been updated.',
  'Data Master': 'Master Data',
  'Fakultas {nama} sudah ditambahkan.': 'Faculty {nama} has been added.',
  'Fakultas {nama} sudah diubah.': 'Faculty {nama} has been updated.',
  'Izin lihat data master': 'Master data view permission',
  /* Sejak rapat 24 Okt 2026 data master dipegang super admin; admin berizin hanya melihat, yang belum meminta akses. */
  'Lihat angkatan, fakultas, program studi, dan data mahasiswa untuk mencocokkan ulang. Hanya Super Admin yang menambah dan mengubah data master.':
    'View cohorts, faculties, study programmes, and student data to cross-check them. Only the Super Admin adds and changes master data.',
  'Anda hanya bisa melihat data master. Bila ada data yang perlu diperbaiki, sampaikan ke Super Admin.':
    'You can only view master data. If something needs fixing, tell the Super Admin.',
  'Data master dipegang Super Admin. Untuk mencocokkan ulang data, Anda bisa meminta akses baca.':
    'Master data is held by the Super Admin. To cross-check data, you can request read access.',
  'Minta akses baca data master': 'Request read access to master data',
  'Akses ini hanya untuk melihat angkatan, fakultas, program studi, dan data mahasiswa, tanpa bisa mengubahnya.':
    'This access only lets you view cohorts, faculties, study programmes, and student data, without changing them.',
  'Permintaan {id} pernah disetujui. Bila Data Master belum terbuka, muat ulang halaman ini; bila izinnya sudah dicabut Super Admin, ajukan lagi.':
    'Request {id} was approved before. If Master Data is not open yet, reload this page; if the Super Admin has revoked it, request again.',
  'Permintaan {id} menunggu Super Admin.': 'Request {id} is waiting for the Super Admin.',
  'Anda akan bisa melihat Data Master setelah permintaan ini disetujui.':
    'You will be able to view Master Data once this request is approved.',
  Keperluan: 'Purpose',
  'Wajib, minimal {n} karakter': 'Required, at least {n} characters',
  'Minta akses baca': 'Request read access',
  'Jenis data master': 'Master data type',
  'Jenjang': 'Level',
  'Kode {id}': 'Code {id}',
  'Label angkatan': 'Cohort label',
  'Mahasiswa {nama} sudah ditambahkan dan bisa masuk dengan sandi awalnya.': 'Student {nama} has been added and can sign in with the initial password.',
  'Mahasiswa dan dosen tersambung ke prodi lewat basis data, jadi nama baru langsung terpakai di semua halaman.': 'Students and lecturers are linked to the programme in the database, so a new name applies on every page right away.',
  'Mahasiswa ini sudah punya nilai, jadi prodi dan angkatannya tidak bisa diubah.': 'This student already has scores, so their programme and cohort cannot be changed.',
  'Menampilkan {n} dari {total}. Persempit pencarian untuk menemukan mahasiswa lain.': 'Showing {n} of {total}. Narrow the search to find other students.',
  'Menghapus data master tidak bisa dari sini. NIM tidak bisa diubah karena riwayat usulan nilai dosen menyambung lewat NIM; bila NIM salah, minta Super Admin menghapus akunnya selama belum punya data, lalu tambahkan lagi.': 'Master data cannot be deleted here. Student IDs cannot be changed because lecturer score proposals are linked by Student ID; if one is wrong, ask the Super Admin to delete the account while it has no data, then add it again.',
  'Nama fakultas': 'Faculty name',
  'Nama program studi': 'Study programme name',
  'Prodi dan angkatan hanya bisa diubah selama mahasiswanya belum punya nilai, pengumpulan, atau usulan nilai.': 'Programme and cohort can only be changed while the student has no scores, submissions, or score proposals.',
  'Program studi {nama} sudah ditambahkan.': 'Study programme {nama} has been added.',
  'Program studi {nama} sudah diubah.': 'Study programme {nama} has been updated.',
  'Semester masuk': 'Intake semester',
  'Semester setiap mahasiswa dihitung dari periode masuk angkatannya, jadi periode itu tidak bisa diubah.': 'Each student’s semester is counted from their cohort’s intake period, so that period cannot be changed.',
  'Simpan angkatan': 'Save cohort',
  'Simpan fakultas': 'Save faculty',
  'Simpan mahasiswa': 'Save student',
  'Simpan perubahan': 'Save changes',
  'Simpan program studi': 'Save study programme',
  'Tahun masuk': 'Intake year',
  'Tambah angkatan': 'Add cohort',
  'Tambah dan ubah angkatan, fakultas, program studi, dan data mahasiswa. Setiap perubahan tercatat di Log Aktivitas beserta alasannya.': 'Add and edit cohorts, faculties, study programmes, and student data. Every change is recorded in the Activity Log with its reason.',
  'Tambah fakultas': 'Add faculty',
  'Tambah program studi': 'Add study programme',
  'Tidak ada mahasiswa yang cocok.': 'No matching students.',
  'Ubah': 'Edit',
  'Ubah label': 'Edit label',
  'Fakultas & Prodi': 'Faculties & Programmes',
  'Ubah izin data master': 'Change master data permission',
  'Ubah angkatan': 'Edit cohort',
  'Ubah fakultas': 'Edit faculty',
  'Ubah program studi': 'Edit study programme',
  'Menambah dan mengubah angkatan, fakultas, prodi, dan data mahasiswa': 'Add and edit cohorts, faculties, programmes, and student data',

  /* -------- aspek CPMK: tambah, struktur, arsip (admin/KelolaAspek.jsx, Log, Persetujuan) -------- */
  '{n} menjadi belum lengkap': '{n} become incomplete',
  'Area {area}': 'Area {area}',
  'Arsipkan aspek': 'Archive aspect',
  'Aspek {kode} diarsipkan. Nilainya tetap tersimpan dan bisa dipulihkan.': 'Aspect {kode} archived. Its scores stay saved and it can be restored.',
  'Aspek {kode} dipulihkan.': 'Aspect {kode} restored.',
  'Aspek {kode} ditambahkan.': 'Aspect {kode} added.',
  'Aspek baru langsung dihitung untuk angkatan yang belum disahkan, mulai dari semesternya. Komponen lain bisa ditambah sesudahnya di editor penilaian.': 'A new aspect counts right away for cohorts whose scores are not ratified, from its semester on. More components can be added afterwards in the assessment editor.',
  'Aspek diarsipkan': 'Archived aspects',
  'Aspek ini tidak tampil dan tidak dihitung lagi untuk angkatan yang belum disahkan. Komponen dan nilainya tidak dihapus, dan angkatan yang sudah disahkan tetap menghitungnya.': 'This aspect is no longer shown or counted for cohorts whose scores are not ratified. Its components and scores are not deleted, and ratified cohorts still count it.',
  'Aspek juga bisa ditambah, diubah strukturnya, atau diarsipkan di bawah editor; angkatan yang sudah disahkan tetap memakai susunan aspek saat ia disahkan.': 'Aspects can also be added, restructured, or archived below the editor; ratified cohorts keep the aspects they had when their scores were ratified.',
  'Aspek tidak pernah dihapus permanen, supaya nilai dan riwayatnya tetap utuh.': 'Aspects are never deleted permanently, so their scores and history stay intact.',
  'Batal arsipkan': 'Cancel archiving',
  'ID {id} tetap; kode tampilan, semester, dan cluster bisa diubah. Area mengikuti cluster.': 'ID {id} stays fixed; the display code, semester, and cluster can be changed. The area follows the cluster.',
  'Komponen pertama': 'First component',
  'Perubahan aspek oleh admin selalu menunggu persetujuan Super Admin sebelum berlaku.': 'Aspect changes by an admin always wait for Super Admin approval before they apply.',
  'Pulihkan aspek': 'Restore aspect',
  'Semester aspek ini masih menunggu konfirmasi; menyimpannya di sini menetapkannya.': 'This aspect’s semester is still awaiting confirmation; saving it here settles it.',
  'Simpan struktur': 'Save structure',
  'Struktur aspek {kode}': 'Structure of aspect {kode}',
  'Struktur aspek {kode} tersimpan.': 'Structure of aspect {kode} saved.',
  'Tambah aspek': 'Add aspect',
  'Tidak ada nilai mahasiswa yang berubah. Angkatan yang sudah disahkan tidak ikut berubah.': 'No student scores change. Ratified cohorts are not affected.',
  'Tidak tampil dan tidak dihitung, kecuali untuk angkatan yang disahkan sebelum aspeknya diarsipkan.': 'Not shown or counted, except for cohorts ratified before the aspect was archived.',
  'Ubah kode, semester, atau cluster untuk melihat dampaknya.': 'Change the code, semester, or cluster to see the impact.',
  'Kelola aspek CPMK': 'Manage CPMK aspects',
  'Ubah struktur aspek': 'Change aspect structure',

  /* -------- aspek CPMK per semester di Input & Import Nilai (admin/KelolaAspek.jsx › AspekSemester) -------- */
  'Area': 'Area',
  'Aspek CPMK Semester {n}': 'CPMK aspects in Semester {n}',
  'Aspek yang dihapus dari semester ini': 'Aspects removed from this semester',
  'Belum ada aspek di semester ini.': 'No aspects in this semester yet.',
  'Hapus = arsip: aspek tidak tampil dan tidak dihitung, tetapi komponen dan nilainya tetap tersimpan dan bisa dipulihkan. Kode aspek lain tidak berubah.': 'Delete = archive: the aspect is no longer shown or counted, but its components and scores stay saved and can be restored. Other aspect codes do not change.',
  'Tambah, edit, ubah, atau hapus aspek yang dinilai di semester ini. Perubahan Anda dikirim ke Super Admin dan berlaku setelah disetujui.': 'Add, edit, change, or delete the aspects assessed in this semester. Your changes are sent to the Super Admin and apply once approved.',
  'Tambah, edit, ubah, atau hapus aspek yang dinilai di semester ini. Perubahan langsung berlaku; angkatan yang sudah disahkan tidak ikut berubah.': 'Add, edit, change, or delete the aspects assessed in this semester. Changes apply right away; ratified cohorts are not affected.',
  /* Ringkasan pilihan tanda status di Input Manual (TANDA_BARIS di admin/Nilai.jsx, lewat t(ringkas)). */
  'tahan walau sudah lengkap': 'hold even when complete',
  'nilai berhenti berubah': 'score stops changing',
}
