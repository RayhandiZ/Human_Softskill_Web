/* Uji sambungan basis data: setiap pintu API dijalankan sungguhan terhadap MySQL.

   Membuat satu akun mahasiswa sementara (NIM berawalan UJI) dan menghapus seluruh jejaknya di
   akhir, berhasil maupun gagal. Butuh MySQL menyala dan `npm run db:seed` sudah pernah dijalankan
   (memakai akun admin@umn.ac.id, super.admin@umn.ac.id, dan simon.petrus@lecturer.umn.ac.id dengan
   sandi umn12345).
   Bagian kurikulum menambah satu indikator dan menimpa dua pengaturan sebentar, lalu mengembalikannya;
   penanda VERSI_KURIKULUM ikut naik dan tidak diturunkan lagi. Bagian bobot mengubah bobot A.1 lewat
   pintu API lalu mengembalikannya; kolom komponen A.1 dan catatan log yang dibuatnya dipulihkan di akhir.
   Bagian penguncian, persetujuan, dan data master membuat beberapa PermintaanAdmin (tanda final, bobot, akses baca
   data master); permintaan dan catatan log-nya ikut dihapus di akhir. Bagian unggahan dosen membuat satu usulan lama
   langsung di basis data untuk diuji keputusannya; usulan itu terhapus bersama mahasiswa uji.
   Bagian periode memindahkan periode akademik satu semester maju lalu kembali; baris Konfigurasi PERIODE_AKTIF
   dikembalikan persis seperti sebelumnya (atau dihapus bila dulu belum ada) dan catatan log-nya dihapus.
   Bagian akses mencabut lalu memulihkan akses akun mahasiswa sementara, lalu membuat tiga akun sementara tanpa
   data (admin, dosen, mahasiswa) lewat /api/akses/tambah dan menghapusnya lewat /api/akses/hapus; log-nya ikut
   dihapus, begitu juga akunnya bila uji berhenti sebelum sempat menghapus.
   Bagian data master memberi lalu mencabut izin lihat data master akun admin uji (nilai kolomnya dikembalikan
   seperti semula), lalu super admin membuat satu angkatan, satu fakultas, satu prodi, dan satu mahasiswa sementara
   lewat /api/master/*; semuanya beserta catatan log-nya dihapus di akhir.
   Bagian aspek CPMK menambah aspek sementara, mengubah strukturnya, dan mengarsipkan lalu memulihkan aspek B4 lewat
   /api/kurikulum/aspek; tabel Aspek dikembalikan persis seperti sebelum bagian itu, komponen aspek sementara dan
   catatan log-nya dihapus, dan penanda VERSI_KURIKULUM dinaikkan.
   Bagian koreksi menerapkan satu nilai lewat persetujuan dua lapis, sebagai batch bercara 'koreksi' milik mahasiswa
   uji. Bagian akses cetak sertifikat mengesahkan angkatan sementara ANG_C langsung di basis data dan memberi akun
   mahasiswa lengkapnya sandi supaya bisa masuk; permintaan sertifikat (termasuk yang dicabut) dan catatan log-nya
   (keputusan, pencabutan, pembukaan cetak) terhapus bersama mahasiswa dan angkatan sementara itu.
   Bagian kelas dosen membuat akun dosen sementara (uji.kelas.dosen.*) yang mengampu ANG_A, mengajukan perbaikan nilai
   NIM2 yang lalu disetujui dan dibatalkan lagi; permintaan, log, dan akunnya dihapus di akhir. */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from '../src/server/db.js'
import * as masuk from '../app/api/masuk/route.js'
import * as keluar from '../app/api/keluar/route.js'
import * as sesi from '../app/api/sesi/route.js'
import * as data from '../app/api/data/route.js'
import * as nilai from '../app/api/nilai/route.js'
import * as rollback from '../app/api/nilai/rollback/route.js'
import * as penguncian from '../app/api/penguncian/route.js'
import * as koreksi from '../app/api/koreksi/route.js'
import * as keputusanKoreksi from '../app/api/koreksi/keputusan/route.js'
import * as sertifikat from '../app/api/sertifikat/route.js'
import * as keputusanSertifikat from '../app/api/sertifikat/keputusan/route.js'
import * as cabutSertifikat from '../app/api/sertifikat/cabut/route.js'
import * as cetakSertifikat from '../app/api/sertifikat/cetak/route.js'
import * as nilaiDosen from '../app/api/nilai/dosen/route.js'
import * as keputusanUsulan from '../app/api/usulan/keputusan/route.js'
import * as profil from '../app/api/profil/route.js'
import * as angkatanPratinjau from '../app/api/angkatan/pratinjau/route.js'
import * as angkatanKunci from '../app/api/angkatan/kunci/route.js'
import * as log from '../app/api/log/route.js'
import * as angkatanRingkasan from '../app/api/angkatan/route.js'
import * as bobot from '../app/api/kurikulum/bobot/route.js'
import * as keputusanPermintaan from '../app/api/persetujuan/keputusan/route.js'
import * as batalPermintaan from '../app/api/persetujuan/batal/route.js'
import * as penilaian from '../app/api/kurikulum/penilaian/route.js'
import * as periode from '../app/api/periode/route.js'
import * as akses from '../app/api/akses/route.js'
import * as ubahAkses from '../app/api/akses/ubah/route.js'
import * as tambahAkses from '../app/api/akses/tambah/route.js'
import * as hapusAkses from '../app/api/akses/hapus/route.js'
import * as izinAkses from '../app/api/akses/izin/route.js'
import * as kelasAkses from '../app/api/akses/kelas/route.js'
import * as masterAngkatan from '../app/api/master/angkatan/route.js'
import * as masterProdi from '../app/api/master/prodi/route.js'
import * as masterMahasiswa from '../app/api/master/mahasiswa/route.js'
import * as masterAkses from '../app/api/master/akses/route.js'
import * as aspekRoute from '../app/api/kurikulum/aspek/route.js'
import { idAspekBaru } from '../src/lib/aspek.js'
import { hitungTranskrip } from '../src/lib/scoring.js'
import {
  KOMPONEN,
  KOMPONEN_BAWAAN,
  KUNCI_VERSI_KURIKULUM,
  KURIKULUM_TERPASANG,
  getAspek,
  getAspekList,
  getIndikator,
  getKomponen,
  isiKurikulum,
} from '../src/lib/curriculum.js'
import { susunanBobot } from '../src/lib/bobot.js'
import { susunanPenilaian } from '../src/lib/penilaian.js'
import { bobotKomponen } from '../src/lib/scoring.js'
import { CONFIG } from '../src/lib/config.js'
import { KUNCI_PERIODE, PERIODE_AKTIF, periodeSetelah, samaPeriode } from '../src/lib/data.js'
import { ambilKurikulum, ambilPeriode } from '../src/server/kurikulum.js'
import { ambilMaster } from '../src/server/master.js'
import { tangani } from '../src/server/api.js'
import { cookieSesi } from '../src/server/sesi.js'

const PINTU = {
  '/api/masuk': masuk,
  '/api/keluar': keluar,
  '/api/sesi': sesi,
  '/api/data': data,
  '/api/nilai': nilai,
  '/api/nilai/rollback': rollback,
  '/api/penguncian': penguncian,
  '/api/koreksi': koreksi,
  '/api/koreksi/keputusan': keputusanKoreksi,
  '/api/sertifikat': sertifikat,
  '/api/sertifikat/keputusan': keputusanSertifikat,
  '/api/sertifikat/cabut': cabutSertifikat,
  '/api/sertifikat/cetak': cetakSertifikat,
  '/api/nilai/dosen': nilaiDosen,
  '/api/usulan/keputusan': keputusanUsulan,
  '/api/profil': profil,
  '/api/angkatan/pratinjau': angkatanPratinjau,
  '/api/angkatan/kunci': angkatanKunci,
  '/api/log': log,
  '/api/angkatan': angkatanRingkasan,
  '/api/kurikulum/bobot': bobot,
  '/api/persetujuan/keputusan': keputusanPermintaan,
  '/api/persetujuan/batal': batalPermintaan,
  '/api/kurikulum/penilaian': penilaian,
  '/api/periode': periode,
  '/api/akses': akses,
  '/api/akses/ubah': ubahAkses,
  '/api/akses/tambah': tambahAkses,
  '/api/akses/hapus': hapusAkses,
  '/api/akses/izin': izinAkses,
  '/api/akses/kelas': kelasAkses,
  '/api/master/angkatan': masterAngkatan,
  '/api/master/prodi': masterProdi,
  '/api/master/mahasiswa': masterMahasiswa,
  '/api/master/akses': masterAkses,
  '/api/kurikulum/aspek': aspekRoute,
}

/* Akun Kemahasiswaan untuk uji. Bawaannya akun dari npm run db:seed; basis data yang akunnya sudah diganti
   bisa memakai yang lain, misalnya: UJI_ADMIN_EMAIL=admin1@umn.ac.id npm run test:db (sandi tetap umn12345). */
const EMAIL_ADMIN = process.env.UJI_ADMIN_EMAIL || 'admin@umn.ac.id'

let gagal = 0
const cek = (nama, ok, rinci = '') => {
  if (!ok) gagal++
  console.log((ok ? 'LULUS ' : 'GAGAL ') + nama + (ok || rinci === '' ? '' : '  → ' + rinci))
}
const garis = (t) => console.log('\n' + '─'.repeat(74) + '\n' + t + '\n' + '─'.repeat(74))

/** Satu "peramban" dengan cookie-nya sendiri. */
function peramban() {
  let cookie = ''
  return async (alamat, { metode = 'GET', isi } = {}) => {
    const r = await PINTU[alamat][metode](
      new Request('http://localhost' + alamat, {
        method: metode,
        headers: { cookie, 'content-type': 'application/json' },
        body: metode === 'GET' ? undefined : JSON.stringify(isi ?? {}),
      }),
    )
    const pasang = r.headers.get('set-cookie')
    if (pasang) cookie = pasang.split(';')[0].endsWith('=') ? '' : pasang.split(';')[0]
    return { status: r.status, isi: await r.json().catch(() => ({})) }
  }
}

const NIM = 'UJI' + Date.now().toString().slice(-7)
const EMAIL = 'uji.' + NIM.toLowerCase() + '@student.umn.ac.id'
let mahasiswaId = null

/* Bagian "kunci angkatan" memakai dua angkatan sementara dan satu mahasiswa sementara tambahan, supaya
   angkatan asli di basis data tidak ikut terkunci. Semuanya dihapus di bersihkan(). */
const SUF = Date.now().toString().slice(-6)
const NIM2 = NIM + 'K'
const EMAIL2 = 'uji.' + NIM2.toLowerCase() + '@student.umn.ac.id'
const ANG_A = 'UJIA' + SUF
const ANG_B = 'UJIB' + SUF
const ANG_C = 'UJIC' + SUF
const NIM3 = NIM + 'L'
const EMAIL3 = 'uji.' + NIM3.toLowerCase() + '@student.umn.ac.id'
/* Bagian "kurikulum" memakai satu indikator sementara dan menimpa dua baris Konfigurasi. */
const IND_UJI = 'UJI-IND-' + SUF
const KONFIGURASI_UJI = ['AMBANG_SERTIFIKAT', 'TOTAL_SEMESTER_PROGRAM']
/** Baris Konfigurasi sebelum disentuh uji ({ kunci: baris | null }); undefined = belum disentuh. */
let konfigurasiAsli
/* Bagian "bobot": baris komponen A.1 sebelum disentuh uji, dan id log UBAH_BOBOT yang dibuat uji. */
let komponenA1Asli
const logBobotUji = []
/* Bagian "persetujuan": id PermintaanAdmin yang dibuat uji; log-nya bertarget 'permintaan P-..' (lihat targetLog). */
const permintaanUji = []
/* Bagian "penilaian": baris komponen dan Aspek C2 sebelum disentuh uji, komponen buatan uji, dan log-nya. */
let penilaianAsli
const komponenUji = []
const logPenilaianUji = []
/* Bagian "periode": baris Konfigurasi PERIODE_AKTIF sebelum disentuh uji (null = belum ada), dan log-nya. */
let periodeAsli
const logPeriodeUji = []
/* Bagian "hapus akun": tiga akun sementara tanpa data. NIM wajib angka, jadi berawalan 99999, bukan UJI. */
const HAPUS_UJI = {
  admin: { email: 'uji.hapus.admin.' + SUF + '@umn.ac.id' },
  dosen: { email: 'uji.hapus.dosen.' + SUF + '@lecturer.umn.ac.id', nip: 'UJIHAPUS' + SUF },
  mahasiswa: { email: 'uji.hapus.mhs.' + SUF + '@student.umn.ac.id', nim: '99999' + SUF },
}
/* Bagian "kelas dosen": satu akun dosen sementara yang mengampu ANG_A (angkatan selesai dan disahkan). */
const DOSEN_KELAS = { email: 'uji.kelas.dosen.' + SUF + '@lecturer.umn.ac.id', nip: 'UJIKELAS' + SUF, sandi: 'uji-kelas-' + SUF }
/* Bagian "data master": nama fakultas/prodi dan akun mahasiswa sementara (NIM wajib angka), id angkatan yang
   dibuat uji, id log yang dibuatnya, dan izin admin uji sebelum disentuh (undefined = belum disentuh). */
const FAK_UJI = 'Fakultas Uji ' + SUF
const FAK_UJI_B = FAK_UJI + ' B'
const PRODI_UJI = 'Prodi Uji ' + SUF
const PRODI_UJI_B = PRODI_UJI + ' B'
const EMAIL_DM = 'uji.master.' + SUF + '@student.umn.ac.id'
const NIM_DM = '99998' + SUF
const angkatanUji = []
const logDataMasterUji = []
let izinAdminAsli
/* Bagian "aspek CPMK": seluruh baris Aspek sebelum disentuh (undefined = belum disentuh), ID aspek sementara (komponennya
   dihapus di akhir), dan id log yang dibuat bagian itu. */
let aspekAsliUji
const aspekUji = []
const logAspekUji = []
/** Target baris LogAktivitas yang dibuat uji ini; ditambah id batch begitu diketahui. */
const targetLog = [
  'fakultas ' + FAK_UJI,
  'fakultas ' + FAK_UJI_B,
  'prodi ' + PRODI_UJI,
  'prodi ' + PRODI_UJI_B,
  'akun ' + EMAIL_DM,
  'angkatan ' + ANG_A,
  'angkatan ' + ANG_B,
  'mahasiswa ' + NIM,
  'mahasiswa ' + NIM2,
  'akun ' + EMAIL,
  ...Object.values(HAPUS_UJI).map((a) => 'akun ' + a.email),
  'akun ' + DOSEN_KELAS.email,
]

async function bersihkanMahasiswa(email) {
  const p = await db.pengguna.findUnique({ where: { email }, include: { mahasiswa: true } })
  const m = p?.mahasiswa
  if (m) {
    const batch = (await db.auditLog.findMany({ where: { mahasiswaId: m.id }, select: { batchId: true } }))
      .map((a) => a.batchId)
      .filter(Boolean)
    const usulanId = (await db.usulanEntri.findMany({ where: { nim: m.nim }, select: { usulanId: true } })).map((e) => e.usulanId)
    // Setiap batch kini punya catatan Log Aktivitas (SIMPAN_NILAI, BATALKAN_BATCH, dan yang data terkunci).
    await db.logAktivitas.deleteMany({ where: { target: { in: [...new Set(batch)].map((id) => 'batch ' + id) } } })
    await db.nilai.deleteMany({ where: { mahasiswaId: m.id } })
    await db.auditLog.deleteMany({ where: { mahasiswaId: m.id } })
    await db.batch.deleteMany({ where: { id: { in: [...new Set(batch)] } } })
    await db.penguncian.deleteMany({ where: { mahasiswaId: m.id } })
    await db.pengajuanKoreksi.deleteMany({ where: { mahasiswaId: m.id } })
    await db.permintaanSertifikat.deleteMany({ where: { mahasiswaId: m.id } })
    await db.usulan.deleteMany({ where: { id: { in: [...new Set(usulanId)] } } })
    await db.mahasiswa.delete({ where: { id: m.id } })
  }
  if (p) {
    await db.profil.deleteMany({ where: { penggunaId: p.id } })
    await db.pengguna.delete({ where: { id: p.id } })
  }
}

/** Menaikkan penanda versi kurikulum supaya pemuat membaca ulang. Versi tidak pernah diturunkan. */
async function naikkanVersi() {
  const v = await db.konfigurasi.findUnique({ where: { kunci: KUNCI_VERSI_KURIKULUM } })
  if (v) await db.konfigurasi.update({ where: { kunci: KUNCI_VERSI_KURIKULUM }, data: { nilai: (Number(v.nilai) || 0) + 1 } })
}

async function pulihkanKurikulum() {
  let berubah = (await db.indikator.deleteMany({ where: { id: IND_UJI } })).count > 0
  if (konfigurasiAsli) {
    for (const kunci of KONFIGURASI_UJI) {
      const baris = konfigurasiAsli[kunci]
      if (baris) await db.konfigurasi.upsert({ where: { kunci }, update: { nilai: baris.nilai }, create: baris })
      else await db.konfigurasi.deleteMany({ where: { kunci } })
    }
    konfigurasiAsli = undefined
    berubah = true
  }
  if (berubah) await naikkanVersi()
}

/** Bobot dan jejak pengubah komponen A.1 dikembalikan persis seperti sebelum uji, lalu versi dinaikkan. */
async function pulihkanBobot() {
  if (komponenA1Asli) {
    for (const k of komponenA1Asli) {
      await db.komponen.update({
        where: { id: k.id },
        data: { bobot: k.bobot, diubahOleh: k.diubahOleh, diubahPada: k.diubahPada },
      })
    }
    komponenA1Asli = undefined
    await naikkanVersi()
  }
  if (logBobotUji.length) await db.logAktivitas.deleteMany({ where: { id: { in: logBobotUji } } })
}

/** Komponen C2 dikembalikan persis seperti sebelum uji, komponen buatan uji dihapus, teks aspek C2 dipulihkan. */
async function pulihkanPenilaian() {
  if (penilaianAsli) {
    if (komponenUji.length) await db.komponen.deleteMany({ where: { id: { in: komponenUji } } })
    for (const k of penilaianAsli.komponen) {
      const { id, ...data } = k
      await db.komponen.update({ where: { id }, data })
    }
    if (penilaianAsli.aspek) {
      const { id, ...data } = penilaianAsli.aspek
      await db.aspek.update({ where: { id }, data })
    } else {
      await db.aspek.deleteMany({ where: { id: 'C2' } })
    }
    penilaianAsli = undefined
    await naikkanVersi()
  }
  if (logPenilaianUji.length) await db.logAktivitas.deleteMany({ where: { id: { in: logPenilaianUji } } })
}

/** Baris Konfigurasi PERIODE_AKTIF dikembalikan persis seperti sebelum uji (atau dihapus bila dulu tidak ada). */
async function pulihkanPeriode() {
  if (periodeAsli !== undefined) {
    if (periodeAsli) await db.konfigurasi.upsert({ where: { kunci: KUNCI_PERIODE }, update: { nilai: periodeAsli.nilai }, create: periodeAsli })
    else await db.konfigurasi.deleteMany({ where: { kunci: KUNCI_PERIODE } })
    periodeAsli = undefined
  }
  if (logPeriodeUji.length) await db.logAktivitas.deleteMany({ where: { id: { in: logPeriodeUji } } })
}

/** Izin admin uji dikembalikan, lalu mahasiswa, angkatan, prodi, fakultas, dan log buatan bagian data master dihapus. */
async function pulihkanDataMaster() {
  if (izinAdminAsli !== undefined) {
    await db.pengguna.updateMany({ where: { email: EMAIL_ADMIN }, data: { kelolaMaster: izinAdminAsli } })
    izinAdminAsli = undefined
  }
  await bersihkanMahasiswa(EMAIL_DM)
  if (angkatanUji.length) await db.angkatan.deleteMany({ where: { id: { in: angkatanUji }, mahasiswa: { none: {} } } })
  await db.programStudi.deleteMany({ where: { nama: { in: [PRODI_UJI, PRODI_UJI_B] }, mahasiswa: { none: {} }, dosen: { none: {} } } })
  await db.fakultas.deleteMany({ where: { nama: { in: [FAK_UJI, FAK_UJI_B] }, prodi: { none: {} } } })
  if (logDataMasterUji.length) await db.logAktivitas.deleteMany({ where: { id: { in: logDataMasterUji } } })
}

