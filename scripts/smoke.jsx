// Paling awal: uji berjalan tanpa server (lihat scripts/modeLokal.js).
import './modeLokal'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import Penyedia from '../app/penyedia'
import { RequireRole, panelPengguna } from '../src/lib/auth'
import { AUDIT_LOG, COHORTS, MASTER_AWAL, PENGAJUAN_KOREKSI, STUDENTS, getStudent, getStudentByNim, isiData, isiMaster, komponenDosen, mahasiswaKelas, resetTranskripCache } from '../src/lib/data'
import { getAspekList, getKomponen, getKomponenById, isiKurikulum } from '../src/lib/curriculum'
import { bobotKomponen } from '../src/lib/scoring'
import { DATA_CONTOH, DOSEN, PERSONA_SEMESTER, getDosenByEmail, getStudentByEmail } from './dataContoh'
import {
  AKUN_LOKAL,
  BATCH_SESI,
  PERMINTAAN,
  PERMINTAAN_SERTIFIKAT,
  bersihkanPerubahan,
  catatCetakSertifikat,
  mintaSertifikat,
  muatAkses,
  permintaanMenunggu,
  putuskanKoreksi,
  putuskanSertifikat,
} from '../src/lib/store'
import { aturJalur, rekamNavigasi } from './palsu-next-navigation'
import { jalurMulus } from '../src/lib/kurva'

import Login from '../src/halaman/Login'
import Profil from '../src/halaman/Profil'
import StudentLayout from '../src/halaman/student/StudentLayout'
import Dashboard from '../src/halaman/student/Dashboard'
import TranskripPage from '../src/halaman/student/TranskripPage'
import Peta from '../src/halaman/student/Peta'
import Riwayat from '../src/halaman/student/Riwayat'
import Sertifikat from '../src/halaman/student/Sertifikat'
import AdminLayout from '../src/halaman/admin/AdminLayout'
import Overview from '../src/halaman/admin/Overview'
import Students from '../src/halaman/admin/Students'
import StudentDetail from '../src/halaman/admin/StudentDetail'
import Programs from '../src/halaman/admin/Programs'
import Nilai from '../src/halaman/admin/Nilai'
import UsulanAdmin from '../src/halaman/admin/Usulan'
import CetakSertifikat from '../src/halaman/admin/CetakSertifikat'
import Angkatan from '../src/halaman/admin/Angkatan'
import Kurikulum from '../src/halaman/admin/Kurikulum'
import PersetujuanAdmin from '../src/halaman/admin/PersetujuanAdmin'
import Log from '../src/halaman/admin/Log'
import DataMaster from '../src/halaman/admin/DataMaster'
import SuperLayout from '../src/halaman/super-admin/SuperLayout'
import Kendali from '../src/halaman/super-admin/Kendali'
import Wewenang from '../src/halaman/super-admin/Wewenang'
import Aturan from '../src/halaman/super-admin/Aturan'
import PenilaianSuper from '../src/halaman/super-admin/Penilaian'
import Akses from '../src/halaman/super-admin/Akses'
import DosenLayout from '../src/halaman/dosen/DosenLayout'
import Pantau from '../src/halaman/dosen/Pantau'
import UnggahDosen from '../src/halaman/dosen/Unggah'

/* Dibuka untuk uji sinkronisasi foto profil. */
export { kunciSesi, simpanProfil } from '../src/lib/profil'
export { BATAS_BARIS_ASPEK } from '../src/halaman/student/Dashboard'

/* --------------------------------------------------------------------------
   Data untuk uji.

   Halaman aplikasi dimulai tanpa data. Hampir seluruh uji di berkas ini
   memeriksa isi — sebaran huruf mutu, alur dosen, transkrip persona — jadi
   data contoh dimuat sejak modul dibuka. Uji keadaan kosong memanggil
   kosongkanData() lebih dulu, lalu pakaiDataContoh() untuk mengembalikannya.
   -------------------------------------------------------------------------- */
export function pakaiDataContoh() {
  isiData(DATA_CONTOH)
  bersihkanPerubahan()
}

export function kosongkanData() {
  isiData()
  bersihkanPerubahan()
}

pakaiDataContoh()

/* Data master seperti yang dipasang app/layout.jsx dari basis data. Uji lain
   memakai isi awal dari kode; pakaiMaster(MASTER_AWAL) mengembalikannya. */
export const pakaiMaster = (master) => isiMaster(master)
export { MASTER_AWAL }

/** Sesi berbentuk sama dengan yang disimpan auth.jsx setelah masuk, untuk sebuah akun contoh. */
export function sesiLogin(email) {
  const m = getStudentByEmail(email)
  if (m) {
    return {
      role: 'student',
      studentId: m.id,
      nim: m.nim,
      email: m.email,
      name: m.name,
      initials: m.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      subtitle: m.program,
      cohort: m.angkatanId,
      semesterAktif: m.semesterAktif,
    }
  }
  const d = getDosenByEmail(email)
  if (d) {
    return {
      role: 'dosen',
      nip: d.nip,
      email: d.email,
      name: d.nama,
      initials: d.inisial,
      subtitle: d.jabatan,
      sumber: d.sumber,
      semester: d.semester,
      prodi: d.prodi,
      fakultas: d.fakultas,
    }
  }
  return null
}

/** Seluruh NIM data contoh — untuk memastikan tidak satu pun bocor ke halaman kosong. */
export const nimContoh = () => DATA_CONTOH.mahasiswa.map((m) => m.nim)

/* --------------------------------------------------------------------------
   Peta rute untuk uji.

   Next menyusun halaman dari berkas: app/mahasiswa/layout.jsx membungkus
   app/mahasiswa/page.jsx, dan seterusnya. Di jsdom tidak ada penyusun itu,
   jadi susunannya ditulis ulang di sini — TERMASUK RequireRole dan layoutnya,
   supaya yang diuji benar-benar sama dengan yang dilihat pengguna, bukan
   halaman telanjang tanpa kerangka.

   Kalau nanti ada rute baru di app/, tambahkan juga di sini.
   -------------------------------------------------------------------------- */
const mahasiswa = (isi) => (
  <RequireRole role="student">
    <StudentLayout>{isi}</StudentLayout>
  </RequireRole>
)

const admin = (isi) => (
  <RequireRole role="admin">
    <AdminLayout>{isi}</AdminLayout>
  </RequireRole>
)

const dosen = (isi) => (
  <RequireRole role="dosen">
    <DosenLayout>{isi}</DosenLayout>
  </RequireRole>
)

const superAdmin = (isi) => (
  <RequireRole role="admin" superAdmin>
    <SuperLayout>{isi}</SuperLayout>
  </RequireRole>
)

const RUTE = {
  '/masuk': { pohon: () => <Login />, params: {} },
  '/mahasiswa': { pohon: () => mahasiswa(<Dashboard />) },
  '/mahasiswa/transkrip': { pohon: () => mahasiswa(<TranskripPage />) },
  '/mahasiswa/peta': { pohon: () => mahasiswa(<Peta />) },
  '/mahasiswa/riwayat': { pohon: () => mahasiswa(<Riwayat />) },
  '/mahasiswa/sertifikat': { pohon: () => mahasiswa(<Sertifikat />) },
  '/mahasiswa/profil': { pohon: () => mahasiswa(<Profil />) },
  '/admin': { pohon: () => admin(<Overview />) },
  '/admin/mahasiswa': { pohon: () => admin(<Students />) },
  '/admin/mahasiswa/DEMO-3': { pohon: () => admin(<StudentDetail />), params: { id: 'DEMO-3' } },
  '/admin/sertifikat': { pohon: () => admin(<CetakSertifikat />) },
  '/admin/angkatan': { pohon: () => admin(<Angkatan />) },
  '/admin/kurikulum': { pohon: () => admin(<Kurikulum />) },
  '/admin/persetujuan': { pohon: () => admin(<PersetujuanAdmin />) },
  '/admin/program-studi': { pohon: () => admin(<Programs />) },
  '/admin/nilai': { pohon: () => admin(<Nilai />) },
  '/admin/profil': { pohon: () => admin(<Profil />) },
  '/admin/usulan': { pohon: () => admin(<UsulanAdmin />) },
  '/admin/log': { pohon: () => admin(<Log />) },
  '/admin/data-master': { pohon: () => admin(<DataMaster />) },
  '/super': { pohon: () => superAdmin(<Kendali />) },
  '/super/persetujuan': { pohon: () => superAdmin(<PersetujuanAdmin />) },
  '/super/penilaian': { pohon: () => superAdmin(<PenilaianSuper />) },
  '/super/akses': { pohon: () => superAdmin(<Akses />) },
  '/super/log': { pohon: () => superAdmin(<Log />) },
  '/super/wewenang': { pohon: () => superAdmin(<Wewenang />) },
  '/super/aturan': { pohon: () => superAdmin(<Aturan />) },
  '/super/profil': { pohon: () => superAdmin(<Profil />) },
  '/dosen': { pohon: () => dosen(<Pantau />) },
  '/dosen/nilai': { pohon: () => dosen(<UnggahDosen />) },
  '/dosen/profil': { pohon: () => dosen(<Profil />) },
}

/* Memasang satu rute lengkap dengan penyedia konteks yang sama persis dengan
   app/layout.jsx — supaya uji tidak pernah memakai susunan provider sendiri
   yang diam-diam berbeda dari aplikasinya. */
async function pasang(rute) {
  /* Query string dilepas saat mencari pohonnya: '/admin/nilai?semester=3&...'
     tetap halaman yang sama, hanya sasarannya berbeda. */
  const entri = RUTE[String(rute).split('?')[0]]
  if (!entri) throw new Error('Rute belum terdaftar di scripts/smoke.jsx: ' + rute)
  aturJalur(rute, entri.params ?? {})

  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(<Penyedia>{entri.pohon()}</Penyedia>)
  })
  await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
  const lepas = () => {
    root.unmount()
    el.remove()
  }
  return { el, lepas }
}

/* Peristiwa penunjuk. jsdom belum punya PointerEvent, jadi dipakai MouseEvent
   yang ditempeli pointerId — React membaca peristiwa aslinya dari nama dan
   propertinya, bukan dari kelas pembungkusnya. */
const tunjuk = async (node, jenis, clientX) => {
  await act(async () => {
    const ev = new window.MouseEvent(jenis, {
      bubbles: true,
      cancelable: true,
      clientX,
      button: 0,
    })
    ev.pointerId = 1
    node?.dispatchEvent(ev)
  })
}

/* detail 0 meniru klik dari papan ketik atau .click() dari kode; 1 atau lebih
   meniru klik dari tetikus. Pemilih bahasa membedakan keduanya. */
const klik = async (node, detail = 0) => {
  await act(async () => {
    node?.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true, detail }),
    )
  })
}

export async function render(rute) {
  const { el, lepas } = await pasang(rute)
  const html = el.innerHTML
  lepas()
  return html
}

/**
 * Menguji perilaku menu di layar kecil dengan benar-benar menekannya.
 *
 * Memeriksa markup saja tidak cukup: laci yang selalu ada di DOM, atau tombol
 * yang tidak tersambung ke apa pun, tetap akan lolos. Yang diperiksa di sini
 * adalah perubahan keadaan sesudah klik.
 */
export async function ujiMenuHp(rute) {
  const { el, lepas } = await pasang(rute)
  const cariLaci = () => el.querySelector('[role="dialog"][aria-label="Menu navigasi"]')

  const hasil = {}
  const hamburger = el.querySelector('[aria-label="Buka menu navigasi"]')
  hasil.adaHamburger = !!hamburger
  hasil.laciTertutupAwal = !cariLaci()

  await klik(hamburger)
  const laci = cariLaci()
  hasil.laciTerbuka = !!laci
  hasil.tautanDiLaci = laci ? laci.querySelectorAll('a').length : 0
  hasil.gulirTerkunci = document.body.style.overflow === 'hidden'

  await klik(laci?.querySelector('a'))
  hasil.laciTertutupSetelahPilih = !cariLaci()
  hasil.gulirPulih = document.body.style.overflow !== 'hidden'

  lepas()
  return hasil
}

/** Bilah bawah panel dosen di ponsel: selalu ada di DOM (disembunyikan CSS di layar lebar), berlabel teks, dan
    menandai halaman yang terbuka dengan aria-current. */
export async function ujiBilahBawah(rute) {
  const { el, lepas } = await pasang(rute)
  const nav = el.querySelector('nav.bilah-bawah')
  const tautan = nav ? [...nav.querySelectorAll('a')] : []
  const hasil = {
    adaHamburger: Boolean(el.querySelector('[aria-label="Buka menu navigasi"]')),
    ada: Boolean(nav),
    tautan: tautan.map((a) => a.textContent.trim()),
    aktif: tautan.find((a) => a.getAttribute('aria-current') === 'page')?.textContent.trim() ?? null,
  }
  lepas()
  return hasil
}

/**
 * Tab penyaring dan baris aspek yang bisa dibuka di dashboard mahasiswa.
 * Angka di tab harus sama dengan jumlah baris yang benar-benar tampil, dan
 * rincian komponen hanya ada di DOM setelah barisnya diketuk.
 */
export async function ujiAspek(rute) {
  const { el, lepas } = await pasang(rute)
  const tab = (nama) => [...el.querySelectorAll('[role="tab"]')].find((t) => t.textContent.startsWith(nama))
  const angka = (t) => Number(t.textContent.replace(/\D+/g, ''))
  const baris = () => [...el.querySelectorAll('button[aria-controls^="rinci-"]')]

  const hasil = { tabSesuai: {} }
  for (const nama of ['Semua', 'Final', 'Berjalan', 'Belum dibuka']) {
    const t = tab(nama)
    await klik(t)
    const tautan = [...el.querySelectorAll('a[href="/mahasiswa/transkrip"]')].map((a) => a.textContent)
    hasil.tabSesuai[nama] = {
      tertulis: angka(t),
      tampil: baris().length,
      terpilih: t.getAttribute('aria-selected') === 'true',
      tautan,
    }
  }

  await klik(tab('Semua'))
  const pertama = baris()[0]
  const idRinci = pertama?.getAttribute('aria-controls')
  hasil.rinciTertutupAwal = !el.querySelector('#' + idRinci)
  await klik(pertama)
  hasil.rinciTerbuka = !!el.querySelector('#' + idRinci) && pertama.getAttribute('aria-expanded') === 'true'
  await klik(pertama)
  hasil.rinciTertutupLagi = !el.querySelector('#' + idRinci)

  lepas()
  return hasil
}

/**
 * Dua penghemat gulir di ponsel: ubin ringkasan yang dilipat, dan lonceng
 * "Belum dinilai" yang menggantikan kartu di badan halaman.
 */
export async function ujiRingkasHp(rute) {
  const { el, lepas } = await pasang(rute)
  const hasil = {}

  const wadah = el.querySelector('#ubin-rinci')
  const pelipat = el.querySelector('button[aria-controls="ubin-rinci"]')
  hasil.ubinTerlipatAwal = !!wadah && wadah.className.split(' ').includes('hidden')
  /* Sejak nilai akhir dijadikan kartu besar tersendiri, ketiga ubin sisanya
     menumpuk di kolom kanan — bukan lagi melebur ke grid induknya. Yang
     dijaga tetap sama: di layar lebar ketiganya selalu tampil, tidak ikut
     terlipat bersama tombol Rincian milik ponsel. */
  hasil.tetapUtuhDiLayarLebar = !!wadah && wadah.className.split(' ').includes('sm:grid')
  await klik(pelipat)
  hasil.ubinTerbuka = !!wadah && wadah.className.split(' ').includes('grid') && pelipat.getAttribute('aria-expanded') === 'true'
  hasil.nilaiAkhirTetapDiLuar = !!el.querySelector('#ubin-rinci') && !el.querySelector('#ubin-rinci').textContent.includes('Nilai akhir')

  const lonceng = el.querySelector('button[aria-label$="komponen belum dinilai"]')
  hasil.adaLonceng = !!lonceng
  hasil.angkaLonceng = lonceng ? Number(lonceng.getAttribute('aria-label').match(/\d+/)[0]) : 0
  const panel = () => el.querySelector('[role="dialog"][aria-label="Komponen belum dinilai"]')
  hasil.panelTertutupAwal = !panel()
  await klik(lonceng)
  hasil.panelTerbuka = !!panel()
  hasil.itemDiPanel = panel() ? panel().querySelectorAll('li').length : 0
  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  hasil.panelTutupDenganEscape = !panel()

  lepas()
  return hasil
}

/**
 * Road Map: semester berjalan terbuka lebih dulu, hanya satu yang terbuka
 * sekaligus, dan semester terkunci memperlihatkan kegiatannya tanpa angka.
 */
export async function ujiPeta(rute) {
  const { el, lepas } = await pasang(rute)
  const kepala = (n) => el.querySelector('button[aria-controls="semester-' + n + '"]')
  const isi = (n) => el.querySelector('#semester-' + n)
  const terbuka = () => [1, 2, 3].filter((n) => isi(n))

  const hasil = { awal: terbuka() }

  await klik(kepala(1))
  hasil.setelahSem1 = terbuka()
  hasil.sem1 = isi(1)?.textContent ?? ''

  await klik(kepala(3))
  hasil.setelahSem3 = terbuka()
  hasil.sem3 = isi(3)?.textContent ?? ''

  await klik(kepala(3))
  hasil.setelahTutup = terbuka()

  lepas()
  return hasil
}

/**
 * History: tab menyaring dengan benar, kalimat "disetujui" hanya dipakai untuk
 * yang final, dan angka yang ditunggu sama dengan angka di lonceng.
 */
export async function ujiRiwayat(rute) {
  const { el, lepas } = await pasang(rute)
  const tab = (n) => [...el.querySelectorAll('[role="tab"]')].find((t) => t.textContent.startsWith(n))
  const angka = (t) => Number(t.textContent.replace(/\D+/g, ''))
  const kartu = el.querySelector('[role="tablist"]').closest('section')
  const baris = () => [...kartu.querySelectorAll('ul > li')]

  const hasil = { jumlah: {} }
  for (const nama of ['Semua', 'Final', 'Sementara']) hasil.jumlah[nama] = angka(tab(nama))

  await klik(tab('Semua'))
  hasil.barisSemua = baris().length

  await klik(tab('Final'))
  hasil.barisFinal = baris().length
  hasil.finalSelaluDisetujui = baris().every((li) => /disetujui oleh/.test(li.textContent))

  await klik(tab('Sementara'))
  hasil.barisSementara = baris().length
  hasil.sementaraTidakDisetujui = baris().every(
    (li) => /belum final/.test(li.textContent) && !/disetujui oleh/.test(li.textContent),
  )

  const lonceng = el.querySelector('button[aria-label$="komponen belum dinilai"]')
  hasil.lonceng = lonceng ? Number(lonceng.getAttribute('aria-label').match(/\d+/)[0]) : 0
  const m = el.textContent.match(/(\d+) komponen sudah dinilai dan (\d+) masih ditunggu/)
  hasil.kalimat = m ? { dinilai: Number(m[1]), ditunggu: Number(m[2]) } : null
  hasil.adaKoreksi = /Pengajuan koreksi saya/.test(el.textContent)

  lepas()
  return hasil
}

/**
 * Lonceng panel Kemahasiswaan, dari ujung ke ujung.
 *
 * Bukan sekadar "panelnya terbuka": tautan salah satu barisnya diambil, lalu
 * halaman Input Nilai dibuka dengan alamat itu — dan diperiksa apakah
 * sasarannya benar-benar terisi sendiri. Itu janji fiturnya.
 */
