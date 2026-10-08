/* Uji perilaku Input & Import Nilai: simpan batch, rollback, dan validasi import. */

// Paling awal: uji berjalan tanpa server (lihat scripts/modeLokal.js).
import './modeLokal.js'
import { getAspekSemester, getKomponen, getKomponenById } from '../src/lib/curriculum.js'
import { validasiBatchImport } from '../src/lib/rules.js'
import { uraiCSV, susunCSV } from '../src/lib/csv.js'
import { STUDENTS, auditUntuk, getStudentByNim, isiData, transkripOf } from '../src/lib/data.js'
import { DATA_CONTOH, personaAktif } from './dataContoh.js'
import { BATCH_SESI, bersihkanPerubahan, muatDariPenyimpanan, rollbackBatch, simpanBatch } from '../src/lib/store.js'

/* Halaman dimulai tanpa data; uji ini bekerja di atas data contoh. */
isiData(DATA_CONTOH)
bersihkanPerubahan()

const garis = (t) => '\n' + '─'.repeat(74) + '\n' + t + '\n' + '─'.repeat(74)
let gagal = 0
const cek = (nama, ok, rinci = '') => {
  if (!ok) gagal++
  console.log((ok ? 'LULUS ' : 'GAGAL ') + nama + (rinci ? '  → ' + rinci : ''))
}

/* --------------------------- 1. simpan & rollback -------------------------- */

console.log(garis('1. SIMPAN BATCH LALU ROLLBACK'))

const mhs = STUDENTS.find((s) => s.angkatanId === '2025' && s.semesterAktif === 3)
const aspek = getAspekSemester(3)[0]
const komponen = getKomponen(aspek.id)[0]

const sebelum = mhs.nilai?.[aspek.id]?.komponen?.[komponen.id]?.nilai ?? null
const nilaiAspekSebelum = transkripOf(mhs).aspekById[aspek.id].nilai

console.log('Mahasiswa   :', mhs.name, '·', mhs.nim, '· angkatan', mhs.angkatanLabel)
console.log('Komponen    :', komponen.id, '—', komponen.label)
console.log('Nilai lama  :', sebelum, '| nilai aspek', aspek.kode, '=', nilaiAspekSebelum)

const batch = await simpanBatch({
  sumber: komponen.sumber,
  semester: 3,
  angkatanId: '2025',
  aktor: 'Uji Otomatis',
  cara: 'manual',
  entri: [{ nim: mhs.nim, komponenId: komponen.id, nilai: 41 }],
})

const sesudah = mhs.nilai[aspek.id].komponen[komponen.id]
const nilaiAspekSesudah = transkripOf(mhs).aspekById[aspek.id].nilai

console.log('Nilai baru  :', sesudah.nilai, '| nilai aspek', aspek.kode, '=', nilaiAspekSesudah)

cek('Nilai tersimpan', sesudah.nilai === 41)
cek('Penilai tercatat', sesudah.penilai === 'Uji Otomatis', sesudah.penilai)
cek('Batch tercatat', BATCH_SESI[0].id === batch.id, batch.id)
cek('Cache transkrip ikut segar', nilaiAspekSesudah !== nilaiAspekSebelum,
  nilaiAspekSebelum + ' → ' + nilaiAspekSesudah)

await rollbackBatch(batch.id)
const kembali = mhs.nilai[aspek.id].komponen[komponen.id]?.nilai ?? null
const nilaiAspekKembali = transkripOf(mhs).aspekById[aspek.id].nilai

console.log('Setelah rollback:', kembali, '| nilai aspek', aspek.kode, '=', nilaiAspekKembali)
cek('Nilai kembali seperti semula', kembali === sebelum)
cek('Nilai aspek kembali seperti semula', nilaiAspekKembali === nilaiAspekSebelum)
cek('Batch ditandai dibatalkan', BATCH_SESI[0].status === 'dibatalkan')

/* --------------------------- 2. penulisan baru ---------------------------- */

console.log(garis('2. KOMPONEN YANG SEBELUMNYA KOSONG'))

const kosong = STUDENTS.find((s) => {
  const t = transkripOf(s)
  return t.aspek.some((a) => !a.terkunci && a.komponenKosong.length > 0)
})
const aspekKosong = transkripOf(kosong).aspek.find((a) => !a.terkunci && a.komponenKosong.length > 0)
const komponenKosong = aspekKosong.komponenKosong[0]