/**
 * Tabel Aspek dikembalikan persis seperti sebelum bagian aspek CPMK (baris baru dihapus, baris lama ditulis ulang),
 * komponen aspek sementara dan log-nya dihapus, lalu versi dinaikkan. Dijalankan sebelum pulihkanPenilaian(), yang
 * mengembalikan teks C2 ke keadaan sebelum bagian penilaian.
 */
async function pulihkanAspekUji() {
  if (aspekAsliUji !== undefined) {
    const asli = new Map(aspekAsliUji.map((a) => [a.id, a]))
    for (const a of await db.aspek.findMany()) {
      if (!asli.has(a.id)) await db.aspek.delete({ where: { id: a.id } })
      else {
        const { id, ...data } = asli.get(a.id)
        await db.aspek.update({ where: { id }, data })
      }
    }
    aspekAsliUji = undefined
    await naikkanVersi()
  }
  if (aspekUji.length) await db.komponen.deleteMany({ where: { aspekId: { in: aspekUji } } })
  if (logAspekUji.length) await db.logAktivitas.deleteMany({ where: { id: { in: logAspekUji } } })
}

async function bersihkan() {
  await pulihkanAspekUji()
  await pulihkanDataMaster()
  await pulihkanPeriode()
  await pulihkanPenilaian()
  await pulihkanBobot()
  await pulihkanKurikulum()
  if (permintaanUji.length) await db.permintaanAdmin.deleteMany({ where: { id: { in: permintaanUji } } })
  await bersihkanMahasiswa(EMAIL)
  await bersihkanMahasiswa(EMAIL2)
  await bersihkanMahasiswa(EMAIL3)
  // Akun bagian hapus akun yang belum sempat terhapus (uji berhenti di tengah), dan dosen bagian kelas dosen. Baris
  // DosenAngkatan-nya ikut terhapus bersama baris Dosen (onDelete Cascade).
  for (const { email } of [...Object.values(HAPUS_UJI), DOSEN_KELAS]) {
    const p = await db.pengguna.findUnique({ where: { email } })
    if (p) await db.dosen.deleteMany({ where: { penggunaId: p.id } })
    await bersihkanMahasiswa(email)
  }
  await db.logAktivitas.deleteMany({ where: { target: { in: targetLog } } })
  await db.angkatan.deleteMany({ where: { id: { in: [ANG_A, ANG_B, ANG_C] } } })
}

