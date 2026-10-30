import { db } from "./db.js";
import { GalatApi } from "./api.js";
import { catatLog } from "./log.js";
import { selesaiProgram } from "./muat.js";
import bcrypt from 'bcryptjs';


// Akses akun mahasiswa, dosen, dan admin (Pengguna.aktif), hanya untuk super admin; lihat README.md › Panel
// Super Admin › Akses Pengguna. Akun nonaktif sudah ditolak penggunaDari() di api.js dan periksaMasuk() di
// masuk.js. Mencabut akses tidak menyentuh data: nilai dan riwayat mahasiswa tetap ada dan tetap terlihat admin.

const PERAN = {
  MAHASISWA: "mahasiswa",
  DOSEN: "dosen",
  ADMIN: "admin",
  SUPER_ADMIN: "superadmin",
};
export const ALASAN_MIN = 10;
const SERTA = {
  dosen: { include: { prodi: true, angkatan: { include: { angkatan: true } } } },
  mahasiswa: { include: { prodi: true, angkatan: true } },
  aksesAngkatan: { include: { angkatan: true } },
};

/**
 * Kelas seorang dosen untuk dibaca: sumber, semester, dan angkatan yang diampu ([] = otomatis), urut id. Kuncinya
 * angkatanDiampu, bukan angkatan, karena `angkatan` pada akun mahasiswa berisi label angkatannya.
 */
const kelasDosen = (d) => ({
  sumber: d.sumber,
  semester: d.semester,
  angkatanDiampu: d.angkatan
    .map((a) => ({ id: a.angkatanId, label: a.angkatan.label }))
    .sort((a, b) => a.id.localeCompare(b.id)),
});

function susunAkun(p) {
  return {
    id: p.id,
    email: p.email,
    peran: PERAN[p.peran],
    aktif: p.aktif,
    // Hanya admin biasa yang izin dan akses angkatannya bisa diatur; super admin selalu punya (punyaIzinMaster di
    // api.js) dan selalu melihat semua angkatan. aksesAngkatan: angkatan yang aksesnya diatur super admin, urut id;
    // terlihat true = angkatan lewat Semester 3 yang dibuka, false = angkatan Semester 1–3 yang dinonaktifkan.
    ...(p.peran === "ADMIN"
      ? {
          kelolaMaster: p.kelolaMaster,
          aksesAngkatan: (p.aksesAngkatan ?? [])
            .map((a) => ({ id: a.angkatanId, label: a.angkatan.label, terlihat: a.terlihat }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        }
      : {}),
    ...(p.dosen
      ? { nama: p.dosen.nama, nip: p.dosen.nip, prodi: p.dosen.prodi.nama, ...kelasDosen(p.dosen) }
      : {}),
    ...(p.mahasiswa
      ? {
          nama: p.mahasiswa.nama,
          nim: p.mahasiswa.nim,
          prodi: p.mahasiswa.prodi.nama,
          angkatan: p.mahasiswa.angkatan.label,
        }
      : {}),
  };
}

/** { akun: [...] } untuk semua akun: mahasiswa, dosen, admin, dan super admin. */
export async function daftarAkses() {
  const daftar = await db.pengguna.findMany({
    include: SERTA,
    orderBy: { id: "asc" },
  });
  return { akun: daftar.map(susunAkun) };
}

/** Mencabut (aktif false) atau memulihkan (aktif true) akses satu akun, dengan alasan. */
export async function ubahAkses(pengguna, { id, aktif, alasan }) {
  const target = Number(id);
  if (!Number.isInteger(target)) throw new GalatApi("Akun tidak valid.");
  if (typeof aktif !== "boolean")
    throw new GalatApi("Status akses tidak valid.");
  const teksAlasan = String(alasan ?? "").trim();
  if (teksAlasan.length < ALASAN_MIN)
    throw new GalatApi("Alasan wajib diisi, minimal 10 karakter.");

  const akun = await db.pengguna.findUnique({
    where: { id: target },
    include: SERTA,
  });
  if (!akun) throw new GalatApi("Akun tidak ditemukan.", 404);
  if (akun.id === pengguna.id)
    throw new GalatApi("Akses akun sendiri tidak bisa diubah.", 403);
  if (akun.peran === "SUPER_ADMIN")
    throw new GalatApi("Akses Super Admin diatur langsung di basis data.", 403);
  if (akun.aktif === aktif) return { akun: susunAkun(akun) }; // tidak ada yang berubah, tidak dicatat

  // Perubahan dan catatan lognya dalam satu transaksi: berhasil bersama atau gagal bersama.
  const baru = await db.$transaction(async (tx) => {
    const hasil = await tx.pengguna.update({
      where: { id: akun.id },
      data: { aktif },
      include: SERTA,
    });
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: "UBAH_AKSES",
      target: "akun " + akun.email,
      rincian: {
        email: akun.email,
        peran: PERAN[akun.peran],
        sebelum: akun.aktif,
        sesudah: aktif,
        alasan: teksAlasan,
      },
    });
    return hasil;
  });
  return { akun: susunAkun(baru) };
}

