import { Fragment, useEffect, useMemo, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LembarSertifikat from '../student/LembarSertifikat'
import {
  Card,
  CatatanKaki,
  EmptyState,
  GulirTabel,
  JUDUL_KOLOM,
  JudulHalaman,
  Paginasi,
  PredikatTeks,
  SearchInput,
  Select,
  StatusTeks,
  TabSaring,
} from '../../components/Ui'
import { IconAlert, IconCheck, IconLock, IconPrint, IconX } from '../../components/Icons'
import { kelayakanSertifikat } from '../../lib/rules'
import { COHORTS, STUDENTS, filterStudents, transkripOf } from '../../lib/data'
import {
  PERMINTAAN_SERTIFIKAT,
  cabutSertifikat,
  catatCetakSertifikat,
  putuskanSertifikat,
  segarkanData,
  useStore,
} from '../../lib/store'
import { LABEL_SERTIFIKAT, keadaanSertifikat, statusGiliran } from '../../lib/duaLapis'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

const PAGE_SIZE = 12

/* Susunannya sama dengan Data Mahasiswa: tab kelayakan berjumlah, alat saring, tabel, kaki bernomor halaman.
   Lihat README.md › Panel Kemahasiswaan › Tampilan. Sejak rapat 24 Okt 2026 sertifikat hanya bisa dicetak setelah
   akses cetaknya disetujui dua lapis: mahasiswa meminta, admin Kemahasiswaan memutuskan lapis pertama, Super Admin
   lapis kedua. Halaman ini tempat keduanya memutuskan (tab Menunggu Anda), dan tombol Cetak di sini pun hanya aktif
   untuk yang sudah Siap dicetak, supaya tidak ada sertifikat yang terbit tanpa pemeriksaan. Akses yang sudah Siap
   dicetak bisa dicabut di sini (misalnya ada laporan sikap sesudah disetujui), dan kolom Akses cetak menyebut berapa
   kali sertifikatnya sudah dibuka untuk dicetak. */
export default function CetakSertifikat() {
  const t = useTeks()
  const versi = useStore()
  const { user, admin } = useAuth()
  const params = useSearchParams()
  const [cari, setCari] = useState(() => params.get('cari') ?? '')
  const [angkatan, setAngkatan] = useState(() =>
    COHORTS.some((c) => c.label === params.get('angkatan')) ? params.get('angkatan') : 'Semua',
  )
  const [kelompok, setKelompok] = useState(() => (params.get('tab') === 'permintaan' ? 'permintaan' : 'semua'))
  const [page, setPage] = useState(1)
  const [dicetak, setDicetak] = useState(null)
  const [tinjau, setTinjau] = useState(null)
  const [cabutNim, setCabutNim] = useState(null)
  const [galatCetak, setGalatCetak] = useState('')
  const giliran = statusGiliran(user)

  const semua = useMemo(
    () =>
      STUDENTS.map((s) => {
        const k = kelayakanSertifikat(s)
        const p = PERMINTAAN_SERTIFIKAT.find((x) => x.nim === s.nim) ?? null
        return { s, k, p, keadaan: keadaanSertifikat(k.layak, p) }
      }).sort(
        (a, b) =>
          Number(b.p?.status === giliran) - Number(a.p?.status === giliran) ||
          Number(b.k.layak) - Number(a.k.layak) ||
          a.s.name.localeCompare(b.s.name),
      ),
    [versi, giliran],
  )

  const jumlahBerhak = semua.filter((x) => x.k.layak).length

  const cocok = useMemo(() => {
    const angkatanId = COHORTS.find((c) => c.label === angkatan)?.id ?? 'Semua'
    const ids = new Set(filterStudents({ angkatan: angkatanId, query: cari }).map((s) => s.id))
    return semua.filter((x) => ids.has(x.s.id))
  }, [semua, cari, angkatan])

  const berhak = cocok.filter((x) => x.k.layak)
  const belum = cocok.filter((x) => !x.k.layak)
  const menungguSaya = cocok.filter((x) => x.p?.status === giliran)
  const baris =
    kelompok === 'berhak' ? berhak : kelompok === 'belum' ? belum : kelompok === 'permintaan' ? menungguSaya : cocok
  const adaSaringan = Boolean(cari.trim()) || angkatan !== 'Semua' || kelompok !== 'semua'

  useEffect(() => setPage(1), [cari, angkatan, kelompok])
  const halaman = Math.max(1, Math.ceil(baris.length / PAGE_SIZE))
  const tampil = baris.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Panel yang ditutup dilepas dari DOM; tanpa ini fokus papan ketik jatuh ke <body>, kembali ke awal halaman.
  const fokusKe = (pemilih) => requestAnimationFrame(() => document.querySelector(pemilih)?.focus())
  const fokusNama = (s) => fokusKe('main a[href="/admin/mahasiswa/' + s.id + '"]')

  const cetak = async (s, p) => {
    setGalatCetak('')
    try {
      // Dicatat dan diperiksa server dulu: akses yang baru dicabut di jendela lain ditolak di sini.
      await catatCetakSertifikat(p.id, { aktor: admin?.officer })
    } catch (e) {
      setGalatCetak(s.name + ': ' + e.message)
      segarkanData()
      return
    }
    flushSync(() => setDicetak(s))
    const selesai = () => {
      window.removeEventListener('afterprint', selesai)
      setDicetak(null)
      // Supaya jumlah cetak di kolom Akses cetak ikut bertambah.
      segarkanData()
    }
    window.addEventListener('afterprint', selesai)
    window.print()
  }

  return (
    <div className="space-y-6">
      <JudulHalaman
        judul={t('Cetak Sertifikat')}
        keterangan={t(
          user?.superAdmin
            ? 'Putuskan lapis kedua permintaan akses cetak, dan bantu mahasiswa yang kesulitan mencetak sertifikatnya sendiri.'
            : 'Putuskan lapis pertama permintaan akses cetak, dan bantu mahasiswa yang kesulitan mencetak sertifikatnya sendiri.',
        )}
      >
        <p className="mt-1 text-[14px] text-ink-2">
          {t('{n} dari {total} mahasiswa sudah berhak atas sertifikat', {
            n: jumlahBerhak.toLocaleString('id-ID'),
            total: STUDENTS.length.toLocaleString('id-ID'),
          })}
        </p>
      </JudulHalaman>

      {galatCetak ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]"
        >
          <IconAlert size={16} className="mt-px shrink-0" />
          {galatCetak}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <TabSaring
          label={t('Kelayakan sertifikat')}
          nilai={kelompok}
          onPilih={setKelompok}
          pilihan={[
            { nilai: 'semua', label: t('Semua'), n: cocok.length },
            { nilai: 'permintaan', label: t('Menunggu Anda'), n: menungguSaya.length },
            { nilai: 'berhak', label: t('Berhak'), n: berhak.length },
            { nilai: 'belum', label: t('Belum berhak'), n: belum.length },
          ]}
          kanan={
            adaSaringan ? (
              <button
                type="button"
                onClick={() => {
                  setCari('')
                  setAngkatan('Semua')
                  setKelompok('semua')
                }}
                className="inline-flex min-h-[44px] items-center rounded-xl text-[13.5px] font-bold text-brand-ink underline-offset-4 hover:underline"
              >
                {t('Atur ulang filter')}
              </button>
            ) : null
          }
        />

        <div className="grid gap-2.5 border-b border-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:px-5">
          <SearchInput value={cari} onChange={setCari} label={t('Cari mahasiswa')} placeholder={t('Cari nama, NIM, atau prodi')} />
          <Select
            ringkas
            label={t('Angkatan')}
            value={angkatan}
            onChange={setAngkatan}
            options={['Semua', ...COHORTS.map((c) => c.label)]}
            tampilkan={(o) => (o === 'Semua' ? t('Semua') : o)}
          />
        </div>

        {/* Wadah kueri: panel Tinjau selebar bagian tabel yang terlihat (100cqi), lihat baris panel di bawah. */}
        <GulirTabel className="[container-type:inline-size]">
          <table className="w-full min-w-[960px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-surface-2 [&>th]:border-b [&>th]:border-line">
                <th className={JUDUL_KOLOM + ' pl-4 text-left sm:pl-5'}>{t('NIM')}</th>
                <th className={JUDUL_KOLOM + ' text-left'}>{t('Nama')}</th>
                <th className={JUDUL_KOLOM + ' text-left'}>{t('Angkatan')}</th>
                <th className={JUDUL_KOLOM + ' text-right'}>{t('Nilai')}</th>
                <th className={JUDUL_KOLOM + ' text-right'}>{t('Predikat')}</th>
                <th className={JUDUL_KOLOM + ' text-left'}>{t('Kelayakan')}</th>
                <th className={JUDUL_KOLOM + ' text-left'}>{t('Akses cetak')}</th>
                <th className={JUDUL_KOLOM + ' pr-4 sm:pr-5'}>
                  <span className="sr-only">{t('Aksi')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tampil.map(({ s, k, p, keadaan }) => {
                // ringkasT: [kunci, isian]. ringkas sendiri dirakit dengan angka, jadi tidak bisa diterjemahkan.
                const sebab = k.gagal.map((g) => g.ringkasT).filter(Boolean)
                const nilai = k.transkrip.akhir.nilai
                const giliranSaya = p?.status === giliran
                // Bila diputuskan dari jendela lain, panelnya ikut hilang bersama tombol Tinjau yang menutupnya.
                const terbuka = tinjau === s.nim && giliranSaya
                // Pencabutan bergantung pada status permintaannya saja: akses yang Siap dicetak tetap bisa dicabut walau
                // syaratnya sudah gugur karena nilainya berubah.
                const bisaDicabut = p?.status === 'siap_dicetak'
                const cabutTerbuka = cabutNim === s.nim && bisaDicabut
                return (
                  <Fragment key={s.id}>
                    <tr className="align-top transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-line">
                      <td className="py-3 pl-4 pr-3 text-[13px] tabular-nums text-ink-2 sm:pl-5">{s.nim}</td>
                      <td className="px-3 py-3">
                        <Link href={'/admin/mahasiswa/' + s.id} className="text-[14.5px] font-bold text-ink hover:text-brand-ink hover:underline">
                          {s.name}
                        </Link>
                        <span className="block text-[12.5px] text-ink-2">{s.program}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-ink-2">{s.angkatanLabel}</td>
                      <td className="px-3 py-3 text-right text-[14px] font-bold tabular-nums text-ink">{nilai ?? '-'}</td>
                      <td className="px-3 py-3 text-right">
                        <PredikatTeks nilai={nilai} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusTeks kuat={k.layak}>{t(k.layak ? 'Berhak' : 'Belum berhak')}</StatusTeks>
                        {!k.layak && sebab.length ? (
                          <span id={'sebab-' + s.id} className="mt-0.5 block max-w-[260px] text-[12.5px] leading-snug text-ink-2">
                            {t(...sebab[0])}
                            {sebab.length > 1 ? ' ' + t('+{n} syarat lain', { n: sebab.length - 1 }) : ''}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <StatusTeks kuat={giliranSaya}>{p ? t(LABEL_SERTIFIKAT[p.status] ?? p.status) : t('Belum diminta')}</StatusTeks>
                        {p ? (
                          <span id={'akses-' + s.id} className="mt-0.5 block text-[12.5px] text-ink-2">
                            {p.status === 'dicabut' && p.dicabut
                              ? t('dicabut {tanggal}', { tanggal: p.dicabut.tanggal })
                              : t('diajukan {tanggal}', { tanggal: p.diajukan })}
                          </span>
                        ) : null}
                        {/* Penanda apakah sertifikatnya sempat tercetak, terutama sebelum aksesnya dicabut. */}
                        {p?.status === 'siap_dicetak' || p?.status === 'dicabut' ? (
                          <span className="block max-w-[220px] text-[12.5px] leading-snug text-ink-2">
                            {p.cetak?.jumlah
                              ? t('dibuka untuk dicetak {n} kali, terakhir {waktu}', { n: p.cetak.jumlah, waktu: p.cetak.terakhir ?? '' })
                              : t('belum pernah dibuka untuk dicetak')}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pl-3 pr-4 text-right sm:pr-5">
                        {giliranSaya ? (
                          <button
                            type="button"
                            onClick={() => setTinjau(terbuka ? null : s.nim)}
                            aria-expanded={terbuka}
                            aria-controls={'tinjau-' + s.id}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-brand-ink bg-brand-soft px-3 text-[13px] font-bold text-brand-ink transition hover:brightness-95"
                          >
                            {t(terbuka ? 'Tutup' : 'Tinjau')}
                          </button>
                        ) : (
                          <span className="inline-flex flex-wrap justify-end gap-2">
                            {/* Tombol garis, bukan isian penuh: satu tombol biru pekat per baris membuat tabel terasa berat. */}
                            <button
                              type="button"
                              onClick={() => cetak(s, p)}
                              disabled={keadaan !== 'siap_dicetak'}
                              aria-label={t('Cetak sertifikat {nama}', { nama: s.name })}
                              aria-describedby={!k.layak && sebab.length ? 'sebab-' + s.id : p ? 'akses-' + s.id : undefined}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[13px] font-bold text-brand-ink transition hover:border-brand-ink hover:bg-brand-soft active:scale-[.97] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-2 disabled:active:scale-100"
                            >
                              <IconPrint size={15} />
                              {t('Cetak')}
                            </button>
                            {bisaDicabut ? (
                              <button
                                type="button"
                                onClick={() => setCabutNim(cabutTerbuka ? null : s.nim)}
                                aria-expanded={cabutTerbuka}
                                aria-controls={'cabut-' + s.id}
                                aria-label={t('Cabut akses cetak {nama}', { nama: s.name })}
                                className="teks-kritis inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--critical)_45%,transparent)] bg-surface px-3 text-[13px] font-bold transition hover:bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] active:scale-[.97]"
                              >
                                <IconLock size={15} />
                                {t('Cabut akses')}
                              </button>
                            ) : null}
                          </span>
                        )}
                      </td>
                    </tr>
                    {terbuka || cabutTerbuka ? (
                      <tr className="[&>td]:border-b [&>td]:border-line">
                        <td id={(terbuka ? 'tinjau-' : 'cabut-') + s.id} colSpan={8} className="bg-surface-2 p-0">
                          {/* Di HP tabel digulir ke kanan untuk mencapai tombol di kolom terakhir; panel selebar tabel akan
                              terbuka di luar layar. Selebar bagian yang terlihat dan menempel di kiri, panelnya selalu tampil. */}
                          <div className="sticky left-0 w-[100cqi] px-4 py-4 sm:px-5">
                            {terbuka ? (
                              <TinjauPermintaan
                                p={p}
                                layak={k.layak}
                                superAdmin={Boolean(user?.superAdmin)}
                                aktor={admin?.officer}
                                onSelesai={() => {
                                  setTinjau(null)
                                  fokusNama(s)
                                }}
                              />
                            ) : (
                              <PanelCabut
                                p={p}
                                aktor={admin?.officer}
                                onBatal={() => {
                                  setCabutNim(null)
                                  fokusKe('[aria-controls="cabut-' + s.id + '"]')
                                }}
                                onSelesai={() => {
                                  setCabutNim(null)
                                  fokusNama(s)
                                }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </GulirTabel>

        {!STUDENTS.length ? (
          <EmptyState title={t('Belum ada data mahasiswa')}>
            {t('Data mahasiswa akan tampil di sini begitu tersedia.')}
          </EmptyState>
        ) : !tampil.length ? (
          <EmptyState title={t(kelompok === 'permintaan' ? 'Tidak ada permintaan yang menunggu Anda' : 'Tidak ada mahasiswa yang cocok')}>
            {kelompok === 'permintaan' ? null : t('Ubah kata kunci, angkatan, atau pilihan kelayakan.')}
          </EmptyState>
        ) : (
          <Paginasi halaman={page} jumlahHalaman={halaman} total={baris.length} ukuran={PAGE_SIZE} onHalaman={setPage} />
        )}
      </Card>

      <CatatanKaki>
        {t('Tombol cetak hanya aktif untuk sertifikat yang akses cetaknya sudah disetujui admin Kemahasiswaan dan Super Admin. Akses itu bisa dicabut lagi, dan setiap pembukaan dialog cetak tercatat. Sertifikat dicetak atau disimpan sebagai PDF dari website ini; jangan kirim lewat surel.')}
      </CatatanKaki>

      {/* Dipasang di <body> hanya selama mencetak; lihat README.md › Cetak. */}
      {dicetak
        ? createPortal(<LembarSertifikat student={dicetak} transkrip={transkripOf(dicetak)} />, document.body)
        : null}
    </div>
  )
}

/**
 * Keputusan satu permintaan akses cetak: admin biasa meneruskan ke Super Admin, Super Admin membuka akses cetaknya.
 * Dipakai juga halaman Persetujuan super admin.
 */
export function TinjauPermintaan({ p, layak, superAdmin, aktor, onSelesai = () => {} }) {
  const t = useTeks()
  const [catatan, setCatatan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const idCatatan = 'catatan-' + p.id

  async function putuskan(keputusan) {
    setGalat('')
    if (keputusan === 'ditolak' && catatan.trim().length < 10) {
      setGalat(t('Alasan penolakan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.'))
      return
    }
    setSibuk(true)
    try {
      const ok = await putuskanSertifikat(p.id, keputusan, { catatan: catatan.trim(), aktor, superAdmin })
      if (!ok) setGalat(t('Permintaan ini sudah diputuskan, mungkin di jendela lain.'))
      else onSelesai()
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-3 text-left">
      <p className="text-[13.5px] leading-relaxed text-ink">
        {t(
          superAdmin
            ? 'Admin Kemahasiswaan sudah menyetujui permintaan ini pada {tanggal}. Setujui untuk membuka akses cetak mahasiswa.'
            : 'Periksa syarat dan nilainya. Bila sesuai, teruskan ke Super Admin; akses cetak baru terbuka setelah Super Admin menyetujui.',
          { tanggal: p.lapis1?.tanggal ?? '' },
        )}
      </p>
      {!layak ? (
        <p className="text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]">
          {t('Mahasiswa ini sudah tidak memenuhi syarat. Tolak permintaannya dengan alasan itu.')}
        </p>
      ) : null}
      <label htmlFor={idCatatan} className="block">
        <span className="mb-1.5 block label">{t('Catatan (wajib bila menolak)')}</span>
        <input id={idCatatan} className="field !py-2.5" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </label>
      {galat ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]"
        >
          <IconAlert size={16} className="mt-px shrink-0" />
          {galat}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        <button type="button" className="btn-primary min-h-[44px]" disabled={sibuk || !layak} onClick={() => putuskan('disetujui')}>
          <IconCheck size={16} />
          {t(superAdmin ? 'Setujui akses cetak' : 'Teruskan ke Super Admin')}
        </button>
        <button
          type="button"
          disabled={sibuk}
          onClick={() => putuskan('ditolak')}
          className="btn-ghost min-h-[44px] hover:border-[var(--critical)] hover:text-[color:var(--teks-kritis,var(--critical))]"
        >
          <IconX size={15} />
          {t('Tolak')}
        </button>
      </div>
    </div>
  )
}

/**
 * Mencabut akses cetak yang sudah Siap dicetak, misalnya karena laporan sikap datang sesudah disetujui. Admin biasa dan
 * Super Admin sama-sama boleh, langsung, dengan alasan yang terbaca mahasiswa; lihat cabutSertifikat di
 * src/server/sertifikat.js. Jumlah cetak disebut supaya pencabut tahu apakah sertifikatnya sempat tercetak.
 */
function PanelCabut({ p, aktor, onBatal, onSelesai }) {
  const t = useTeks()
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const idAlasan = 'alasan-cabut-' + p.id

  async function cabut() {
    setGalat('')
    if (alasan.trim().length < 10) {
      setGalat(t('Alasan pencabutan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.'))
      return
    }
    setSibuk(true)
    try {
      const ok = await cabutSertifikat(p.id, alasan.trim(), { aktor })
      if (!ok) setGalat(t('Akses cetak ini sudah tidak Siap dicetak, mungkin sudah dicabut di jendela lain.'))
      else onSelesai()
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-3 text-left">
      <p className="text-[13.5px] leading-relaxed text-ink">
        {t(
          'Sesudah dicabut, mahasiswa tidak bisa mencetak lagi sampai permintaan barunya disetujui admin Kemahasiswaan dan Super Admin. Sertifikat yang sudah telanjur tercetak tidak ikut tertarik.',
        )}
      </p>
      <p className="text-[13px] font-semibold text-ink">
        {p.cetak?.jumlah
          ? t('Sudah dibuka untuk dicetak {n} kali, terakhir {waktu} oleh {oleh}.', {
              n: p.cetak.jumlah,
              waktu: p.cetak.terakhir ?? '',
              oleh: p.cetak.oleh ?? '',
            })
          : t('Belum pernah dibuka untuk dicetak.')}
      </p>
      <label htmlFor={idAlasan} className="block">
        <span className="mb-1.5 block label">{t('Alasan pencabutan (wajib, terbaca mahasiswa)')}</span>
        <input id={idAlasan} className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
      </label>
      {galat ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]"
        >
          <IconAlert size={16} className="mt-px shrink-0" />
          {galat}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={sibuk}
          onClick={cabut}
          className="btn teks-kritis min-h-[44px] border border-[color-mix(in_srgb,var(--critical)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--critical)_10%,transparent)]"
        >
          <IconLock size={15} />
          {t('Cabut akses cetak')}
        </button>
        <button type="button" disabled={sibuk} onClick={onBatal} className="btn-ghost min-h-[44px]">
          {t('Batal')}
        </button>
      </div>
    </div>
  )
}