export async function ujiLoncengAdmin() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  const lonceng = el.querySelector('button[aria-label$="hal menunggu ditangani"]')
  hasil.adaLonceng = !!lonceng
  hasil.angka = lonceng ? Number(lonceng.getAttribute('aria-label').match(/^\d+/)[0]) : 0
  const panel = () => el.querySelector('[role="dialog"][aria-label="Pekerjaan yang menunggu"]')
  hasil.panelTertutupAwal = !panel()

  await klik(lonceng)
  hasil.panelTerbuka = !!panel()
  const tautan = panel() ? [...panel().querySelectorAll('a')] : []
  hasil.jumlahBaris = tautan.length
  /* Tidak lagi semuanya ke halaman input: baris "Perlu ditinjau" menuju Data
     Mahasiswa dan Angkatan. Yang dijaga: tiap baris menuju SUATU halaman panel
     ini, tidak ada yang menggantung. */
  hasil.semuaPunyaTujuan = tautan.every((a) => a.getAttribute('href').startsWith('/admin/'))
  hasil.adaKoreksi = /Pengajuan koreksi/.test(panel()?.textContent ?? '')
  hasil.adaBelumDinilai = /Belum dinilai/.test(panel()?.textContent ?? '')
  /* Dua baris yang dipindahkan dari kartu "Requires Review". */
  hasil.adaPerluDitinjau = /Perlu ditinjau/.test(panel()?.textContent ?? '')
  hasil.adaAmbang = /belum berhak atas sertifikat/.test(panel()?.textContent ?? '')
  hasil.adaSiapDikunci = /siap disahkan/.test(panel()?.textContent ?? '')

  /* Tiga jenis tautan yang berbeda perlakuan:
     - koreksi  → membuka tab Pengajuan koreksi
     - tunggal  → kelompok yang tinggal satu mahasiswa, NIM-nya ikut dibawa
     - kelompok → sasaran input biasa */
  const semua = tautan.map((a) => a.getAttribute('href'))
  const keInput = semua.filter((h) => h.startsWith('/admin/nilai?'))
  hasil.tautanKoreksi = keInput.find((h) => h.includes('tab=koreksi')) ?? null
  hasil.tautanTunggal = keInput.find((h) => h.includes('cari=') && !h.includes('tab=koreksi')) ?? null
  hasil.tautanKelompok = keInput.find((h) => h.includes('semester=') && !h.includes('cari=') && !h.includes('tab=koreksi')) ?? null

  lepas()
  return hasil
}

/** Membuka halaman Input Nilai pada satu alamat, lalu melaporkan isinya. */
export async function ujiSasaranInput(alamat) {
  const { el, lepas } = await pasang(alamat)
  const teks = el.textContent
  // Semester dan sumber kini tombol pilihan (radio); angkatan dan penyaring masih <select>.
  const pilihan = [
    ...[...el.querySelectorAll('select')].map((x) => x.value),
    ...[...el.querySelectorAll('input[type="radio"]:checked')].map((x) => x.value),
  ]
  const hasil = {
    teks,
    pilihan,
    semesterTerpilih: pilihan.find((v) => /^Semester \d$/.test(v)) ?? null,
    kotakCari: [...el.querySelectorAll('input')].map((x) => x.value).find((v) => /^\d{6,}$/.test(v)) ?? null,
    gerbangMasihTertutup: /Pilih semester terlebih dahulu/.test(teks),
  }
  lepas()
  return hasil
}

/**
 * Menyetujui satu pengajuan koreksi dengan benar-benar menekan tombolnya.
 *
 * Tombol ini pernah rusak diam-diam: penyimpanan berjalan serentak dan
 * mengembalikan boolean, tetapi pemanggilnya masih memakai .catch() seperti
 * pada Promise, sehingga sekali ditekan halaman melempar TypeError. Tidak ada
 * uji yang menangkapnya karena tidak ada yang pernah menekan tombolnya.
 */
/* Pengajuan koreksi dua lapis (rapat 24 Okt 2026): admin Kemahasiswaan meneruskan dengan nilai usulan dan nilainya
   belum berubah; Super Admin lalu menyetujui dari halaman Persetujuan dan nilai itu langsung masuk sebagai batch
   bercara 'koreksi'. */
export async function ujiKeputusanKoreksi(alamat) {
  const lama = window.localStorage.getItem('sk5c.session')
  const sesi = (isi) => window.localStorage.setItem('sk5c.session', JSON.stringify(isi))
  const tombol = (akar, teks) => [...(akar?.querySelectorAll('button') ?? [])].filter((b) => b.textContent.trim() === teks)
  const pesanGalat = (akar) => akar?.querySelector('[role="alert"]')?.textContent ?? ''
  const nilaiKini = (k) => getStudentByNim(k.nim)?.nilai?.[k.aspekId]?.komponen?.[k.komponenId]?.nilai ?? null
  const hasil = { galat: null }

  /* Galat saat menekan tidak boleh ditelan diam-diam — itu justru yang diuji. */
  const asalOnError = window.onerror
  window.onerror = (pesan) => {
    hasil.galat = String(pesan)
    return true
  }

  const SUPER = { role: 'admin', superAdmin: true, email: 'super.admin@umn.ac.id', name: 'Super Admin', initials: 'SA' }
  let superTerbuka = null

  try {
    /* Super Admin sudah membuka tab yang sama sebelum admin meneruskan; kartunya dipantau sampai lapis kedua. */
    sesi(SUPER)
    superTerbuka = await pasang(alamat)

    /* Lapis pertama. Alamat lengkap dari lonceng, bukan sekadar ?tab=koreksi: area kerja halaman ini memang
       tertutup sampai semester dipilih. */
    sesi({ role: 'admin', email: 'a@umn.ac.id', name: 'Y', initials: 'KH' })
    let { el, lepas } = await pasang(alamat)
    const teruskan = tombol(el, 'Teruskan ke Super Admin')
    hasil.adaTombolTeruskan = teruskan.length > 0
    hasil.adminTanpaTombolTerapkan = tombol(el, 'Setujui dan terapkan nilai').length === 0

    const kartuAdmin = teruskan[0]?.closest('li')
    const isian = kartuAdmin?.querySelector('input[id^="nilai-"]')
    const k = PENGAJUAN_KOREKSI.find((x) => 'nilai-' + x.id === isian?.id)
    if (!k) {
      lepas()
      return hasil
    }
    const nilaiAwal = nilaiKini(k)
    const usulan = nilaiAwal === 88 ? 87 : 88

    await ketik(isian, '')
    await klik(teruskan[0])
    hasil.tanpaNilaiDitahan = /0 sampai 100/.test(pesanGalat(kartuAdmin)) && k.status === 'menunggu_admin'

    await ketik(isian, String(usulan))
    await klik(teruskan[0])
    hasil.diteruskan = k.status === 'menunggu_superadmin'
    hasil.lapis1Tercatat = k.nilaiUsulan === usulan && k.lapis1?.oleh === 'Biro Kemahasiswaan'
    hasil.nilaiBelumBerubah = nilaiKini(k) === nilaiAwal
    const kartuSesudah = [...el.querySelectorAll('li')].find((li) => li.textContent.includes(k.alasan))
    hasil.tombolAdminHilang =
      tombol(kartuSesudah, 'Teruskan ke Super Admin').length === 0 &&
      /Menunggu keputusan Super Admin/.test(kartuSesudah?.textContent ?? '')
    hasil.adminTakBisaLapisDua =
      (await putuskanKoreksi(k.id, 'disetujui', { aktor: 'X', nilaiBaru: usulan, superAdmin: false })) === false
    lepas()

    const kartuTerbuka = [...superTerbuka.el.querySelectorAll('li')].find((li) => li.textContent.includes(k.alasan))
    hasil.kartuTerbukaIkutTerisi = kartuTerbuka?.querySelector('#nilai-' + k.id)?.value === String(usulan)
    superTerbuka.lepas()
    superTerbuka = null

    // Lapis kedua, dari halaman Persetujuan super admin.
    sesi(SUPER)
    ;({ el, lepas } = await pasang('/super/persetujuan'))
    const kartuSuper = () => [...el.querySelectorAll('li')].find((li) => li.textContent.includes(k.alasan))
    hasil.usulanTerisi = kartuSuper()?.querySelector('#nilai-' + k.id)?.value === String(usulan)

    await klik(tombol(kartuSuper(), 'Tolak')[0])
    hasil.tolakPendekDitahan = /minimal 10 karakter/.test(pesanGalat(kartuSuper())) && k.status === 'menunggu_superadmin'

    await klik(tombol(kartuSuper(), 'Setujui dan terapkan nilai')[0])
    hasil.disetujui = k.status === 'disetujui' && k.keputusan?.oleh === 'Super Admin'
    hasil.batchKoreksi = BATCH_SESI.find((b) => b.id === k.batchId)?.cara === 'koreksi'
    hasil.nilaiBerubah = nilaiKini(k) === usulan
    hasil.hilangDariDaftar = !kartuSuper()
    lepas()

    ;({ el, lepas } = await pasang(alamat))
    const barisBatch = [...el.querySelectorAll('li')].find((li) => li.querySelector('.font-mono')?.textContent === k.batchId)
    hasil.riwayatBatchMenyebutKoreksi = /pengajuan koreksi/.test(barisBatch?.textContent ?? '')
    lepas()
  } catch (e) {
    hasil.galat = e.message
  } finally {
    superTerbuka?.lepas()
    window.onerror = asalOnError
    if (lama) window.localStorage.setItem('sk5c.session', lama)
  }
  return hasil
}

/** Mengubah nilai sebuah <select> lewat peristiwa yang sama dengan pengguna. */
const pilih = async (el, nilai) => {
  const asli = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
  await act(async () => {
    asli.call(el, nilai)
    el.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
}

/** Mengetik ke sebuah <input> lewat peristiwa yang sama dengan pengguna. */
const ketik = async (el, nilai) => {
  const asli = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    asli.call(el, nilai)
    el.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}

/**
 * Halaman Input Nilai: memilih program studi harus menarik fakultasnya, dan
 * kolom Tanda hanya boleh hidup untuk baris yang benar-benar diisi.
 */
export async function ujiSasaranDanTanda(alamat, prodi, fakultasHarapan) {
  const { el, lepas } = await pasang(alamat)
  const hasil = {}

  const label = (teks) =>
    [...el.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(teks))
  const selectDi = (teks) => label(teks)?.querySelector('select')

  const selProdi = selectDi('Program studi')
  const selFakultas = selectDi('Fakultas')
  hasil.adaKeduaKotak = !!selProdi && !!selFakultas
  hasil.fakultasAwal = selFakultas?.value

  await pilih(selProdi, prodi)
  hasil.fakultasSesudah = selectDi('Fakultas')?.value
  hasil.fakultasIkut = hasil.fakultasSesudah === fakultasHarapan

  /* Identitas mahasiswa: nama saja tidak cukup untuk tahu prodi dan fakultasnya. */
  hasil.barisMenyebutProdi = new RegExp(prodi).test(el.textContent)

  const tombolTanda = () =>
    [...el.querySelectorAll('button')].filter((x) =>
      (x.getAttribute('aria-label') ?? '').startsWith('Tandai status untuk'),
    )
  hasil.adaKolomTanda = tombolTanda().length > 0
  hasil.tandaMatiSebelumDiisi = tombolTanda().every((x) => x.disabled)

  /* Pilihan status global sudah dibuang — status hanya ditentukan per baris. */
  hasil.tanpaPilihanGlobal = !/Status untuk nilai yang Anda simpan nanti|Ikuti aturan sistem/.test(
    el.textContent,
  )

  /* Isi satu sel nilai, lalu tanda pada baris ITU saja yang boleh menyala. */
  const kotakNilai = [...el.querySelectorAll('input[type="number"]')]
  if (kotakNilai.length) {
    await ketik(kotakNilai[0], '88')
    const sesudah = tombolTanda()
    hasil.tandaHidupSetelahDiisi = sesudah[0] && !sesudah[0].disabled
    hasil.tandaLainTetapMati = sesudah.slice(1).every((x) => x.disabled)

    /* Menunya baru muncul setelah pensilnya ditekan, dan isinya tepat dua. */
    hasil.menuTertutupAwal = !/tahan walau sudah lengkap/.test(el.textContent)
    await klik(sesudah[0])
    const menu = sesudah[0].closest('td')
    const pilihan = [...menu.querySelectorAll('button')]
      .map((b) => b.textContent)
      .filter((t) => /Sementara|Final/.test(t))
    hasil.jumlahPilihan = pilihan.length
    hasil.tanpaIkutiPilihan = !/Ikuti pilihan di atas/.test(menu.textContent)

    /* Menu harus MELAYANG, bukan menumpuk di dalam sel: kalau ia kembali
       mengalir di dalam tabel, tinggi barisnya ikut bertambah dan tepi tabel
       yang bisa digulir akan memotongnya. */
    const lapisan = [...menu.querySelectorAll('div')].find((d) => d.style.position === 'fixed')
    hasil.menuMelayang = !!lapisan
    hasil.menuBerkaca = !!lapisan && lapisan.className.split(' ').includes('kaca')
    hasil.menuBeranimasi = !!lapisan && lapisan.className.split(' ').includes('animate-kaca')
    hasil.selRataTengah = menu.className.includes('align-middle')

    const tombolFinal = [...menu.querySelectorAll('button')].find((b) =>
      b.textContent.startsWith('Final'),
    )
    await klik(tombolFinal)
    hasil.terpilihFinal = /Final/.test(tombolTanda()[0].textContent)
    hasil.menuTertutupSesudah = !/kunci, nilai berhenti berubah/.test(el.textContent)
  }

  lepas()
  return hasil
}

/**
 * Penyunting foto profil: dibuka dari foto yang sudah tersimpan, perbesarannya
 * bisa diubah, lalu hasilnya dipakai.
 *
 * Di jsdom tidak ada canvas, jadi potongFoto mengembalikan gambar asalnya —
 * yang diuji di sini alur dan kendalinya, bukan hasil pemotongannya.
 */
export async function ujiPenyuntingFoto(rute) {
  const { el, lepas } = await pasang(rute)
  const hasil = {}

  /* Dicari lewat aria-label, bukan teks yang terlihat: labelnya boleh berubah
     ("Atur posisi" → "Edit") tanpa membuat uji ini palsu gagal. */
  const tombolAtur = el.querySelector('button[aria-label="Edit foto profil"]')
  hasil.adaTombolAtur = !!tombolAtur
  const penyunting = () => el.querySelector('[aria-label="Atur foto"]')
  hasil.tertutupAwal = !penyunting()

  await klik(tombolAtur)
  const buka = penyunting()
  hasil.terbuka = !!buka
  hasil.adaAreaGeser = !!buka?.querySelector('[role="application"]')
  hasil.adaPenggeser = !!buka?.querySelector('input[type="range"]')
  hasil.persenAwal = /100% dari ukuran pas/.test(buka?.textContent ?? '')

  const penggeser = buka?.querySelector('input[type="range"]')
  if (penggeser) {
    const asli = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      asli.call(penggeser, '2')
      penggeser.dispatchEvent(new window.Event('change', { bubbles: true }))
    })
    hasil.persenBerubah = /200% dari ukuran pas/.test(penyunting()?.textContent ?? '')
  }

  const pakai = [...(penyunting()?.querySelectorAll('button') ?? [])].find((b) =>
    b.textContent.includes('Pakai foto ini'),
  )
  await klik(pakai)
  hasil.tertutupSesudah = !penyunting()
  hasil.adaPratinjau = /Siap disimpan/.test(el.textContent)

  lepas()
  return hasil
}

// Penampil foto profil: dibuka dari fotonya atau tombol Lihat, ditutup dengan Esc atau tombol X.
export async function ujiLihatFoto(rute) {
  const { el, lepas } = await pasang(rute)
  const hasil = {}

  const pemicu = [...el.querySelectorAll('button[aria-label="Lihat foto profil"]')]
  hasil.duaPemicu = pemicu.length === 2
  const penampil = () => document.body.querySelector('[role="dialog"][aria-label="Foto profil"]')
  hasil.tertutupAwal = !penampil()

  /* Fokus dipasang dulu: klik buatan di jsdom tidak memindahkan fokus ke tombolnya. */
  pemicu[1]?.focus()
  await klik(pemicu[1])
  const buka = penampil()
  hasil.terbuka = !!buka
  hasil.diBody = buka?.parentElement === document.body
  hasil.fotoTersimpan = buka?.querySelector('img')?.getAttribute('src') === 'data:image/webp;base64,UJIFOTO'
  hasil.fokusDiTutup = document.activeElement?.getAttribute('aria-label') === 'Tutup foto profil'

  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  hasil.tertutupEsc = !penampil()
  hasil.fokusKembali = document.activeElement === pemicu[1]

  await klik(pemicu[0])
  hasil.terbukaDariFoto = !!penampil()
  await klik(penampil()?.querySelector('button[aria-label="Tutup foto profil"]'))
  hasil.tertutupTombol = !penampil()

  lepas()
  return hasil
}

/**
 * Menyegarkan data dari halaman Data Mahasiswa.
 *
 * Halaman ini dulu punya tombol "Segarkan data" sendiri di samping tombol
 * Segarkan di bilah status; keduanya menjalankan segarkanData() yang sama,
 * jadi yang di halaman dibuang. Yang dijaga sekarang: tinggal SATU tombol
 * segarkan, dan menekannya benar-benar memuat ulang (waktu segar di store
 * baru terisi sesudah ditekan), bukan hiasan.
 */
export async function ujiSegarkanData() {
  const { el, lepas } = await pasang('/admin/mahasiswa')
  const { terakhirSegar } = await import('../src/lib/store')
  const hasil = {}

  const tombol = el.querySelector('button[aria-label="Segarkan data sekarang"]')
  hasil.adaTombol = !!tombol
  hasil.satuTombol = [...el.querySelectorAll('button')].filter((b) => /Segarkan/.test(b.textContent)).length === 1
  const sebelum = terakhirSegar()

  await klik(tombol)
  const sesudah = terakhirSegar()
  hasil.termuatUlang = !!sesudah && sesudah !== sebelum

  /* Daftar mahasiswanya harus tetap utuh sesudah disegarkan — memuat ulang
     tidak boleh mengosongkan tabel. */
  hasil.daftarTetapAda = /mahasiswa · rata-rata/.test(el.textContent)

  lepas()
  return hasil
}

/**
 * Laci panel Kemahasiswaan: peta lengkap yang tersembunyi di balik garis tiga.
 *
 * Yang dijaga: garis tiganya tidak disembunyikan pada layar lebar (dulu
 * md:hidden, hanya muncul di ponsel), panelnya bernada gelap, dan tiga halaman
 * yang tidak ada di bilah atas tetap bisa ditemukan dari sini.
 */
export async function ujiLaciAdmin() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  const tombol = el.querySelector('button[aria-label="Buka menu navigasi"]')
  hasil.adaTombol = !!tombol
  // Di layar lebar menu samping yang tampil; garis tiga hanya untuk layar sempit (lihat AdminLayout.jsx).
  hasil.menuSampingDiLayarLebar =
    !!el.querySelector('aside nav[aria-label="Menu Kemahasiswaan"]') && !!tombol && tombol.className.split(' ').includes('lg:hidden')

  await klik(tombol)
  const panel = el.querySelector('[role="dialog"][aria-label="Menu navigasi"]')
  hasil.terbuka = !!panel
  hasil.panelTerang = !!panel && !/bg-brand-deep|kartu-aurora/.test(panel.className)

  const teks = panel?.textContent ?? ''
  hasil.adaJudulKelompok = /Kerja harian/.test(teks) && /Rujukan/.test(teks)

  const tujuan = panel ? [...panel.querySelectorAll('a')].map((a) => a.getAttribute('href')) : []
  hasil.adaHalamanTersembunyi = ['/admin/kurikulum', '/admin/program-studi', '/admin/log', '/admin/sertifikat'].every((h) =>
    tujuan.includes(h),
  )
  hasil.adaPenandaAktif = !!panel?.querySelector('[aria-current="page"]')

  lepas()
  return hasil
}

/**
 * Penanda "Terakhir diperbarui" di panel Kemahasiswaan.
 *
 * Yang dijaga bukan sekadar teksnya muncul, melainkan bahwa ia MENGIKUTI data:
 * begitu ada perubahan, jam yang tertulis ikut bergeser. Penanda yang diam
 * saat datanya berubah justru berbahaya — ia meyakinkan pembacanya bahwa yang
 * di layar sudah mutakhir padahal belum.
 */
