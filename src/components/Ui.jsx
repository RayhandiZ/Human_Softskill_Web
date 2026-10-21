import { useId, useRef } from 'react'
import { IconChevronDown, IconInfo, IconLock, IconSearch } from './Icons'
import { useTeks } from '../lib/bahasa'
import { hurufMutu } from '../lib/scoring'

/* ------------------------------- kartu dasar ------------------------------ */

export function Card({ className = '', children, ...rest }) {
  return (
    <section className={'card ' + className} {...rest}>
      {children}
    </section>
  )
}

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    // flex-wrap: aksi yang lebar (misalnya Tabs) turun ke bawah judul di layar sempit, bukan mendorong kartu
    // keluar layar (dulu Persetujuan Nilai Dosen melebar ke 457px di HP).
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-line px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <Icon size={18} />
          </span>
        ) : null}
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-snug text-ink-2">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function SectionTitle({ children, hint }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-lg font-extrabold tracking-tight text-ink">{children}</h2>
      {hint ? <span className="text-[13px] text-ink-3">{hint}</span> : null}
    </div>
  )
}

/* --------------------------- pola halaman Kemahasiswaan --------------------------- */
/* Dipakai seluruh halaman panel Kemahasiswaan supaya kepala halaman, tab penyaring, judul kolom, dan kaki daftar
   bernomor halaman sama rupa di mana pun; lihat README.md › Panel Kemahasiswaan › Tampilan. */

/** Kepala halaman: judul 26px, keterangan, dan tindakan di kanan yang turun ke bawah di layar sempit. */
export function JudulHalaman({ judul, keterangan, aksi = null, children = null }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">{judul}</h1>
        {keterangan ? <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">{keterangan}</p> : null}
        {children}
      </div>
      {aksi ? <div className="flex flex-wrap items-center gap-2">{aksi}</div> : null}
    </header>
  )
}

/**
 * Kartu satu angka utama: judul, angka besar dengan satuannya, lalu (bila ada) satu persentase dengan bilah tipis
 * yang tumbuh saat tampil. Semua teks datang sudah diterjemahkan oleh pemanggil; komponen ini tidak memanggil t()
 * supaya kalimat berisian tidak diterjemahkan dua kali. `kaki` untuk isi tambahan di dasar kartu.
 */
export function KartuAngka({ nilai, satuan, judul, keterangan, persen, persenLabel, kaki }) {
  return (
    <Card className="px-6 py-6">
      <p className="text-[15px] font-semibold text-ink-2">{judul}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[42px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{nilai}</span>
        {satuan ? <span className="text-[17px] font-semibold text-ink-2">{satuan}</span> : null}
      </p>

      {typeof persen === 'number' ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14px] text-ink-2">{persenLabel}</span>
            <span className="text-[17px] font-extrabold tabular-nums text-ink">{persen}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--grid)]">
            <div
              className="bilah-tumbuh h-full rounded-full bg-brand-ink"
              style={{ width: Math.max(2, Math.min(100, persen)) + '%' }}
            />
          </div>
        </div>
      ) : null}

      {keterangan ? <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{keterangan}</p> : null}

      {kaki}
    </Card>
  )
}

/** Judul kolom tabel: huruf biasa 12,5px tebal, bukan huruf kapital kecil 11px. Perataan ditambah pemakainya. */
export const JUDUL_KOLOM = 'px-3 py-3 text-[12.5px] font-bold text-ink-2 whitespace-nowrap'

/**
 * Tab penyaring daftar di kepala kartu: bergaris bawah, masing-masing dengan jumlahnya, jadi isi tiap kelompok
 * terbaca tanpa harus dipilih. Di baliknya radio: Tab masuk sekali, panah memindah pilihan. `kanan` untuk tombol
 * di ujung kanan (misalnya Atur ulang filter).
 */
