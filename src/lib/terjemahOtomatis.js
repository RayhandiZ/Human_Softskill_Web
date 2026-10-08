/* --------------------------------------------------------------------------
   Terjemahan otomatis sebagai JARING PENGAMAN, bukan sebagai sumber utama.

   Peramban berbasis Chromium versi baru punya penerjemah yang berjalan DI
   DALAM perangkat: tidak ada kunci API, tidak ada tagihan, tidak ada satu pun
   kalimat yang dikirim ke peladen luar. Berkas ini membungkusnya.

   URUTAN YANG DIPAKAI t() — dan urutannya penting:

     1. Kamus teks.js. Selalu menang. Di situlah istilah domain diputuskan
        manusia: "Nilai sementara" adalah "Provisional score", bukan
        "Temporary value"; "Kemahasiswaan" adalah "Student Affairs", bukan
        "Studentship". Mesin tidak akan pernah menebak ini dengan benar, dan
        salah kata di sistem penilaian bukan soal gaya bahasa.
     2. Hasil mesin yang sudah pernah dihitung dan disimpan di memori.
     3. Bahasa Indonesia apa adanya.

   Jadi mesin hanya mengisi LUBANG: kalimat yang baru ditulis dan belum sempat
   dimasukkan ke kamus. Ia tidak pernah bisa menimpa keputusan yang sudah
   diambil manusia.

   Dua batas yang harus diketahui:

   - Hanya jalan di Chromium baru. Di Firefox dan Safari, fungsi ini diam dan
     kalimatnya tetap berbahasa Indonesia — persis seperti sebelumnya.
   - Hasilnya DRAF. Pakai dumpOtomatis() di konsol untuk menyalinnya ke
     teks.js setelah dibaca, supaya menjadi permanen dan bisa diperiksa.
   -------------------------------------------------------------------------- */

/* Hasil yang sudah dihitung: kalimat Indonesia -> kalimat Inggris. */
const singgahan = new Map()

/* Kalimat yang sedang dalam antrean, supaya satu kalimat yang dirender
   ratusan kali tidak meminta terjemahan ratusan kali. */
const sedangDiproses = new Set()

let mesin = null
let mesinGagal = false
const pendengar = new Set()

/** Dipanggil BahasaProvider supaya halaman ikut digambar ulang saat hasil tiba. */
export function saatSelesai(fn) {
  pendengar.add(fn)
  return () => pendengar.delete(fn)
}

export const hasilOtomatis = (teks) => singgahan.get(teks)

/* --------------------------------------------------------------------------
   Membuka penerjemah perangkat.

   Ditulis defensif dengan sengaja: antarmuka ini masih berubah antar versi
   Chrome, dan sempat bernama translation.createTranslator sebelum menjadi
   Translator.create. Keduanya dicoba, dan kegagalan apa pun berarti fitur ini
   mati diam-diam — BUKAN halaman yang rusak.

   Dibaca lewat globalThis, bukan self: `self` tidak ada di Node, dan berkas
   ini ikut termuat saat pengujian.
   -------------------------------------------------------------------------- */
const adaApi = () =>
  Boolean(globalThis.Translator?.create || globalThis.translation?.createTranslator)

async function bukaMesin() {
  if (mesin) return mesin
  /* Kegagalan TIDAK permanen selama antarmukanya belum ada. Chrome bisa
     menyalakan penerjemahnya setelah paket bahasanya selesai diunduh, dan
     halaman yang sudah lama terbuka pantas ikut memakainya. */
  if (mesinGagal && !adaApi()) return null
  mesinGagal = false

  try {
    const pasangan = { sourceLanguage: 'id', targetLanguage: 'en' }

    if (globalThis.Translator?.create) {
      const ada = await globalThis.Translator.availability?.(pasangan)
      if (ada === 'unavailable') throw new Error('pasangan bahasa tidak tersedia')
      mesin = await globalThis.Translator.create(pasangan)
    } else if (globalThis.translation?.createTranslator) {
      mesin = await globalThis.translation.createTranslator(pasangan)
    } else {
      throw new Error('peramban ini belum punya penerjemah bawaan')
    }
  } catch {
    mesinGagal = true
    mesin = null
  }
  return mesin
}

/** Semua {penanda} di dalam sebuah kalimat. */
const penandaDi = (teks) => (String(teks).match(/\{\w+\}/g) ?? []).sort()

/**
 * Meminta terjemahan satu kalimat. Tidak mengembalikan apa-apa: hasilnya
 * masuk ke singgahan, lalu pendengar dipanggil supaya React menggambar ulang.
 */
export function mintaTerjemahan(teks) {
  const kunci = String(teks ?? '')
  if (!kunci || singgahan.has(kunci) || sedangDiproses.has(kunci)) return
  /* Pemeriksaan gagalnya sama dengan di bukaMesin: sudah pernah gagal boleh
     dicoba lagi begitu antarmukanya muncul, dan tidak boleh dicoba selama
     antarmukanya memang belum ada. */
  if (mesinGagal && !adaApi()) return
  sedangDiproses.add(kunci)

  bukaMesin()
    .then(async (m) => {
      if (!m) return
      const hasil = await m.translate(kunci)

      /* Penanda {n} WAJIB selamat. Mesin penerjemah kerap menerjemahkan atau
         membuang isinya, dan kalimat yang kehilangan penandanya akan tampil
         tanpa angkanya sama sekali. Lebih baik kembali ke bahasa Indonesia
         yang utuh daripada bahasa Inggris yang kehilangan datanya. */
      const sebelum = penandaDi(kunci).join('')
      const sesudah = penandaDi(hasil).join('')
      if (sebelum !== sesudah) return

      singgahan.set(kunci, hasil)
      pendengar.forEach((fn) => fn())
    })
    .catch(() => {
      /* Diam. Kalimatnya tetap berbahasa Indonesia. */
    })
    .finally(() => sedangDiproses.delete(kunci))
}

/* --------------------------------------------------------------------------
   Pembantu konsol: mencetak hasil mesin dalam bentuk yang tinggal ditempel ke
   teks.js.

   Inilah yang membuat otomatisasi ini tidak berhenti sebagai tambal sulam.
   Mesin membuat drafnya, Anda membacanya sekali, lalu menempelkannya — dan
   sejak itu kalimatnya punya terjemahan tetap yang tidak bergantung pada
   peramban siapa pun.
   -------------------------------------------------------------------------- */
export function dumpOtomatis() {
  if (!singgahan.size) {
    console.log('[bahasa] belum ada hasil terjemahan otomatis di sesi ini')
    return ''
  }
  const baris = [...singgahan.entries()].map(
    ([id, en]) =>
      "  '" +
      id.replace(/\\/g, '\\\\').replace(/'/g, "\\'") +
      "':\n    '" +
      en.replace(/\\/g, '\\\\').replace(/'/g, "\\'") +
      "',",
  )
  const keluaran = baris.join('\n')
  console.log(
    '[bahasa] ' + singgahan.size + ' draf mesin. Baca dulu, betulkan istilahnya,\n' +
      'lalu tempel ke src/lib/teks.js:\n\n' +
      keluaran,
  )
  return keluaran
}