/* --------------------------- izin lihat data master --------------------------- */

// Super admin memberi atau mencabut izin admin biasa untuk MELIHAT data master (angkatan, fakultas, prodi,
// mahasiswa) di halaman Data Master. Sejak rapat 24 Okt 2026 data master dipegang penuh super admin: hanya ia yang
// menambah dan mengubahnya (pintu /api/master/* ['superadmin']), dan izin ini tidak lagi membuka pintu tulis.
// Kolomnya tetap bernama kelolaMaster. Admin juga bisa memintanya sendiri lewat permintaan AKSES_DATA_MASTER
// (persetujuan.js), yang bila disetujui menjalankan bukaAksesMaster di bawah.

/** Memberi (aktif true) atau mencabut (aktif false) izin lihat data master satu akun admin, dengan alasan. */
export async function aturIzinMaster(pengguna, { id, aktif, alasan }) {
  const target = Number(id)
  if (!Number.isInteger(target)) throw new GalatApi('Akun tidak valid.')
  if (typeof aktif !== 'boolean') throw new GalatApi('Status izin tidak valid.')
  const teksAlasan = String(alasan ?? '').trim()
  if (teksAlasan.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')

  const akun = await db.pengguna.findUnique({ where: { id: target }, include: SERTA })
  if (!akun) throw new GalatApi('Akun tidak ditemukan.', 404)
  if (akun.peran === 'SUPER_ADMIN') throw new GalatApi('Super Admin selalu memegang data master.', 403)
  if (akun.peran !== 'ADMIN') throw new GalatApi('Izin lihat data master hanya untuk akun admin Kemahasiswaan.', 403)
  if (aktif && !akun.aktif) throw new GalatApi('Pulihkan dulu akses akun ini sebelum memberinya izin.', 409)
  if (akun.kelolaMaster === aktif) return { akun: susunAkun(akun) } // tidak ada yang berubah, tidak dicatat

  // Perubahan dan catatan lognya dalam satu transaksi: berhasil bersama atau gagal bersama.
  const baru = await db.$transaction(async (tx) => {
    const hasil = await tx.pengguna.update({ where: { id: akun.id }, data: { kelolaMaster: aktif }, include: SERTA })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_IZIN',
      target: 'akun ' + akun.email,
      rincian: { email: akun.email, izin: 'lihat data master', sebelum: akun.kelolaMaster, sesudah: aktif, alasan: teksAlasan },
    })
    return hasil
  })
  return { akun: susunAkun(baru) }
}

/**
 * Menyalakan izin lihat data master untuk `pengguna` (admin pengaju), dijalankan saat super admin menyetujui
 * permintaan AKSES_DATA_MASTER. Keputusan itu sendiri sudah tercatat di log oleh putuskanPermintaan.
 */
export async function bukaAksesMaster(pengguna) {
  const akun = await db.pengguna.findUnique({ where: { id: pengguna.id } })
  if (!akun || akun.peran !== 'ADMIN' || !akun.aktif) return { ok: false }
  if (!akun.kelolaMaster) await db.pengguna.update({ where: { id: akun.id }, data: { kelolaMaster: true } })
  return { ok: true }
}

/* ------------------------------ akses angkatan ------------------------------ */

