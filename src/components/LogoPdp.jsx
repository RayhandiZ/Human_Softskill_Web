/* --------------------------------------------------------------------------
   Logo PDP — Personal Development Program.

   Digambar ulang sebagai vektor dari berkas raster yang masih kasar (noda
   kompresi, titik merah dan garis sisa potongan di tepinya). Ukurannya diambil
   dari berkas itu lalu dirapikan:

   - batang 10, rongga 13, sisi mangkuk 10 → satu huruf selebar 33, jarak antarhuruf 7;
   - tinggi-x 43 (y 12–55), batang "d" naik 12 di atasnya, kaki "p" turun 14 di bawahnya;
   - setiap sudut terpotong 45°: sudut luar mangkuk 6, takik di pangkal batang 5;
   - "d" adalah "p" yang diputar 180°, jadi ketiga huruf pasti senada.

   Warnanya currentColor: putih di panel biru, gelap di latar terang.
   Belum final — ganti dengan berkas resmi begitu tersedia.
   -------------------------------------------------------------------------- */

const LEBAR = 33
const JARAK = 7
const ATAS = 12 // garis tinggi-x
const DASAR = 55 // garis dasar
const KAKI = 69 // ujung kaki "p"

// Huruf "p" dengan batang di x 0–10. Titik-titiknya searah jarum jam.
const HURUF_P = [
  [0, ATAS], [5, ATAS], [10, ATAS + 5], [15, ATAS], [27, ATAS], [33, ATAS + 6],
  [33, DASAR - 6], [27, DASAR], [15, DASAR], [10, DASAR - 5], [10, KAKI], [0, KAKI],
]

// "d" = "p" diputar 180° pada pusat mangkuk; batangnya berhenti di y 0, bukan menjulur sejauh kaki "p".
const HURUF_D = HURUF_P.map(([x, y]) => [LEBAR - x, Math.max(0, ATAS + DASAR - y)])

const RONGGA = [[10, ATAS + 8], [23, ATAS + 8], [23, DASAR - 8], [10, DASAR - 8]]

const jalur = (titik, geser) => 'M' + titik.map(([x, y]) => x + geser + ' ' + y).join(' L') + ' Z'

const HURUF = [
  [HURUF_P, 0],
  [HURUF_D, LEBAR + JARAK],
  [HURUF_P, 2 * (LEBAR + JARAK)],
]
const D = HURUF.map(([titik, geser]) => jalur(titik, geser) + ' ' + jalur(RONGGA, geser)).join(' ')

const LEBAR_LOGO = 3 * LEBAR + 2 * JARAK // 113

/* Tiga baris keterangan, rata kiri dengan batang "p". textLength mengunci
   lebar tiap baris seperti aslinya, apa pun huruf yang tersedia di perangkat. */
const BARIS = [
  ['PERSONAL', 89, 59],
  ['DEVELOPMENT', 102, 82],
  ['PROGRAM', 115, 56],
]

/**
 * `keterangan` false → hanya huruf "pdp", untuk ukuran kecil yang tidak sanggup
 * menampung tiga baris tulisan.
 */
export default function LogoPdp({ keterangan = true, className = '', ...rest }) {
  return (
    <svg
      viewBox={'0 0 ' + LEBAR_LOGO + ' ' + (keterangan ? 117 : KAKI)}
      // Bila kotaknya lebih lebar dari logonya, logo tetap rata kiri — bukan melayang di tengah.
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
