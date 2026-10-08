import { CONFIG } from './config.js'
import { KOMPONEN, aspekPunyaDraft, getAspek, getAspekList, getKomponenById } from './curriculum.js'
import { hitungTranskrip, semesterDitutup } from './scoring.js'

/* Aturan bisnis sebagai fungsi murni; halaman tidak boleh menyimpulkan sendiri. */

/* ---- R1 & R2: gating semester, aspek terkunci tetap terlihat ------------- */

export function aspekTerlihat(student) {
  return getAspekList().map((a) => {
    const terkunci = a.semester > student.semesterAktif
    return {
      ...a,
      terkunci,
      bolehTampilAngka: !terkunci,
      keterangan: terkunci ? 'Dibuka pada Semester ' + a.semester : null,
    }
  })
}

export function aspekBolehDilihat(student, aspekId) {
  const a = getAspek(aspekId)
  return Boolean(a) && a.semester <= student.semesterAktif
}

/* ---- R3: nilai akhir tidak pernah diekstrapolasi ------------------------- */

/* Dikembalikan sebagai templat berpenanda supaya bisa diterjemahkan utuh. */
export function labelNilaiAkhir(akhir) {
  if (akhir.status === 'final') {
    return {
      teks: 'Final',
      rinci: 'Seluruh {total} aspek sudah dinilai dan dikunci.',
      nilai: { total: akhir.aspekTotal },
    }
  }
  return {
    teks: 'Sementara',
    rinci:
      'Nilai sementara berdasarkan {n} dari {total} aspek. Nilai final terbit setelah Semester {semester}.',
    nilai: {
      n: akhir.aspekDinilai,
      total: akhir.aspekTotal,
      semester: CONFIG.TOTAL_SEMESTER_PROGRAM,
    },
  }
}

/* ---- R4: aspek berkomponen draft tidak boleh final ----------------------- */

export function bolehTandaiFinal(student, aspekId) {
  const aspek = getAspek(aspekId)
  if (!aspek) return { boleh: false, alasan: 'Aspek tidak dikenal.' }
  if (aspek.semester > student.semesterAktif) return { boleh: false, alasan: 'Semester aspek ini belum tiba.' }

  const t = hitungTranskrip(student)
  const a = t.aspekById[aspekId]
  if (a.komponenTerisi < a.komponenTotal) {
    const kosong = a.komponenKosong.map((x) => x.label).join(', ')
    return { boleh: false, alasan: 'Masih ada komponen kosong: ' + kosong }
  }
  if (aspekPunyaDraft(aspekId) && !CONFIG.IZINKAN_FINAL_DRAFT) {
    return { boleh: false, alasan: 'Skema penilaian aspek ini belum final (komponen berstatus draft).' }
  }
  return { boleh: true, alasan: null }
}

/* ---- R5 & R6: kelayakan sertifikat dengan alasan yang bisa ditindaklanjuti */

