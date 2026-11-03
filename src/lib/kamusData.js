/* Padanan Inggris untuk teks yang diketik dari layar: isi kurikulum (kolom labelEn di tabel Komponen dan namaEn, deskripsiEn,
   pdpEn, mkEn, engagementEn di tabel Aspek) dan data master (namaEn di Fakultas dan ProgramStudi, labelEn di Angkatan).
   Kamus teks.js hanya mengenal isi bawaan dari kode, jadi yang ditambah atau diubah super admin diterjemahkan dari sini.
   Bentuknya tetap kalimat Indonesia sebagai kunci, seperti teks.js, supaya layar cukup memanggil t(k.label). Diisi
   isiKurikulum() di curriculum.js dan isiMaster() di data.js; lihat README.md › Kamus dan terjemahan. Berkas ini dipakai
   server dan peramban, jadi tidak boleh mengimpor React. */

export const rapikan = (teks) => String(teks ?? '').trim().replace(/\s+/g, ' ')

/* Per sumber: keduanya dipasang terpisah, dan memasang yang satu tidak boleh menghapus yang lain. */
const PADANAN = { kurikulum: new Map(), master: new Map() }

/** Padanan dari basis data, atau undefined bila kolomnya kosong. */
export const padananData = (teks) => {
  const r = rapikan(teks)
  return PADANAN.kurikulum.get(r) ?? PADANAN.master.get(r)
}

/** Mengganti isi satu sumber ('kurikulum' | 'master'); `pasangan` = [[teks Indonesia, teks Inggris], ...], pasangan yang salah satunya kosong dilewati. */
export function pasangPadananData(sumber, pasangan) {
  PADANAN[sumber] = new Map()
  for (const [id, en] of pasangan) {
    if (rapikan(id) && rapikan(en)) PADANAN[sumber].set(rapikan(id), rapikan(en))
  }
}
