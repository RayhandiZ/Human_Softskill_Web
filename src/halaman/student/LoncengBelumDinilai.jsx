import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconBell, IconChevronRight, IconInfo } from '../../components/Icons'
import { SUMBER } from '../../lib/curriculum'
import { useTeks } from '../../lib/bahasa'

/* --------------------------------------------------------------------------
   Lonceng "Belum dinilai" di bilah atas panel mahasiswa.

   Isinya komponen asesmen pada semester yang sudah dibuka tetapi nilainya
   belum diunggah penilai. Dulu tampil sebagai kartu di dashboard; sebagai
   lonceng ia tidak memakan ruang gulir, dan tetap terlihat dari halaman mana
   pun.

   Dua keputusan yang disengaja:
   - Lencananya BIRU, bukan merah. Ini bukan galat dan bukan tugas yang
     terlambat — mahasiswa tidak perlu melakukan apa pun. Merah akan membuat
     sebelas komponen yang wajar belum dinilai terbaca seperti sebelas masalah.
     Kalimat pertama di panelnya pun menegaskan hal yang sama.
   - Lonceng hanya muncul bila memang ada yang ditunggu, sama seperti lonceng
     panel Kemahasiswaan: kendali yang tidak menuju ke mana pun lebih
     membingungkan daripada tidak ada.
   -------------------------------------------------------------------------- */

/** Aspek yang masih punya komponen kosong, beserta komponennya. */
export const belumDinilai = (t) =>
  t.aspek
    .filter((a) => !a.terkunci && a.komponenKosong.length > 0)
    .map((a) => ({ aspek: a.aspek, komponen: a.komponenKosong }))

export default function LoncengBelumDinilai({ t }) {
  const teks = useTeks()
  const [buka, setBuka] = useState(false)
  const ref = useRef(null)

  const kelompok = belumDinilai(t)
  const jumlah = kelompok.reduce((n, g) => n + g.komponen.length, 0)

  useEffect(() => {
    if (!buka) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setBuka(false)
    }
    const onKey = (e) => e.key === 'Escape' && setBuka(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [buka])

  if (!jumlah) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-label={teks('{n} komponen belum dinilai', { n: jumlah })}
        className="relative grid h-10 w-10 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition hover:text-ink"
      >
        <IconBell size={19} />
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-brand px-1 text-[11px] font-extrabold text-white ring-2 ring-[var(--bg)]">
          {jumlah > 99 ? '99+' : jumlah}
        </span>
      </button>

      {buka ? (
        /* Di ponsel panel dipasang tetap selebar layar: lonceng letaknya dekat
           tepi kanan, dan panel 360px yang ditambatkan ke lonceng akan meluber
           keluar layar di sisi kiri. */
        <div
          role="dialog"
          aria-label={teks('Komponen belum dinilai')}
          className="fixed inset-x-4 top-[76px] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-rise sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[380px]"
        >
          <div className="border-b border-line px-4 py-3.5">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-bold text-ink">{teks('Belum dinilai')}</span>
              <span className="text-[13px] font-semibold text-ink-2">
                {teks('{n} komponen', { n: jumlah })}
              </span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {teks('Menunggu konfirmasi lebih lanjut kepada dosen terkait.')}
            </p>
          </div>

          <div className="max-h-[min(55vh,420px)] overflow-y-auto px-4 py-2">
            {kelompok.map(({ aspek, komponen }) => (
              <section key={aspek.id} className="border-b border-line py-3 last:border-0">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                  <span className="grid h-7 min-w-[28px] place-items-center rounded-lg bg-surface-2 px-1 text-[11.5px] font-bold">
                    {aspek.kode}
                  </span>
                  <span className="truncate">{aspek.nama}</span>
                </p>
                <ul className="mt-2 space-y-1.5 pl-9">
                  {komponen.map((k) => (
                    <li key={k.id} className="text-[13.5px] leading-snug text-ink">
                      {k.label}
                      <span className="block text-[12.5px] text-ink-3">
                        {teks('dari {sumber}', { sumber: SUMBER[k.sumber]?.label ?? k.sumber })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="border-t border-line bg-surface-2 px-4 py-3">
            <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-3">
              <IconInfo size={13} className="mt-px shrink-0" />
              {teks('Nilai akan diunggah dosen pengampu atau unit kemahasiswaan pada akhir periode ujian.')}
            </p>
            <Link
              href="/mahasiswa/transkrip"
              onClick={() => setBuka(false)}
              className="mt-2.5 inline-flex items-center gap-1 text-[13.5px] font-bold text-brand-ink hover:underline"
            >
              {teks('Lihat di transkrip')}
              <IconChevronRight size={15} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
