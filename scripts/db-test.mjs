/* Uji sambungan basis data: setiap pintu API dijalankan sungguhan terhadap MySQL.

   Membuat satu akun mahasiswa sementara (NIM berawalan UJI) dan menghapus seluruh jejaknya di
   akhir, berhasil maupun gagal. Butuh MySQL menyala dan `npm run db:seed` sudah pernah dijalankan
   (memakai akun admin@umn.ac.id dan simon.petrus@lecturer.umn.ac.id dengan sandi umn12345). */

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
}

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
/** Target baris LogAktivitas yang dibuat uji ini; ditambah id batch begitu diketahui. */
const targetLog = ['angkatan ' + ANG_A, 'angkatan ' + ANG_B, 'mahasiswa ' + NIM, 'mahasiswa ' + NIM2]

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

async function bersihkan() {
  await bersihkanMahasiswa(EMAIL)
  await bersihkanMahasiswa(EMAIL2)
  await db.logAktivitas.deleteMany({ where: { target: { in: targetLog } } })
  await db.angkatan.deleteMany({ where: { id: { in: [ANG_A, ANG_B] } } })
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

  /* ------------------------------ sesi ------------------------------ */
  garis('1. MASUK, SESI, DAN WEWENANG')
  cek('tanpa cookie: /api/data ditolak 401', (await tamu('/api/data')).status === 401)
  cek('sandi salah ditolak', (await tamu('/api/masuk', { metode: 'POST', isi: { email: EMAIL, password: 'salah' } })).status === 401)
  cek('admin masuk', (await admin('/api/masuk', { metode: 'POST', isi: { email: 'admin@umn.ac.id', password: 'umn12345' } })).status === 200)
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
  cek('nilai masuk atas nama dosen pengusul', uas?.nilai === 88 && uas.penilaiId !== (await db.pengguna.findUnique({ where: { email: 'admin@umn.ac.id' } })).id)
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
  const adminId = (await db.pengguna.findUnique({ where: { email: 'admin@umn.ac.id' } })).id
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

  const kunciA = await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'Uji A ' + SUF } })
  const barisA = await db.angkatan.findUnique({ where: { id: ANG_A } })
  cek(
    'angkatan terkunci beserta pencatat dan waktunya',
    kunciA.status === 200 && kunciA.isi.ok === true && barisA.status === 'TERKUNCI' && barisA.dikunciOleh === adminId && barisA.dikunciPada != null,
    JSON.stringify(kunciA.isi),
  )
  cek('penguncian angkatan tercatat di log', Boolean(await logAda('KUNCI_ANGKATAN', 'angkatan ' + ANG_A)))
  cek('mengunci dua kali ditolak (ok false)', (await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'Uji A ' + SUF } })).isi.ok === false)
  const dataAdmin = (await admin('/api/data')).isi
  cek('data admin menunjukkan status angkatan terkunci', dataAdmin.mahasiswa.find((m) => m.nim === NIM2)?.statusAngkatan === 'terkunci')

  // --- admin mengubah / melengkapi data terkunci, wajib beralasan ---
  const isiTerkunci = (komponenId, nilaiBaru, alasan) =>
    admin('/api/nilai', {
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

  cek('rollback data terkunci tanpa alasan ditolak', (await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: denganAlasan.isi.id } })).status === 400 && (await nilaiMhs2()) === 1)
  const rbTerkunci = await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: denganAlasan.isi.id, alasan: 'Salah memasukkan nilai, dibatalkan.' } })
  cek('rollback dengan alasan berhasil dan tercatat', rbTerkunci.isi.ok === true && (await nilaiMhs2()) === 0 && Boolean(await logAda('ROLLBACK_DATA_TERKUNCI', 'batch ' + denganAlasan.isi.id)), JSON.stringify(rbTerkunci.isi))

  // --- dosen tetap boleh mengusulkan; admin yang memutuskan, dengan catatan ---
  const usulTerkunci = await dosen('/api/usulan', { metode: 'POST', isi: { cara: 'manual', entri: [{ nim: NIM2, komponenId: 'A1-MK-UAS', nilai: 70 }] } })
  cek('dosen tetap boleh mengusulkan untuk angkatan terkunci', usulTerkunci.status === 200, JSON.stringify(usulTerkunci.isi))
  cek('menyetujui usulan data terkunci tanpa catatan ditolak', (await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: usulTerkunci.isi.id, keputusan: 'disetujui' } })).status === 400)
  const setujuTerkunci = await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: usulTerkunci.isi.id, keputusan: 'disetujui', catatan: 'Disetujui setelah memeriksa berkas dosen.' } })
  cek('menyetujui dengan catatan berhasil dan nilai masuk', setujuTerkunci.isi.ok === true && (await nilaiMhs2()) === 1, JSON.stringify(setujuTerkunci.isi))
  const usulSetuju = (await admin('/api/data')).isi.usulan.find((x) => x.id === usulTerkunci.isi.id)
  if (usulSetuju?.batchId) targetLog.push('batch ' + usulSetuju.batchId)
  cek('persetujuan usulan data terkunci tercatat di log', Boolean(usulSetuju?.batchId && (await logAda('UBAH_DATA_TERKUNCI', 'batch ' + usulSetuju.batchId))))

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

  /* ------------------------------ keluar ------------------------------ */
  garis('9. KELUAR')
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
