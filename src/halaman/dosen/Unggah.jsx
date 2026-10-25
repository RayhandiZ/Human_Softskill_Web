'use client'

import { useMemo, useRef, useState } from 'react'
import { Card, CardHeader, CatatanKaki, EmptyState, StatusTeks } from '../../components/Ui'
import { IconAlert, IconCheck, IconClock, IconDocument, IconDownload, IconUpload } from '../../components/Icons'
import { SUMBER } from '../../lib/curriculum'
import { dosenSesi, getAngkatan, komponenDosen, mahasiswaKelas } from '../../lib/data'
import { PERMINTAAN, batalkanPermintaan, unggahNilaiDosen, unggahanDosen, useStore } from '../../lib/store'
import { barisCSV } from '../../lib/csv'
import { bacaRekap, judulKolom, lembarTemplat } from '../../lib/unggahDosen'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Unggah Nilai dosen (rapat 24 Okt 2026). Dosen mengunduh templat kelasnya, mengisinya di Excel, lalu mengunggahnya
   kembali. Berkas dibaca di peramban (bacaRekap di src/lib/unggahDosen.js) dan dosen memeriksa perubahannya sebelum
   menyimpan. Nilainya langsung tersimpan tanpa persetujuan, kecuali untuk angkatan yang sudah disahkan atau programnya
   selesai, dan aspek yang sudah final: bagian itu diajukan ke Super Admin dengan alasan. Server memeriksa ulang
   semuanya (unggahNilaiDosen di src/server/pengajuan.js) dan Super Admin bisa membatalkan satu unggahan. Lihat
   README.md › Panel Dosen. */

const BATAS_UKURAN = 5 * 1024 * 1024
const TAMPIL_PERUBAHAN = 30
const TAMPIL_GALAT = 12
const ALASAN_MIN = 10

// Sebab nilai diajukan dulu (sebabPersetujuan di src/lib/unggahDosen.js), ditulis di samping nilainya.
const SEBAB_PERSETUJUAN = {
  disahkan: 'angkatan sudah disahkan',
  selesai: 'program sudah selesai',
  final: 'aspek sudah final',
}

// Status permintaan perbaikan di riwayat (PermintaanAdmin, lihat src/server/persetujuan.js).
const STATUS_PERMINTAAN = {
  menunggu: 'Menunggu persetujuan Super Admin',
  disetujui: 'Disetujui Super Admin',
  ditolak: 'Ditolak Super Admin',
  gagal: 'Gagal dijalankan',
  dibatalkan: 'Ditarik',
}

const salahBerkas = (teks) => Object.assign(new Error(teks), { kamus: true })
const angka = (n) => (n == null ? '–' : n.toLocaleString('id-ID', { maximumFractionDigits: 2 }))

/** Baris mentah berkas, baris pertama judul. Excel dibaca dari lembar pertama. */
async function bacaBerkas(berkas) {
  const nama = berkas.name.toLowerCase()
  if (berkas.size > BATAS_UKURAN) throw salahBerkas('Berkasnya lebih dari 5 MB. Pastikan ini rekap nilai kelas Anda.')
  if (nama.endsWith('.csv')) return barisCSV(await berkas.text())
  if (nama.endsWith('.xls')) {
    throw salahBerkas('Berkas .xls (Excel lama) belum bisa dibaca. Buka di Excel, simpan sebagai .xlsx, lalu unggah lagi.')
  }
  if (!nama.endsWith('.xlsx')) throw salahBerkas('Pilih berkas .xlsx atau .csv.')
  const { readSheet } = await import('read-excel-file/browser')
  try {
    return await readSheet(berkas)
  } catch {
    throw salahBerkas('Berkas ini tidak terbaca sebagai Excel. Simpan ulang sebagai .xlsx lalu unggah lagi.')
  }
}

