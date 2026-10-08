import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ChartFrame from './ChartFrame'
import PilihanMengambang from '../PilihanMengambang'
import { CONFIG } from '../../lib/config'
import { COHORTS, transkripOf } from '../../lib/data'
import { useBahasa } from '../../lib/bahasa'

// Pilihan "Semester N" = mahasiswa yang sudah bernilai di Semester 1 sampai N. Tiap batang dihitung
// dari orang yang sama, jadi selisih antarbatang adalah perkembangan, bukan pergantian angkatan.

const TINGGI = 220
const GARIS = [0, 20, 40, 60, 80, 100]
const LENGKUNG = 'cubic-bezier(.22,.68,.35,1)'

const rata = (v) => v.reduce((a, b) => a + b, 0) / v.length
const tinggi = (nilai) => (nilai / 100) * TINGGI

function kelompokSampai(rows, n) {
  const anggota = rows.filter((s) => {
    const sem = transkripOf(s).semester
    for (let i = 1; i <= n; i++) if (sem[i]?.nilai == null) return false
    return true
  })
  if (!anggota.length) return null

  const ambang = CONFIG.AMBANG_SERTIFIKAT
  const batang = []
  for (let sem = 1; sem <= n; sem++) {
    const v = anggota.map((s) => transkripOf(s).semester[sem].nilai)
    const lolos = v.filter((x) => x >= ambang).length
    batang.push({
      sem,
      nilai: Math.round(rata(v)),
      diAtas: Math.round((lolos / v.length) * 100),
      jumlahDiAtas: lolos,
    })
  }

  // Angkatan tertua dulu, sama dengan urutan tabel.
  const perAngkatan = [...COHORTS]
    .reverse()
    .map((angkatan) => {
      const m = anggota.filter((s) => s.angkatanId === angkatan.id)
      if (!m.length) return null
      return {
        angkatan,
        jumlah: m.length,
        nilai: batang.map((b) => Math.round(rata(m.map((s) => transkripOf(s).semester[b.sem].nilai)))),
      }
    })
    .filter(Boolean)

  return { n, jumlah: anggota.length, batang, perAngkatan }
}

function ringkasSelisih(t, batang) {
  const d = batang[batang.length - 1].nilai - batang[0].nilai
  if (d === 0) return t('Tetap sejak Semester {n}', { n: 1 })
  return d > 0 ? t('Naik {d} sejak Semester {n}', { d, n: 1 }) : t('Turun {d} sejak Semester {n}', { d: -d, n: 1 })
}

function perubahan(t, batang, i) {
  if (i === 0) return null
  const lalu = batang[i - 1]
  const d = batang[i].nilai - lalu.nilai
  if (d === 0) return t('Sama dengan Semester {n}', { n: lalu.sem })
  return d > 0
    ? t('Naik {d} dari Semester {n}', { d, n: lalu.sem })
    : t('Turun {d} dari Semester {n}', { d: -d, n: lalu.sem })
}

// Jarak dari puncak batang ke tepi bawah tooltip: angka di atas batang ditambah celah.
const RUANG_ANGKA = 28

