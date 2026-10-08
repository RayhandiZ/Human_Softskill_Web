/* Kurva monoton kubik (Fritsch-Carlson): tidak pernah melampaui titik datanya; lihat README.md › Grafik. */

/** Titik masuk berupa {x, y}; hasilnya atribut d untuk sebuah <path>. */
export function jalurMulus(titik) {
  const n = titik.length
  if (n < 2) return ''
  const xy = (k) => k.x.toFixed(2) + ',' + k.y.toFixed(2)
  if (n === 2) return 'M' + xy(titik[0]) + ' L' + xy(titik[1])

  const sekan = []
  for (let i = 0; i < n - 1; i++) {
    sekan.push((titik[i + 1].y - titik[i].y) / (titik[i + 1].x - titik[i].x))
  }

  const m = [sekan[0]]
  for (let i = 1; i < n - 1; i++) {
    m.push(sekan[i - 1] * sekan[i] <= 0 ? 0 : (sekan[i - 1] + sekan[i]) / 2)
  }
  m.push(sekan[n - 2])

  for (let i = 0; i < n - 1; i++) {
    if (sekan[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / sekan[i]
    const b = m[i + 1] / sekan[i]
    const kuadrat = a * a + b * b
    if (kuadrat > 9) {
      const skala = 3 / Math.sqrt(kuadrat)
      m[i] = skala * a * sekan[i]
      m[i + 1] = skala * b * sekan[i]
    }
  }

  let d = 'M' + xy(titik[0])
  for (let i = 0; i < n - 1; i++) {
    const h = titik[i + 1].x - titik[i].x
    const k1 = { x: titik[i].x + h / 3, y: titik[i].y + (m[i] * h) / 3 }
    const k2 = { x: titik[i + 1].x - h / 3, y: titik[i + 1].y - (m[i + 1] * h) / 3 }
    d += ' C' + xy(k1) + ' ' + xy(k2) + ' ' + xy(titik[i + 1])
  }
  return d
}

function pilihLangkah(bawah, atas) {
  for (const l of [1, 2, 5, 10, 20, 25, 50]) {
    if ((Math.ceil(atas / l) * l - Math.floor(bawah / l) * l) / l <= 5) return l
  }
  return 50
}

// Jendela sumbu Y untuk grafik garis; lebar minimum mencegah selisih kecil tampak seperti lompatan.
export function jendelaNilai(angka, { min = 20 } = {}) {
  const rendah = Math.min(...angka)
  const tinggi = Math.max(...angka)

  let bawah = rendah - 4
  let atas = tinggi + 4
  if (atas - bawah < min) {
    const tengah = (rendah + tinggi) / 2
    bawah = tengah - min / 2
    atas = tengah + min / 2
  }
  if (bawah < 0) {
    atas -= bawah
    bawah = 0
  }
  if (atas > 100) {
    bawah -= atas - 100
    atas = 100
  }

  const langkah = pilihLangkah(bawah, atas)
  const b = Math.max(0, Math.floor(bawah / langkah) * langkah)
  const a = Math.min(100, Math.ceil(atas / langkah) * langkah)
  const garis = []
  for (let v = b; v <= a; v += langkah) garis.push(v)
  return { bawah: b, atas: a, langkah, garis }
}
