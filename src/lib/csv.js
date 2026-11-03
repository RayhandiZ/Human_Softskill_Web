/** Baris mentah, termasuk baris judul: larik sel per baris, urutan kolomnya seperti di berkas. */
export function barisCSV(teks) {
  const bersih = String(teks ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim()
  if (!bersih) return []

  const pemisah = (bersih.split('\n')[0].match(/;/g) ?? []).length > (bersih.split('\n')[0].match(/,/g) ?? []).length ? ';' : ','

  const semua = []
  let sel = ''
  let baris = []
  let dalamKutip = false

  for (let i = 0; i < bersih.length; i++) {
    const c = bersih[i]
    if (dalamKutip) {
      if (c === '"') {
        if (bersih[i + 1] === '"') {
          sel += '"'
          i++
        } else dalamKutip = false
      } else sel += c
    } else if (c === '"') dalamKutip = true
    else if (c === pemisah) {
      baris.push(sel)
      sel = ''
    } else if (c === '\n') {
      baris.push(sel)
      semua.push(baris)
      baris = []
      sel = ''
    } else sel += c
  }
  baris.push(sel)
  semua.push(baris)
  return semua
}

const BATAS_UKURAN = 5 * 1024 * 1024
const salahBerkas = (teks) => new Error(teks)

/**
 * Baris mentah berkas unggahan, baris pertama judul; Excel dibaca dari lembar pertama, di peramban. Galatnya kalimat
 * kamus, jadi pemanggil menampilkannya lewat t(e.message). Dipakai Unggah Nilai dosen dan Import Excel super admin.
 */
export async function bacaBarisBerkas(berkas) {
  const nama = berkas.name.toLowerCase()
  if (berkas.size > BATAS_UKURAN) throw salahBerkas('Berkasnya lebih dari 5 MB. Pastikan ini rekap nilai kelas Anda.')
  if (nama.endsWith('.csv')) return barisCSV(await berkas.text())
  if (nama.endsWith('.xls')) {
    throw salahBerkas('Berkas .xls (Excel lama) belum bisa dibaca. Buka di Excel, simpan sebagai .xlsx, lalu unggah lagi.')
  }
  if (!nama.endsWith('.xlsx')) throw salahBerkas('Pilih berkas .xlsx atau .csv.')
  const { readSheet } = await import('read-excel-file/browser')
  try {
    return await readSheet(berkas)
  } catch {
    throw salahBerkas('Berkas ini tidak terbaca sebagai Excel. Simpan ulang sebagai .xlsx lalu unggah lagi.')
  }
}

export function uraiCSV(teks) {
  const semua = barisCSV(teks)
  if (!semua.length) return { kepala: [], baris: [] }

  const kepala = (semua.shift() ?? []).map((h) => h.trim())
  const kepalaNormal = kepala.map((h) => h.toLowerCase())

  const isi = semua
    .filter((r) => r.some((sel) => sel.trim() !== ''))
    .map((r) => {
      const obj = {}
      kepala.forEach((h, i) => {
        const nilai = (r[i] ?? '').trim()
        obj[h] = nilai
        const kecil = h.toLowerCase()
        if (kecil !== h) obj[kecil] = nilai
      })
      return obj
    })

  return { kepala, kepalaNormal, baris: isi }
}

export function susunCSV(kepala, baris) {
  const kutip = (v) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  return [kepala.map(kutip).join(','), ...baris.map((r) => r.map(kutip).join(','))].join('\n')
}

export function unduhBerkas(namaBerkas, isi, tipe = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + isi], { type: tipe })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkas
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
