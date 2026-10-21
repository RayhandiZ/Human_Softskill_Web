import { IconMoon, IconSun } from './Icons'
import { useTheme } from '../lib/theme'
import { useTeks } from '../lib/bahasa'

/* Tombol terang/gelap di bilah atas panel bersisi menu samping (mahasiswa, Kemahasiswaan, dosen, super admin). */
export default function TombolTema() {
  const { theme, toggle } = useTheme()
  const t = useTeks()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t(theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap')}
      className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition hover:text-ink"
    >
      {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  )
}
