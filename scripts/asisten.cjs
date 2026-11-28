/* Uji Asisten VIBE: npm run test:asisten. Tanpa jaringan dan basis data: impor db.js, muat.js, dan masuk.js dari
   src/server diarahkan ke palsu-server-asisten.js, dan fetch ke CosmosIn diganti aliran tiruan di dalam ujinya.
   Memakai build() async karena pengarah impornya plugin esbuild, yang tidak bisa dipakai buildSync (bundle.cjs). */
const path = require('path')
const { pathToFileURL } = require('url')
const esbuild = require('esbuild')

const PALSU = path.join(__dirname, 'palsu-server-asisten.js')
const SERVER = path.join(__dirname, '..', 'src', 'server')

const gantiServer = {
  name: 'ganti-server',
  setup(b) {
    b.onResolve({ filter: /^\.\/(db|muat|masuk)\.js$/ }, (a) => (path.resolve(a.resolveDir) === SERVER ? { path: PALSU } : undefined))
  },
}

const keluar = path.join(__dirname, '.asisten.mjs')
esbuild
  .build({
    entryPoints: [path.join(__dirname, 'asisten-test.mjs')],
    bundle: true,
    outfile: keluar,
    platform: 'node',
    format: 'esm',
    logLevel: 'error',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [gantiServer],
  })
  .then(() => import(pathToFileURL(keluar).href))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
