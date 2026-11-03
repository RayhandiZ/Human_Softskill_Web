import { IconChevronDown } from '../../components/Icons'
import { padananKamus, useTeks } from '../../lib/bahasa'

/* Padanan Inggris teks satu aspek, dipakai editor penilaian dan formulir tambah aspek. Dilipat karena jarang diubah.
   Contoh di dalam kolom adalah terjemahan bawaan yang berlaku selama kolomnya kosong. Lihat src/lib/kamusData.js dan
   README.md › Kamus dan terjemahan › Isi kurikulum. */
export default function IsianInggris({ isian, onUbah }) {
  const t = useTeks()
  const contoh = (b) => padananKamus(isian[b]) ?? ''
  const kolom = [
    ['nama', t('Nama aspek (Inggris)')],
    ['pdp', t('Kegiatan PDP (Inggris)')],
    ['mk', t('Mata kuliah (Inggris)')],
    ['engagement', t('Kegiatan Kemahasiswaan (Inggris)')],
  ]
  return (
    <details className="group rounded-xl border border-line bg-surface px-4 py-3">
      <summary className="-my-3 flex cursor-pointer items-center gap-2 py-3 text-[13px] font-bold text-ink">
        <IconChevronDown size={15} className="transition-transform group-open:rotate-180" />
        {t('Teks bahasa Inggris')}
      </summary>
      <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-ink-2">
        {t('Tampil saat bahasa EN dipilih. Bila dikosongkan, terjemahan bawaan yang dipakai; bila belum ada, teks Indonesianya yang tampil.')}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {kolom.map(([b, label]) => (
          <label key={b} className="block">
            <span className="mb-1.5 block label">{label}</span>
            <input
              className="field !py-2.5"
              value={isian[b + 'En'] ?? ''}
              placeholder={contoh(b)}
              onChange={(e) => onUbah(b + 'En', e.target.value)}
            />
          </label>
        ))}
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block label">{t('Deskripsi (Inggris)')}</span>
          <textarea
            className="field !py-2.5"
            rows={3}
            value={isian.deskripsiEn ?? ''}
            placeholder={contoh('deskripsi')}
            onChange={(e) => onUbah('deskripsiEn', e.target.value)}
          />
        </label>
      </div>
    </details>
  )
}
