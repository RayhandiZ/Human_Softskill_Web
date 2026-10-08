import { IconCheck, IconLogo, IconPrint, IconX } from '../../components/Icons'
import { PredikatTeks, StatusTeks } from '../../components/Ui'
import { CONFIG } from '../../lib/config'
import { kelayakanSertifikat } from '../../lib/rules'
import { hurufMutu } from '../../lib/scoring'
import { useStore } from '../../lib/store'
import { useBahasa } from '../../lib/bahasa'
import { useStudent } from './StudentLayout'

const nomorSertifikat = (student) =>
  'SRT/' + student.angkatanId + '/' + student.nim.slice(-5) + '/' + new Date().getFullYear()

// Lembar A4 lanskap yang hanya ada di kertas. Tidak dirender sama sekali selama belum layak,
// jadi Ctrl+P pada mahasiswa yang belum layak tidak pernah menghasilkan sertifikat.
function LembarSertifikat({ student, transkrip: t }) {
  const { t: teks, bahasa } = useBahasa()
  const tanggal = new Date().toLocaleDateString(bahasa === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const mutu = hurufMutu(t.akhir.nilai)

  return (
    <section className="lembar-sertifikat hidden bg-white text-black print:block">
      <div className="flex h-full flex-col items-center border-[3px] border-double border-black px-16 py-10 text-center">
        <div className="flex items-center gap-3">
          <IconLogo size={46} />
          <p className="text-left text-[11px] font-bold leading-tight tracking-[.12em]">
            UNIVERSITAS
            <br />
            MULTIMEDIA NUSANTARA
          </p>
        </div>

        <h1 className="mt-8 text-[40px] font-extrabold uppercase tracking-[.2em]">{teks('Sertifikat')}</h1>
        <p className="mt-1 text-[14px]">{teks('Program Pembinaan Softskill 5C')}</p>

        <p className="mt-8 text-[13px]">{teks('diberikan kepada')}</p>
        <p className="mt-2 text-[30px] font-bold">{student.name}</p>
        <p className="mt-1 text-[12.5px]">
          {teks('NIM')} {student.nim} · {student.program} · {student.faculty}
        </p>

        <p className="mt-6 max-w-[620px] text-[13.5px] leading-relaxed">
          {teks(
            'atas keberhasilannya menyelesaikan seluruh {n} aspek CPMK, Semester 1 sampai {total}, dengan nilai akhir {nilai} dan predikat {huruf} ({label}).',
            {
              n: t.akhir.aspekTotal,
              total: CONFIG.TOTAL_SEMESTER_PROGRAM,
              nilai: t.akhir.nilai,
              huruf: mutu?.huruf,
              label: teks(mutu?.label ?? ''),
            },
          )}
        </p>

        <div className="mt-auto flex w-full items-end justify-between pt-10 text-[12px]">
          <p className="text-left">
            {teks('Nomor')}: {nomorSertifikat(student)}
          </p>
          <div className="text-center">
            <p>{'Tangerang, ' + tanggal}</p>
            <div className="mt-14 w-[240px] border-t border-black pt-1">{teks('Head of Department')}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Sertifikat() {
  useStore()
  const { t: teks } = useBahasa()
  const student = useStudent()
  const k = kelayakanSertifikat(student)
  const t = k.transkrip

  return (
    <>
      {k.layak ? <LembarSertifikat student={student} transkrip={t} /> : null}

      <div className="space-y-6 print:hidden">
        <section className="kartu px-6 py-6 sm:px-7">
          <p className="text-[13px] font-semibold text-ink-2">{teks('Sertifikat')}</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">
            {teks('Sertifikat Pembinaan Softskill 5C')}
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

            {/* disabled sungguhan, bukan hanya tampak pudar: tidak bisa diklik maupun dipicu papan ketik. */}
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
