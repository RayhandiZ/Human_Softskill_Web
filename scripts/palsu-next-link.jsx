/* Tiruan `next/link` untuk uji jsdom: sebuah <a> biasa.

   Cukup setara untuk pemeriksaan isi halaman — uji memang memeriksa tujuan
   tautan lewat atribut href, persis seperti yang dilihat pembaca. Pemuatan
   awal (prefetch) dan navigasi klien memang tidak ditiru; itu urusan Next,
   bukan urusan tampilan yang diuji di sini. */

export default function Link({ href, children, prefetch, replace, scroll, ...sisa }) {
  return (
    <a href={typeof href === 'string' ? href : '#'} {...sisa}>
      {children}
    </a>
  )
}
