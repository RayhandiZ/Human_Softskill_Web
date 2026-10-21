/* Uji sambungan basis data: setiap pintu API dijalankan sungguhan terhadap MySQL.

   Membuat satu akun mahasiswa sementara (NIM berawalan UJI) dan menghapus seluruh jejaknya di
   akhir, berhasil maupun gagal. Butuh MySQL menyala dan `npm run db:seed` sudah pernah dijalankan
   (memakai akun admin@umn.ac.id, super.admin@umn.ac.id, dan simon.petrus@lecturer.umn.ac.id dengan
   sandi umn12345).
   Bagian kurikulum menambah satu indikator dan menimpa dua pengaturan sebentar, lalu mengembalikannya;
   penanda VERSI_KURIKULUM ikut naik dan tidak diturunkan lagi. Bagian bobot mengubah bobot A.1 lewat
   pintu API lalu mengembalikannya; kolom komponen A.1 dan catatan log yang dibuatnya dipulihkan di akhir.
   Bagian persetujuan membuat beberapa PermintaanAdmin untuk mahasiswa uji yang sudah lewat Semester 3;
   permintaan dan catatan log-nya ikut dihapus di akhir.
   Bagian periode memindahkan periode akademik satu semester maju lalu kembali; baris Konfigurasi PERIODE_AKTIF
   dikembalikan persis seperti sebelumnya (atau dihapus bila dulu belum ada) dan catatan log-nya dihapus.
   Bagian akses mencabut lalu memulihkan akses akun mahasiswa sementara, lalu membuat tiga akun sementara tanpa
   data (admin, dosen, mahasiswa) lewat /api/akses/tambah dan menghapusnya lewat /api/akses/hapus; log-nya ikut
   dihapus, begitu juga akunnya bila uji berhenti sebelum sempat menghapus. */

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
import * as usulan from '../app/api/usulan/route.js'
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
import {
  KOMPONEN,
  KOMPONEN_BAWAAN,
  KUNCI_VERSI_KURIKULUM,
  KURIKULUM_TERPASANG,
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
  '/api/usulan': usulan,
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
/** Target baris LogAktivitas yang dibuat uji ini; ditambah id batch begitu diketahui. */
const targetLog = [
  'angkatan ' + ANG_A,
  'angkatan ' + ANG_B,
  'mahasiswa ' + NIM,
  'mahasiswa ' + NIM2,
  'akun ' + EMAIL,
  ...Object.values(HAPUS_UJI).map((a) => 'akun ' + a.email),
]

async function bersihkanMahasiswa(email) {
  const p = await db.pengguna.findUnique({ where: { email }, include: { mahasiswa: true } })
  const m = p?.mahasiswa
  if (m) {
    const batch = (await db.auditLog.findMany({ where: { mahasiswaId: m.id }, select: { batchId: true } }))
      .map((a) => a.batchId)
      .filter(Boolean)
    const usulanId = (await db.usulanEntri.findMany({ where: { nim: m.nim }, select: { usulanId: true } })).map((e) => e.usulanId)
    await db.nilai.deleteMany({ where: { mahasiswaId: m.id } })
    await db.auditLog.deleteMany({ where: { mahasiswaId: m.id } })
    await db.batch.deleteMany({ where: { id: { in: [...new Set(batch)] } } })
    await db.penguncian.deleteMany({ where: { mahasiswaId: m.id } })
    await db.pengajuanKoreksi.deleteMany({ where: { mahasiswaId: m.id } })
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

async function bersihkan() {
  await pulihkanPeriode()
  await pulihkanPenilaian()
  await pulihkanBobot()
  await pulihkanKurikulum()
  if (permintaanUji.length) await db.permintaanAdmin.deleteMany({ where: { id: { in: permintaanUji } } })
  await bersihkanMahasiswa(EMAIL)
  await bersihkanMahasiswa(EMAIL2)
  await bersihkanMahasiswa(EMAIL3)
  // Akun bagian hapus akun yang belum sempat terhapus (uji berhenti di tengah).
  for (const { email } of Object.values(HAPUS_UJI)) {
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
  const kirimNilai = (n) =>
    admin('/api/nilai', {
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
  const ditolak = await admin('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 3, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'B3-MK-T1', nilai: 70 }] },
  })
  cek('R1: aspek semester 3 ditolak untuk mahasiswa semester 2', ditolak.status === 400, JSON.stringify(ditolak.isi))
  const semSalah = await admin('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 2, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: 70 }] },
  })
  cek('komponen semester 1 ditolak bila batch berlabel semester 2', semSalah.status === 400, JSON.stringify(semSalah.isi))
  const semLuar = await admin('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 99, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: 70 }] },
  })
  cek('semester di luar program ditolak', semLuar.status === 400, JSON.stringify(semLuar.isi))

  await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: b1.isi.id } })
  cek('rollback batch lama tidak menghapus nilai batch sesudahnya', (await sel())?.nilai === 90)
  cek('rollback kedua kalinya ditolak', (await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: b1.isi.id } })).isi.ok === false)
  await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: b2.isi.id } })
  cek('rollback batch terakhir mengosongkan sel', (await sel()) === null)
  const dBatch = (await admin('/api/data')).isi.batch
  cek('riwayat batch menandai keduanya dibatalkan', [b1.isi.id, b2.isi.id].every((id) => dBatch.find((b) => b.id === id)?.status === 'dibatalkan'))

  /* ------------------------------ penguncian ------------------------------ */
  garis('4. PENGUNCIAN ASPEK')
  await kirimNilai(85)
  const kunciTolak = await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'final' } })
  cek('aspek yang komponennya belum lengkap tidak bisa final', kunciTolak.status === 400, JSON.stringify(kunciTolak.isi))
  const tahan = await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'sementara' } })
  cek('tahan sementara tersimpan', tahan.status === 200 && (await db.penguncian.count({ where: { mahasiswaId } })) === 1)
  const mUji = (await mhs('/api/data')).isi.mahasiswa[0]
  cek('mahasiswa melihat penandaan dan penilainya', mUji.penguncian.A1?.status === 'sementara' && mUji.nilai.A1?.komponen['A1-MK-T1']?.penilai === 'Biro Kemahasiswaan', JSON.stringify(mUji.penguncian))
  await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: null } })
  cek('penandaan bisa dilepas', (await db.penguncian.count({ where: { mahasiswaId } })) === 0)

  /* ------------------------------ koreksi ------------------------------ */
  garis('5. PENGAJUAN KOREKSI')
  const k = await mhs('/api/koreksi', { metode: 'POST', isi: { komponenId: 'A1-MK-T1', alasan: 'Uji: nilai tugas belum lengkap.' } })
  cek('mahasiswa mengajukan koreksi', k.status === 200 && /^K-\d+$/.test(k.isi.id), JSON.stringify(k.isi))
  cek('alasan kosong ditolak', (await mhs('/api/koreksi', { metode: 'POST', isi: { komponenId: 'A1-MK-T1', alasan: ' ' } })).status === 400)
  cek('admin melihat pengajuannya', (await admin('/api/data')).isi.koreksi.some((x) => x.id === k.isi.id && x.status === 'menunggu'))
  const putus = await admin('/api/koreksi/keputusan', { metode: 'POST', isi: { id: k.isi.id, keputusan: 'disetujui', catatan: 'Uji disetujui.' } })
  cek('admin memutuskan', putus.isi.ok === true)
  const kMhs = (await mhs('/api/data')).isi.koreksi.find((x) => x.id === k.isi.id)
  cek('mahasiswa melihat keputusan beserta catatannya', kMhs?.status === 'disetujui' && kMhs.keputusan?.catatan === 'Uji disetujui.', JSON.stringify(kMhs))
  cek('tidak bisa diputuskan dua kali', (await admin('/api/koreksi/keputusan', { metode: 'POST', isi: { id: k.isi.id, keputusan: 'ditolak' } })).isi.ok === false)

  /* ------------------------------ usulan dosen ------------------------------ */
  garis('6. USULAN NILAI DOSEN')
  const u1 = await dosen('/api/usulan', { metode: 'POST', isi: { cara: 'manual', catatan: 'Uji usulan.', entri: [{ nim: NIM, komponenId: 'A1-MK-UAS', nilai: 88 }] } })
  cek('dosen mengirim usulan', u1.status === 200 && /^U-\d+$/.test(u1.isi.id), JSON.stringify(u1.isi))
  cek('komponen di luar kelasnya ditolak', (await dosen('/api/usulan', { metode: 'POST', isi: { entri: [{ nim: NIM, komponenId: 'A4-MK-UTS', nilai: 70 }] } })).status === 400)
  const selUas = () => db.nilai.findUnique({ where: { mahasiswaId_komponenId: { mahasiswaId, komponenId: 'A1-MK-UAS' } } })
  cek('usulan belum menyentuh transkrip', (await selUas()) === null)
  const setuju = await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: u1.isi.id, keputusan: 'disetujui' } })
  cek('admin menyetujui', setuju.isi.ok === true, JSON.stringify(setuju.isi))
  const uas = await selUas()
  cek('nilai masuk atas nama dosen pengusul', uas?.nilai === 88 && uas.penilaiId !== (await db.pengguna.findUnique({ where: { email: EMAIL_ADMIN } })).id)
  const uDosen = (await dosen('/api/data')).isi.usulan.find((x) => x.id === u1.isi.id)
  cek('dosen melihat usulannya disetujui beserta batch-nya', uDosen?.status === 'disetujui' && uDosen.batchId && uDosen.keputusan?.oleh === 'Biro Kemahasiswaan', JSON.stringify(uDosen))
  const u2 = await dosen('/api/usulan', { metode: 'POST', isi: { entri: [{ nim: NIM, komponenId: 'A2-MK-UTS', nilai: 75 }] } })
  cek('tolak tanpa alasan tidak diterima', (await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: u2.isi.id, keputusan: 'ditolak' } })).status === 400)
  cek('tolak dengan alasan diterima', (await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: u2.isi.id, keputusan: 'ditolak', catatan: 'Uji ditolak.' } })).isi.ok === true)
  cek('penolakan tidak menulis nilai', (await db.nilai.count({ where: { mahasiswaId, komponenId: 'A2-MK-UTS' } })) === 0)

  /* ------------------------------ profil ------------------------------ */
  garis('7. PROFIL')
  cek('telepon tidak sah ditolak', (await mhs('/api/profil', { metode: 'PUT', isi: { telepon: 'abc' } })).status === 400)
  await mhs('/api/profil', { metode: 'PUT', isi: { telepon: '021 5422 0808', ponsel: '', alamat: 'Gading Serpong', foto: null, fotoSumber: null } })
  const pr = (await mhs('/api/data')).isi.profil
  cek('profil tersimpan di basis data', pr?.telepon === '021 5422 0808' && pr.alamat === 'Gading Serpong', JSON.stringify(pr))
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
  // ANG_A sudah lewat Semester 3: perubahan datanya oleh admin biasa menjadi permintaan (bagian 14). Aturan
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

  // --- sesudah Semester 3 dosen tidak lagi bertanggung jawab: usulannya ditolak, mahasiswanya tidak terlihat ---
  const usulTerkunci = await dosen('/api/usulan', { metode: 'POST', isi: { cara: 'manual', entri: [{ nim: NIM2, komponenId: 'A1-MK-UAS', nilai: 70 }] } })
  cek('dosen tidak bisa mengusulkan untuk mahasiswa yang sudah lewat Semester 3', usulTerkunci.status === 400 && /lewat Semester 3/.test(usulTerkunci.isi.galat ?? ''), JSON.stringify(usulTerkunci.isi))
  const dataDosenA = (await dosen('/api/data')).isi
  cek('dosen tidak melihat mahasiswa yang sudah lewat Semester 3, tetap melihat yang belum', !dataDosenA.mahasiswa.some((m) => m.nim === NIM2) && dataDosenA.mahasiswa.some((m) => m.nim === NIM))
  cek('penolakan dosen tidak menulis nilai', (await nilaiMhs2()) === 0)

  // --- aspek final MANUAL pada angkatan yang belum terkunci ---
  await db.penguncian.create({ data: { mahasiswaId, aspekId: 'A2', status: 'FINAL', olehId: adminId } })
  const ubahA2 = (alasan) =>
    admin('/api/nilai', {
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

  // --- tindakan admin (LogAktivitas) ---
  const akt = await bacaLog({ jenis: 'aktivitas', dari: hariIni, ukuran: 100 })
  const barisKunci = akt.isi.baris.find((b) => b.aksi === 'KUNCI_ANGKATAN' && b.target === 'angkatan ' + ANG_A)
  cek('aktivitas: penguncian angkatan terbaca beserta pelakunya', akt.status === 200 && barisKunci?.aktor === 'Super Admin' && barisKunci.rincian?.label === 'Uji A ' + SUF, JSON.stringify(barisKunci))
  const barisUbah = akt.isi.baris.find((b) => b.aksi === 'UBAH_DATA_TERKUNCI' && b.target === 'batch ' + denganAlasan.isi.id)
  cek('aktivitas: alasan perubahan data terkunci terbaca', barisUbah?.rincian?.alasan === 'Melengkapi nilai susulan sesudah semester 3.', JSON.stringify(barisUbah))
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

  /* ------------------------------ kurikulum ------------------------------ */
  garis('11. KURIKULUM DARI BASIS DATA')
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
  garis('12. BOBOT KURIKULUM')
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
  // simpanan admin biasa untuk itu menunggu persetujuan (diuji di bagian 14).
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
  garis('13. SUPER ADMIN')
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
  garis('14. PERSETUJUAN SUPER ADMIN')
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
  const isiA = (alasan) => ({
    sumber: 'MK', semester: 1, angkatanId: ANG_A, cara: 'manual', entri: [{ nim: NIM2, komponenId: 'A1-MK-SIKAP', nilai: 85 }], alasan,
  })
  cek('admin biasa tanpa alasan ditolak (400)', (await ajukan('/api/nilai', isiA(''))).status === 400)
  const p1 = await ajukan('/api/nilai', isiA('Melengkapi nilai sikap sesudah semester 3'))
  cek('admin biasa: dijawab menunggu persetujuan, nilai belum masuk', p1.status === 200 && p1.isi.menunggu === true && (await nilaiMhs2()) === 0, JSON.stringify(p1.isi))
  const daftarAdmin = (await admin('/api/data')).isi.permintaan ?? []
  cek('permintaan tampil di data admin sebagai miliknya', daftarAdmin.some((p) => p.id === p1.isi.permintaan?.id && p.milikSaya && p.status === 'menunggu'))
  cek('admin biasa tidak bisa memutuskan (403)', (await admin('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p1.isi.permintaan?.id, keputusan: 'disetujui' } })).status === 403)
  const putus1 = await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p1.isi.permintaan?.id, keputusan: 'disetujui' } })
  const p1Db = await db.permintaanAdmin.findUnique({ where: { id: nomorP(p1) } })
  if (p1Db?.hasil?.batchId) targetLog.push('batch ' + p1Db.hasil.batchId)
  cek(
    'super admin menyetujui: nilai masuk atas nama admin pengaju',
    putus1.isi.ok === true && (await nilaiMhs2()) === 1 && p1Db?.status === 'DISETUJUI' &&
      (await db.batch.findUnique({ where: { id: p1Db.hasil?.batchId ?? '' } }))?.aktorId === adminId,
    JSON.stringify(putus1.isi),
  )
  const p2 = await ajukan('/api/nilai/rollback', { id: p1Db?.hasil?.batchId, alasan: 'Ternyata nilai sikap belum final' })
  cek('rollback oleh admin biasa juga menunggu', p2.isi.menunggu === true && (await nilaiMhs2()) === 1, JSON.stringify(p2.isi))
  cek('admin menarik permintaannya', (await admin('/api/persetujuan/batal', { metode: 'POST', isi: { id: p2.isi.permintaan?.id } })).isi.ok === true)
  const p3 = await ajukan('/api/nilai/rollback', { id: p1Db?.hasil?.batchId, alasan: 'Ternyata nilai sikap belum final' })
  cek('menolak tanpa catatan ditolak (400)', (await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p3.isi.permintaan?.id, keputusan: 'ditolak' } })).status === 400)
  const tolak3 = await sa('/api/persetujuan/keputusan', { metode: 'POST', isi: { id: p3.isi.permintaan?.id, keputusan: 'ditolak', catatan: 'Nilai sudah benar' } })
  cek('ditolak: nilai tetap', tolak3.isi.status === 'ditolak' && (await nilaiMhs2()) === 1, JSON.stringify(tolak3.isi))
  cek(
    'pengajuan, keputusan, dan penarikan tercatat di log',
    Boolean(await logAda('AJUKAN_PERSETUJUAN', 'permintaan ' + p1.isi.permintaan?.id)) &&
      Boolean(await logAda('PUTUSKAN_PERSETUJUAN', 'permintaan ' + p1.isi.permintaan?.id)) &&
      Boolean(await logAda('TARIK_PERMINTAAN', 'permintaan ' + p2.isi.permintaan?.id)),
  )
  const biasa = await kirimNilai(87)
  cek('mahasiswa yang belum lewat Semester 3 tetap langsung tersimpan', biasa.status === 200 && !biasa.isi.menunggu, JSON.stringify(biasa.isi).slice(0, 120))

  /* ------------------------------ penilaian ------------------------------ */
  garis('15. PENILAIAN ASPEK (INPUT MANUAL)')
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
  garis('16. PERIODE AKADEMIK')
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
  garis('17. AKSES PENGGUNA')
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

  /* ------------------------------ keluar ------------------------------ */
  garis('18. KELUAR')
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