// Permintaan 30–31 Okt 2026, per akun admin biasa dan per angkatan. Bawaannya: angkatan yang masih di Semester 1–3
// (atau belum mulai) terlihat, angkatan yang programnya sudah lewat Semester 3 tersembunyi. Super admin bisa membuka
// angkatan yang sudah lewat, atau menonaktifkan angkatan Semester 1–3, sampai diubah lagi. Yang tersimpan di
// AdminAngkatan hanya yang berbeda dari bawaan, jadi angkatan baru otomatis mengikuti bawaannya. Penyaringnya
// angkatanTersembunyi di muat.js, dibaca ulang setiap permintaan, jadi perubahannya langsung berlaku. Siapa, kapan, dan
// alasannya tercatat di LogAktivitas (UBAH_AKSES_ANGKATAN).

/**
 * Mengganti seluruh akses angkatan satu akun admin biasa. `dibuka` = angkatan yang sudah lewat Semester 3 dan terlihat
 * olehnya; `ditutup` = angkatan Semester 1–3 yang dinonaktifkan untuknya. Angkatan yang tidak disebut kembali ke
 * bawaan ([] dan [] = semua bawaan). Jawabannya { akun }.
 */
export async function aturAksesAngkatan(pengguna, { id, dibuka = [], ditutup = [], alasan }) {
  const target = Number(id)
  if (!Number.isInteger(target)) throw new GalatApi('Akun tidak valid.')
  if (!Array.isArray(dibuka) || !Array.isArray(ditutup)) throw new GalatApi('Daftar angkatan tidak valid.')
  const teksAlasan = String(alasan ?? '').trim()
  if (teksAlasan.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')

  const akun = await db.pengguna.findUnique({ where: { id: target }, include: SERTA })
  if (!akun) throw new GalatApi('Akun tidak ditemukan.', 404)
  if (akun.peran === 'SUPER_ADMIN') throw new GalatApi('Super Admin selalu melihat semua angkatan.', 403)
  if (akun.peran !== 'ADMIN') throw new GalatApi('Akses angkatan hanya untuk akun admin Kemahasiswaan.', 403)

  const rapikan = (xs) => [...new Set(xs.map((a) => String(a ?? '').trim()).filter(Boolean))].sort()
  const idBuka = rapikan(dibuka)
  const idTutup = rapikan(ditutup)
  const daftar = await db.angkatan.findMany({ where: { id: { in: [...idBuka, ...idTutup] } } })
  const dariId = new Map(daftar.map((a) => [a.id, a]))
  const asing = [...idBuka, ...idTutup].find((x) => !dariId.has(x))
  if (asing) throw new GalatApi('Angkatan ' + asing + ' tidak ditemukan.')
  // Hanya yang berbeda dari bawaan yang disimpan, supaya daftar akses tidak menyesatkan.
  const sebut = (xs) => xs.map((x) => dariId.get(x).label).join(', ')
  const masihBerjalan = idBuka.filter((x) => !selesaiProgram(dariId.get(x)))
  if (masihBerjalan.length) {
    throw new GalatApi('Angkatan ' + sebut(masihBerjalan) + ' masih di Semester 1–3, jadi sudah terlihat tanpa dibuka.')
  }
  const sudahLewat = idTutup.filter((x) => selesaiProgram(dariId.get(x)))
  if (sudahLewat.length) {
    throw new GalatApi('Angkatan ' + sebut(sudahLewat) + ' sudah lewat Semester 3, jadi sudah tersembunyi tanpa dinonaktifkan.')
  }

  const lama = new Map(akun.aksesAngkatan.map((a) => [a.angkatanId, a.terlihat]))
  const mau = new Map([...idBuka.map((x) => [x, true]), ...idTutup.map((x) => [x, false])])
  const sama = lama.size === mau.size && [...mau].every(([x, terlihat]) => lama.get(x) === terlihat)
  if (sama) return { akun: susunAkun(akun) } // tidak ada yang berubah, tidak dicatat
  const baruDibuka = idBuka.filter((x) => lama.get(x) !== true)
  if (baruDibuka.length && !akun.aktif) {
    throw new GalatApi('Pulihkan dulu akses akun ini sebelum membuka angkatan untuknya.', 409)
  }

  // Label untuk log: yang disebut dari tabel Angkatan, yang dilepas dari baris aksesnya.
  const label = (x) => dariId.get(x)?.label ?? akun.aksesAngkatan.find((a) => a.angkatanId === x)?.angkatan.label ?? x
  const ringkas = (peta) => ({
    dibuka: [...peta].filter(([, t]) => t).map(([x]) => label(x)).sort(),
    ditutup: [...peta].filter(([, t]) => !t).map(([x]) => label(x)).sort(),
  })
  // Baris yang tetap sama dibiarkan (pemberi dan waktunya tidak berubah); yang dilepas atau berganti dihapus lalu dibuat.
  const lepas = [...lama].filter(([x, terlihat]) => mau.get(x) !== terlihat).map(([x]) => x)
  const buat = [...mau].filter(([x, terlihat]) => lama.get(x) !== terlihat)
  // Perubahan dan catatan lognya dalam satu transaksi: berhasil bersama atau gagal bersama.
  const baru = await db.$transaction(async (tx) => {
    if (lepas.length) await tx.adminAngkatan.deleteMany({ where: { penggunaId: akun.id, angkatanId: { in: lepas } } })
    if (buat.length) {
      await tx.adminAngkatan.createMany({
        data: buat.map(([angkatanId, terlihat]) => ({ penggunaId: akun.id, angkatanId, terlihat, olehId: pengguna.id })),
      })
    }
    const hasil = await tx.pengguna.findUnique({ where: { id: akun.id }, include: SERTA })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_AKSES_ANGKATAN',
      target: 'akun ' + akun.email,
      rincian: { email: akun.email, sebelum: ringkas(lama), sesudah: ringkas(mau), alasan: teksAlasan },
    })
    return hasil
  })
  return { akun: susunAkun(baru) }
}

