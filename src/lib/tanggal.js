/** 'TTTT-BB-HH' menjadi "26 Okt 2026" atau "26 Oct 2026". Tanggal dari server sudah WIB, jadi dibaca sebagai UTC supaya
    harinya tidak bergeser mengikuti zona waktu peramban. */
export function tanggalPendek(iso, bahasa) {
  if (!iso) return ''
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat(bahasa === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}