export async function ujiStatusData() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  const baris = () => {
    const t = el.textContent
    const m = t.match(/Terakhir diperbarui [^·]+/)
    return m ? m[0].trim() : null
  }

  hasil.adaPenanda = !!baris()
  hasil.adaZona = /WIB/.test(el.textContent)
  hasil.adaRelatif = /baru saja|menit lalu|jam lalu/.test(el.textContent)
  hasil.adaTombolSegarkan = !!el.querySelector('button[aria-label="Segarkan data sekarang"]')

  /* Ubah data lewat jalur yang sebenarnya — menyimpan satu nilai — lalu
     pastikan penandanya bergeser. Jangan bergantung pada adanya pengajuan
     koreksi yang menunggu: uji sebelumnya mungkin sudah memutuskan semuanya. */
  const { terakhirDiperbarui, simpanBatch } = await import('../src/lib/store')
  const { getAspekSemester, getKomponen } = await import('../src/lib/curriculum')

  const sebelum = terakhirDiperbarui().getTime()
  await act(async () => {
    await new Promise((r) => setTimeout(r, 5))
  })

  const mhs = STUDENTS.find((m) => m.semesterAktif >= 1)
  const aspek = getAspekSemester(1)[0]
  const komponen = getKomponen(aspek.id)[0]
  await act(async () => {
    simpanBatch({
      sumber: komponen.sumber,
      semester: 1,
      angkatanId: mhs.angkatanId,
      aktor: 'Uji',
      cara: 'manual',
      entri: [{ nim: mhs.nim, komponenId: komponen.id, nilai: 81 }],
    })
  })

  hasil.bergeserSaatDataBerubah = terakhirDiperbarui().getTime() > sebelum

  lepas()
  return hasil
}

/**
 * Dua bagian Ringkasan yang dilipat di ponsel.
 *
 * Yang dijaga: keduanya terlipat saat dibuka di layar kecil, membentang setelah
 * ditekan, DAN tetap membawa kelas sm: — tanpa itu, melipatnya akan ikut
 * terbawa ke layar lebar dan justru menambah satu ketukan di sana.
 */
export async function ujiLipatOverview() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  /* ---------------------------- angka utama ------------------------------ */
  /* Kartu pertama selalu terlihat; dua sisanya dilipat di baliknya, persis
     pola kartu "Nilai akhir" di panel mahasiswa. */
  const kakiAngka = el.querySelector('button[aria-controls="angka-lain"]')
  const wadahAngka = () => el.querySelector('#angka-lain')

  hasil.angka = {
    adaKaki: !!kakiAngka,
    kakiKhususPonsel: !!kakiAngka && kakiAngka.className.split(' ').includes('sm:hidden'),
    ringkasTertulis: !!kakiAngka && /rata-rata/.test(kakiAngka.textContent),
    kartuPertamaTetapTampil: /Mahasiswa terpantau/.test(el.textContent),
    terlipatAwal: !!wadahAngka() && wadahAngka().className.split(' ').includes('hidden'),
    tetapUtuhDiLayarLebar: !!wadahAngka() && wadahAngka().className.includes('sm:contents'),
  }
  await klik(kakiAngka)
  hasil.angka.terbukaSetelahDitekan = wadahAngka()?.className.split(' ').includes('grid') ?? false

  /* Kartu "Halaman lain" beserta lipatannya di ponsel sudah dilepas: semua halaman ada di menu samping
     (laci di ponsel), jadi yang diuji tinggal lipatan angka di atas. */

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Ketahanan pencarian kamus.

   Yang dijaga di sini satu hal: kunci terjemahan tidak boleh putus hanya
   karena kalimatnya ditata ulang. Kalimat panjang di JSX ditulis memanjang
   beberapa baris dengan indentasi, dan satu kali penataan oleh penyunting kode
   mengubah spasinya tanpa mengubah satu huruf pun di layar. Sebelum ada
   perapian ini, kalimat seperti itu diam-diam kembali ke bahasa Indonesia
   padahal terjemahannya ada.
   -------------------------------------------------------------------------- */
export async function ujiKamus() {
  const { terjemah } = await import('../src/lib/bahasa')
  const { EN } = await import('../src/lib/teks')

  const satuBaris = 'Nilai akhir'
  /* Persis bentuk yang dihasilkan JSX ketika kalimatnya ditata ulang menjadi
     beberapa baris berindentasi. */
  const banyakBaris = `
            Nilai
            akhir
          `

  return {
    menerjemahkan: terjemah('en', satuBaris) === 'Final score',
    tahanTataUlang: terjemah('en', banyakBaris) === 'Final score',
    indonesiaUtuh: terjemah('id', satuBaris) === satuBaris,
    penandaTerisi:
      terjemah('en', 'Semester {n} dari {total}', { n: 2, total: 3 }) === 'Semester 2 of 3',
    /* Nilai kosong berarti BELUM diterjemahkan, bukan "terjemahannya kosong".
       Perintah bahasa:sync menulis kunci baru dengan nilai kosong. */
    kosongJatuhKeIndonesia: terjemah('en', 'Kalimat karangan yang tidak ada di kamus') ===
      'Kalimat karangan yang tidak ada di kamus',
    kamusTidakKosong: Object.keys(EN).length > 400,
  }
}

/* --------------------------------------------------------------------------
   Status aspek harus TEKS, bukan pil berwarna.

   Aturan lama menyatakan warna status selalu ditemani ikon dan tulisan, dan
   aturan itu memang dipatuhi. Yang luput: ketika hampir setiap baris punya
   lencana berwarna, warnanya berhenti menandai apa pun dan justru menutupi
   angka nilainya. Uji ini menjaga keputusan itu tidak pelan-pelan kembali.

   Sekalian dijaga: grafik tidak ikut tercetak. Transkrip yang dicetak adalah
   dokumen resmi berisi angka, bukan laporan analitik.
   -------------------------------------------------------------------------- */
const KATA_STATUS = ['Final', 'Sementara', 'Belum dinilai', 'Menunggu nilai', 'Belum dibuka']

/* Kelas yang menandakan sebuah unsur memakai warna status. */
const BERWARNA = /--good|--warning|--critical|--serious/

/* Grafik dikeluarkan dari pemeriksaan. Gembok di dalam AspectBars adalah
   keterangan legenda, bukan status satu baris nilai — dan grafiknya sendiri
   sudah tidak ikut tercetak. Tanpa pengecualian ini, ujinya menuduh tempat
   yang salah. */
function bagianGrafik(el) {
  return [...el.querySelectorAll('section')].filter((n) =>
    /Profil enam cluster|Nilai per aspek CPMK/.test(n.textContent),
  )
}

function penandaStatus(el) {
  const grafik = bagianGrafik(el)
  return [...el.querySelectorAll('span')].filter(
    (n) =>
      KATA_STATUS.includes(n.textContent.trim()) && !grafik.some((g) => g.contains(n)),
  )
}

/* Grafik ringkas di kartu nilai akhir.

   Diuji per persona karena bentuk datanya berbeda tajam, dan ketiganya harus
   benar: DEMO-1 baru punya satu semester bernilai, DEMO-2 punya dua yang
   nilainya sama persis, DEMO-3 punya tiga yang menanjak.

   Tiga hal yang paling perlu dijaga di sini, karena ketiganya rusak tanpa
   terlihat rusak:
     - semester terkunci tidak pernah ikut digambar (R2);
     - jendela sumbu Y tidak pernah lebih sempit daripada batasnya, karena
       sumbu sempit adalah cara termudah membuat selisih satu angka tampak
       seperti lompatan besar;
     - kurvanya tidak pernah melampaui rentang datanya sendiri. Kurva mulus
       biasa akan menyentuh 83 di antara 82 dan 82, dan angka itu tidak pernah
       ada. Di sinilah lampauan itu diperiksa langsung dari koordinat jalurnya,
       bukan dipercayai begitu saja. */

/* Setiap bilangan genap-indeks di atribut d adalah x, ganjil-indeks adalah y --
   berlaku untuk M, L, maupun C, karena ketiganya hanya berisi pasangan
   koordinat. */
function koordinatY(d) {
  const angka = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  return angka.filter((_, i) => i % 2 === 1)
}

/* Jaminan anti-lampauan, diuji langsung pada fungsinya.

   Ini tidak bisa diuji lewat halaman: ketiga persona demo nilainya kebetulan
   menanjak terus, dan pada deret menanjak spline biasa pun tidak melampaui.
   Yang membedakan Fritsch-Carlson dari Catmull-Rom justru deret yang berbalik
   arah -- 86, 85, 86 atau 65, 65, 62 -- jadi deret itulah yang dipakai di sini.

   Kurva bezier kubik selalu termuat di dalam cangkang cembung keempat titik
   kendalinya, jadi memeriksa ordinat keempatnya sudah cukup membuktikan
   seluruh kurvanya tidak pernah keluar dari rentang data. */
export function ujiKurva() {
  const bangun = (nilai) => nilai.map((y, i) => ({ x: i * 40, y }))

  const periksa = (nilai) => {
    const d = jalurMulus(bangun(nilai))
    const angka = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    const y = angka.filter((_, i) => i % 2 === 1)
    return {
      d,
      y,
      /* Tiap titik kendali harus berada di dalam rentang dua titik data yang
         mengapitnya. Dilonggarkan 0,01 untuk sisa pembulatan dua desimal. */
      aman: y.every((v) => v >= Math.min(...nilai) - 0.01 && v <= Math.max(...nilai) + 0.01),
      ruas: (d.match(/[CL]/g) ?? []).length,
    }
  }

  const puncak = periksa([86, 85, 86])
  const lembah = periksa([65, 65, 62])
  const tajam = periksa([40, 95, 42])
  const naik = periksa([80, 81, 82])
  const dua = periksa([85, 85])

  return {
    /* Deret yang berbalik arah: inilah yang dilanggar spline biasa. */
    puncakAman: puncak.aman,
    lembahAman: lembah.aman,
    /* Lonjakan ekstrem, tempat pembatas kemiringannya paling bekerja keras. */
    tajamAman: tajam.aman,
    naikAman: naik.aman,
    /* Di titik balik kemiringannya dipaksa nol, jadi kurvanya MENDATAR di sana
       alih-alih menyeberang. Buktinya: titik kendali di kedua sisi lembah 85
       harus persis setinggi 85 juga. Urutan ordinat pada dua ruas bezier
       adalah [awal, kendali1, kendali2, ujung, kendali1, kendali2, ujung],
       jadi yang mengapit ujung ruas pertama ada di indeks 2 dan 4. */
    balikMendatar: puncak.y[2] === 85 && puncak.y[4] === 85,
    ruasBenar: puncak.ruas === 2 && dua.ruas === 1,
    /* Dua titik ditarik lurus, tidak perlu bezier. */
    duaTitikLurus: dua.d.includes('L') && !dua.d.includes('C'),
    /* Nilai yang tidak berubah harus tergambar benar-benar datar. Dulu ini
       terjaga lewat persona DEMO-2, sampai nilainya diubah supaya trennya
       menanjak; sejak itu tidak ada satu pun persona yang datar, jadi
       jaminannya dipindahkan ke sini. */
    tetapTergambarDatar: dua.y.length > 0 && dua.y.every((v) => v === 85),
    /* Kurang dari dua titik bukan garis apa pun. */
    satuTitikKosong: jalurMulus([{ x: 0, y: 5 }]) === '' && jalurMulus([]) === '',
  }
}

// Yang paling dijaga: tinggi tiap batang sebanding nilainya dari nol, diukur dari piksel.
const TINGGI_BATANG = 220

function bacaGrafik(bingkai) {
  const batang = [...bingkai.querySelectorAll('span')].filter((n) => n.className.includes('rounded-t-[4px]'))
  const pemicu = bingkai.querySelector('button[aria-haspopup="listbox"]')
  const daftar = bingkai.querySelector('[role="listbox"]')
  return {
    batang: batang.map((b) => ({
      tinggi: parseFloat(b.style.height),
      latar: b.style.background,
      kelas: b.className,
      label: b.previousElementSibling?.textContent ?? '',
      adaTitle: b.hasAttribute('title'),
      labelKelas: b.previousElementSibling?.className ?? '',
    })),
    pemicu,
    teksPemicu: pemicu?.textContent ?? '',
    terbuka: pemicu?.getAttribute('aria-expanded') === 'true',
    daftar,
    opsi: daftar ? [...daftar.querySelectorAll('[role="option"]')] : [],
    labelSumbu: [...bingkai.querySelectorAll('span.tabular-nums')].map((n) => n.textContent),
    ambang: [...bingkai.querySelectorAll('span')].filter((n) => n.className.includes('border-dashed')),
    kalimatBatang: [...bingkai.querySelectorAll('[role="listitem"]')].map((n) => n.getAttribute('aria-label')),
    teks: bingkai.textContent,
  }
}

const tekan = (node, key) =>
  act(async () => {
    node.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
// Menunggu animasi tutup dan pengaman waktunya (180ms) selesai.
const tungguTutup = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 220))
  })

export async function ujiPerkembangan() {
  const { el, lepas } = await pasang('/admin')

  const bingkai = [...el.querySelectorAll('section')].find((n) =>
    /Perkembangan nilai per semester/.test(n.textContent),
  )
  if (!bingkai) {
    lepas()
    return { ada: false }
  }

  const awal = bacaGrafik(bingkai)

  const kolom = () => [...bingkai.querySelectorAll('[role="listitem"]')]
  const tip = () => bingkai.querySelector('.animate-tip')
  const jedaTip = () =>
    act(async () => {
      await new Promise((r) => setTimeout(r, 220))
    })

  await tunjuk(kolom()[1], 'pointerover')
  const tipDua = tip()
  const isiTipDua = tipDua?.textContent ?? ''
  const batangDuaMenyala = [...kolom()[1].querySelectorAll('span')]
    .find((n) => n.className.includes('rounded-t-[4px]'))
    ?.className.includes('brightness-110')
  const tipTersembunyiDariSR = tipDua?.getAttribute('aria-hidden') === 'true'
  // Tetikus pindah dari kolom ke tooltip sebelum jedanya habis: tooltip tidak boleh lenyap.
  await tunjuk(kolom()[1], 'pointerout')
  await tunjuk(tipDua, 'pointerover')
  await jedaTip()
  const tetapSaatDiTip = !!tip()
  await tunjuk(tipDua, 'pointerout')
  await jedaTip()
  const hilangSetelahLepas = !tip()

  await act(async () => {
    kolom()[0].focus()
  })
  const isiTipSatu = tip()?.textContent ?? ''
  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  const escapeMenyembunyikan = !tip() && document.activeElement === kolom()[0]
  await act(async () => {
    kolom()[0].blur()
  })

  await klik(awal.pemicu, 1)
  const buka = bacaGrafik(bingkai)
  const opsiTerpilih = buka.opsi.find((o) => o.getAttribute('aria-selected') === 'true')
  const fokusAwal = document.activeElement === opsiTerpilih && opsiTerpilih.textContent.startsWith('Semester 3')
  // Dibaca sekarang: elemennya hidup, dan di akhir uji panelnya sudah ditutup lagi.
  const bukaKlik =
    buka.terbuka &&
    buka.opsi.length === 3 &&
    buka.pemicu.getAttribute('aria-controls') === buka.daftar?.id &&
    buka.daftar.className.includes('animate-kaca')

  await tekan(document.activeElement, 'ArrowUp')
  const fokusNaik = document.activeElement?.textContent.startsWith('Semester 2')
  await tekan(document.activeElement, 'Enter')
  const sesudahEnter = bacaGrafik(bingkai)
  const fokusKembali = document.activeElement === sesudahEnter.pemicu
  const sedangSurut = sesudahEnter.daftar?.className.includes('animate-surut') ?? false
  await tungguTutup()
  const dua = bacaGrafik(bingkai)

  await tekan(dua.pemicu, 'ArrowDown')
  const bukaPapan = bacaGrafik(bingkai)
  const fokusDiTerpilih = document.activeElement?.getAttribute('aria-selected') === 'true'
  await tekan(document.activeElement, 'Home')
  await tekan(document.activeElement, ' ')
  await tungguTutup()
  const satu = bacaGrafik(bingkai)

  await tekan(satu.pemicu, 'ArrowDown')
  await tekan(document.activeElement, 'End')
  await tekan(document.activeElement, 'Escape')
  await tungguTutup()
  const sesudahEscape = bacaGrafik(bingkai)
  const escapeKembali = document.activeElement === sesudahEscape.pemicu

  await klik(sesudahEscape.pemicu, 1)
  await act(async () => {
    document.body.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  })
  await tungguTutup()
  const sesudahLuar = bacaGrafik(bingkai)

  await klik(sesudahLuar.pemicu, 1)
  await klik(bacaGrafik(bingkai).opsi.find((o) => o.textContent.startsWith('Semester 3')), 1)
  await tungguTutup()
  const tiga = bacaGrafik(bingkai)

  const tombolTabel = [...bingkai.querySelectorAll('button')].find((n) => /Tabel/.test(n.textContent))
  await klik(tombolTabel)
  const barisTabel = [...bingkai.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent),
  )
  const kepalaTabel = [...bingkai.querySelectorAll('thead th')].map((n) => n.textContent).join('|')
  await klik(tombolTabel)

  const semua = [...awal.batang, ...dua.batang, ...satu.batang]
  const hasil = {
    ada: true,
    tertutupAwal: awal.teksPemicu === 'Semester 3' && !awal.terbuka && !awal.daftar,
    bukaKlik,
    keteranganOpsi: buka.opsi.map((o) => o.textContent.replace(/^Semester \d/, '')).join('|'),
    fokusKeTerpilih: fokusAwal,
    fokusNaik,
    enterMemilih: sesudahEnter.teksPemicu === 'Semester 2' && !sesudahEnter.terbuka && fokusKembali,
    tutupBeranimasi: sedangSurut && !dua.daftar,
    // Satu batang per semester yang ditampilkan, tidak pernah batang nol untuk semester lain (R2).
    jumlahBatang: [awal.batang.length, dua.batang.length, satu.batang.length, tiga.batang.length].join(','),
    panahBawahMembuka: bukaPapan.terbuka && fokusDiTerpilih,
    homeSpasiMemilih: satu.teksPemicu === 'Semester 1' && /290 mahasiswa/.test(satu.teks) && /belum ada pembanding/.test(satu.teks),
    escapeBatal: sesudahEscape.teksPemicu === 'Semester 1' && !sesudahEscape.daftar && escapeKembali,
    klikLuarMenutup: !sesudahLuar.terbuka && !sesudahLuar.daftar,
    klikOpsi: tiga.teksPemicu === 'Semester 3' && tiga.batang.length === 3,
    penjelasanDua: /219 mahasiswa/.test(dua.teks) && /Naik 3 sejak Semester 1/.test(dua.teks),
    dariNol: semua.every((b) => Math.abs((b.tinggi / TINGGI_BATANG) * 100 - Number(b.label)) < 0.6),
    angkaBatang: awal.batang.map((b) => b.label).join(','),
    rampOrdinal: semua.every((b) => /var\(--semester-\d/.test(b.latar)),
    ujungBulat: semua.every(
      (b) => b.kelas.includes('rounded-t-[4px]') && !b.kelas.split(' ').some((k) => /^rounded(-full|-md|-lg|-xl)?$/.test(k)),
    ),
    angkaWarnaTeks: semua.every((b) => b.labelKelas.includes('text-ink')),
    sumbuNilai: awal.labelSumbu.join(','),
    // Ambang 70 dari tinggi 220: 154px dari garis dasar.
    ambangPutus: awal.ambang.length === 1 && Math.abs(parseFloat(awal.ambang[0].style.bottom) - 154) < 0.01,
    kalimatBatang: awal.kalimatBatang,
    tipMuncul: /Semester 2/.test(isiTipDua) && /80rata-rata/.test(isiTipDua),
    tipPerubahan: /Naik 3 dari Semester 1/.test(isiTipDua),
    tipAmbang: /\d+ dari 148 mahasiswa di atas rata-rata minimal 70/.test(isiTipDua),
    batangDuaMenyala,
    tipTersembunyiDariSR,
    tetapSaatDiTip,
    hilangSetelahLepas,
    tipFokus: /Semester 1/.test(isiTipSatu) && /77rata-rata/.test(isiTipSatu) && !/Naik|Turun|Sama dengan/.test(isiTipSatu),
    escapeMenyembunyikan,
    tanpaTitleBawaan: awal.batang.every((x) => !x.adaTitle),
    penjelasan3: /Naik 5 sejak Semester 1/.test(awal.teks) && /148 mahasiswa/.test(awal.teks) && /angkatan 2024 dan 2025/.test(awal.teks),
    ambangNaik: /84% → 85% → 91%/.test(awal.teks),
    kepalaTabel,
    // Baris per angkatan ditambah satu baris gabungan yang sama dengan batangnya.
    barisTabel: barisTabel.map((r) => r[0]).join(','),
    gabunganSamaDenganBatang:
      barisTabel.at(-1)?.slice(2, 5).join(',') === awal.batang.map((b) => b.label).join(',') &&
      barisTabel.at(-1)?.[1] === '148',
  }

  lepas()
  return hasil
}

