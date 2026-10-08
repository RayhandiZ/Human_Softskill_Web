/* Jaring pengaman: hanya mengisi kalimat yang belum ada di kamus; lihat README.md › Kamus dan terjemahan. */

const singgahan = new Map()

const sedangDiproses = new Set()

let mesin = null
let mesinGagal = false
const pendengar = new Set()

export function saatSelesai(fn) {
  pendengar.add(fn)
  return () => pendengar.delete(fn)
}

export const hasilOtomatis = (teks) => singgahan.get(teks)

/* Ditulis defensif: API penerjemah Chrome berubah antar versi; gagal berarti fitur diam, bukan halaman rusak. */
const adaApi = () =>
  Boolean(globalThis.Translator?.create || globalThis.translation?.createTranslator)

async function bukaMesin() {
  if (mesin) return mesin
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

const penandaDi = (teks) => (String(teks).match(/\{\w+\}/g) ?? []).sort()

export function mintaTerjemahan(teks) {
  const kunci = String(teks ?? '')
  if (!kunci || singgahan.has(kunci) || sedangDiproses.has(kunci)) return
  if (mesinGagal && !adaApi()) return
  sedangDiproses.add(kunci)

  bukaMesin()
    .then(async (m) => {
      if (!m) return
      const hasil = await m.translate(kunci)

      /* Penanda {n} wajib selamat; bila hilang, kembali ke bahasa Indonesia. */
      const sebelum = penandaDi(kunci).join('')
      const sesudah = penandaDi(hasil).join('')
      if (sebelum !== sesudah) return

      singgahan.set(kunci, hasil)
      pendengar.forEach((fn) => fn())
    })
    .catch(() => {
    })
    .finally(() => sedangDiproses.delete(kunci))
}

/* Pembantu konsol: cetak hasil mesin untuk ditempel ke teks.js. */
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
