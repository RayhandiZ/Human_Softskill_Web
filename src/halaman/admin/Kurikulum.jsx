import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardHeader, CatatanKaki, GulirTabel, JUDUL_KOLOM, JudulHalaman, StatusTeks, TandaDraft } from '../../components/Ui'
import { IconAlert, IconCheck, IconLock, IconUndo } from '../../components/Icons'
import { SUMBER, getAspek, getAspekList, getKomponen } from '../../lib/curriculum'
import { ISI_PENGATURAN, bedaBobot, dampakBobot, periksaBobot, porsiBobot, susunanBobot } from '../../lib/bobot'
import { bobotKomponen } from '../../lib/scoring'
import { STUDENTS } from '../../lib/data'
import { menungguPersetujuan, simpanBobot, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { CatatanPersetujuan, PesanMenunggu } from './PermintaanTerkirim'
import { daftarKode } from './LoncengKemahasiswaan'

/* Bobot komponen per aspek dan cara membagi bobot otomatis; lihat README.md › Mengubah bobot dari halaman Kurikulum. */

// Sama dengan ALASAN_MIN di src/server/nilai.js; server tetap yang memutuskan.
const ALASAN_MIN = 10
const BATAS_CONTOH = 10

const LABEL_JENIS = { TUGAS: 'Tugas', SIKAP: 'Sikap', UTS: 'UTS', UAS: 'UAS' }

/* Isian disimpan sebagai teks supaya "12," atau kolom kosong bisa diketik; dibaca sebagai angka saat diperiksa. */
const keTeks = (n) => (typeof n === 'number' ? String(n).replace('.', ',') : '')
const keAngka = (teks) => {
  const s = String(teks ?? '').trim().replace(',', '.')
  return s === '' ? NaN : Number(s)
}
const petaTeks = (peta) => peta && Object.fromEntries(Object.entries(peta).map(([k, v]) => [k, keTeks(v)]))
const petaAngka = (peta) => peta && Object.fromEntries(Object.entries(peta).map(([k, v]) => [k, keAngka(v)]))

function keDraf(s) {
  return {
    pengaturan: {
      MODE_BOBOT_KOMPONEN: s.pengaturan.MODE_BOBOT_KOMPONEN,
      BOBOT_SUMBER: petaTeks(s.pengaturan.BOBOT_SUMBER),
      BOBOT_KOMPONEN_MK: petaTeks(s.pengaturan.BOBOT_KOMPONEN_MK),
    },
    aspek: Object.fromEntries(Object.entries(s.aspek).map(([id, m]) => [id, petaTeks(m)])),
  }
}

function dariDraf(d) {
  return {
    pengaturan: {
      MODE_BOBOT_KOMPONEN: d.pengaturan.MODE_BOBOT_KOMPONEN,
      BOBOT_SUMBER: petaAngka(d.pengaturan.BOBOT_SUMBER),
      BOBOT_KOMPONEN_MK: petaAngka(d.pengaturan.BOBOT_KOMPONEN_MK),
    },
    aspek: Object.fromEntries(Object.entries(d.aspek).map(([id, m]) => [id, petaAngka(m)])),
  }
}

const persen = (n) => (Number.isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '%' : '–')
const jumlah = (peta) => Object.values(peta ?? {}).reduce((a, b) => a + b, 0)

/** Isian awal saat beralih ke manual: porsi yang tampil, dua desimal, selisih pembulatan di komponen terakhir. */
function porsiAwal(porsi, ids) {
  const sah = ids.every((id) => Number.isFinite(porsi[id]))
  const bulat = ids.map((id) => Math.round((sah ? porsi[id] : 100 / ids.length) * 100) / 100)
  const selisih = 100 - bulat.reduce((a, b) => a + b, 0)
  bulat[bulat.length - 1] = Math.round((bulat[bulat.length - 1] + selisih) * 100) / 100
  return Object.fromEntries(ids.map((id, i) => [id, keTeks(bulat[i])]))
}

/**
 * Halaman sendiri di panel Kemahasiswaan; di panel super admin dipasang sebagai tab (`tertanam`: tanpa judul
 * halaman). `aspekAwal`/`onPilihAspek` menyamakan aspek terpilih dengan tab lain, dan `onPerubahan(ada)`
 * melaporkan ada/tidaknya perubahan yang belum disimpan.
 */
export default function Kurikulum({ tertanam = false, aspekAwal, onPilihAspek, onPerubahan } = {}) {
  const t = useTeks()
  const versi = useStore()
  const daftarAspek = useMemo(() => getAspekList(), [versi])
  const tersimpan = useMemo(() => susunanBobot(), [versi])
  const [draf, setDraf] = useState(() => keDraf(susunanBobot()))
  const [pilih, setPilih] = useState(() => aspekAwal ?? daftarAspek[0]?.id ?? null)
  const [alasan, setAlasan] = useState('')
  const [pesan, setPesan] = useState('')
  const [menunggu, setMenunggu] = useState(null)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const { user } = useAuth()
  const adminBiasa = user?.role === 'admin' && !user.superAdmin

  const usulan = useMemo(() => dariDraf(draf), [draf])
  const masalah = useMemo(() => periksaBobot(usulan), [usulan, versi])
  const beda = useMemo(() => bedaBobot(tersimpan, usulan), [tersimpan, usulan])
  const adaPerubahan = beda.pengaturan.length > 0 || beda.aspek.length > 0
  const lapor = useRef(onPerubahan)
  lapor.current = onPerubahan
  useEffect(() => lapor.current?.(adaPerubahan), [adaPerubahan])
  const salahAspek = new Set(masalah.map((m) => m.aspekId).filter(Boolean))
  const salahKunci = new Set(masalah.map((m) => m.kunci).filter(Boolean))

  // Dampak dihitung dari seluruh mahasiswa, jadi ditunda supaya mengetik tetap lancar.
  const drafTunda = useDeferredValue(draf)
  const dampak = useMemo(() => {
    const u = dariDraf(drafTunda)
    if (periksaBobot(u).length) return null
    const b = bedaBobot(susunanBobot(), u)
    if (!b.pengaturan.length && !b.aspek.length) return null
    // Daftar lengkap (bukan hanya contoh) supaya bisa diketahui apakah ada mahasiswa yang sudah lewat Semester 3.
    return dampakBobot(STUDENTS, u, STUDENTS.length)
  }, [drafTunda, versi])
  const dampakSiap = drafTunda === draf && dampak != null
  // Bobot dari admin biasa SELALU menunggu super admin, apa pun angkatannya (rapat 24 Okt 2026; UBAH_BOBOT di
  // src/server/persetujuan.js): bobot menentukan nilai, dan admin hanya membaca nilai.
  const perluPersetujuan = adminBiasa && dampakSiap
  const alasanWajib = dampakSiap && (dampak.terkunci > 0 || perluPersetujuan)

  const aspek = daftarAspek.find((a) => a.id === pilih) ?? daftarAspek[0]
  const ubahAspek = (aspekId, isi) => setDraf((d) => ({ ...d, aspek: { ...d.aspek, [aspekId]: isi } }))
  const ubahPengaturan = (kunci, isi) => setDraf((d) => ({ ...d, pengaturan: { ...d.pengaturan, [kunci]: isi } }))
  // Kembali ke rata: angka per sumber yang tersembunyi dikembalikan, supaya tidak ada perubahan yang tak terlihat.
  const gantiMode = (mode) =>
    setDraf((d) => ({
      ...d,
      pengaturan:
        mode === 'merata'
          ? { ...keDraf(tersimpan).pengaturan, MODE_BOBOT_KOMPONEN: mode }
          : { ...d.pengaturan, MODE_BOBOT_KOMPONEN: mode },
    }))

  function batal() {
    setDraf(keDraf(tersimpan))
    setAlasan('')
    setGalat('')
  }

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    setGalat('')
    setPesan('')
    setMenunggu(null)
    setSibuk(true)
    try {
      const hasil = await simpanBobot({ ...usulan, alasan: alasan.trim() })
      // Menunggu super admin: bobot belum berubah, jadi isian kembali ke yang tersimpan.
      setDraf(keDraf(susunanBobot()))
      setAlasan('')
      if (menungguPersetujuan(hasil)) {
        setMenunggu(hasil)
        return
      }
      setPesan(
        hasil.dampak?.berubah
          ? t('Bobot tersimpan. Nilai {n} mahasiswa dihitung ulang dengan bobot baru.', { n: hasil.dampak.berubah })
          : t('Bobot tersimpan.'),
      )
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="space-y-6">
      {tertanam ? (
        <p className="max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t('Atur bobot komponen asesmen di setiap aspek. Bobot berlaku untuk semua angkatan, dan nilai yang sudah masuk langsung dihitung ulang dengannya.')}
        </p>
      ) : (
        <JudulHalaman
          judul={t('Kurikulum CPMK')}
          keterangan={t('Atur bobot komponen asesmen di setiap aspek. Bobot berlaku untuk semua angkatan, dan nilai yang sudah masuk langsung dihitung ulang dengannya.')}
        />
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {daftarAspek.map((a) => {
          const manual = draf.aspek[a.id] != null
          const diubah = beda.aspek.includes(a.id)
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  setPilih(a.id)
                  onPilihAspek?.(a.id)
                }}
                aria-pressed={a.id === aspek?.id}
                className={
                  // flex-col, bukan block: isi <button> diletakkan di tengah secara vertikal, jadi kartu berisi
                  // satu baris nama tampak turun dibanding kartu bernama dua baris di sebelahnya.
                  'card flex h-full w-full flex-col p-3.5 text-left transition hover:border-brand-ink hover:shadow-pop motion-safe:hover:-translate-y-0.5 ' +
                  (a.id === aspek?.id ? 'border-brand-ink bg-brand-soft' : '')
                }
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[15px] font-extrabold tracking-tight text-ink">{a.kode}</span>
                  <StatusTeks kuat={manual}>{t(manual ? 'Manual' : 'Otomatis')}</StatusTeks>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{a.nama}</span>
                <span className="mt-2 block text-[12px] text-ink-3">
                  {t('{n} komponen', { n: getKomponen(a.id).length })}
                  {diubah ? ' · ' + t('diubah') : ''}
                </span>
                {salahAspek.has(a.id) ? (
                  <span className="mt-1 block text-[12px] font-bold text-[var(--critical)]">{t('Perlu diperbaiki')}</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {aspek ? (
        <EditorAspek
          key={aspek.id}
          aspek={aspek}
          isian={draf.aspek[aspek.id]}
          usulan={usulan}
          mode={draf.pengaturan.MODE_BOBOT_KOMPONEN}
          salah={salahAspek.has(aspek.id)}
          onUbah={(isi) => ubahAspek(aspek.id, isi)}
        />
      ) : null}

      <PengaturanOtomatis
        pengaturan={draf.pengaturan}
        salahKunci={salahKunci}
        onMode={gantiMode}
        onUbah={ubahPengaturan}
      />

      <Card>
        <CardHeader
          title={t('Tinjau dan simpan')}
          subtitle={
            adaPerubahan
              ? t('{n} bagian diubah dan belum disimpan', { n: beda.pengaturan.length + beda.aspek.length })
              : t('Belum ada perubahan')
          }
          icon={IconCheck}
        />
        <div className="space-y-4 px-5 py-5 sm:px-6">
          {!adaPerubahan ? (
            menunggu ? (
              <PesanMenunggu hasil={menunggu} keterangan={t('Perubahan bobot dari admin baru berlaku setelah Super Admin menyetujuinya.')} />
            ) : pesan ? (
              <p role="status" className="animate-rise text-[14.5px] font-bold text-ink">
                {pesan}
              </p>
            ) : (
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {t('Ubah bobot salah satu aspek di atas untuk melihat dampaknya pada nilai mahasiswa di sini.')}
              </p>
            )
          ) : masalah.length ? (
            <PesanGalat>{t('Perbaiki isian yang ditandai lebih dulu: porsi setiap kelompok harus berjumlah 100.')}</PesanGalat>
          ) : dampakSiap ? (
            <Dampak dampak={{ ...dampak, daftar: dampak.daftar.slice(0, BATAS_CONTOH) }} />
          ) : (
            <p className="text-[13.5px] text-ink-2">{t('Menghitung dampak…')}</p>
          )}

          {adaPerubahan && !masalah.length ? (
            <form onSubmit={simpan} className="space-y-4">
              {perluPersetujuan ? (
                <CatatanPersetujuan
                  pesan={t('Perubahan bobot dari admin dikirim ke Super Admin sebagai permintaan dan baru berlaku setelah disetujui. Alasan wajib diisi.')}
                />
              ) : null}
              <label className="block max-w-xl">
                <span className="mb-1.5 block label">
                  {t(alasanWajib ? 'Alasan perubahan (wajib)' : 'Alasan perubahan (opsional)')}
                </span>
                <input
                  className="field !py-2.5"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder={t('Wajib, minimal 10 karakter, bila nilai angkatan sudah disahkan atau aspek sudah final')}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={sibuk || !dampakSiap || (alasanWajib && alasan.trim().length < ALASAN_MIN)}
                >
                  <IconCheck size={17} />
                  {t(perluPersetujuan ? 'Ajukan ke Super Admin' : 'Simpan bobot')}
                </button>
                <button type="button" className="btn-ghost" disabled={sibuk} onClick={batal}>
                  <IconUndo size={16} />
                  {t('Batalkan perubahan')}
                </button>
              </div>
            </form>
          ) : adaPerubahan ? (
            <button type="button" className="btn-ghost" onClick={batal}>
              <IconUndo size={16} />
              {t('Batalkan perubahan')}
            </button>
          ) : null}

          {galat ? <PesanGalat>{galat}</PesanGalat> : null}
        </div>
        <div className="px-5 pb-4 sm:px-6">
          <CatatanKaki>
            {t('Setiap penyimpanan tercatat di log aktivitas beserta bobot sebelum dan sesudahnya. Nilai yang diinput tidak berubah; yang berubah hanya porsinya dalam nilai aspek.')}
          </CatatanKaki>
        </div>
      </Card>
    </div>
  )
}

function PesanGalat({ children }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
    >
      <IconAlert size={16} className="mt-px shrink-0" />
      {children}
    </p>
  )
}

/* ------------------------------ bobot satu aspek --------------------------- */

// Judul kolom huruf biasa (JUDUL_KOLOM), sama dengan tabel lain di panel ini; dulu huruf kapital kecil 11px.
const TH = JUDUL_KOLOM + ' px-4 text-left'

function EditorAspek({ aspek, isian, usulan, mode, salah, onUbah }) {
  const t = useTeks()
  const komponen = getKomponen(aspek.id)
  const ids = komponen.map((k) => k.id)
  const manual = isian != null
  const berlaku = bobotKomponen(aspek.id)
  const baru = manual ? petaAngka(isian) : porsiBobot(usulan, aspek.id)
  const total = jumlah(baru)
  const pilihan = [
    { manual: false, label: t('Dibagi otomatis') },
    { manual: true, label: t('Atur manual') },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={aspek.kode + ' ' + aspek.nama}
        subtitle={t('Semester {n} · {k} komponen asesmen', { n: aspek.semester, k: komponen.length })}
      />
      <div className="space-y-3 px-5 pt-4 sm:px-6">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{t('Cara menentukan bobot aspek ini')}</legend>
          {pilihan.map((p) => (
            <label
              key={String(p.manual)}
              className={
                'inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-[13.5px] font-semibold ' +
                (manual === p.manual ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2')
              }
            >
              <input
                type="radio"
                name={'cara-' + aspek.id}
                checked={manual === p.manual}
                onChange={() => onUbah(p.manual ? porsiAwal(baru, ids) : null)}
                className="accent-[var(--brand)]"
              />
              {p.label}
            </label>
          ))}
        </fieldset>
        <p className="text-[13px] leading-relaxed text-ink-2">
          {manual
            ? t('Isi porsi setiap komponen dalam persen. Jumlahnya harus 100.')
            : mode === 'merata'
              ? t('Porsi dibagi rata ke semua komponen aspek ini.')
              : t('Porsi diturunkan dari bobot per sumber dan per jenis penilaian MK di bawah.')}
        </p>
      </div>

      <GulirTabel className="mt-4">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-y border-line bg-surface-2">
              <th className={TH}>{t('Komponen asesmen')}</th>
              <th className={TH}>{t('Sumber')}</th>
              <th className={TH + ' text-right'}>{t('Porsi berlaku')}</th>
              <th className={TH + ' text-right'}>{t('Porsi baru')}</th>
            </tr>
          </thead>
          <tbody>
            {komponen.map((k) => {
              const angka = baru[k.id]
              const tidakSah = manual && !(Number.isFinite(angka) && angka >= 0 && angka <= 100)
              return (
                <tr key={k.id} className="border-b border-line align-middle last:border-0">
                  <td className="px-4 py-3">
                    <span className="text-[14px] font-semibold text-ink">{k.label}</span>{' '}
                    {k.status === 'draft' ? <TandaDraft>{t('draft')}</TandaDraft> : null}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-2">
                    {SUMBER[k.sumber]?.label ?? k.sumber}
                    {k.jenis ? ' · ' + t(LABEL_JENIS[k.jenis] ?? k.jenis) : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] tabular-nums text-ink-2">{persen(berlaku[k.id])}</td>
                  <td className="px-4 py-3 text-right">
                    {manual ? (
                      <span className="inline-flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={isian[k.id] ?? ''}
                          onChange={(e) => onUbah({ ...isian, [k.id]: e.target.value })}
                          aria-label={t('Porsi baru {label}', { label: k.label })}
                          aria-invalid={tidakSah || undefined}
                          className={'field !w-24 !px-3 !py-2 text-right tabular-nums ' + (tidakSah ? '!border-[var(--critical)]' : '')}
                        />
                        <span className="text-[13px] text-ink-2">%</span>
                      </span>
                    ) : (
                      <span className="text-[13.5px] font-semibold tabular-nums text-ink">{persen(angka)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-surface-2">
              <td className="px-4 py-3 text-[13px] font-bold text-ink" colSpan={2}>
                {t('Jumlah')}
              </td>
              <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-ink-2">{persen(jumlah(berlaku))}</td>
              <td
                className={
                  'px-4 py-3 text-right text-[13px] font-bold tabular-nums ' +
                  (salah ? 'text-[var(--critical)]' : 'text-ink')
                }
              >
                {persen(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </GulirTabel>
      {salah ? (
        <div className="px-5 pb-4 pt-3 sm:px-6">
          <PesanGalat>
            {Number.isFinite(total)
              ? t('Jumlah porsi harus 100%, sekarang {n}. Setiap isian berupa angka 0–100 dengan paling banyak dua desimal.', { n: persen(total) })
              : t('Setiap komponen harus diisi angka 0–100 dengan paling banyak dua desimal.')}
          </PesanGalat>
        </div>
      ) : null}
    </Card>
  )
}

/* ------------------------- cara membagi bobot otomatis --------------------- */

function PengaturanOtomatis({ pengaturan, salahKunci, onMode, onUbah }) {
  const t = useTeks()
  const mode = pengaturan.MODE_BOBOT_KOMPONEN
  const pilihan = [
    {
      mode: 'merata',
      label: t('Rata ke semua komponen'),
      keterangan: t('Setiap komponen dalam satu aspek mendapat porsi yang sama, apa pun sumber dan jenisnya.'),
    },
    {
      mode: 'per-sumber',
      label: t('Menurut sumber dan jenis penilaian'),
      keterangan: t('Porsi dibagi dulu per sumber penilaian, lalu porsi MK Humaniora dibagi lagi per jenis penilaian.'),
    },
  ]

  return (
    <Card>
      <CardHeader
        title={t('Cara membagi bobot otomatis')}
        subtitle={t('Dipakai semua aspek yang bobotnya tidak diatur manual.')}
      />
      <div className="space-y-5 px-5 py-5 sm:px-6">
        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="sr-only">{t('Cara membagi bobot otomatis')}</legend>
          {pilihan.map((p) => (
            <label
              key={p.mode}
              className={
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ' +
                (mode === p.mode ? 'border-brand-ink bg-brand-soft' : 'border-line hover:bg-surface-2')
              }
            >
              <input
                type="radio"
                name="mode-bobot"
                checked={mode === p.mode}
                onChange={() => onMode(p.mode)}
                className="mt-1 accent-[var(--brand)]"
              />
              <span>
                <span className="block text-[14px] font-bold text-ink">{p.label}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{p.keterangan}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === 'per-sumber' ? (
          <div className="grid gap-6 md:grid-cols-2">
            <GrupAngka
              judul={t('Bobot per sumber')}
              kunci={ISI_PENGATURAN.BOBOT_SUMBER}
              label={(id) => SUMBER[id]?.label ?? id}
              isian={pengaturan.BOBOT_SUMBER}
              salah={salahKunci.has('BOBOT_SUMBER')}
              onUbah={(isi) => onUbah('BOBOT_SUMBER', isi)}
            />
            <GrupAngka
              judul={t('Bobot per jenis penilaian MK Humaniora')}
              kunci={ISI_PENGATURAN.BOBOT_KOMPONEN_MK}
              label={(id) => t(LABEL_JENIS[id] ?? id)}
              isian={pengaturan.BOBOT_KOMPONEN_MK}
              salah={salahKunci.has('BOBOT_KOMPONEN_MK')}
              onUbah={(isi) => onUbah('BOBOT_KOMPONEN_MK', isi)}
            />
          </div>
        ) : null}
        {mode === 'per-sumber' ? (
          <CatatanKaki>
            {t('Sumber atau jenis yang tidak ada di sebuah aspek dilewati, lalu sisanya dibagi ulang supaya aspek itu tetap berjumlah 100.')}
          </CatatanKaki>
        ) : null}
      </div>
    </Card>
  )
}

function GrupAngka({ judul, kunci, label, isian, salah, onUbah }) {
  const t = useTeks()
  const total = jumlah(petaAngka(isian))
  return (
    <fieldset>
      <legend className="mb-2 text-[13.5px] font-bold text-ink">{judul}</legend>
      <ul className="space-y-2">
        {kunci.map((id) => (
          <li key={id} className="flex items-center justify-between gap-3">
            <span className="text-[13.5px] text-ink-2">{label(id)}</span>
            <span className="inline-flex items-center gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={isian?.[id] ?? ''}
                onChange={(e) => onUbah({ ...isian, [id]: e.target.value })}
                aria-label={judul + ': ' + label(id)}
                className="field !w-24 !px-3 !py-2 text-right tabular-nums"
              />
              <span className="text-[13px] text-ink-2">%</span>
            </span>
          </li>
        ))}
      </ul>
      <p
        className={
          'mt-2 flex justify-between border-t border-line pt-2 text-[13px] font-bold tabular-nums ' +
          (salah ? 'text-[var(--critical)]' : 'text-ink')
        }
      >
        <span>{t('Jumlah')}</span>
        <span>{persen(total)}</span>
      </p>
      {salah ? <p className="mt-1 text-[12.5px] font-semibold text-[var(--critical)]">{t('Harus berjumlah 100%.')}</p> : null}
    </fieldset>
  )
}

/* ---------------------------------- dampak --------------------------------- */

/** Dipakai juga KelolaAspek.jsx; `kosong` = kalimat bila tidak ada nilai yang berubah. */
export function Dampak({ dampak, kosong = null }) {
  const t = useTeks()
  if (!dampak.berubah) {
    return (
      <p className="text-[13.5px] leading-relaxed text-ink-2">
        {kosong ??
          t('Tidak ada nilai mahasiswa yang berubah, karena aspek yang diubah belum punya nilai yang masuk. Bobot baru berlaku untuk nilai yang masuk berikutnya.')}
      </p>
    )
  }

  const rincian = [
    dampak.jadiBelumLengkap ? t('{n} menjadi belum lengkap', { n: dampak.jadiBelumLengkap }) : null,
    dampak.naik ? t('{n} naik huruf mutu', { n: dampak.naik }) : null,
    dampak.turun ? t('{n} turun huruf mutu', { n: dampak.turun }) : null,
    dampak.jadiLayak ? t('{n} menjadi berhak atas sertifikat', { n: dampak.jadiLayak }) : null,
    dampak.tidakLagiLayak ? t('{n} tidak lagi berhak atas sertifikat', { n: dampak.tidakLagiLayak }) : null,
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[14.5px] font-bold text-ink">
          {t('Bila disimpan, nilai {n} dari {total} mahasiswa berubah.', { n: dampak.berubah, total: dampak.total })}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          {rincian.length ? rincian.join(' · ') : t('Huruf mutu dan kelayakan sertifikat tidak ada yang berubah.')}
        </p>
      </div>

      {dampak.terkunci ? (
        <p className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-ink">
          <IconLock size={16} className="mt-px shrink-0" />
          <span>
            {t('{n} di antaranya ada di angkatan yang sudah disahkan atau aspek yang sudah ditandai final. Alasan wajib diisi dan ikut tercatat.', {
              n: dampak.terkunci,
            })}
            {dampak.angkatanTerkunci.length ? ' ' + t('Angkatan: {daftar}.', { daftar: dampak.angkatanTerkunci.join(', ') }) : ''}
          </span>
        </p>
      ) : null}

      <GulirTabel className="rounded-xl border border-line">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {['NIM', 'Nama', 'Angkatan', 'Aspek yang berubah', 'Nilai akhir'].map((h) => (
                <th key={h} className={TH}>
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dampak.daftar.map((x) => (
              <tr key={x.nim} className="border-b border-line align-top last:border-0">
                <td className="px-4 py-3 text-[12.5px] tabular-nums text-ink-2">{x.nim}</td>
                <td className="px-4 py-3 text-[13.5px] font-semibold text-ink">
                  {x.nama}
                  {x.terkunci ? (
                    <span className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-ink-3">
                      <IconLock size={12} />
                      {t('Sudah final')}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[13px] text-ink-2">{x.angkatan}</td>
                <td className="px-4 py-3 text-[13px] text-ink-2">
                  {daftarKode(x.aspek.map((id) => getAspek(id) ?? id)) || '–'}
                </td>
                <td className="px-4 py-3 text-[13.5px] tabular-nums text-ink">
                  {(x.nilaiSebelum ?? '–') + ' → '}
                  <strong>{x.nilaiSesudah ?? '–'}</strong>
                  {x.layakSebelum !== x.layakSesudah ? (
                    <span className="block text-[12px] font-semibold text-ink-2">
                      {t(x.layakSesudah ? 'menjadi berhak sertifikat' : 'tidak lagi berhak sertifikat')}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GulirTabel>
      {dampak.berubah > dampak.daftar.length ? (
        <p className="text-[12.5px] text-ink-2">
          {t('Ditampilkan {n} dari {total} mahasiswa yang berubah.', { n: dampak.daftar.length, total: dampak.berubah })}
        </p>
      ) : null}
    </div>
  )
}
