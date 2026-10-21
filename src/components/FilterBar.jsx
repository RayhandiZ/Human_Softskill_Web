import { useId, useState } from 'react'
import { SearchInput, Select } from './Ui'
import { IconFilter } from './Icons'
import { COHORTS, FACULTIES, programStudi } from '../lib/data'
import { CONFIG } from '../lib/config'
import { useTeks } from '../lib/bahasa'

export const DEFAULT_FILTER = {
  faculty: 'Semua',
  program: 'Semua',
  angkatan: 'Semua',
  semester: 'Semua',
  query: '',
}

const LABEL_ANGKATAN = Object.fromEntries(COHORTS.map((c) => [c.label, c.id]))
const PILIHAN = ['faculty', 'program', 'angkatan', 'semester']

/** Banyaknya pilihan saringan (fakultas, prodi, angkatan, semester) yang tidak lagi bernilai bawaan. */
export const jumlahPilihanAktif = (value) =>
  PILIHAN.filter((k) => String(value[k] ?? '') !== String(DEFAULT_FILTER[k])).length

/** Ada saringan apa pun yang berbeda dari bawaan, termasuk kata kunci pencarian. */
export const saringanAktif = (value) =>
  Object.keys(DEFAULT_FILTER).some((k) => String(value[k] ?? '') !== String(DEFAULT_FILTER[k]))

/**
 * `ringkas`: alat saring di atas tabel. Kolom cari lalu empat pilihan berlabel di dalam kotak, disusun grid
 * supaya tidak ada pilihan yang tersisa sendirian dan melar selebar baris. Di HP keempat pilihan dilipat di
 * balik tombol Filter (dengan jumlah yang aktif) supaya tabelnya cepat terlihat. Tombol Atur ulang ada di
 * halaman pemakainya, karena halaman itu yang tahu saringan tambahannya sendiri.
 */
export default function FilterBar({ value, onChange, withSearch = true, className = '', ringkas = false }) {
  const t = useTeks()
  const idSaring = useId()
  const [bukaSaring, setBukaSaring] = useState(false)
  // Hanya "Semua" yang diterjemahkan. Nama fakultas, prodi, dan angkatan adalah data; melewatkannya ke t() dulu
  // memenuhi konsol mode Inggris dengan peringatan "belum ada padanan" untuk setiap pilihan.
  const tampilkan = (o) => (o === 'Semua' ? t('Semua') : o)
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

  if (ringkas) {
    const n = jumlahPilihanAktif(value)
    // Lebar kolom: HP satu kolom; sm dan lg dua kolom; xl kolom cari satu baris penuh lalu empat pilihan sebaris;
    // mulai 1440px semuanya sebaris. Di bawah lebar itu "Program studi" dan nilainya tidak muat dalam lima kolom.
    // Tanpa kolom cari (Program Studi): empat pilihan saja, sel tombol Filter hanya ada di HP.
    return (
      <div
        className={
          'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4 ' +
          (withSearch ? 'min-[1440px]:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] ' : '') +
          className
        }
      >
        <div
          className={
            withSearch ? 'flex min-w-0 gap-2.5 sm:col-span-2 xl:col-span-4 min-[1440px]:col-span-1' : 'flex sm:hidden'
          }
        >
          {withSearch ? (
            <SearchInput
              value={value.query}
              onChange={set('query')}
              placeholder={t('Cari nama, NIM, atau prodi')}
              label={t('Cari mahasiswa')}
              className="min-w-0 flex-1"
            />
          ) : null}
          <button
            type="button"
            onClick={() => setBukaSaring((b) => !b)}
            aria-expanded={bukaSaring}
            aria-controls={idSaring}
            className={
              'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[14px] font-bold transition sm:hidden ' +
              (bukaSaring || n ? 'border-brand-ink text-brand-ink' : 'border-line text-ink-2 hover:border-line-strong')
            }
          >
            <IconFilter size={17} />
            {t('Filter')}
            {n ? (
              <>
                <span
                  aria-hidden="true"
                  className="grid h-5 min-w-[20px] place-items-center rounded-full isi-toska px-1.5 text-[11px] font-extrabold text-[var(--accent-on)]"
                >
                  {n}
                </span>
                <span className="sr-only">{t('{n} aktif', { n })}</span>
              </>
            ) : null}
          </button>
        </div>
        {/* Di sm ke atas pembungkus ini "contents": keempat pilihan langsung menjadi sel grid induknya. */}
        <div id={idSaring} className={(bukaSaring ? 'grid animate-rise' : 'hidden') + ' gap-2.5 sm:contents'}>
          <Select ringkas label={t('Fakultas')} value={value.faculty} onChange={set('faculty')} options={facultyOptions} tampilkan={tampilkan} />
          <Select ringkas label={t('Program studi')} value={value.program} onChange={set('program')} options={programOptions} tampilkan={tampilkan} />
          <Select
            ringkas
            label={t('Angkatan')}
            value={angkatanLabel}
            onChange={set('angkatan')}
            options={['Semua', ...COHORTS.map((c) => c.label)]}
            tampilkan={tampilkan}
          />
          <Select ringkas label={t('Semester')} value={value.semester} onChange={set('semester')} options={semesterOptions} tampilkan={tampilkan} />
        </div>
      </div>
    )
  }

  return (
    <div className={'card card-pad ' + className}>
      <div className={'grid gap-3 sm:grid-cols-2 ' + (withSearch ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
        <Select
          label={t('Fakultas')}
          value={value.faculty}
          onChange={set('faculty')}
          options={facultyOptions}
          tampilkan={tampilkan}
        />
        <Select
          label={t('Program studi')}
          value={value.program}
          onChange={set('program')}
          options={programOptions}
          tampilkan={tampilkan}
        />
        <Select
          label={t('Angkatan')}
          value={angkatanLabel}
          onChange={set('angkatan')}
          options={['Semua', ...COHORTS.map((c) => c.label)]}
          tampilkan={tampilkan}
        />
        <Select
          label={t('Semester')}
          value={value.semester}
          onChange={set('semester')}
          options={semesterOptions}
          tampilkan={tampilkan}
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