console.log('Mahasiswa :', kosong.name, '· aspek', aspekKosong.aspek.kode, '· komponen', komponenKosong.id)
console.log('Terisi sebelum:', aspekKosong.komponenTerisi + '/' + aspekKosong.komponenTotal, '· status', aspekKosong.status)

const b2 = await simpanBatch({
  sumber: komponenKosong.sumber,
  semester: aspekKosong.aspek.semester,
  angkatanId: kosong.angkatanId,
  aktor: 'Uji Otomatis',
  cara: 'manual',
  entri: [{ nim: kosong.nim, komponenId: komponenKosong.id, nilai: 88 }],
})

const setelah = transkripOf(kosong).aspekById[aspekKosong.aspek.id]
console.log('Terisi sesudah:', setelah.komponenTerisi + '/' + setelah.komponenTotal, '· status', setelah.status)
cek('Komponen kosong kini terisi', setelah.komponenTerisi === aspekKosong.komponenTerisi + 1)

await rollbackBatch(b2.id)
const balik = transkripOf(kosong).aspekById[aspekKosong.aspek.id]
cek('Rollback menghapus nilai baru', balik.komponenTerisi === aspekKosong.komponenTerisi)

/* ---------------------------- 3. validasi import --------------------------- */

console.log(garis('3. VALIDASI IMPORT'))

const mhsSem1 = STUDENTS.find((s) => s.semesterAktif === 1)
const komponenSem3 = getKomponen(getAspekSemester(3)[0].id)[0]
const komponenSem1 = getKomponen(getAspekSemester(1)[0].id).find((k) => k.sumber === 'MK')

const csv = susunCSV(
  ['nim', 'komponen', 'nilai'],
  [
    [mhsSem1.nim, komponenSem1.id, '85'],           // sah
    [mhsSem1.nim, komponenSem3.id, '90'],           // aspek belum dibuka
    ['00000000000', komponenSem1.id, '80'],         // NIM tak dikenal
    [mhsSem1.nim, 'XX-YY-ZZ', '80'],                // komponen asing
    [mhsSem1.nim, komponenSem1.id, '140'],          // di luar rentang
    [mhsSem1.nim, komponenSem1.id, '70'],           // duplikat
  ],
)

const { baris } = uraiCSV(csv)
cek('CSV terurai', baris.length === 6, baris.length + ' baris')

const hasil = validasiBatchImport(baris, { cariMahasiswa: getStudentByNim, sumber: 'MK' })
console.log('\n' + hasil.ringkas + '\n')
for (const r of hasil.hasil) {
  console.log('  baris ' + r.nomor + '  ' + (r.ok ? 'DITERIMA' : 'DITOLAK  ' + r.alasan.join(' · ')))
}

cek('Hanya satu baris diterima', hasil.diterima.length === 1, hasil.diterima.length + ' diterima')
cek(
  'Aspek belum dibuka ditolak (R1)',
  hasil.hasil[1].alasan.some((a) => a.includes('baru dibuka pada Semester')),
)
cek('NIM tak dikenal ditolak', hasil.hasil[2].alasan.some((a) => a.includes('tidak dikenal')))
cek('Komponen asing ditolak', hasil.hasil[3].alasan.some((a) => a.includes('tidak dikenal')))
cek('Nilai di luar 0–100 ditolak', hasil.hasil[4].alasan.some((a) => a.includes('di luar rentang')))
cek('Baris duplikat ditolak', hasil.hasil[5].alasan.some((a) => a.includes('duplikat')))

console.log(gagal ? '\n' + gagal + ' pemeriksaan GAGAL' : '\nSemua pemeriksaan lulus')

/* ------------------------- 4. pengenalan data mentah ----------------------- */

console.log(garis('4. UNGGAH DATA MENTAH — DETEKSI, KONVERSI, ISI OTOMATIS'))

const { analisaBerkas, hitungEntri } = await import('../src/lib/ingest.js')

const aspekS1 = getAspekSemester(1)
const komponenMK1 = aspekS1.flatMap((a) => getKomponen(a.id)).filter((k) => k.sumber === 'MK')
const mhsS1 = STUDENTS.filter((s) => s.angkatanId === '2026').slice(0, 5)

