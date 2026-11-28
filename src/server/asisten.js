import { GalatApi } from './api.js'
import { susunPesanAsisten } from './asistenKonteks.js'
import { akunDariId } from './masuk.js'
import { muatData } from './muat.js'

/* --------------------------------------------------------------------------
   Asisten VIBE (POST /api/asisten), untuk mahasiswa dan dosen.

   Kunci CosmosIn hanya dibaca di server (COSMOSIN_API_KEY) dan tidak pernah dikirim ke peramban. Data yang dibaca asisten
   adalah muatData() pemilik sesi, saringan yang sama dengan panelnya. Jawaban model dialirkan ke layar sebagai NDJSON:
   satu objek per baris, { t } untuk potongan jawaban, lalu { selesai: true } atau { galat }. Isi percakapan tidak disimpan
   di mana pun. Lihat README.md › Asisten VIBE.
   -------------------------------------------------------------------------- */

const ALAMAT_COSMOSIN = 'https://api.cosmosin.io/v1/chat/completions'

/** Model bawaan; bisa diganti lewat COSMOSIN_MODEL. Dipilih 27 Nov 2026 dari uji jawaban dan biaya (README.md › Asisten VIBE). */
export const MODEL_BAWAAN = 'deepseek-v4-flash'

export const BATAS_ASISTEN = {
  /** Karakter per pertanyaan; layar memakai angka yang sama (PANJANG_MAKS di AsistenVibe.jsx). */
  panjangPesan: 1000,
  /** Karakter per jawaban lama yang dikirim balik dari layar sebagai riwayat. */
  panjangJawaban: 4000,
  /** Pesan terakhir yang ikut dikirim ke model. */
  riwayat: 12,
  perMenit: 6,
  perHari: 60,
  tokenJawaban: 900,
  waktuMs: 60_000,
}

const GALAT = {
  belumSiap: 'Asisten VIBE belum disiapkan. Hubungi Admin.',
  kosong: 'Pertanyaannya kosong.',
  tidakSah: 'Percakapan tidak sah. Mulai percakapan baru.',
  terlaluPanjang: 'Pertanyaan terlalu panjang. Paling banyak 1000 karakter.',
  perMenit: 'Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi sebentar lagi.',
  perHari: 'Batas pertanyaan hari ini sudah tercapai. Coba lagi besok.',
  saldo: 'Saldo Asisten VIBE habis. Hubungi Admin.',
  sibuk: 'Asisten VIBE sedang sibuk. Coba lagi sebentar lagi.',
  putus: 'Asisten VIBE tidak bisa dihubungi. Coba lagi sebentar lagi.',
  lama: 'Asisten VIBE terlalu lama menjawab. Coba lagi.',
  terputus: 'Jawaban terputus. Coba lagi.',
  tanpaJawaban: 'Asisten VIBE tidak memberi jawaban. Coba lagi.',
}

/**
 * Riwayat dari layar ([{ dari: 'saya' | 'asisten', teks }]) menjadi pesan model ([{ role, content }]). Hanya
 * BATAS_ASISTEN.riwayat pesan terakhir yang dipakai; pesan beruntun dari pihak yang sama digabung, dan percakapan selalu
 * diawali dan diakhiri pertanyaan pengguna. Melempar GalatApi 400 bila bentuknya salah.
 */
export function rapikanPercakapan(pesan) {
  if (!Array.isArray(pesan) || !pesan.length) throw new GalatApi(GALAT.kosong, 400)
  const hasil = []
  for (const p of pesan.slice(-BATAS_ASISTEN.riwayat)) {
    const role = p?.dari === 'saya' ? 'user' : p?.dari === 'asisten' ? 'assistant' : null
    const teks = typeof p?.teks === 'string' ? p.teks.trim() : ''
    if (!role || !teks) throw new GalatApi(GALAT.tidakSah, 400)
    if (role === 'user' && teks.length > BATAS_ASISTEN.panjangPesan) throw new GalatApi(GALAT.terlaluPanjang, 400)
    const isi = teks.slice(0, BATAS_ASISTEN.panjangJawaban)
    const sebelum = hasil[hasil.length - 1]
    if (sebelum?.role === role) sebelum.content += '\n\n' + isi
    else hasil.push({ role, content: isi })
  }
  while (hasil[0]?.role === 'assistant') hasil.shift()
  if (hasil[hasil.length - 1]?.role !== 'user') throw new GalatApi(GALAT.tidakSah, 400)
  return hasil
}

/**
 * Pembatas per akun di memori server: paling banyak `perMenit` pertanyaan per 60 detik dan `perHari` per 24 jam.
 * Mengembalikan fungsi `(id) => null | 'menit' | 'hari'`; null berarti boleh dan dicatat. Batas ini per proses server;
 * batas belanja kunci di CosmosIn tetap penjaga terakhirnya.
 */
export function buatPembatas({ perMenit, perHari }, jam = () => Date.now()) {
  const jejak = new Map()
  return (id) => {
    const kini = jam()
    const daftar = (jejak.get(id) ?? []).filter((w) => kini - w < 86_400_000)
    jejak.set(id, daftar)
    if (daftar.length >= perHari) return 'hari'
    if (daftar.filter((w) => kini - w < 60_000).length >= perMenit) return 'menit'
    daftar.push(kini)
    // Bersih-bersih sesekali supaya akun yang sudah lama tidak bertanya tidak menumpuk.
    if (jejak.size > 5000) for (const [k, v] of jejak) if (!v.length || kini - v[v.length - 1] >= 86_400_000) jejak.delete(k)
    return null
  }
}

