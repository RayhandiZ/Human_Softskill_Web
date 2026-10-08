/* Uji Fase 7 — jalankan dengan: npm run test:nilai */
const { pathToFileURL } = require('url')
const bundle = require('./bundle.cjs')

/* Node tidak punya localStorage; dipasang di sini agar jalur penyimpanan store
   ikut teruji persis seperti di peramban. */
const isi = new Map()
global.localStorage = {
  getItem: (k) => (isi.has(k) ? isi.get(k) : null),
  setItem: (k, v) => isi.set(k, String(v)),
  removeItem: (k) => isi.delete(k),
  get length() { return isi.size },
}
const keluar = bundle('nilai-test.mjs', '.nilai.mjs', { platform: 'node', format: 'esm' })
import(pathToFileURL(keluar).href)