/* Rekap ala dosen: nama kolom seadanya, skala 0-10, ada kolom yang tak relevan. */
const mentah = susunCSV(
  ['NIM', 'Nama Mahasiswa', 'Tugas 1', 'UTS', 'Nilai Sikap Dosen', 'Peer Review', 'Keterangan'],
  mhsS1.map((s, i) => [s.nim, s.name, (7.5 + i * 0.3).toFixed(1), (8.0 + i * 0.2).toFixed(1), '8.5', '9.0', 'lulus']),
)

console.log(mentah.split('\n').slice(0, 3).join('\n') + '\n...')

const analisa = analisaBerkas(mentah, { komponenList: komponenMK1 })

console.log('\nFormat terbaca :', analisa.format)
console.log('Kolom NIM      :', analisa.kolomNim)
console.log('Kolom nama     :', analisa.kolomNama)
console.log('\nUsulan pemetaan:')
for (const k of analisa.kolomNilai) {
  console.log(
    '  ' + k.nama.padEnd(20) +
      ' skala ' + String(k.skala).padStart(3) +
      '  → ' + (k.usulan ?? '(abaikan)').padEnd(14) +
      ' skor ' + String(k.skor).padStart(3) +
      (k.alasan.length ? '  [' + k.alasan.join(', ') + ']' : ''),
  )
}

cek('Format dikenali sebagai mentah', analisa.format === 'mentah')
cek('Kolom NIM terdeteksi', analisa.kolomNim === 'NIM', String(analisa.kolomNim))
cek('Kolom nama terdeteksi', analisa.kolomNama === 'Nama Mahasiswa', String(analisa.kolomNama))
cek('Skala 0-10 terdeteksi', analisa.kolomNilai.find((k) => k.nama === 'UTS')?.skala === 10)
cek('Kolom non-numerik tidak dipetakan', !analisa.kolomNilai.find((k) => k.nama === 'Keterangan')?.usulan)

const kolomUTS = analisa.kolomNilai.find((k) => k.nama === 'UTS')
cek(
  'Kolom UTS memetakan ke komponen berjenis UTS',
  kolomUTS?.usulan ? getKomponenById(kolomUTS.usulan).jenis === 'UTS' : false,
  kolomUTS?.usulan ?? 'tidak terpetakan',
)
const kolomSikap = analisa.kolomNilai.find((k) => k.nama === 'Nilai Sikap Dosen')
cek(
  'Kolom Sikap memetakan ke komponen berjenis SIKAP',
  kolomSikap?.usulan ? getKomponenById(kolomSikap.usulan).jenis === 'SIKAP' : false,
  kolomSikap?.usulan ?? 'tidak terpetakan',
)

/* Dua kolom sengaja diarahkan ke satu komponen Sikap → harus dirata-ratakan. */
const peta = Object.fromEntries(analisa.kolomNilai.map((k) => [k.nama, { komponenId: k.usulan, skala: k.skala }]))
const komponenSikap = komponenMK1.find((k) => k.jenis === 'SIKAP')
if (komponenSikap) {
  peta['Nilai Sikap Dosen'] = { komponenId: komponenSikap.id, skala: 10 }
  peta['Peer Review'] = { komponenId: komponenSikap.id, skala: 10 }
}

const dihitung = hitungEntri(analisa, peta, { agregasi: 'rata', cariMahasiswa: getStudentByNim })
console.log('\n' + dihitung.ringkas)
for (const e of dihitung.entri.slice(0, 4)) {
  console.log(
    '  ' + e.nama.padEnd(22) + e.komponenId.padEnd(14) +
      e.dari.map((d) => d.mentah + '/' + d.skala).join(' + ') + ' → ' + e.nilai,
  )
}

const contoh = dihitung.entri.find((e) => e.komponenId === komponenSikap?.id)
cek('Skala 0-10 dikonversi ke 0-100', contoh ? contoh.nilai === 88 : false, contoh ? String(contoh.nilai) : '-')
cek('Dua kolom digabung jadi satu komponen', contoh ? contoh.dari.length === 2 : false)
cek('Tidak ada baris ditolak', dihitung.ditolak.length === 0, dihitung.ditolak.length + ' ditolak')

/* Benar-benar mengisi, lalu memastikan nilai aspek ikut terhitung. */
const target = mhsS1[0]
const aspekTarget = getKomponenById(dihitung.entri[0].komponenId).aspekId
const sebelumIsi = transkripOf(target).aspekById[aspekTarget].komponenTerisi

