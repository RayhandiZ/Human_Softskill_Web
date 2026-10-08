import { IconLogo } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { BELUM_MEMENUHI, RUBRIK, hurufMutu } from '../../lib/scoring'
import { useBahasa } from '../../lib/bahasa'

// Lembar resmi khusus kertas; lihat README.md › Cetak.

// Nilai yang belum ada ditulis "...", bukan 0 (R2).
const BELUM = '...'

function Baris({ label, isi }) {
  return (
    <>
      <span>{label}</span>
      <span>:</span>
      <span className="font-bold">{isi}</span>
    </>
  )
}

export default function LembarCetak({ student, transkrip: t }) {
  const { t: teks, bahasa } = useBahasa()
  const final = t.akhir.status === 'final'
  const tanggal = new Date().toLocaleDateString(bahasa === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const predikat = (nilai) => (nilai == null ? BELUM : (hurufMutu(nilai)?.huruf ?? teks('Belum Memenuhi')))
  const belumDinilai = t.akhir.aspekTotal - t.akhir.aspekDinilai

  return (
    <section
      // Latar belang ikut tercetak; tanpa ini peramban membuang warna latar.
      className="lembar-cetak hidden bg-white pb-16 font-mono text-[10.5px] leading-snug text-black [print-color-adjust:exact] print:block"
    >
      <header className="flex items-start justify-end gap-2">
        <div className="text-right">
          <p className="text-[18px] font-extrabold leading-none tracking-tight">UMN</p>
          <p className="mt-0.5 text-[6.5px] font-bold leading-tight tracking-[.08em]">
            UNIVERSITAS
            <br />
            MULTIMEDIA
            <br />
            NUSANTARA
          </p>
        </div>
        <IconLogo size={44} />
      </header>

      <h1 className="mt-2 text-center font-sans text-[22px] font-bold uppercase tracking-tight underline underline-offset-4">
        {teks(final ? 'Transkrip Softskill' : 'Transkrip Sementara')}
      </h1>
      <p className="mt-1 text-center font-sans text-[11px]">
        {teks('Program Pembinaan Softskill 5C, Semester 1 sampai {total}', { total: CONFIG.TOTAL_SEMESTER_PROGRAM })}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-x-10">
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-1">
          <Baris label={teks('Nama')} isi={student.name} />
          <Baris label={teks('NIM')} isi={student.nim} />
          <Baris label={teks('Fakultas')} isi={student.faculty} />
          <Baris label={teks('Program studi')} isi={student.program} />
        </div>
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-1 self-start">
          <Baris label={teks('Angkatan')} isi={student.angkatanLabel} />
          <Baris
            label={teks('Semester berjalan')}
            isi={teks('{n} dari {total}', { n: student.semesterAktif, total: CONFIG.TOTAL_SEMESTER_PROGRAM })}
          />
        </div>
      </div>

      <table className="mt-4 w-full border-collapse border border-black">
        <thead>
          <tr className="bg-[#d9d9d9]">
            {['No', 'Kode', 'Aspek CPMK', 'Semester', 'Nilai', 'Predikat'].map((h, i) => (
              <th
                key={h}
                className={'border border-black px-2 py-1 font-bold ' + (i === 2 ? 'text-left' : 'text-center')}
              >
                {teks(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.aspek.map((a, i) => (
            <tr key={a.aspekId} className={i % 2 ? 'bg-[#efefef]' : ''}>
              <td className="border-x border-black px-2 py-[3px] text-center">{i + 1}</td>
              <td className="border-x border-black px-2 py-[3px] text-center">{a.aspek.kode.replace(/\.$/, '')}</td>
              <td className="border-x border-black px-2 py-[3px]">{a.aspek.nama}</td>
              <td className="border-x border-black px-2 py-[3px] text-center">{a.aspek.semester}</td>
              <td className="border-x border-black px-2 py-[3px] text-center">{a.nilai ?? BELUM}</td>
              <td className="border-x border-black px-2 py-[3px] text-center">{predikat(a.nilai)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-start gap-10">
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-1">
          <Baris label={teks('Aspek dinilai')} isi={t.akhir.aspekDinilai + ' / ' + t.akhir.aspekTotal} />
          <Baris label={teks('Aspek belum dinilai')} isi={belumDinilai} />
          <Baris label={teks('Aspek final')} isi={t.akhir.aspekFinal} />
          <Baris
            label={teks('Nilai akhir')}
            isi={(t.akhir.nilai ?? BELUM) + (final ? '' : ' (' + teks('sementara') + ')')}
          />
          <Baris label={teks('Predikat')} isi={predikat(t.akhir.nilai)} />
        </div>

        <div className="w-[360px] border border-black">
          <p className="border-b border-black py-1 text-center font-bold uppercase">{teks('Keterangan')}</p>
          <div className="grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-0.5 px-2 py-1.5">
            {RUBRIK.map((r) => (
              <Baris
                key={r.huruf}
                label={teks('Predikat') + ' ' + r.huruf}
                isi={teks(r.label) + ' (' + r.min + '-' + r.max + ')'}
              />
            ))}
            <Baris
              label={teks(BELUM_MEMENUHI.label)}
              isi={teks('di bawah {n}', { n: RUBRIK[RUBRIK.length - 1].min })}
            />
            <Baris label={BELUM} isi={teks('belum dinilai atau belum dibuka')} />
          </div>
        </div>
      </div>

      <p className="mt-6">{'Tangerang, ' + tanggal}</p>
      <div className="mt-16 w-[260px] border-t border-black pt-1">{teks('Head of Department')}</div>

      {/* Sengaja div, bukan <footer>: aturan cetak global menyembunyikan semua <footer>. */}
      <div className="fixed inset-x-0 bottom-0 text-center font-sans text-[8.5px] font-bold">
        Kampus UMN, Scientia Garden | Jl. Boulevard Gading Serpong, Tangerang | T. 6221 5422 0808 | F. 6221
        5422 0800 | www.umn.ac.id
      </div>
    </section>
  )
}
