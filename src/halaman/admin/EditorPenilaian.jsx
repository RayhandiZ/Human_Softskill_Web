import { useDeferredValue, useMemo, useState } from 'react'
import { IconAlert, IconCheck, IconChevronDown, IconLock, IconPlus, IconUndo, IconX } from '../../components/Icons'
import { JENIS_MK, RANAH, SUMBER_LIST, getAspek } from '../../lib/curriculum'
import { dampakDari } from '../../lib/bobot'
import { bobotKomponen } from '../../lib/scoring'
import {
  STATUS_KOMPONEN,
  bedaPenilaian,
  denganAspek,
  komponenSementara,
  periksaPenilaian,
  susunanPenilaian,
} from '../../lib/penilaian'
import { STUDENTS } from '../../lib/data'
import { menungguPersetujuan, simpanPenilaian, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { PesanMenunggu } from './PermintaanTerkirim'

/* Penilaian satu aspek di Input Manual: teks aspek, komponen asesmen, dan bobotnya. Super admin menyimpan
   langsung; admin biasa mengajukan ke super admin. Lihat src/server/penilaian.js dan README.md › Mengubah
   penilaian dari Input Manual. */

// Sama dengan ALASAN_MIN di src/server/nilai.js; server tetap yang memutuskan.
const ALASAN_MIN = 10
const LABEL_JENIS = { TUGAS: 'Tugas', SIKAP: 'Sikap', UTS: 'UTS', UAS: 'UAS' }
const LABEL_ASPEK = { nama: 'Nama aspek', pdp: 'Kegiatan PDP', mk: 'Mata kuliah', engagement: 'Kegiatan Kemahasiswaan' }

let kunciBaru = 0
const keTeks = (n) => (typeof n === 'number' ? String(n).replace('.', ',') : '')
const keAngka = (s) => {
  const t = String(s ?? '').trim().replace(',', '.')
  return t === '' ? NaN : Number(t)
}
const persen = (n) => (Number.isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '%' : '–')

function keDraf(s) {
  const aktif = s.komponen.filter((k) => k.aktif)
  return {
    aspek: Object.fromEntries(Object.entries(s.aspek).map(([b, v]) => [b, v ?? ''])),
    bobotManual: aktif.length > 0 && aktif.every((k) => typeof k.bobot === 'number'),
    komponen: s.komponen.map((k) => ({ ...k, kunci: k.id, jenis: k.jenis ?? '', bobot: keTeks(k.bobot) })),
  }
}

/** Draf layar → susunan penilaian yang dikirim ke server. */
function dariDraf(d) {
  return {
    aspek: d.aspek,
    komponen: d.komponen.map((k) => ({
      id: k.id,
      label: k.label,
      sumber: k.sumber,
      jenis: k.sumber === 'MK' ? k.jenis || null : null,
      ranah: k.ranah,
      status: k.status,
      aktif: k.aktif,
      bobot: d.bobotManual && k.aktif ? keAngka(k.bobot) : null,
    })),
  }
}

/** Komponen yang sudah punya nilai di data yang dimuat; sumbernya tidak bisa diganti (server tetap memeriksa). */
function komponenDinilai() {
  const hasil = new Set()
  for (const s of STUDENTS) for (const a of Object.values(s.nilai ?? {})) for (const id of Object.keys(a.komponen ?? {})) hasil.add(id)
  return hasil
}

export default function EditorPenilaian({ aspekId, sumberAwal }) {
  const t = useTeks()
  const versi = useStore()
  const { user } = useAuth()
  const superAdmin = Boolean(user?.superAdmin)
  const kodeAspek = (getAspek(aspekId)?.kode ?? aspekId).replace(/\.$/, '') // 'A.1.' → 'A.1'
  const tersimpan = useMemo(() => susunanPenilaian(aspekId), [aspekId, versi])
  const [draf, setDraf] = useState(() => keDraf(susunanPenilaian(aspekId)))
  const [alasan, setAlasan] = useState('')
  const [pesan, setPesan] = useState('')
  const [menunggu, setMenunggu] = useState(null)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  const dinilai = useMemo(() => komponenDinilai(), [versi])
  const usulan = useMemo(() => dariDraf(draf), [draf])
  const konteks = useMemo(
    () => ({
      idLama: new Set(tersimpan.komponen.map((k) => k.id)),
      dinilai,
      sumberLama: new Map(tersimpan.komponen.map((k) => [k.id, k.sumber])),
    }),
    [tersimpan, dinilai],
  )
  const masalah = useMemo(() => periksaPenilaian(usulan, konteks), [usulan, konteks])
  const beda = useMemo(() => bedaPenilaian(tersimpan, usulan), [tersimpan, usulan])

  // Pratinjau dihitung dari seluruh mahasiswa, jadi ditunda supaya mengetik tetap lancar.
  const drafTunda = useDeferredValue(draf)
  const dampak = useMemo(() => {
    const u = dariDraf(drafTunda)
    if (periksaPenilaian(u, konteks).length || !bedaPenilaian(tersimpan, u).ada) return null
    return dampakDari(STUDENTS, (fn) => denganAspek(aspekId, komponenSementara(aspekId, u), fn), 5)
  }, [drafTunda, konteks, tersimpan, aspekId])
  const dampakSiap = drafTunda === draf && dampak != null
  const alasanWajib = !superAdmin || (dampakSiap && dampak.terkunci > 0)

  // Porsi yang akan berlaku bila bobot dibagi otomatis, dipetakan balik ke baris aktif.
  const aktif = draf.komponen.filter((k) => k.aktif)
  const porsi = useMemo(() => {
    const sementara = komponenSementara(aspekId, { komponen: usulan.komponen.map((k) => ({ ...k, bobot: null })) })
    const p = denganAspek(aspekId, sementara, () => bobotKomponen(aspekId))
    return sementara.map((k) => p[k.id])
  }, [usulan, aspekId])
  const jumlahBobot = aktif.reduce((a, k) => a + keAngka(k.bobot), 0)

  const ubahAspek = (b, v) => setDraf((d) => ({ ...d, aspek: { ...d.aspek, [b]: v } }))
  const ubahKomponen = (kunci, tambal) =>
    setDraf((d) => ({ ...d, komponen: d.komponen.map((k) => (k.kunci === kunci ? { ...k, ...tambal } : k)) }))
  const geser = (kunci, arah) =>
    setDraf((d) => {
      const daftar = [...d.komponen]
      const i = daftar.findIndex((k) => k.kunci === kunci)
      const j = i + arah
      if (j < 0 || j >= daftar.length) return d
      ;[daftar[i], daftar[j]] = [daftar[j], daftar[i]]
      return { ...d, komponen: daftar }
    })
  const tambah = () =>
    setDraf((d) => ({
      ...d,
      komponen: [
        ...d.komponen,
        {
          kunci: 'baru-' + ++kunciBaru,
          id: null,
          label: '',
          sumber: sumberAwal ?? 'MK',
          jenis: (sumberAwal ?? 'MK') === 'MK' ? 'TUGAS' : '',
          ranah: 'kognitif',
          status: 'resmi',
          aktif: true,
          bobot: '',
        },
      ],
    }))
  // "Hapus": komponen lama masuk arsip (bisa dipulihkan); komponen baru yang belum tersimpan cukup dibuang.
  const hapus = (k) =>
    k.id == null
      ? setDraf((d) => ({ ...d, komponen: d.komponen.filter((x) => x.kunci !== k.kunci) }))
      : ubahKomponen(k.kunci, { aktif: false })
  const bagiRata = () =>
    setDraf((d) => {
      const n = d.komponen.filter((k) => k.aktif).length
      if (!n) return d
      const rata = Math.round(10000 / n) / 100
      let urut = 0
      return {
        ...d,
        bobotManual: true,
        komponen: d.komponen.map((k) => {
          if (!k.aktif) return k
          urut++
          const nilai = urut === n ? Math.round((100 - rata * (n - 1)) * 100) / 100 : rata
          return { ...k, bobot: keTeks(nilai) }
        }),
      }
    })

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
      const hasil = await simpanPenilaian({ aspekId, ...usulan, alasan: alasan.trim() })
      setDraf(keDraf(susunanPenilaian(aspekId)))
      setAlasan('')
      if (menungguPersetujuan(hasil)) setMenunggu(hasil)
      else setPesan(t('Penilaian {kode} tersimpan dan langsung berlaku untuk semua angkatan.', { kode: kodeAspek }))
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  const masalahBaris = (i) => masalah.filter((m) => m.indeks === i)
  const indeks = (k) => draf.komponen.indexOf(k)
  const arsip = draf.komponen.filter((k) => !k.aktif)

  return (
    <form onSubmit={simpan} className="space-y-5 border-b border-line bg-surface-2/60 px-5 py-5 sm:px-6">
      <div>
        <p className="text-[15px] font-bold text-ink">{t('Penilaian {kode}', { kode: kodeAspek })}</p>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-2">
          {t(
            superAdmin
              ? 'Ubah teks aspek, komponen asesmen, dan bobotnya. Perubahan langsung berlaku untuk semua angkatan; nilai yang sudah diinput tidak berubah.'
              : 'Ubah teks aspek, komponen asesmen, dan bobotnya. Perubahan dikirim ke Super Admin dan baru berlaku setelah disetujui.',
          )}
        </p>
      </div>

      {/* ------------------------------- teks aspek ------------------------------- */}
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-bold text-ink">{t('Aspek')}</legend>
        {['nama', 'pdp', 'mk', 'engagement'].map((b) => (
          <label key={b} className="block">
            <span className="mb-1.5 block label">{t(LABEL_ASPEK[b])}</span>
            <input className="field !py-2.5" value={draf.aspek[b] ?? ''} onChange={(e) => ubahAspek(b, e.target.value)} />
          </label>
        ))}
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block label">{t('Deskripsi')}</span>
          <textarea
            className="field !py-2.5"
            rows={3}
            value={draf.aspek.deskripsi ?? ''}
            onChange={(e) => ubahAspek('deskripsi', e.target.value)}
          />
        </label>
      </fieldset>

      {/* ---------------------------- komponen aktif ----------------------------- */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-bold text-ink">{t('Komponen asesmen')}</p>
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">{t('Cara menentukan bobot aspek ini')}</legend>
            {[
              { manual: false, label: t('Dibagi otomatis') },
              { manual: true, label: t('Atur manual') },
            ].map((p) => (
              <label
                key={String(p.manual)}
                className={
                  'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold ' +
                  (draf.bobotManual === p.manual ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line text-ink-2')
                }
              >
                <input
                  type="radio"
                  name={'bobot-' + aspekId}
                  checked={draf.bobotManual === p.manual}
                  onChange={() => (p.manual ? bagiRata() : setDraf((d) => ({ ...d, bobotManual: false })))}
                  className="accent-[var(--brand)]"
                />
                {p.label}
              </label>
            ))}
            {draf.bobotManual ? (
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-[12.5px]" onClick={bagiRata}>
                {t('Bagi rata')}
              </button>
            ) : null}
          </fieldset>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {['Urutan', 'Komponen', 'Sumber', 'Jenis', 'Ranah', 'Status', 'Bobot', 'Aksi'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aktif.map((k, n) => {
                const kunciSumber = k.id != null && dinilai.has(k.id)
                const salah = masalahBaris(indeks(k)).length > 0
                return (
                  <tr key={k.kunci} className={'border-b border-line align-top last:border-0 ' + (salah ? 'bg-[color-mix(in_srgb,var(--critical)_6%,transparent)]' : '')}>
                    <td className="px-3 py-2.5">
                      <span className="flex gap-1">
                        <button type="button" className="btn-ghost !px-2 !py-1 text-[12px]" aria-label={t('Naikkan {label}', { label: k.label || t('komponen baru') })} disabled={n === 0} onClick={() => geser(k.kunci, -1)}>
                          ↑
                        </button>
                        <button type="button" className="btn-ghost !px-2 !py-1 text-[12px]" aria-label={t('Turunkan {label}', { label: k.label || t('komponen baru') })} disabled={n === aktif.length - 1} onClick={() => geser(k.kunci, 1)}>
                          ↓
                        </button>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        className="field !min-w-[220px] !px-3 !py-2"
                        value={k.label}
                        onChange={(e) => ubahKomponen(k.kunci, { label: e.target.value })}
                        aria-label={t('Nama komponen')}
                        placeholder={t('Misalnya: Tugas 3: Refleksi akhir')}
                      />
                      <span className="mt-1 block font-mono text-[10.5px] text-ink-3">{k.id ?? t('baru, ID dibuat saat disimpan')}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        className="field !px-2.5 !py-2"
                        value={k.sumber}
                        disabled={kunciSumber}
                        title={kunciSumber ? t('Sudah punya nilai: sumbernya tidak bisa diganti.') : undefined}
                        onChange={(e) =>
                          ubahKomponen(k.kunci, { sumber: e.target.value, jenis: e.target.value === 'MK' ? k.jenis || 'TUGAS' : '' })
                        }
                        aria-label={t('Sumber')}
                      >
                        {SUMBER_LIST.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      {kunciSumber ? (
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-ink-3">
                          <IconLock size={11} />
                          {t('sudah dinilai')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      {k.sumber === 'MK' ? (
                        <select className="field !px-2.5 !py-2" value={k.jenis} onChange={(e) => ubahKomponen(k.kunci, { jenis: e.target.value })} aria-label={t('Jenis')}>
                          {JENIS_MK.map((j) => (
                            <option key={j} value={j}>
                              {t(LABEL_JENIS[j])}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[13px] text-ink-3">–</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <select className="field !px-2.5 !py-2" value={k.ranah} onChange={(e) => ubahKomponen(k.kunci, { ranah: e.target.value })} aria-label={t('Ranah')}>
                        {Object.values(RANAH).map((r) => (
                          <option key={r.id} value={r.id}>
                            {t(r.label)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <select className="field !px-2.5 !py-2" value={k.status} onChange={(e) => ubahKomponen(k.kunci, { status: e.target.value })} aria-label={t('Status')}>
                        {STATUS_KOMPONEN.map((s) => (
                          <option key={s} value={s}>
                            {t(s === 'resmi' ? 'Resmi' : 'Draft')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      {draf.bobotManual ? (
                        <span className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="field !w-20 !px-2.5 !py-2 text-right tabular-nums"
                            value={k.bobot}
                            onChange={(e) => ubahKomponen(k.kunci, { bobot: e.target.value })}
                            aria-label={t('Bobot {label}', { label: k.label || t('komponen baru') })}
                          />
                          <span className="text-[12.5px] text-ink-2">%</span>
                        </span>
                      ) : (
                        <span className="text-[13px] tabular-nums text-ink">{persen(porsi[n])}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold text-ink-2 transition hover:border-[var(--critical)] hover:text-[var(--critical)]"
                        onClick={() => hapus(k)}
                      >
                        <IconX size={13} />
                        {t(k.id == null ? 'Batal' : 'Hapus')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface-2">
                <td className="px-3 py-2.5" colSpan={6}>
                  <button type="button" className="btn-ghost !px-3 !py-1.5 text-[12.5px]" onClick={tambah}>
                    <IconPlus size={15} />
                    {t('Tambah komponen')}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-[12.5px] font-bold tabular-nums text-ink" colSpan={2}>
                  {draf.bobotManual ? t('Jumlah {n}', { n: persen(jumlahBobot) }) : t('Dibagi otomatis')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
          {t('Hapus memindahkan komponen ke arsip: tidak tampil dan tidak dihitung, tetapi nilainya tetap tersimpan dan bisa dipulihkan. Komponen yang sudah punya nilai tidak bisa diganti sumbernya.')}
        </p>
      </div>

      {/* --------------------------------- arsip --------------------------------- */}
      {arsip.length ? (
        <details className="rounded-xl border border-line bg-surface px-4 py-3">
          <summary className="flex cursor-pointer items-center gap-2 text-[13px] font-bold text-ink">
            <IconChevronDown size={15} />
            {t('Arsip komponen ({n})', { n: arsip.length })}
          </summary>
          <ul className="mt-3 divide-y divide-line">
            {arsip.map((k) => (
              <li key={k.kunci} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-[13px] text-ink-2">
                  <span className="font-semibold text-ink">{k.label}</span> · {k.id}
                </span>
                <button type="button" className="btn-ghost !px-3 !py-1.5 text-[12.5px]" onClick={() => ubahKomponen(k.kunci, { aktif: true, bobot: draf.bobotManual ? '0' : '' })}>
                  <IconUndo size={14} />
                  {t('Pulihkan')}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* --------------------------- pemeriksaan & dampak -------------------------- */}
      {masalah.length ? (
        <ul role="alert" className="space-y-1 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-4 py-3 text-[12.5px] font-semibold text-[var(--critical)]">
          {masalah.slice(0, 6).map((m, i) => (
            <li key={i} className="flex items-start gap-2">
              <IconAlert size={14} className="mt-px shrink-0" />
              {m.pesan}
            </li>
          ))}
        </ul>
      ) : beda.ada && dampakSiap ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink">
          <p className="font-bold">
            {dampak.berubah
              ? t('Bila disimpan, hasil {n} dari {total} mahasiswa berubah.', { n: dampak.berubah, total: dampak.total })
              : t('Tidak ada hasil mahasiswa yang berubah.')}
          </p>
          {dampak.berubah ? (
            <p className="mt-1 text-[12.5px] text-ink-2">
              {[
                dampak.jadiBelumLengkap ? t('{n} menjadi belum lengkap karena ada komponen baru', { n: dampak.jadiBelumLengkap }) : null,
                dampak.naik ? t('{n} naik huruf mutu', { n: dampak.naik }) : null,
                dampak.turun ? t('{n} turun huruf mutu', { n: dampak.turun }) : null,
                dampak.tidakLagiLayak ? t('{n} tidak lagi berhak atas sertifikat', { n: dampak.tidakLagiLayak }) : null,
                dampak.terkunci ? t('{n} di angkatan terkunci atau aspek final', { n: dampak.terkunci }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
          {beda.dipulihkan.length ? (
            <p className="mt-1 text-[12px] text-ink-3">
              {t('Nilai lama komponen yang dipulihkan ikut dihitung lagi; pratinjau di layar belum memasukkannya, server yang menghitungnya.')}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ---------------------------------- simpan ---------------------------------- */}
      {menunggu ? (
        <PesanMenunggu
          hasil={menunggu}
          keterangan={t('Perubahan penilaian oleh admin baru berlaku setelah Super Admin menyetujuinya.')}
        />
      ) : null}
      {pesan && !beda.ada ? (
        <p role="status" className="flex items-center gap-2 text-[13.5px] font-bold text-[var(--good)]">
          <IconCheck size={16} />
          {pesan}
        </p>
      ) : null}
      {galat ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]">
          <IconAlert size={16} className="mt-px shrink-0" />
          {galat}
        </p>
      ) : null}

      {beda.ada ? (
        <div className="space-y-3">
          <label className="block max-w-xl">
            <span className="mb-1.5 block label">{t(alasanWajib ? 'Alasan perubahan (wajib)' : 'Alasan perubahan (opsional)')}</span>
            <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="btn-primary"
              disabled={sibuk || masalah.length > 0 || (alasanWajib && alasan.trim().length < ALASAN_MIN)}
            >
              <IconCheck size={17} />
              {t(superAdmin ? 'Simpan penilaian' : 'Ajukan ke Super Admin')}
            </button>
            <button type="button" className="btn-ghost" disabled={sibuk} onClick={batal}>
              <IconUndo size={16} />
              {t('Batalkan perubahan')}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  )
}