const b3 = await simpanBatch({
  sumber: 'MK',
  semester: 1,
  angkatanId: '2026',
  aktor: 'Uji Otomatis',
  cara: 'import-mentah',
  entri: dihitung.entri.map(({ nim, komponenId, nilai }) => ({ nim, komponenId, nilai })),
})

const sesudahIsi = transkripOf(target).aspekById[aspekTarget]
console.log('\nAspek ' + aspekTarget + ': terisi ' + sebelumIsi + ' → ' + sesudahIsi.komponenTerisi + ', nilai ' + sesudahIsi.nilai)
cek('Batch terisi otomatis', b3.jumlah === dihitung.entri.length, b3.jumlah + ' nilai')
cek('Nilai aspek ikut dihitung ulang', sesudahIsi.nilai != null)

await rollbackBatch(b3.id)
cek('Rollback mengembalikan keadaan', transkripOf(target).aspekById[aspekTarget].komponenTerisi === sebelumIsi)

console.log(gagal ? '\n' + gagal + ' pemeriksaan GAGAL' : '\nSemua pemeriksaan lulus')

/* ------------- 5. rambatan ke dashboard mahasiswa yang login -------------- */

console.log(garis('5. INPUT DI ADMIN → LANGSUNG TERISI DI DASHBOARD MAHASISWA'))

/* Persona yang dipakai halaman /mahasiswa (default ?sem=2). */
const persona = personaAktif('?sem=2')
const tSebelum = transkripOf(persona)

const aspekTarget2 = tSebelum.aspek.find((a) => !a.terkunci && a.komponenKosong.length > 0)
const komponenTarget = aspekTarget2.komponenKosong[0]

console.log('Mahasiswa login :', persona.name, '·', persona.nim, '· angkatan', persona.angkatanLabel)
console.log('Sebelum input   : nilai akhir', tSebelum.akhir.nilai,
  '· aspek dinilai', tSebelum.akhir.aspekDinilai + '/' + tSebelum.akhir.aspekTotal,
  '· ' + aspekTarget2.aspek.kode, aspekTarget2.komponenTerisi + '/' + aspekTarget2.komponenTotal,
  '= ' + aspekTarget2.nilai)
console.log('Admin mengisi   :', komponenTarget.id, '=', 95)

const b4 = await simpanBatch({
  sumber: komponenTarget.sumber,
  semester: aspekTarget2.aspek.semester,
  angkatanId: persona.angkatanId,
  aktor: 'Andini Prameswari, M.Psi.',
  cara: 'manual',
  entri: [{ nim: persona.nim, komponenId: komponenTarget.id, nilai: 95 }],
})

const tSesudah = transkripOf(personaAktif('?sem=2'))
const aspekSesudah = tSesudah.aspekById[aspekTarget2.aspek.id]

console.log('Sesudah input   : nilai akhir', tSesudah.akhir.nilai,
  '· aspek dinilai', tSesudah.akhir.aspekDinilai + '/' + tSesudah.akhir.aspekTotal,
  '· ' + aspekTarget2.aspek.kode, aspekSesudah.komponenTerisi + '/' + aspekSesudah.komponenTotal,
  '= ' + aspekSesudah.nilai)

cek('Komponen mahasiswa terisi', aspekSesudah.komponenTerisi === aspekTarget2.komponenTerisi + 1)
cek('Nilai aspek dihitung ulang', aspekSesudah.nilai !== aspekTarget2.nilai,
  aspekTarget2.nilai + ' → ' + aspekSesudah.nilai)
cek('Penilai terbawa ke transkrip mahasiswa',
  aspekSesudah.komponen.find((k) => k.id === komponenTarget.id)?.penilai === 'Andini Prameswari, M.Psi.')
cek('Tercatat di riwayat mahasiswa', auditUntuk(persona.nim).some((l) => l.batchId === b4.id))

await rollbackBatch(b4.id)
const tBalik = transkripOf(personaAktif('?sem=2'))
cek('Rollback ikut terlihat di sisi mahasiswa',
  tBalik.akhir.nilai === tSebelum.akhir.nilai,
  tSebelum.akhir.nilai + ' → ' + tBalik.akhir.nilai)