/* ------------------------------- tambah akun ------------------------------ */

// Super admin menambah akun mahasiswa, dosen, atau admin. Akun Super Admin tetap hanya dibuat di basis data.
const PERAN_BARU = { mahasiswa: 'MAHASISWA', dosen: 'DOSEN', admin: 'ADMIN' }
const SUMBER_DOSEN = ['PDP', 'MK'] // Engagement diinput Kemahasiswaan, bukan dosen
const SANDI_MIN = 8
export const PANJANG_MAKS = 191 // batas kolom String Prisma di MySQL (VARCHAR 191)

/** Teks isian yang wajib ada, sudah dirapikan. Dipakai juga src/server/dataMaster.js. */
export function wajib(nilai, label) {
  const teks = String(nilai ?? '').trim()
  if (!teks) throw new GalatApi(label + ' wajib diisi.')
  if (teks.length > PANJANG_MAKS) throw new GalatApi(label + ' terlalu panjang.')
  return teks
}

export async function cariProdi(nama) {
  const prodi = await db.programStudi.findUnique({ where: { nama: wajib(nama, 'Program studi') } })
  if (!prodi) throw new GalatApi('Program studi tidak ditemukan.')
  return prodi.id
}

async function isianMahasiswa(isi) {
  const nim = wajib(isi.nim, 'NIM')
  if (!/^\d+$/.test(nim)) throw new GalatApi('NIM hanya berisi angka.')
  if (await db.mahasiswa.findUnique({ where: { nim } })) throw new GalatApi('NIM ' + nim + ' sudah terdaftar.', 409)
  const angkatan = await db.angkatan.findUnique({ where: { id: wajib(isi.angkatanId, 'Angkatan') } })
  if (!angkatan) throw new GalatApi('Angkatan tidak ditemukan.')
  // Angkatan terkunci sudah ditutup (kelayakan sertifikatnya final); mahasiswa baru tidak boleh masuk ke sana.
  if (angkatan.status === 'TERKUNCI') {
    throw new GalatApi('Angkatan ' + angkatan.label + ' sudah dikunci, jadi tidak bisa menerima mahasiswa baru.', 409)
  }
  return { nim, nama: wajib(isi.nama, 'Nama'), prodiId: await cariProdi(isi.prodi), angkatanId: angkatan.id }
}

