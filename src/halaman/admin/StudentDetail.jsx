import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Transkrip from '../student/Transkrip'
import { Badge, Card, CardHeader, CatatanKaki, EmptyState } from '../../components/Ui'
import { IconAlert, IconArrowLeft, IconCheck, IconList, IconLock, IconUndo } from '../../components/Icons'
import { bolehTandaiFinal, kelayakanSertifikat } from '../../lib/rules'
import { auditUntuk, getStudent, transkripOf } from '../../lib/data'
import { setPenguncian } from '../../lib/store'
import { CONFIG } from '../../lib/config'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { useStore } from '../../lib/store'

export default function StudentDetail() {
  const teks = useTeks()
  useStore()
  const { id } = useParams()
  const student = getStudent(id)

  if (!student) {
    return (
      <Card>
        <EmptyState title={teks('Mahasiswa tidak ditemukan')}>
          {teks('Tidak ada data dengan tanda pengenal {id}.', { id })}{' '}
          <Link href="/admin/mahasiswa" className="font-bold text-brand-ink hover:underline">
            {teks('Kembali ke daftar')}
          </Link>
        </EmptyState>
      </Card>
    )
  }

  const kelayakan = kelayakanSertifikat(student)
  const log = auditUntuk(student.nim)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/mahasiswa"
        className="inline-flex items-center gap-2 text-[13.5px] font-bold text-ink-2 hover:text-brand-ink print:hidden"
      >
        <IconArrowLeft size={16} />
        {teks('Kembali ke data mahasiswa')}
      </Link>

      <Transkrip student={student} />

      <Card className="print:hidden">
        <CardHeader
          title={teks('Kelayakan sertifikat')}
          subtitle={teks('Lima syarat yang diperiksa sistem')}
        />
        <ul className="divide-y divide-line">
          {kelayakan.syarat.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
              <Badge tone={s.lolos ? 'good' : 'critical'}>
                {teks(s.lolos ? 'Terpenuhi' : 'Belum')}
              </Badge>
              <span className="min-w-[220px] flex-1 text-[13.5px] font-semibold text-ink">
                {teks(s.label)}
              </span>
              {s.lolos ? null : <span className="text-[12.5px] text-ink-2">{teks(s.alasan)}</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="print:hidden">
        <CardHeader
          title={teks('Riwayat perubahan nilai')}
          subtitle={teks('Setiap perubahan tercatat beserta aktornya')}
          icon={IconList}
        />
        {log.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  {['Waktu', 'Komponen', 'Lama', 'Baru', 'Aktor', 'Batch'].map((h, i) => (
                    <th
                      key={h}
                      className={
                        'px-4 py-3 text-[11px] font-bold uppercase tracking-[.07em] text-ink-3 ' +
                        (i === 2 || i === 3 ? 'text-right' : 'text-left')
                      }
                    >
                      {teks(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-[12.5px] tabular-nums text-ink-3">{l.waktu}</td>
                    <td className="px-4 py-2.5 text-[13px] text-ink">{l.komponen}</td>
                    <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-ink-3">{l.nilaiLama}</td>
                    <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-ink">{l.nilaiBaru}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ink-2">{l.aktor}</td>
                    <td className="px-4 py-2.5 text-[12px] tabular-nums text-ink-3">{l.batchId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={teks('Belum ada perubahan tercatat')}>
            {teks('Nilai mahasiswa ini masuk sekali lewat batch import dan belum pernah diperbaiki.')}
          </EmptyState>
        )}
      </Card>

      <PanelStatusAspek student={student} />
    </div>
  )
}

/* ------------------------- penguncian status aspek ------------------------ */

function PanelStatusAspek({ student }) {
  const teks = useTeks()
  const { admin } = useAuth()
  const t = transkripOf(student)
  const terbuka = t.aspek.filter((a) => !a.terkunci)

  const [galat, setGalat] = useState('')

  const ubah = async (aspekId, status) => {
    setGalat('')
    try {
      await setPenguncian({ nim: student.nim, aspekId, status, aktor: admin.officer })
    } catch (e) {
      setGalat(e.message)
    }
  }

  return (
    <Card className="print:hidden">
      <CardHeader
        title={teks('Status penguncian aspek')}
        subtitle={
          teks('Mode berlaku: {mode}.', { mode: CONFIG.PENGUNCIAN_ASPEK }) +
          ' ' +
          teks('Penandaan di sini selalu menang atas mode.')
        }
        icon={IconLock}
      />

      {galat ? (
        <p
          role="alert"
          className="mx-5 mt-4 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)] sm:mx-6"
        >
          <IconAlert size={16} className="mt-px shrink-0" />
          {galat}
        </p>
      ) : null}

      {terbuka.length ? (
        <ul className="divide-y divide-line">
          {terbuka.map((a) => {
            const boleh = bolehTandaiFinal(student, a.aspek.id)
            const tanda = a.penguncian?.status ?? null
            return (
              <li key={a.aspek.id} className="flex flex-wrap items-start gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-[220px] flex-1">
                  <p className="text-[14px] font-bold text-ink">
                    {a.aspek.kode} {a.aspek.nama}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-2">
                    {teks('{n}/{total} komponen dinilai', {
                      n: a.komponenTerisi,
                      total: a.komponenTotal,
                    })}
                    {a.nilai != null ? ' \u00b7 ' + teks('nilai {n}', { n: a.nilai }) : ''}
                    {a.alasanSementara ? ' \u00b7 ' + teks(a.alasanSementara) : ''}
                  </p>
                  {tanda ? (
                    <p className="mt-1 text-[12px] text-ink-3">
                      {teks('Ditandai {tanda} oleh {oleh} pada {tanggal}', {
                        tanda: teks(tanda),
                        oleh: a.penguncian.oleh,
                        tanggal: a.penguncian.tanggal,
                      })}
                    </p>
                  ) : null}
                </div>

                <Badge tone={a.status === 'final' ? 'good' : a.status === 'menunggu' ? 'warning' : 'brand'}>
                  {teks(
                    a.status === 'final'
                      ? 'Final'
                      : a.status === 'menunggu'
                        ? 'Menunggu nilai'
                        : 'Sementara',
                  )}
                </Badge>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!boleh.boleh || tanda === 'final'}
                    title={boleh.boleh ? undefined : teks(boleh.alasan)}
                    onClick={() => ubah(a.aspek.id, 'final')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[12.5px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconCheck size={14} />
                    {teks('Tandai final')}
                  </button>
                  <button
                    type="button"
                    disabled={tanda === 'sementara'}
                    onClick={() => ubah(a.aspek.id, 'sementara')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {teks('Tahan sementara')}
                  </button>
                  {tanda ? (
                    <button
                      type="button"
                      onClick={() => ubah(a.aspek.id, null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-bold text-ink-3 transition hover:text-ink"
                    >
                      <IconUndo size={14} />
                      {teks('Ikuti aturan')}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title={teks('Belum ada aspek yang terbuka untuk mahasiswa ini.')} />
      )}

      <div className="px-5 pb-4 sm:px-6">
        <CatatanKaki>
          {teks('Aspek yang komponennya belum lengkap tidak pernah bisa dikunci, tombolnya nonaktif beserta alasannya. Penguncian hanya menghentikan perubahan status, bukan mengubah angka.')}
        </CatatanKaki>
      </div>
    </Card>
  )
}
