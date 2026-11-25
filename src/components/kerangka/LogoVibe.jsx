/* Logo VIBE: monogram pita VB bergradasi toska, dari gambar pilihan pengguna (latar gelapnya dibuang, public/logo-vibe.png;
   ikon tab di app/icon.png). `terang`: di permukaan terang, pita paling muda hampir hilang di atas putih, jadi logonya
   digelapkan lewat .logo-vibe-terang (index.css); di mode gelap kembali seperti aslinya. `terang="tetap"`: alasnya putih
   di kedua mode (deretan logo footer), jadi tetap digelapkan. `hiasan`: logo berdiri di samping tulisan VIBE, jadi tidak
   perlu dibacakan dua kali. */

export default function LogoVibe({ className = '', terang = false, hiasan = false, ...rest }) {
  return (
    <img
      src="/logo-vibe.png"
      width={290}
      height={192}
      alt={hiasan ? '' : 'VIBE'}
      draggable={false}
      className={(terang === 'tetap' ? 'logo-vibe-putih ' : terang ? 'logo-vibe-terang ' : '') + className}
      {...rest}
    />
  )
}