export function kelayakanSertifikat(student) {
  const t = hitungTranskrip(student)
  const belumFinal = t.aspek.filter((a) => a.status !== 'final')
  const adaKosong = t.aspek.filter((a) => !a.terkunci && a.komponenKosong.length > 0)

  const sebut = (daftar, n = 2) => {
    const nama = daftar.slice(0, n).map((a) => a.aspek.kode + ' ' + a.aspek.nama)
    const sisa = daftar.length - nama.length
    return nama.join(' dan ') + (sisa > 0 ? ' serta ' + sisa + ' aspek lain' : '')
  }

  const syarat = [
    {
      id: 'semester',
      label: 'Sudah menempuh Semester ' + CONFIG.TOTAL_SEMESTER_PROGRAM,
      lolos: student.semesterAktif >= CONFIG.TOTAL_SEMESTER_PROGRAM,
      alasan:
        'Baru menempuh Semester ' + student.semesterAktif + ' dari ' + CONFIG.TOTAL_SEMESTER_PROGRAM,
      ringkas: 'program baru sampai Semester ' + student.semesterAktif,
    },
    {
      id: 'final',
      label: 'Seluruh ' + t.akhir.aspekTotal + ' aspek berstatus final',
      lolos: belumFinal.length === 0,
      alasan: belumFinal.length ? 'Belum final: ' + sebut(belumFinal) : null,
      ringkas: belumFinal.length ? 'aspek ' + sebut(belumFinal, 1) + ' belum final' : null,
    },
    {
      id: 'lengkap',
      label: 'Tidak ada komponen asesmen yang kosong',
      lolos: adaKosong.length === 0,
      alasan: adaKosong.length
        ? 'Komponen kosong pada ' +
          adaKosong
            .slice(0, 2)
            .map((a) => a.aspek.kode + ' (' + a.komponenKosong.map((x) => x.label).join(', ') + ')')
            .join('; ')
        : null,
      ringkas: adaKosong.length
        ? 'komponen ' + adaKosong[0].komponenKosong[0].label + ' pada ' + adaKosong[0].aspek.kode + ' belum dinilai'
        : null,
    },
    {
      id: 'ambang',
      label: 'Nilai akhir minimal ' + CONFIG.AMBANG_SERTIFIKAT,
      lolos: t.akhir.nilai != null && t.akhir.nilai >= CONFIG.AMBANG_SERTIFIKAT,
      alasan:
        t.akhir.nilai == null
          ? 'Nilai akhir belum bisa dihitung'
          : 'Nilai akhir ' + t.akhir.nilai + ', di bawah rata-rata minimal ' + CONFIG.AMBANG_SERTIFIKAT,
      ringkas:
        t.akhir.nilai == null
          ? 'nilai akhir belum bisa dihitung'
          : 'nilai akhir ' + t.akhir.nilai + ' di bawah rata-rata minimal ' + CONFIG.AMBANG_SERTIFIKAT,
    },
    {
      id: 'terkunci',
      label: 'Angkatan sudah dikunci oleh Kemahasiswaan',
      lolos: student.statusAngkatan === 'terkunci',
      alasan: 'Angkatan ' + student.angkatanLabel + ' belum dikunci',
      ringkas: 'angkatan ' + student.angkatanLabel + ' belum dikunci',
    },
  ]

  const gagal = syarat.filter((s) => !s.lolos)
  const layak = gagal.length === 0

  const klausa = gagal.map((s) => s.ringkas).filter(Boolean)
  const sisa = klausa.length - 2
  const alasanRingkas = layak
    ? null
    : 'Belum tersedia. ' +
      klausa.slice(0, 2).join(' dan ') +
      (sisa > 0 ? ' (dan ' + sisa + ' syarat lain)' : '') +
      '.'

  return { layak, syarat, gagal, alasanRingkas, transkrip: t }
}

/* ---- R7: transkrip boleh diunduh kapan saja ------------------------------ */

export function statusDokumenTranskrip(student) {
  const t = hitungTranskrip(student)
  const final = t.akhir.status === 'final'
  return {
    final,
    watermark: final ? null : 'SEMENTARA',
    catatan: final
      ? null
      : 'Dokumen ini bukan bukti kelulusan pembinaan softskill.',
  }
}

/* ---- 9.4: validasi import nilai ------------------------------------------ */

export function komponenUntukSumber(sumber) {
  return KOMPONEN.filter((x) => x.sumber === sumber)
}

