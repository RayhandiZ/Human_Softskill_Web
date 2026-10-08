const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/?sem=2', pretendToBeVisual: true })
const w = dom.window
w.matchMedia = (q) => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} })
w.scrollTo = () => {}
for (const k of ['document','navigator','localStorage','HTMLElement','Element','Node','MutationObserver','requestAnimationFrame','cancelAnimationFrame','SVGElement','HTMLInputElement','HTMLSelectElement','Image','FileReader','File','Blob','Event','MouseEvent','KeyboardEvent']) global[k] = w[k]
global.window = w
global.IS_REACT_ACT_ENVIRONMENT = true
w.IS_REACT_ACT_ENVIRONMENT = true
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} }
w.ResizeObserver = global.ResizeObserver
w.localStorage.setItem('sk5c.session', JSON.stringify({ role:'student', studentId:'DEMO-2', email:'a@student.umn.ac.id', name:'X', initials:'RZ' }))

;(async () => {
  const bundle = require('./bundle.cjs')
  const { render } = require(bundle('smoke.jsx', '.smoke.cjs', { platform: 'browser', format: 'cjs', loader: { '.jsx': 'jsx' }, jsx: 'automatic' }))
  const html = await render('/mahasiswa/transkrip')
  const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const cek = [
    ['Kop transkrip',              /Transkrip Capaian Softskill/],
    ['Badge SEMENTARA',            /SEMENTARA/],
    ['Basis perhitungan (R3)',     /berdasarkan 7 dari 10 aspek/],
    ['Aspek terkunci (R2)',        /Dibuka pada Semester 3/],
    ['Grup semester',              /Semester 1 .*Semester 2 .*Semester 3/],
    /* Penandanya kini teks merah berkurung, bukan lagi pil kuning. */
    ['Penanda skema draft (R4)',   /\(Skema belum final\)/],
    ['Cluster lintas semester',    /CL6 baru dinilai sebagian|1\/2 aspek/],
    ['Catatan bukan nol (R2)',     /bukan bernilai nol/],
    ['Larangan tulis (R8)',        /tidak bisa mengubah nilai sendiri/],
  ]
  let gagal = 0
  for (const [nama, re] of cek) {
    const ok = re.test(teks)
    if (!ok) gagal++
    console.log((ok ? 'LULUS ' : 'GAGAL ') + nama)
  }
  // Larangan keras nomor 1: aspek terkunci tidak boleh punya angka nol di barisnya
  const barisTerkunci = teks.match(/B\.3\. Empathic Exchange[^|]{0,120}/)
  console.log('\nBaris aspek terkunci B.3:', barisTerkunci ? barisTerkunci[0].trim().slice(0, 110) : '(tidak ditemukan)')
  console.log(gagal ? '\n' + gagal + ' pemeriksaan gagal' : '\nSemua pemeriksaan isi lulus')
  process.exit(0)
})()