// Penanda menu mahasiswa. Luncurannya butuh tata letak sungguhan, jadi yang diuji di sini hanya logikanya.
export async function ujiPenandaMenu() {
  const { el, lepas } = await pasang('/mahasiswa')
  // jsdom tidak mengenal navigasi; tanpa ini klik tautan mencetak galat "not implemented".
  el.addEventListener('click', (e) => e.preventDefault(), true)

  const nav = el.querySelector('aside nav')
  const butir = () => [...nav.querySelectorAll('a[href^="/mahasiswa"]')]
  const bertanda = () => butir().filter((a) => a.classList.contains('menu-aktif')).map((a) => a.getAttribute('href'))
  const sekarang = () => butir().find((a) => a.getAttribute('aria-current') === 'page')?.getAttribute('href')
  const cari = (href) => butir().find((a) => a.getAttribute('href') === href)

  const hasil = {
    jumlahButir: butir().length,
    awalDiHalamanAktif: bertanda().join() === '/mahasiswa',
    semuaBisaDisorot: butir().every((a) => a.classList.contains('menu-sorot')),
    // Sorotan digambar tiap butir sendiri; tidak boleh ada lagi lapisan sorotan yang meluncur.
    tanpaSorotanMeluncur: !nav.querySelector('span[aria-hidden="true"].absolute'),
    isiBeranimasi: !!el.querySelector('main .animate-halaman'),
  }

  await act(async () => {
    cari('/mahasiswa/sertifikat').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
    )
  })
  hasil.pengubahDiam = bertanda().join() === '/mahasiswa'

  await klik(cari('/mahasiswa/riwayat'), 1)
  hasil.pindahSeketika = bertanda().join() === '/mahasiswa/riwayat'
  hasil.ariaTetapJujur = sekarang() === '/mahasiswa'

  lepas()
  return hasil
}

export async function ujiTrenSemester(sem) {
  /* Persona tiap semester dipilih lewat sesinya; halaman tidak lagi membaca ?sem=. */
  const lama = window.localStorage.getItem('sk5c.session')
  window.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'student', email: 'x@student.umn.ac.id', name: 'X', initials: 'X', studentId: PERSONA_SEMESTER[sem] }),
  )
  const { el, lepas } = await pasang('/mahasiswa')

  const judul = el.textContent
  const daftarKolom = el.querySelector('[role="list"][aria-label="Perkembangan nilai"]')
  const grafik = daftarKolom ? daftarKolom.parentElement : null
  const wadah = grafik ? grafik.parentElement.parentElement : null
  const svg = grafik ? grafik.querySelector('svg') : null

  /* Titiknya span HTML mutlak di dalam bidang, bukan <circle>. Dua seri dibedakan dari warnanya (--tren-*) dan
     bentuknya: titik isi untuk nilai tiap semester, cincin untuk rata-rata gabungan (rapat 24 Okt 2026). */
  const semuaTitik = grafik
    ? [...grafik.querySelectorAll('span[style*="left"]')].filter((n) => /rounded-full/.test(n.className))
    : []
  const seriTitik = (warna) => semuaTitik.filter((n) => (n.style.background || n.style.borderColor).includes(warna))
  const titikSemester = seriTitik('tren-semester')
  const titikKumulatif = seriTitik('tren-gabungan')

  const jalur = svg ? [...svg.querySelectorAll('path')] : []
  const d = jalur.map((n) => n.getAttribute('d') ?? '').join(' ')
  const yTop = (n) => parseFloat(String(n.getAttribute('style')).match(/top:\s*([\d.]+)%/)?.[1])

  /* Tiap kurva tidak boleh keluar dari rentang ordinat titik seri-nya sendiri. */
  const takMelampauiSeri = (warna, titik) => {
    const ys = titik.map(yTop).filter(Number.isFinite)
    const milik = jalur.filter((n) => n.getAttribute('stroke').includes(warna))
    return ys.length > 0 && milik.every((n) =>
      koordinatY(n.getAttribute('d') ?? '').every((v) => v >= Math.min(...ys) - 0.01 && v <= Math.max(...ys) + 0.01),
    )
  }

  /* Garis bantu horizontal: <line> tanpa strokeDasharray dan tidak tegak. */
  const garisTegak = () => (svg ? [...svg.querySelectorAll('line')].filter((n) => n.getAttribute('x1') === n.getAttribute('x2')) : [])
  const bantu = svg
    ? [...svg.querySelectorAll('line')].filter((n) => !n.getAttribute('stroke-dasharray') && n.getAttribute('x1') !== n.getAttribute('x2'))
    : []

  const lajurSumbu = grafik ? grafik.previousElementSibling : null
  const sumbu = lajurSumbu
    ? [...lajurSumbu.querySelectorAll('span')].map((n) => Number(n.textContent)).filter((n) => Number.isFinite(n))
    : []

  const barisLabel = grafik ? grafik.parentElement.nextElementSibling : null
  const labelSemester = barisLabel ? [...barisLabel.querySelectorAll(':scope > span')] : []

  const kolom = daftarKolom ? [...daftarKolom.querySelectorAll('[role="listitem"]')] : []
  const tip = () => (wadah ? wadah.querySelector('.animate-tip') : null)
  // Angka besar di kartu nilai akhir: pembanding untuk titik kumulatif terakhir.
  const angkaBesar = Number([...el.querySelectorAll('p')].find((n) => /text-\[56px\]/.test(n.className))?.textContent)

  const hasil = {
    adaTren: /Perkembangan nilai/.test(judul) && Boolean(daftarKolom),
    adaSebaran: /Sebaran nilai aspek/.test(judul),
    legenda: /Nilai tiap semester/.test(wadah?.textContent ?? '') && /Rata-rata/.test(wadah?.textContent ?? ''),
    bentukBeda:
      titikKumulatif.length > 0 &&
      titikKumulatif.every((n) => n.className.includes('bg-surface')) &&
      titikSemester.every((n) => !n.className.includes('bg-surface')),
    catatanGabungan: /Rata-rata: dihitung dari semua aspek sejak Semester 1 sampai semester itu/.test(wadah?.textContent ?? ''),
    // Catatan dan legenda memakai sebutan yang sama (permintaan 26 Okt 2026).
    tanpaSebutanLama: !/Rata-rata gabungan/.test(wadah?.textContent ?? ''),
    jumlahTitikSemester: titikSemester.length,
    jumlahTitikKumulatif: titikKumulatif.length,
    jumlahJalur: jalur.length,
    jumlahRuas: (d.match(/[CL]/g) ?? []).length,
    garisTakTeregang: jalur.every((n) => n.getAttribute('vector-effect') === 'non-scaling-stroke'),
    takTerisi: jalur.every((n) => n.getAttribute('fill') === 'none'),
    takMelampaui: takMelampauiSeri('tren-semester', titikSemester) && takMelampauiSeri('tren-gabungan', titikKumulatif),
    garisBantu: bantu.length,
    labelSecocokGaris: bantu.length > 0 && sumbu.length === bantu.length,
    ringkasTetap: /Tetap sejak Semester/.test(judul),
    ringkasNaik: /Naik \d+ sejak Semester/.test(judul),
    labelSemuaSemester:
      labelSemester.length === 3 && ['Semester 1', 'Semester 2', 'Semester 3'].every((s) => labelSemester.some((n) => n.textContent === s)),
    // Semester terkunci bergembok, tidak diredupkan (redup menjatuhkan kontrasnya).
    gembokTerkunci: labelSemester.filter((n) => n.querySelector('svg')).length,
    tanpaRedup: labelSemester.every((n) => !/opacity-|text-ink-3/.test(n.className)),
    sumbuTertulis: sumbu.length > 0,
    lebarJendela: sumbu.length >= 2 ? Math.max(...sumbu) - Math.min(...sumbu) : null,
    sumbuBulat: sumbu.every((v) => Number.isInteger(v)),
    // Hanya semester bernilai yang bisa dipilih.
    jumlahKolom: kolom.length,
    tanpaTipAwal: !tip() && garisTegak().length === 0,
  }

  if (kolom.length) {
    const terakhir = kolom[kolom.length - 1]
    hasil.kalimatKolom = terakhir.getAttribute('aria-label')

    await act(async () => {
      terakhir.focus()
    })
    const isi = tip()?.textContent ?? ''
    hasil.isiTip = isi
    hasil.garisTegak = garisTegak().length
    // Titik terpilih membesar tanpa berganti bentuk, supaya isi dan cincin tetap membedakan kedua seri.
    hasil.titikTerpilihBesar = semuaTitik.filter((n) => /h-\[11px\]|h-5/.test(n.className)).length
    hasil.labelTerpilihTebal = labelSemester.some((n) => n.className.includes('font-bold'))
    // Rata-rata gabungan di semester terakhir harus sama persis dengan angka besar.
    const m = isi.match(/Rata-rata:(\d+)/)
    hasil.kumulatifSamaAngkaBesar = m ? Number(m[1]) === angkaBesar : false
    hasil.tipTersembunyiDariSR = tip()?.getAttribute('aria-hidden') === 'true'

    await act(async () => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    hasil.escapeMenyembunyikan = !tip() && document.activeElement === terakhir
    await act(async () => {
      terakhir.blur()
    })

    await tunjuk(kolom[0], 'pointerover')
    hasil.tunjukMenampilkan = /Semester:1/.test(tip()?.textContent ?? '')
    await tunjuk(kolom[0], 'pointerout')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 220))
    })
    hasil.lepasMenyembunyikan = !tip()
  }

  lepas()
  if (lama) window.localStorage.setItem('sk5c.session', lama)
  return hasil
}