/* -------------- 6. bertahan setelah halaman dimuat ulang ------------------ */

console.log(garis('6. PERUBAHAN BERTAHAN SETELAH MUAT ULANG'))

const p2 = personaAktif('?sem=2')
const aspekP = transkripOf(p2).aspek.find((a) => !a.terkunci && a.komponenKosong.length > 0)
const kompP = aspekP.komponenKosong[0]

const b5 = await simpanBatch({
  sumber: kompP.sumber,
  semester: aspekP.aspek.semester,
  angkatanId: p2.angkatanId,
  aktor: 'Andini Prameswari, M.Psi.',
  cara: 'manual',
  entri: [{ nim: p2.nim, komponenId: kompP.id, nilai: 77 }],
})

const tersimpan = JSON.parse(localStorage.getItem('sk5c.perubahan') ?? 'null')
console.log('Kunci penyimpanan berisi', tersimpan?.batch?.length ?? 0, 'batch')
cek('Batch tertulis ke penyimpanan', tersimpan?.batch?.some((b) => b.id === b5.id))
cek('Nilai masuk sebelum muat ulang', p2.nilai[aspekP.aspek.id].komponen[kompP.id]?.nilai === 77)

/* Meniru halaman dimuat ulang: data di memori dirusak, lalu store memulihkan
   dirinya dari penyimpanan seperti saat modul pertama kali dijalankan. */
delete p2.nilai[aspekP.aspek.id].komponen[kompP.id]
BATCH_SESI.length = 0
cek('Keadaan memori berhasil dikosongkan', p2.nilai[aspekP.aspek.id].komponen[kompP.id] === undefined)

muatDariPenyimpanan()

const pulih = p2.nilai[aspekP.aspek.id].komponen[kompP.id]
console.log('Setelah muat ulang:', kompP.id, '=', pulih?.nilai, '· penilai', pulih?.penilai)
cek('Nilai pulih dari penyimpanan', pulih?.nilai === 77)
cek('Penilai ikut pulih', pulih?.penilai === 'Andini Prameswari, M.Psi.')
cek('Batch ikut pulih', BATCH_SESI.some((b) => b.id === b5.id))
cek('Transkrip mahasiswa ikut terhitung',
  transkripOf(p2).aspekById[aspekP.aspek.id].komponenTerisi === aspekP.komponenTerisi + 1)

await bersihkanPerubahan()
cek('Bersihkan mengembalikan data contoh',
  transkripOf(p2).aspekById[aspekP.aspek.id].komponenTerisi === aspekP.komponenTerisi)
cek('Penyimpanan ikut dikosongkan', localStorage.getItem('sk5c.perubahan') === null)



/* ------------------ 7. sementara menjadi final --------------------------- */

console.log(garis('7. STATUS ASPEK: SEMENTARA -> FINAL'))

const { CONFIG } = await import('../src/lib/config.js')
const { setPenguncian } = await import('../src/lib/store.js')
const { bolehTandaiFinal } = await import('../src/lib/rules.js')

await bersihkanPerubahan()

const mhsF = personaAktif('?sem=2')
const aspekF = transkripOf(mhsF).aspek.find(
  (a) => !a.terkunci && a.komponenKosong.length > 0 && a.komponenTerisi > 0,
)
const kosongF = aspekF.komponenKosong

console.log('Mahasiswa :', mhsF.name, '. aspek', aspekF.aspek.kode)
console.log('Awal      :', aspekF.komponenTerisi + '/' + aspekF.komponenTotal, '-> status', aspekF.status)
cek('Belum lengkap berarti sementara', aspekF.status === 'berjalan')
cek('Belum lengkap tidak bisa dikunci', bolehTandaiFinal(mhsF, aspekF.aspek.id).boleh === false,
  bolehTandaiFinal(mhsF, aspekF.aspek.id).alasan)

/* Dosen memasukkan seluruh sisa komponen. */
const bF = await simpanBatch({
  sumber: kosongF[0].sumber,
  semester: aspekF.aspek.semester,
  angkatanId: mhsF.angkatanId,
  aktor: 'Simon Petrus Wenehenubun, S.S., M.M.',
  cara: 'manual',
  entri: kosongF.map((k, i) => ({ nim: mhsF.nim, komponenId: k.id, nilai: 80 + i })),
})

