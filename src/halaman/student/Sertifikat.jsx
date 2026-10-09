import { IconCheck, IconPrint, IconX } from '../../components/Icons'
import { PredikatTeks, StatusTeks } from '../../components/Ui'
import { kelayakanSertifikat } from '../../lib/rules'
import { hurufMutu } from '../../lib/scoring'
import { useStore } from '../../lib/store'
import { useBahasa } from '../../lib/bahasa'
import { useStudent } from './StudentLayout'
import LembarSertifikat from './LembarSertifikat'

export default function Sertifikat() {
  useStore()
  const { t: teks } = useBahasa()
  const student = useStudent()
  const k = kelayakanSertifikat(student)
  const t = k.transkrip

  return (
    <>
      {/* Tidak dirender selama belum layak, jadi Ctrl+P tidak pernah menghasilkan sertifikat. */}
      {k.layak ? <LembarSertifikat student={student} transkrip={t} /> : null}

      <div className="space-y-6 print:hidden">
        <section className="kartu px-6 py-6 sm:px-7">
          <p className="text-[13px] font-semibold text-ink-2">{teks('Sertifikat')}</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">
            {teks('Sertifikat Pembinaan human skill 5C')}
          </h1>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-ink">
                {k.layak
                  ? teks('Semua syarat terpenuhi. Sertifikat siap dicetak.')
                  : teks('{n} dari {total} syarat belum terpenuhi.', {
                      n: k.gagal.length,
                      total: k.syarat.length,
                    })}
              </p>
              <p id="alasan-cetak" className="mt-1 text-[13px] text-ink-2">
                {k.layak
                  ? teks('Nilai akhir {nilai}, predikat {huruf}.', {
                      nilai: t.akhir.nilai,
                      huruf: hurufMutu(t.akhir.nilai)?.huruf,
                    })
                  : teks('Tombol cetak aktif setelah seluruh syarat di bawah terpenuhi, tanpa terlewat satu pun.')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={!k.layak}
              aria-describedby="alasan-cetak"
              className="btn-primary inline-flex min-h-[44px] items-center gap-2 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-2 disabled:shadow-none"
            >
              <IconPrint size={17} />
              {teks('Cetak sertifikat')}
            </button>
          </div>
        </section>

        <section className="kartu px-6 py-5 sm:px-7">
          <h2 className="text-[17px] font-extrabold text-ink">{teks('Syarat kelayakan')}</h2>
          <ul className="mt-3 divide-y divide-line">
            {k.syarat.map((s) => (
              <li key={s.id} className="flex items-start gap-3 py-3.5">
                <span className="mt-0.5 text-ink-2">{s.lolos ? <IconCheck size={18} /> : <IconX size={18} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">{teks(s.label)}</p>
                  {!s.lolos && s.alasan ? (
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{teks(s.alasan)}</p>
                  ) : null}
                </div>
                <StatusTeks kuat={!s.lolos}>{teks(s.lolos ? 'Terpenuhi' : 'Belum terpenuhi')}</StatusTeks>
              </li>
            ))}
          </ul>
        </section> 
      </div>
    </>
  )
}
