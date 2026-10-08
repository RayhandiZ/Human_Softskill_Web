import Link from 'next/link'

export default function TidakDitemukan() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-center">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-[.08em] text-ink-3">404</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-2">
          Alamat yang Anda buka tidak ada di aplikasi ini.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 text-[15px] font-bold text-white"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  )
}