export function TabSaring({ label, nilai, onPilih, pilihan, kanan = null }) {
  const nama = useId()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-line px-4 sm:px-5">
      <div role="radiogroup" aria-label={label} className="-mb-px flex gap-4 overflow-x-auto sm:gap-5">
        {pilihan.map((p) => {
          const aktif = nilai === p.nilai
          return (
            <label key={p.nilai} className="relative shrink-0 cursor-pointer">
              <input
                type="radio"
                name={nama}
                value={p.nilai}
                checked={aktif}
                onChange={() => onPilih(p.nilai)}
                className="peer sr-only"
              />
              {/* Garis bawah tumbuh dari tengah saat dipilih (after: + scale-x). */}
              <span
                className={
                  'relative flex items-center gap-1.5 whitespace-nowrap rounded-t-md pb-3.5 pt-3.5 text-[14px] font-bold transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-ink after:transition-transform after:duration-200 after:ease-out sm:gap-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[-2px] peer-focus-visible:outline-brand-ink ' +
                  (aktif ? 'text-brand-ink after:scale-x-100' : 'text-ink-2 hover:text-ink after:scale-x-0')
                }
              >
                {p.label}
                {p.n != null ? (
                  <span
                    className={
                      'min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[12px] font-bold tabular-nums ' +
                      (aktif ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink-2')
                    }
                  >
                    {Number(p.n).toLocaleString('id-ID')}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
      {kanan}
    </div>
  )
}

/**
 * Kaki daftar bernomor halaman: "Menampilkan a–b dari n", pilihan baris per halaman (bila `pilihanUkuran`), lalu
 * Sebelumnya, nomor halaman, dan Berikutnya yang selalu sebaris (di HP ketiganya turun bersama).
 */
export function Paginasi({ halaman, jumlahHalaman, total, ukuran, onHalaman, pilihanUkuran = null, onUkuran }) {
  const t = useTeks()
  const dari = total ? (halaman - 1) * ukuran + 1 : 0
  const sampai = Math.min(halaman * ukuran, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <p className="text-[13.5px] text-ink-2">
        {t('Menampilkan')}{' '}
        <strong className="tabular-nums text-ink">
          {dari}–{sampai}
        </strong>{' '}
        {t('dari')} <strong className="tabular-nums text-ink">{total.toLocaleString('id-ID')}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {pilihanUkuran ? (
          <Select
            ringkas
            label={t('Baris per halaman')}
            value={String(ukuran)}
            onChange={(v) => onUkuran(Number(v))}
            options={pilihanUkuran.map(String)}
          />
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-[13.5px]"
            disabled={halaman <= 1}
            onClick={() => onHalaman(halaman - 1)}
          >
            {t('Sebelumnya')}
          </button>
          <span className="min-w-[52px] text-center text-[13.5px] font-bold tabular-nums text-ink">
            {halaman} / {jumlahHalaman}
          </span>
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-[13.5px]"
            disabled={halaman >= jumlahHalaman}
            onClick={() => onHalaman(halaman + 1)}
          >
            {t('Berikutnya')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Wadah tabel yang bisa digulir ke samping. Tiga hal yang dulu diulang (dan terlupa) di setiap tabel:
 * - relative: label sr-only (position absolute) di dalam tabel tidak keluar dari wadah. Tanpa ini halaman HP
 *   melebar (Data Mahasiswa 1110px, Cetak Sertifikat 809px, Log Aktivitas 680px);
 * - scroll-padding: unsur yang difokus tidak berhenti tepat di tepi wadah dengan cincin fokus terpotong;
 * - saat sesuatu di dalamnya mendapat fokus, wadah digulir sampai unsur itu terlihat utuh. Chrome tidak
 *   menggulir wadah untuk unsur yang sudah terlihat sebagian, jadi tautan yang separuhnya tersembunyi di tepi
 *   tetap terpotong. 'nearest' tidak menggeser apa pun bila unsurnya sudah terlihat (misalnya saat diklik).
 * `jarak`: kelas scroll-padding pengganti, misalnya untuk kolom yang menempel di kanan.
 */
export function GulirTabel({ className = '', jarak = 'scroll-px-4', children, ...rest }) {
  return (
    // focus-visible:outline-offset ke dalam: Chrome menjadikan wadah gulir tanpa isi yang bisa difokus sebagai
    // tempat berhenti Tab sendiri, dan cincin bawaannya (offset 2px ke luar) terpotong kartu overflow-hidden.
    <div
      className={'relative overflow-x-auto focus-visible:outline-offset-[-2px] ' + jarak + ' ' + className}
      onFocus={(e) => {
        if (e.target !== e.currentTarget) e.target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

/* ---------------------------------- label --------------------------------- */

/* Tulisan good/warning/critical memakai --teks-baik/--teks-tunggu/--teks-kritis bila panelnya mendefinisikannya
   (panel Kemahasiswaan dan super admin; lihat index.css › panel super admin): warna asalnya hanya 2,85:1,
   2,8:1, dan 3,94:1 di latar lencananya sendiri. Panel lain jatuh ke warna asal lewat cadangan var(). */
const TONES = {
  good: 'bg-[color-mix(in_srgb,var(--good)_14%,transparent)] text-[color:var(--teks-baik,var(--good))]',
  warning:
    'bg-[color-mix(in_srgb,var(--warning)_20%,transparent)] text-[color:var(--teks-tunggu,color-mix(in_srgb,var(--warning)_72%,var(--text-primary)))]',
  critical: 'bg-[color-mix(in_srgb,var(--critical)_14%,transparent)] text-[color:var(--teks-kritis,var(--critical))]',
  serious: 'bg-[color-mix(in_srgb,var(--serious)_18%,transparent)] text-[color-mix(in_srgb,var(--serious)_75%,var(--text-primary))]',
  brand: 'bg-brand-soft text-brand-ink',
  neutral: 'bg-surface-2 text-ink-2 border border-line',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-bold leading-none ' +
        TONES[tone] +
        ' ' +
        className
      }
    >
      {Icon ? <Icon size={13} /> : null}
      {children}
    </span>
  )
}

const TONE_HURUF = { A: 'good', B: 'brand', C: 'warning', D: 'serious' }

export function HurufBadge({ nilai, sementara = false, panjang = false }) {
  const t = useTeks()
  if (nilai == null) return <Badge tone="neutral">{t('Belum dinilai')}</Badge>
  const r = hurufMutu(nilai)
  const tone = r.huruf ? TONE_HURUF[r.huruf] : 'critical'
  return (
    <Badge tone={tone}>
      {r.huruf ? r.huruf : t('Belum Memenuhi')}
      {panjang && r.huruf ? ' · ' + t(r.label) : ''}
      {sementara ? ' · ' + t('sementara') : ''}
    </Badge>
  )
}

export function PredikatTeks({ nilai, panjang = false }) {
  const t = useTeks()
  if (nilai == null) return <span className="text-[13px] text-ink-2">{t('Belum dinilai')}</span>
  const r = hurufMutu(nilai)
  return (
    <span className="text-[14px] font-bold text-ink">
      {r.huruf ? r.huruf : t('Belum Memenuhi')}
      {panjang && r.huruf ? <span className="font-semibold text-ink-2">{' · ' + t(r.label)}</span> : null}
    </span>
  )
}

/* Status ditulis polos tanpa warna; lihat README.md › Warna dan kontras. */
export function StatusTeks({ kuat = false, className = '', children }) {
  return (
    <span
      className={
        'whitespace-nowrap text-[12.5px] ' +
        (kuat ? 'font-bold text-ink' : 'font-semibold text-ink-2') +
        ' ' +
        className
      }
    >
      {children}
    </span>
  )
}

/* Penanda skema belum final: merah dalam kurung, bukan pil; lihat README.md › Warna dan kontras. */
export function TandaDraft({ children, className = '' }) {
  return (
    <span
      className={
        'whitespace-nowrap text-[12px] font-bold text-[var(--critical)] ' + className
      }
    >
      ({children})
    </span>
  )
}

export function Terkunci({ semester, ringkas = false }) {
  const t = useTeks()
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3">
      <IconLock size={14} />
      {ringkas ? t('Terkunci') : t('Dibuka pada Semester {n}', { n: semester })}
    </span>
  )
}

export function CatatanKaki({ children, icon = true }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-ink-3">
      {icon ? <IconInfo size={13} className="mt-px shrink-0" /> : null}
      <span>{children}</span>
    </p>
  )
}

export function SegeraHadir({ judul, fase, children }) {
  const t = useTeks()
  return (
    <Card className="card-pad">
      <p className="label">{t('Fase {n}', { n: fase })}</p>
      <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-ink">{judul}</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">{children}</p>
    </Card>
  )
}

export function Pill({ color, children }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-2">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {children}
    </span>
  )
}

/* -------------------------------- statistik ------------------------------- */

export function StatTile({ label, value, unit, hint, icon: Icon, tone = 'brand', trend }) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <span className="label">{label}</span>
        {Icon ? (
          <span
            className={
              'grid h-8 w-8 place-items-center rounded-lg ' +
              (tone === 'brand' ? 'bg-brand-soft text-brand-ink' : TONES[tone])
            }
          >
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[30px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{value}</span>
        {unit ? <span className="text-sm font-bold text-ink-3">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-2 text-[13px] leading-snug text-ink-2">{hint}</p> : null}
      {trend ? (
        <p className="mt-2 text-[13px] font-semibold text-[var(--good)]">{trend}</p>
      ) : null}
    </div>
  )
}

export function ScoreBar({ value, color = 'var(--c1)', target, height = 10 }) {
  return (
    <div className="relative w-full overflow-hidden rounded-full bg-[var(--grid)]" style={{ height }}>
      <div
        className="bilah-tumbuh h-full rounded-full transition-[width] duration-500"
        style={{ width: Math.max(2, Math.min(100, value)) + '%', background: color }}
      />
      {typeof target === 'number' ? (
        <span
          className="absolute top-0 h-full w-[2px] bg-[var(--surface)] opacity-90"
          style={{ left: target + '%' }}
          title={'Target ' + target}
        />
      ) : null}
    </div>
  )
}

export function ScoreRing({ value, size = 132, stroke = 12, color = 'var(--brand-ink)', label = 'Nilai akhir' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash + ' ' + c}
          style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,.68,.35,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[34px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[.08em] text-ink-3">{label}</p>
      </div>
    </div>
  )
}

/* --------------------------------- kontrol -------------------------------- */

/**
 * tampilkan menerjemahkan label saja; nilai yang dikirim tetap kalimat aslinya.
 * Panah dipusatkan dengan inset-y-0 + my-auto, bukan translate: di panel Kemahasiswaan panah ini berputar saat
 * daftarnya terbuka (properti rotate), dan rotate yang digabung dengan translate memindahkan panah ke bawah.
 * Gerak dan rupa daftarnya ada di index.css › pilihan (select) panel Kemahasiswaan.
 */
export function Select({ label, value, onChange, options, className = '', tampilkan, ringkas = false }) {
  const tampil = tampilkan ?? ((x) => x)
  // Ringkas: label di dalam kotak, di kiri pilihannya, untuk baris alat di atas tabel.
  if (ringkas) {
    return (
      // Cincin fokus digambar di kotak (has-[:focus-visible]), sama rupa dengan cincin fokus global, dan cincin
      // milik <select> dimatikan. Dulu keduanya muncul: <select> cocok dengan :focus-visible bahkan saat diklik
      // mouse, dan cincinnya (offset 2px) menimpa ujung label, misalnya "Program stud|i".
      // pilihan-ringkas: daftar pilihannya menempel ke tepi kotak ini, bukan ke <select> yang mulai sesudah label.
      <label
        className={
          'pilihan-ringkas flex min-w-0 items-center rounded-xl border border-line bg-surface transition hover:border-line-strong focus-within:border-brand-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-ink ' +
          className
        }
      >
        <span className="shrink-0 whitespace-nowrap pl-3.5 text-[12.5px] font-semibold text-ink-2">{label}</span>
        <span className="relative min-w-0 flex-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-w-0 appearance-none truncate bg-transparent py-2.5 pl-2 pr-8 text-sm font-semibold text-ink focus-visible:outline-none"
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {tampil(o)}
              </option>
            ))}
          </select>
          <IconChevronDown size={16} className="pointer-events-none absolute inset-y-0 right-2.5 my-auto text-ink-3" />
        </span>
      </label>
    )
  }
  return (
    <label className={'block ' + className}>
      {label ? <span className="mb-1.5 block label">{label}</span> : null}
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-9 text-sm font-semibold text-ink transition hover:border-line-strong"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {tampil(o)}
            </option>
          ))}
        </select>
        <IconChevronDown size={16} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-ink-3" />
      </span>
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Cari…', className = '', label = '' }) {
  return (
    <label className={'relative block ' + className}>
      {/* Nama untuk pembaca layar bila kolom ini tidak punya label yang terlihat. */}
      {label ? <span className="sr-only">{label}</span> : null}
      <IconSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-3 transition hover:border-line-strong"
      />
    </label>
  )
}

/* Pola tab APG: hanya tab terpilih yang masuk urutan Tab; panah kiri/kanan, Home, dan End memindah pilihan
   sekaligus fokusnya. Dulu setiap tab adalah satu tempat berhenti Tab dan panah tidak berbuat apa-apa. */
export function Tabs({ items, value, onChange, label }) {
  const daftar = useRef(null)
  const pindah = (e, i) => {
    const n = items.length
    const ke =
      e.key === 'ArrowRight' ? (i + 1) % n
        : e.key === 'ArrowLeft' ? (i - 1 + n) % n
          : e.key === 'Home' ? 0
            : e.key === 'End' ? n - 1
              : null
    if (ke == null) return
    e.preventDefault()
    onChange(items[ke].value)
    daftar.current?.querySelectorAll('[role="tab"]')[ke]?.focus()
  }
  return (
    <div ref={daftar} role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
      {items.map((it, i) => {
        const active = it.value === value
        // Bila tidak ada yang cocok dengan value, tab pertama tetap bisa dicapai dengan Tab.
        const masuk = active || (i === 0 && !items.some((x) => x.value === value))
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={masuk ? 0 : -1}
            onKeyDown={(e) => pindah(e, i)}
            onClick={() => onChange(it.value)}
            className={
              'rounded-lg px-3.5 py-2 text-[13px] font-bold transition ' +
              (active ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink')
            }
          >
            {it.label}
            {it.count != null ? <span className="ml-1.5 text-ink-3 tabular-nums">{it.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function Avatar({ initials, size = 40, tone = 'brand', src = null, alt = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={
        'grid shrink-0 place-items-center rounded-full font-extrabold ' +
        (tone === 'brand' ? 'bg-brand-soft text-brand-ink' : 'bg-white/15 text-white')
      }
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-2">{children}</p> : null}
    </div>
  )
}