/** Penjaga utama R1: aspek dari semester yang belum tiba ditolak; semester lampau tetap diterima. */
export function validasiBarisImport(baris, { cariMahasiswa, sumber, nimTerlihat = new Set() }) {
  const alasan = []
  const nim = String(baris.nim ?? '').trim()
  const komponenId = String(baris.komponen ?? '').trim()
  const mentah = String(baris.nilai ?? '').trim().replace(',', '.')
  const nilai = Number(mentah)

  const mahasiswa = nim ? cariMahasiswa(nim) : null
  if (!nim) alasan.push('NIM kosong')
  else if (!mahasiswa) alasan.push('NIM ' + nim + ' tidak dikenal')

  const komponen = komponenId ? getKomponenById(komponenId) : null
  if (!komponenId) alasan.push('Kode komponen kosong')
  else if (!komponen) alasan.push('Komponen ' + komponenId + ' tidak dikenal')
  else if (komponen.sumber !== sumber) {
    alasan.push('Komponen ' + komponenId + ' bukan milik sumber ' + sumber)
  }

  if (mahasiswa && komponen) {
    const aspek = getAspek(komponen.aspekId)
    if (aspek.semester > mahasiswa.semesterAktif) {
      alasan.push(
        'Aspek ' + aspek.kode + ' baru dibuka pada Semester ' + aspek.semester +
          ', mahasiswa masih Semester ' + mahasiswa.semesterAktif,
      )
    }
  }

  if (mentah === '') alasan.push('Nilai kosong')
  else if (Number.isNaN(nilai)) alasan.push('Nilai "' + baris.nilai + '" bukan angka')
  else if (nilai < 0 || nilai > 100) alasan.push('Nilai ' + nilai + ' di luar rentang 0–100')

  const kunci = nim + '|' + komponenId
  if (nimTerlihat.has(kunci)) alasan.push('Baris duplikat untuk NIM dan komponen yang sama')
  else nimTerlihat.add(kunci)

  return { ok: alasan.length === 0, alasan, nim, komponenId, nilai, mahasiswa, komponen }
}

export function validasiBatchImport(baris, { cariMahasiswa, sumber }) {
  const nimTerlihat = new Set()
  const hasil = baris.map((b, i) => ({
    nomor: i + 2, // baris 1 adalah kepala kolom
    asal: b,
    ...validasiBarisImport(b, { cariMahasiswa, sumber, nimTerlihat }),
  }))
  const diterima = hasil.filter((x) => x.ok)
  const ditolak = hasil.filter((x) => !x.ok)
  return {
    hasil,
    diterima,
    ditolak,
    ringkas: diterima.length + ' baris siap diproses, ' + ditolak.length + ' ditolak',
  }
}

/* ---- R9: pratinjau sebelum mengunci angkatan ----------------------------- */

export function pratinjauPenguncian(mahasiswaAngkatan) {
  const dinilai = mahasiswaAngkatan.map((m) => ({
    mahasiswa: m,
    // Pratinjau menghitung seolah angkatan sudah dikunci.
    kelayakan: kelayakanSertifikat({ ...m, statusAngkatan: 'terkunci' }),
  }))
  const berhak = dinilai.filter((x) => x.kelayakan.layak)
  const tidakBerhak = dinilai.filter((x) => !x.kelayakan.layak)
  const adaKosong = tidakBerhak.filter((x) => x.kelayakan.gagal.some((g) => g.id === 'lengkap'))
  return {
    total: mahasiswaAngkatan.length,
    berhak: berhak.length,
    tidakBerhak: tidakBerhak.length,
    komponenKosong: adaKosong.length,
    daftarBerhak: berhak,
    daftarTidakBerhak: tidakBerhak,
  }
}

/* ---- R8: mahasiswa tidak pernah menulis nilai ---------------------------- */

export function buatPengajuanKoreksi({ student, komponenId, alasan, nilaiDiharapkan = null }) {
  const komponen = getKomponenById(komponenId)
  return {
    id: 'K-' + Date.now().toString(36).toUpperCase(),
    nim: student.nim,
    nama: student.name,
    komponenId,
    komponenLabel: komponen?.label ?? komponenId,
    aspekId: komponen?.aspekId ?? null,
    alasan,
    nilaiDiharapkan,
    status: 'menunggu',
    diajukan: new Date().toISOString().slice(0, 10),
    keputusan: null,
  }
}

/* ---- Pemeriksaan sistem atas usulan nilai dosen --------------------------- */

/** Memakai validasiBatchImport, bukan aturan sendiri: satu validator untuk semua pintu. */
export function periksaUsulan(entri, { cariMahasiswa, sumber }) {
  return validasiBatchImport(
    (entri ?? []).map((e) => ({ nim: e.nim, komponen: e.komponenId, nilai: e.nilai })),
    { cariMahasiswa, sumber },
  )
}
