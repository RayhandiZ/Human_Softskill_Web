import { IconLogo } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { hurufMutu } from '../../lib/scoring'
import { useBahasa } from '../../lib/bahasa'

const nomorSertifikat = (student) =>
  'SRT/' + student.angkatanId + '/' + student.nim.slice(-5) + '/' + new Date().getFullYear()

// Dipakai halaman sertifikat mahasiswa dan detail mahasiswa di panel admin, jadi hasil cetaknya sama.
export default function LembarSertifikat({ student, transkrip: t }) {
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