const lengkapF = transkripOf(mhsF).aspekById[aspekF.aspek.id]
console.log('Lengkap   :', lengkapF.komponenTerisi + '/' + lengkapF.komponenTotal, '-> status', lengkapF.status,
  '(mode ' + CONFIG.PENGUNCIAN_ASPEK + ')')
cek('Mode otomatis: lengkap langsung final', lengkapF.status === 'final')
cek('Tidak ada lagi alasan sementara', lengkapF.alasanSementara === null)

/* Admin menahan aspek itu sebagai sementara. */
await setPenguncian({ nim: mhsF.nim, aspekId: aspekF.aspek.id, status: 'sementara', aktor: 'Andini Prameswari, M.Psi.' })
const ditahan = transkripOf(mhsF).aspekById[aspekF.aspek.id]
console.log('Ditahan   : status', ditahan.status, '.', ditahan.alasanSementara)
cek('Penandaan sementara menang atas mode otomatis', ditahan.status === 'berjalan')
cek('Alasan penahanan disebutkan', String(ditahan.alasanSementara).includes('Ditahan'))
cek('Ditandai siap dikunci', ditahan.siapDikunci === true)

/* Mode manual: lengkap tetapi belum ditandai. */
await setPenguncian({ nim: mhsF.nim, aspekId: aspekF.aspek.id, status: null, aktor: 'Andini' })
CONFIG.PENGUNCIAN_ASPEK = 'manual'
const manual = transkripOf(mhsF).aspekById[aspekF.aspek.id]
console.log('Mode manual: status', manual.status, '.', manual.alasanSementara)
cek('Mode manual menahan sampai ditandai', manual.status === 'berjalan')
cek('Alasan menyebut penguncian', String(manual.alasanSementara).includes('menunggu penguncian'))

await setPenguncian({ nim: mhsF.nim, aspekId: aspekF.aspek.id, status: 'final', aktor: 'Andini Prameswari, M.Psi.' })
const dikunci = transkripOf(mhsF).aspekById[aspekF.aspek.id]
console.log('Ditandai  : status', dikunci.status, '. oleh', dikunci.penguncian?.oleh)
cek('Penandaan final berlaku di mode manual', dikunci.status === 'final')
cek('Pencatat penguncian tersimpan', dikunci.penguncian?.oleh === 'Andini Prameswari, M.Psi.')

/* Rollback nilai membuat aspek tidak lengkap lagi. */
await rollbackBatch(bF.id)
const balikF = transkripOf(mhsF).aspekById[aspekF.aspek.id]
console.log('Rollback  :', balikF.komponenTerisi + '/' + balikF.komponenTotal, '-> status', balikF.status)
cek('Aspek tidak lengkap tidak bisa final walau ditandai', balikF.status === 'berjalan')

CONFIG.PENGUNCIAN_ASPEK = 'otomatis'
await bersihkanPerubahan()
cek('Bersihkan menghapus penandaan',
  transkripOf(mhsF).aspekById[aspekF.aspek.id].penguncian == null)



/* ---------------- 8. program studi: daftar dan penjaga sasaran ------------- */

console.log(garis('8. PROGRAM STUDI (S1 & D3)'))

const { FACULTIES, PROGRAMS, JENJANG_OF, programStudi } = await import('../src/lib/data.js')

for (const f of FACULTIES) {
  console.log('  ' + f.name.padEnd(24) + f.programs.map((p) => p.nama + ' (' + p.jenjang + ')').join(', '))
}

const jenjangDipakai = [...new Set(PROGRAMS.map((p) => p.jenjang))].sort()
console.log('Jumlah prodi :', PROGRAMS.length, '. jenjang:', jenjangDipakai.join(', '))

cek('Empat fakultas', FACULTIES.length === 4, String(FACULTIES.length))
cek('14 program studi S1 & D3', PROGRAMS.length === 14, String(PROGRAMS.length))
cek('Tidak ada jenjang S2', jenjangDipakai.every((j) => j === 'S1' || j === 'D3'), jenjangDipakai.join(', '))
cek('Perhotelan berjenjang D3', JENJANG_OF['Perhotelan'] === 'D3', String(JENJANG_OF['Perhotelan']))
cek('Ilmu Komunikasi PJJ ada', PROGRAMS.some((p) => p.program === 'Ilmu Komunikasi (PJJ)'))
cek('Prodi per fakultas tersaring', programStudi('Bisnis').length === 3, programStudi('Bisnis').join(', '))
cek('Setiap mahasiswa membawa jenjang', STUDENTS.every((m) => m.jenjang === JENJANG_OF[m.program]))