/**
 * Isian kelas dosen yang sudah diperiksa: prodi, sumber, semester yang diampu, dan angkatan yang diampu. Angkatan boleh
 * kosong: kelasnya lalu angkatan yang sedang di semester itu (diKelasDosen di muat.js). Dipakai tambah akun dan ubah kelas.
 */
async function isianKelas(isi) {
  if (!SUMBER_DOSEN.includes(isi.sumber)) throw new GalatApi('Sumber penilaian harus PDP atau MK.')
  const semester = Number(isi.semester)
  if (![1, 2, 3].includes(semester)) throw new GalatApi('Semester harus 1, 2, atau 3.')
  const ids = [...new Set((Array.isArray(isi.angkatan) ? isi.angkatan : []).map((a) => String(a ?? '').trim()).filter(Boolean))]
  const ada = new Set((await db.angkatan.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((a) => a.id))
  const asing = ids.find((id) => !ada.has(id))
  if (asing) throw new GalatApi('Angkatan ' + asing + ' tidak ditemukan.')
  return { sumber: isi.sumber, semester, prodiId: await cariProdi(isi.prodi), angkatan: ids.sort() }
}

async function isianDosen(isi) {
  const nip = wajib(isi.nip, 'NIP')
  if (await db.dosen.findUnique({ where: { nip } })) throw new GalatApi('NIP ' + nip + ' sudah terdaftar.', 409)
  const { angkatan, ...kelas } = await isianKelas(isi)
  return {
    nip,
    nama: wajib(isi.nama, 'Nama'),
    jabatan: wajib(isi.jabatan, 'Jabatan'),
    ...kelas,
    angkatan: { create: angkatan.map((angkatanId) => ({ angkatanId })) },
  }
}

/**
 * Mengubah kelas seorang dosen: prodi, sumber, semester yang diampu, dan angkatan yang diampu (rapat 25 Okt 2026). Hanya
 * super admin. Nilai yang sudah tersimpan tidak berubah; yang berubah hanya mahasiswa yang terlihat dan bisa diunggah
 * dosen itu. Tercatat sebagai UBAH_KELAS_DOSEN beserta kelas sebelum dan sesudahnya.
 */
export async function ubahKelasDosen(pengguna, isi) {
  const target = Number(isi?.id)
  if (!Number.isInteger(target)) throw new GalatApi('Akun tidak valid.')
  const akun = await db.pengguna.findUnique({ where: { id: target }, include: SERTA })
  if (!akun) throw new GalatApi('Akun tidak ditemukan.', 404)
  if (!akun.dosen) throw new GalatApi('Kelas hanya bisa diatur untuk akun dosen.', 409)
  const kelas = await isianKelas(isi)

  const sebelum = { prodi: akun.dosen.prodi.nama, ...kelasDosen(akun.dosen) }
  const sama =
    kelas.prodiId === akun.dosen.prodiId &&
    kelas.sumber === akun.dosen.sumber &&
    kelas.semester === akun.dosen.semester &&
    kelas.angkatan.join() === sebelum.angkatanDiampu.map((a) => a.id).join()
  if (sama) return { akun: susunAkun(akun) } // tidak ada yang berubah, tidak dicatat

  const baru = await db.$transaction(async (tx) => {
    await tx.dosenAngkatan.deleteMany({ where: { dosenId: akun.dosen.id } })
    await tx.dosen.update({
      where: { id: akun.dosen.id },
      data: {
        prodiId: kelas.prodiId,
        sumber: kelas.sumber,
        semester: kelas.semester,
        angkatan: { create: kelas.angkatan.map((angkatanId) => ({ angkatanId })) },
      },
    })
    const hasil = await tx.pengguna.findUnique({ where: { id: akun.id }, include: SERTA })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_KELAS_DOSEN',
      target: 'akun ' + akun.email,
      rincian: { email: akun.email, sebelum, sesudah: { prodi: hasil.dosen.prodi.nama, ...kelasDosen(hasil.dosen) } },
    })
    return hasil
  })
  return { akun: susunAkun(baru) }
}