export async function ujiStatusPolos(rute) {
  const { el, lepas } = await pasang(rute)
  const penanda = penandaStatus(el)

  const hasil = {
    adaPenanda: penanda.length > 0,
    /* Tidak satu pun boleh memakai warna status... */
    tanpaWarna: penanda.every((n) => !BERWARNA.test(n.className)),
    /* ...maupun mewarisi warnanya dari pembungkus terdekat. */
    pembungkusTanpaWarna: penanda.every(
      (n) => !BERWARNA.test(n.parentElement?.className ?? ''),
    ),
    /* Tanpa ikon: "hanya teks saja". */
    tanpaIkon: penanda.every((n) => !n.querySelector('svg')),
    /* Kata statusnya tetap terbaca — menghapus warna tidak boleh ikut
       menghapus keterangannya. */
    tetapTerbaca: /Final/.test(el.textContent) || /Sementara/.test(el.textContent),
  }

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Penanda skema draft: teks merah berkurung, TANPA pil.

   Kebalikan dari status. Status muncul di hampir setiap baris sehingga
   warnanya berhenti menandai apa pun; penanda ini jarang, dan yang jarang
   boleh berwarna. Yang dijaga: warnanya dipakai pada TULISANNYA, bukan sebagai
   isian pil, dan warnanya merah — bukan kuning yang hanya 1,83:1 di atas kartu
   putih.

   Kini semua komponen resmi, jadi gayanya diuji dengan menjadikan satu
   komponen draft untuk sementara (komponenDraft).
   -------------------------------------------------------------------------- */
export async function ujiTandaDraft(rute, komponenDraft = null) {
  const komponen = komponenDraft ? getKomponenById(komponenDraft) : null
  const statusAsli = komponen?.status
  if (komponen) komponen.status = 'draft'
  resetTranskripCache()

  try {
    const { el, lepas } = await pasang(rute)

    const tanda = [...el.querySelectorAll('span')].filter((n) =>
      /^\((Draft|Skema belum final)\)$/.test(n.textContent.trim()),
    )

    const hasil = {
      ada: tanda.length > 0,
      berkurung: tanda.every((n) => n.textContent.trim().startsWith('(')),
      merah: tanda.every((n) => n.className.includes('--critical')),
      /* Tidak boleh ada isian pil: kelas latar berwarna apa pun. */
      tanpaPil: tanda.every((n) => !/bg-\[|bg-brand-soft|bg-surface-2/.test(n.className)),
      /* Kuning yang gagal ambang tidak boleh kembali. */
      tanpaKuningTakTerbaca: !/text-\[var\(--warning\)\]/.test(el.innerHTML),
    }

    lepas()
    return hasil
  } finally {
    if (komponen) komponen.status = statusAsli
    resetTranskripCache()
  }
}

// Tombol cetak sertifikat: mati selama ada satu syarat pun yang belum terpenuhi.
export async function ujiSertifikat(studentId) {
  const lama = window.localStorage.getItem('sk5c.session')
  if (studentId) {
    window.localStorage.setItem('sk5c.session', JSON.stringify({ role: 'student', email: 'x@student.umn.ac.id', name: 'X', initials: 'X', studentId }))
  }
  const { el, lepas } = await pasang('/mahasiswa/sertifikat')
  const tombol = [...el.querySelectorAll('button')].find((b) => /Cetak sertifikat/.test(b.textContent))
  let dicetak = 0
  const cetakAsli = window.print
  window.print = () => { dicetak++ }
  if (tombol) await klik(tombol, 1)
  window.print = cetakAsli
  const lembar = el.querySelector('.lembar-sertifikat')
  const hasil = {
    adaTombol: Boolean(tombol),
    mati: Boolean(tombol?.disabled),
    dicetak,
    // Disaring ke bagian syarat; menu sidebar juga daftar ul > li.
    jumlahSyarat: [...el.querySelectorAll('section')].find((n) => /Syarat kelayakan/.test(n.textContent))?.querySelectorAll('li').length ?? 0,
    belum: (el.textContent.match(/Belum terpenuhi/g) ?? []).length,
    adaLembar: Boolean(lembar),
    isiLembar: lembar?.textContent ?? '',
  }
  lepas()
  if (lama) window.localStorage.setItem('sk5c.session', lama)
  return hasil
}

// Halaman Cetak Sertifikat di panel admin, dibuka lewat ?cari= seperti dari halaman detail mahasiswa.
export async function ujiSertifikatAdmin(studentId) {
  const lama = window.localStorage.getItem('sk5c.session')
  window.localStorage.setItem('sk5c.session', JSON.stringify({ role: 'admin', email: 'a@umn.ac.id', name: 'Y', initials: 'KH' }))
  const m = getStudent(studentId)
  const { el, lepas } = await pasang('/admin/sertifikat?cari=' + encodeURIComponent(m.nim))
  const baris = [...el.querySelectorAll('tbody tr')]
  const tombol = el.querySelector('button[aria-label="Cetak sertifikat ' + m.name + '"]')
  const sel = tombol?.closest('tr')?.children[5]
  const kotakCari = el.querySelector('input[type="search"]')
  const lembarDiBody = () => [...document.body.children].find((n) => n.classList.contains('lembar-sertifikat'))
  const sebelumKlik = Boolean(document.querySelector('.lembar-sertifikat'))

  let dicetak = 0
  let isiSaatCetak = null
  const cetakAsli = window.print
  window.print = () => {
    dicetak++
    isiSaatCetak = lembarDiBody()?.textContent ?? null
  }
  if (tombol) await klik(tombol, 1)
  window.print = cetakAsli
  const bertahan = Boolean(lembarDiBody())
  await act(async () => {
    window.dispatchEvent(new window.Event('afterprint'))
  })

  const hasil = {
    cariTerisi: kotakCari?.value === m.nim,
    satuBaris: baris.length === 1,
    status: sel?.textContent ?? '',
    alasanTerkait: Boolean(tombol?.getAttribute('aria-describedby') && el.querySelector('#' + tombol.getAttribute('aria-describedby'))),
    adaTombol: Boolean(tombol),
    mati: Boolean(tombol?.disabled),
    sebelumKlik,
    dicetak,
    langsungDiBody: isiSaatCetak != null,
    isiLembar: isiSaatCetak ?? '',
    bertahanSampaiAfterprint: bertahan,
    dilepasSesudahAfterprint: !document.querySelector('.lembar-sertifikat'),
  }
  lepas()
  if (lama) window.localStorage.setItem('sk5c.session', lama)
  else window.localStorage.removeItem('sk5c.session')
  return hasil
}

/* --------------------------------------------------------------------------
   Akses cetak sertifikat dua lapis (rapat 24 Okt 2026). Mahasiswa yang layak
   meminta, admin Kemahasiswaan menolak atau meneruskan, Super Admin membuka
   aksesnya. Sebelum Siap dicetak tidak boleh ada lembar sertifikat di layar.
   Uji cetak mahasiswa dan admin dijalankan di dalamnya, selagi aksesnya
   terbuka; sesudahnya permintaan dan simpanan lokal dikembalikan.
   -------------------------------------------------------------------------- */
export async function ujiAlurSertifikat() {
  const lama = window.localStorage.getItem('sk5c.session')
  const simpananLama = window.localStorage.getItem('sk5c.perubahan')
  const permintaanLama = PERMINTAAN_SERTIFIKAT.slice()
  const sesi = (isi) => window.localStorage.setItem('sk5c.session', JSON.stringify(isi))
  const MAHASISWA = { role: 'student', email: 'x@student.umn.ac.id', name: 'X', initials: 'X', studentId: 'DEMO-LAYAK' }
  const ADMIN = { role: 'admin', email: 'a@umn.ac.id', name: 'Y', initials: 'KH' }
  const SUPER = { role: 'admin', superAdmin: true, email: 'super.admin@umn.ac.id', name: 'Super Admin', initials: 'SA' }
  const tombol = (akar, teks) => [...(akar?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === teks)
  const m = getStudent('DEMO-LAYAK')
  const milik = () => PERMINTAAN_SERTIFIKAT.find((p) => p.nim === m.nim) ?? null
  const jumlahMilik = () => PERMINTAAN_SERTIFIKAT.filter((p) => p.nim === m.nim).length
  const hasil = {}

  try {
    // 1. Layak, belum meminta: hanya tombol minta, belum ada lembar.
    sesi(MAHASISWA)
    let { el, lepas } = await pasang('/mahasiswa/sertifikat')
    hasil.awalBisaMinta = Boolean(tombol(el, 'Minta akses cetak')) && !tombol(el, 'Cetak sertifikat')
    hasil.awalTanpaLembar = !document.querySelector('.lembar-sertifikat')
    await klik(tombol(el, 'Minta akses cetak'))
    hasil.mintaTercatat = milik()?.status === 'menunggu_admin'
    hasil.menungguMati = Boolean(tombol(el, 'Menunggu persetujuan')?.disabled)
    const langkahAktif = el.querySelector('ol[aria-label="Langkah akses cetak"] [aria-current="step"]')
    hasil.langkahPertamaAktif = /Menunggu Admin/.test(langkahAktif?.textContent ?? '')
    hasil.masihTanpaLembar = !document.querySelector('.lembar-sertifikat')
    lepas()
    try {
      await mintaSertifikat({ student: m })
      hasil.gandaDitahan = false
    } catch {
      hasil.gandaDitahan = jumlahMilik() === 1
    }

    // 2. Lapis pertama menolak: tanpa alasan ditahan, dengan alasan tercatat.
    sesi(ADMIN)
    ;({ el, lepas } = await pasang('/admin/sertifikat?tab=permintaan&cari=' + m.nim))
    const tinjau = tombol(el, 'Tinjau')
    hasil.adminAdaTinjau = tinjau?.getAttribute('aria-expanded') === 'false' && el.querySelectorAll('tbody tr').length === 1
    await klik(tinjau)
    hasil.tinjauTerbuka = tinjau?.getAttribute('aria-expanded') === 'true' && Boolean(el.querySelector('#' + tinjau?.getAttribute('aria-controls')))
    await klik(tombol(el, 'Tolak'))
    hasil.tolakTanpaAlasanDitahan =
      /minimal 10 karakter/.test(el.querySelector('[role="alert"]')?.textContent ?? '') && milik()?.status === 'menunggu_admin'
    await ketik(el.querySelector('input[id^="catatan-S-"]'), 'Nilai akhir belum dicek prodi.')
    await klik(tombol(el, 'Tolak'))
    hasil.ditolak = milik()?.status === 'ditolak' && milik()?.ditolak?.catatan === 'Nilai akhir belum dicek prodi.'
    lepas()

    // 3. Mahasiswa membaca alasannya, lalu meminta lagi.
    sesi(MAHASISWA)
    ;({ el, lepas } = await pasang('/mahasiswa/sertifikat'))
    hasil.alasanTampil = el.textContent.includes('Nilai akhir belum dicek prodi.')
    await klik(tombol(el, 'Minta akses cetak lagi'))
    hasil.mintaLagi = milik()?.status === 'menunggu_admin' && jumlahMilik() === 2
    lepas()

    /* 4. Lapis pertama meneruskan; lapis kedua bukan haknya. Jendela lain di tab Semua sudah membuka Tinjau untuk
       permintaan yang sama: barisnya tetap ada di sana, jadi panel keputusannya harus ikut hilang. */
    sesi(ADMIN)
    const jendelaLain = await pasang('/admin/sertifikat?cari=' + m.nim)
    await klik(tombol(jendelaLain.el, 'Tinjau'))
    ;({ el, lepas } = await pasang('/admin/sertifikat?tab=permintaan&cari=' + m.nim))
    await klik(tombol(el, 'Tinjau'))
    await klik(tombol(el, 'Teruskan ke Super Admin'))
    hasil.diteruskan = milik()?.status === 'menunggu_superadmin' && milik()?.lapis1?.oleh === 'Biro Kemahasiswaan'
    hasil.adminTakBisaLapisDua =
      (await putuskanSertifikat(milik().id, 'disetujui', { aktor: 'X', superAdmin: false })) === false
    hasil.panelJendelaLainHilang =
      !tombol(jendelaLain.el, 'Teruskan ke Super Admin') && !jendelaLain.el.querySelector('[id^="tinjau-"]')
    jendelaLain.lepas()
    lepas()

    sesi(MAHASISWA)
    ;({ el, lepas } = await pasang('/mahasiswa/sertifikat'))
    hasil.belumBisaCetak = Boolean(tombol(el, 'Menunggu persetujuan')?.disabled) && !document.querySelector('.lembar-sertifikat')
    lepas()

    // 5. Lapis kedua dari halaman Persetujuan super admin.
    sesi(SUPER)
    ;({ el, lepas } = await pasang('/super/persetujuan'))
    const kartu = () => [...el.querySelectorAll('li')].find((li) => li.textContent.includes(m.nim) && tombol(li, 'Setujui akses cetak'))
    hasil.superMelihat = Boolean(kartu())
    await klik(tombol(kartu(), 'Setujui akses cetak'))
    hasil.siap = milik()?.status === 'siap_dicetak' && milik()?.lapis2?.oleh === 'Super Admin'
    hasil.hilangDariDaftar = !kartu()
    lepas()

    // 6. Langkahnya selesai, lalu uji cetak selagi aksesnya terbuka.
    sesi(MAHASISWA)
    ;({ el, lepas } = await pasang('/mahasiswa/sertifikat'))
    const langkah = el.querySelector('ol[aria-label="Langkah akses cetak"]')
    hasil.langkahSelesai = langkah?.querySelectorAll('li').length === 3 && !langkah.querySelector('[aria-current]')
    // Lembar baru dipasang sesudah tombol Cetak ditekan dan tercatat, jadi Ctrl+P biasa tidak mencetak sertifikat.
    hasil.lembarBelumDipasang = !document.querySelector('.lembar-sertifikat')
    lepas()
    hasil.cetakMahasiswa = await ujiSertifikat('DEMO-LAYAK')
    hasil.cetakAdmin = await ujiSertifikatAdmin('DEMO-LAYAK')
    hasil.jumlahCetak = milik()?.cetak?.jumlah ?? 0

    // 7. Admin mencabut akses yang sudah Siap dicetak: tanpa alasan ditahan, dengan alasan tercatat atas namanya.
    sesi(ADMIN)
    ;({ el, lepas } = await pasang('/admin/sertifikat?cari=' + m.nim))
    const tombolCabut = el.querySelector('button[aria-label="Cabut akses cetak ' + m.name + '"]')
    hasil.adaTombolCabut = Boolean(tombolCabut)
    await klik(tombolCabut)
    const panelCabut = el.querySelector('#' + tombolCabut?.getAttribute('aria-controls'))
    hasil.panelCabutTerbuka = tombolCabut?.getAttribute('aria-expanded') === 'true' && Boolean(panelCabut)
    hasil.jumlahCetakDisebut = /Sudah dibuka untuk dicetak 2 kali/.test(panelCabut?.textContent ?? '')
    await klik(tombol(panelCabut, 'Cabut akses cetak'))
    hasil.cabutTanpaAlasanDitahan =
      /minimal 10 karakter/.test(panelCabut?.querySelector('[role="alert"]')?.textContent ?? '') && milik()?.status === 'siap_dicetak'
    await ketik(panelCabut?.querySelector('input'), 'Ada laporan sikap dari dosen wali.')
    await klik(tombol(panelCabut, 'Cabut akses cetak'))
    hasil.dicabut =
      milik()?.status === 'dicabut' &&
      milik()?.dicabut?.alasan === 'Ada laporan sikap dari dosen wali.' &&
      milik()?.dicabut?.oleh === 'Biro Kemahasiswaan'
    hasil.barisMenyebutDicabut =
      /Dicabut/.test(el.querySelector('tbody')?.textContent ?? '') &&
      Boolean(el.querySelector('button[aria-label="Cetak sertifikat ' + m.name + '"]')?.disabled) &&
      !el.querySelector('button[aria-label="Cabut akses cetak ' + m.name + '"]')
    lepas()

    // 8. Mahasiswa membaca alasannya, tidak bisa mencetak, lalu boleh meminta lagi lewat dua lapis.
    sesi(MAHASISWA)
    ;({ el, lepas } = await pasang('/mahasiswa/sertifikat'))
    hasil.mahasiswaMelihatPencabutan =
      el.textContent.includes('Ada laporan sikap dari dosen wali.') && Boolean(tombol(el, 'Minta akses cetak lagi'))
    hasil.tanpaLembarSesudahDicabut = !document.querySelector('.lembar-sertifikat')
    try {
      await catatCetakSertifikat(milik().id)
      hasil.cetakSesudahDicabutDitolak = false
    } catch {
      hasil.cetakSesudahDicabutDitolak = milik()?.cetak?.jumlah === 2
    }
    await klik(tombol(el, 'Minta akses cetak lagi'))
    hasil.mintaLagiSesudahDicabut = milik()?.status === 'menunggu_admin' && jumlahMilik() === 3
    lepas()
  } catch (e) {
    hasil.galat = e.message
  } finally {
    PERMINTAAN_SERTIFIKAT.splice(0, PERMINTAAN_SERTIFIKAT.length, ...permintaanLama)
    if (simpananLama == null) window.localStorage.removeItem('sk5c.perubahan')
    else window.localStorage.setItem('sk5c.perubahan', simpananLama)
    if (lama) window.localStorage.setItem('sk5c.session', lama)
    else window.localStorage.removeItem('sk5c.session')
  }
  return hasil
}

// Halaman Angkatan: kartu per angkatan, rincian yang perlu ditindaklanjuti, dan alur penguncian.
export async function ujiAngkatan() {
  const lama = window.localStorage.getItem('sk5c.session')
  window.localStorage.setItem('sk5c.session', JSON.stringify({ role: 'admin', email: 'a@umn.ac.id', name: 'Y', initials: 'KH' }))
  const hasil = {}
  const kartu = (el) => [...el.querySelectorAll('main li > button[aria-pressed]')]
  const labelKartu = (b) => b.querySelector('span > span')?.textContent
  const kartuDari = (el, id) => kartu(el).find((b) => labelKartu(b) === COHORTS.find((c) => c.id === id).label)

  let { el, lepas } = await pasang('/admin/angkatan')
  hasil.kartuSesuaiBasisData =
    kartu(el).length === COHORTS.length && COHORTS.every((c, i) => labelKartu(kartu(el)[i]) === c.label)
  hasil.bawaanTerbaru = kartu(el)[0]?.getAttribute('aria-pressed') === 'true'
  hasil.terkunciTertulis = /Disahkan/.test(kartuDari(el, '2024')?.textContent ?? '')

  await klik(kartuDari(el, '2025'))
  const k2025 = kartuDari(el, '2025')
  const rincian = el.querySelector('section[aria-labelledby="judul-rincian-angkatan"]')
  hasil.pilihBerpindah = k2025?.getAttribute('aria-pressed') === 'true' && /^Angkatan 2025$/.test(el.querySelector('#judul-rincian-angkatan')?.textContent ?? '')
  hasil.belumBisaDikunci = /Belum bisa disahkan/.test(rincian?.textContent ?? '') && /baru di Semester 3 dari 3/.test(rincian?.textContent ?? '')
  const diKartu = Number((k2025?.textContent.match(/Perlu tindak lanjut(\d+)/) ?? [])[1])
  const diDaftar = Number((rincian?.textContent.match(/(\d+) dari \d+ mahasiswa/) ?? [])[1])
  hasil.jumlahCocok = diKartu > 0 && diKartu === diDaftar
  const tautan = [...(rincian?.querySelectorAll('table a') ?? [])].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/admin/nilai?'))
  hasil.tautanInputLengkap = tautan.length > 0 && tautan.every((h) => h.includes('angkatan=2025') && h.includes('cari='))
  lepas()

  // Angkatan 2025 dimundurkan setahun supaya programnya selesai dan boleh dikunci.
  isiMaster({
    angkatan: MASTER_AWAL.angkatan.map((a) => (a.id === '2025' ? { ...a, intake: { tahun: '2024/2025', semester: 'Ganjil' } } : a)),
  })
  ;({ el, lepas } = await pasang('/admin/angkatan?angkatan=2025'))
  // Admin biasa: angkatan yang sudah lewat Semester 3 tidak disahkan langsung, tetapi "Ajukan pengesahan" ke super admin.
  const tombolKunci = () =>
    [...el.querySelectorAll('button[type="submit"]')].find((b) => /Sahkan nilai angkatan|Ajukan pengesahan/.test(b.textContent))
  const isian = el.querySelector('form input')
  hasil.pratinjauTampil = /Bila disahkan sekarang, \d+ dari \d+ mahasiswa berhak atas sertifikat/.test(el.textContent)
  hasil.ajukanUntukAdminBiasa =
    /Ajukan pengesahan/.test(tombolKunci()?.textContent ?? '') && /dikirim ke Super Admin sebagai permintaan/.test(el.textContent)
  hasil.matiSebelumDiketik = Boolean(tombolKunci()?.disabled)
  await ketik(isian, '2024')
  hasil.matiBilaSalahKetik = Boolean(tombolKunci()?.disabled)
  await ketik(isian, '2025')
  hasil.hidupBilaCocok = Boolean(tombolKunci()) && !tombolKunci().disabled
  await act(async () => {
    tombolKunci().click()
    await new Promise((r) => setTimeout(r, 0))
  })
  hasil.terkunciSesudahnya =
    /Nilai angkatan 2025 sudah disahkan/.test(el.textContent) && COHORTS.find((c) => c.id === '2025')?.status === 'terkunci'
  hasil.tautanSertifikat = Boolean(el.querySelector('a[href="/admin/sertifikat?angkatan=2025"]'))
  lepas()
  for (const s of STUDENTS) if (s.angkatanId === '2025') s.statusAngkatan = 'aktif'
  isiMaster(MASTER_AWAL)

  ;({ el, lepas } = await pasang('/admin/sertifikat?angkatan=2024'))
  hasil.sertifikatTersaring = el.querySelector('select')?.value === '2024'
  lepas()

  if (lama) window.localStorage.setItem('sk5c.session', lama)
  else window.localStorage.removeItem('sk5c.session')
  return hasil
}

// Penyunting penilaian di Input Manual: teks aspek, komponen, bobot. Tidak menyimpan (mode lokal tidak punya server).
export async function ujiPenilaian() {
  const lama = window.localStorage.getItem('sk5c.session')
  const hasil = {}
  const sesi = (superAdmin) =>
    window.localStorage.setItem(
      'sk5c.session',
      JSON.stringify({ role: 'admin', superAdmin, email: superAdmin ? 'super.admin@umn.ac.id' : 'admin@umn.ac.id', name: 'Y', initials: 'SA' }),
    )
  const tombol = (el, pola) => [...el.querySelectorAll('button')].find((b) => pola.test(b.textContent))

  for (const superAdmin of [true, false]) {
    sesi(superAdmin)
    const { el, lepas } = await pasang('/admin/nilai?semester=1&sumber=MK&angkatan=2025')
    const buka = tombol(el, /Atur penilaian A\.1/)
    if (superAdmin) hasil.adaTombol = Boolean(buka)
    await klik(buka)
    if (superAdmin) {
      hasil.editorTerbuka = /Penilaian A\.1/.test(el.textContent) && /Tambah komponen/.test(el.textContent) && Boolean(el.querySelector('textarea'))
      hasil.belumAdaSimpan = !tombol(el, /Simpan penilaian|Ajukan ke Super Admin/)
    }
    await klik(tombol(el, /Tambah komponen/))
    if (superAdmin) hasil.barisBaruDiperiksa = /nama komponen wajib diisi/.test(el.textContent)
    const isian = [...el.querySelectorAll('input[aria-label="Nama komponen"]')]
    await ketik(isian[isian.length - 1], 'Tugas 3: Refleksi akhir')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    if (superAdmin) {
      hasil.pratinjauBelumLengkap = /menjadi belum lengkap karena ada komponen baru/.test(el.textContent)
      hasil.simpanUntukSuperAdmin = Boolean(tombol(el, /Simpan penilaian/))
    } else {
      hasil.ajukanUntukAdminBiasa = Boolean(tombol(el, /Ajukan ke Super Admin/)) && !tombol(el, /Simpan penilaian/)
    }
    lepas()
  }

  if (lama) window.localStorage.setItem('sk5c.session', lama)
  else window.localStorage.removeItem('sk5c.session')
  return hasil
}

// Super admin memakai panel admin yang sama; yang berbeda label perannya di profil dan menu akun.
export async function ujiSuperAdmin() {
  const lama = window.localStorage.getItem('sk5c.session')
  const hasil = {}
  const sesi = (superAdmin) =>
    window.localStorage.setItem(
      'sk5c.session',
      JSON.stringify(
        superAdmin
          ? { role: 'admin', superAdmin: true, email: 'super.admin@umn.ac.id', name: 'Super Admin', initials: 'SA' }
          : { role: 'admin', email: 'admin@umn.ac.id', name: 'Biro Kemahasiswaan & Humaniora', initials: 'KH' },
      ),
    )
  const lencana = (el) => el.querySelector('main header p span')?.textContent ?? ''

  sesi(true)
  let { el, lepas } = await pasang('/admin/profil')
  hasil.panelAdminTerbuka = !el.textContent.includes('Aplikasi gagal dimuat') && /Profil|Super Admin/.test(el.textContent)
  hasil.lencanaSuperAdmin = lencana(el) === 'Super Admin'
  await klik(el.querySelector('button[aria-label="Menu akun"]'))
  hasil.menuAkunSuperAdmin = [...el.querySelectorAll('p')].some((p) => p.textContent === 'Super Admin' && /rounded-md/.test(p.className))
  lepas()

  sesi(false)
  ;({ el, lepas } = await pasang('/admin/profil'))
  hasil.adminBiasaTetap = lencana(el) === 'Kemahasiswaan'
  lepas()

  if (lama) window.localStorage.setItem('sk5c.session', lama)
  else window.localStorage.removeItem('sk5c.session')
  return hasil
}

// Panel Super Admin: hanya super admin yang masuk, menu sampingnya gelap, dan Log Aktivitas benar-benar menyaring.
export async function ujiPanelSuper() {
  const lama = window.localStorage.getItem('sk5c.session')
  const sesi = (superAdmin) =>
    window.localStorage.setItem(
      'sk5c.session',
      JSON.stringify(
        superAdmin
          ? { role: 'admin', superAdmin: true, email: 'super.admin@umn.ac.id', name: 'Super Admin', initials: 'SA' }
          : { role: 'admin', email: 'admin@umn.ac.id', name: 'Biro Kemahasiswaan & Humaniora', initials: 'KH' },
      ),
    )
  const hasil = {
    arahSuper: panelPengguna({ role: 'admin', superAdmin: true }) === '/super',
    arahAdminBiasa: panelPengguna({ role: 'admin' }) === '/admin',
  }

  sesi(false)
  let { el, lepas } = await pasang('/super')
  hasil.adminBiasaDitolak =
    !/Pusat Kendali/.test(el.textContent) && rekamNavigasi.some((n) => n.cara === 'replace' && n.ke === '/admin')
  lepas()

  sesi(true)
  ;({ el, lepas } = await pasang('/super'))
  const menu = [...el.querySelectorAll('aside nav a')]
  hasil.menuTujuh = menu.length === 7 && menu.every((a) => a.getAttribute('href').startsWith('/super'))
  hasil.urutanTugas = ['/super/persetujuan', '/super/penilaian', '/super/akses'].every(
    (h, i) => menu[i + 1]?.getAttribute('href') === h,
  )
  hasil.menuGelap = menu.every((a) => a.classList.contains('menu-sorot-gelap'))
  hasil.kendaliAktif = Boolean(menu[0]?.classList.contains('menu-aktif'))
  hasil.keKemahasiswaan = Boolean(el.querySelector('aside a[href="/admin"]'))
  hasil.isiKendali = /Pusat Kendali/.test(el.textContent) && /Rantai pengawasan/.test(el.textContent)
  hasil.tanpaServerJujur = /hanya tercatat saat website terhubung ke basis data/.test(el.textContent)
  // Menu samping dikelompokkan: tempat bertindak di atas, halaman yang hanya dibaca di bawah.
  const daftarMenu = [...el.querySelectorAll('aside nav ul')]
  hasil.menuBerkelompok =
    JSON.stringify(daftarMenu.map((ul) => document.getElementById(ul.getAttribute('aria-labelledby') ?? '')?.textContent)) ===
      JSON.stringify(['Utama', 'Pengawasan']) &&
    daftarMenu.map((ul) => ul.querySelectorAll('a').length).join() === '4,3'
  // Lonceng hanya muncul bila ada yang menunggu (README.md › Bahasa visual).
  hasil.tanpaLonceng = permintaanMenunggu().length > 0 || !el.querySelector('header a[href="/super/persetujuan"]')
  lepas()

  // Satu permintaan menunggu dan satu perubahan nilai hari ini, lalu dibuang lagi.
  const hariIni = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const jumlahMenunggu = permintaanMenunggu().length
  PERMINTAAN.push({ id: 'P-UJI', aksi: 'UBAH_BOBOT', status: 'menunggu', alasan: '', diajukanOleh: 'admin@umn.ac.id', diajukanPada: hariIni + ' 08:00' })
  AUDIT_LOG.push({ id: 'A-UJI', waktu: hariIni + ' 08:00', nim: 'UJI-1', aktor: 'uji' })
  ;({ el, lepas } = await pasang('/super'))
  hasil.loncengMenunggu =
    el.querySelector('header a[href="/super/persetujuan"]')?.getAttribute('aria-label') ===
    jumlahMenunggu + 1 + ' permintaan menunggu keputusan'
  hasil.grafikBulanan =
    el.querySelectorAll('main ol[aria-label] > li[tabindex="0"]').length === 6 &&
    /Nilai tersimpan per bulan/.test(el.textContent) &&
    /bukan jumlah pengajuan koreksi/.test(el.textContent)

  // Pemilih periode: daftar dari angkatan tertua sampai periode aktif; periode lain menyaring isi halaman.
  const keping = () => el.querySelector('main button[aria-haspopup="listbox"]')
  const aktifDulu = /Aktif/.test(keping()?.textContent ?? '')
  await klik(keping(), 1)
  const pilihan = [...el.querySelectorAll('[role="listbox"] [role="option"]')]
  const adaPilihan = pilihan.length > 1 && pilihan[0].getAttribute('aria-selected') === 'true'
  const nama = pilihan[1]?.textContent.match(/(Ganjil|Genap) \d{4}\/\d{4}/)?.[0]
  await klik(pilihan[1], 1)
  hasil.pilihPeriode =
    aktifDulu &&
    adaPilihan &&
    Boolean(nama) &&
    !el.querySelector('[role="listbox"]') &&
    keping()?.textContent.includes(nama) &&
    /Saat ini/.test(el.querySelector('#judul-keputusan')?.textContent ?? '') &&
    el.textContent.includes('Diputuskan di ' + nama)
  lepas()
  PERMINTAAN.splice(PERMINTAAN.findIndex((p) => p.id === 'P-UJI'), 1)
  AUDIT_LOG.splice(AUDIT_LOG.findIndex((l) => l.id === 'A-UJI'), 1)

  // Tanpa server, perubahan nilai dibaca dari AUDIT_LOG yang sudah termuat.
  ;({ el, lepas } = await pasang('/super/log'))
  const tunggu = () => act(async () => { await new Promise((r) => setTimeout(r, 30)) })
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => /Perubahan nilai/.test(b.textContent)))
  await tunggu()
  const baris = () => [...el.querySelectorAll('tbody tr')]
  const nimBaris = (tr) => tr.querySelector('td:nth-child(3) span')?.textContent ?? ''
  hasil.logNilaiTerisi = baris().length > 0
  const nim = nimBaris(baris()[0] ?? document.createElement('tr'))
  const isian = el.querySelector('input[type="search"]')
  await ketik(isian, nim)
  await act(async () => {
    isian.form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  })
  await tunggu()
  hasil.saringNim = nim !== '' && baris().length > 0 && baris().every((tr) => nimBaris(tr) === nim)
  lepas()

  // Penilaian & Bobot: kartu aspek memilih editor; draf yang belum disimpan ditanyakan sebelum dibuang.
  const [aspek1, aspek2] = getAspekList().map((a) => a.kode.replace(/\.$/, ''))
  const konfirmasiLama = window.confirm
  ;({ el, lepas } = await pasang('/super/penilaian'))
  const kartuAspek = () => [...el.querySelectorAll('ul > li > button[aria-pressed]')]
  const editorUntuk = (kode) => el.textContent.includes('Penilaian ' + kode)
  hasil.kartuSemuaAspek = kartuAspek().length === getAspekList().length && editorUntuk(aspek1)
  hasil.simpanLangsung = /Simpan penilaian|langsung berlaku untuk semua angkatan/.test(el.textContent)
  await ketik(el.querySelector('form input.field'), 'Nama aspek uji')
  let ditanya = 0
  window.confirm = () => (ditanya++, false)
  await klik(kartuAspek()[1])
  const tetap = editorUntuk(aspek1) && ditanya === 1
  window.confirm = () => (ditanya++, true)
  await klik(kartuAspek()[1])
  hasil.drafDitanyakan = tetap && ditanya === 2 && editorUntuk(aspek2)
  window.confirm = konfirmasiLama
  // Kelola aspek: struktur aspek terpilih, pratinjau dampak sebelum mengarsipkan (alasan wajib), dan formulir tambah.
  const adaStruktur = el.textContent.includes('Struktur aspek ' + aspek2 + '.') && /Simpan struktur/.test(el.textContent)
  // Pindah cluster: area ikut berubah, dan sesudah alasan diisi tombol simpan aktif.
  const pilihCluster = [...el.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'CL4'))
  await pilih(pilihCluster, 'CL4')
  await tunggu()
  const formStruktur = pilihCluster?.closest('form')
  const areaIkut = /Area Interpersonal Development/.test(formStruktur?.textContent ?? '')
  await ketik([...(formStruktur?.querySelectorAll('input') ?? [])].at(-1), 'Uji pindah cluster')
  await tunggu()
  const simpanStrukturAktif =
    pilihCluster?.value === 'CL4' && formStruktur?.querySelector('button[type="submit"]')?.disabled === false
  hasil.pindahCluster = areaIkut && simpanStrukturAktif
  await klik([...el.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Arsipkan aspek'))
  await tunggu()
  const pratinjauArsip = /Bila disimpan, nilai \d+ dari \d+ mahasiswa berubah/.test(el.textContent)
  const tombolArsip = [...el.querySelectorAll('button[type="submit"]')].find((b) => /Arsipkan aspek/.test(b.textContent))
  await klik([...el.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Tambah aspek'))
  await tunggu()
  hasil.kelolaAspek =
    adaStruktur &&
    pratinjauArsip &&
    tombolArsip?.disabled === true &&
    /Komponen pertama/.test(el.textContent) &&
    [...el.querySelectorAll('input')].some((i) => i.value === 'C.3.')
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => b.textContent === 'Bobot'))
  const kartuBobot = [...el.querySelectorAll('ul > li > button[aria-pressed="true"]')]
  hasil.bobotTertanam =
    /Cara membagi bobot otomatis/.test(el.textContent) &&
    !/Kurikulum CPMK/.test(el.textContent) &&
    kartuBobot.length === 1 &&
    kartuBobot[0].textContent.includes(aspek2)
  lepas()

  // Input & Import Nilai: aspek CPMK Semester 1 bisa ditambah, diedit, diubah, dan dihapus dari halaman itu.
  ;({ el, lepas } = await pasang('/admin/nilai?semester=1'))
  const kartuSemester = () => [...el.querySelectorAll('section.card')].find((c) => /Aspek CPMK Semester 1/.test(c.textContent))
  const tombolKartu = (teks) => [...(kartuSemester()?.querySelectorAll('button') ?? [])].filter((b) => b.textContent.trim() === teks)
  const kodeSemester1 = getAspekList().filter((a) => a.semester === 1).map((a) => a.kode)
  const barisLengkap =
    kodeSemester1.length > 0 &&
    kodeSemester1.every((kode) => kartuSemester()?.textContent.includes(kode)) &&
    ['Edit', 'Ubah', 'Hapus'].every((x) => tombolKartu(x).length === kodeSemester1.length)
  await klik(tombolKartu('Tambah aspek')[0])
  await tunggu()
  const pilihArea = [...kartuSemester().querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'B'))
  const tambahDiSemester =
    pilihArea?.value === 'A' &&
    [...kartuSemester().querySelectorAll('input')].some((i) => i.value === 'A.5.') &&
    !/Semester 2/.test([...kartuSemester().querySelectorAll('form select')].map((s) => s.textContent).join(' '))
  await klik(tombolKartu('Hapus')[1])
  await tunggu()
  const hapusPratinjau =
    /Bila disimpan, nilai \d+ dari \d+ mahasiswa berubah/.test(kartuSemester().textContent) &&
    [...kartuSemester().querySelectorAll('button[type="submit"]')].some((b) => /Arsipkan aspek/.test(b.textContent) && b.disabled)
  await klik(tombolKartu('Edit')[0])
  await tunggu()
  hasil.aspekSemester =
    barisLengkap && tambahDiSemester && hapusPratinjau && kartuSemester().textContent.includes('Penilaian ' + kodeSemester1[0].replace(/\.$/, ''))
  lepas()

  // Akses Pengguna (tanpa server: daftar dari AKUN_LOKAL).
  const [d1, d2] = DOSEN
  AKUN_LOKAL.length = 0
  AKUN_LOKAL.push(
    { id: 11, email: d1.email, peran: 'dosen', aktif: true, nama: d1.nama, nip: d1.nip, prodi: d1.prodi },
    { id: 12, email: d2.email, peran: 'dosen', aktif: false, nama: d2.nama, nip: d2.nip, prodi: d2.prodi },
    { id: 21, email: 'admin@umn.ac.id', peran: 'admin', aktif: true },
    { id: 31, email: 'super.admin@umn.ac.id', peran: 'superadmin', aktif: true },
    { id: 41, email: 'mhs.satu@student.umn.ac.id', peran: 'mahasiswa', aktif: true, nama: 'Mahasiswa Satu', nim: '00000100001', prodi: 'Sistem Informasi', angkatan: '2025' },
    { id: 42, email: 'mhs.dua@student.umn.ac.id', peran: 'mahasiswa', aktif: true, nama: 'Mahasiswa Dua', nim: '00000100002', prodi: 'Informatika', angkatan: '2025 Genap' },
  )
  ;({ el, lepas } = await pasang('/super/akses'))
  await tunggu()
  const barisAkun = () => [...el.querySelectorAll('ul.divide-y > li')]
  const baris1 = () => barisAkun().find((li) => li.textContent.includes(d1.nama))
  hasil.aksesDaftarDosen =
    barisAkun().length === 2 && /Akses dicabut/.test(el.textContent) && /Punya akses/.test(el.textContent)
  // Tombol Hapus akun hanya ada di baris yang aksesnya sudah dicabut (d2), tidak di yang masih aktif (d1).
  const adaTombolHapus = (li) => [...(li?.querySelectorAll('button') ?? [])].some((b) => /Hapus akun/.test(b.textContent))
  const hapusHanyaUntukDicabut =
    !adaTombolHapus(baris1()) && adaTombolHapus(barisAkun().find((li) => li.textContent.includes(d2.nama)))
  await klik([...baris1().querySelectorAll('button')].find((b) => /Cabut akses/.test(b.textContent)))
  const formCabut = baris1().querySelector('form')
  const tombolCabut = formCabut?.querySelector('button[type="submit"]')
  const matiTanpaAlasan = tombolCabut?.disabled === true
  await ketik(formCabut.querySelector('input'), 'Tidak mengajar lagi semester ini')
  const hidupDenganAlasan = tombolCabut?.disabled === false
  await act(async () => {
    formCabut.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  })
  await tunggu()
  hasil.cabutAkses =
    matiTanpaAlasan &&
    hidupDenganAlasan &&
    AKUN_LOKAL[0].aktif === false &&
    /Akses dicabut/.test(baris1()?.textContent ?? '') &&
    !baris1()?.querySelector('form') &&
    /Pulihkan akses/.test(baris1()?.textContent ?? '')
  // Sesudah dicabut, d1 bisa dihapus: butuh alasan, lalu barisnya hilang dan pesan berhasil muncul.
  await klik([...baris1().querySelectorAll('button')].find((b) => /Hapus akun/.test(b.textContent)))
  const formHapus = baris1().querySelector('form')
  const tombolHapus = formHapus?.querySelector('button[type="submit"]')
  const hapusMatiTanpaAlasan = tombolHapus?.disabled === true && /Hapus permanen/.test(tombolHapus?.textContent ?? '')
  await ketik(formHapus.querySelector('input'), 'Akun ganda karena salah input')
  await act(async () => {
    formHapus.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  })
  await tunggu()
  hasil.hapusAkun =
    hapusHanyaUntukDicabut &&
    hapusMatiTanpaAlasan &&
    !AKUN_LOKAL.some((a) => a.id === 11) &&
    !baris1() &&
    /sudah dihapus dari basis data/.test(el.querySelector('[role="status"]')?.textContent ?? '')
  await ketik(el.querySelector('input[type="search"]'), d2.nip)
  hasil.cariAkun = barisAkun().length === 1 && barisAkun()[0].textContent.includes(d2.nama)
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => /Admin Kemahasiswaan/.test(b.textContent)))
  await ketik(el.querySelector('input[type="search"]'), '')
  const barisSuper = barisAkun().find((li) => li.textContent.includes('super.admin@umn.ac.id'))
  hasil.superTidakBisaDicabut =
    barisAkun().length === 2 && Boolean(barisSuper) && !barisSuper.querySelector('button') && /Akun Anda/.test(barisSuper.textContent)
  // Izin kelola data master: tombolnya hanya di baris admin biasa, butuh alasan, lalu lencananya muncul.
  const barisAdmin = () => barisAkun().find((li) => li.textContent.includes('admin@umn.ac.id') && !li.textContent.includes('super.admin'))
  await klik([...barisAdmin().querySelectorAll('button')].find((b) => /Beri izin lihat data master/.test(b.textContent)))
  const formIzin = barisAdmin().querySelector('form')
  const izinMatiTanpaAlasan = formIzin?.querySelector('button[type="submit"]')?.disabled === true
  await ketik(formIzin.querySelector('input'), 'Membantu menyiapkan angkatan 2027')
  await act(async () => {
    formIzin.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  })
  await tunggu()
  hasil.beriIzinMaster =
    izinMatiTanpaAlasan &&
    AKUN_LOKAL.find((a) => a.id === 21)?.kelolaMaster === true &&
    /Izin lihat data master/.test(barisAdmin()?.textContent ?? '') &&
    /Cabut izin lihat data master/.test(barisAdmin()?.textContent ?? '') &&
    !/izin lihat data master/i.test(barisSuper.textContent)
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => /Mahasiswa/.test(b.textContent)))
  const semuaMhs = barisAkun().length
  const rincianMhs = /NIM 00000100001[\s\S]*Sistem Informasi[\s\S]*Angkatan 2025/.test(
    barisAkun().find((li) => li.textContent.includes('Mahasiswa Satu'))?.textContent ?? '',
  )
  await ketik(el.querySelector('input[type="search"]'), '00000100002')
  const barisMhs = () => barisAkun().find((li) => li.textContent.includes('Mahasiswa Dua'))
  const cariMhs = barisAkun().length === 1 && Boolean(barisMhs())
  await klik([...barisMhs().querySelectorAll('button')].find((b) => /Cabut akses/.test(b.textContent)))
  const formMhs = barisMhs().querySelector('form')
  await ketik(formMhs.querySelector('input'), 'Cuti akademik satu semester')
  await act(async () => {
    formMhs.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  })
  await tunggu()
  hasil.aksesMahasiswa =
    semuaMhs === 2 &&
    rincianMhs &&
    cariMhs &&
    AKUN_LOKAL.find((a) => a.id === 42)?.aktif === false &&
    /Akses dicabut/.test(barisMhs()?.textContent ?? '')
  lepas()
  AKUN_LOKAL.length = 0

  // Data Master (rapat 24 Okt 2026): admin tanpa izin melihat kartu minta akses baca, dan menunya tetap ada supaya
  // kartu itu bisa dicapai; admin berizin hanya melihat; super admin melihat ketiga bagian beserta tombolnya.
  const menuDataMaster = () => [...el.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/admin/data-master')
  sesi(false)
  ;({ el, lepas } = await pasang('/admin/data-master'))
  hasil.dataMasterTanpaIzin =
    /Minta akses baca data master/.test(el.textContent) &&
    Boolean([...el.querySelectorAll('button')].find((b) => /Minta akses baca/.test(b.textContent))?.disabled) &&
    !/Tambah angkatan/.test(el.textContent) &&
    menuDataMaster()
  lepas()
  window.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'admin', kelolaMaster: true, email: 'admin@umn.ac.id', name: 'Biro Kemahasiswaan & Humaniora', initials: 'KH' }),
  )
  ;({ el, lepas } = await pasang('/admin/data-master'))
  hasil.dataMasterBacaSaja =
    [...el.querySelectorAll('[role="tab"]')].length === 3 &&
    !/Tambah angkatan|Ubah label/.test(el.textContent) &&
    /Anda hanya bisa melihat data master/.test(el.textContent)
  lepas()
  sesi(true)
  ;({ el, lepas } = await pasang('/admin/data-master'))
  const tabDataMaster = [...el.querySelectorAll('[role="tab"]')].map((b) => b.textContent)
  const adaMenuDataMaster = menuDataMaster()
  await klik([...el.querySelectorAll('button')].find((b) => /Tambah angkatan/.test(b.textContent)))
  const pratinjauAngkatan = /Akan dibuat: [0-9]{4} \(kode [0-9]{4}\)/.test(el.textContent)
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => /Fakultas & Prodi/.test(b.textContent)))
  const bagianProdi = /Tambah fakultas/.test(el.textContent) && /Tambah program studi/.test(el.textContent)
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => /^Mahasiswa/.test(b.textContent)))
  hasil.dataMasterSuper =
    tabDataMaster.length === 3 &&
    adaMenuDataMaster &&
    pratinjauAngkatan &&
    bagianProdi &&
    Boolean(el.querySelector('input[type="search"]')) &&
    /NIM tidak bisa diubah/.test(el.textContent)
  lepas()

  // Pintu API yang belum dibuat (404) dikenali, supaya halaman bisa menjelaskannya.
  const lokalLama = globalThis.__SK5C_LOKAL__
  const fetchLama = globalThis.fetch
  globalThis.__SK5C_LOKAL__ = false
  globalThis.fetch = async () => new Response('<!doctype html>', { status: 404 })
  let statusGalat = null
  try {
    await muatAkses()
  } catch (e) {
    statusGalat = e.status
  } finally {
    globalThis.fetch = fetchLama
    globalThis.__SK5C_LOKAL__ = lokalLama
  }
  hasil.apiBelumAdaDikenali = statusGalat === 404

  if (lama) window.localStorage.setItem('sk5c.session', lama)
  else window.localStorage.removeItem('sk5c.session')
  return hasil
}