function Batang({ kelompok }) {
  const { t } = useBahasa()
  const ambang = CONFIG.AMBANG_SERTIFIKAT
  const wadah = useRef(null)
  const batangRef = useRef([])
  const tipRef = useRef(null)
  const jeda = useRef(0)
  const [arah, setArah] = useState(null)
  const [fokus, setFokus] = useState(null)
  const [diam, setDiam] = useState(false)
  const [posisi, setPosisi] = useState(null)

  const aktif = diam ? null : (arah ?? fokus)
  const b = aktif != null ? kelompok.batang[aktif] : null

  const tunjuk = (i) => {
    clearTimeout(jeda.current)
    setDiam(false)
    setArah(i)
  }
  // Jeda singkat sebelum hilang, supaya tetikus sempat pindah ke tooltip tanpa ia lenyap.
  const lepas = () => {
    clearTimeout(jeda.current)
    jeda.current = setTimeout(() => setArah(null), 150)
  }
  useEffect(() => () => clearTimeout(jeda.current), [])

  // Escape menyembunyikan tooltip tanpa memindahkan fokus atau tetikus.
  useEffect(() => {
    if (aktif == null) return undefined
    const tekan = (e) => e.key === 'Escape' && setDiam(true)
    document.addEventListener('keydown', tekan)
    return () => document.removeEventListener('keydown', tekan)
  }, [aktif])

  // Di atas batangnya, digeser ke dalam kartu bila menabrak tepi. Diukur sebelum dilukis.
  useLayoutEffect(() => {
    if (aktif == null) {
      setPosisi(null)
      return
    }
    const w = wadah.current.getBoundingClientRect()
    const bt = batangRef.current[aktif].getBoundingClientRect()
    const tip = tipRef.current.getBoundingClientRect()
    const kiri = Math.min(Math.max(bt.left + bt.width / 2 - tip.width / 2 - w.left, 0), Math.max(0, w.width - tip.width))
    const atas = bt.top - w.top - RUANG_ANGKA - tip.height
    // Pindah antarbatang meluncur; kemunculan pertama langsung di tempat.
    setPosisi((lama) => ({ kiri, atas, geser: lama != null }))
  }, [aktif, kelompok])

  const kalimat = (x, i) =>
    [
      t('Semester {n}', { n: x.sem }) + ': ' + x.nilai,
      perubahan(t, kelompok.batang, i),
      t('{a} dari {b} mahasiswa di atas rata-rata minimal {n}', { a: x.jumlahDiAtas, b: kelompok.jumlah, n: ambang }),
    ]
      .filter(Boolean)
      .join('. ')

  return (
    <div ref={wadah} className="relative min-w-0">
      <p className="text-[12px] font-semibold text-ink-2">{t('Nilai rata-rata')}</p>

      <div className="mt-3 flex">
        <div aria-hidden="true" className="relative w-9 shrink-0" style={{ height: TINGGI }}>
          {GARIS.map((v) => (
            <span
              key={v}
              className="absolute right-2 translate-y-1/2 text-[11px] leading-none tabular-nums text-ink-2"
              style={{ bottom: tinggi(v) }}
            >
              {v}
            </span>
          ))}
          <span
            className="absolute right-2 translate-y-1/2 text-[11px] font-bold leading-none tabular-nums text-ink"
            style={{ bottom: tinggi(ambang) }}
          >
            {ambang}
          </span>
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: TINGGI }}>
          {GARIS.map((v) => (
            <span
              key={v}
              aria-hidden="true"
              className={'absolute inset-x-0 border-t ' + (v === 0 ? 'border-line-strong' : 'border-line')}
              style={{ bottom: tinggi(v) }}
            />
          ))}
          {/* Putus-putus hanya untuk ambang, supaya tidak terbaca sebagai garis bantu. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-ink-2"
            style={{ bottom: tinggi(ambang) }}
          />

          <div role="list" aria-label={t('Nilai rata-rata')} className="absolute inset-0 flex">
            {kelompok.batang.map((x, i) => (
              // Seluruh kolom jadi area tunjuk, bukan hanya batang selebar 40px.
              <div
                key={x.sem}
                role="listitem"
                tabIndex={0}
                aria-label={kalimat(x, i)}
                onPointerEnter={() => tunjuk(i)}
                onPointerLeave={lepas}
                onFocus={() => {
                  setDiam(false)
                  setFokus(i)
                }}
                onBlur={() => setFokus((f) => (f === i ? null : f))}
                // focus-visible:outline-none, bukan outline-none: aturan *:focus-visible global ditulis
                // sesudah utilitas Tailwind, jadi hanya varian yang lebih spesifik yang menang.
                className="group flex h-full flex-1 cursor-default flex-col items-center justify-end focus-visible:outline-none"
              >
                {/* Berlatar kartu supaya garis bantu tidak mencoret angkanya. */}
                <span className="mb-1.5 bg-surface px-1 text-[13px] font-bold leading-none text-ink">
                  {x.nilai}
                </span>
                {/* Cincin di batang menggantikan garis fokus kolom: kolomnya setinggi grafik, batangnyalah yang dibaca. */}
                <span
                  ref={(el) => {
                    batangRef.current[i] = el
                  }}
                  className={
                    'block w-8 rounded-t-[4px] group-focus-visible:ring-2 group-focus-visible:ring-brand-ink group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-surface sm:w-10 ' +
                    (i === aktif ? 'brightness-110' : '')
                  }
                  style={{
                    height: tinggi(x.nilai),
                    background: 'var(--semester-' + x.sem + ', var(--brand-ink))',
                    transition: 'height .32s ' + LENGKUNG + ', filter .15s ' + LENGKUNG,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="ml-9 mt-2 flex">
        {kelompok.batang.map((x) => (
          <span key={x.sem} className="flex-1 whitespace-nowrap text-center text-[12px] text-ink-2">
            {t('Semester {n}', { n: x.sem })}
          </span>
        ))}
      </div>

      {/* Isinya sama dengan aria-label kolom, jadi disembunyikan dari pembaca layar. */}
      {b ? (
        <div
          ref={tipRef}
          aria-hidden="true"
          onPointerEnter={() => clearTimeout(jeda.current)}
          onPointerLeave={lepas}
          // Di layar sentuh tooltip tembus ketukan: ia bisa menutupi tombol dropdown, dan singgah di
          // atasnya hanya berguna bagi tetikus.
          className="absolute z-20 w-[216px] rounded-xl border border-line bg-surface px-3.5 py-3 shadow-pop animate-tip [@media(hover:none)]:pointer-events-none"
          style={{
            left: posisi?.kiri ?? 0,
            top: posisi?.atas ?? 0,
            visibility: posisi ? 'visible' : 'hidden',
            transition: posisi?.geser ? 'left .18s ' + LENGKUNG + ', top .18s ' + LENGKUNG : 'none',
          }}
        >
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
            <span
              className="h-[3px] w-3 shrink-0 rounded-full"
              style={{ background: 'var(--semester-' + b.sem + ', var(--brand-ink))' }}
            />
            {t('Semester {n}', { n: b.sem })}
          </p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-extrabold leading-none text-ink">{b.nilai}</span>
            <span className="text-[12px] text-ink-2">{t('rata-rata')}</span>
          </p>
          {perubahan(t, kelompok.batang, aktif) ? (
            <p className="mt-2 text-[12px] font-bold text-ink">{perubahan(t, kelompok.batang, aktif)}</p>
          ) : null}
          <p className="mt-1 text-[12px] leading-snug text-ink-2">
            {t('{a} dari {b} mahasiswa di atas rata-rata minimal {n}', {
              a: b.jumlahDiAtas,
              b: kelompok.jumlah,
              n: ambang,
            })}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function Penjelasan({ kelompok }) {
  const { t, bahasa } = useBahasa()
  const ambang = CONFIG.AMBANG_SERTIFIKAT
  const daftar = new Intl.ListFormat(bahasa === 'en' ? 'en' : 'id', { type: 'conjunction' }).format(
    kelompok.perAngkatan.map((p) => p.angkatan.label),
  )

  return (
    <div className="lg:border-l lg:border-line lg:pl-6">
      {kelompok.n > 1 ? (
        <>
          <p className="text-[12.5px] font-semibold text-ink-2">{t('Semester 1 sampai {n}', { n: kelompok.n })}</p>
          <p className="mt-1 text-[22px] font-extrabold leading-tight text-ink">
            {ringkasSelisih(t, kelompok.batang)}
          </p>
        </>
      ) : (
        <p className="text-[14px] leading-snug text-ink-2">{t('Baru satu semester, belum ada pembanding')}</p>
      )}

      <dl className="mt-4 space-y-3 border-t border-line pt-4 text-[13px] leading-snug">
        <div>
          <dt className="text-ink-2">{t('Mahasiswa')}</dt>
          <dd className="mt-0.5 font-bold text-ink">
            {t('{n} mahasiswa', { n: kelompok.jumlah })}, {t('angkatan {daftar}', { daftar })}
          </dd>
        </div>
        <div>
          {/* Nama isian tanpa tanda hubung: { rata-rata: ... } dibaca "rata dikurangi rata" dan
              menggagalkan kompilasi, sedangkan {rata-rata} tidak pernah terisi oleh penerjemah. */}
          <dt className="text-ink-2">{t('Di atas rata-rata minimal {n}', { n: ambang })}</dt>
          <dd className="mt-0.5 font-bold tabular-nums text-ink">
            {kelompok.batang.map((b) => b.diAtas + '%').join(' → ')}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default function PerkembanganAngkatan({ rows }) {
  const { t } = useBahasa()

  const kelompok = useMemo(() => {
    const hasil = {}
    for (let n = 1; n <= CONFIG.TOTAL_SEMESTER_PROGRAM; n++) {
      const k = kelompokSampai(rows, n)
      if (k) hasil[n] = k
    }
    return hasil
  }, [rows])

  const pilihan = Object.keys(kelompok).map(Number)
  const [sampai, setSampai] = useState(null)
  // Bawaan: semester terjauh yang sudah ada datanya, karena itulah yang menjawab "naik atau tidak".
  const n = sampai != null && kelompok[sampai] ? sampai : pilihan[pilihan.length - 1]
  const aktif = n != null ? kelompok[n] : null

  // Kunci mentah: ChartFrame yang menerjemahkan kepala dan isi tabel.
  const tabel = aktif
    ? {
        head: ['Angkatan', 'Mahasiswa', ...aktif.batang.map((b) => 'Semester ' + b.sem), ...(aktif.n > 1 ? ['Selisih'] : [])],
        rows: [
          ...aktif.perAngkatan.map((p) => [p.angkatan.label, p.jumlah, ...p.nilai, ...selisihSel(aktif, p.nilai)]),
          ['Gabungan', aktif.jumlah, ...aktif.batang.map((b) => b.nilai), ...selisihSel(aktif, aktif.batang.map((b) => b.nilai))],
        ],
      }
    : null

  return (
    <ChartFrame
      title="Perkembangan nilai per semester"
      subtitle="Pilih sampai semester berapa yang ingin dilihat. Batang hanya menghitung mahasiswa yang sudah punya nilai di semua semester yang tampil."
      table={tabel}
      height={280}
      action={
        aktif ? (
          <PilihanMengambang
            label={t('Semester {n}', { n })}
            namaDaftar={t('Tampilkan sampai semester')}
            nilai={n}
            onPilih={setSampai}
            pilihan={pilihan.map((s) => ({
              nilai: s,
              label: t('Semester {n}', { n: s }),
              keterangan: t('{n} mahasiswa', { n: kelompok[s].jumlah }),
            }))}
          />
        ) : null
      }
    >
      {aktif ? (
        <div className="grid gap-6 px-3 pb-1 pt-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Batang kelompok={aktif} />
          <Penjelasan kelompok={aktif} />
        </div>
      ) : (
        // Kosong berarti belum ada nilai yang masuk, bukan galat.
        <p className="px-3 py-6 text-[13px] leading-relaxed text-ink-2">
          {t('Belum ada nilai semester yang masuk, jadi perkembangan belum bisa dihitung. Masukkan nilai lewat halaman Input & Import Nilai, atau setujui usulan nilai dari dosen.')}
        </p>
      )}
    </ChartFrame>
  )
}

function selisihSel(aktif, nilai) {
  if (aktif.n < 2) return []
  const d = nilai[nilai.length - 1] - nilai[0]
  return [(d > 0 ? '+' : '') + d]
}