/** Membuat akun baru beserta data mahasiswa/dosennya; jawabannya { akun } dalam bentuk yang sama dengan daftarAkses. */
export async function tambahAkun(pengguna, isi) {
  const peran = PERAN_BARU[isi.peran]
  if (!peran) throw new GalatApi('Peran tidak valid. Akun Super Admin hanya dibuat langsung di basis data.')
  const email = wajib(isi.email, 'Email').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GalatApi('Format email tidak valid.')
  const sandi = String(isi.sandi ?? '')
  if (sandi.length < SANDI_MIN) throw new GalatApi('Sandi awal minimal ' + SANDI_MIN + ' karakter.')
  if (await db.pengguna.findUnique({ where: { email } })) throw new GalatApi('Email ' + email + ' sudah terdaftar.', 409)

  const data = { email, peran, passwordHash: await bcrypt.hash(sandi, 10) }
  if (peran === 'MAHASISWA') data.mahasiswa = { create: await isianMahasiswa(isi) }
  if (peran === 'DOSEN') data.dosen = { create: await isianDosen(isi) }

  try {
    // Akun, data pendampingnya, dan catatan log dalam satu transaksi: tidak ada akun setengah jadi.
    const baru = await db.$transaction(async (tx) => {
      const hasil = await tx.pengguna.create({ data, include: SERTA })
      const { id, aktif, ...ringkas } = susunAkun(hasil) // sandi tidak pernah ikut dicatat
      await catatLog(tx, { aktorId: pengguna.id, aksi: 'TAMBAH_AKUN', target: 'akun ' + email, rincian: ringkas })
      return hasil
    })
    return { akun: susunAkun(baru) }
  } catch (e) {
    // Dua penyimpanan bersamaan bisa lolos pemeriksaan di atas; basis data tetap menolak yang kedua.
    if (e?.code === 'P2002') throw new GalatApi('Email, NIM, atau NIP itu sudah terdaftar.', 409)
    throw e
  }
}

/* ------------------------------- hapus akun ------------------------------- */

// Super admin menghapus permanen akun yang aksesnya sudah dicabut, hanya bila akun itu belum punya data. Data
// mahasiswa (nilai, pengumpulan, koreksi, penguncian) dan riwayat dosen tidak boleh ikut hilang. Jejak tindakan
// juga dihitung sebagai data: kolom pelaku di log menyimpan id akun tanpa relasi, dan Log Aktivitas membaca nama
// pelakunya dari akun itu (petaNama di muat.js). Akun yang punya data cukup dibiarkan dicabut.

/** Gabungan daftar untuk kalimat: "a", "a dan b", "a, b, dan c". */
function gabung(daftar) {
  if (daftar.length < 2) return daftar.join('')
  return daftar.slice(0, -1).join(', ') + (daftar.length > 2 ? ', dan ' : ' dan ') + daftar.at(-1)
}