// Halaman Kurikulum CPMK: bobot satu aspek diatur manual, pratinjau dampak, alasan untuk data terkunci, simpan.
export async function ujiKurikulum() {
  const lama = window.localStorage.getItem('sk5c.session')
  window.localStorage.setItem('sk5c.session', JSON.stringify({ role: 'admin', email: 'a@umn.ac.id', name: 'Y', initials: 'KH' }))
  const hasil = {}
  const idA1 = getKomponen('A1').map((k) => k.id)
  const isianPorsi = (el) => [...el.querySelectorAll('input[aria-label^="Porsi baru"]')]
  // Admin biasa: bila nilai mahasiswa yang sudah lewat Semester 3 ikut berubah, tombolnya "Ajukan ke Super Admin".
  const tombolSimpan = (el) =>
    [...el.querySelectorAll('button[type="submit"]')].find((b) => /Simpan bobot|Ajukan ke Super Admin/.test(b.textContent))

  const { el, lepas } = await pasang('/admin/kurikulum')
  hasil.sepuluhAspek = el.querySelectorAll('main li > button[aria-pressed]').length === 10
  hasil.bawaanOtomatis = /Belum ada perubahan/.test(el.textContent) && isianPorsi(el).length === 0 && /20%/.test(el.textContent)

  await klik(el.querySelectorAll('input[name="cara-A1"]')[1])
  const isian = isianPorsi(el)
  hasil.manualDiisiPorsiBerlaku = isian.length === idA1.length && isian.every((x) => x.value === '20')

  await ketik(isian[0], '40')
  hasil.jumlahSalahDitandai = /Perlu diperbaiki/.test(el.textContent) && /sekarang 120%/.test(el.textContent) && !tombolSimpan(el)

  for (const x of isian.slice(1)) await ketik(x, '15')
  await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
  hasil.dampakTampil = /Bila disimpan, nilai \d+ dari \d+ mahasiswa berubah/.test(el.textContent)
  // Data contoh punya angkatan 2024 yang terkunci (dan sudah lewat Semester 3), jadi alasan wajib.
  hasil.alasanWajib = /Alasan perubahan \(wajib\)/.test(el.textContent) && Boolean(tombolSimpan(el)?.disabled)
  hasil.ajukanUntukAdminBiasa =
    /Ajukan ke Super Admin/.test(tombolSimpan(el)?.textContent ?? '') && /dikirim ke Super Admin sebagai permintaan/.test(el.textContent)
  await ketik(el.querySelector('form input'), 'Penyesuaian bobot A.1 untuk uji')
  hasil.hidupSesudahAlasan = Boolean(tombolSimpan(el)) && !tombolSimpan(el).disabled

  await act(async () => {
    tombolSimpan(el).click()
    await new Promise((r) => setTimeout(r, 0))
  })
  hasil.tersimpan = /Bobot tersimpan/.test(el.textContent) && Math.abs(bobotKomponen('A1')[idA1[0]] - 40) < 1e-9
  hasil.kartuManual = /A\.1\.\s*Manual/.test(el.querySelector('main li > button[aria-pressed]')?.textContent ?? '')
  lepas()

  // Kurikulum dan CONFIG dikembalikan ke bawaan kode supaya uji berikutnya tidak terpengaruh.
  isiKurikulum({})
  resetTranskripCache()
  if (lama) window.localStorage.setItem('sk5c.session', lama)
  else window.localStorage.removeItem('sk5c.session')
  return hasil
}

