/* Digambar ulang dari raster; belum final, ganti dengan berkas resmi bila ada. */

const LEBAR = 33
const JARAK = 7
const ATAS = 12 // garis tinggi-x
const DASAR = 55 // garis dasar
const KAKI = 69 // ujung kaki "p"

const HURUF_P = [
  [0, ATAS], [5, ATAS], [10, ATAS + 5], [15, ATAS], [27, ATAS], [33, ATAS + 6],
  [33, DASAR - 6], [27, DASAR], [15, DASAR], [10, DASAR - 5], [10, KAKI], [0, KAKI],
]

const HURUF_D = HURUF_P.map(([x, y]) => [LEBAR - x, Math.max(0, ATAS + DASAR - y)])

const RONGGA = [[10, ATAS + 8], [23, ATAS + 8], [23, DASAR - 8], [10, DASAR - 8]]

const jalur = (titik, geser) => 'M' + titik.map(([x, y]) => x + geser + ' ' + y).join(' L') + ' Z'

const HURUF = [
  [HURUF_P, 0],
  [HURUF_D, LEBAR + JARAK],
  [HURUF_P, 2 * (LEBAR + JARAK)],
]
const D = HURUF.map(([titik, geser]) => jalur(titik, geser) + ' ' + jalur(RONGGA, geser)).join(' ')

const LEBAR_LOGO = 3 * LEBAR + 2 * JARAK

const BARIS = [
  ['PERSONAL', 89, 59],
  ['DEVELOPMENT', 102, 82],
  ['PROGRAM', 115, 56],
]

export default function LogoPdp({ keterangan = true, className = '', ...rest }) {
  return (
    <svg
      viewBox={'0 0 ' + LEBAR_LOGO + ' ' + (keterangan ? 117 : KAKI)}
      preserveAspectRatio="xMinYMid meet"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="PDP — Personal Development Program"
      {...rest}
    >
      <path fillRule="evenodd" d={D} />
      {keterangan ? (
        <g fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize="9.8" stroke="currentColor" strokeWidth="0.35">
          {BARIS.map(([teks, y, lebar]) => (
            <text key={teks} x="0" y={y} textLength={lebar} lengthAdjust="spacing">
              {teks}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  )
}