async function unduhTemplat({ dosen, mahasiswa, komponen, t }) {
  const { default: tulisXlsx } = await import('write-excel-file/browser')
  const kelas = t('{unit} Semester {semester}, {prodi}', {
    unit: SUMBER[dosen.sumber]?.label ?? dosen.sumber,
    semester: dosen.semester,
    prodi: dosen.prodi,
  })
  await tulisXlsx(lembarTemplat({ mahasiswa, komponenKelas: komponen, kelas, t })).toFile(
    'templat-nilai-' + String(dosen.sumber).toLowerCase() + '-sem' + dosen.semester + '.xlsx',
  )
}

export default function Unggah() {
  const versi = useStore()
  const t = useTeks()
  const { user } = useAuth()
  const dosen = useMemo(() => dosenSesi(user), [user])
  const komponen = useMemo(() => komponenDosen(dosen), [dosen, versi])
  const mahasiswa = useMemo(() => mahasiswaKelas(dosen), [dosen, versi])

  const [berkas, setBerkas] = useState(null)
  const [galatBerkas, setGalatBerkas] = useState(null)
  const [membaca, setMembaca] = useState(false)
  const [seret, setSeret] = useState(false)
  const [mengunduh, setMengunduh] = useState(false)
  const [galatTemplat, setGalatTemplat] = useState(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [tersimpan, setTersimpan] = useState(null)
  const [galatSimpan, setGalatSimpan] = useState(null)
  const [alasan, setAlasan] = useState('')
  const [galatTarik, setGalatTarik] = useState(null)
  const masukan = useRef(null)

  // Dibaca ulang setiap data termuat ulang, supaya "nilai lama" selalu yang tersimpan sekarang.
  const rekap = useMemo(
    () => (berkas ? bacaRekap(berkas.baris, { mahasiswa, komponenKelas: komponen }) : null),
    [berkas, mahasiswa, komponen, versi],
  )
  // Unggahan yang tersimpan dan permintaan perbaikan ke Super Admin, dalam satu urutan waktu, terbaru di atas.
  const riwayat = [
    ...unggahanDosen().map((u) => ({ ...u, jenis: 'unggahan' })),
    ...PERMINTAAN.filter((p) => p.aksi === 'PERBAIKAN_NILAI_DOSEN' && p.milikSaya).map((p) => ({
      ...p,
      jenis: 'permintaan',
      waktu: p.diajukanPada,
    })),
  ].sort((a, b) => String(b.waktu ?? '').localeCompare(String(a.waktu ?? '')))

  if (!dosen) {
    return (
      <EmptyState title={t('Akun ini belum terdaftar sebagai dosen pengampu')}>
        {t('Hubungi Biro Kemahasiswaan untuk didaftarkan pada satu kelas.')}
      </EmptyState>
    )
  }

  async function pilih(f) {
    if (!f) return
    setGalatBerkas(null)
    setGalatSimpan(null)
    setTersimpan(null)
    setBerkas(null)
    setAlasan('')
    setMembaca(true)
    try {
      setBerkas({ nama: f.name, baris: await bacaBerkas(f) })
    } catch (e) {
      setGalatBerkas(e.kamus ? t(e.message) : e.message)
    } finally {
      setMembaca(false)
    }
  }

  async function templat() {
    setMengunduh(true)
    setGalatTemplat(null)
    try {
      await unduhTemplat({ dosen, mahasiswa, komponen, t })
    } catch {
      setGalatTemplat(t('Templat gagal dibuat. Muat ulang halaman, lalu coba lagi.'))
    } finally {
      setMengunduh(false)
    }
  }

  async function simpan() {
    if (!bisaSimpan) return
    setMenyimpan(true)
    setGalatSimpan(null)
    try {
      const hasil = await unggahNilaiDosen({
        dosen,
        entri: rekap.perubahan.map((p) => ({ nim: p.nim, komponenId: p.komponen.id, nilai: p.baru })),
        alasan: perlu ? alasan.trim() : null,
      })
      setTersimpan(hasil)
      setBerkas(null)
      setAlasan('')
    } catch (e) {
      setGalatSimpan(e.message)
    } finally {
      setMenyimpan(false)
    }
  }

  async function tarik(id) {
    setGalatTarik(null)
    try {
      if (!(await batalkanPermintaan(id))) setGalatTarik(t('Permintaan ini sudah diputuskan, jadi tidak bisa ditarik lagi.'))
    } catch (e) {
      setGalatTarik(e.message)
    }
  }

  const tanpaKolom = rekap ? komponen.filter((k) => !rekap.kolom.some((c) => c.komponen.id === k.id)) : []
  // Kolom yang judulnya sama persis dengan templat cukup dihitung; yang dikenali dengan cara lain dirinci.
  const kolomLain = rekap ? rekap.kolom.filter((c) => c.judul !== judulKolom(c.komponen)) : []
  const kolomTemplat = rekap ? rekap.kolom.length - kolomLain.length : 0
  // Nilai yang diajukan ke Super Admin; sisanya langsung tersimpan.
  const perlu = rekap?.perluPersetujuan ?? 0
  const langsung = rekap ? rekap.perubahan.length - perlu : 0
  const kurangAlasan = perlu > 0 && alasan.trim().length < ALASAN_MIN
  const bisaSimpan = Boolean(rekap && !rekap.galat.length && rekap.perubahan.length && !kurangAlasan)
  // Angkatan yang diampu, bila Super Admin sudah memilihnya (sama dengan Beranda, dosen/Pantau.jsx).
  const angkatanDiampu = dosen.angkatan.map((id) => getAngkatan(id)?.label ?? id).join(', ')

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Unggah Nilai')}</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {t('Unggah rekap nilai kelas Anda dari Excel. Periksa perubahannya, lalu simpan: nilainya langsung masuk transkrip mahasiswa.')}{' '}
          {t('Perbaikan untuk angkatan yang sudah disahkan atau selesai diajukan ke Super Admin dulu.')}
        </p>
      </header>

      {!komponen.length ? (
        <Card>
          <EmptyState title={t('Belum ada tugas untuk kelas Anda')}>
            {t('Tugas kelas ditetapkan Super Admin lewat halaman Penilaian & Bobot.')}
          </EmptyState>
        </Card>
      ) : !mahasiswa.length ? (
        // Tanpa mahasiswa, templatnya kosong dan setiap NIM di berkas ditolak; dosen diberi tahu sebab dan jalan keluarnya.
        <Card>
          <EmptyState title={t('Belum ada mahasiswa di kelas Anda')}>
            {angkatanDiampu
              ? t('Angkatan yang Anda ampu ({daftar}) belum berisi mahasiswa {prodi}.', { daftar: angkatanDiampu, prodi: dosen.prodi })
              : t('Saat ini tidak ada mahasiswa {prodi} yang sudah sampai Semester {n} dan programnya belum selesai.', {
                  prodi: dosen.prodi,
                  n: dosen.semester,
                })}{' '}
            {angkatanDiampu
              ? t('Bila angkatannya keliru, minta Super Admin mengubahnya di akun Anda.')
              : t('Bila Anda mengampu angkatan tertentu, termasuk yang sudah disahkan, minta Super Admin memilihnya di akun Anda.')}{' '}
            {t('Templat dan unggahan bisa dipakai setelah kelas Anda berisi mahasiswa.')}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="card-pad">
            <Langkah nomor={1} judul={t('Unduh templat')}>
              {t('Templat berisi {n} mahasiswa kelas Anda dan satu kolom untuk tiap tugas ({k} tugas). Nilai yang sudah tersimpan ikut terisi.', {
                n: mahasiswa.length,
                k: komponen.length,
              })}
            </Langkah>
            <ul className="mt-4 space-y-1.5 text-[13.5px] leading-relaxed text-ink-2">
              <li>{t('Jangan ubah baris judul dan kolom NIM.')}</li>
              <li>{t('Tulis nilai 0 sampai 100. Desimal boleh, misalnya 85,5.')}</li>
              <li>{t('Sel yang dikosongkan dilewati; nilai yang sudah tersimpan tidak terhapus.')}</li>
            </ul>
            <button type="button" onClick={templat} disabled={mengunduh} className="btn-ghost mt-5 min-h-[44px]">
              <IconDownload size={18} />
              {t(mengunduh ? 'Menyiapkan templat…' : 'Unduh templat (.xlsx)')}
            </button>
            {galatTemplat ? <Galat className="mt-3">{galatTemplat}</Galat> : null}
          </Card>

          <Card className="card-pad">
            <Langkah nomor={2} judul={t('Unggah berkas')}>
              {t('Pilih rekap yang sudah diisi. Isinya dibaca dulu untuk Anda periksa; belum ada yang tersimpan.')}
            </Langkah>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setSeret(true)
              }}
              onDragLeave={() => setSeret(false)}
              onDrop={(e) => {
                e.preventDefault()
                setSeret(false)
                pilih(e.dataTransfer.files?.[0])
              }}
              className={
                'mt-4 rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ' +
                (seret ? 'border-brand-ink bg-brand-soft' : 'border-line')
              }
            >
              <p className="hidden text-[13.5px] text-ink-2 sm:block">{t('Tarik berkas ke sini, atau')}</p>
              <input
                ref={masukan}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => {
                  pilih(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => masukan.current?.click()}
                disabled={membaca || menyimpan}
                className="btn-primary mt-2 min-h-[44px]"
              >
                <IconUpload size={18} />
                {t(membaca ? 'Membaca berkas…' : berkas ? 'Ganti berkas' : 'Pilih berkas')}
              </button>
              <p className="mt-3 text-[12.5px] text-ink-2">{t('Berkas .xlsx atau .csv, paling besar 5 MB.')}</p>
            </div>
            {berkas ? (
              <p className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <IconDocument size={16} className="shrink-0 text-ink-2" />
                {t('Berkas: {nama}', { nama: berkas.nama })}
              </p>
            ) : null}
            {galatBerkas ? <Galat className="mt-3">{galatBerkas}</Galat> : null}
          </Card>
        </div>
      )}

      {tersimpan ? (
        <div role="status" className="space-y-1.5 rounded-xl border border-line bg-surface px-4 py-3.5 text-[14px] font-semibold">
          {tersimpan.jumlah || !tersimpan.permintaan ? (
            <p className="teks-baik flex items-start gap-2">
              <IconCheck size={18} className="mt-px shrink-0" />
              {tersimpan.jumlah
                ? t('{n} nilai tersimpan dan sudah tampil di transkrip mahasiswa.', { n: tersimpan.jumlah })
                : t('Tidak ada nilai yang berubah, jadi tidak ada yang disimpan.')}
            </p>
          ) : null}
          {tersimpan.permintaan ? (
            <p className="flex items-start gap-2 text-ink">
              <IconClock size={18} className="mt-px shrink-0 text-ink-2" />
              {t('{n} nilai diajukan ke Super Admin ({id}). Nilainya berubah setelah disetujui.', {
                n: tersimpan.permintaan.jumlah,
                id: tersimpan.permintaan.id,
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      {rekap ? (
        <Card className="overflow-hidden">
          <CardHeader
            icon={IconCheck}
            title={t('Periksa sebelum menyimpan')}
            subtitle={t('Hanya nilai yang berbeda dari yang tersimpan yang akan ditulis.')}
          />
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Ringkas label={t('Nilai berubah')} nilai={rekap.perubahan.length} />
              <Ringkas label={t('Mahasiswa terdampak')} nilai={rekap.mahasiswa} />
              <Ringkas label={t('Sama dengan tersimpan')} nilai={rekap.sama} />
              <Ringkas label={t('Sel kosong dilewati')} nilai={rekap.kosong} />
            </dl>

            {rekap.kolom.length ? (
              <div>
                <h3 className="text-[13.5px] font-bold text-ink">{t('Kolom tugas yang dibaca')}</h3>
                {kolomTemplat ? (
                  <p className="mt-2 text-[13px] text-ink-2">{t('{n} kolom sama persis dengan templat.', { n: kolomTemplat })}</p>
                ) : null}
                {kolomLain.length ? (
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink-2">
                    {kolomLain.map((c) => (
                      <li key={c.indeks}>
                        <span className="font-semibold text-ink">{c.judul}</span>
                        {' → '}
                        {judulKolom(c.komponen)}
                        {c.cara === 'mirip' ? (
                          <span className="teks-tunggu font-semibold"> {t('(dicocokkan dari kemiripan nama, periksa lagi)')}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {tanpaKolom.length ? (
                  <p className="mt-2 text-[13px] text-ink-2">
                    {t('Tidak ada kolomnya di berkas, jadi nilainya tidak berubah: {daftar}.', {
                      daftar: tanpaKolom.map((k) => k.id).join(', '),
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {rekap.galat.length ? (
              <Galat>
                <span className="block">
                  {t('Belum bisa disimpan. Perbaiki {n} masalah ini di berkas, lalu unggah lagi:', { n: rekap.galat.length })}
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-medium">
                  {rekap.galat.slice(0, TAMPIL_GALAT).map((g, i) => (
                    <li key={i}>{t(g.teks, g.isi)}</li>
                  ))}
                  {rekap.galat.length > TAMPIL_GALAT ? (
                    <li>{t('dan {n} masalah lainnya', { n: rekap.galat.length - TAMPIL_GALAT })}</li>
                  ) : null}
                </ul>
              </Galat>
            ) : null}

            {rekap.peringatan.map((p, i) => (
              <p
                key={i}
                className="teks-tunggu flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] px-3.5 py-3 text-[13px] font-semibold leading-relaxed"
              >
                <IconAlert size={16} className="mt-px shrink-0" />
                {t(p.teks, p.isi)}
              </p>
            ))}

            {rekap.perubahan.length ? (
              <div>
                <h3 className="text-[13.5px] font-bold text-ink">{t('Nilai yang akan disimpan')}</h3>
                {/* Daftar, bukan tabel: di HP nilai sekarang dan nilai baru tetap terlihat tanpa menggeser ke samping. */}
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {rekap.perubahan.slice(0, TAMPIL_PERUBAHAN).map((p) => (
                    <li
                      key={p.nim + '|' + p.komponen.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-ink">{p.nama}</p>
                        <p className="text-[12.5px] tabular-nums text-ink-2">
                          {p.nim} · {p.komponen.id}
                          {p.persetujuan ? (
                            <span className="teks-tunggu font-semibold">
                              {' · '}
                              {t('diajukan ke Super Admin: {sebab}', { sebab: t(SEBAB_PERSETUJUAN[p.persetujuan]) })}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <p className="flex items-baseline gap-2 text-[13px] tabular-nums text-ink-2">
                        {p.lama == null ? t('belum ada') : angka(p.lama)}
                        <span aria-hidden="true">→</span>
                        <span className="sr-only">{t('menjadi')}</span>
                        <strong className="text-[14.5px] font-bold text-ink">{angka(p.baru)}</strong>
                      </p>
                    </li>
                  ))}
                </ul>
                {rekap.perubahan.length > TAMPIL_PERUBAHAN ? (
                  <p className="mt-2 text-[13px] text-ink-2">
                    {t('dan {n} perubahan lainnya', { n: rekap.perubahan.length - TAMPIL_PERUBAHAN })}
                  </p>
                ) : null}
              </div>
            ) : !rekap.galat.length ? (
              <p className="text-[14px] text-ink-2">
                {t('Tidak ada nilai yang berubah. Semua nilai di berkas sama dengan yang tersimpan atau selnya kosong.')}
              </p>
            ) : null}

            {perlu && !rekap.galat.length ? (
              <div className="space-y-3 rounded-xl border border-line bg-surface-2 px-4 py-3.5">
                <p className="text-[13.5px] leading-relaxed text-ink">
                  {t(
                    '{n} nilai untuk angkatan yang sudah disahkan atau programnya selesai, atau aspek yang sudah final, akan diajukan ke Super Admin. Nilainya belum berubah sampai Super Admin menyetujui.',
                    { n: perlu },
                  )}
                </p>
                <label htmlFor="alasan-perbaikan" className="block">
                  <span className="mb-1.5 block label">{t('Alasan perbaikan (wajib, minimal {n} karakter)', { n: ALASAN_MIN })}</span>
                  <input
                    id="alasan-perbaikan"
                    className="field !py-2.5"
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    placeholder={t('Misalnya: nilai UAS dikoreksi sesudah peninjauan lembar jawaban')}
                  />
                </label>
              </div>
            ) : null}

            {galatSimpan ? <Galat>{galatSimpan}</Galat> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={simpan} disabled={!bisaSimpan || menyimpan} className="btn-primary min-h-[44px]">
                <IconCheck size={18} />
                {menyimpan
                  ? t('Menyimpan…')
                  : !perlu
                    ? t('Simpan {n} nilai', { n: rekap.perubahan.length })
                    : !langsung
                      ? t('Ajukan {n} nilai ke Super Admin', { n: perlu })
                      : t('Simpan {n} nilai, ajukan {m}', { n: langsung, m: perlu })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBerkas(null)
                  setGalatSimpan(null)
                  setAlasan('')
                }}
                disabled={menyimpan}
                className="btn-ghost min-h-[44px]"
              >
                {t('Batal')}
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader
          icon={IconClock}
          title={t('Riwayat unggahan')}
          subtitle={t('Unggahan dan perbaikan yang diajukan atas nama Anda, terbaru di atas.')}
        />
        {galatTarik ? <Galat className="mx-5 mb-3 sm:mx-6">{galatTarik}</Galat> : null}
        {riwayat.length ? (
          <ul className="divide-y divide-line">
            {riwayat.map((u) =>
              u.jenis === 'permintaan' ? (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5 sm:px-6">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">{u.ringkasan?.judul ?? u.id}</p>
                    <p className="text-[12.5px] tabular-nums text-ink-2">
                      {u.waktu} · {u.id}
                      {u.status === 'ditolak' && u.catatanKeputusan ? ' · ' + u.catatanKeputusan : ''}
                      {u.status === 'gagal' && u.hasil?.galat ? ' · ' + u.hasil.galat : ''}
                    </p>
                  </div>
                  <span className="flex flex-wrap items-center gap-3">
                    <StatusTeks kuat={u.status === 'menunggu'}>{t(STATUS_PERMINTAAN[u.status] ?? u.status)}</StatusTeks>
                    {u.status === 'menunggu' ? (
                      <button type="button" onClick={() => tarik(u.id)} className="btn-ghost min-h-[40px] !px-3 !py-1.5 text-[13px]">
                        {t('Tarik')}
                      </button>
                    ) : null}
                  </span>
                </li>
              ) : (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3.5 sm:px-6">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{t('{n} nilai', { n: u.jumlah })}</p>
                    <p className="text-[12.5px] tabular-nums text-ink-2">
                      {u.waktu}
                      {u.cara !== 'unggah-dosen' ? ' · ' + t('usulan lama yang disetujui') : ''}
                    </p>
                  </div>
                  <StatusTeks kuat={u.status === 'dibatalkan'}>
                    {t(u.status === 'dibatalkan' ? 'Dibatalkan Super Admin' : 'Tersimpan')}
                  </StatusTeks>
                </li>
              ),
            )}
          </ul>
        ) : (
          <EmptyState title={t('Belum ada unggahan')}>{t('Unggahan yang Anda simpan akan tercatat di sini.')}</EmptyState>
        )}
      </Card>

      <CatatanKaki>
        {t('Setiap unggahan tercatat di log. Bila ada nilai yang keliru, unggah ulang dengan nilai yang benar, atau minta Super Admin membatalkan unggahannya.')}{' '}
        {t('Perbaikan yang masih menunggu Super Admin bisa Anda tarik.')}
      </CatatanKaki>
    </div>
  )
}

function Langkah({ nomor, judul, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[14px] font-extrabold text-brand-ink">
        {nomor}
      </span>
      <div>
        <h2 className="text-[16px] font-bold leading-tight text-ink">{judul}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  )
}

function Ringkas({ label, nilai }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3.5 py-3">
      <dt className="text-[12.5px] font-semibold text-ink-2">{label}</dt>
      <dd className="mt-1 text-[22px] font-extrabold leading-none tabular-nums text-ink">{nilai}</dd>
    </div>
  )
}

function Galat({ className = '', children }) {
  return (
    <div
      role="alert"
      className={
        'flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-[color:var(--teks-kritis)] ' +
        className
      }
    >
      <IconAlert size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
