/* Pemeriksaan Fase 1 — menampilkan angka mentah hasil scoring.js dan rules.js
   supaya bisa diperiksa sebelum UI dibangun di atasnya.

   Jalankan:  node scripts/verify-scoring.mjs
*/

import { CONFIG, withConfig } from '../src/lib/config.js'
import { distribusiSemester, getAspekList, getKomponen } from '../src/lib/curriculum.js'
import { bobotKomponen } from '../src/lib/scoring.js'
import { kelayakanSertifikat } from '../src/lib/rules.js'
import {
  COHORTS,
  PERIODE_AKTIF,
  STUDENTS,
  getStudent,
  isiData,
  kelengkapanMatriks,
  labelPeriode,
  ringkas,
  transkripOf,
} from '../src/lib/data.js'
import { DATA_CONTOH } from './dataContoh.js'

/* Halaman dimulai tanpa data; angka di bawah dihitung dari data contoh. */
isiData(DATA_CONTOH)

const garis = (t) => '\n' + '─'.repeat(78) + '\n' + t + '\n' + '─'.repeat(78)
const pad = (s, n) => String(s ?? '').padEnd(n)
const kanan = (s, n) => String(s ?? '').padStart(n)

/* ------------------------------- kurikulum -------------------------------- */

console.log(garis('STRUKTUR KURIKULUM'))
console.log('Periode aktif      :', labelPeriode(PERIODE_AKTIF))
console.log('Distribusi semester:', JSON.stringify(distribusiSemester()), '(harus 3/4/3)')
console.log('Total aspek        :', getAspekList().length)
console.log(
  'Aspek draft        :',
  getAspekList()
    .filter((a) => getKomponen(a.id).some((k) => k.status === 'draft'))
    .map((a) => a.kode)
    .join(', '),
)

console.log(garis('ANGKATAN — semesterAktif DITURUNKAN, bukan diinput'))
console.log(pad('Angkatan', 14) + pad('Masuk', 22) + kanan('Sem', 5) + '  Status')
for (const c of COHORTS) {
  console.log(pad(c.label, 14) + pad(labelPeriode(c.intake), 22) + kanan(c.semesterAktif, 5) + '  ' + c.status)
}

/* --------------------------------- bobot ---------------------------------- */

console.log(garis('BOBOT KOMPONEN — mode ' + CONFIG.MODE_BOBOT_KOMPONEN))
for (const id of ['A1', 'A2', 'B4']) {
  const b = bobotKomponen(id)
  const total = Object.values(b).reduce((a, x) => a + x, 0)
  console.log('\n' + id + '  (jumlah bobot = ' + total.toFixed(1) + ')')
  for (const [k, v] of Object.entries(b)) console.log('   ' + pad(k, 22) + kanan(v.toFixed(1), 6))
}
if (CONFIG.MODE_BOBOT_KOMPONEN === 'merata') {
  console.log('\nCatatan: tiap aspek bernilai 100 dan dibagi rata ke seluruh komponennya, apa pun sumbernya.')
} else {
  console.log('\nCatatan: B.4 hanya punya komponen MK, jadi MK memikul 100% meski CONFIG memberinya', CONFIG.BOBOT_SUMBER.MK)
}

/* -------------------------------- persona --------------------------------- */