export async function ujiCetakTranskrip() {
  const { el, lepas } = await pasang('/mahasiswa/transkrip')

  const lembar = el.querySelector('.lembar-cetak')
  const layar = lembar?.nextElementSibling
  const kepala = lembar ? [...lembar.querySelectorAll('thead th')].map((n) => n.textContent).join('|') : ''
  const baris = lembar ? [...lembar.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent)) : []
  const teks = lembar?.textContent ?? ''

  const hasil = {
    grafikAda: bagianGrafik(el).length === 2,
    // Di layar lembar tersembunyi; di kertas hanya lembar ini yang muncul.
    lembarHanyaDiKertas: Boolean(lembar && /(^| )hidden( |$)/.test(lembar.className) && lembar.className.includes('print:block')),
    layarTakTercetak: Boolean(layar && layar.className.includes('print:hidden')),
    judul: /Transkrip Sementara/.test(teks),
    kepala,
    jumlahBaris: baris.length,
    // Aspek yang belum dibuka tertulis "...", tidak pernah 0 (R2).
    belumBukanNol: baris.filter((r) => r[4] === '...' && r[5] === '...').length === 3 && baris.every((r) => r[4] !== '0'),
    ringkasan: /Aspek dinilai:7 \/ 10/.test(teks) && /Nilai akhir:79 \(sementara\)/.test(teks) && /Predikat:C/.test(teks),
    keterangan: ['A', 'B', 'C', 'D'].every((h) => teks.includes('Predikat ' + h + ':')) && /Belum Memenuhi:di bawah 60/.test(teks),
    tandaTangan: /Head of Department/.test(teks) && /Tangerang, /.test(teks),
    alamat: /Jl\. Boulevard Gading Serpong/.test(teks),
    // Hanya logo; tidak ada grafik di kertas.
    tanpaGrafik: lembar ? lembar.querySelectorAll('svg').length === 1 : false,
    ajukanTakTercetak: [...el.querySelectorAll('section')].some(
      (n) => /Ada nilai yang menurutmu keliru/.test(n.textContent) && n.closest('.print\\:hidden'),
    ),
  }

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Lapis terjemahan mesin.

   Yang diuji BUKAN mutu terjemahannya — itu urusan perambannya — melainkan
   tiga janji yang dibuat lapis ini:

     - Peramban tanpa penerjemah bawaan tidak boleh rusak, cuma diam.
     - Kamus buatan manusia tidak boleh pernah ditimpa mesin.
     - Kalimat yang kehilangan penanda {n} harus DIBUANG, bukan ditampilkan.
       Kalimat Inggris yang kehilangan angkanya lebih buruk daripada kalimat
       Indonesia yang utuh.
   -------------------------------------------------------------------------- */
export async function ujiOtomatis() {
  const { terjemah } = await import('../src/lib/bahasa')
  const { mintaTerjemahan, hasilOtomatis } = await import('../src/lib/terjemahOtomatis')

  const hasil = {}

  /* 1. Tanpa antarmuka penerjemah, tidak boleh ada yang meledak. */
  const asing = 'Kalimat yang sengaja tidak ada di kamus mana pun'
  hasil.diamTanpaApi = terjemah('en', asing) === asing

  /* 2. Penerjemah tiruan: membalik kalimat menjadi huruf besar, dan sengaja
     MEMBUANG penanda supaya penjaganya ikut teruji. */
  const dipanggil = []
  globalThis.Translator = {
    availability: async () => 'available',
    create: async () => ({
      translate: async (teks) => {
        dipanggil.push(teks)
        return teks.toUpperCase().replace(/\{\w+\}/g, '')
      },
    }),
  }

  const tanpaPenanda = 'Kalimat uji tanpa penanda apa pun'
  mintaTerjemahan(tanpaPenanda)
  const berpenanda = 'Kalimat uji dengan {n} penanda'
  mintaTerjemahan(berpenanda)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 60))
  })

  hasil.mesinDipanggil = dipanggil.length === 2
  hasil.hasilMasuk = hasilOtomatis(tanpaPenanda) === tanpaPenanda.toUpperCase()
  hasil.dipakaiTerjemah = terjemah('en', tanpaPenanda) === tanpaPenanda.toUpperCase()
  /* Penanda hilang -> hasilnya dibuang, kalimatnya tetap Indonesia. */
  hasil.penandaHilangDibuang = hasilOtomatis(berpenanda) === undefined
  hasil.jatuhKeIndonesia = terjemah('en', berpenanda, { n: 3 }) === 'Kalimat uji dengan 3 penanda'

  /* 3. Kamus manusia tetap menang walau mesinnya hidup. */
  hasil.kamusMenang = terjemah('en', 'Nilai akhir') === 'Final score'

  delete globalThis.Translator
  return hasil
}

/* --------------------------------------------------------------------------
   Pemilih bahasa dan layanan bantuan di ketiga panel.

   Dua keputusan yang dijaga di sini, dan keduanya mudah sekali hilang saat
   kerangka panel disentuh lagi nanti:

   - Pemilih bahasa ada di SEMUA panel. Kalau hanya dipasang di satu kerangka,
     dua panel lain akan terkunci di Indonesia tanpa ada yang menyadarinya.
   - Tombol bantuan ada di panel mahasiswa dan dosen, TIDAK di panel
     Kemahasiswaan. Merekalah yang menjawab pertanyaan itu, jadi tombol yang
     menautkan mereka ke diri sendiri tidak menuju ke mana pun.
   -------------------------------------------------------------------------- */
/**
 * Halaman masuk: kata sandi tampil selama mata ditunjuk tetikus atau ditahan jari, lalu tersembunyi lagi.
 * Klik tetikus (detail 1) tidak menyalakannya; klik tanpa tetikus (Enter/Spasi, detail 0) menyalakan dan
 * mematikannya. jsdom belum punya PointerEvent, jadi dipakai MouseEvent yang ditempeli pointerType.
 */
export async function ujiMataSandi() {
  const lama = window.localStorage.getItem('sk5c.session')
  window.localStorage.removeItem('sk5c.session')
  const { el, lepas } = await pasang('/masuk')
  const sandi = el.querySelector('#password')
  const mata = el.querySelector('button[aria-controls="password"]')
  const penunjuk = async (jenis, pointerType) => {
    await act(async () => {
      const ev = new window.MouseEvent(jenis, { bubbles: true, cancelable: true, relatedTarget: null })
      ev.pointerId = 1
      ev.pointerType = pointerType
      mata.dispatchEvent(ev)
    })
  }
  const hasil = {
    adaMata:
      Boolean(mata) &&
      !/Tampilkan|Sembunyikan/.test(mata.textContent) &&
      ['Lihat kata sandi', 'Show password'].includes(mata.getAttribute('aria-label')) &&
      Boolean(mata.querySelector('svg')),
  }
  await penunjuk('pointerover', 'mouse')
  const tampilDitunjuk = sandi.type === 'text'
  await penunjuk('pointerout', 'mouse')
  hasil.tunjukTetikus = tampilDitunjuk && sandi.type === 'password'

  await penunjuk('pointerdown', 'touch')
  const tampilDitahan = sandi.type === 'text'
  await penunjuk('pointerup', 'touch')
  hasil.tahanSentuh = tampilDitahan && sandi.type === 'password'

  await klik(mata, 1)
  const klikTetikusDiabaikan = sandi.type === 'password'
  await klik(mata, 0)
  const nyala = sandi.type === 'text' && mata.getAttribute('aria-pressed') === 'true'
  await klik(mata, 0)
  hasil.papanKetik = klikTetikusDiabaikan && nyala && sandi.type === 'password' && mata.getAttribute('aria-pressed') === 'false'

  lepas()
  if (lama) window.localStorage.setItem('sk5c.session', lama)
  return hasil
}

/**
 * Bahasa bawaan: halaman masuk Inggris selama pengguna belum pernah memilih, panel tetap Indonesia.
 * Hanya pilihan dari pemilih yang disimpan (kunci 'sk5c.bahasa.pilihan'); kunci lama 'sk5c.bahasa'
 * ikut menyimpan bawaan yang tidak pernah dipilih, jadi harus dibuang dan tidak boleh dipakai.
 */
export async function ujiBahasaMasuk() {
  const PILIHAN = 'sk5c.bahasa.pilihan'
  const sesi = window.localStorage.getItem('sk5c.session')
  const hasil = {}
  const tombol = (el, kode) =>
    [...el.querySelectorAll('[role="group"][aria-label] button')].find((b) => b.textContent.trim() === kode)
  const masuk = async () => {
    window.localStorage.removeItem('sk5c.session')
    return pasang('/masuk')
  }

  window.localStorage.removeItem(PILIHAN)
  window.localStorage.setItem('sk5c.bahasa', 'id')
  let h = await masuk()
  hasil.masukInggris =
    h.el.querySelector('h2')?.textContent === 'Sign in' &&
    tombol(h.el, 'EN')?.getAttribute('aria-pressed') === 'true' &&
    document.documentElement.lang === 'en'
  hasil.adaPemilih = Boolean(tombol(h.el, 'ID') && tombol(h.el, 'EN'))
  hasil.kunciLamaDibuang = window.localStorage.getItem('sk5c.bahasa') === null
  hasil.bawaanTidakDisimpan = window.localStorage.getItem(PILIHAN) === null

  await klik(tombol(h.el, 'EN'))
  hasil.enAktifTetapDisimpan = window.localStorage.getItem(PILIHAN) === 'en'
  window.localStorage.removeItem(PILIHAN)
  h.lepas()

  if (sesi) window.localStorage.setItem('sk5c.session', sesi)
  h = await pasang('/mahasiswa')
  hasil.panelIndonesia =
    tombol(h.el, 'ID')?.getAttribute('aria-pressed') === 'true' && document.documentElement.lang === 'id'
  h.lepas()

  h = await masuk()
  await klik(tombol(h.el, 'ID'))
  hasil.pilihIndonesia =
    h.el.querySelector('h2')?.textContent === 'Masuk' && window.localStorage.getItem(PILIHAN) === 'id'
  h.lepas()
  h = await masuk()
  hasil.pilihanDiingat = h.el.querySelector('h2')?.textContent === 'Masuk'
  h.lepas()

  window.localStorage.removeItem(PILIHAN)
  if (sesi) window.localStorage.setItem('sk5c.session', sesi)
  return hasil
}

