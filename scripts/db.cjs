/* Uji sambungan basis data — jalankan dengan: npm run test:db
   Pintu API dijalankan langsung, tanpa server Next, terhadap MySQL dari .env. */
const { pathToFileURL } = require('url')
const bundle = require('./bundle.cjs')

const keluar = bundle('db-test.mjs', '.db.mjs', {
  platform: 'node',
  format: 'esm',
  packages: 'external',
})
import(pathToFileURL(keluar).href)
