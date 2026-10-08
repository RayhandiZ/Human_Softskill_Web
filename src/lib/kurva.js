/* --------------------------------------------------------------------------
   Kurva monoton kubik (Fritsch-Carlson).

   KENAPA BUKAN SPLINE BIASA. Kurva mulus yang umum dipakai -- Catmull-Rom dan
   sejenisnya -- MELAMPAUI titik datanya di sekitar tikungan. Pada grafik nilai,
   lampauan itu bukan sekadar soal rupa: mahasiswa bernilai 86, 85, 86 akan
   melihat kurvanya turun menyentuh 84 di antara dua semester, padahal nilai 84
   tidak pernah ada. Grafik tidak boleh menggambar angka yang tidak terjadi.

   Fritsch-Carlson menjamin itu tidak terjadi: kemiringan di tiap titik dibatasi
   sehingga kurvanya tidak pernah keluar dari rentang dua titik yang diapitnya,
   dan di titik balik kemiringannya dipaksa nol. Hasilnya sama mulusnya, tapi
   setiap koordinat yang digambar benar-benar ada di datanya.

   Ditaruh di lib, bukan di dalam halaman, supaya bisa diuji langsung dengan
   deret yang naik-turun -- justru deret itulah yang membedakannya dari spline
   biasa, dan kebetulan tidak ada satu pun persona demo yang berbentuk begitu.
   -------------------------------------------------------------------------- */

/** Titik masuk berupa {x, y}; hasilnya atribut d untuk sebuah <path>. */
export function jalurMulus(titik) {
  const n = titik.length
  if (n < 2) return ''
  const xy = (k) => k.x.toFixed(2) + ',' + k.y.toFixed(2)
  /* Dua titik tidak punya tikungan untuk dilengkungkan. */
  if (n === 2) return 'M' + xy(titik[0]) + ' L' + xy(titik[1])

  const sekan = []
  for (let i = 0; i < n - 1; i++) {
    sekan.push((titik[i + 1].y - titik[i].y) / (titik[i + 1].x - titik[i].x))
  }

  const m = [sekan[0]]
  for (let i = 1; i < n - 1; i++) {
    /* Tanda berlawanan berarti titik ini puncak atau lembah. Kemiringan nol
       di sana yang membuat kurvanya mendatar, bukan menyeberang. */
    m.push(sekan[i - 1] * sekan[i] <= 0 ? 0 : (sekan[i - 1] + sekan[i]) / 2)
  }
  m.push(sekan[n - 2])

  /* Pembatas Fritsch-Carlson: kemiringan yang terlalu curam ditarik kembali
     ke dalam lingkaran berjari-jari 3, dan di situlah jaminannya berasal. */
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

/* Kelipatan garis bantu yang enak dibaca: yang terkecil menghasilkan paling
   banyak lima petak. */
function pilihLangkah(bawah, atas) {
  for (const l of [1, 2, 5, 10, 20, 25, 50]) {
    if ((Math.ceil(atas / l) * l - Math.floor(bawah / l) * l) / l <= 5) return l
  }
  return 50
}

// Jendela sumbu Y untuk grafik garis saja; batang wajib berangkat dari nol.
// Lebar minimumnya mencegah selisih satu angka tampak seperti lompatan besar.
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
  // Digeser, bukan dipotong, supaya lebarnya tidak menyusut di dekat ujung skala.
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