try {
  /* ----------------------------- persiapan ----------------------------- */
  garis('PERSIAPAN: akun mahasiswa sementara ' + NIM + ' (Sistem Informasi, semester 2)')
  const prodi = await db.programStudi.findUnique({ where: { nama: 'Sistem Informasi' } })
  const angkatan = (await db.angkatan.findMany()).find((a) => a.periodeSemester === 'GENAP' && a.periodeTahun === '2025/2026')
  if (!prodi || !angkatan) throw new Error('Butuh prodi Sistem Informasi dan angkatan Genap 2025/2026 di basis data.')
  const akunUji = await db.pengguna.create({
    data: {
      email: EMAIL,
      passwordHash: await bcrypt.hash('umn12345', 10),
      peran: 'MAHASISWA',
      mahasiswa: { create: { nim: NIM, nama: 'Mahasiswa Uji', prodiId: prodi.id, angkatanId: angkatan.id } },
    },
    include: { mahasiswa: true },
  })
  mahasiswaId = akunUji.mahasiswa.id
  console.log('angkatan', angkatan.id, '· prodi', prodi.nama)

  const admin = peramban()
  const mhs = peramban()
  const dosen = peramban()
  const tamu = peramban()
  // Super admin: mengubah data mahasiswa yang sudah lewat Semester 3 tanpa antre (admin biasa harus meminta izin).
  const sa = peramban()

  /* ------------------------------ sesi ------------------------------ */
  garis('1. MASUK, SESI, DAN WEWENANG')
  cek('tanpa cookie: /api/data ditolak 401', (await tamu('/api/data')).status === 401)
  cek('sandi salah ditolak', (await tamu('/api/masuk', { metode: 'POST', isi: { email: EMAIL, password: 'salah' } })).status === 401)
  cek('admin masuk', (await admin('/api/masuk', { metode: 'POST', isi: { email: EMAIL_ADMIN, password: 'umn12345' } })).status === 200)
  const masukSA = await sa('/api/masuk', { metode: 'POST', isi: { email: 'super.admin@umn.ac.id', password: 'umn12345' } })
  cek('super admin masuk', masukSA.status === 200)
  cek('mahasiswa uji masuk', (await mhs('/api/masuk', { metode: 'POST', isi: { email: EMAIL, password: 'umn12345' } })).status === 200)
  cek('dosen masuk', (await dosen('/api/masuk', { metode: 'POST', isi: { email: 'simon.petrus@lecturer.umn.ac.id', password: 'umn12345' } })).status === 200)
  const s = await mhs('/api/sesi')
  cek('/api/sesi mengembalikan akun dari basis data', s.status === 200 && s.isi.akun?.mahasiswa?.nim === NIM, JSON.stringify(s.isi))
  cek('mahasiswa tidak boleh menyimpan nilai (403)', (await mhs('/api/nilai', { metode: 'POST', isi: {} })).status === 403)
  cek('dosen tidak boleh memutuskan usulan (403)', (await dosen('/api/usulan/keputusan', { metode: 'POST', isi: {} })).status === 403)
  // Rapat 24 Okt 2026: admin hanya membaca nilai; menyimpan, membatalkan batch, dan memutuskan usulan lama milik super admin.
  cek('admin tidak boleh menyimpan nilai (403)', (await admin('/api/nilai', { metode: 'POST', isi: {} })).status === 403)
  cek('admin tidak boleh membatalkan batch (403)', (await admin('/api/nilai/rollback', { metode: 'POST', isi: {} })).status === 403)
  cek('admin tidak boleh memutuskan usulan lama (403)', (await admin('/api/usulan/keputusan', { metode: 'POST', isi: {} })).status === 403)
  cek('dosen tidak boleh memakai pintu simpan Kemahasiswaan (403)', (await dosen('/api/nilai', { metode: 'POST', isi: {} })).status === 403)
  cek('admin tidak boleh memakai pintu unggahan dosen (403)', (await admin('/api/nilai/dosen', { metode: 'POST', isi: {} })).status === 403)

  /* ------------------------------ data per peran ------------------------------ */
  garis('2. DATA PER PERAN')
  const dAdmin = (await admin('/api/data')).isi
  cek('admin melihat mahasiswa uji', dAdmin.mahasiswa.some((m) => m.nim === NIM))
  const dMhs = (await mhs('/api/data')).isi
  cek('mahasiswa hanya melihat dirinya', dMhs.mahasiswa.length === 1 && dMhs.mahasiswa[0].nim === NIM)
  cek('semester berjalan diturunkan dari angkatan', dMhs.mahasiswa[0].semesterAktif === 2, String(dMhs.mahasiswa[0].semesterAktif))
  const dDosen = (await dosen('/api/data')).isi
  cek('dosen melihat mahasiswa kelasnya', dDosen.mahasiswa.some((m) => m.nim === NIM))
  cek('dosen tidak menerima email mahasiswa', dDosen.mahasiswa.every((m) => m.email === ''))

  /* ------------------------------ simpan & rollback ------------------------------ */
  garis('3. SIMPAN NILAI, BATCH, AUDIT, ROLLBACK')
  // Oleh super admin: sejak rapat 24 Okt 2026 admin hanya membaca nilai (lihat bagian 1).
  const kirimNilai = (n) =>
    sa('/api/nilai', {
      metode: 'POST',
      isi: { sumber: 'MK', semester: 1, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: n }] },
    })
  const sel = () => db.nilai.findUnique({ where: { mahasiswaId_komponenId: { mahasiswaId, komponenId: 'A1-MK-T1' } } })

  const b1 = await kirimNilai(80)
  cek('batch pertama tersimpan', b1.status === 200 && b1.isi.jumlah === 1 && b1.isi.jejak?.[0]?.nilaiBaru === 80, JSON.stringify(b1.isi))
  cek('nilai 80 ada di tabel Nilai', (await sel())?.nilai === 80)
  const b2 = await kirimNilai(90)
  cek('batch kedua menimpa menjadi 90', (await sel())?.nilai === 90)
  cek('audit mencatat nilai lama 80', b2.isi.jejak?.[0]?.nilaiLama === 80)
  const ditolak = await sa('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 3, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'B3-MK-T1', nilai: 70 }] },
  })
  cek('R1: aspek semester 3 ditolak untuk mahasiswa semester 2', ditolak.status === 400, JSON.stringify(ditolak.isi))
  const semSalah = await sa('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 2, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: 70 }] },
  })
  cek('komponen semester 1 ditolak bila batch berlabel semester 2', semSalah.status === 400, JSON.stringify(semSalah.isi))
  const semLuar = await sa('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 99, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: 70 }] },
  })
  cek('semester di luar program ditolak', semLuar.status === 400, JSON.stringify(semLuar.isi))

  await sa('/api/nilai/rollback', { metode: 'POST', isi: { id: b1.isi.id } })
  cek('rollback batch lama tidak menghapus nilai batch sesudahnya', (await sel())?.nilai === 90)
  cek('rollback kedua kalinya ditolak', (await sa('/api/nilai/rollback', { metode: 'POST', isi: { id: b1.isi.id } })).isi.ok === false)
  await sa('/api/nilai/rollback', { metode: 'POST', isi: { id: b2.isi.id } })
  cek('rollback batch terakhir mengosongkan sel', (await sel()) === null)
  const dBatch = (await admin('/api/data')).isi.batch
  cek('admin tetap membaca riwayat batch: keduanya dibatalkan', [b1.isi.id, b2.isi.id].every((id) => dBatch.find((b) => b.id === id)?.status === 'dibatalkan'))
  // Setiap batch tercatat di Log Aktivitas walau tidak menyentuh data terkunci, begitu juga pembatalannya: AuditLog
  // tidak mendapat baris baru saat batch dibatalkan, jadi tanpa catatan ini tidak ada jejak siapa yang membatalkan.
  const logSimpanB1 = await db.logAktivitas.findFirst({ where: { aksi: 'SIMPAN_NILAI', target: 'batch ' + b1.isi.id } })
  cek(
    'simpan nilai tercatat SIMPAN_NILAI beserta sumber, cara, jumlah, dan contohnya',
    logSimpanB1?.rincian?.sumber === 'MK' &&
      logSimpanB1.rincian.cara === 'manual' &&
      logSimpanB1.rincian.jumlahNilai === 1 &&
      logSimpanB1.rincian.contoh?.[0]?.nim === NIM &&
      logSimpanB1.rincian.contoh[0].nilaiBaru === 80,
    JSON.stringify(logSimpanB1?.rincian ?? null),
  )
  const logBatalB1 = await db.logAktivitas.findFirst({ where: { aksi: 'BATALKAN_BATCH', target: 'batch ' + b1.isi.id } })
  cek(
    'pembatalan batch tercatat BATALKAN_BATCH beserta pembuat dan waktu batch-nya',
    logBatalB1?.rincian?.jumlahNilai === 1 && logBatalB1.rincian.dibuatOleh === 'Super Admin' && Boolean(logBatalB1.rincian.dibuatPada),
    JSON.stringify(logBatalB1?.rincian ?? null),
  )
  cek(
    'pembatalan yang ditolak (batch sudah dibatalkan) tidak tercatat lagi',
    (await db.logAktivitas.count({ where: { aksi: 'BATALKAN_BATCH', target: 'batch ' + b1.isi.id } })) === 1,
  )

  /* ------------------------------ penguncian ------------------------------ */
  garis('4. PENGUNCIAN ASPEK')
  await kirimNilai(85)
  const kunciTolak = await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'final' } })
  cek('aspek yang komponennya belum lengkap tidak bisa final, bahkan sebagai permintaan', kunciTolak.status === 400, JSON.stringify(kunciTolak.isi))
  // Tanda dari admin biasa SELALU menjadi permintaan, walau mahasiswanya belum lewat Semester 3.
  cek(
    'tanda dari admin tanpa alasan ditolak (400)',
    (await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'sementara' } })).status === 400,
  )
  const tahanAdmin = await admin('/api/penguncian', {
    metode: 'POST',
    isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'sementara', alasan: 'Uji: tahan sementara menunggu nilai susulan.' },
  })
  if (tahanAdmin.isi?.permintaan?.id) {
    permintaanUji.push(Number(tahanAdmin.isi.permintaan.id.slice(2)))
    targetLog.push('permintaan ' + tahanAdmin.isi.permintaan.id)
  }
  cek(
    'tanda dari admin menjadi permintaan, belum tersimpan',
    tahanAdmin.status === 200 && tahanAdmin.isi.menunggu === true && (await db.penguncian.count({ where: { mahasiswaId } })) === 0,
    JSON.stringify(tahanAdmin.isi),
  )
  const tahan = await sa('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'sementara' } })
  cek('tahan sementara oleh super admin langsung tersimpan', tahan.status === 200 && (await db.penguncian.count({ where: { mahasiswaId } })) === 1)
  const mUji = (await mhs('/api/data')).isi.mahasiswa[0]
  cek('mahasiswa melihat penandaan dan penilainya', mUji.penguncian.A1?.status === 'sementara' && mUji.nilai.A1?.komponen['A1-MK-T1']?.penilai === 'Super Admin', JSON.stringify(mUji.penguncian))
  await sa('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: null } })
  cek('penandaan bisa dilepas', (await db.penguncian.count({ where: { mahasiswaId } })) === 0)

  /* ------------------------------ koreksi ------------------------------ */
  garis('5. PENGAJUAN KOREKSI DUA LAPIS')
  // Rapat 24 Okt 2026: admin biasa meneruskan dengan nilai usulan, super admin menyetujui dan nilainya langsung masuk.
  const ajukanKoreksi = (alasan, nilaiDiharapkan) =>
    mhs('/api/koreksi', { metode: 'POST', isi: { komponenId: 'A1-MK-T1', alasan, nilaiDiharapkan } })
  const k = await ajukanKoreksi('Uji: nilai tugas belum lengkap.', 92)
  cek('mahasiswa mengajukan koreksi', k.status === 200 && /^K-\d+$/.test(k.isi.id), JSON.stringify(k.isi))
  cek('alasan kosong ditolak', (await ajukanKoreksi(' ')).status === 400)
  cek('pengajuan kedua untuk komponen yang sama selagi berjalan ditolak (409)', (await ajukanKoreksi('Uji: pengajuan ganda.')).status === 409)
  const logAjukan = await db.logAktivitas.findMany({ where: { aksi: 'AJUKAN_KOREKSI', target: 'mahasiswa ' + NIM } })
  cek(
    'pengajuan tercatat atas nama mahasiswa beserta nilai saat diajukan dan harapannya; yang ditolak tidak tercatat',
    logAjukan.length === 1 &&
      logAjukan[0].aktorId === akunUji.id &&
      logAjukan[0].rincian?.pengajuan === k.isi.id &&
      logAjukan[0].rincian.nilaiSaatIni === 85 &&
      logAjukan[0].rincian.nilaiDiharapkan === 92 &&
      logAjukan[0].rincian.alasan === 'Uji: nilai tugas belum lengkap.',
    JSON.stringify(logAjukan.map((l) => l.rincian)),
  )
  const koreksiUji = async (p, id = k.isi.id) => (await p('/api/data')).isi.koreksi.find((x) => x.id === id)
  const putuskanK = (p, isi) => p('/api/koreksi/keputusan', { metode: 'POST', isi: { id: k.isi.id, ...isi } })
  cek('admin melihat pengajuannya menunggu lapis pertama', (await koreksiUji(admin))?.status === 'menunggu_admin')
  cek('super admin belum bisa memutuskan lapis pertama', (await putuskanK(sa, { keputusan: 'disetujui', nilaiBaru: 92 })).isi.ok === false)
  cek('menolak dengan alasan kurang dari 10 karakter ditolak (400)', (await putuskanK(admin, { keputusan: 'ditolak', catatan: 'pendek' })).status === 400)
  cek('nilai usulan di luar 0–100 ditolak (400)', (await putuskanK(admin, { keputusan: 'disetujui', nilaiBaru: 120 })).status === 400)
  const teruskan = await putuskanK(admin, { keputusan: 'disetujui', catatan: 'Uji: bukti tugas lengkap.', nilaiBaru: 91 })
  cek('admin meneruskan ke super admin', teruskan.isi.ok === true, JSON.stringify(teruskan.isi))
  const kLapis1 = await koreksiUji(admin)
  cek(
    'menunggu super admin, dengan nilai usulan dan nama admin',
    kLapis1?.status === 'menunggu_superadmin' && kLapis1.nilaiUsulan === 91 && kLapis1.lapis1?.oleh === 'Biro Kemahasiswaan',
    JSON.stringify(kLapis1),
  )
  cek('nilai mahasiswa belum berubah sesudah diteruskan', (await sel())?.nilai === 85)
  cek('admin tidak bisa memutuskan lapis kedua', (await putuskanK(admin, { keputusan: 'disetujui', nilaiBaru: 91 })).isi.ok === false)
  const setujui = await putuskanK(sa, { keputusan: 'disetujui', catatan: 'Uji: diterapkan.' })
  cek('super admin menyetujui', setujui.isi.ok === true, JSON.stringify(setujui.isi))
  const kMhs = await koreksiUji(mhs)
  cek(
    'mahasiswa melihat keputusan, catatan, dan nilai barunya',
    kMhs?.status === 'disetujui' && kMhs.nilaiUsulan === 91 && kMhs.keputusan?.catatan === 'Uji: diterapkan.',
    JSON.stringify(kMhs),
  )
  cek('nilai usulan langsung masuk tabel Nilai', (await sel())?.nilai === 91)
  const batchKoreksi = kMhs?.batchId ? await db.batch.findUnique({ where: { id: kMhs.batchId } }) : null
  const idSuper = (await db.pengguna.findUnique({ where: { email: 'super.admin@umn.ac.id' } })).id
  cek('nilainya tersimpan sebagai batch bercara koreksi milik super admin', batchKoreksi?.cara === 'koreksi' && batchKoreksi.aktorId === idSuper, JSON.stringify(batchKoreksi))
  const logKoreksi = await db.logAktivitas.findMany({ where: { target: 'mahasiswa ' + NIM, aksi: { in: ['TERUSKAN_KOREKSI', 'SETUJUI_KOREKSI'] } } })
  cek(
    'kedua lapis tercatat di log, lapis kedua dengan nilai lama dan baru',
    logKoreksi.some((l) => l.aksi === 'TERUSKAN_KOREKSI' && l.rincian?.nilaiUsulan === 91) &&
      logKoreksi.some((l) => l.aksi === 'SETUJUI_KOREKSI' && l.rincian?.nilaiLama === 85 && l.rincian?.nilaiBaru === 91),
    JSON.stringify(logKoreksi.map((l) => [l.aksi, l.rincian])),
  )
  cek('tidak bisa diputuskan dua kali', (await putuskanK(sa, { keputusan: 'ditolak', catatan: 'Uji: diputuskan dua kali.' })).isi.ok === false)
  const k2 = await ajukanKoreksi('Uji: pengajuan sesudah yang pertama selesai.')
  cek('sesudah diputuskan mahasiswa boleh mengajukan lagi', k2.status === 200, JSON.stringify(k2.isi))
  const tolakK = await admin('/api/koreksi/keputusan', { metode: 'POST', isi: { id: k2.isi.id, keputusan: 'ditolak', catatan: 'Uji: nilai sudah sesuai.' } })
  const k2Mhs = await koreksiUji(mhs, k2.isi.id)
  cek(
    'admin menolak di lapis pertama, mahasiswa membaca alasannya',
    tolakK.isi.ok === true && k2Mhs?.status === 'ditolak' && k2Mhs.keputusan?.catatan === 'Uji: nilai sudah sesuai.' && (await sel())?.nilai === 91,
    JSON.stringify(k2Mhs),
  )

  /* ------------------------------ unggahan dosen ------------------------------ */
  garis('6. UNGGAHAN NILAI DOSEN')
  // Rapat 24 Okt 2026: dosen mengunggah rekap Excel kelasnya dan nilainya langsung tersimpan, tanpa usulan.
  const selUas = () => db.nilai.findUnique({ where: { mahasiswaId_komponenId: { mahasiswaId, komponenId: 'A1-MK-UAS' } } })
  const unggah = (entri) => dosen('/api/nilai/dosen', { metode: 'POST', isi: { entri } })
  const dosenId = (await db.pengguna.findUnique({ where: { email: 'simon.petrus@lecturer.umn.ac.id' } })).id
  const u1 = await unggah([{ nim: NIM, komponenId: 'A1-MK-UAS', nilai: 88 }])
  const uas = await selUas()
  cek('unggahan dosen langsung tersimpan sebagai batch', u1.status === 200 && /^B-/.test(u1.isi.id ?? '') && u1.isi.jumlah === 1, JSON.stringify(u1.isi))
  cek('nilainya tercatat atas nama dosen', uas?.nilai === 88 && uas.penilaiId === dosenId)
  const batchU1 = u1.isi.id ? await db.batch.findUnique({ where: { id: u1.isi.id } }) : null
  cek(
    'batch bercara unggah-dosen, sumber dan semester dari kelas dosen',
    batchU1?.cara === 'unggah-dosen' && batchU1.sumber === 'MK' && batchU1.semester === 1,
    JSON.stringify(batchU1),
  )
  const ulang = await unggah([{ nim: NIM, komponenId: 'A1-MK-UAS', nilai: 88 }])
  cek('unggah ulang nilai yang sama tidak membuat batch baru', ulang.status === 200 && ulang.isi.id === null && ulang.isi.sama === 1, JSON.stringify(ulang.isi))
  cek('komponen di luar kelasnya ditolak', (await unggah([{ nim: NIM, komponenId: 'A4-MK-UTS', nilai: 70 }])).status === 400)
  const luarRentang = await unggah([{ nim: NIM, komponenId: 'A1-MK-UAS', nilai: 120 }])
  cek('nilai di luar 0–100 ditolak beserta NIM dan komponennya', luarRentang.status === 400 && /NIM .*A1-MK-UAS/.test(luarRentang.isi.galat ?? ''), JSON.stringify(luarRentang.isi))
  cek(
    'dua nilai untuk sel yang sama ditolak',
    (await unggah([{ nim: NIM, komponenId: 'A1-MK-UAS', nilai: 70 }, { nim: NIM, komponenId: 'A1-MK-UAS', nilai: 71 }])).status === 400,
  )
  cek('penolakan tidak mengubah nilai', (await selUas())?.nilai === 88)
  const uDosen = (await dosen('/api/data')).isi.unggahan.find((x) => x.id === u1.isi.id)
  cek('dosen melihat unggahannya di riwayat', uDosen?.status === 'tersimpan' && uDosen.jumlah === 1, JSON.stringify(uDosen))
  const rbDosen = await sa('/api/nilai/rollback', { metode: 'POST', isi: { id: u1.isi.id } })
  cek('super admin membatalkan unggahan dosen', rbDosen.isi.ok === true && (await selUas()) === null, JSON.stringify(rbDosen.isi))
  cek('dosen melihat unggahannya dibatalkan', (await dosen('/api/data')).isi.unggahan.find((x) => x.id === u1.isi.id)?.status === 'dibatalkan')

  // Usulan lama (dari sebelum unggahan langsung) tetap bisa diputuskan, kini hanya oleh super admin.
  const dosenRow = await db.dosen.findUnique({ where: { penggunaId: dosenId } })
  const uLama = await db.usulan.create({
    data: { dosenId: dosenRow.id, cara: 'manual', entri: { create: [{ nim: NIM, komponenId: 'A2-MK-UTS', nilai: 75 }] } },
  })
  targetLog.push('usulan U-' + uLama.id)
  const putusLama = (pelaku, isi) => pelaku('/api/usulan/keputusan', { metode: 'POST', isi: { id: 'U-' + uLama.id, ...isi } })
  cek('admin tidak memutuskan usulan lama (403)', (await putusLama(admin, { keputusan: 'ditolak', catatan: 'Uji.' })).status === 403)
  cek('tolak tanpa alasan tidak diterima', (await putusLama(sa, { keputusan: 'ditolak' })).status === 400)
  cek('super admin menolak usulan lama dengan alasan', (await putusLama(sa, { keputusan: 'ditolak', catatan: 'Uji ditolak.' })).isi.ok === true)
  cek('penolakan tidak menulis nilai', (await db.nilai.count({ where: { mahasiswaId, komponenId: 'A2-MK-UTS' } })) === 0)
  const logTolakUsulan = await db.logAktivitas.findFirst({ where: { aksi: 'TOLAK_USULAN', target: 'usulan U-' + uLama.id } })
  cek(
    'penolakan usulan tercatat beserta dosen, jumlah nilai, dan alasannya',
    logTolakUsulan?.aktorId === idSuper &&
      logTolakUsulan.rincian?.dosen === dosenRow.nama &&
      logTolakUsulan.rincian.jumlahNilai === 1 &&
      logTolakUsulan.rincian.alasan === 'Uji ditolak.',
    JSON.stringify(logTolakUsulan?.rincian ?? null),
  )
  const logUnggah = await db.logAktivitas.findFirst({ where: { aksi: 'SIMPAN_NILAI', target: 'batch ' + u1.isi.id } })
  cek(
    'unggahan dosen tercatat SIMPAN_NILAI atas nama dosen, bercara unggah-dosen',
    logUnggah?.aktorId === dosenId && logUnggah.rincian?.cara === 'unggah-dosen' && logUnggah.rincian.jumlahNilai === 1,
    JSON.stringify(logUnggah?.rincian ?? null),
  )
  const logBatalUnggah = await db.logAktivitas.findFirst({ where: { aksi: 'BATALKAN_BATCH', target: 'batch ' + u1.isi.id } })
  cek(
    'pembatalan unggahan tercatat atas nama super admin, dengan dosen sebagai pembuat batch',
    logBatalUnggah?.aktorId === idSuper && logBatalUnggah.rincian?.dibuatOleh === dosenRow.nama,
    JSON.stringify(logBatalUnggah?.rincian ?? null),
  )

  /* ------------------------------ profil ------------------------------ */
  garis('7. PROFIL')
  cek('telepon tidak sah ditolak', (await mhs('/api/profil', { metode: 'PUT', isi: { telepon: 'abc' } })).status === 400)
  await mhs('/api/profil', { metode: 'PUT', isi: { telepon: '021 5422 0808', ponsel: '', alamat: 'Gading Serpong', foto: null, fotoSumber: null } })
  const pr = (await mhs('/api/data')).isi.profil
  cek('profil tersimpan di basis data', pr?.telepon === '021 5422 0808' && pr.alamat === 'Gading Serpong', JSON.stringify(pr))
  // Yang dicatat hanya nama isian yang berubah; nomor dan alamat (data pribadi) tidak masuk log.
  const logProfil = () => db.logAktivitas.findMany({ where: { aksi: 'UBAH_PROFIL', target: 'akun ' + EMAIL }, orderBy: { id: 'asc' } })
  const lp = await logProfil()
  cek(
    'perubahan profil tercatat dengan nama isiannya saja, tanpa isi data pribadi',
    lp.length === 1 &&
      lp[0].aktorId === akunUji.id &&
      JSON.stringify(lp[0].rincian?.diubah) === JSON.stringify(['nomor telepon', 'alamat']) &&
      !/5422|Gading/.test(JSON.stringify(lp[0].rincian)),
    JSON.stringify(lp.map((l) => l.rincian)),
  )
  await mhs('/api/profil', { metode: 'PUT', isi: { telepon: '021 5422 0808', ponsel: '', alamat: 'Gading Serpong', foto: null, fotoSumber: null } })
  cek('menyimpan profil tanpa perubahan apa pun tidak dicatat', (await logProfil()).length === 1)
  const panjang = 'a'.repeat(400)
  const simpanPanjang = await mhs('/api/profil', { metode: 'PUT', isi: { alamat: panjang } })
  cek('alamat 400 karakter tersimpan', simpanPanjang.status === 200, JSON.stringify(simpanPanjang.isi))
  cek('alamat panjang terbaca utuh', (await mhs('/api/data')).isi.profil?.alamat?.length === 400)

  /* ------------------------- kunci angkatan & data terkunci ------------------------- */
  garis('8. KUNCI ANGKATAN DAN PERUBAHAN DATA TERKUNCI')
  // A masuk Ganjil 2024/2025: semester kalendernya sudah lewat 3, jadi boleh dikunci.
  // B masuk Ganjil 2025/2026: masih di semester 3, belum boleh.
  await db.angkatan.createMany({
    data: [
      { id: ANG_A, tahun: 2024, label: 'Uji A ' + SUF, periodeTahun: '2024/2025', periodeSemester: 'GANJIL' },
      { id: ANG_B, tahun: 2025, label: 'Uji B ' + SUF, periodeTahun: '2025/2026', periodeSemester: 'GANJIL' },
    ],
  })
  const akunUji2 = await db.pengguna.create({
    data: {
      email: EMAIL2,
      passwordHash: 'tidak-dipakai',
      peran: 'MAHASISWA',
      mahasiswa: { create: { nim: NIM2, nama: 'Mahasiswa Uji Terkunci', prodiId: prodi.id, angkatanId: ANG_A } },
    },
    include: { mahasiswa: true },
  })
  const mahasiswaId2 = akunUji2.mahasiswa.id
  const adminId = (await db.pengguna.findUnique({ where: { email: EMAIL_ADMIN } })).id
  const saId = (await db.pengguna.findUnique({ where: { email: 'super.admin@umn.ac.id' } })).id
  // ANG_A sudah lewat Semester 3: perubahan datanya oleh admin biasa menjadi permintaan (bagian 15). Aturan
  // penguncian dan data terkunci di bawah diuji lewat super admin, yang tidak pernah tertahan.
  const nilaiMhs2 = () => db.nilai.count({ where: { mahasiswaId: mahasiswaId2 } })
  const logAda = (aksi, target) => db.logAktivitas.findFirst({ where: { aksi, target } })

  // --- pratinjau dan kunci ---
  const pratA = await admin('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: ANG_A } })
  cek(
    'pratinjau: ringkasan benar, nilai bolong tidak menghalangi',
    pratA.status === 200 && pratA.isi.total === 1 && pratA.isi.tidakBerhak === 1 && pratA.isi.komponenKosong === 1 && pratA.isi.bolehDikunci === true,
    JSON.stringify(pratA.isi),
  )
  cek('mahasiswa tidak boleh pratinjau (403)', (await mhs('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: ANG_A } })).status === 403)
  cek('dosen tidak boleh mengunci (403)', (await dosen('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A } })).status === 403)
  const pratB = await admin('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: ANG_B } })
  cek('angkatan yang masih semester 3 belum boleh dikunci', pratB.status === 200 && pratB.isi.bolehDikunci === false, JSON.stringify(pratB.isi))
  cek(
    'kunci ditolak bila semester 3 belum berakhir',
    (await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_B, konfirmasi: 'Uji B ' + SUF } })).status === 400,
  )
  cek(
    'kunci ditolak bila konfirmasi ketik salah',
    (await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'salah' } })).status === 400,
  )
  cek('angkatan tidak dikenal 404', (await admin('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: 'TIDAK-ADA' } })).status === 404)

  const kunciA = await sa('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'Uji A ' + SUF } })
  const barisA = await db.angkatan.findUnique({ where: { id: ANG_A } })
  cek(
    'angkatan terkunci beserta pencatat dan waktunya',
    kunciA.status === 200 && kunciA.isi.ok === true && barisA.status === 'TERKUNCI' && barisA.dikunciOleh === saId && barisA.dikunciPada != null,
    JSON.stringify(kunciA.isi),
  )
  cek('penguncian angkatan tercatat di log', Boolean(await logAda('KUNCI_ANGKATAN', 'angkatan ' + ANG_A)))
  cek('mengunci dua kali ditolak (ok false)', (await sa('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'Uji A ' + SUF } })).isi.ok === false)
  const dataAdmin = (await admin('/api/data')).isi
  cek('data admin menunjukkan status angkatan terkunci', dataAdmin.mahasiswa.find((m) => m.nim === NIM2)?.statusAngkatan === 'terkunci')

  // --- (super) admin mengubah / melengkapi data terkunci, wajib beralasan ---
  const isiTerkunci = (komponenId, nilaiBaru, alasan) =>
    sa('/api/nilai', {
      metode: 'POST',
      isi: { sumber: 'MK', semester: 1, angkatanId: ANG_A, cara: 'manual', entri: [{ nim: NIM2, komponenId, nilai: nilaiBaru }], alasan },
    })
  const tanpaAlasan = await isiTerkunci('A1-MK-T1', 80)
  cek('angkatan terkunci: isi sel bolong tanpa alasan ditolak', tanpaAlasan.status === 400 && /alasan/i.test(tanpaAlasan.isi.galat ?? ''), JSON.stringify(tanpaAlasan.isi))
  cek('alasan terlalu pendek ditolak', (await isiTerkunci('A1-MK-T1', 80, 'singkat')).status === 400)
  cek('penolakan tidak menulis nilai', (await nilaiMhs2()) === 0)
  const denganAlasan = await isiTerkunci('A1-MK-T1', 80, 'Melengkapi nilai susulan sesudah semester 3.')
  cek('dengan alasan diterima (admin boleh mengisi sel bolong sesudah semester 3)', denganAlasan.status === 200 && (await nilaiMhs2()) === 1, JSON.stringify(denganAlasan.isi))
  targetLog.push('batch ' + denganAlasan.isi.id)
  const logUbah = await logAda('UBAH_DATA_TERKUNCI', 'batch ' + denganAlasan.isi.id)
  cek('perubahan data terkunci tercatat beserta alasannya', logUbah?.rincian?.alasan === 'Melengkapi nilai susulan sesudah semester 3.', JSON.stringify(logUbah?.rincian))

  cek('rollback data terkunci tanpa alasan ditolak', (await sa('/api/nilai/rollback', { metode: 'POST', isi: { id: denganAlasan.isi.id } })).status === 400 && (await nilaiMhs2()) === 1)
  const rbTerkunci = await sa('/api/nilai/rollback', { metode: 'POST', isi: { id: denganAlasan.isi.id, alasan: 'Salah memasukkan nilai, dibatalkan.' } })
  cek('rollback dengan alasan berhasil dan tercatat', rbTerkunci.isi.ok === true && (await nilaiMhs2()) === 0 && Boolean(await logAda('ROLLBACK_DATA_TERKUNCI', 'batch ' + denganAlasan.isi.id)), JSON.stringify(rbTerkunci.isi))

  // --- dosen tanpa angkatan terpilih: kelasnya angkatan yang sedang di semesternya, jadi yang sudah selesai bukan kelasnya ---
  const usulTerkunci = await dosen('/api/nilai/dosen', { metode: 'POST', isi: { entri: [{ nim: NIM2, komponenId: 'A1-MK-UAS', nilai: 70 }] } })
  cek(
    'dosen tanpa angkatan terpilih tidak bisa mengunggah untuk angkatan yang sudah selesai (bukan kelasnya)',
    usulTerkunci.status === 400 && /tidak terdaftar di kelas Anda/.test(usulTerkunci.isi.galat ?? ''),
    JSON.stringify(usulTerkunci.isi),
  )
  const dataDosenA = (await dosen('/api/data')).isi
  cek('dosen tanpa angkatan terpilih tidak melihat angkatan yang sudah selesai, tetap melihat yang berjalan', !dataDosenA.mahasiswa.some((m) => m.nim === NIM2) && dataDosenA.mahasiswa.some((m) => m.nim === NIM))
  cek('penolakan dosen tidak menulis nilai', (await nilaiMhs2()) === 0)

  // --- aspek final MANUAL pada angkatan yang belum terkunci: unggahan dosen diajukan ke super admin (25 Okt 2026) ---
  await db.penguncian.create({ data: { mahasiswaId, aspekId: 'A2', status: 'FINAL', olehId: adminId } })
  const unggahA2 = (alasan) => dosen('/api/nilai/dosen', { metode: 'POST', isi: { entri: [{ nim: NIM, komponenId: 'A2-MK-UTS', nilai: 77 }], alasan } })
  const nilaiA2 = () => db.nilai.count({ where: { mahasiswaId, komponenId: 'A2-MK-UTS' } })
  const dosenFinal = await unggahA2()
  cek('aspek final manual: unggahan dosen tanpa alasan ditahan (400)', dosenFinal.status === 400 && (await nilaiA2()) === 0, JSON.stringify(dosenFinal.isi))
  const dosenFinal2 = await unggahA2('Uji: nilai UTS dikoreksi sesudah peninjauan.')
  if (dosenFinal2.isi.permintaan?.id) {
    permintaanUji.push(Number(dosenFinal2.isi.permintaan.id.slice(2)))
    targetLog.push('permintaan ' + dosenFinal2.isi.permintaan.id)
  }
  cek(
    'aspek final manual: unggahan dosen menjadi permintaan ke super admin, nilainya belum berubah',
    dosenFinal2.status === 200 && dosenFinal2.isi.permintaan?.aksi === 'PERBAIKAN_NILAI_DOSEN' && dosenFinal2.isi.jumlah === 0 && (await nilaiA2()) === 0,
    JSON.stringify(dosenFinal2.isi),
  )
  const tolakA2 = await sa('/api/persetujuan/keputusan', {
    metode: 'POST',
    isi: { id: dosenFinal2.isi.permintaan?.id, keputusan: 'ditolak', catatan: 'Uji: nilai UTS diubah lewat Input Nilai.' },
  })
  cek('super admin menolak permintaan dosen: tidak ada yang berubah', tolakA2.isi.ok === true && (await nilaiA2()) === 0, JSON.stringify(tolakA2.isi))
  const ubahA2 = (alasan) =>
    sa('/api/nilai', {
      metode: 'POST',
      isi: { sumber: 'MK', semester: 1, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A2-MK-UTS', nilai: 77 }], alasan },
    })
  cek('aspek final manual: ubah tanpa alasan ditolak', (await ubahA2()).status === 400)
  const a2 = await ubahA2('Koreksi nilai UTS atas permintaan dosen.')
  cek('aspek final manual: dengan alasan diterima', a2.status === 200, JSON.stringify(a2.isi))
  targetLog.push('batch ' + a2.isi.id)
  cek('aspek tanpa tanda final manual tidak butuh alasan', (await kirimNilai(86)).status === 200)

  // --- penguncian aspek tercatat ---
  const logPenguncian = await db.logAktivitas.count({ where: { aksi: 'UBAH_PENGUNCIAN', target: 'mahasiswa ' + NIM } })
  cek('perubahan tanda penguncian aspek tercatat di log', logPenguncian >= 2, String(logPenguncian))

  /* ------------------------------ log aktivitas ------------------------------ */
  garis('9. LOG AKTIVITAS (BACA, FILTER, PAGINASI)')
  const bacaLog = (isi) => admin('/api/log', { metode: 'POST', isi })
  const tanggalWib = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(d)
  const hariIni = tanggalWib(new Date())
  const besok = tanggalWib(new Date(Date.now() + 24 * 60 * 60 * 1000))

  // --- wewenang ---
  cek('tanpa sesi: log ditolak 401', (await tamu('/api/log', { metode: 'POST', isi: {} })).status === 401)
  cek('mahasiswa tidak boleh membaca log (403)', (await mhs('/api/log', { metode: 'POST', isi: {} })).status === 403)
  cek('dosen tidak boleh membaca log (403)', (await dosen('/api/log', { metode: 'POST', isi: {} })).status === 403)

  // --- masukan yang salah ditolak ---
  cek('jenis log tidak dikenal ditolak', (await bacaLog({ jenis: 'lain' })).status === 400)
  cek('aksi tidak dikenal ditolak', (await bacaLog({ jenis: 'aktivitas', aksi: 'HAPUS_SEMUA' })).status === 400)
  cek('tanggal berbentuk salah ditolak', (await bacaLog({ dari: '09-10-2026' })).status === 400)
  cek('tanggal yang tidak ada di kalender ditolak', (await bacaLog({ dari: '2026-02-31' })).status === 400)
  cek('tanggal awal sesudah tanggal akhir ditolak', (await bacaLog({ dari: '2026-10-10', sampai: '2026-10-01' })).status === 400)
  cek('halaman bukan bilangan bulat ditolak', (await bacaLog({ halaman: 'dua' })).status === 400)

  // --- perubahan nilai (AuditLog) ---
  const totalDb = await db.auditLog.count({ where: { mahasiswaId } })
  const semua = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 100 })
  cek('jenis nilai: total sama dengan isi tabel AuditLog', semua.status === 200 && semua.isi.total === totalDb && semua.isi.baris.length === totalDb, JSON.stringify([totalDb, semua.isi.total]))
  cek('baris nilai memuat nama, aspek, nilai lama dan baru', semua.isi.baris.every((b) => b.nim === NIM && b.nama === 'Mahasiswa Uji' && b.aspek && b.komponen && 'nilaiLama' in b && 'nilaiBaru' in b))
  cek('urutan dari yang terbaru', semua.isi.baris.every((b, i, a) => i === 0 || a[i - 1].waktu >= b.waktu))
  cek('NIM tidak dikenal memberi hasil kosong, bukan semua', (await bacaLog({ jenis: 'nilai', nim: 'TIDAKADA' })).isi.total === 0)

  const jejakB1 = semua.isi.baris.find((b) => b.batchId === b1.isi.id)
  cek('jejak batch yang dibatalkan tetap tampil dan bertanda dibatalkan', jejakB1?.dibatalkan === true, JSON.stringify(jejakB1))
  cek('jejak batch yang masih berlaku tidak bertanda dibatalkan', semua.isi.baris.some((b) => b.dibatalkan === false))
  cek(
    'baris nilai menyebut nama komponen, kode aspek, cara masuk, dan siapa serta kapan batch-nya dibatalkan',
    Boolean(jejakB1?.komponenLabel) &&
      Boolean(jejakB1.aspekKode) &&
      jejakB1.cara === 'manual' &&
      jejakB1.pembatalan?.oleh === 'Super Admin' &&
      Boolean(jejakB1.pembatalan.waktu),
    JSON.stringify(jejakB1),
  )
  cek(
    'baris nilai membawa peran dan email pelakunya',
    semua.isi.baris.every((b) => b.aktorPeran && b.aktorEmail) && jejakB1?.aktorEmail === 'super.admin@umn.ac.id',
  )
  const jejakTerkunci = (await bacaLog({ jenis: 'nilai', nim: NIM2, ukuran: 100 })).isi.baris.find((b) => b.batchId === denganAlasan.isi.id)
  cek(
    'baris nilai data terkunci membawa alasannya dan alasan pembatalannya',
    jejakTerkunci?.alasan === 'Melengkapi nilai susulan sesudah semester 3.' &&
      jejakTerkunci.pembatalan?.alasan === 'Salah memasukkan nilai, dibatalkan.',
    JSON.stringify(jejakTerkunci),
  )

  // --- paginasi ---
  const hal1 = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 2, halaman: 1 })
  const hal2 = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 2, halaman: 2 })
  cek('paginasi: ukuran 2 memberi 2 baris dan jumlah halaman benar', hal1.isi.baris.length === 2 && hal1.isi.jumlahHalaman === Math.ceil(totalDb / 2), JSON.stringify([hal1.isi.baris.length, hal1.isi.jumlahHalaman]))
  cek('paginasi: halaman 2 berisi baris lain dan total tetap', hal2.isi.total === totalDb && hal2.isi.baris.every((b) => !hal1.isi.baris.some((x) => x.id === b.id)))
  const lewat = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 2, halaman: 999 })
  cek('halaman di luar jangkauan kosong tanpa galat', lewat.status === 200 && lewat.isi.baris.length === 0 && lewat.isi.total === totalDb)
  cek('ukuran halaman dibatasi 100', (await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 5000 })).isi.ukuran === 100)

  // --- filter pelaku dan tanggal ---
  const totalAdmin = await db.auditLog.count({ where: { mahasiswaId, aktorId: adminId } })
  const olehAdmin = await bacaLog({ jenis: 'nilai', nim: NIM, aktorId: adminId, ukuran: 100 })
  cek('filter pelaku: hanya perubahan oleh admin', olehAdmin.isi.total === totalAdmin && olehAdmin.isi.total < totalDb && olehAdmin.isi.baris.every((b) => b.aktor === 'Biro Kemahasiswaan'), JSON.stringify([totalAdmin, totalDb]))
  cek('pilihan pelaku memuat admin', semua.isi.pilihanAktor.some((a) => a.id === adminId))
  cek('filter tanggal hari ini (WIB) menemukan perubahan yang baru dibuat', (await bacaLog({ jenis: 'nilai', nim: NIM, dari: hariIni, sampai: hariIni })).isi.total === totalDb)
  cek('filter tanggal besok kosong', (await bacaLog({ jenis: 'nilai', nim: NIM, dari: besok })).isi.total === 0)
  cek('filter tanggal lampau kosong', (await bacaLog({ jenis: 'nilai', nim: NIM, dari: '2000-01-01', sampai: '2000-01-02' })).isi.total === 0)

  // --- semua tindakan (LogAktivitas) ---
  // Disaring per aksi: sejak setiap batch nilai ikut tercatat, catatan hari ini bisa melewati satu halaman 100 baris.
  const akt = await bacaLog({ jenis: 'aktivitas', aksi: 'KUNCI_ANGKATAN', dari: hariIni, ukuran: 100 })
  const barisKunci = akt.isi.baris.find((b) => b.aksi === 'KUNCI_ANGKATAN' && b.target === 'angkatan ' + ANG_A)
  cek('aktivitas: penguncian angkatan terbaca beserta pelakunya', akt.status === 200 && barisKunci?.aktor === 'Super Admin' && barisKunci.rincian?.label === 'Uji A ' + SUF, JSON.stringify(barisKunci))
  cek(
    'aktivitas: pelaku membawa peran dan email akunnya',
    barisKunci?.aktorPeran === 'SUPER_ADMIN' && barisKunci.aktorEmail === 'super.admin@umn.ac.id',
    JSON.stringify(barisKunci),
  )
  cek(
    'pilihan pelaku membedakan admin lewat email (nama semua admin sama)',
    akt.isi.pilihanAktor.some((a) => a.email === EMAIL_ADMIN && a.nama === 'Biro Kemahasiswaan' && a.peran === 'ADMIN'),
    JSON.stringify(akt.isi.pilihanAktor),
  )
  const aktUbah = await bacaLog({ jenis: 'aktivitas', aksi: 'UBAH_DATA_TERKUNCI', dari: hariIni, ukuran: 100 })
  const barisUbah = aktUbah.isi.baris.find((b) => b.aksi === 'UBAH_DATA_TERKUNCI' && b.target === 'batch ' + denganAlasan.isi.id)
  cek('aktivitas: alasan perubahan data terkunci terbaca', barisUbah?.rincian?.alasan === 'Melengkapi nilai susulan sesudah semester 3.', JSON.stringify(barisUbah))
  const aktSimpan = await bacaLog({ jenis: 'aktivitas', aksi: 'SIMPAN_NILAI', dari: hariIni, ukuran: 100 })
  cek(
    'aktivitas: simpan nilai bisa disaring dan memuat batch uji',
    aktSimpan.isi.baris.length > 0 &&
      aktSimpan.isi.baris.every((b) => b.aksi === 'SIMPAN_NILAI') &&
      aktSimpan.isi.baris.some((b) => b.target === 'batch ' + b2.isi.id),
  )
  const hanyaKunci = await bacaLog({ jenis: 'aktivitas', aksi: 'KUNCI_ANGKATAN', ukuran: 100 })
  cek('filter aksi hanya mengembalikan aksi itu', hanyaKunci.isi.baris.length > 0 && hanyaKunci.isi.baris.every((b) => b.aksi === 'KUNCI_ANGKATAN'))
  cek('daftar pilihan aksi tersedia untuk layar', akt.isi.pilihanAksi?.includes('UBAH_PENGUNCIAN'))
  cek('membaca log tidak mengubah isi tabel', (await db.auditLog.count({ where: { mahasiswaId } })) === totalDb)

  /* ------------------------------ ringkasan angkatan ------------------------------ */
  garis('10. RINGKASAN ANGKATAN')
  const ringkasan = async () => (await admin('/api/angkatan')).isi.angkatan ?? []
  const dari = (daftar, id) => daftar.find((a) => a.angkatanId === id)

  cek('tanpa sesi: ringkasan angkatan ditolak 401', (await tamu('/api/angkatan')).status === 401)
  cek('mahasiswa tidak boleh melihat ringkasan (403)', (await mhs('/api/angkatan')).status === 403)
  cek('dosen tidak boleh melihat ringkasan (403)', (await dosen('/api/angkatan')).status === 403)

  // Angkatan C: lama (boleh dikunci) dan SELURUH komponennya terisi, jadi lengkap.
  await db.angkatan.create({ data: { id: ANG_C, tahun: 2024, label: 'Uji C ' + SUF, periodeTahun: '2024/2025', periodeSemester: 'GANJIL' } })
  const akunUji3 = await db.pengguna.create({
    data: {
      email: EMAIL3,
      passwordHash: 'tidak-dipakai',
      peran: 'MAHASISWA',
      mahasiswa: { create: { nim: NIM3, nama: 'Mahasiswa Uji Lengkap', prodiId: prodi.id, angkatanId: ANG_C } },
    },
    include: { mahasiswa: true },
  })
  await db.nilai.createMany({
    data: KOMPONEN.map((k) => ({ mahasiswaId: akunUji3.mahasiswa.id, komponenId: k.id, nilai: 80, penilaiId: adminId })),
  })

  const rg = await ringkasan()
  const gA = dari(rg, ANG_A)
  const gB = dari(rg, ANG_B)
  const gC = dari(rg, ANG_C)
  cek('ringkasan memuat semua angkatan uji', Boolean(gA && gB && gC), JSON.stringify(rg.map((a) => a.angkatanId)))
  cek('angkatan yang sudah ada di basis data ikut tampil', rg.some((a) => a.angkatanId === angkatan.id))
  cek('urutan: periode masuk terbaru lebih dulu', rg.findIndex((a) => a.angkatanId === ANG_B) < rg.findIndex((a) => a.angkatanId === ANG_A))

  cek(
    'angkatan terkunci: pencatat dan waktu kunci terbaca',
    gA?.status === 'terkunci' && gA.dikunciOleh === 'Super Admin' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(gA.dikunciPada ?? ''),
    JSON.stringify(gA),
  )
  cek('angkatan aktif: belum ada pencatat kunci', gB?.status === 'aktif' && gB.dikunciOleh === null && gB.dikunciPada === null)
  cek('angkatan masih semester 3: belum boleh dikunci beserta alasannya', gB?.bolehDikunci === false && /semester/i.test(gB.alasanTidakBoleh ?? ''), JSON.stringify(gB))
  cek('angkatan kosong: tanpa persentase dan tidak dianggap lengkap', gB?.jumlahMahasiswa === 0 && gB.kelengkapan.persen === null && gB.semuaLengkap === false)

  cek('jumlah mahasiswa benar', gA?.jumlahMahasiswa === 1 && gC?.jumlahMahasiswa === 1)
  const terisiA = await db.nilai.count({ where: { mahasiswaId: mahasiswaId2 } })
  cek(
    'angkatan dengan sel bolong: tidak lengkap, hitungan komponen sesuai tabel Nilai',
    gA?.semuaLengkap === false &&
      gA.kelengkapan.mahasiswaBolong === 1 &&
      gA.kelengkapan.komponenTerisi === terisiA &&
      gA.kelengkapan.persen === Math.round((terisiA / gA.kelengkapan.komponenTotal) * 1000) / 10,
    JSON.stringify(gA?.kelengkapan),
  )
  cek('angkatan bolong tidak ditandai siap kunci otomatis', gA?.siapKunciOtomatis === false)
  cek('persentase tidak pernah 100 selama masih ada yang bolong', gA?.kelengkapan.persen < 100)
  cek(
    'angkatan lengkap dan boleh dikunci: ditandai siap kunci otomatis',
    gC?.semuaLengkap === true && gC.kelengkapan.persen === 100 && gC.bolehDikunci === true && gC.siapKunciOtomatis === true,
    JSON.stringify(gC),
  )
  cek('ringkasan hanya membaca: angkatan lengkap tetap AKTIF', (await db.angkatan.findUnique({ where: { id: ANG_C } })).status === 'AKTIF')
  cek('dibaca ulang hasilnya sama', JSON.stringify(dari(await ringkasan(), ANG_C)) === JSON.stringify(gC))

  /* ------------------------------ akses cetak sertifikat ------------------------------ */
  garis('11. AKSES CETAK SERTIFIKAT DUA LAPIS')
  // Rapat 24 Okt 2026: mahasiswa yang memenuhi seluruh syarat meminta akses cetak, admin biasa memutuskan lapis
  // pertama, super admin lapis kedua. NIM3 (seluruh komponennya terisi di bagian 10) dibuat layak dengan mengesahkan
  // angkatannya langsung di basis data; mahasiswa uji (semester 2) tetap belum layak.
  await db.angkatan.update({ where: { id: ANG_C }, data: { status: 'TERKUNCI', dikunciOleh: saId, dikunciPada: new Date() } })
  await db.pengguna.update({ where: { id: akunUji3.id }, data: { passwordHash: await bcrypt.hash('umn12345', 10) } })
  targetLog.push('mahasiswa ' + NIM3)
  const mhs3 = peramban()
  cek('mahasiswa yang layak masuk', (await mhs3('/api/masuk', { metode: 'POST', isi: { email: EMAIL3, password: 'umn12345' } })).status === 200)

  const minta = (p) => p('/api/sertifikat', { metode: 'POST', isi: {} })
  const putuskanS = (p, isi) => p('/api/sertifikat/keputusan', { metode: 'POST', isi })
  const permintaanNim3 = async (p) => (await p('/api/data')).isi.sertifikat?.find((x) => x.nim === NIM3) ?? null

  const belumLayak = await minta(mhs)
  cek('mahasiswa yang belum layak tidak bisa meminta (409)', belumLayak.status === 409 && /belum bisa diminta/.test(belumLayak.isi.galat ?? ''), JSON.stringify(belumLayak.isi))
  cek('admin tidak memakai pintu permintaan mahasiswa (403)', (await minta(admin)).status === 403)
  cek('dosen tidak boleh memutuskan akses cetak (403)', (await putuskanS(dosen, {})).status === 403)
  cek('mahasiswa tidak boleh memutuskan akses cetak (403)', (await putuskanS(mhs3, {})).status === 403)

  const s1 = await minta(mhs3)
  cek('mahasiswa yang layak meminta akses cetak', s1.status === 200 && /^S-\d+$/.test(s1.isi.id ?? ''), JSON.stringify(s1.isi))
  cek('permintaan kedua selagi berjalan ditolak (409)', (await minta(mhs3)).status === 409)
  const logMinta = await db.logAktivitas.findMany({ where: { aksi: 'MINTA_SERTIFIKAT', target: { in: ['mahasiswa ' + NIM3, 'mahasiswa ' + NIM] } } })
  cek(
    'permintaan akses cetak tercatat atas nama mahasiswa beserta nilai akhirnya; yang ditolak tidak tercatat',
    logMinta.length === 1 &&
      logMinta[0].aktorId === akunUji3.id &&
      logMinta[0].target === 'mahasiswa ' + NIM3 &&
      logMinta[0].rincian?.permintaan === s1.isi.id &&
      typeof logMinta[0].rincian.nilaiAkhir === 'number',
    JSON.stringify(logMinta.map((l) => [l.target, l.rincian])),
  )
  cek('admin melihat permintaannya menunggu lapis pertama', (await permintaanNim3(admin))?.status === 'menunggu_admin')
  cek('mahasiswa lain tidak menerima permintaan ini', (await mhs('/api/data')).isi.sertifikat.length === 0)
  cek('dosen tidak menerima data sertifikat', (await dosen('/api/data')).isi.sertifikat.length === 0)
  cek('super admin belum bisa memutuskan lapis pertama', (await putuskanS(sa, { id: s1.isi.id, keputusan: 'disetujui' })).isi.ok === false)
  cek(
    'menolak dengan alasan kurang dari 10 karakter ditolak (400)',
    (await putuskanS(admin, { id: s1.isi.id, keputusan: 'ditolak', catatan: 'pendek' })).status === 400,
  )
  const tolakS = await putuskanS(admin, { id: s1.isi.id, keputusan: 'ditolak', catatan: 'Uji: nilai belum diperiksa prodi.' })
  const sDitolak = await permintaanNim3(mhs3)
  cek(
    'admin menolak dengan alasan, mahasiswa membaca alasan dan penolaknya',
    tolakS.isi.ok === true && sDitolak?.status === 'ditolak' && sDitolak.ditolak?.catatan === 'Uji: nilai belum diperiksa prodi.' && sDitolak.ditolak?.oleh === 'Biro Kemahasiswaan',
    JSON.stringify(sDitolak),
  )

  const s2 = await minta(mhs3)
  cek('sesudah ditolak mahasiswa boleh meminta lagi', s2.status === 200 && s2.isi.id !== s1.isi.id, JSON.stringify(s2.isi))
  cek('yang dikirim ke layar permintaan terbaru', (await permintaanNim3(mhs3))?.id === s2.isi.id)

  // Kelayakan dihitung ulang saat memutuskan: satu nilai yang hilang menahan persetujuan.
  const satuNilai = await db.nilai.findFirst({ where: { mahasiswaId: akunUji3.mahasiswa.id } })
  await db.nilai.delete({ where: { id: satuNilai.id } })
  const tidakLayakLagi = await putuskanS(admin, { id: s2.isi.id, keputusan: 'disetujui' })
  cek(
    'persetujuan ditahan bila syaratnya tidak lagi terpenuhi (409)',
    tidakLayakLagi.status === 409 && /tidak memenuhi syarat/.test(tidakLayakLagi.isi.galat ?? '') && (await permintaanNim3(admin))?.status === 'menunggu_admin',
    JSON.stringify(tidakLayakLagi.isi),
  )
  await db.nilai.create({
    data: { mahasiswaId: satuNilai.mahasiswaId, komponenId: satuNilai.komponenId, nilai: satuNilai.nilai, penilaiId: satuNilai.penilaiId, batchId: satuNilai.batchId },
  })

  const teruskanS = await putuskanS(admin, { id: s2.isi.id, keputusan: 'disetujui' })
  const sLapis1 = await permintaanNim3(mhs3)
  cek(
    'admin meneruskan ke super admin',
    teruskanS.isi.ok === true && sLapis1?.status === 'menunggu_superadmin' && sLapis1.lapis1?.oleh === 'Biro Kemahasiswaan',
    JSON.stringify(sLapis1),
  )
  cek('admin tidak bisa memutuskan lapis kedua', (await putuskanS(admin, { id: s2.isi.id, keputusan: 'disetujui' })).isi.ok === false)
  const siapS = await putuskanS(sa, { id: s2.isi.id, keputusan: 'disetujui' })
  const sSiap = await permintaanNim3(mhs3)
  cek(
    'super admin menyetujui: siap dicetak',
    siapS.isi.ok === true && sSiap?.status === 'siap_dicetak' && sSiap.lapis2?.oleh === 'Super Admin',
    JSON.stringify(sSiap),
  )
  cek(
    'tidak bisa diputuskan dua kali',
    (await putuskanS(sa, { id: s2.isi.id, keputusan: 'ditolak', catatan: 'Uji: diputuskan dua kali.' })).isi.ok === false,
  )
  cek('yang sudah siap dicetak tidak bisa diminta lagi (409)', (await minta(mhs3)).status === 409)
  const logS = await db.logAktivitas.findMany({ where: { target: 'mahasiswa ' + NIM3 }, orderBy: { id: 'asc' } })
  cek(
    'tiap keputusan tercatat di log beserta lapisnya',
    logS.filter((l) => l.aksi === 'TOLAK_SERTIFIKAT').length === 1 &&
      logS.filter((l) => l.aksi === 'SETUJUI_SERTIFIKAT').map((l) => l.rincian?.lapis).join() === '1,2',
    JSON.stringify(logS.map((l) => [l.aksi, l.rincian?.lapis])),
  )

  // Sesudah Siap dicetak: setiap pembukaan cetak tercatat, admin atau super admin bisa mencabut aksesnya langsung.
  const cetakS = (p, id = s2.isi.id) => p('/api/sertifikat/cetak', { metode: 'POST', isi: { id } })
  const cabutS = (p, alasan, id = s2.isi.id) => p('/api/sertifikat/cabut', { metode: 'POST', isi: { id, alasan } })
  cek('mahasiswa lain tidak bisa mencetak permintaan ini (404)', (await cetakS(mhs)).status === 404)
  cek('dosen tidak boleh membuka pintu cetak (403)', (await cetakS(dosen)).status === 403)
  const c1 = await cetakS(mhs3)
  const c2 = await cetakS(admin)
  const sCetak = await permintaanNim3(admin)
  cek(
    'setiap pembukaan cetak tercatat, oleh mahasiswa maupun admin',
    c1.isi.ok === true && c2.isi.jumlahCetak === 2 && sCetak?.cetak?.jumlah === 2 && sCetak.cetak.oleh === 'Biro Kemahasiswaan' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(sCetak.cetak.terakhir ?? ''),
    JSON.stringify([c1.isi, c2.isi, sCetak?.cetak]),
  )
  cek('mahasiswa tidak boleh mencabut (403)', (await cabutS(mhs3, 'Uji: mencoba mencabut sendiri.')).status === 403)
  cek('mencabut dengan alasan kurang dari 10 karakter ditolak (400)', (await cabutS(admin, 'pendek')).status === 400)
  const cabut1 = await cabutS(admin, 'Uji: ada laporan sikap dari dosen wali.')
  const sDicabut = await permintaanNim3(mhs3)
  cek(
    'admin mencabut, mahasiswa membaca alasan dan pencabutnya',
    cabut1.isi.ok === true && sDicabut?.status === 'dicabut' && sDicabut.dicabut?.alasan === 'Uji: ada laporan sikap dari dosen wali.' && sDicabut.dicabut?.oleh === 'Biro Kemahasiswaan',
    JSON.stringify(sDicabut),
  )
  cek('mencabut yang sudah dicabut tidak berlaku', (await cabutS(sa, 'Uji: mencabut lagi yang sudah dicabut.')).isi.ok === false)
  const cetakDicabut = await cetakS(mhs3)
  cek(
    'sesudah dicabut pencetakan ditolak (409), juga dari halaman yang dimuat sebelumnya',
    cetakDicabut.status === 409 && /dicabut/.test(cetakDicabut.isi.galat ?? ''),
    JSON.stringify(cetakDicabut.isi),
  )
  cek('pencetakan yang ditolak tidak dihitung', (await db.permintaanSertifikat.findUnique({ where: { id: Number(s2.isi.id.slice(2)) } }))?.jumlahCetak === 2)
  const logCabutSertifikat = await db.logAktivitas.findFirst({ where: { aksi: 'CABUT_SERTIFIKAT', target: 'mahasiswa ' + NIM3 } })
  cek(
    'pencabutan tercatat di log beserta alasan dan jumlah cetak saat itu',
    logCabutSertifikat?.rincian?.jumlahCetak === 2 && /laporan sikap/.test(logCabutSertifikat?.rincian?.alasan ?? ''),
    JSON.stringify(logCabutSertifikat?.rincian),
  )
  cek('kedua pembukaan cetak tercatat di log', (await db.logAktivitas.count({ where: { aksi: 'CETAK_SERTIFIKAT', target: 'mahasiswa ' + NIM3 } })) === 2)
  const s3 = await minta(mhs3)
  cek('sesudah dicabut mahasiswa boleh meminta lagi', s3.status === 200 && s3.isi.id !== s2.isi.id, JSON.stringify(s3.isi))
  await putuskanS(admin, { id: s3.isi.id, keputusan: 'disetujui' })
  await putuskanS(sa, { id: s3.isi.id, keputusan: 'disetujui' })
  const cabutSuper = await cabutS(sa, 'Uji: dicabut oleh super admin.', s3.isi.id)
  cek(
    'super admin juga bisa mencabut langsung',
    cabutSuper.isi.ok === true && (await permintaanNim3(sa))?.dicabut?.oleh === 'Super Admin',
    JSON.stringify(cabutSuper.isi),
  )

  /* ------------------------------ kurikulum ------------------------------ */
  garis('12. KURIKULUM DARI BASIS DATA')
  const kur = await ambilKurikulum()
  cek('basis data sudah di-seed: penanda versi ada', kur?.versi >= 1, JSON.stringify(kur?.versi ?? null))
  cek('setiap aspek punya minimal satu komponen aktif', getAspekList().every((a) => kur?.komponen.some((k) => k.aspekId === a.id)))
  cek(
    'bentuk tiap komponen sesuai yang dibaca kode',
    Boolean(
      kur?.komponen.every(
        (k) =>
          ['PDP', 'MK', 'ENGAGEMENT'].includes(k.sumber) &&
          ['kognitif', 'afektif'].includes(k.ranah) &&
          ['resmi', 'draft'].includes(k.status) &&
          (k.sumber !== 'MK' || Boolean(k.jenis)),
      ),
    ),
  )
  cek(
    'kurikulum yang terpasang di proses ini sama dengan isi basis data',
    JSON.stringify(KOMPONEN.map((k) => k.id)) === JSON.stringify(kur?.komponen.map((k) => k.id)),
  )

  // Indikator sementara dan dua timpaan pengaturan; begitu versi naik, pintu API berikutnya harus memakainya.
  const ambangAwal = CONFIG.AMBANG_SERTIFIKAT
  konfigurasiAsli = Object.fromEntries(
    await Promise.all(KONFIGURASI_UJI.map(async (kunci) => [kunci, await db.konfigurasi.findUnique({ where: { kunci } })])),
  )
  await db.indikator.create({
    data: { id: IND_UJI, aspekId: 'A1', label: 'Indikator uji ' + SUF, ranah: 'afektif', sumber: ['bukti uji'], urutan: 999 },
  })
  for (const [kunci, nilai] of [['AMBANG_SERTIFIKAT', 75], ['TOTAL_SEMESTER_PROGRAM', 9]]) {
    await db.konfigurasi.upsert({ where: { kunci }, update: { nilai }, create: { kunci, nilai } })
  }
  await naikkanVersi()
  await admin('/api/data')
  cek('pintu API memuat ulang kurikulum begitu versinya naik', getIndikator('A1').some((x) => x.id === IND_UJI && x.sumber[0] === 'bukti uji'))
  cek('pengaturan dari tabel Konfigurasi menimpa CONFIG', CONFIG.AMBANG_SERTIFIKAT === 75, String(CONFIG.AMBANG_SERTIFIKAT))
  cek('kunci di luar daftar yang boleh diubah diabaikan', CONFIG.TOTAL_SEMESTER_PROGRAM === 3, String(CONFIG.TOTAL_SEMESTER_PROGRAM))
  const master = await ambilMaster()
  cek(
    'data master untuk halaman membawa kurikulum yang sama',
    Boolean(master.kurikulum?.indikator.some((x) => x.id === IND_UJI)) && master.kurikulum.konfigurasi.AMBANG_SERTIFIKAT === 75,
  )

  await pulihkanKurikulum()
  await admin('/api/data')
  cek(
    'setelah dikembalikan: indikator uji hilang, ambang kembali seperti semula',
    !getIndikator('A1').some((x) => x.id === IND_UJI) && CONFIG.AMBANG_SERTIFIKAT === ambangAwal,
    String(CONFIG.AMBANG_SERTIFIKAT),
  )

  // Tanpa isi (basis data belum di-seed atau gagal dibaca), kurikulum dan CONFIG kembali ke bawaan kode.
  isiKurikulum({})
  cek(
    'tanpa isi dari basis data, bawaan kode yang dipakai',
    JSON.stringify(KOMPONEN) === JSON.stringify(KOMPONEN_BAWAAN) && CONFIG.AMBANG_SERTIFIKAT === 70,
  )
  isiKurikulum(kur)

  /* ------------------------------ bobot ------------------------------ */
  garis('13. BOBOT KURIKULUM')
  await admin('/api/data') // memasang kurikulum dan versinya dari basis data, seperti halaman
  komponenA1Asli = await db.komponen.findMany({
    where: { aspekId: 'A1' },
    select: { id: true, bobot: true, diubahOleh: true, diubahPada: true },
  })
  const idA1 = getKomponen('A1').map((k) => k.id)
  const susunanAwal = susunanBobot()
  const versiAwal = KURIKULUM_TERPASANG.versi
  // Porsi yang sengaja tidak rata: komponen pertama 40, sisanya 15.
  const a1Manual = Object.fromEntries(idA1.map((id, i) => [id, i === 0 ? 40 : 15]))
  // Lewat super admin: bobot menggeser nilai semua angkatan, termasuk yang sudah lewat Semester 3, dan
  // simpanan admin biasa untuk itu menunggu persetujuan (diuji di bagian 15).
  const kirimBobot = (aspekA1, isi = {}) =>
    sa('/api/kurikulum/bobot', {
      metode: 'POST',
      isi: {
        versi: KURIKULUM_TERPASANG.versi,
        pengaturan: susunanAwal.pengaturan,
        aspek: { ...susunanAwal.aspek, A1: aspekA1 },
        alasan: 'Uji otomatis perubahan bobot A.1',
        ...isi,
      },
    })
  const logBobot = (v) => db.logAktivitas.findFirst({ where: { aksi: 'UBAH_BOBOT', target: 'kurikulum versi ' + v } })

  cek('basis data sudah memegang kurikulum (versi ada)', versiAwal >= 1, String(versiAwal))
  cek(
    'dosen tidak boleh mengubah bobot (403)',
    (await dosen('/api/kurikulum/bobot', { metode: 'POST', isi: { aspek: {}, pengaturan: {} } })).status === 403,
  )
  cek('jumlah porsi bukan 100 ditolak', (await kirimBobot({ ...a1Manual, [idA1[0]]: 39 })).status === 400)
  cek('versi basi ditolak (409)', (await kirimBobot(a1Manual, { versi: versiAwal + 99 })).status === 409)

  const simpan1 = await kirimBobot(a1Manual)
  const log1 = simpan1.status === 200 ? await logBobot(simpan1.isi.versi) : null
  if (log1) logBobotUji.push(log1.id)
  cek('bobot manual A.1 tersimpan, versi naik', simpan1.status === 200 && simpan1.isi.versi === versiAwal + 1, JSON.stringify(simpan1.isi).slice(0, 300))
  const barisA1 = await db.komponen.findMany({ where: { aspekId: 'A1' } })
  cek(
    'kolom bobot dan jejak pengubah di tabel Komponen terisi',
    barisA1.every((k) => k.bobot === a1Manual[k.id] && k.diubahPada != null && k.diubahOleh != null),
  )
  cek(
    'jawaban membawa kurikulum baru',
    simpan1.isi.kurikulum?.komponen.filter((k) => k.aspekId === 'A1').every((k) => k.bobot === a1Manual[k.id]) === true,
  )
  cek(
    'log UBAH_BOBOT mencatat alasan, sebelum, dan sesudah',
    log1?.rincian?.alasan === 'Uji otomatis perubahan bobot A.1' &&
      log1.rincian.aspek?.[0]?.aspekId === 'A1' &&
      JSON.stringify(log1.rincian.aspek[0].sebelum) === JSON.stringify(susunanAwal.aspek.A1) &&
      log1.rincian.aspek[0].sesudah?.[idA1[0]] === 40 &&
      typeof log1.rincian.dampak?.berubah === 'number',
    JSON.stringify(log1?.rincian ?? null).slice(0, 300),
  )
  await admin('/api/data')
  cek('pintu API berikutnya menghitung dengan bobot baru', Math.abs(bobotKomponen('A1')[idA1[0]] - 40) < 1e-9, JSON.stringify(bobotKomponen('A1')))
  cek('halaman lama (versi sebelum simpan) ditolak (409)', (await kirimBobot(null, { versi: versiAwal })).status === 409)
  const aktBobot = await admin('/api/log', { metode: 'POST', isi: { jenis: 'aktivitas', aksi: 'UBAH_BOBOT' } })
  cek(
    'log bobot bisa disaring lewat /api/log',
    aktBobot.status === 200 && aktBobot.isi.baris?.some((b) => b.target === log1?.target),
    JSON.stringify(aktBobot.isi).slice(0, 200),
  )

  const simpan2 = await kirimBobot(susunanAwal.aspek.A1)
  const log2 = simpan2.status === 200 ? await logBobot(simpan2.isi.versi) : null
  if (log2) logBobotUji.push(log2.id)
  await admin('/api/data')
  cek(
    'dikembalikan ke semula: bobot A.1 seperti sebelum uji',
    simpan2.status === 200 && JSON.stringify(susunanBobot().aspek.A1) === JSON.stringify(susunanAwal.aspek.A1),
    JSON.stringify(simpan2.isi).slice(0, 200),
  )

  /* ------------------------------ super admin ------------------------------ */
  garis('14. SUPER ADMIN')
  // Akun super.admin@umn.ac.id dibuat npm run db:seed (masuk di bagian 1); bagian ini hanya membaca.
  cek('super admin masuk, sesinya bertanda superAdmin', masukSA.status === 200 && masukSA.isi.akun?.superAdmin === true, JSON.stringify(masukSA.isi))
  cek('/api/sesi super admin membawa superAdmin: true', (await sa('/api/sesi')).isi.akun?.superAdmin === true)
  cek('/api/sesi admin biasa membawa superAdmin: false', (await admin('/api/sesi')).isi.akun?.superAdmin === false)
  cek('super admin bisa membuka pintu admin yang sudah ada', (await sa('/api/angkatan')).status === 200)
  const coba = async (email, peran) => {
    const id = (await db.pengguna.findUnique({ where: { email } })).id
    const cookie = (await cookieSesi(id)).split(';')[0]
    const r = new Request('http://localhost/uji', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}' })
    return (await tangani(r, peran, async () => ({ ok: true }))).status
  }
  cek("pintu ['superadmin']: super admin lolos", (await coba('super.admin@umn.ac.id', ['superadmin'])) === 200)
  cek("pintu ['superadmin']: admin biasa ditolak 403", (await coba(EMAIL_ADMIN, ['superadmin'])) === 403)
  cek("pintu ['superadmin']: dosen ditolak 403", (await coba('simon.petrus@lecturer.umn.ac.id', ['superadmin'])) === 403)
  cek("pintu ['superadmin']: mahasiswa ditolak 403", (await coba(EMAIL, ['superadmin'])) === 403)

  /* ------------------------------ persetujuan ------------------------------ */
  garis('15. PERSETUJUAN SUPER ADMIN')
  // NIM2 ada di ANG_A yang sudah lewat Semester 3: admin biasa mengajukan, super admin memutuskan.
  const nomorP = (r) => Number(String(r.isi?.permintaan?.id ?? '').slice(2))
  const ajukan = async (alamat, isi) => {
    const r = await admin(alamat, { metode: 'POST', isi })
    if (r.isi?.permintaan?.id) {
      permintaanUji.push(nomorP(r))
      targetLog.push('permintaan ' + r.isi.permintaan.id)
    }
    return r
  }
  // Contohnya tanda final/sementara, yang dari admin biasa SELALU diajukan sejak rapat 24 Okt 2026 (menyimpan dan
  // membatalkan batch nilai tidak lagi bisa diajukan: pintunya hanya untuk super admin, lihat bagian 1).
  const tandaMhs2 = () => db.penguncian.findFirst({ where: { mahasiswaId: mahasiswaId2, aspekId: 'A1' } })
  const isiA = (status, alasan) => ({ daftar: [{ nim: NIM2, aspekId: 'A1' }], status, alasan })
  cek('admin biasa tanpa alasan ditolak (400)', (await ajukan('/api/penguncian', isiA('sementara', ''))).status === 400)
  const p1 = await ajukan('/api/penguncian', isiA('sementara', 'Menahan A.1 sampai nilai sikap susulan masuk'))
  cek('admin biasa: dijawab menunggu persetujuan, tanda belum tersimpan', p1.status === 200 && p1.isi.menunggu === true && (await tandaMhs2()) === null, JSON.stringify(p1.isi))
  const daftarAdmin = (await admin('/api/data')).isi.permintaan ?? []
  cek('permintaan tampil di data admin sebagai miliknya', daftarAdmin.some((p) => p.id === p1.isi.permintaan?.id && p.milikSaya && p.status === 'menunggu'))
  cek('admin biasa tidak bisa memutuskan (403)', (await admin('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p1.isi.permintaan?.id, keputusan: 'disetujui' } })).status === 403)
  const putus1 = await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p1.isi.permintaan?.id, keputusan: 'disetujui' } })
  const p1Db = await db.permintaanAdmin.findUnique({ where: { id: nomorP(p1) } })
  const tanda1 = await tandaMhs2()
  cek(
    'super admin menyetujui: tanda tersimpan atas nama admin pengaju',
    putus1.isi.ok === true && p1Db?.status === 'DISETUJUI' && tanda1?.status === 'SEMENTARA' && tanda1.olehId === adminId,
    JSON.stringify(putus1.isi),
  )
  const p2 = await ajukan('/api/penguncian', isiA(null, 'Ternyata nilai sikap susulan tidak ada'))
  cek('melepas tanda juga menunggu', p2.isi.menunggu === true && (await tandaMhs2())?.status === 'SEMENTARA', JSON.stringify(p2.isi))
  cek('admin menarik permintaannya', (await admin('/api/persetujuan/batal', { metode: 'POST', isi: { id: p2.isi.permintaan?.id } })).isi.ok === true)
  const p3 = await ajukan('/api/penguncian', isiA(null, 'Ternyata nilai sikap susulan tidak ada'))
  cek('menolak tanpa catatan ditolak (400)', (await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p3.isi.permintaan?.id, keputusan: 'ditolak' } })).status === 400)
  const tolak3 = await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p3.isi.permintaan?.id, keputusan: 'ditolak', catatan: 'Tanda masih diperlukan' } })
  cek('ditolak: tanda tetap', tolak3.isi.status === 'ditolak' && (await tandaMhs2())?.status === 'SEMENTARA', JSON.stringify(tolak3.isi))
  cek(
    'pengajuan, keputusan, dan penarikan tercatat di log',
    Boolean(await logAda('AJUKAN_PERSETUJUAN', 'permintaan ' + p1.isi.permintaan?.id)) &&
      Boolean(await logAda('PUTUSKAN_PERSETUJUAN', 'permintaan ' + p1.isi.permintaan?.id)) &&
      Boolean(await logAda('TARIK_PERMINTAAN', 'permintaan ' + p2.isi.permintaan?.id)),
  )
  // Bobot dari admin biasa juga SELALU diajukan, walau tidak ada mahasiswa yang sudah lewat Semester 3 ikut berubah.
  const pBobot = await ajukan('/api/kurikulum/bobot', {
    versi: KURIKULUM_TERPASANG.versi,
    pengaturan: susunanAwal.pengaturan,
    aspek: { ...susunanAwal.aspek, A1: a1Manual },
    alasan: 'Uji: bobot A.1 dari admin selalu diajukan',
  })
  cek('perubahan bobot dari admin menjadi permintaan, bobot belum berubah', pBobot.isi.menunggu === true && JSON.stringify(susunanBobot().aspek.A1) === JSON.stringify(susunanAwal.aspek.A1), JSON.stringify(pBobot.isi))
  if (pBobot.isi.permintaan?.id) await admin('/api/persetujuan/batal', { metode: 'POST', isi: { id: pBobot.isi.permintaan.id } })
  const biasa = await kirimNilai(87)
  cek('super admin tidak pernah tertahan', biasa.status === 200 && !biasa.isi.menunggu, JSON.stringify(biasa.isi).slice(0, 120))

  /* ------------------------------ penilaian ------------------------------ */
  garis('16. PENILAIAN ASPEK (INPUT MANUAL)')
  // Aspek C2: komponen dan teksnya diubah lewat pintu API, lalu dipulihkan persis di akhir (pulihkanPenilaian).
  penilaianAsli = {
    komponen: await db.komponen.findMany({ where: { aspekId: 'C2' } }),
    aspek: await db.aspek.findUnique({ where: { id: 'C2' } }),
  }
  const logPenilaianTerakhir = async () => {
    const l = await db.logAktivitas.findFirst({
      where: { aksi: 'UBAH_PENILAIAN', target: { startsWith: 'aspek C2' } },
      orderBy: { id: 'desc' },
    })
    if (l && !logPenilaianUji.includes(l.id)) logPenilaianUji.push(l.id)
    return l
  }
  await admin('/api/data') // kurikulum dan versinya terpasang di proses ini, seperti halaman
  const kirimPenilaian = (peramban, ubah, alasan = 'Uji otomatis penilaian aspek C2') => {
    const s = structuredClone(susunanPenilaian('C2'))
    ubah(s)
    return peramban('/api/kurikulum/penilaian', {
      metode: 'POST',
      isi: { versi: KURIKULUM_TERPASANG.versi, aspekId: 'C2', ...s, alasan },
    })
  }
  const bobotRata = (s) => {
    const aktif = s.komponen.filter((k) => k.aktif)
    const rata = Math.round(10000 / aktif.length) / 100
    aktif.forEach((k, i) => {
      k.bobot = i === aktif.length - 1 ? Math.round((100 - rata * (aktif.length - 1)) * 100) / 100 : rata
    })
  }
  cek('dosen tidak boleh mengubah penilaian (403)', (await dosen('/api/kurikulum/penilaian', { metode: 'POST', isi: { aspekId: 'C2' } })).status === 403)
  const tambahUji = await kirimPenilaian(sa, (s) => {
    s.aspek.mk = 'Civics (uji ' + SUF + ')'
    s.komponen.push({ id: null, label: 'Komponen uji ' + SUF, sumber: 'PDP', jenis: null, ranah: 'afektif', status: 'draft', aktif: true, bobot: null })
    bobotRata(s)
  })
  const idUji = tambahUji.isi.ditambah?.[0]?.id
  if (idUji) komponenUji.push(idUji)
  await logPenilaianTerakhir()
  cek(
    'super admin menambah komponen + mengubah teks aspek: langsung tersimpan',
    tambahUji.status === 200 && tambahUji.isi.ok === true && /^C2-PDP-B\d+$/.test(idUji ?? ''),
    JSON.stringify(tambahUji.isi).slice(0, 200),
  )
  const rowUji = idUji ? await db.komponen.findUnique({ where: { id: idUji } }) : null
  cek(
    'tabel Komponen: baris baru dengan pengubah super admin',
    rowUji?.aspekId === 'C2' && rowUji.aktif === true && rowUji.resmi === false && rowUji.diubahOleh === saId,
    JSON.stringify(rowUji),
  )
  cek('tabel Aspek: teks C2 tersimpan', (await db.aspek.findUnique({ where: { id: 'C2' } }))?.mk === 'Civics (uji ' + SUF + ')')
  await admin('/api/data')
  cek(
    'pintu API berikutnya memakai komponen dan teks baru',
    getKomponen('C2').some((k) => k.id === idUji) && getAspekList().find((a) => a.id === 'C2')?.mk === 'Civics (uji ' + SUF + ')',
  )
  cek('tanpa perubahan ditolak (400)', (await kirimPenilaian(sa, () => {})).status === 400)
  const gantiSumber = await kirimPenilaian(sa, (s) => {
    s.komponen.find((x) => x.id !== idUji && x.sumber === 'MK').sumber = 'PDP'
  })
  cek(
    'sumber komponen yang sudah dinilai tidak bisa diganti (400)',
    gantiSumber.status === 400 && /tidak bisa diganti/.test(gantiSumber.isi.galat ?? ''),
    JSON.stringify(gantiSumber.isi),
  )
  const pAdmin = await kirimPenilaian(
    admin,
    (s) => {
      s.komponen.find((x) => x.id === idUji).label = 'Komponen uji ' + SUF + ' (diganti admin)'
    },
    'Admin memperjelas nama komponen uji',
  )
  if (pAdmin.isi?.permintaan?.id) {
    permintaanUji.push(Number(pAdmin.isi.permintaan.id.slice(2)))
    targetLog.push('permintaan ' + pAdmin.isi.permintaan.id)
  }
  cek(
    'admin biasa selalu mengajukan (menunggu), nama belum berubah',
    pAdmin.isi.menunggu === true && (await db.komponen.findUnique({ where: { id: idUji } }))?.label === 'Komponen uji ' + SUF,
    JSON.stringify(pAdmin.isi),
  )
  const setujuP = await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: pAdmin.isi.permintaan?.id, keputusan: 'disetujui' } })
  await logPenilaianTerakhir()
  cek(
    'super admin menyetujui: nama berubah, pengubah = admin',
    setujuP.isi.ok === true && (await db.komponen.findUnique({ where: { id: idUji } }))?.diubahOleh === adminId,
    JSON.stringify(setujuP.isi).slice(0, 160),
  )
  await admin('/api/data')
  const arsipUji = await kirimPenilaian(sa, (s) => {
    s.komponen.find((x) => x.id === idUji).aktif = false
    bobotRata(s)
  })
  const logArsip = await logPenilaianTerakhir()
  await admin('/api/data')
  cek(
    'hapus = masuk arsip: baris tetap ada, tidak dihitung',
    arsipUji.isi.ok === true && (await db.komponen.findUnique({ where: { id: idUji } }))?.aktif === false && !getKomponen('C2').some((k) => k.id === idUji),
    JSON.stringify(arsipUji.isi).slice(0, 160),
  )
  cek(
    'log UBAH_PENILAIAN mencatat alasan dan komponen yang diarsipkan',
    logArsip?.rincian?.alasan === 'Uji otomatis penilaian aspek C2' && logArsip.rincian.diarsipkan?.includes(idUji),
    JSON.stringify(logArsip?.rincian ?? null).slice(0, 200),
  )

  /* ------------------------------ periode ------------------------------ */
  garis('17. PERIODE AKADEMIK')
  periodeAsli = await db.konfigurasi.findUnique({ where: { kunci: KUNCI_PERIODE } })
  await sa('/api/data') // tangani() memasang periode dari basis data ke PERIODE_AKTIF
  const awal = { ...PERIODE_AKTIF }
  const maju = periodeSetelah(awal, 1)
  const semesterMhs = async () => (await mhs('/api/sesi')).isi.akun?.mahasiswa?.semesterAktif
  const logPeriodeTerakhir = async () => {
    const l = await db.logAktivitas.findFirst({ where: { aksi: 'UBAH_PERIODE' }, orderBy: { id: 'desc' } })
    if (l && !logPeriodeUji.includes(l.id)) logPeriodeUji.push(l.id)
    return l
  }
  const jumlahLogPeriode = () => db.logAktivitas.count({ where: { aksi: 'UBAH_PERIODE' } })
  const pindah = (pelaku, isi) => pelaku('/api/periode', { metode: 'POST', isi })
  const ALASAN = 'Uji otomatis periode akademik'
  console.log('periode awal', awal.semester, awal.tahun, '· baris Konfigurasi', periodeAsli ? 'ada' : 'belum ada')

  cek('tanpa sesi ditolak 401', (await pindah(tamu, { ...maju, alasan: ALASAN })).status === 401)
  cek('admin biasa ditolak 403', (await pindah(admin, { ...maju, alasan: ALASAN })).status === 403)
  cek('dosen ditolak 403', (await pindah(dosen, { ...maju, alasan: ALASAN })).status === 403)
  const logSebelum = await jumlahLogPeriode()
  cek('alasan kurang dari 10 karakter ditolak 400', (await pindah(sa, { ...maju, alasan: 'pendek' })).status === 400)
  cek('periode tidak sah ditolak 400', (await pindah(sa, { tahun: '2026/2028', semester: 'Genap', alasan: ALASAN })).status === 400)
  cek('semester tidak dikenal ditolak 400', (await pindah(sa, { tahun: maju.tahun, semester: 'Pendek', alasan: ALASAN })).status === 400)
  cek('lompat dua semester ditolak 400', (await pindah(sa, { ...periodeSetelah(awal, 2), alasan: ALASAN })).status === 400)
  cek('penolakan tidak menulis apa pun', (await jumlahLogPeriode()) === logSebelum && samaPeriode((await ambilPeriode()) ?? awal, awal))

  const semesterAwal = await semesterMhs()
  const majuR = await pindah(sa, { ...maju, alasan: ALASAN })
  const logMaju = await logPeriodeTerakhir()
  cek('super admin memindahkan satu semester maju', majuR.status === 200 && samaPeriode(majuR.isi.periode, maju), JSON.stringify(majuR.isi))
  cek('tersimpan di Konfigurasi PERIODE_AKTIF', samaPeriode((await ambilPeriode()) ?? awal, maju))
  cek(
    'log UBAH_PERIODE mencatat sebelum, sesudah, dan alasan',
    logMaju?.rincian?.alasan === ALASAN && samaPeriode(logMaju.rincian.sebelum, awal) && samaPeriode(logMaju.rincian.sesudah, maju),
    JSON.stringify(logMaju?.rincian ?? null),
  )
  cek(
    'semester mahasiswa ikut naik (/api/sesi)',
    semesterAwal >= 1 && (await semesterMhs()) === Math.min(CONFIG.TOTAL_SEMESTER_PROGRAM, semesterAwal + 1),
    semesterAwal + ' → ' + (await semesterMhs()),
  )
  cek(
    'semester mahasiswa ikut naik (/api/data)',
    (await mhs('/api/data')).isi.mahasiswa?.[0]?.semesterAktif === Math.min(CONFIG.TOTAL_SEMESTER_PROGRAM, semesterAwal + 1),
  )
  cek('data master membawa periode baru', samaPeriode((await ambilMaster()).periode ?? awal, maju))
  const logSama = await jumlahLogPeriode()
  cek(
    'memindah ke periode yang sama tidak menulis log',
    (await pindah(sa, { ...maju, alasan: ALASAN })).status === 200 && (await jumlahLogPeriode()) === logSama,
  )

  const mundurR = await pindah(sa, { ...awal, alasan: ALASAN })
  await logPeriodeTerakhir()
  cek('kembali satu semester mundur', mundurR.status === 200 && samaPeriode((await ambilPeriode()) ?? maju, awal), JSON.stringify(mundurR.isi))
  cek('semester mahasiswa kembali seperti semula', (await semesterMhs()) === semesterAwal)

  /* ------------------------------ akses pengguna ------------------------------ */
  garis('18. AKSES PENGGUNA')
  // Hanya akun mahasiswa sementara yang dicabut lalu dipulihkan; log UBAH_AKSES-nya bertarget 'akun <EMAIL>'.
  const ubah = (pelaku, isi) => pelaku('/api/akses/ubah', { metode: 'POST', isi })
  const ALASAN_AKSES = 'Uji otomatis akses mahasiswa'
  const idSA = (await db.pengguna.findUnique({ where: { email: 'super.admin@umn.ac.id' } })).id
  cek('daftar akun tanpa sesi ditolak 401', (await tamu('/api/akses', { metode: 'POST' })).status === 401)
  cek('daftar akun oleh admin biasa ditolak 403', (await admin('/api/akses', { metode: 'POST' })).status === 403)
  const daftarAkun = await sa('/api/akses', { metode: 'POST' })
  const akunMhs = daftarAkun.isi.akun?.find((a) => a.id === akunUji.id)
  cek(
    'daftar akun memuat mahasiswa beserta NIM, prodi, dan angkatan',
    daftarAkun.status === 200 &&
      akunMhs?.peran === 'mahasiswa' &&
      akunMhs.nim === NIM &&
      akunMhs.prodi === prodi.nama &&
      akunMhs.angkatan === angkatan.label &&
      akunMhs.aktif === true,
    JSON.stringify(akunMhs ?? null),
  )
  cek(
    'daftar akun juga memuat dosen dan super admin',
    daftarAkun.isi.akun?.some((a) => a.peran === 'dosen' && a.nip) && daftarAkun.isi.akun?.some((a) => a.peran === 'superadmin'),
  )
  cek('ubah akses oleh admin biasa ditolak 403', (await ubah(admin, { id: akunUji.id, aktif: false, alasan: ALASAN_AKSES })).status === 403)
  cek('alasan kurang dari 10 karakter ditolak 400', (await ubah(sa, { id: akunUji.id, aktif: false, alasan: 'pendek' })).status === 400)
  cek('akun yang tidak ada ditolak 404', (await ubah(sa, { id: 0, aktif: false, alasan: ALASAN_AKSES })).status === 404)
  cek('akses akun sendiri tidak bisa diubah (403)', (await ubah(sa, { id: idSA, aktif: false, alasan: ALASAN_AKSES })).status === 403)

  const cabut = await ubah(sa, { id: akunUji.id, aktif: false, alasan: ALASAN_AKSES })
  cek('super admin mencabut akses mahasiswa', cabut.status === 200 && cabut.isi.akun?.aktif === false && cabut.isi.akun?.nim === NIM, JSON.stringify(cabut.isi))
  const logCabut = await db.logAktivitas.findFirst({ where: { aksi: 'UBAH_AKSES', target: 'akun ' + EMAIL }, orderBy: { id: 'desc' } })
  cek(
    'log UBAH_AKSES mencatat peran, sebelum, sesudah, dan alasan',
    logCabut?.rincian?.peran === 'mahasiswa' && logCabut.rincian.sebelum === true && logCabut.rincian.sesudah === false && logCabut.rincian.alasan === ALASAN_AKSES,
    JSON.stringify(logCabut?.rincian ?? null),
  )
  cek('sesi mahasiswa yang dicabut langsung ditolak 401', (await mhs('/api/data')).status === 401)
  const masukDicabut = await tamu('/api/masuk', { metode: 'POST', isi: { email: EMAIL, password: 'umn12345' } })
  cek('mahasiswa yang dicabut tidak bisa masuk (403)', masukDicabut.status === 403 && /dinonaktifkan/.test(masukDicabut.isi.galat ?? ''), JSON.stringify(masukDicabut.isi))
  const logAkses = () => db.logAktivitas.count({ where: { aksi: 'UBAH_AKSES', target: 'akun ' + EMAIL } })
  const logSebelumSama = await logAkses()
  cek(
    'mencabut yang sudah dicabut tidak menulis log',
    (await ubah(sa, { id: akunUji.id, aktif: false, alasan: ALASAN_AKSES })).status === 200 && (await logAkses()) === logSebelumSama,
  )

  // Akun mahasiswa sementara sudah punya nilai dari bagian sebelumnya, jadi tidak boleh terhapus walau dicabut.
  const hapus = (pelaku, isi) => pelaku('/api/akses/hapus', { metode: 'POST', isi })
  const ditolakData = await hapus(sa, { id: akunUji.id, alasan: ALASAN_AKSES })
  cek(
    'akun yang masih punya nilai tidak bisa dihapus (409) dan pesannya menyebut nilainya',
    ditolakData.status === 409 && /\d+ nilai/.test(ditolakData.isi.galat ?? ''),
    JSON.stringify(ditolakData.isi),
  )
  cek(
    'akun dan nilainya tetap utuh sesudah ditolak',
    Boolean(await db.pengguna.findUnique({ where: { id: akunUji.id } })) && (await db.nilai.count({ where: { mahasiswaId } })) > 0,
  )

  const pulih = await ubah(sa, { id: akunUji.id, aktif: true, alasan: ALASAN_AKSES })
  cek('super admin memulihkan akses mahasiswa', pulih.status === 200 && pulih.isi.akun?.aktif === true)
  cek('mahasiswa bisa masuk lagi', (await mhs('/api/masuk', { metode: 'POST', isi: { email: EMAIL, password: 'umn12345' } })).status === 200)
  cek('data mahasiswa tetap utuh sesudah dipulihkan', (await mhs('/api/data')).isi.mahasiswa?.[0]?.nim === NIM)

  /* Hapus akun sampai benar-benar hilang dari basis data. Tiga akun sementara tanpa data dibuat lewat
     /api/akses/tambah; log TAMBAH_AKUN, UBAH_AKSES, dan HAPUS_AKUN-nya bertarget 'akun <email>' (targetLog). */
  const ALASAN_HAPUS = 'Uji otomatis hapus akun'
  cek('hapus akun oleh admin biasa ditolak 403', (await hapus(admin, { id: akunUji.id, alasan: ALASAN_HAPUS })).status === 403)
  cek('hapus akun sendiri ditolak 403', (await hapus(sa, { id: idSA, alasan: ALASAN_HAPUS })).status === 403)
  cek('hapus akun yang tidak ada ditolak 404', (await hapus(sa, { id: 0, alasan: ALASAN_HAPUS })).status === 404)
  const isianHapus = {
    admin: {},
    dosen: { nama: 'Dosen Uji Hapus', nip: HAPUS_UJI.dosen.nip, jabatan: 'Dosen', prodi: prodi.nama, sumber: 'MK', semester: '1' },
    mahasiswa: { nama: 'Mahasiswa Uji Hapus', nim: HAPUS_UJI.mahasiswa.nim, prodi: prodi.nama, angkatanId: angkatan.id },
  }
  for (const [peran, isi] of Object.entries(isianHapus)) {
    const { email } = HAPUS_UJI[peran]
    const baru = await sa('/api/akses/tambah', { metode: 'POST', isi: { ...isi, peran, email, sandi: 'umn12345' } })
    const id = baru.isi.akun?.id
    cek('akun ' + peran + ' sementara dibuat', baru.status === 200 && Number.isInteger(id), JSON.stringify(baru.isi))
    cek('akun ' + peran + ' yang masih aktif tidak bisa dihapus (409)', (await hapus(sa, { id, alasan: ALASAN_HAPUS })).status === 409)
    cek('alasan hapus kurang dari 10 karakter ditolak 400', (await hapus(sa, { id, alasan: 'pendek' })).status === 400)
    await ubah(sa, { id, aktif: false, alasan: ALASAN_HAPUS })
    const r = await hapus(sa, { id, alasan: ALASAN_HAPUS })
    const [sisaAkun, sisaMhs, sisaDosen] = await Promise.all([
      db.pengguna.findUnique({ where: { id } }),
      db.mahasiswa.findFirst({ where: { penggunaId: id } }),
      db.dosen.findFirst({ where: { penggunaId: id } }),
    ])
    cek(
      'akun ' + peran + ' tanpa data hilang dari basis data, termasuk baris mahasiswa/dosennya',
      r.status === 200 && r.isi.id === id && !sisaAkun && !sisaMhs && !sisaDosen,
      JSON.stringify(r.isi),
    )
    const logHapus = await db.logAktivitas.findFirst({ where: { aksi: 'HAPUS_AKUN', target: 'akun ' + email } })
    cek(
      'log HAPUS_AKUN ' + peran + ' mencatat email, peran, dan alasan',
      logHapus?.aktorId === idSA && logHapus.rincian?.email === email && logHapus.rincian.peran === peran && logHapus.rincian.alasan === ALASAN_HAPUS,
      JSON.stringify(logHapus?.rincian ?? null),
    )
    cek('akun ' + peran + ' yang sudah dihapus tidak ditemukan lagi (404)', (await hapus(sa, { id, alasan: ALASAN_HAPUS })).status === 404)
  }

  /* ------------------------------ izin dan data master ------------------------------ */
  garis('19. IZIN DAN DATA MASTER')
  const akunAdmin = await db.pengguna.findUnique({ where: { email: EMAIL_ADMIN } })
  izinAdminAsli = akunAdmin.kelolaMaster
  // Mulai dari keadaan tanpa izin, apa pun isi basis datanya; nilai aslinya dikembalikan di bersihkan().
  if (akunAdmin.kelolaMaster) await db.pengguna.update({ where: { id: akunAdmin.id }, data: { kelolaMaster: false } })
  const izin = (pelaku, isi) => pelaku('/api/akses/izin', { metode: 'POST', isi })
  const kirimMaster = (pelaku, jenis, isi) => pelaku('/api/master/' + jenis, { metode: 'POST', isi })
  /** Log terbaru untuk aksi dan target itu; id-nya dicatat supaya dihapus di bersihkan(). */
  const logBaru = async (aksi, target) => {
    const l = await db.logAktivitas.findFirst({ where: { aksi, target }, orderBy: { id: 'desc' } })
    if (l) logDataMasterUji.push(l.id)
    return l
  }
  const ALASAN_DM = 'Uji otomatis data master'

  cek('sesi admin tanpa izin: kelolaMaster false', (await admin('/api/sesi')).isi.akun?.kelolaMaster === false)
  cek(
    'admin tanpa izin tidak boleh menambah angkatan (403)',
    (await kirimMaster(admin, 'angkatan', { aksi: 'tambah', tahun: 2026, semester: 'Ganjil' })).status === 403,
  )
  cek('dosen tidak boleh mengubah prodi (403)', (await kirimMaster(dosen, 'prodi', { jenis: 'prodi', aksi: 'tambah' })).status === 403)
  cek('mahasiswa tidak boleh mengubah data mahasiswa (403)', (await kirimMaster(mhs, 'mahasiswa', { aksi: 'ubah', nim: NIM })).status === 403)
  cek('admin tidak boleh memberi izin (403)', (await izin(admin, { id: akunAdmin.id, aktif: true, alasan: ALASAN_DM })).status === 403)
  cek('izin tanpa alasan cukup ditolak (400)', (await izin(sa, { id: akunAdmin.id, aktif: true, alasan: 'pendek' })).status === 400)
  cek('izin untuk super admin ditolak (403)', (await izin(sa, { id: idSA, aktif: true, alasan: ALASAN_DM })).status === 403)
  cek('izin untuk akun mahasiswa ditolak (403)', (await izin(sa, { id: akunUji.id, aktif: true, alasan: ALASAN_DM })).status === 403)
  const beri = await izin(sa, { id: akunAdmin.id, aktif: true, alasan: ALASAN_DM })
  cek('super admin memberi izin', beri.status === 200 && beri.isi.akun?.kelolaMaster === true, JSON.stringify(beri.isi))
  const logBeri = await logBaru('UBAH_IZIN', 'akun ' + EMAIL_ADMIN)
  cek(
    'log UBAH_IZIN mencatat pelaku, sebelum, sesudah, dan alasan',
    logBeri?.aktorId === idSA &&
      logBeri.rincian?.sebelum === false &&
      logBeri.rincian.sesudah === true &&
      logBeri.rincian.alasan === ALASAN_DM,
    JSON.stringify(logBeri?.rincian ?? null),
  )
  const jumlahLogIzin = await db.logAktivitas.count({ where: { aksi: 'UBAH_IZIN' } })
  await izin(sa, { id: akunAdmin.id, aktif: true, alasan: ALASAN_DM })
  cek('memberi izin yang sudah ada tidak mencatat log baru', (await db.logAktivitas.count({ where: { aksi: 'UBAH_IZIN' } })) === jumlahLogIzin)
  cek('sesi admin sesudah diberi izin: kelolaMaster true', (await admin('/api/sesi')).isi.akun?.kelolaMaster === true)
  const daftarIzin = (await sa('/api/akses', { metode: 'POST', isi: {} })).isi.akun ?? []
  cek('daftar Akses Pengguna menandai izin admin', daftarIzin.find((a) => a.id === akunAdmin.id)?.kelolaMaster === true)
  // Rapat 24 Okt 2026: data master dipegang penuh super admin; izin admin hanya untuk melihat.
  cek(
    'admin berizin tetap tidak boleh menambah angkatan (403): izinnya hanya untuk melihat',
    (await kirimMaster(admin, 'angkatan', { aksi: 'tambah', tahun: 2026, semester: 'Ganjil' })).status === 403,
  )
  // Penulisan data master di bawah oleh super admin.

  // Angkatan: tahun dan semester masuk yang belum ada, paling jauh satu tahun di depan periode aktif.
  const batasAtas = Number(String(PERIODE_AKTIF.tahun).slice(0, 4)) + 1
  const adaAngkatan = new Set((await db.angkatan.findMany({ select: { id: true } })).map((a) => a.id))
  let pilihAngkatan = null
  for (let t = batasAtas; t >= 2000 && !pilihAngkatan; t--) {
    if (!adaAngkatan.has(String(t))) pilihAngkatan = { tahun: t, semester: 'Ganjil', id: String(t), label: String(t) }
    else if (!adaAngkatan.has(t + 'B')) pilihAngkatan = { tahun: t, semester: 'Genap', id: t + 'B', label: t + ' Genap' }
  }
  cek(
    'tahun di luar batas ditolak (400)',
    (await kirimMaster(sa, 'angkatan', { aksi: 'tambah', tahun: batasAtas + 1, semester: 'Ganjil' })).status === 400,
  )
  cek(
    'semester masuk tidak sah ditolak (400)',
    (await kirimMaster(sa, 'angkatan', { aksi: 'tambah', tahun: pilihAngkatan.tahun, semester: 'Pendek' })).status === 400,
  )
  cek('aksi selain tambah/ubah ditolak (400)', (await kirimMaster(sa, 'angkatan', { aksi: 'hapus', id: angkatan.id })).status === 400)
  const tambahAng = await kirimMaster(sa, 'angkatan', { aksi: 'tambah', tahun: pilihAngkatan.tahun, semester: pilihAngkatan.semester })
  if (tambahAng.status === 200) angkatanUji.push(pilihAngkatan.id)
  const barisAng = await db.angkatan.findUnique({ where: { id: pilihAngkatan.id } })
  cek(
    'super admin menambah angkatan ' + pilihAngkatan.label + ': kode, label, dan periode dibentuk server',
    tambahAng.status === 200 &&
      barisAng?.label === pilihAngkatan.label &&
      barisAng.tahun === pilihAngkatan.tahun &&
      barisAng.periodeTahun === pilihAngkatan.tahun + '/' + (pilihAngkatan.tahun + 1) &&
      barisAng.periodeSemester === (pilihAngkatan.semester === 'Genap' ? 'GENAP' : 'GANJIL') &&
      barisAng.status === 'AKTIF',
    JSON.stringify({ isi: tambahAng.isi, barisAng }),
  )
  cek('jawaban membawa data master terbaru', tambahAng.isi.master?.angkatan?.some((a) => a.id === pilihAngkatan.id))
  const logAng = await logBaru('TAMBAH_ANGKATAN', 'angkatan ' + pilihAngkatan.label)
  cek('log TAMBAH_ANGKATAN atas nama super admin', logAng?.aktorId === idSA, JSON.stringify(logAng))
  cek(
    'angkatan kembar ditolak (409)',
    (await kirimMaster(sa, 'angkatan', { aksi: 'tambah', tahun: pilihAngkatan.tahun, semester: pilihAngkatan.semester })).status === 409,
  )
  const LABEL_UJI = 'Uji Label ' + SUF
  cek(
    'ubah label tanpa alasan ditolak (400)',
    (await kirimMaster(sa, 'angkatan', { aksi: 'ubah', id: pilihAngkatan.id, label: LABEL_UJI })).status === 400,
  )
  cek(
    'label yang sudah dipakai angkatan lain ditolak (409)',
    (await kirimMaster(sa, 'angkatan', { aksi: 'ubah', id: pilihAngkatan.id, label: angkatan.label, alasan: ALASAN_DM })).status === 409,
  )
  cek(
    'angkatan terkunci tidak bisa diubah (409)',
    (await kirimMaster(sa, 'angkatan', { aksi: 'ubah', id: ANG_A, label: 'Uji Lain ' + SUF, alasan: ALASAN_DM })).status === 409,
  )
  const ubahAng = await kirimMaster(sa, 'angkatan', { aksi: 'ubah', id: pilihAngkatan.id, label: LABEL_UJI, alasan: ALASAN_DM })
  const logUbahAng = await logBaru('UBAH_ANGKATAN', 'angkatan ' + pilihAngkatan.label)
  cek(
    'ubah label angkatan tersimpan dan tercatat beserta alasannya',
    ubahAng.status === 200 &&
      (await db.angkatan.findUnique({ where: { id: pilihAngkatan.id } }))?.label === LABEL_UJI &&
      logUbahAng?.rincian?.sesudah?.label === LABEL_UJI &&
      logUbahAng.rincian.alasan === ALASAN_DM,
    JSON.stringify(ubahAng.isi),
  )

  // Fakultas dan prodi, dikenali dari namanya.
  const tambahFak = await kirimMaster(sa, 'prodi', { jenis: 'fakultas', aksi: 'tambah', nama: FAK_UJI })
  await logBaru('TAMBAH_FAKULTAS', 'fakultas ' + FAK_UJI)
  cek('super admin menambah fakultas', tambahFak.status === 200 && Boolean(await db.fakultas.findUnique({ where: { nama: FAK_UJI } })))
  cek('fakultas kembar ditolak (409)', (await kirimMaster(sa, 'prodi', { jenis: 'fakultas', aksi: 'tambah', nama: FAK_UJI })).status === 409)
  cek('jenis selain fakultas/prodi ditolak (400)', (await kirimMaster(sa, 'prodi', { jenis: 'kampus', aksi: 'tambah', nama: 'X' })).status === 400)
  cek(
    'prodi berjenjang tidak sah ditolak (400)',
    (await kirimMaster(sa, 'prodi', { jenis: 'prodi', aksi: 'tambah', nama: PRODI_UJI, jenjang: 'S9', fakultas: FAK_UJI })).status === 400,
  )
  cek(
    'prodi di fakultas yang tidak ada ditolak (404)',
    (await kirimMaster(sa, 'prodi', { jenis: 'prodi', aksi: 'tambah', nama: PRODI_UJI, jenjang: 'S1', fakultas: 'Tidak Ada ' + SUF })).status === 404,
  )
  const tambahProdi = await kirimMaster(sa, 'prodi', { jenis: 'prodi', aksi: 'tambah', nama: PRODI_UJI, jenjang: 'S1', fakultas: FAK_UJI })
  await logBaru('TAMBAH_PRODI', 'prodi ' + PRODI_UJI)
  cek(
    'super admin menambah prodi, langsung ada di data master',
    tambahProdi.status === 200 &&
      tambahProdi.isi.master?.fakultas?.find((f) => f.name === FAK_UJI)?.programs?.some((p) => p.nama === PRODI_UJI),
    JSON.stringify(tambahProdi.isi.galat ?? ''),
  )
  cek(
    'prodi kembar ditolak (409)',
    (await kirimMaster(sa, 'prodi', { jenis: 'prodi', aksi: 'tambah', nama: prodi.nama, jenjang: 'S1', fakultas: FAK_UJI })).status === 409,
  )
  const ubahProdi = await kirimMaster(sa, 'prodi', {
    jenis: 'prodi',
    aksi: 'ubah',
    nama: PRODI_UJI,
    namaBaru: PRODI_UJI_B,
    jenjang: 'D3',
    alasan: ALASAN_DM,
  })
  const logUbahProdi = await logBaru('UBAH_PRODI', 'prodi ' + PRODI_UJI)
  cek(
    'ubah prodi: nama dan jenjang berubah, log hanya memuat yang berubah',
    ubahProdi.status === 200 &&
      (await db.programStudi.findUnique({ where: { nama: PRODI_UJI_B } }))?.jenjang === 'D3' &&
      logUbahProdi?.rincian?.sebelum?.nama === PRODI_UJI &&
      logUbahProdi.rincian.sesudah?.jenjang === 'D3' &&
      !('fakultas' in (logUbahProdi.rincian.sesudah ?? {})),
    JSON.stringify(logUbahProdi?.rincian ?? ubahProdi.isi),
  )
  const ubahFak = await kirimMaster(sa, 'prodi', { jenis: 'fakultas', aksi: 'ubah', nama: FAK_UJI, namaBaru: FAK_UJI_B, alasan: ALASAN_DM })
  await logBaru('UBAH_FAKULTAS', 'fakultas ' + FAK_UJI)
  cek(
    'ganti nama fakultas, prodinya ikut tersambung',
    ubahFak.status === 200 &&
      (await db.programStudi.findUnique({ where: { nama: PRODI_UJI_B }, include: { fakultas: true } }))?.fakultas.nama === FAK_UJI_B,
  )

  // Mahasiswa: tambah lewat tambahAkun, ubah tanpa NIM; pindah prodi/angkatan hanya selama belum punya data penilaian.
  const isiMhsDM = { aksi: 'tambah', email: EMAIL_DM, sandi: 'umn12345', nama: 'Mahasiswa Uji Master', nim: NIM_DM, prodi: PRODI_UJI_B }
  cek(
    'mahasiswa baru ke angkatan terkunci ditolak (409)',
    (await kirimMaster(sa, 'mahasiswa', { ...isiMhsDM, angkatanId: ANG_A })).status === 409,
  )
  const tambahMhs = await kirimMaster(sa, 'mahasiswa', { ...isiMhsDM, angkatanId: pilihAngkatan.id })
  await logBaru('TAMBAH_AKUN', 'akun ' + EMAIL_DM)
  cek('super admin menambah mahasiswa', tambahMhs.status === 200 && tambahMhs.isi.akun?.nim === NIM_DM, JSON.stringify(tambahMhs.isi))
  const pindahMhs = await kirimMaster(sa, 'mahasiswa', {
    aksi: 'ubah',
    nim: NIM_DM,
    nama: 'Mahasiswa Uji Master Dua',
    prodi: prodi.nama,
    angkatanId: angkatan.id,
    alasan: ALASAN_DM,
  })
  const logPindah = await logBaru('UBAH_AKUN', 'akun ' + EMAIL_DM)
  const barisMhsDM = await db.mahasiswa.findUnique({ where: { nim: NIM_DM } })
  cek(
    'mahasiswa tanpa nilai bisa diganti nama, prodi, dan angkatannya; log memuat NIM dan sebelum/sesudah',
    pindahMhs.status === 200 &&
      barisMhsDM?.nama === 'Mahasiswa Uji Master Dua' &&
      barisMhsDM.prodiId === prodi.id &&
      barisMhsDM.angkatanId === angkatan.id &&
      logPindah?.rincian?.nim === NIM_DM &&
      logPindah.rincian.sebelum?.prodi === PRODI_UJI_B &&
      logPindah.rincian.sesudah?.prodi === prodi.nama,
    JSON.stringify(pindahMhs.isi),
  )
  const pindahBernilai = await kirimMaster(sa, 'mahasiswa', { aksi: 'ubah', nim: NIM, prodi: PRODI_UJI_B, alasan: ALASAN_DM })
  cek(
    'mahasiswa yang sudah punya nilai tidak bisa pindah prodi (409), pesannya menyebut nilainya',
    pindahBernilai.status === 409 && /\d+ nilai/.test(pindahBernilai.isi.galat ?? ''),
    JSON.stringify(pindahBernilai.isi),
  )
  cek(
    'email yang sudah dipakai akun lain ditolak (409)',
    (await kirimMaster(sa, 'mahasiswa', { aksi: 'ubah', nim: NIM_DM, email: EMAIL, alasan: ALASAN_DM })).status === 409,
  )
  cek(
    'NIM yang tidak terdaftar ditolak (404)',
    (await kirimMaster(sa, 'mahasiswa', { aksi: 'ubah', nim: '00000000000', nama: 'X', alasan: ALASAN_DM })).status === 404,
  )

  // Mencabut izin langsung berlaku tanpa masuk ulang; super admin selalu boleh.
  const cabutIzin = await izin(sa, { id: akunAdmin.id, aktif: false, alasan: ALASAN_DM })
  await logBaru('UBAH_IZIN', 'akun ' + EMAIL_ADMIN)
  cek('super admin mencabut izin', cabutIzin.status === 200 && cabutIzin.isi.akun?.kelolaMaster === false)
  cek('sesudah dicabut, sesi admin langsung tanpa izin tanpa masuk ulang', (await admin('/api/sesi')).isi.akun?.kelolaMaster === false)
  const isiBalikFak = { jenis: 'fakultas', aksi: 'ubah', nama: FAK_UJI_B, namaBaru: FAK_UJI, alasan: ALASAN_DM }
  cek('admin tidak pernah boleh menulis data master (403)', (await kirimMaster(admin, 'prodi', isiBalikFak)).status === 403)
  const saLangsung = await kirimMaster(sa, 'prodi', isiBalikFak)
  await logBaru('UBAH_FAKULTAS', 'fakultas ' + FAK_UJI_B)
  cek('super admin selalu boleh mengelola data master', saLangsung.status === 200, JSON.stringify(saLangsung.isi))

  // Admin juga bisa meminta akses baca sendiri: selalu menjadi permintaan, dan disetujui berarti izinnya menyala.
  cek('permintaan akses baca tanpa alasan ditolak (400)', (await admin('/api/master/akses', { metode: 'POST', isi: { alasan: '' } })).status === 400)
  const mintaAkses = await admin('/api/master/akses', { metode: 'POST', isi: { alasan: 'Mencocokkan data angkatan dengan rekap prodi' } })
  if (mintaAkses.isi?.permintaan?.id) {
    permintaanUji.push(Number(mintaAkses.isi.permintaan.id.slice(2)))
    targetLog.push('permintaan ' + mintaAkses.isi.permintaan.id)
  }
  cek(
    'admin meminta akses baca data master: menunggu, izin belum menyala',
    mintaAkses.isi?.menunggu === true && (await admin('/api/sesi')).isi.akun?.kelolaMaster === false,
    JSON.stringify(mintaAkses.isi),
  )
  const setujuiAkses = await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: mintaAkses.isi?.permintaan?.id, keputusan: 'disetujui' } })
  cek(
    'super admin menyetujui: izin lihat admin menyala',
    setujuiAkses.isi?.ok === true && (await admin('/api/sesi')).isi.akun?.kelolaMaster === true,
    JSON.stringify(setujuiAkses.isi),
  )
  cek('izin dari permintaan tetap tidak membuka pintu tulis (403)', (await kirimMaster(admin, 'prodi', isiBalikFak)).status === 403)

  /* ------------------------------ aspek CPMK ------------------------------ */
  garis('20. ASPEK CPMK (TAMBAH, STRUKTUR, ARSIP)')
  aspekAsliUji = await db.aspek.findMany()
  const ALASAN_ASPEK = 'Uji otomatis aspek CPMK'
  const KOMPONEN_UJI = [{ label: 'Tugas uji aspek', sumber: 'MK', jenis: 'TUGAS', ranah: 'kognitif', status: 'resmi' }]
  const kirimAspek = (pelaku, isi) =>
    pelaku('/api/kurikulum/aspek', { metode: 'POST', isi: { versi: KURIKULUM_TERPASANG.versi, ...isi } })
  /** Log terbaru untuk aksi itu pada aspek `id`; id-nya dicatat supaya dihapus di bersihkan(). */
  const logAspek = async (aksi, id) => {
    const l = await db.logAktivitas.findFirst({ where: { aksi, target: { startsWith: 'aspek ' + id + ' ' } }, orderBy: { id: 'desc' } })
    if (l) logAspekUji.push(l.id)
    return l
  }
  /** Transkrip mahasiswa uji (angkatan berjalan) dan NIM2 (angkatan ANG_A, terkunci di bagian 8) dari /api/data. */
  const transkripUji = async () => {
    const semua = (await sa('/api/data')).isi.mahasiswa ?? []
    const cari = (nim) => semua.find((m) => m.nim === nim)
    return { aktif: hitungTranskrip(cari(NIM)), kunci: hitungTranskrip(cari(NIM2)), mhs2: cari(NIM2) }
  }

  const awalAspek = await transkripUji()
  cek(
    'angkatan terkunci menyimpan susunan aspek saat dikunci',
    JSON.stringify(awalAspek.mhs2?.aspekKunci) === JSON.stringify(getAspekList().map((a) => a.id)),
    JSON.stringify(awalAspek.mhs2?.aspekKunci),
  )
  const totalAwal = awalAspek.aktif.akhir.aspekTotal
  const isiTambah = {
    aksi: 'tambah',
    cluster: 'CL6',
    semester: 1,
    nama: 'Aspek Uji ' + SUF,
    deskripsi: 'Deskripsi aspek uji otomatis.',
    komponen: KOMPONEN_UJI,
    alasan: ALASAN_ASPEK,
  }
  const kodeUji = 'C.' + (90 + (Number(SUF) % 9)) + '.'
  cek('dosen tidak boleh mengelola aspek (403)', (await kirimAspek(dosen, { ...isiTambah, kode: kodeUji })).status === 403)
  cek('mahasiswa tidak boleh mengelola aspek (403)', (await kirimAspek(mhs, { ...isiTambah, kode: kodeUji })).status === 403)
  cek('versi kurikulum basi ditolak (409)', (await kirimAspek(sa, { ...isiTambah, kode: kodeUji, versi: -1 })).status === 409)
  cek('aspek baru tanpa komponen ditolak (400)', (await kirimAspek(sa, { ...isiTambah, kode: kodeUji, komponen: [] })).status === 400)
  cek('kode yang sudah dipakai ditolak (400)', (await kirimAspek(sa, { ...isiTambah, kode: 'A.1.' })).status === 400)
  cek('cluster tidak dikenal ditolak (400)', (await kirimAspek(sa, { ...isiTambah, kode: kodeUji, cluster: 'CL9' })).status === 400)
  cek('alasan kurang dari 10 karakter ditolak (400)', (await kirimAspek(sa, { ...isiTambah, kode: kodeUji, alasan: 'pendek' })).status === 400)

  // Super admin menambah aspek: langsung tersimpan beserta komponen pertamanya.
  const idAspekUji = idAspekBaru('CL6')
  const versiSebelum = KURIKULUM_TERPASANG.versi
  const tambahAsp = await kirimAspek(sa, { ...isiTambah, kode: kodeUji })
  if (tambahAsp.status === 200) aspekUji.push(idAspekUji)
  const barisAspekUji = await db.aspek.findUnique({ where: { id: idAspekUji } })
  const komponenAspekUji = await db.komponen.findMany({ where: { aspekId: idAspekUji } })
  cek(
    'super admin menambah aspek ' + idAspekUji + ' (' + kodeUji + '): baris aspek dan komponen pertamanya tersimpan',
    tambahAsp.status === 200 &&
      tambahAsp.isi.aspek?.id === idAspekUji &&
      barisAspekUji?.cluster === 'CL6' &&
      barisAspekUji.semester === 1 &&
      barisAspekUji.kode === kodeUji &&
      barisAspekUji.aktif === true &&
      komponenAspekUji.length === 1 &&
      komponenAspekUji[0].id === idAspekUji + '-MK-B1',
    JSON.stringify(tambahAsp.isi.galat ?? barisAspekUji),
  )
  cek('versi kurikulum naik dan jawaban membawa kurikulum baru', KURIKULUM_TERPASANG.versi === versiSebelum + 1 && Boolean(tambahAsp.isi.kurikulum?.aspek?.[idAspekUji]))
  const logTambahAsp = await logAspek('TAMBAH_ASPEK', idAspekUji)
  cek('log TAMBAH_ASPEK mencatat pelaku, alasan, dan komponennya', logTambahAsp?.rincian?.alasan === ALASAN_ASPEK && logTambahAsp.rincian.ditambah?.length === 1)
  const sesudahTambah = await transkripUji()
  cek(
    'mahasiswa angkatan berjalan: aspek baru ikut dihitung dan masih kosong',
    sesudahTambah.aktif.akhir.aspekTotal === totalAwal + 1 && sesudahTambah.aktif.aspekById[idAspekUji]?.komponenKosong.length === 1,
    sesudahTambah.aktif.akhir.aspekTotal,
  )
  cek(
    'angkatan terkunci: aspek baru tidak ikut, jumlah aspek tetap',
    sesudahTambah.kunci.akhir.aspekTotal === awalAspek.kunci.akhir.aspekTotal && !sesudahTambah.kunci.aspekById[idAspekUji],
  )

  // Ubah struktur: kode, semester, cluster (area ikut cluster); ID tetap.
  const kodeUji2 = 'B.' + (90 + (Number(SUF) % 9)) + '.'
  cek('ubah tanpa perubahan ditolak (400)', (await kirimAspek(sa, { aksi: 'ubah', id: idAspekUji, kode: kodeUji, alasan: ALASAN_ASPEK })).status === 400)
  const ubahAsp = await kirimAspek(sa, { aksi: 'ubah', id: idAspekUji, kode: kodeUji2, semester: 2, cluster: 'CL5', alasan: ALASAN_ASPEK })
  const logUbahAsp = await logAspek('UBAH_ASPEK', idAspekUji)
  cek(
    'ubah struktur: kode, semester, dan cluster tersimpan; area mengikuti cluster; log sebelum/sesudah',
    ubahAsp.status === 200 &&
      getAspek(idAspekUji)?.kode === kodeUji2 &&
      getAspek(idAspekUji).semester === 2 &&
      getAspek(idAspekUji).area === 'B' &&
      logUbahAsp?.rincian?.sebelum?.cluster === 'CL6' &&
      logUbahAsp.rincian.sesudah?.cluster === 'CL5',
    JSON.stringify(ubahAsp.isi.galat ?? getAspek(idAspekUji)),
  )

  // Admin biasa mengarsipkan aspek: selalu menjadi permintaan, aspeknya belum berubah sampai disetujui.
  const ajukanArsip = await kirimAspek(admin, { aksi: 'arsipkan', id: idAspekUji, alasan: ALASAN_ASPEK })
  if (ajukanArsip.isi?.permintaan?.id) {
    permintaanUji.push(nomorP(ajukanArsip))
    targetLog.push('permintaan ' + ajukanArsip.isi.permintaan.id)
  }
  cek(
    'admin biasa mengarsipkan: menjadi permintaan KELOLA_ASPEK, aspek masih aktif',
    ajukanArsip.status === 200 && ajukanArsip.isi.menunggu === true && getAspek(idAspekUji)?.aktif === true,
    JSON.stringify(ajukanArsip.isi),
  )
  const setujuArsip = await sa('/api/persetujuan/keputusan', {
    metode: 'POST',
    isi: { id: ajukanArsip.isi.permintaan?.id, keputusan: 'disetujui' },
  })
  await logAspek('ARSIPKAN_ASPEK', idAspekUji)
  cek(
    'super admin menyetujui: aspek diarsipkan, kurikulum baru dibawa pulang',
    setujuArsip.isi.status === 'disetujui' && getAspek(idAspekUji)?.aktif === false && Boolean(setujuArsip.isi.kurikulum),
    JSON.stringify(setujuArsip.isi),
  )
  cek('aspek yang diarsipkan tidak bisa diubah lagi (400)', (await kirimAspek(sa, { aksi: 'ubah', id: idAspekUji, semester: 1, alasan: ALASAN_ASPEK })).status === 400)
  cek('mengarsipkan dua kali ditolak (400)', (await kirimAspek(sa, { aksi: 'arsipkan', id: idAspekUji, alasan: ALASAN_ASPEK })).status === 400)

  // Arsipkan aspek bawaan B4: angkatan berjalan berhenti menghitungnya, angkatan terkunci tetap menghitungnya.
  const arsipB4 = await kirimAspek(sa, { aksi: 'arsipkan', id: 'B4', alasan: ALASAN_ASPEK })
  await logAspek('ARSIPKAN_ASPEK', 'B4')
  const sesudahB4 = await transkripUji()
  cek(
    'arsip B4: angkatan berjalan tidak lagi menghitung B4',
    arsipB4.status === 200 && !sesudahB4.aktif.aspekById.B4 && sesudahB4.aktif.akhir.aspekTotal === totalAwal - 1,
    JSON.stringify(arsipB4.isi.galat ?? sesudahB4.aktif.akhir.aspekTotal),
  )
  cek(
    'arsip B4: angkatan terkunci tetap menghitung B4 dengan nilai akhir yang sama',
    Boolean(sesudahB4.kunci.aspekById.B4) && sesudahB4.kunci.akhir.nilai === awalAspek.kunci.akhir.nilai,
    JSON.stringify([sesudahB4.kunci.akhir.nilai, awalAspek.kunci.akhir.nilai]),
  )
  const komponenB4 = getKomponen('B4')[0]
  const imporB4 = await sa('/api/nilai', {
    metode: 'POST',
    isi: {
      sumber: komponenB4.sumber,
      semester: 3,
      angkatanId: angkatan.id,
      cara: 'import',
      entri: [{ nim: NIM, komponenId: komponenB4.id, nilai: 80 }],
    },
  })
  cek('nilai ke komponen aspek arsip ditolak (400)', imporB4.status === 400 && /diarsipkan/.test(imporB4.isi.galat ?? ''), JSON.stringify(imporB4.isi))
  const penilaianB4 = await sa('/api/kurikulum/penilaian', {
    metode: 'POST',
    isi: { versi: KURIKULUM_TERPASANG.versi, aspekId: 'B4', aspek: {}, komponen: [] },
  })
  cek('editor penilaian menolak aspek arsip (409)', penilaianB4.status === 409, JSON.stringify(penilaianB4.isi))
  const pulihB4 = await kirimAspek(sa, { aksi: 'pulihkan', id: 'B4', alasan: ALASAN_ASPEK })
  await logAspek('PULIHKAN_ASPEK', 'B4')
  cek(
    'pulihkan B4: kembali dihitung untuk angkatan berjalan',
    pulihB4.status === 200 && Boolean((await transkripUji()).aktif.aspekById.B4),
    JSON.stringify(pulihB4.isi.galat ?? ''),
  )
  const logAsp = await sa('/api/log', { metode: 'POST', isi: { jenis: 'aktivitas', aksi: 'ARSIPKAN_ASPEK' } })
  cek('Log Aktivitas bisa disaring dengan aksi ARSIPKAN_ASPEK', logAsp.status === 200 && logAsp.isi.baris?.length >= 2, JSON.stringify(logAsp.isi.galat ?? ''))

  /* ------------------------------ kelas dosen ------------------------------ */
  garis('21. KELAS DOSEN DAN PERBAIKAN NILAI LEWAT SUPER ADMIN')
  // 25 Okt 2026: super admin memilih angkatan yang diampu dosen, dan kelasnya angkatan itu, termasuk yang sudah selesai.
  // Nilai untuk angkatan yang sudah selesai atau disahkan diajukan ke super admin dan baru tertulis saat disetujui.
  const tambahDosen = await sa('/api/akses/tambah', {
    metode: 'POST',
    isi: {
      peran: 'dosen', email: DOSEN_KELAS.email, sandi: DOSEN_KELAS.sandi, nama: 'Dosen Uji Kelas', nip: DOSEN_KELAS.nip,
      jabatan: 'Dosen', prodi: prodi.nama, sumber: 'MK', semester: 1, angkatan: [ANG_A],
    },
  })
  cek(
    'super admin menambah dosen beserta angkatan yang diampu',
    tambahDosen.status === 200 && tambahDosen.isi.akun?.angkatanDiampu?.map((a) => a.id).join() === ANG_A,
    JSON.stringify(tambahDosen.isi),
  )
  const idDosenKelas = tambahDosen.isi.akun?.id
  const ubahKelas = (p, isi) => p('/api/akses/kelas', { metode: 'POST', isi: { id: idDosenKelas, prodi: prodi.nama, sumber: 'MK', semester: 1, ...isi } })
  cek('angkatan yang tidak ada ditolak (400)', (await ubahKelas(sa, { angkatan: ['TIDAK-ADA'] })).status === 400)
  cek('admin biasa tidak boleh mengubah kelas dosen (403)', (await ubahKelas(admin, { angkatan: [] })).status === 403)
  cek('kelas hanya untuk akun dosen (409)', (await ubahKelas(sa, { id: akunUji.id, angkatan: [] })).status === 409)

  const dk = peramban()
  cek('dosen uji masuk', (await dk('/api/masuk', { metode: 'POST', isi: { email: DOSEN_KELAS.email, password: DOSEN_KELAS.sandi } })).status === 200)
  cek('sesi dosen membawa angkatan yang diampu', (await dk('/api/sesi')).isi.akun?.dosen?.angkatan?.join() === ANG_A)
  const dataDk = (await dk('/api/data')).isi
  cek(
    'kelasnya hanya angkatan yang diampu, termasuk yang sudah selesai dan disahkan',
    dataDk.mahasiswa.some((m) => m.nim === NIM2) && !dataDk.mahasiswa.some((m) => m.nim === NIM),
    JSON.stringify(dataDk.mahasiswa.map((m) => m.nim)),
  )

  const selUasA = () => db.nilai.findUnique({ where: { mahasiswaId_komponenId: { mahasiswaId: mahasiswaId2, komponenId: 'A1-MK-UAS' } } })
  const unggahDk = (nilai, alasan) => dk('/api/nilai/dosen', { metode: 'POST', isi: { entri: [{ nim: NIM2, komponenId: 'A1-MK-UAS', nilai }], alasan } })
  const tanpaAlasanDk = await unggahDk(73)
  cek('perbaikan angkatan disahkan tanpa alasan ditahan (400), tidak ada yang tertulis', tanpaAlasanDk.status === 400 && (await selUasA()) === null, JSON.stringify(tanpaAlasanDk.isi))
  const ajuan = await unggahDk(73, 'Uji: nilai UAS dikoreksi sesudah banding.')
  const idAjuan = ajuan.isi.permintaan?.id
  if (idAjuan) {
    permintaanUji.push(Number(idAjuan.slice(2)))
    targetLog.push('permintaan ' + idAjuan)
  }
  cek(
    'perbaikan diajukan ke super admin, nilainya belum berubah',
    ajuan.status === 200 && ajuan.isi.jumlah === 0 && ajuan.isi.permintaan?.aksi === 'PERBAIKAN_NILAI_DOSEN' && (await selUasA()) === null,
    JSON.stringify(ajuan.isi),
  )
  const pDosen = (await dk('/api/data')).isi.permintaan?.find((p) => p.id === idAjuan)
  cek('dosen melihat permintaannya menunggu', pDosen?.status === 'menunggu' && pDosen.milikSaya === true, JSON.stringify(pDosen))
  const pSuper = (await sa('/api/data')).isi.permintaan?.find((p) => p.id === idAjuan)
  cek(
    'super admin membaca nilai lama ke baru dan alasan dosen',
    Boolean(pSuper?.ringkasan?.baris?.some((b) => b.includes(NIM2) && b.includes('→ 73'))) && pSuper.alasan === 'Uji: nilai UAS dikoreksi sesudah banding.',
    JSON.stringify(pSuper?.ringkasan),
  )
  const setujuAjuan = await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: idAjuan, keputusan: 'disetujui' } })
  const selSetuju = await selUasA()
  cek(
    'disetujui: nilainya tertulis atas nama dosen',
    setujuAjuan.isi.ok === true && selSetuju?.nilai === 73 && selSetuju.penilaiId === idDosenKelas,
    JSON.stringify(setujuAjuan.isi),
  )
  const batchAjuan = selSetuju?.batchId ? await db.batch.findUnique({ where: { id: selSetuju.batchId } }) : null
  if (batchAjuan) targetLog.push('batch ' + batchAjuan.id)
  cek(
    'batch-nya unggahan dosen, dan perubahan data disahkan tercatat beserta alasan dosen',
    batchAjuan?.cara === 'unggah-dosen' && batchAjuan.aktorId === idDosenKelas &&
      (await logAda('UBAH_DATA_TERKUNCI', 'batch ' + batchAjuan.id))?.rincian?.alasan === 'Uji: nilai UAS dikoreksi sesudah banding.',
    JSON.stringify(batchAjuan),
  )
  cek('riwayat dosen memuat unggahan dari permintaan yang disetujui', Boolean((await dk('/api/data')).isi.unggahan?.some((u) => u.id === batchAjuan?.id)))

  // Ditarik sebelum diputuskan: tidak ada yang berubah, dan super admin tidak bisa memutuskannya lagi.
  const ajuan2 = await unggahDk(75, 'Uji: perbaikan yang akan ditarik.')
  const idAjuan2 = ajuan2.isi.permintaan?.id
  if (idAjuan2) {
    permintaanUji.push(Number(idAjuan2.slice(2)))
    targetLog.push('permintaan ' + idAjuan2)
  }
  const tarikAjuan = await dk('/api/persetujuan/batal', { metode: 'POST', isi: { id: idAjuan2 } })
  cek('dosen bisa menarik permintaannya sendiri', tarikAjuan.isi.ok === true && (await selUasA())?.nilai === 73, JSON.stringify(tarikAjuan.isi))
  cek(
    'permintaan yang ditarik tidak bisa disetujui lagi',
    (await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: idAjuan2, keputusan: 'disetujui' } })).isi.ok === false,
  )

  // Kelas dikembalikan ke otomatis: angkatan yang sudah selesai keluar dari kelasnya.
  const otomatis = await ubahKelas(sa, { angkatan: [] })
  cek('super admin mengubah kelas dosen menjadi otomatis', otomatis.status === 200 && otomatis.isi.akun?.angkatanDiampu?.length === 0, JSON.stringify(otomatis.isi))
  cek(
    'perubahan kelas tercatat beserta sebelum dan sesudahnya',
    (await logAda('UBAH_KELAS_DOSEN', 'akun ' + DOSEN_KELAS.email))?.rincian?.sebelum?.angkatanDiampu?.[0]?.id === ANG_A,
  )
  cek('tanpa angkatan terpilih, angkatan yang sudah selesai tidak lagi di kelasnya', !(await dk('/api/data')).isi.mahasiswa.some((m) => m.nim === NIM2))

  // Nilai uji dikembalikan (angkatan disahkan: membatalkannya wajib beralasan).
  if (batchAjuan) {
    await sa('/api/nilai/rollback', { metode: 'POST', isi: { id: batchAjuan.id, alasan: 'Uji: mengembalikan nilai bagian kelas dosen.' } })
  }
  cek('nilai uji kembali kosong sesudah dibatalkan', (await selUasA()) === null)

  /* ------------------------------ keluar ------------------------------ */
  garis('22. KELUAR')
  await sa('/api/keluar', { metode: 'POST' })
  await mhs('/api/keluar', { metode: 'POST' })
  cek('setelah keluar, sesi tidak berlaku', (await mhs('/api/sesi')).status === 401)
} catch (e) {
  gagal++
  console.log('GAGAL tak terduga: ' + (e?.stack ?? e))
} finally {
  await bersihkan()
  const sisa = await db.mahasiswa.count({ where: { nim: NIM } })
  console.log('\nData uji dibersihkan: ' + (sisa === 0 ? 'ya' : 'TIDAK — ' + sisa + ' sisa'))
  await db.$disconnect()
}

console.log(gagal ? '\n' + gagal + ' pemeriksaan gagal' : '\nSemua pemeriksaan lulus')
process.exitCode = gagal ? 1 : 0