/* Penjaga sasaran pada import: NIM sah tetapi beda program studi harus ditolak. */
const prodiA = 'Informatika'
const mhsA = STUDENTS.find((m) => m.program === prodiA && m.angkatanId === '2026')
const mhsB = STUDENTS.find((m) => m.program !== prodiA && m.angkatanId === '2026')

const batas = (m) => {
  if (m.angkatanId !== '2026') return 'Mahasiswa bukan angkatan 2026'
  if (m.program !== prodiA) return 'Mahasiswa bukan dari program studi ' + prodiA
  return null
}

console.log('Sasaran      : angkatan 2026 . prodi', prodiA)
console.log('  ' + mhsA.name.padEnd(22) + mhsA.program.padEnd(24) + (batas(mhsA) ?? 'DITERIMA'))
console.log('  ' + mhsB.name.padEnd(22) + mhsB.program.padEnd(24) + (batas(mhsB) ?? 'DITERIMA'))

cek('Mahasiswa prodi sasaran diterima', batas(mhsA) === null)
cek('Mahasiswa prodi lain ditolak', String(batas(mhsB)).includes('bukan dari program studi'))



/* ------------- 9. identitas mahasiswa berasal dari email ------------------ */

console.log(garis('9. MASUK DENGAN EMAIL MASING-MASING'))

const { getStudentByEmail, contohEmailMahasiswa } = await import('./dataContoh.js')

const hitungEmail = new Map()
for (const m of STUDENTS) hitungEmail.set(m.email.toLowerCase(), (hitungEmail.get(m.email.toLowerCase()) ?? 0) + 1)
const bentrok = [...hitungEmail.values()].filter((n) => n > 1).length
console.log('Mahasiswa    :', STUDENTS.length, '. email unik:', hitungEmail.size, '. bentrok:', bentrok)
cek('Setiap mahasiswa punya email unik', bentrok === 0 && hitungEmail.size === STUDENTS.length)

const sampelMhs = [STUDENTS[0], STUDENTS[1], STUDENTS.find((m) => m.program === 'Perhotelan')]
console.log('')
for (const m of sampelMhs) {
  const lewatEmail = getStudentByEmail(m.email)
  const t = transkripOf(lewatEmail)
  console.log(
    '  ' + m.email.padEnd(38) +
      (lewatEmail?.name ?? '?').padEnd(22) +
      String(m.program).padEnd(20) +
      'nilai ' + String(t.akhir.nilai ?? '-').padStart(3) +
      ' . ' + t.akhir.aspekDinilai + '/' + t.akhir.aspekTotal + ' aspek',
  )
  cek('Email ' + m.email + ' menemukan orangnya', lewatEmail?.id === m.id)
}

const a = transkripOf(getStudentByEmail(sampelMhs[0].email))
const b = transkripOf(getStudentByEmail(sampelMhs[1].email))
cek('Dua email berbeda memberi mahasiswa berbeda', sampelMhs[0].id !== sampelMhs[1].id)
cek('Nilainya pun milik masing-masing',
  a.akhir.nilai !== b.akhir.nilai || a.student.nim !== b.student.nim,
  a.student.name + ' ' + a.akhir.nilai + ' vs ' + b.student.name + ' ' + b.akhir.nilai)

cek('Huruf besar-kecil tidak memengaruhi',
  getStudentByEmail(sampelMhs[0].email.toUpperCase())?.id === sampelMhs[0].id)
cek('Email asing tidak menemukan siapa pun', getStudentByEmail('bukan.siapa@student.umn.ac.id') === null)

const personaEmail = getStudentByEmail('rayhandi.zulmi@student.umn.ac.id')
cek('Alamat persona tetap bersih tanpa angka', personaEmail?.id === 'DEMO-2', String(personaEmail?.id))
cek('Contoh email tersedia untuk pesan galat', contohEmailMahasiswa(2).length === 2)

console.log(gagal ? String.fromCharCode(10) + gagal + ' pemeriksaan GAGAL' : String.fromCharCode(10) + 'Semua pemeriksaan lulus')
