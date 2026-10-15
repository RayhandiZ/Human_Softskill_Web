let saatSesiHabis = null

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
  if (!jawaban.ok) {
    // Kode HTTP ikut dibawa supaya halaman bisa membedakan, misalnya, pintu API yang belum dibuat (404).
    const galat = new Error(data.galat ?? 'Permintaan ke server gagal.')
    galat.status = jawaban.status
    throw galat
  }
  return data
}
