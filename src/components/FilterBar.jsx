import { SearchInput, Select } from './Ui'
import { COHORTS, FACULTIES, programStudi } from '../lib/data'
import { CONFIG } from '../lib/config'
import { useTeks } from '../lib/bahasa'

/* Satu baris kendali di atas grafik dan tabel. Filter memilih baris data,
   bukan mengganti warna seri. */

export const DEFAULT_FILTER = {
  faculty: 'Semua',
  program: 'Semua',
  angkatan: 'Semua',
  semester: 'Semua',
  query: '',
}

const LABEL_ANGKATAN = Object.fromEntries(COHORTS.map((c) => [c.label, c.id]))

export default function FilterBar({ value, onChange, withSearch = true, className = '' }) {
  const t = useTeks()
  const set = (k) => (v) => {
    const next = { ...value, [k]: v }
    if (k === 'faculty') next.program = 'Semua'
    if (k === 'angkatan') next.angkatan = v === 'Semua' ? 'Semua' : LABEL_ANGKATAN[v] ?? v
    onChange(next)
  }

  const facultyOptions = ['Semua', ...FACULTIES.map((f) => f.name)]
  const programOptions = ['Semua', ...programStudi(value.faculty)]
  const angkatanLabel = COHORTS.find((c) => c.id === value.angkatan)?.label ?? 'Semua'
  const semesterOptions = ['Semua', ...Array.from({ length: CONFIG.TOTAL_SEMESTER_PROGRAM }, (_, i) => String(i + 1))]

  return (
    <div className={'card card-pad ' + className}>
      <div className={'grid gap-3 sm:grid-cols-2 ' + (withSearch ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
        <Select
          label={t('Fakultas')}
          value={value.faculty}
          onChange={set('faculty')}
          options={facultyOptions}
          tampilkan={t}
        />
        <Select
          label={t('Program studi')}
          value={value.program}
          onChange={set('program')}
          options={programOptions}
          tampilkan={t}
        />
        <Select
          label={t('Angkatan')}
          value={angkatanLabel}
          onChange={set('angkatan')}
          options={['Semua', ...COHORTS.map((c) => c.label)]}
          tampilkan={t}
        />
        <Select
          label={t('Semester')}
          value={value.semester}
          onChange={set('semester')}
          options={semesterOptions}
          tampilkan={t}
        />
        {withSearch ? (
          <div>
            <span className="mb-1.5 block label">{t('Cari mahasiswa')}</span>
            <SearchInput
              value={value.query}
              onChange={set('query')}
              placeholder={t('Nama, NIM, atau prodi…')}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
