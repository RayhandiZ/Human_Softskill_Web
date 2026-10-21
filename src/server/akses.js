import { db } from "./db.js";
import { GalatApi } from "./api.js";
import { catatLog } from "./log.js";
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
const ALASAN_MIN = 10;
const SERTA = {
  dosen: { include: { prodi: true } },
  mahasiswa: { include: { prodi: true, angkatan: true } },
};

function susunAkun(p) {
  return {
    id: p.id,
    email: p.email,
    peran: PERAN[p.peran],
    aktif: p.aktif,
    ...(p.dosen
      ? { nama: p.dosen.nama, nip: p.dosen.nip, prodi: p.dosen.prodi.nama }
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

/* ------------------------------- tambah akun ------------------------------ */

// Super admin menambah akun mahasiswa, dosen, atau admin. Akun Super Admin tetap hanya dibuat di basis data.
const PERAN_BARU = { mahasiswa: 'MAHASISWA', dosen: 'DOSEN', admin: 'ADMIN' }
const SUMBER_DOSEN = ['PDP', 'MK'] // Engagement diinput Kemahasiswaan, bukan dosen
const SANDI_MIN = 8
const PANJANG_MAKS = 191 // batas kolom String Prisma di MySQL (VARCHAR 191)

/** Teks isian yang wajib ada, sudah dirapikan. */
function wajib(nilai, label) {
  const teks = String(nilai ?? '').trim()
  if (!teks) throw new GalatApi(label + ' wajib diisi.')
  if (teks.length > PANJANG_MAKS) throw new GalatApi(label + ' terlalu panjang.')
  return teks
}

async function cariProdi(nama) {
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
  return { nim, nama: wajib(isi.nama, 'Nama'), prodiId: await cariProdi(isi.prodi), angkatanId: angkatan.id }
}

async function isianDosen(isi) {
  const nip = wajib(isi.nip, 'NIP')
  if (await db.dosen.findUnique({ where: { nip } })) throw new GalatApi('NIP ' + nip + ' sudah terdaftar.', 409)
  if (!SUMBER_DOSEN.includes(isi.sumber)) throw new GalatApi('Sumber penilaian harus PDP atau MK.')
  const semester = Number(isi.semester)
  if (![1, 2, 3].includes(semester)) throw new GalatApi('Semester harus 1, 2, atau 3.')
  return {
    nip,
    nama: wajib(isi.nama, 'Nama'),
    jabatan: wajib(isi.jabatan, 'Jabatan'),
    sumber: isi.sumber,
    semester,
    prodiId: await cariProdi(isi.prodi),
  }
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
      db.pengajuanKoreksi.count({ where: { diputuskanOleh: id } }),
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
