import { SegeraHadir } from '../../components/Ui'
import { useTeks } from '../../lib/bahasa'

export default function Angkatan() {
  const t = useTeks()
  return (
    <SegeraHadir judul={t('Angkatan & Sertifikat')} fase={8}>
      {t(
        'Pemetaan tiap angkatan ke tiga periode akademiknya, tingkat kelengkapan nilai, penguncian angkatan dengan pratinjau dan konfirmasi ketik, lalu tabel penerbitan sertifikat massal.',
      )}
    </SegeraHadir>
  )
}
