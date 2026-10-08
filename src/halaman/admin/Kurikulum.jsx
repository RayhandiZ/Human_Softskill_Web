import { SegeraHadir } from '../../components/Ui'
import { useTeks } from '../../lib/bahasa'

export default function Kurikulum() {
  const t = useTeks()
  return (
    <SegeraHadir judul={t('Kurikulum CPMK')} fase={8}>
      {t(
        'CRUD terbatas untuk sepuluh aspek, komponen asesmen, bobot sumber dan komponen MK, rubrik huruf mutu, dan mode agregasi — lengkap dengan simulasi dampak sebelum menyimpan: berapa mahasiswa naik atau turun huruf mutu dan berapa yang berubah status kelayakan sertifikat.',
      )}
    </SegeraHadir>
  )
}