export async function ujiPanelLain(rute) {
  /* Pilihan bahasa bertahan di penyimpanan. Tanpa dibersihkan, panel kedua
     sudah berbahasa Inggris sejak dibuka dan menekan EN tidak mengubah apa
     pun — uji ini akan gagal karena keadaan sisa, bukan karena ada yang rusak. */
  try {
    localStorage.removeItem('sk5c.bahasa.pilihan')
  } catch {
    /* diabaikan */
  }

  const { el, lepas } = await pasang(rute)
  const hasil = {
    adaPemilihBahasa: Boolean(el.querySelector('[role="group"][aria-label]')),
    adaTombolBantuan: Boolean(el.querySelector('button[aria-controls="panel-layanan"]')),
  }

  /* Menekan EN harus benar-benar mengganti isi halaman, bukan hanya bilahnya. */
  const en = [...el.querySelectorAll('[role="group"][aria-label] button')].find(
    (b) => b.textContent.trim() === 'EN',
  )
  const sebelum = el.textContent
  await klik(en, 0)
  hasil.isiIkutBerganti = el.textContent !== sebelum

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Layanan tambahan yang mengambang.

   Yang dijaga di sini bukan rupanya, melainkan janji-janji kecil yang mudah
   sekali hilang tanpa ketahuan: tombolnya benar-benar mengambang (bukan ikut
   tergulir), tidak ikut tercetak, tautannya menunjuk ke kontak yang benar, dan
   tautan keluar tidak membocorkan window.opener.
   -------------------------------------------------------------------------- */
export async function ujiLayanan(rute = '/mahasiswa') {
  const { el, lepas } = await pasang(rute)
  const hasil = {}

  const tombol = el.querySelector('button[aria-controls="panel-layanan"]')
  const panel = () => el.querySelector('#panel-layanan')
  const wadah = tombol?.parentElement

  hasil.adaTombol = Boolean(tombol)
  hasil.mengambang = Boolean(wadah && wadah.className.split(' ').includes('fixed'))
  hasil.takIkutTercetak = Boolean(wadah && wadah.className.includes('print:hidden'))
  /* Harus di bawah laci navigasi yang z-50, kalau tidak ia akan mengambang di
     atas lapisan gelapnya saat laci dibuka. */
  hasil.diBawahLaci = Boolean(wadah && wadah.className.split(' ').includes('z-40'))
  hasil.tertutupAwal = panel() === null
  hasil.menyebutKeadaan = tombol?.getAttribute('aria-expanded') === 'false'

  await klik(tombol)
  hasil.terbuka = panel() !== null
  hasil.keadaanIkutBerubah = tombol?.getAttribute('aria-expanded') === 'true'

  const tautan = [...(panel()?.querySelectorAll('a') ?? [])]
  hasil.tigaSaluran = tautan.length === 3
  const href = tautan.map((a) => a.getAttribute('href') ?? '')
  hasil.adaWhatsapp = href.some((h) => h.startsWith('https://wa.me/'))
  hasil.adaTelepon = href.some((h) => h.startsWith('tel:'))
  hasil.adaSurel = href.some((h) => h.startsWith('mailto:'))
  /* Nomor tel: tidak boleh memuat spasi, sebagian peramban menolaknya. */
  hasil.telSah = href.filter((h) => h.startsWith('tel:')).every((h) => !/\s/.test(h))

  const keluar = tautan.filter((a) => a.getAttribute('target') === '_blank')
  hasil.tautanKeluarAman =
    keluar.length > 0 && keluar.every((a) => (a.getAttribute('rel') ?? '').includes('noopener'))

  /* Jam layanan dihapus dari panel ini dan dari footer pada 12 Okt 2026 (commit 1d3976b); uji lamanya masih mencari
     "08.00". Yang dijaga sekarang: tiap saluran menyebut nomor, alamat surel, atau keterangannya. */
  hasil.tiapSaluranBerketerangan =
    tautan.length > 0 && tautan.every((a) => ([...a.querySelectorAll('span.block')][1]?.textContent ?? '').trim().length > 0)
  hasil.berkaca = Boolean(panel() && panel().className.split(' ').includes('kaca'))
  hasil.berurutanMasuk = [...(panel()?.querySelectorAll('.layanan-item') ?? [])].some(
    (li) => li.style.animationDelay && li.style.animationDelay !== '0ms',
  )

  /* Escape menutup, dan fokus kembali ke tombolnya. */
  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  hasil.escMenutup = panel() === null

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Menyeret pil pemilih bahasa.

   Yang diuji di sini perilakunya, bukan rupanya: pil boleh ditahan lalu
   diseret, seretan yang tidak sampai separuh jalan kembali ke tempat semula,
   dan seretan tidak boleh terhitung dua kali oleh klik yang menyusul.
   -------------------------------------------------------------------------- */
export async function ujiSeretBahasa() {
  try {
    localStorage.removeItem('sk5c.bahasa.pilihan')
  } catch {
    /* diabaikan */
  }

  const { el, lepas } = await pasang('/mahasiswa')
  const hasil = {}

  const grup = el.querySelector('[role="group"][aria-label]')
  const pil = grup?.querySelector('[aria-hidden="true"]')
  const inggris = () => /Final score/.test(el.textContent)

  /* jsdom tidak menata letak, jadi getBoundingClientRect-nya selalu nol.
     Kendalinya dipalsukan berada di x = 100 selebar 74 px, supaya perhitungan
     "jari dilepas di segmen mana" benar-benar diuji, bukan dilewati. */
  grup.getBoundingClientRect = () => ({
    left: 100, right: 174, top: 0, bottom: 34, width: 74, height: 34, x: 100, y: 0,
  })
  const KIRI = 118 // di dalam segmen ID
  const KANAN = 155 // di dalam segmen EN

  hasil.adaPil = Boolean(pil)
  hasil.pilBerkaca = Boolean(pil && pil.className.split(' ').includes('pil-kaca'))
  hasil.mulaiDiKiri = Boolean(pil && pil.style.transform.includes('translateX(0px)'))

  /* Satu ketukan tetikus utuh: turun dan naik di titik yang sama. */
  const ketuk = async (x) => {
    await tunjuk(grup, 'pointerdown', x)
    await tunjuk(grup, 'pointerup', x)
  }

  /* ---- 1. KLIK BIASA, lalu klik susulan dari peramban. ---- */
  await ketuk(KANAN)
  hasil.klikBiasaMengganti = inggris()
  await klik(grup, 1)
  hasil.klikSusulanDiabaikan = inggris()

  /* ---- 2. Klik biasa kembali ke segmen kiri. ---- */
  await ketuk(KIRI)
  hasil.klikBiasaBisaKembali = !inggris()

  /* ---- 3. PAPAN KETIK. Klik ber-detail 0 datang dari Enter atau Spasi, dan
     harus tetap dilayani onClick tombolnya. Diuji di sini, setelah ketukan
     biasa — bukan setelah seretan, karena seretan memang sengaja menelan satu
     klik susulan dan itu perilaku yang benar. ---- */
  await klik(grup.querySelectorAll('button')[1], 0)
  hasil.papanKetikJalan = inggris()

  await ketuk(KIRI)

  /* ---- 4. SERET penuh ke kanan lalu lepas. ---- */
  await tunjuk(grup, 'pointerdown', KIRI)
  await tunjuk(grup, 'pointermove', KIRI + 40)
  hasil.pilIkutJari = Boolean(pil && !pil.style.transform.includes('translateX(0px)'))
  hasil.transisiMatiSaatDiseret = Boolean(pil && pil.style.transition.includes('.12s'))
  await tunjuk(grup, 'pointerup', KIRI + 40)
  hasil.seretMengganti = inggris()
  hasil.transisiPulih = Boolean(pil && pil.style.transition.includes('.42s'))

  /* ---- 5. Klik susulan sesudah SERETAN mendarat di tombol asal, dan harus
     diabaikan walau detail-nya 0 (perilaku peramban ponsel). ---- */
  await klik(grup.querySelector('button'), 0)
  hasil.seretTakDibalikSentuhan = inggris()

  /* ---- 6. Seret pendek dari EN: belum melewati separuh, tetap di EN. ---- */
  await tunjuk(grup, 'pointerdown', KANAN)
  await tunjuk(grup, 'pointermove', KANAN - 10)
  await tunjuk(grup, 'pointerup', KANAN - 10)
  hasil.seretPendekKembali = inggris()

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Pemilih bahasa.

   Yang diuji bukan isi kamusnya, melainkan MEKANISMENYA: bahwa halaman benar
   benar berganti bahasa saat tombolnya ditekan, bahwa pilihannya tersimpan,
   dan bahwa render pertama panel selalu Indonesia — sebab render pertama di peramban
   harus sama persis dengan HTML dari server, kalau tidak React menolak
   hidrasinya.
   -------------------------------------------------------------------------- */
export async function ujiBahasa() {
  try {
    localStorage.removeItem('sk5c.bahasa.pilihan')
  } catch {
    /* diabaikan */
  }

  const { el, lepas } = await pasang('/mahasiswa')
  const hasil = {}

  const tombol = (kode) =>
    [...el.querySelectorAll('[role="group"][aria-label] button')].find(
      (b) => b.textContent.trim() === kode,
    )

  const teks = () => el.textContent

  hasil.adaPemilih = Boolean(tombol('ID') && tombol('EN'))
  hasil.mulaiIndonesia = tombol('ID')?.getAttribute('aria-pressed') === 'true'
  hasil.isiIndonesia = /Nilai akhir/.test(teks()) && !/Final score/.test(teks())

  await klik(tombol('EN'))
  hasil.inggrisAktif = tombol('EN')?.getAttribute('aria-pressed') === 'true'
  hasil.isiInggris = /Final score/.test(teks()) && /Aspects graded/.test(teks())
  hasil.judulIkutBerganti = /Assessment aspects/.test(teks())
  hasil.menuIkutBerganti = /Road Map/.test(teks())
  hasil.tersimpan = (() => {
    try {
      return localStorage.getItem('sk5c.bahasa.pilihan') === 'en'
    } catch {
      return false
    }
  })()
  hasil.langDiperbarui = document.documentElement.lang === 'en'

  /* Penanda {dalamKurung} harus terisi, bukan tampil mentah. */
  hasil.penandaTerisi = !/\{(?:n|total|final|keadaan|periode)\}/.test(teks())

  await klik(tombol('ID'))
  hasil.kembaliIndonesia = /Nilai akhir/.test(teks()) && !/Final score/.test(teks())

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Unggahan nilai dosen (rapat 24 Okt 2026).

   Yang dijaga: rekap dibaca dengan benar (kolom dikenali dari kode tugas, NIM
   yang kehilangan nol depannya di Excel tetap cocok), berkas yang salah ditolak
   SEBELUM ada yang tersimpan, nilai yang disimpan langsung masuk transkrip
   sebagai satu unggahan yang bisa dibatalkan, dan unggahan ulang tanpa
   perubahan tidak menulis apa pun. Diperiksa terhadap data mahasiswa yang
   sebenarnya, bukan tulisan di layar. Hak aksesnya diuji npm run test:db.
   -------------------------------------------------------------------------- */
const nilaiDi = (nim, k) => getStudentByNim(nim)?.nilai?.[k.aspekId]?.komponen?.[k.id]?.nilai ?? null
const bukanFinal = (k) => (s) => s.penguncian?.[k.aspekId]?.status !== 'final'

export async function ujiAlurDosen() {
  const { rollbackBatch, unggahNilaiDosen, unggahanDosen } = await import('../src/lib/store')
  const { bacaRekap, isiTemplat, ringkasKelas, sebabPersetujuan } = await import('../src/lib/unggahDosen')
  const { EN } = await import('../src/lib/teks')

  const d = DOSEN[0]
  const komponen = komponenDosen(d)
  const kelas = mahasiswaKelas(d)
  const opsi = { mahasiswa: kelas, komponenKelas: komponen }
  const [k1, k2] = komponen
  const hasil = {
    kelasTersaring:
      kelas.length > 0 && kelas.length < STUDENTS.length && kelas.every((s) => s.program === d.prodi && s.semesterAktif >= d.semester),
    adaDuaTugas: komponen.length >= 2,
  }

  /* 1. Templat yang diunggah kembali apa adanya tidak mengubah apa pun. */
  const { judul, isi } = isiTemplat(opsi)
  const utuh = bacaRekap([judul, ...isi], opsi)
  hasil.templatDikenali = utuh.kolom.length === komponen.length && utuh.kolom.every((c) => c.cara === 'kode')
  hasil.templatTanpaPerubahan = !utuh.galat.length && utuh.perubahan.length === 0 && utuh.sama > 0

  /* 2. Rekap dosen sendiri: kolom No diabaikan, NIM berupa angka, nama tugas lengkap, koma desimal. */
  const [a, b] = kelas.filter((s) => bukanFinal(k1)(s) && bukanFinal(k2)(s))
  const lamaA = nilaiDi(a.nim, k1)
  const lamaB = nilaiDi(b.nim, k2)
  const baruA = lamaA === 91 ? 92 : 91
  const baruB = lamaB === 77.5 ? 78.5 : 77.5
  const baris = [
    ['No', 'NIM', 'Nama Mahasiswa', k1.id + ' · ' + k1.label, k2.id],
    [1, Number(a.nim), a.name, baruA, null],
    [2, b.nim, b.name, '', String(baruB).replace('.', ',')],
  ]
  const rekap = bacaRekap(baris, opsi)
  hasil.rekapTerbaca = !rekap.galat.length && rekap.perubahan.length === 2 && rekap.mahasiswa === 2
  hasil.nimTanpaNolCocok = rekap.perubahan.some((p) => p.nim === a.nim && p.komponen.id === k1.id && p.baru === baruA)
  hasil.komaDesimal = rekap.perubahan.some((p) => p.nim === b.nim && p.komponen.id === k2.id && p.baru === baruB)
  hasil.belumTersimpanSaatDibaca = nilaiDi(a.nim, k1) === lamaA && nilaiDi(b.nim, k2) === lamaB

  /* 3. Disimpan: langsung masuk transkrip sebagai satu unggahan. */
  const entri = rekap.perubahan.map((p) => ({ nim: p.nim, komponenId: p.komponen.id, nilai: p.baru }))
  const sebelum = unggahanDosen().length
  const simpan = await unggahNilaiDosen({ dosen: d, entri })
  hasil.langsungTersimpan = nilaiDi(a.nim, k1) === baruA && nilaiDi(b.nim, k2) === baruB
  const riwayat = unggahanDosen()
  hasil.tercatatSebagaiUnggahan =
    riwayat.length === sebelum + 1 && riwayat[0].id === simpan.id && riwayat[0].jumlah === 2 && riwayat[0].status === 'tersimpan'

  /* 4. Berkas yang sama diunggah lagi: tidak ada yang berubah, tidak ada unggahan baru. */
  const ulang = bacaRekap(baris, opsi)
  hasil.unggahUlangTanpaPerubahan = !ulang.galat.length && ulang.perubahan.length === 0 && ulang.sama === 2
  const lagi = await unggahNilaiDosen({ dosen: d, entri })
  hasil.simpanUlangTidakMenulis = lagi.id === null && unggahanDosen().length === sebelum + 1

  /* 5. Berkas yang salah ditolak seluruhnya, dengan pesan yang ada di kamus. */
  const tolak = (isiBaris, judulBaris = ['NIM', 'Nama', k1.id], o = opsi) => bacaRekap([judulBaris, ...isiBaris], o)
  const kasus = {
    tolakNimAsing: tolak([['999999999', 'X', 80]]),
    tolakDiLuarRentang: tolak([[a.nim, a.name, 120]]),
    tolakBukanAngka: tolak([[a.nim, a.name, 'delapan puluh']]),
    tolakNimGanda: tolak([[a.nim, a.name, 80], [a.nim, a.name, 81]]),
    tolakKolomAsing: tolak([[a.nim, 80]], ['NIM', 'Tugas Rahasia']),
    tolakTanpaKolomNim: tolak([[a.name, 80]], ['Nama', k1.id]),
    tolakKolomGanda: tolak([[a.nim, 80, 81]], ['NIM', k1.id, k1.id + ' · ' + k1.label]),
    // Tempelan yang bergeser (temuan 25 Oktober): angka di kolom tanpa judul, dari sel judul yang kosong (xlsx)
    // atau baris judul yang lebih pendek (csv).
    tolakAngkaTanpaJudul: tolak([[a.nim, a.name, 80, 90, 70]], ['NIM', 'Nama', k1.id, null, '']),
    tolakAngkaLewatJudul: tolak([[a.nim, a.name, 80, 90]]),
  }
  // Selama ada galat, layar mengunci tombol simpan (diuji ujiLayarUnggah) dan server memeriksa ulang.
  for (const [nama, r] of Object.entries(kasus)) hasil[nama] = r.galat.length >= 1
  hasil.pesanGalatDiKamus = Object.values(kasus).every((r) => r.galat.every((g) => Boolean(EN[g.teks])))
  hasil.kolomTanpaJudulDisebut =
    kasus.tolakAngkaTanpaJudul.galat.some((g) => g.isi?.kolom === 'D, E') &&
    kasus.tolakAngkaLewatJudul.galat.some((g) => g.isi?.kolom === 'D')
  hasil.teksTanpaJudulDibiarkan = !tolak([[a.nim, a.name, 80, 'sudah dicek']]).galat.length

  /* 5a. Aspek yang belum dibuka disebut sekali per baris, bukan sekali untuk tiap tugasnya. */
  const aspek3 = getAspekList().find((x) => x.semester === 3 && getKomponen(x.id).filter((k) => k.sumber === d.sumber).length >= 2)
  const muda = STUDENTS.find((s) => s.program === d.prodi && s.semesterAktif < 3)
  if (aspek3 && muda) {
    const [t1, t2] = getKomponen(aspek3.id).filter((k) => k.sumber === d.sumber)
    const belum = bacaRekap([['NIM', t1.id, t2.id], [muda.nim, 80, 81]], {
      mahasiswa: [muda],
      komponenKelas: komponenDosen({ ...d, semester: 3 }),
    })
    hasil.aspekBelumDibukaSekali = belum.galat.length === 1 && /baru dibuka/.test(belum.galat[0].teks)
  }

  /* 5b. Aspek final, angkatan yang disahkan, dan program yang selesai tidak ditolak (keputusan pengguna 25 Oktober):
     nilainya diajukan ke Super Admin. */
  const finalA = { ...a, penguncian: { ...a.penguncian, [k1.aspekId]: { status: 'final' } } }
  const diajukan = tolak([[a.nim, a.name, baruA === 50 ? 51 : 50]], undefined, { mahasiswa: [finalA], komponenKelas: komponen })
  hasil.aspekFinalDiajukan = !diajukan.galat.length && diajukan.perluPersetujuan === 1 && diajukan.perubahan[0]?.persetujuan === 'final'
  hasil.sebabPersetujuan =
    sebabPersetujuan({ statusAngkatan: 'terkunci' }, k1.aspekId) === 'disahkan' &&
    sebabPersetujuan(finalA, k1.aspekId) === 'final' &&
    sebabPersetujuan(a, k1.aspekId) === null

  /* 5c. Angkatan yang diampu dipilih Super Admin: kelasnya angkatan itu saja, termasuk 2024 yang sudah disahkan.
     Unggahan campuran: angkatan berjalan langsung tersimpan, yang disahkan diajukan dengan alasan wajib. */
  const dCampur = { ...d, angkatan: [a.angkatanId, '2024'].sort() }
  const kelasCampur = mahasiswaKelas(dCampur)
  const disahkan = kelasCampur.find((s) => s.angkatanId === '2024' && bukanFinal(k1)(s))
  hasil.kelasDiampu =
    Boolean(disahkan) &&
    kelasCampur.every((s) => s.program === d.prodi && dCampur.angkatan.includes(s.angkatanId)) &&
    kelasCampur.some((s) => s.angkatanId === a.angkatanId)
  if (disahkan) {
    const lamaDisahkan = nilaiDi(disahkan.nim, k1)
    const baruDisahkan = lamaDisahkan === 64 ? 65 : 64
    const lamaA2 = nilaiDi(a.nim, k1)
    const baruA2 = lamaA2 === 63 ? 62 : 63
    const campur = bacaRekap(
      [['NIM', 'Nama', k1.id], [a.nim, a.name, baruA2], [disahkan.nim, disahkan.name, baruDisahkan]],
      { mahasiswa: kelasCampur, komponenKelas: komponen },
    )
    const entriCampur = campur.perubahan.map((p) => ({ nim: p.nim, komponenId: p.komponen.id, nilai: p.baru }))
    hasil.pratinjauCampur = !campur.galat.length && campur.perubahan.length === 2 && campur.perluPersetujuan === 1
    try {
      await unggahNilaiDosen({ dosen: dCampur, entri: entriCampur, alasan: 'pendek' })
      hasil.perbaikanTanpaAlasanDitahan = false
    } catch {
      hasil.perbaikanTanpaAlasanDitahan = nilaiDi(a.nim, k1) === lamaA2 && nilaiDi(disahkan.nim, k1) === lamaDisahkan
    }
    const sebelumPermintaan = PERMINTAAN.length
    const hasilCampur = await unggahNilaiDosen({ dosen: dCampur, entri: entriCampur, alasan: 'Nilai tugas dikoreksi sesudah banding.' })
    const diajukanLokal = PERMINTAAN.find((p) => p.id === hasilCampur.permintaan?.id)
    hasil.campuran =
      hasilCampur.jumlah === 1 &&
      nilaiDi(a.nim, k1) === baruA2 &&
      nilaiDi(disahkan.nim, k1) === lamaDisahkan &&
      PERMINTAAN.length === sebelumPermintaan + 1 &&
      diajukanLokal?.aksi === 'PERBAIKAN_NILAI_DOSEN' &&
      diajukanLokal.status === 'menunggu' &&
      diajukanLokal.ringkasan.baris.some((x) => x.includes(disahkan.nim) && x.includes('→ ' + baruDisahkan))
    // Permintaan lokal tidak ikut dibersihkan pakaiDataContoh(); dilepas di sini supaya uji lain tidak menghitungnya.
    PERMINTAAN.splice(PERMINTAAN.indexOf(diajukanLokal), 1)
    await rollbackBatch(hasilCampur.id)
  }

  /* 6. Rekap berskala 0-10 diperingatkan, tidak ditolak. */
  const skala = tolak([[a.nim, a.name, 8.5], [b.nim, b.name, 9]])
  hasil.peringatkanSkala10 = !skala.galat.length && skala.peringatan.length === 1 && Boolean(EN[skala.peringatan[0].teks])

  /* 7. Ringkasan Beranda dosen dihitung dari nilai yang tersimpan. */
  const ringkas = ringkasKelas(opsi)
  hasil.ringkasanKelas =
    ringkas.total === kelas.length * komponen.length &&
    ringkas.terisi === ringkas.perTugas.reduce((n, x) => n + x.terisi, 0) &&
    ringkas.perMahasiswa.find((m) => m.mahasiswa.nim === a.nim)?.isi.find((x) => x.komponen.id === k1.id)?.nilai === baruA

  /* 8. Super Admin membatalkan unggahannya: nilai kembali, riwayat dosen menandainya. */
  await rollbackBatch(simpan.id)
  hasil.dibatalkanKembali = nilaiDi(a.nim, k1) === lamaA && nilaiDi(b.nim, k2) === lamaB
  hasil.riwayatMenandaiBatal = unggahanDosen().find((u) => u.id === simpan.id)?.status === 'dibatalkan'

  pakaiDataContoh()
  return hasil
}

/* Layar Unggah Nilai: berkas CSV dipilih lewat kotak berkas, galatnya tampil dan tombol simpan terkunci, pratinjau
   berkas yang benar tidak menyimpan apa pun sampai tombolnya ditekan. */
export async function ujiLayarUnggah() {
  /* Uji pemilih bahasa sebelumnya meninggalkan pilihan EN; tulisan yang dicari di sini berbahasa Indonesia. */
  try {
    localStorage.removeItem('sk5c.bahasa.pilihan')
  } catch {
    /* diabaikan */
  }
  const d = DOSEN[0]
  const [k1] = komponenDosen(d)
  const s = mahasiswaKelas(d).find(bukanFinal(k1))
  const lama = nilaiDi(s.nim, k1)
  const baru = lama === 66 ? 67 : 66

  const { el, lepas } = await pasang('/dosen/nilai')
  const masukan = el.querySelector('input[type="file"]')
  const hasil = { menerimaXlsxDanCsv: /\.xlsx/.test(masukan?.accept ?? '') && /\.csv/.test(masukan?.accept ?? '') }
  const tombolSimpan = () => [...el.querySelectorAll('button')].find((b) => /^Simpan \d+ nilai$/.test(b.textContent.trim()))
  const pilih = async (nama, isi) => {
    Object.defineProperty(masukan, 'files', { value: [new window.File([isi], nama, { type: 'text/csv' })], configurable: true })
    await act(async () => {
      masukan.dispatchEvent(new window.Event('change', { bubbles: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
  }

  await pilih('salah.csv', 'NIM,Nama,' + k1.id + '\n999999999,X,80\n')
  hasil.galatTampil = /Belum bisa disimpan/.test(el.textContent) && /tidak terdaftar di kelas Anda/.test(el.textContent)
  hasil.simpanTerkunciSaatGalat = tombolSimpan()?.disabled === true

  await pilih('xls-lama.xls', 'bukan excel')
  hasil.xlsLamaDitolak = /Excel lama/.test(el.textContent)

  await pilih('benar.csv', 'NIM,Nama,' + k1.id + '\n' + s.nim + ',"' + s.name + '",' + baru + '\n')
  hasil.pratinjauTampil = /Periksa sebelum menyimpan/.test(el.textContent) && tombolSimpan()?.textContent.trim() === 'Simpan 1 nilai'
  hasil.belumTersimpanSebelumKlik = nilaiDi(s.nim, k1) === lama

  await klik(tombolSimpan())
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30))
  })
  hasil.tersimpanSetelahKlik = nilaiDi(s.nim, k1) === baru
  hasil.pesanBerhasil = /1 nilai tersimpan dan sudah tampil di transkrip mahasiswa/.test(el.textContent)
  hasil.pratinjauDitutup = !/Periksa sebelum menyimpan/.test(el.textContent)
  hasil.riwayatBertambah = !/Belum ada unggahan/.test(el.textContent)
  lepas()

  /* Kelas kosong (temuan 25 Oktober): halaman menjelaskan sebabnya dan tidak menawarkan templat berisi 0 mahasiswa
     maupun kotak unggah. Kelas otomatis yang kosong, lalu angkatan pilihan yang belum berisi mahasiswa. */
  const sesiAsli = window.localStorage.getItem('sk5c.session')
  const layarKosong = async (ubah) => {
    window.localStorage.setItem('sk5c.session', JSON.stringify({ ...JSON.parse(sesiAsli), ...ubah }))
    const h = await pasang('/dosen/nilai')
    const teks = h.el.textContent
    const tanpaUnggah =
      !h.el.querySelector('input[type="file"]') && ![...h.el.querySelectorAll('button')].some((b) => /Unduh templat/.test(b.textContent))
    h.lepas()
    return { teks, tanpaUnggah }
  }
  const otomatis = await layarKosong({ prodi: 'Prodi Tanpa Mahasiswa' })
  hasil.kelasKosongOtomatis =
    /Belum ada mahasiswa di kelas Anda/.test(otomatis.teks) && /minta Super Admin memilihnya/.test(otomatis.teks) && otomatis.tanpaUnggah
  const pilihan = await layarKosong({ angkatan: ['1999'] })
  hasil.kelasKosongPilihan =
    /Belum ada mahasiswa di kelas Anda/.test(pilihan.teks) && /Angkatan yang Anda ampu \(1999\)/.test(pilihan.teks) && pilihan.tanpaUnggah
  window.localStorage.setItem('sk5c.session', sesiAsli)

  pakaiDataContoh()
  return hasil
}

/* Beberapa mahasiswa nyata untuk menguji identitas sesi. */
export function daftarUji() {
  const pilih = (f) => STUDENTS.find(f)
  return [
    pilih((m) => m.id === 'DEMO-2'),
    pilih((m) => m.program === 'Perhotelan'),
    pilih((m) => m.program === 'Jurnalistik'),
  ].filter(Boolean)
}

/* Satu mahasiswa dari tiap angkatan — untuk cabang tampilan yang bergantung
   pada posisi semester (baru mulai, di tengah, di akhir, sudah tamat). */
export function perAngkatan() {
  const hasil = []
  for (const m of STUDENTS) {
    if (!hasil.some((x) => x.angkatanId === m.angkatanId)) hasil.push(m)
  }
  return hasil
}
