// Satu pintu untuk setiap permintaan ke API. Galat dari server dikembalikan sebagai Error berisi
// kalimat yang bisa langsung ditampilkan; jawaban 401 memberi tahu kerangka aplikasi bahwa sesinya
// sudah berakhir.

let saatSesiHabis = null

/** Dipasang sekali oleh kerangka aplikasi (components/PemuatData.jsx). */
export const aturSaatSesiHabis = (fn) => {
  saatSesiHabis = fn
}

export async function kirim(alamat, { metode = 'POST', isi } = {}) {
  let jawaban
  try {
    jawaban = await fetch(alamat, {
      method: metode,
      headers: { 'Content-Type': 'application/json' },
      body: metode === 'GET' ? undefined : JSON.stringify(isi ?? {}),
    })
  } catch {
    throw new Error('Server tidak bisa dihubungi. Periksa koneksi, lalu coba lagi.')
  }
  const data = await jawaban.json().catch(() => ({}))
  if (jawaban.status === 401) saatSesiHabis?.()
  if (!jawaban.ok) throw new Error(data.galat ?? 'Permintaan ke server gagal.')
  return data
}