function laporkan(id) {
  const m = getStudent(id)
  const t = transkripOf(m)
  const kelayakan = kelayakanSertifikat(m)

  console.log(garis(m.name + '  ·  ' + m.nim + '  ·  angkatan ' + m.angkatanLabel + '  ·  semester ' + m.semesterAktif))

  console.log(pad('Kode', 7) + pad('Aspek', 34) + kanan('Sem', 4) + kanan('Nilai', 7) + kanan('Huruf', 7) + '  ' + pad('Status', 10) + 'Komponen')
  for (const a of t.aspek) {
    console.log(
      pad(a.aspek.kode, 7) +
        pad(a.aspek.nama.slice(0, 32), 34) +
        kanan(a.aspek.semester, 4) +
        kanan(a.terkunci ? '—' : (a.nilai ?? '—'), 7) +
        kanan(a.huruf?.huruf ?? '—', 7) +
        '  ' +
        pad(a.status, 10) +
        (a.terkunci ? '' : a.komponenTerisi + '/' + a.komponenTotal),
    )
  }

  console.log('\nCluster:')
  for (const c of Object.values(t.cluster)) {
    console.log('   ' + pad(c.cluster.id + ' ' + c.cluster.nama.slice(0, 44), 50) + kanan(c.nilai ?? '—', 6) + '   ' + c.dinilai + '/' + c.total + ' aspek dinilai')
  }

  console.log('\nArea:')
  for (const a of Object.values(t.area)) {
    console.log('   ' + pad(a.area.id + ' ' + a.area.nama, 40) + kanan(a.nilai ?? '—', 6) + '   ' + a.dinilai + '/' + a.total)
  }

  console.log('\nPer semester:')
  for (const s of Object.values(t.semester)) {
    console.log('   Semester ' + s.semester + kanan(s.nilai ?? '—', 6) + '   ' + s.dinilai + '/' + s.total + (s.terkunci ? '   (terkunci)' : s.ditutup ? '   (ditutup)' : '   (berjalan)'))
  }

  const ak = t.akhir
  console.log('\nNILAI AKHIR : ' + (ak.nilai ?? '—') + '  ' + (ak.huruf?.huruf ?? '—') + '  ' + (ak.huruf?.label ?? '') )
  console.log('STATUS      : ' + ak.status + ' — ' + ak.basis + ' (mode ' + ak.mode + ')')

  console.log('\nSERTIFIKAT  : ' + (kelayakan.layak ? 'LAYAK' : 'TIDAK LAYAK'))
  for (const s of kelayakan.syarat) {
    console.log('   [' + (s.lolos ? 'v' : 'x') + '] ' + pad(s.label, 46) + (s.lolos ? '' : s.alasan))
  }
  if (!kelayakan.layak) console.log('\n   Pesan tombol: "' + kelayakan.alasanRingkas + '"')
}

for (const id of ['DEMO-1', 'DEMO-2', 'DEMO-3']) laporkan(id)

console.log(garis('KASUS SERTIFIKAT — angkatan 2024 yang sudah dikunci'))
for (const id of ['DEMO-LAYAK', 'DEMO-KOSONG', 'DEMO-RENDAH']) laporkan(id)

/* --------------------------------- populasi ------------------------------- */

console.log(garis('POPULASI'))
const r = ringkas(STUDENTS)
console.log('Jumlah mahasiswa   :', STUDENTS.length)
console.log('Rata-rata nilai    :', r.rata)
console.log('Sebaran huruf      :', JSON.stringify(r.huruf))
console.log('Transkrip final    :', r.final)
console.log('Di atas rata-rata ' + CONFIG.AMBANG_SERTIFIKAT + '  :', r.diAtasAmbang)

console.log('\nKelengkapan komponen per semester dan sumber:')
console.log(pad('', 12) + kanan('PDP', 8) + kanan('MK', 8) + kanan('ENGAGE', 9))
for (const b of kelengkapanMatriks(STUDENTS)) {
  console.log(
    pad('Semester ' + b.semester, 12) +
      kanan(b.sumber.PDP.persen == null ? '—' : b.sumber.PDP.persen + '%', 8) +
      kanan(b.sumber.MK.persen == null ? '—' : b.sumber.MK.persen + '%', 8) +
      kanan(b.sumber.ENGAGEMENT.persen == null ? '—' : b.sumber.ENGAGEMENT.persen + '%', 9),
  )
}

/* --------------------------- uji aturan konfigurasi ----------------------- */

console.log(garis('UJI R11 — mengubah config harus mengubah gating tanpa menyentuh kode'))
console.log('C.1 semester', CONFIG.ASPEK_C1_SEMESTER, '→ distribusi', JSON.stringify(distribusiSemester()))
CONFIG.ASPEK_C1_SEMESTER = 3
console.log('C.1 semester', CONFIG.ASPEK_C1_SEMESTER, '→ distribusi', JSON.stringify(distribusiSemester()))
CONFIG.ASPEK_C1_SEMESTER = 2
console.log('dikembalikan ke', CONFIG.ASPEK_C1_SEMESTER)

const bobotA1 = () => Object.values(bobotKomponen('A1')).map((v) => v.toFixed(2)).join(' / ')
console.log('\nBobot A.1 mode', CONFIG.MODE_BOBOT_KOMPONEN, '→', bobotA1())
withConfig({ MODE_BOBOT_KOMPONEN: 'per-sumber' }, () => console.log('Bobot A.1 mode per-sumber →', bobotA1()))
console.log('mode dikembalikan ke', CONFIG.MODE_BOBOT_KOMPONEN)
