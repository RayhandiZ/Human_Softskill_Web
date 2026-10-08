import { SegeraHadir } from '../../components/Ui'
import { useTeks } from '../../lib/bahasa'

export default function Log() {
  const t = useTeks()
  return (
    <SegeraHadir judul={t('Log Aktivitas')} fase={8}>
      {t(
        'Tabel audit setiap perubahan nilai — waktu, aktor, aspek, komponen, nilai lama, nilai baru, dan sumber — dengan filter aktor, jenis aksi, dan rentang tanggal.',
      )}
    </SegeraHadir>
  )
}
