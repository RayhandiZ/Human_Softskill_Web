// Paling awal: uji berjalan tanpa server (lihat scripts/modeLokal.js).
import './modeLokal'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import Penyedia from '../app/penyedia'
import { RequireRole, panelPengguna } from '../src/lib/auth'
import { AUDIT_LOG, COHORTS, MASTER_AWAL, STUDENTS, getStudent, getStudentByNim, isiData, isiMaster, pengumpulanDosen, resetTranskripCache } from '../src/lib/data'
import { getAspekList, getKomponen, getKomponenById, isiKurikulum } from '../src/lib/curriculum'
import { bobotKomponen } from '../src/lib/scoring'
import { DATA_CONTOH, DOSEN, PERSONA_SEMESTER, getDosenByEmail, getStudentByEmail } from './dataContoh'
import { AKUN_LOKAL, PERMINTAAN, bersihkanPerubahan, muatAkses, permintaanMenunggu } from '../src/lib/store'
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
import SuperLayout from '../src/halaman/super/SuperLayout'
import Kendali from '../src/halaman/super/Kendali'
import Wewenang from '../src/halaman/super/Wewenang'
import Aturan from '../src/halaman/super/Aturan'
import PenilaianSuper from '../src/halaman/super/Penilaian'
import Akses from '../src/halaman/super/Akses'
import DosenLayout from '../src/halaman/dosen/DosenLayout'
import Masuk from '../src/halaman/dosen/Masuk'
import NilaiDosen from '../src/halaman/dosen/Nilai'
import UsulanDosen from '../src/halaman/dosen/Usulan'

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
  '/super': { pohon: () => superAdmin(<Kendali />) },
  '/super/persetujuan': { pohon: () => superAdmin(<PersetujuanAdmin />) },
  '/super/penilaian': { pohon: () => superAdmin(<PenilaianSuper />) },
  '/super/akses': { pohon: () => superAdmin(<Akses />) },
  '/super/log': { pohon: () => superAdmin(<Log />) },
  '/super/wewenang': { pohon: () => superAdmin(<Wewenang />) },
  '/super/aturan': { pohon: () => superAdmin(<Aturan />) },
  '/super/profil': { pohon: () => superAdmin(<Profil />) },
  '/dosen': { pohon: () => dosen(<Masuk />) },
  '/dosen/nilai': { pohon: () => dosen(<NilaiDosen />) },
  '/dosen/usulan': { pohon: () => dosen(<UsulanDosen />) },
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
  for (const nama of ['Semua', 'Final', 'Berjalan', 'Terkunci']) {
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
    (li) => /belum dikunci/.test(li.textContent) && !/disetujui oleh/.test(li.textContent),
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
  hasil.adaSiapDikunci = /siap dikunci/.test(panel()?.textContent ?? '')

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
  const pilihan = [...el.querySelectorAll('select')].map((x) => x.value)
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
export async function ujiKeputusanKoreksi(alamat) {
  /* Alamat lengkap, bukan sekadar ?tab=koreksi: area kerja halaman ini memang
     tertutup sampai semester dipilih — persis seperti tautan yang disusun
     lonceng. */
  const { el, lepas } = await pasang(alamat)

  const tombol = [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Setujui')
  const hasil = { adaTombol: tombol.length > 0, galat: null }

  /* Galat saat menekan tidak boleh ditelan diam-diam — itu justru yang diuji. */
  const asalOnError = window.onerror
  window.onerror = (pesan) => {
    hasil.galat = String(pesan)
    return true
  }
  try {
    await klik(tombol[0])
  } catch (e) {
    hasil.galat = e.message
  }
  window.onerror = asalOnError

  hasil.adaLencanaDisetujui = /Disetujui/.test(el.textContent)
  hasil.tombolnyaHilang =
    [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Setujui').length <
    tombol.length

  lepas()
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
 * Tombol "Segarkan data" di Data Mahasiswa.
 *
 * Yang diuji bukan keberadaan tombolnya, melainkan akibatnya: penanda waktu
 * baru muncul SETELAH ditekan. Kalau penandanya sudah ada sejak awal, tombol
 * itu hanya hiasan yang mengaku melakukan sesuatu.
 */
export async function ujiSegarkanData() {
  const { el, lepas } = await pasang('/admin/mahasiswa')
  const hasil = {}

  const tombol = [...el.querySelectorAll('button')].find((b) =>
    b.textContent.includes('Segarkan data'),
  )
  hasil.adaTombol = !!tombol
  hasil.tanpaPenandaAwal = !/Terakhir disegarkan/.test(el.textContent)

  await klik(tombol)
  hasil.adaPenandaSesudah = /Terakhir disegarkan \d{2}[.:]\d{2}/.test(el.textContent)

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
  hasil.tampilDiLayarLebar = !!tombol && !tombol.className.split(' ').includes('md:hidden')

  await klik(tombol)
  const panel = el.querySelector('[role="dialog"][aria-label="Menu navigasi"]')
  hasil.terbuka = !!panel
  hasil.panelGelap = !!panel && /bg-brand-deep/.test(panel.className)

  const teks = panel?.textContent ?? ''
  hasil.adaJudulKelompok = /Workspace/.test(teks) && /Rujukan/.test(teks)

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

  /* ----------------------------- more pages ------------------------------ */
  const tombolHalaman = el.querySelector('button[aria-controls="halaman-lain"]')
  const kartuTersembunyi = () =>
    [...el.querySelectorAll('#halaman-lain > li')].filter((li) =>
      li.className.split(' ').includes('hidden'),
    ).length

  hasil.halaman = {
    adaTombol: !!tombolHalaman,
    tombolKhususPonsel:
      !!tombolHalaman && tombolHalaman.closest('li').className.split(' ').includes('sm:hidden'),
    /* Jumlahnya dihitung dari daftar itu sendiri: satu kartu selalu terlihat,
       sisanya terlipat. Menuliskan angkanya sebagai tetapan membuat uji ini
       pecah setiap kali ada halaman baru ditambahkan — padahal yang ingin
       dijaga adalah perilakunya, bukan banyaknya kartu. */
    terlipatAwal: kartuTersembunyi() === el.querySelectorAll('#halaman-lain > li').length - 2,
    /* Dicocokkan per kata, bukan per potongan teks: 'sm:hidden' pada baris
       tombol mengandung kata 'hidden' tetapi bukan kelas yang dimaksud. */
    tetapUtuhDiLayarLebar: [...el.querySelectorAll('#halaman-lain > li')].every((li) => {
      const kelas = li.className.split(' ')
      return !kelas.includes('hidden') || kelas.includes('sm:block')
    }),
  }
  await klik(tombolHalaman)
  hasil.halaman.tidakAdaYangTersembunyiSesudah = kartuTersembunyi() === 0

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
const KATA_STATUS = ['Final', 'Sementara', 'Belum dinilai', 'Menunggu nilai', 'Terkunci']

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
  const daftarKolom = el.querySelector('[role="list"][aria-label="Nilai per semester"]')
  const grafik = daftarKolom ? daftarKolom.parentElement : null
  const wadah = grafik ? grafik.parentElement.parentElement : null
  const svg = grafik ? grafik.querySelector('svg') : null

  /* Titiknya span HTML mutlak di dalam bidang, bukan <circle>. Dua seri dibedakan dari warnanya. */
  const semuaTitik = grafik
    ? [...grafik.querySelectorAll('span[style*="left"]')].filter((n) => /rounded-full/.test(n.className))
    : []
  const seriTitik = (warna) => semuaTitik.filter((n) => (n.style.background || n.style.borderColor).includes(warna))
  const titikSemester = seriTitik('brand-ink')
  const titikKumulatif = seriTitik('text-muted')

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
    adaTren: /Nilai per semester/.test(judul),
    adaSebaran: /Sebaran nilai aspek/.test(judul),
    legenda: /Nilai semester/.test(wadah?.textContent ?? '') && /Nilai kumulatif/.test(wadah?.textContent ?? ''),
    jumlahTitikSemester: titikSemester.length,
    jumlahTitikKumulatif: titikKumulatif.length,
    jumlahJalur: jalur.length,
    jumlahRuas: (d.match(/[CL]/g) ?? []).length,
    garisTakTeregang: jalur.every((n) => n.getAttribute('vector-effect') === 'non-scaling-stroke'),
    takTerisi: jalur.every((n) => n.getAttribute('fill') === 'none'),
    takMelampaui: takMelampauiSeri('brand-ink', titikSemester) && takMelampauiSeri('text-muted', titikKumulatif),
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
    hasil.titikBerongga = semuaTitik.filter((n) => n.className.includes('bg-surface')).length
    hasil.labelTerpilihTebal = labelSemester.some((n) => n.className.includes('font-bold'))
    // Kumulatif di semester terakhir harus sama persis dengan angka besar.
    const m = isi.match(/Nilai kumulatif:(\d+)/)
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
  hasil.terkunciTertulis = /Terkunci/.test(kartuDari(el, '2024')?.textContent ?? '')

  await klik(kartuDari(el, '2025'))
  const k2025 = kartuDari(el, '2025')
  const rincian = el.querySelector('section[aria-labelledby="judul-rincian-angkatan"]')
  hasil.pilihBerpindah = k2025?.getAttribute('aria-pressed') === 'true' && /^Angkatan 2025$/.test(el.querySelector('#judul-rincian-angkatan')?.textContent ?? '')
  hasil.belumBisaDikunci = /Belum bisa dikunci/.test(rincian?.textContent ?? '') && /baru di Semester 3 dari 3/.test(rincian?.textContent ?? '')
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
  // Admin biasa: angkatan yang sudah lewat Semester 3 tidak dikunci langsung, tetapi "Ajukan penguncian" ke super admin.
  const tombolKunci = () =>
    [...el.querySelectorAll('button[type="submit"]')].find((b) => /Kunci angkatan|Ajukan penguncian/.test(b.textContent))
  const isian = el.querySelector('form input')
  hasil.pratinjauTampil = /Bila dikunci sekarang, \d+ dari \d+ mahasiswa berhak atas sertifikat/.test(el.textContent)
  hasil.ajukanUntukAdminBiasa =
    /Ajukan penguncian/.test(tombolKunci()?.textContent ?? '') && /dikirim ke Super Admin sebagai permintaan/.test(el.textContent)
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
    /Angkatan 2025 sudah dikunci/.test(el.textContent) && COHORTS.find((c) => c.id === '2025')?.status === 'terkunci'
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
    /Perubahan nilai per bulan/.test(el.textContent)

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
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => b.textContent === 'Bobot'))
  const kartuBobot = [...el.querySelectorAll('ul > li > button[aria-pressed="true"]')]
  hasil.bobotTertanam =
    /Cara membagi bobot otomatis/.test(el.textContent) &&
    !/Kurikulum CPMK/.test(el.textContent) &&
    kartuBobot.length === 1 &&
    kartuBobot[0].textContent.includes(aspek2)
  lepas()

  // Akses Pengguna (tanpa server: daftar dari AKUN_LOKAL).
  const [d1, d2] = DOSEN
  AKUN_LOKAL.length = 0
  AKUN_LOKAL.push(
    { id: 11, email: d1.email, peran: 'dosen', aktif: true, nama: d1.nama, nip: d1.nip, prodi: d1.prodi },
    { id: 12, email: d2.email, peran: 'dosen', aktif: false, nama: d2.nama, nip: d2.nip, prodi: d2.prodi },
    { id: 21, email: 'admin@umn.ac.id', peran: 'admin', aktif: true },
    { id: 31, email: 'super.admin@umn.ac.id', peran: 'superadmin', aktif: true },
  )
  ;({ el, lepas } = await pasang('/super/akses'))
  await tunggu()
  const barisAkun = () => [...el.querySelectorAll('ul.divide-y > li')]
  const baris1 = () => barisAkun().find((li) => li.textContent.includes(d1.nama))
  hasil.aksesDaftarDosen =
    barisAkun().length === 2 && /Akses dicabut/.test(el.textContent) && /Punya akses/.test(el.textContent)
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
  await ketik(el.querySelector('input[type="search"]'), d2.nip)
  hasil.cariAkun = barisAkun().length === 1 && barisAkun()[0].textContent.includes(d2.nama)
  await klik([...el.querySelectorAll('[role="tab"]')].find((b) => /Admin Kemahasiswaan/.test(b.textContent)))
  await ketik(el.querySelector('input[type="search"]'), '')
  const barisSuper = barisAkun().find((li) => li.textContent.includes('super.admin@umn.ac.id'))
  hasil.superTidakBisaDicabut =
    barisAkun().length === 2 && Boolean(barisSuper) && !barisSuper.querySelector('button') && /Akun Anda/.test(barisSuper.textContent)
  lepas()
  AKUN_LOKAL.length = 0

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

  hasil.adaJamLayanan = /08\.00/.test(panel()?.textContent ?? '')
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
   Alur lengkap dosen → Kemahasiswaan.

   Yang diuji bukan tampilannya, melainkan JANJI yang dibuat panel dosen:
   nilai yang dikirim TIDAK boleh menyentuh transkrip sebelum disetujui.
   Karena itu tiap langkah diperiksa terhadap data mahasiswa yang sebenarnya,
   bukan terhadap tulisan di layar.
   -------------------------------------------------------------------------- */
export async function ujiAlurDosen() {
  const { statusPengumpulan, usulkanNilai, putuskanUsulan, usulanMenunggu } = await import(
    '../src/lib/store'
  )

  const d = DOSEN[0]
  const nilaiTersimpan = (p) =>
    getStudentByNim(p.nim)?.nilai?.[p.aspekId]?.komponen?.[p.komponenId]?.nilai ?? null

  const antre = pengumpulanDosen(d.nip)
    .filter((p) => statusPengumpulan(p).id === 'masuk')
    .slice(0, 3)

  const hasil = { adaAntrean: antre.length === 3 }

  /* 1. Dosen mengusulkan. */
  const u = await usulkanNilai({
    dosen: d,
    cara: 'manual',
    catatan: 'uji alur',
    entri: antre.map((p) => ({ nim: p.nim, komponenId: p.komponenId, nilai: 88 })),
  })
  hasil.usulanTercatat = u.status === 'menunggu' && u.entri.length === 3
  hasil.belumMasukTranskrip = antre.every((p) => nilaiTersimpan(p) === null)
  hasil.statusJadiMenunggu = antre.every((p) => statusPengumpulan(p).id === 'menunggu')
  hasil.masukAntreanAdmin = usulanMenunggu().some((x) => x.id === u.id)

  /* 2. Kemahasiswaan menyetujui. */
  hasil.disetujui = (await putuskanUsulan(u.id, 'disetujui', { aktor: 'Uji' })) === true
  hasil.masukTranskrip = antre.every((p) => nilaiTersimpan(p) === 88)
  hasil.statusJadiDinilai = antre.every((p) => statusPengumpulan(p).id === 'dinilai')
  hasil.punyaBatch = Boolean(u.batchId)
  hasil.tidakBisaDiputusDuaKali = (await putuskanUsulan(u.id, 'ditolak', { aktor: 'Uji' })) === false

  /* 3. Penolakan tidak mengubah apa pun. */
  const lagi = pengumpulanDosen(d.nip)
    .filter((p) => statusPengumpulan(p).id === 'masuk')
    .slice(0, 2)
  const u2 = await usulkanNilai({
    dosen: d,
    entri: lagi.map((p) => ({ nim: p.nim, komponenId: p.komponenId, nilai: 70 })),
  })
  await putuskanUsulan(u2.id, 'ditolak', { aktor: 'Uji', catatan: 'perlu diperbaiki' })
  hasil.tolakTidakMenulis = lagi.every((p) => nilaiTersimpan(p) === null)
  hasil.statusJadiDitolak = lagi.every((p) => statusPengumpulan(p).id === 'ditolak')

  /* 4. Sistem menahan baris yang melanggar aturan. */
  const u3 = await usulkanNilai({
    dosen: d,
    entri: [{ nim: '999999999', komponenId: antre[0].komponenId, nilai: 90 }],
  })
  try {
    await putuskanUsulan(u3.id, 'disetujui', { aktor: 'Uji' })
    hasil.sistemMenahan = false
  } catch {
    hasil.sistemMenahan = true
  }
  hasil.tetapMenunggu = u3.status === 'menunggu'

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
