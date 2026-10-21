import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Transkrip from '../student/Transkrip'
import { Badge, Card, CardHeader, CatatanKaki, EmptyState, GulirTabel, JUDUL_KOLOM } from '../../components/Ui'
import { IconAlert, IconArrowLeft, IconCheck, IconList, IconLock, IconPencil, IconPrint, IconUndo } from '../../components/Icons'
import { bolehTandaiFinal, kelayakanSertifikat } from '../../lib/rules'
import { auditUntuk, getAngkatan, getStudent, transkripOf } from '../../lib/data'
import { menungguPersetujuan, setPenguncian } from '../../lib/store'
import { CONFIG } from '../../lib/config'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { useStore } from '../../lib/store'
import { CatatanPersetujuan, PesanMenunggu, usePerluPersetujuan } from './PermintaanTerkirim'
import { tautanInput } from './LoncengKemahasiswaan'

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

  return (
    <div className="space-y-6">
      {/* Kembali dan pintasan kerja untuk mahasiswa ini: mengisi nilai semester berjalannya. */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/mahasiswa"
          className="inline-flex min-h-[40px] items-center gap-2 text-[13.5px] font-bold text-ink-2 hover:text-brand-ink"
        >
          <IconArrowLeft size={16} />
          {teks('Kembali ke data mahasiswa')}
        </Link>
        <Link
          href={tautanInput({ semester: student.semesterAktif, angkatanId: student.angkatanId, nim: student.nim })}
          className="btn-ghost !py-2 text-[13.5px]"
        >
          <IconPencil size={16} />
          {teks('Masukkan nilai')}
        </Link>
      </div>

      <Transkrip student={student} untukAdmin />

      <KartuSertifikat student={student} />

      <RiwayatPerubahan nim={student.nim} />

      <PanelStatusAspek student={student} />
    </div>
  )
}

/* ------------------------ riwayat perubahan nilai ------------------------ */

const RIWAYAT_AWAL = 10

/* Dulu seluruh riwayat ditampilkan sekaligus, sehingga halaman mahasiswa dengan banyak batch memanjang ribuan
   piksel. Sepuluh yang terbaru dulu; sisanya dibuka bila memang dicari. */