/** Data yang masih bergantung pada akun ini, sebagai [keterangan, jumlah] yang jumlahnya lebih dari nol. */
async function dataTerkait(akun) {
  const id = akun.id
  const hitung = []
  if (akun.mahasiswa) {
    const m = akun.mahasiswa
    hitung.push(
      ['nilai', db.nilai.count({ where: { mahasiswaId: m.id } })],
      ['pengumpulan', db.pengumpulan.count({ where: { mahasiswaId: m.id } })],
      ['pengajuan koreksi', db.pengajuanKoreksi.count({ where: { mahasiswaId: m.id } })],
      ['permintaan sertifikat', db.permintaanSertifikat.count({ where: { mahasiswaId: m.id } })],
      ['penguncian aspek', db.penguncian.count({ where: { mahasiswaId: m.id } })],
      ['riwayat perubahan nilai', db.auditLog.count({ where: { mahasiswaId: m.id } })],
      ['entri usulan dosen', db.usulanEntri.count({ where: { nim: m.nim } })],
    )
  }
  if (akun.dosen) {
    const d = akun.dosen
    hitung.push(
      ['usulan nilai', db.usulan.count({ where: { dosenId: d.id } })],
      ['pengumpulan yang diterima', db.pengumpulan.count({ where: { dosenId: d.id } })],
    )
  }
  hitung.push([
    'riwayat tindakan',
    Promise.all([
      db.auditLog.count({ where: { aktorId: id } }),
      db.logAktivitas.count({ where: { aktorId: id } }),
      db.batch.count({ where: { aktorId: id } }),
      db.nilai.count({ where: { penilaiId: id } }),
      db.penguncian.count({ where: { olehId: id } }),
      db.angkatan.count({ where: { dikunciOleh: id } }),
      db.komponen.count({ where: { diubahOleh: id } }),
      db.aspek.count({ where: { diubahOleh: id } }),
      db.indikator.count({ where: { diubahOleh: id } }),
      db.pengajuanKoreksi.count({ where: { OR: [{ adminOleh: id }, { diputuskanOleh: id }] } }),
      db.permintaanSertifikat.count({
        where: { OR: [{ adminOleh: id }, { superOleh: id }, { ditolakOleh: id }, { dicabutOleh: id }, { cetakTerakhirOleh: id }] },
      }),
      db.usulan.count({ where: { diputuskanOleh: id } }),
      db.permintaanAdmin.count({ where: { OR: [{ diajukanOleh: id }, { diputuskanOleh: id }] } }),
    ]).then((jumlah) => jumlah.reduce((a, b) => a + b, 0)),
  ])
  const jumlah = await Promise.all(hitung.map(([, n]) => n))
  return hitung.map(([ket], i) => [ket, jumlah[i]]).filter(([, n]) => n > 0)
}

/** Menghapus permanen satu akun beserta data mahasiswa/dosen dan profilnya; jawabannya { id } akun yang dihapus. */
export async function hapusAkun(pengguna, { id, alasan }) {
  const target = Number(id)
  if (!Number.isInteger(target)) throw new GalatApi('Akun tidak valid.')
  const teksAlasan = String(alasan ?? '').trim()
  if (teksAlasan.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')

  const akun = await db.pengguna.findUnique({ where: { id: target }, include: SERTA })
  if (!akun) throw new GalatApi('Akun tidak ditemukan. Mungkin sudah dihapus.', 404)
  if (akun.id === pengguna.id) throw new GalatApi('Akun sendiri tidak bisa dihapus.', 403)
  if (akun.peran === 'SUPER_ADMIN') throw new GalatApi('Akun Super Admin diatur langsung di basis data.', 403)
  if (akun.aktif) throw new GalatApi('Cabut dulu akses akun ini sebelum menghapusnya.', 409)

  const terkait = await dataTerkait(akun)
  if (terkait.length) {
    throw new GalatApi(
      'Akun ini tidak bisa dihapus karena masih punya ' +
        gabung(terkait.map(([ket, n]) => n + ' ' + ket)) +
        '. Biarkan aksesnya tetap dicabut supaya datanya utuh.',
      409,
    )
  }

  const { id: _id, aktif: _aktif, ...ringkas } = susunAkun(akun)
  try {
    // Profil, data mahasiswa/dosen, akun, dan catatan log dalam satu transaksi: terhapus semua atau tidak sama sekali.
    await db.$transaction(async (tx) => {
      await tx.profil.deleteMany({ where: { penggunaId: akun.id } })
      if (akun.mahasiswa) await tx.mahasiswa.delete({ where: { id: akun.mahasiswa.id } })
      if (akun.dosen) await tx.dosen.delete({ where: { id: akun.dosen.id } })
      await tx.pengguna.delete({ where: { id: akun.id } })
      await catatLog(tx, {
        aktorId: pengguna.id,
        aksi: 'HAPUS_AKUN',
        target: 'akun ' + akun.email,
        rincian: { ...ringkas, alasan: teksAlasan },
      })
    })
  } catch (e) {
    // Data bisa masuk di antara pemeriksaan dan penghapusan; relasi di basis data tetap menolak penghapusannya.
    if (e?.code === 'P2003') {
      throw new GalatApi('Akun ini baru saja mendapat data, jadi tidak jadi dihapus. Muat ulang halaman ini.', 409)
    }
    if (e?.code === 'P2025') throw new GalatApi('Akun tidak ditemukan. Mungkin sudah dihapus.', 404)
    throw e
  }
  return { id: akun.id }
}