const izinkan = buatPembatas(BATAS_ASISTEN)

/**
 * Pengurai aliran SSE chat completions (format OpenAI). `makan(potongan)` menerima teks mentah berapa pun panjangnya,
 * memanggil `kirim(teks)` untuk setiap potongan jawaban, dan mengembalikan true begitu bertemu [DONE]. Teks penalaran
 * (reasoning_content) tidak diteruskan. Galat di tengah aliran dilempar sebagai Error.
 */
export function buatPengurai(kirim) {
  let sisa = ''
  let selesai = false
  return {
    makan(potongan) {
      sisa += potongan
      let i
      while (!selesai && (i = sisa.indexOf('\n')) >= 0) {
        const baris = sisa.slice(0, i).replace(/\r$/, '')
        sisa = sisa.slice(i + 1)
        if (!baris.startsWith('data:')) continue
        const isi = baris.slice(5).trim()
        if (isi === '[DONE]') {
          selesai = true
          break
        }
        let data
        try {
          data = JSON.parse(isi)
        } catch {
          continue
        }
        if (data.error) throw new Error('CosmosIn: ' + (data.error.message ?? JSON.stringify(data.error)).slice(0, 200))
        const teks = data.choices?.[0]?.delta?.content
        if (typeof teks === 'string' && teks) kirim(teks)
      }
      return selesai
    },
  }
}

/** Jawaban CosmosIn yang gagal sebelum mengalir, sebagai galat yang boleh dibaca pengguna. */
function galatHulu(status, keterangan) {
  if (status === 402 || /saldo|credit|balance|insufficient/i.test(keterangan)) return new GalatApi(GALAT.saldo, 503)
  if (status === 429) return new GalatApi(GALAT.sibuk, 503)
  if (status === 401 || status === 403) return new GalatApi(GALAT.belumSiap, 503)
  return new GalatApi(GALAT.putus, 502)
}

/** `kerja` untuk tangani() di app/api/asisten/route.js. `isi`: { pesan, bahasa }. */
export async function tanyaAsisten(pengguna, isi = {}, request = null) {
  const kunci = process.env.COSMOSIN_API_KEY?.trim()
  if (!kunci) throw new GalatApi(GALAT.belumSiap, 503)
  const percakapan = rapikanPercakapan(isi.pesan)
  const bahasa = isi.bahasa === 'en' ? 'en' : 'id'

  const tolak = izinkan(pengguna.id)
  if (tolak) throw new GalatApi(tolak === 'hari' ? GALAT.perHari : GALAT.perMenit, 429)

  const [data, akun] = await Promise.all([muatData(pengguna), pengguna.peran === 'dosen' ? akunDariId(pengguna.id) : null])
  const pesan = susunPesanAsisten({ peran: pengguna.peran, bahasa, data, dosen: akun?.dosen ?? null, percakapan })

  // Dihentikan bila pengguna menutup atau menghentikan jawabannya, atau bila model terlalu lama.
  const henti = new AbortController()
  let kehabisanWaktu = false
  const pewaktu = setTimeout(() => {
    kehabisanWaktu = true
    henti.abort()
  }, BATAS_ASISTEN.waktuMs)
  request?.signal?.addEventListener('abort', () => henti.abort(), { once: true })

  let hulu
  try {
    hulu = await fetch(ALAMAT_COSMOSIN, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + kunci, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.COSMOSIN_MODEL?.trim() || MODEL_BAWAAN,
        messages: pesan,
        stream: true,
        max_tokens: BATAS_ASISTEN.tokenJawaban,
        temperature: 0.3,
      }),
      signal: henti.signal,
    })
  } catch (e) {
    clearTimeout(pewaktu)
    console.warn('Asisten VIBE: CosmosIn tidak bisa dihubungi:', e?.message)
    throw new GalatApi(kehabisanWaktu ? GALAT.lama : GALAT.putus, 502)
  }
  if (!hulu.ok || !hulu.body) {
    clearTimeout(pewaktu)
    const keterangan = await hulu.text().catch(() => '')
    console.warn('Asisten VIBE: CosmosIn menjawab ' + hulu.status + ': ' + keterangan.slice(0, 200))
    throw galatHulu(hulu.status, keterangan)
  }

  const enkoder = new TextEncoder()
  const aliran = new ReadableStream({
    async start(keluar) {
      const tulis = (objek) => {
        try {
          keluar.enqueue(enkoder.encode(JSON.stringify(objek) + '\n'))
        } catch {
          // Pembaca sudah pergi (pengguna menutup jawaban); sisanya dibuang.
        }
      }
      const pembaca = hulu.body.getReader()
      const dekoder = new TextDecoder()
      let adaJawaban = false
      const pengurai = buatPengurai((t) => {
        adaJawaban = true
        tulis({ t })
      })
      try {
        for (;;) {
          const { value, done } = await pembaca.read()
          if (done || pengurai.makan(dekoder.decode(value, { stream: true }))) break
        }
        tulis(adaJawaban ? { selesai: true } : { galat: GALAT.tanpaJawaban })
      } catch (e) {
        if (!request?.signal?.aborted) {
          console.warn('Asisten VIBE: aliran jawaban terputus:', e?.message)
          tulis({ galat: kehabisanWaktu ? GALAT.lama : GALAT.terputus })
        }
      } finally {
        clearTimeout(pewaktu)
        pembaca.cancel().catch(() => {})
        try {
          keluar.close()
        } catch {
          // Sudah ditutup karena pembacanya pergi.
        }
      }
    },
    cancel() {
      henti.abort()
    },
  })

  return new Response(aliran, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
