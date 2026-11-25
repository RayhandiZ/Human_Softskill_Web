import LogoVibe from './LogoVibe'
import PanjiPdp from './PanjiPdp'
import TombolBahasa from './TombolBahasa'
import { useTeks } from '../../lib/bahasa'
import { AREA } from '../../lib/curriculum'

/* Kerangka halaman di luar panel: halaman masuk, lupa kata sandi, dan atur kata sandi baru. Latar foto kampus yang
   diredupkan, panel kiri "Apa sih VIBE itu?" di layar lebar, pemilih bahasa, judul VIBE, lalu `children` (kartu kaca
   .kaca-masuk) di kolom kanan. Tulisan yang berdiri di atas foto tidak beralas kartu (dibuang 16 Nov 2026 atas
   permintaan, supaya pemandangan terlihat di belakang tulisan); bayangan hurufnya dari .teks-foto. Lihat index.css ›
   latar dan kartu kaca halaman masuk. Dipindah dari halaman masuk (src/halaman/akun/Masuk.jsx) pada 16 Nov 2026. */

/* Dipasang dua kali: di atas formulir untuk layar lebar, di dalam kolom formulir untuk layar sempit. Kutipannya
   putih penuh karena berdiri di depan langit foto yang paling terang. Tulisan VIBE toska bergradasi seperti di
   panel. */
function JudulAplikasi({ className = '' }) {
  const t = useTeks()
  return (
    <div className={'teks-foto text-center ' + className}>
      <p className="teks-vibe mx-auto w-fit text-[30px] font-extrabold leading-none tracking-tight text-[var(--accent-ink)]">
        VIBE
      </p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed text-white">
        <span aria-hidden="true" className="text-[var(--accent-ink)]">“</span>
        {t('Ayo semangat mencari human skill kamu.')}
        <span aria-hidden="true" className="text-[var(--accent-ink)]">”</span>
      </p>
    </div>
  )
}

export default function KerangkaMasuk({ children }) {
  const t = useTeks()
  return (
    // Selalu memakai warna mode gelap (kelas dark), apa pun tema perangkat: tulisannya putih di atas foto yang
    // diredupkan, jadi teks, kolom isian, dan kartu kacanya harus versi terang. isolate: latar (z-index -1) tetap
    // di belakang kedua panel. Lihat index.css › latar dan kartu kaca halaman masuk.
    <div className="dark relative isolate grid min-h-screen overflow-hidden lg:grid-cols-[1.15fr_minmax(420px,540px)]">
      <div aria-hidden="true" className="latar-masuk" />

      {/* --------------------------- panel kiri --------------------------- */}
      <aside className="relative hidden px-12 pb-8 pt-12 text-white lg:flex lg:flex-col">
        {/* Panji kain berlapis tergantung di kait tepi atas panel; lihat PanjiPdp.jsx dan README.md › Gerak. */}
        <div className="-mt-12 mb-6 self-start">
          <PanjiPdp />
        </div>

        {/* Tulisan blok ini dibesarkan supaya terbaca dosen (revisi 2 Nov 2026). Bloknya dilebarkan dan jaraknya
            dirapatkan sepadan, supaya tingginya tidak bertambah dan tetap muat di laptop kecil. Di bawah 1280px
            kolomnya sempit dan barisnya lebih banyak, jadi ukurannya satu tingkat di bawahnya. Paragraf dan
            keterangannya putih 95% (dulu 75 sampai 80%) karena kini berdiri langsung di atas foto; di 90% paragrafnya
            4,43:1 di 1280×720, tepat di depan gedung telur yang terang. */}
        <div className="teks-foto my-auto max-w-[640px]">
          <h1 className="text-[38px] font-extrabold leading-[1.1] tracking-tight xl:text-[40px]">
            {t('Apa sih VIBE itu?')}
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-white/95 xl:text-[17px]">
            {t(
              'VIBE (Values, Intelligence, Behavior & Excellence) merupakan sistem penilaian yang dirancang untuk mengevaluasi dan mengembangkan kemampuan interpersonal, keterampilan teknis, dan kompetensi lainnya pada mahasiswa Universitas Multimedia Nusantara. Diantaranya ada tiga penilaian seperti dibawah ini:'
            )}
          </p>

          <ul className="mt-6 space-y-3">
            {AREA.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3.5">
                {/* Nomor urut tanpa latar, rata kiri segaris dengan judul dan paragraf (17 Nov 2026; dulu lencana
                    A/B/C berlatar warna area). Lebar kolomnya tetap supaya ketiga nama sejajar. */}
                <span className="w-7 shrink-0 text-[26px] font-extrabold leading-none tabular-nums text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15.5px] font-bold xl:text-[16.5px]">{t(a.nama)}</p>
                  <p className="text-[14px] text-white/95 xl:text-[15px]">{t(a.ringkas)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="teks-foto text-[14px] text-white/80">
          Universitas Multimedia Nusantara
        </p>
      </aside>

      {/* -------------------------- panel kanan --------------------------- */}
      {/* kolom-masuk: pudar ganti bahasa dipasang di isi kartu, bukan di <main>; lihat index.css › ganti-bahasa. */}
      <main className="kolom-masuk relative flex flex-col px-5 pb-12 pt-6 sm:px-10 lg:pt-12">
        {/* Bawaan halaman ini Inggris, panel tetap Indonesia; bahasa yang dipilih di sini diingat dan ikut
            dipakai di panel. Di layar sempit sejajar dengan logo VIBE. Blur dan penggelapan di belakangnya
            dipasang di kaca lintasan pemilih sendiri (index.css › .kolom-masuk .tombol-bahasa), supaya ikut
            menggembung saat lensa terangkat. Lihat README.md › Hidrasi. */}
        <div className="absolute right-5 top-6 z-10 sm:right-10">
          <TombolBahasa nada="onbrand" />
        </div>
        <JudulAplikasi className="mx-auto mt-8 hidden w-full max-w-[400px] lg:block" />
        {/* Di layar sempit kolom ini menempel ke atas; di layar lebar ia di tengah. animate-masuk, bukan
            animate-rise: fill both mematikan backdrop-filter kartu kaca di dalamnya (lihat index.css). */}
        <div className="mx-auto w-full max-w-[440px] animate-masuk lg:my-auto">
          {/* Di layar lebar logo PDP ada di panji panel kiri. */}
          <LogoVibe className="logo-foto block h-7 w-auto lg:hidden" />
          <JudulAplikasi className="mb-8 mt-20 lg:hidden" />

          {children}
        </div>
      </main>
    </div>
  )
}