function RiwayatPerubahan({ nim }) {
  const teks = useTeks()
  const log = auditUntuk(nim)
  const [semua, setSemua] = useState(false)
  const tampil = semua ? log : log.slice(0, RIWAYAT_AWAL)

  return (
    <Card className="overflow-hidden print:hidden">
      <CardHeader
        title={teks('Riwayat perubahan nilai')}
        subtitle={teks('Setiap perubahan tercatat beserta aktornya')}
        icon={IconList}
      />
      {log.length ? (
        <>
          <GulirTabel>
            <table className="w-full min-w-[700px] border-separate border-spacing-0">
              <thead>
                <tr className="bg-surface-2 [&>th]:border-b [&>th]:border-line">
                  {/* Ditulis sebagai teks('…') langsung supaya npm run test:bahasa melihatnya; dulu larik ini lolos
                      dari pemindai dan judul kolomnya tetap berbahasa Indonesia di mode Inggris. */}
                  <th className={JUDUL_KOLOM + ' pl-5 text-left sm:pl-6'}>{teks('Waktu')}</th>
                  <th className={JUDUL_KOLOM + ' text-left'}>{teks('Komponen')}</th>
                  <th className={JUDUL_KOLOM + ' text-right'}>{teks('Nilai lama')}</th>
                  <th className={JUDUL_KOLOM + ' text-right'}>{teks('Nilai baru')}</th>
                  <th className={JUDUL_KOLOM + ' text-left'}>{teks('Aktor')}</th>
                  <th className={JUDUL_KOLOM + ' pr-5 text-left sm:pr-6'}>{teks('Batch')}</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-line">
                    <td className="whitespace-nowrap py-2.5 pl-5 pr-3 text-[12.5px] tabular-nums text-ink-2 sm:pl-6">{l.waktu}</td>
                    <td className="px-3 py-2.5 text-[13px] text-ink">{l.komponen}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-ink-2">{l.nilaiLama ?? '–'}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-bold tabular-nums text-ink">{l.nilaiBaru}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-2">{l.aktor}</td>
                    <td className="py-2.5 pl-3 pr-5 font-mono text-[12px] text-ink-2 sm:pr-6">{l.batchId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GulirTabel>
          {log.length > RIWAYAT_AWAL ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
              <p className="text-[13.5px] text-ink-2">
                {teks('Menampilkan {n} dari {total} perubahan', { n: tampil.length, total: log.length })}
              </p>
              <button type="button" className="btn-ghost !py-2 text-[13.5px]" aria-expanded={semua} onClick={() => setSemua((v) => !v)}>
                {teks(semua ? 'Tampilkan 10 terbaru' : 'Tampilkan semua')}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState title={teks('Belum ada perubahan tercatat')}>
          {teks('Nilai mahasiswa ini masuk sekali lewat batch import dan belum pernah diperbaiki.')}
        </EmptyState>
      )}
    </Card>
  )
}

/* -------------------------- kelayakan sertifikat -------------------------- */

function KartuSertifikat({ student }) {
  const teks = useTeks()
  const k = kelayakanSertifikat(student)

  return (
    <Card className="print:hidden">
      <CardHeader
        title={teks('Kelayakan sertifikat')}
        subtitle={teks('Lima syarat yang diperiksa sistem')}
      />

      <ul className="divide-y divide-line">
        {k.syarat.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
            <Badge tone={s.lolos ? 'good' : 'critical'}>
              {teks(s.lolos ? 'Terpenuhi' : 'Belum')}
            </Badge>
            {/* labelT/alasanT: kunci kamus + isian. label/alasan dirakit dengan angka di dalamnya, jadi dulu tidak
                pernah ditemukan di kamus dan tetap berbahasa Indonesia di mode Inggris. */}
            <span className="min-w-[220px] flex-1 text-[13.5px] font-semibold text-ink">
              {teks(...s.labelT)}
            </span>
            {s.lolos || !s.alasanT ? null : <span className="text-[12.5px] text-ink-2">{teks(...s.alasanT)}</span>}
          </li>
        ))}
      </ul>

      {k.layak ? (
        <div className="border-t border-line px-5 py-3.5 sm:px-6">
          <Link
            href={'/admin/sertifikat?cari=' + encodeURIComponent(student.nim)}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-bold text-brand-ink hover:underline sm:min-h-0"
          >
            <IconPrint size={15} />
            {teks('Buka di Cetak Sertifikat')}
          </Link>
        </div>
      ) : null}
    </Card>
  )
}

/* ------------------------- penguncian status aspek ------------------------ */

function PanelStatusAspek({ student }) {
  const teks = useTeks()
  const { admin } = useAuth()
  const t = transkripOf(student)
  const terbuka = t.aspek.filter((a) => !a.terkunci)

  const [galat, setGalat] = useState('')
  const [alasan, setAlasan] = useState('')
  const [menunggu, setMenunggu] = useState(null)
  // Mahasiswa yang programnya sudah lewat Semester 3: tanda yang diubah admin biasa menunggu super admin.
  const perluPersetujuan = usePerluPersetujuan(getAngkatan(student.angkatanId)?.intake)

  const ubah = async (aspekId, status) => {
    setGalat('')
    setMenunggu(null)
    try {
      const hasil = await setPenguncian({ nim: student.nim, aspekId, status, aktor: admin.officer, alasan })
      if (menungguPersetujuan(hasil)) setMenunggu(hasil)
      setAlasan('')
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

      {menunggu ? (
        <div className="mx-5 mt-4 sm:mx-6">
          <PesanMenunggu hasil={menunggu} />
        </div>
      ) : null}

      {perluPersetujuan && terbuka.length ? (
        <div className="space-y-3 border-b border-line px-5 py-4 sm:px-6">
          <CatatanPersetujuan />
          <label className="block">
            <span className="mb-1.5 block label">{teks('Alasan perubahan')}</span>
            <input
              className="field !py-2.5"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder={teks('Wajib, minimal 10 karakter, bila angkatan atau aspek sudah terkunci')}
            />
          </label>
        </div>
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
