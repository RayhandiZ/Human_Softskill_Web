/* Pemeriksaan Fase 1 — jalankan dengan: npm run verify */
const { pathToFileURL } = require('url')
const bundle = require('./bundle.cjs')

const keluar = bundle('verify-scoring.mjs', '.verify.mjs', { platform: 'node', format: 'esm' })
import(pathToFileURL(keluar).href)
