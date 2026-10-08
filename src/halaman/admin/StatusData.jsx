'use client'

import { useEffect, useState } from 'react'
import { IconRefresh } from '../../components/Icons'
import { segarkanData, terakhirDiperbarui, useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

/* --------------------------------------------------------------------------
   Penanda kesegaran data di panel Kemahasiswaan.

   Tiga hal yang membuatnya hidup, bukan sekadar teks mati:

   1. Ikut berubah begitu datanya benar-benar berubah — nilai tersimpan,
      koreksi diputuskan, atau jendela lain menulis lewat peristiwa storage.
      Semuanya bermuara ke store yang sama.
   2. Keterangan relatifnya berdetak sendiri tiap 30 detik, jadi "baru saja"
      berubah menjadi "3 menit lalu" tanpa halaman disentuh.
   3. Bisa disegarkan manual lewat tombolnya.

   Waktunya ditulis dalam zona Asia/Jakarta dan diberi label WIB secara tegas —
   kalau hanya memakai jam perangkat, dosen yang komputernya kebetulan berzona
   lain akan membaca jam yang berbeda untuk data yang sama.

   Sengaja TIDAK ada penarikan berkala ke peladen: basis data belum tersambung,
   dan jam yang berdetak sendiri tanpa ada yang ditarik hanya akan mengaku
   memperbarui sesuatu. Saat basis data masuk, cukup panggil segarkanData()
   pada selang tertentu — bagian ini tidak perlu diubah.
   -------------------------------------------------------------------------- */

const ZONA = 'Asia/Jakarta'
const DETAK = 30_000

const tanggalnya = (d) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: ZONA,
  }).format(d)

/* en-GB dipakai khusus untuk jam agar pemisahnya titik dua (13:39), bukan
   titik seperti gaya Indonesia (13.39). */
const jamnya = (d) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA,
  }).format(d)

function selisih(t, dari, sampai) {
  const detik = Math.max(0, Math.round((sampai - dari) / 1000))
  if (detik < 60) return t('baru saja')
  const menit = Math.round(detik / 60)
  if (menit < 60) return t('{n} menit lalu', { n: menit })
  const jam = Math.round(menit / 60)
  if (jam < 24) return t('{n} jam lalu', { n: jam })
  return null
}

export default function StatusData() {
  // Ikut menghitung ulang setiap ada perubahan data.
  useStore()
  const t = useTeks()

  /* Dirender hanya setelah menempel di peramban. Jamnya berbeda antara render
     di server dan render pertama di klien, dan React menolak hidrasi yang
     isinya tidak sama. */
  const [siap, setSiap] = useState(false)
  const [sekarang, setSekarang] = useState(null)

  useEffect(() => {
    setSiap(true)
    setSekarang(Date.now())
    const id = setInterval(() => setSekarang(Date.now()), DETAK)
    return () => clearInterval(id)
  }, [])

  if (!siap) return null

  const waktu = terakhirDiperbarui()
  const relatif = sekarang ? selisih(t, waktu, sekarang) : null

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[13.5px] text-ink-2">
        {t('Terakhir diperbarui {tanggal}, {jam} WIB', {
          tanggal: tanggalnya(waktu),
          jam: jamnya(waktu),
        })}
        {relatif ? <span className="text-ink-3"> · {relatif}</span> : null}
      </span>
      <button
        type="button"
        onClick={segarkanData}
        aria-label={t('Segarkan data sekarang')}
        className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12.5px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink"
      >
        <IconRefresh size={13} />
        {t('Segarkan')}
      </button>
    </span>
  )
}
