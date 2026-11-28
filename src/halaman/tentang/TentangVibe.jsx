import LogoVibe from '../../components/kerangka/LogoVibe'
import { useBahasa } from '../../lib/bahasa'

const HURUF = [
  { huruf: 'V', kata: 'Values', arti: 'Nilai-nilai', 
    makna: { 
      id: 'Nilai-nilai yang menjadi dasar dalam bertindak dan berperilaku.', 
      en: 'Values that serve as the foundation for action and behavior.' } },
  { huruf: 'I', kata: 'Intelligence', arti: 'Kecerdasan', 
    makna: { 
      id: 'Kemampuan untuk belajar, berpikir kritis, dan menyelesaikan masalah.', 
      en: 'The ability to learn, think critically, and solve problems.' } },
  { huruf: 'B', kata: 'Behavior', arti: 'Perilaku', 
    makna: { 
      id: 'Tindakan dan sikap yang ditunjukkan dalam situasi tertentu.', 
      en: 'Actions and attitudes displayed in specific situations.' } },
  { huruf: 'E', kata: 'Excellence', arti: 'Keunggulan', 
    makna: { 
      id: 'Pencapaian tingkat tinggi dalam segala aspek kehidupan.', 
      en: 'Achievement of a high level in all aspects of life.' } },
]

const MAKNA_LOGO = [
  {
    bagian: { id: 'Huruf V dan B', en: 'The letters V and B' },
    makna: {
      id: 'Desain ini menggabungkan keempat huruf VIBE menjadi dua. Keempatnya dipasangkan menjadi VI dan BE, lalu tiap pasangan diwakili huruf pertamanya: V untuk Values dan Intelligence, B untuk Behavior dan Excellence. Kalau diperhatikan, garis kanan huruf V terus naik dan melengkung menjadi huruf B, sehingga keduanya tersambung dalam satu tarikan pita. Sambungan ini menggambarkan nilai dan kecerdasan yang terwujud dalam perilaku hingga berbuah keunggulan.',
      en: 'This Design combines the four letters of VIBE into two. They are paired as VI and BE, and each pair is represented by its first letter: V for Values and Intelligence, B for Behavior and Excellence. Look closely and you will see the right stroke of the V keep rising and curl into the B, so both letters are joined in one sweep of the ribbon. The link stands for values and intelligence that show in behavior and grow into excellence.',
    },
  },
  { 
    bagian: { id: 'Bentuk pita', en: 'The ribbon' }, 
    makna: { 
      id: 'Seperti pita yang lentur, softskill perlu terus menyesuaikan diri tanpa melepas nilai yang dipegang.', 
      en: 'Like a flexible ribbon, soft skills keep adapting without letting go of the values behind them.' } },
  { 
    bagian: { id: 'Gradasi toska', en: 'The teal gradient' }, 
    makna: { 
      id: 'Gradasi warna toska dalam desain ini melambangkan keseimbangan antara emosi dan rasionalitas.', 
      en: 'The teal gradient in the design represents the balance between emotions and rationality.' } },
]

const BERKAS_INI = 'src/halaman/tentang/TentangVibe.jsx'
const pilih = (isi, bahasa) => ((bahasa === 'en' && isi.en?.trim()) || isi.id || '').trim()
const PENGEMBANGAN = process.env.NODE_ENV !== 'production'

function Makna({ isi, nama, daftar }) {
  const { bahasa } = useBahasa()
  const teks = pilih(isi, bahasa)
  if (teks) return <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{teks}</p>
  if (!PENGEMBANGAN) return null
  return (
    <div className="slot-makna mt-2 rounded-xl border border-dashed border-line-strong px-3.5 py-2.5 text-[13px] leading-snug text-ink-2">
      <p className="font-bold text-ink">Makna {nama} belum diisi</p>
    </div>
  )
}

export default function TentangVibe() {
  const { bahasa, t } = useBahasa()
  const butirLogo = MAKNA_LOGO.filter((b) => PENGEMBANGAN || pilih(b.makna, bahasa))

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">{t('Tentang VIBE')}</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {t(
            'VIBE merupakan sistem penilaian yang dirancang untuk mengevaluasi dan mengembangkan kemampuan interpersonal, keterampilan teknis, dan kompetensi lainnya pada mahasiswa Universitas Multimedia Nusantara.',
          )}
        </p>
      </header>

      {/* ----------------------------- tiap huruf ---------------------------- */}
      <section aria-labelledby="judul-makna-nama" className="kartu px-6 py-5 sm:px-7 sm:py-6">
        <h2 id="judul-makna-nama" className="text-[17px] font-extrabold text-ink">
          {t('Makna nama VIBE')}
        </h2>
        <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">
          {t('Nama VIBE diambil dari huruf pertama empat kata dalam bahasa Inggris.')}
        </p>

        <ol className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-0 xl:divide-x xl:divide-line">
          {HURUF.map((h) => (
            <li key={h.huruf} className="min-w-0 xl:px-6 xl:first:pl-0 xl:last:pr-0">
              <span
                aria-hidden="true"
                className="teks-vibe teks-vibe-terang block w-fit text-[60px] font-extrabold leading-[0.9] tracking-tight text-[var(--accent-ink)]"
              >
                {h.huruf}
              </span>
              <h3 className="mt-3 text-[19px] font-extrabold leading-tight tracking-tight text-ink">{h.kata}</h3>
              {bahasa === 'en' ? null : <p className="mt-0.5 text-[14px] font-semibold text-ink-2">{h.arti}</p>}
              <Makna isi={h.makna} nama={'huruf ' + h.huruf} daftar="HURUF" />
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------- logo ------------------------------- */}
      <section aria-labelledby="judul-logo" className="kartu px-6 py-5 sm:px-7 sm:py-6">
        <h2 id="judul-logo" className="text-[17px] font-extrabold text-ink">
          {t('Logo VIBE')}
        </h2>
        <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">
          {t('Monogram huruf V dan B berbentuk pita bergradasi toska.')}
        </p>

        <div className={'mt-5 grid items-start gap-6 ' + (butirLogo.length ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8' : '')}>
          <div className="grid aspect-[16/10] w-full max-w-[520px] place-items-center rounded-2xl border border-transparent bg-brand-deep dark:border-line">
            <LogoVibe alt={t('Logo VIBE')} className="h-auto w-[56%] max-w-[300px]" />
          </div>

          {butirLogo.length ? (
            <div className="min-w-0">
              <h3 className="text-[14.5px] font-bold text-ink">{t('Makna logo')}</h3>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {butirLogo.map((b) => (
                  <li key={b.bagian.id} className="py-3.5">
                    <p className="text-[15px] font-bold text-ink">{pilih(b.bagian, bahasa)}</p>
                    <Makna isi={b.makna} nama={b.bagian.id.charAt(0).toLowerCase() + b.bagian.id.slice(1)} daftar="MAKNA_LOGO" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
