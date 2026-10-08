export function uraiCSV(teks) {
  const bersih = String(teks ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim()
  if (!bersih) return { kepala: [], baris: [] }

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
