import { useState } from 'react'
import { Select } from '../../components/Ui'
import { IconAlert, IconCheck, IconHapus, IconPlus, IconUndo } from '../../components/Icons'
import { useTeks } from '../../lib/bahasa'
import { MATRIKS_SA, ubahMatriks } from '../../lib/store'
import { JENIS, KETERANGAN_MAKS, LABEL_JENIS, PERAN, TINDAKAN_MAKS, TINDAKAN_MIN, barisBawaan, kunciSel } from '../../lib/wewenang'

/* Formulir mengubah matriks Peran & Wewenang (pilihan 6 Nov 2026): keterangan per sel, dan baris kebijakan tertulis
   (tambah, ubah, arsipkan, pulihkan). Semuanya hanya tulisan, tidak dijaga server. Muncul di bawah tabel, seperti
   formulir sakelar. Lihat ubahMatriks di src/server/wewenang.js dan README.md › Panel Super Admin › Peran & Wewenang. */

// Sama dengan ALASAN_MIN di src/server/nilai.js; server tetap yang memutuskan.
const ALASAN_MIN = 10
const KELAS_FORMULIR = 'space-y-4 border-t border-line bg-surface-2/60 px-5 py-5 sm:px-6'

/** Mengirim satu perubahan matriks. Bila berhasil, `onSelesai(kabar)` menutup formulir; galat tampil di formulir. */
function useKirim(onSelesai) {
  const t = useTeks()
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  async function kirimMatriks(isi, kabar) {
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      await ubahMatriks(isi)
      onSelesai(kabar)
    } catch (err) {
      setGalat(t(err.message))
      setSibuk(false)
    }
  }
  return { sibuk, galat, kirimMatriks }
}

function IsianAlasan({ alasan, onAlasan }) {
  const t = useTeks()
  return (
    <label className="block max-w-xl">
      <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_MIN })}</span>
      <input className="field !py-2.5" value={alasan} onChange={(e) => onAlasan(e.target.value)} />
    </label>
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

/** Isi satu sel sebagai kalimat pendek: 'Ya, hanya miliknya', 'Selalu perlu persetujuan'. */
function teksIsiSel(t, jenis, catatan) {
  return [t(jenis === 'syarat' ? 'Ya' : LABEL_JENIS[jenis] ?? jenis), catatan ? t(catatan) : null].filter(Boolean).join(', ')
}

/** Keterangan Super Admin untuk satu sel: baris bawaan (kode) atau baris kebijakan tertulis ('T-<id>'). */
export function FormKeterangan({ baris, peran, onSelesai, onBatal }) {
  const t = useTeks()
  const bawaan = barisBawaan(baris)
  const tambahan = bawaan ? null : MATRIKS_SA.tambahan.find((b) => b.id === baris)
  const nama = bawaan ? t(bawaan.tindakan) : (tambahan?.tindakan ?? baris)
  const lama = MATRIKS_SA.keterangan[kunciSel(baris, peran)] ?? ''
  const [teks, setTeks] = useState(lama)
  const [alasan, setAlasan] = useState('')
  const { sibuk, galat, kirimMatriks } = useKirim(onSelesai)
  const baru = teks.trim()
  const kurangAlasan = alasan.trim().length < ALASAN_MIN
  const isiSel = bawaan
    ? teksIsiSel(t, ...bawaan.izin[PERAN.indexOf(peran)])
    : teksIsiSel(t, tambahan?.izin?.[peran] ?? 'tidak')

  function simpan(teksBaru) {
    const isi = { tindakan: nama, peran: t(peran) }
    kirimMatriks(
      { aksi: 'keterangan', baris, peran, teks: teksBaru, alasan: alasan.trim() },
      teksBaru
        ? t('Keterangan untuk {peran} pada "{tindakan}" tersimpan.', isi)
        : t('Keterangan untuk {peran} pada "{tindakan}" dihapus.', isi),
    )
  }

  return (
    <form
      id="ubah-matriks"
      onSubmit={(e) => {
        e.preventDefault()
        if (baru !== lama && !kurangAlasan) simpan(baru)
      }}
      className={KELAS_FORMULIR}
    >
      <div>
        <p className="text-[14px] font-bold text-ink">
          {t('Keterangan: {tindakan}', { tindakan: nama })}
          <span className="ml-2 text-[12.5px] font-semibold text-ink-2">{t(peran)}</span>
        </p>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          {bawaan
            ? t('Isi sel dari aturan server: {isi}. Keterangan hanya menambah penjelasan; isinya tidak berubah.', { isi: isiSel })
            : t('Isi sel kebijakan tertulis: {isi}. Keterangan hanya tulisan dan tidak dijalankan server.', { isi: isiSel })}
        </p>
      </div>
      <label className="block max-w-xl">
        <span className="mb-1.5 flex items-baseline justify-between gap-3 label">
          <span>{t('Keterangan')}</span>
          <span className="tabular-nums">
            {baru.length}/{KETERANGAN_MAKS}
          </span>
        </span>
        <textarea
          className="field min-h-[84px] !py-2.5"
          maxLength={KETERANGAN_MAKS}
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          autoFocus
        />
      </label>
      <IsianAlasan alasan={alasan} onAlasan={setAlasan} />
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn-primary" disabled={sibuk || baru === lama || kurangAlasan}>
          <IconCheck size={16} />
          {t('Simpan keterangan')}
        </button>
        {lama ? (
          <button type="button" className="btn-ghost" disabled={sibuk || kurangAlasan} onClick={() => simpan('')}>
            <IconHapus size={16} />
            {t('Hapus keterangan')}
          </button>
        ) : null}
        <button type="button" className="btn-ghost" disabled={sibuk} onClick={onBatal}>
          {t('Batal')}
        </button>
      </div>
      {galat ? <PesanGalat>{galat}</PesanGalat> : null}
    </form>
  )
}

/** Menambah baris kebijakan tertulis (tanpa `id`), atau mengubah nama dan isi selnya ('T-<id>'). */
export function FormTindakan({ id = null, onSelesai, onBatal }) {
  const t = useTeks()
  const lama = id ? MATRIKS_SA.tambahan.find((b) => b.id === id) : null
  const [nama, setNama] = useState(lama?.tindakan ?? '')
  const [izin, setIzin] = useState(() => Object.fromEntries(PERAN.map((p) => [p, lama?.izin?.[p] ?? 'tidak'])))
  const [ket, setKet] = useState(() => Object.fromEntries(PERAN.map((p) => [p, ''])))
  const [alasan, setAlasan] = useState('')
  const { sibuk, galat, kirimMatriks } = useKirim(onSelesai)
  const namaRapi = nama.trim().replace(/\s+/g, ' ')
  const namaSah = namaRapi.length >= TINDAKAN_MIN && namaRapi.length <= TINDAKAN_MAKS
  const berubah = !lama || lama.tindakan !== namaRapi || PERAN.some((p) => lama.izin?.[p] !== izin[p])
  const bisaSimpan = namaSah && berubah && alasan.trim().length >= ALASAN_MIN && !sibuk

  function simpan(e) {
    e.preventDefault()
    if (!bisaSimpan) return
    const keterangan = Object.fromEntries(PERAN.filter((p) => ket[p].trim()).map((p) => [p, ket[p].trim()]))
    kirimMatriks(
      lama
        ? { aksi: 'ubah', id, tindakan: namaRapi, izin, alasan: alasan.trim() }
        : { aksi: 'tambah', tindakan: namaRapi, izin, keterangan, alasan: alasan.trim() },
      lama
        ? t('"{tindakan}" diperbarui.', { tindakan: namaRapi })
        : t('"{tindakan}" ditambahkan ke kebijakan tertulis.', { tindakan: namaRapi }),
    )
  }

  return (
    <form id="ubah-matriks" onSubmit={simpan} className={KELAS_FORMULIR}>
      <div>
        <p className="text-[14px] font-bold text-ink">{t(lama ? 'Ubah kebijakan tertulis' : 'Tambah tindakan sebagai kebijakan tertulis')}</p>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          {t('Baris ini hanya tulisan di matriks. Server tidak menjalankannya, jadi peran yang diberi Ya tidak otomatis bisa melakukannya.')}
        </p>
      </div>
      <label className="block max-w-xl">
        <span className="mb-1.5 flex items-baseline justify-between gap-3 label">
          <span>{t('Nama tindakan ({min} sampai {maks} karakter)', { min: TINDAKAN_MIN, maks: TINDAKAN_MAKS })}</span>
          <span className="tabular-nums">
            {namaRapi.length}/{TINDAKAN_MAKS}
          </span>
        </span>
        <input className="field !py-2.5" maxLength={TINDAKAN_MAKS} value={nama} onChange={(e) => setNama(e.target.value)} autoFocus />
      </label>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-bold text-ink">{t('Izin tiap peran')}</legend>
        {PERAN.map((p) => (
          <div key={p} className="space-y-2 rounded-xl border border-line bg-surface p-3">
            <Select label={t(p)} value={izin[p]} onChange={(v) => setIzin((s) => ({ ...s, [p]: v }))} options={JENIS} tampilkan={(j) => t(LABEL_JENIS[j])} />
            {lama ? null : (
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-2">{t('Keterangan (tidak wajib)')}</span>
                <input
                  className="field !py-2"
                  maxLength={KETERANGAN_MAKS}
                  value={ket[p]}
                  onChange={(e) => setKet((s) => ({ ...s, [p]: e.target.value }))}
                />
              </label>
            )}
          </div>
        ))}
      </fieldset>
      {lama ? (
        <p className="text-[12.5px] text-ink-3">{t('Keterangan tiap sel diubah lewat tombol keterangan di sel itu.')}</p>
      ) : null}
      <IsianAlasan alasan={alasan} onAlasan={setAlasan} />
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn-primary" disabled={!bisaSimpan}>
          {lama ? <IconCheck size={16} /> : <IconPlus size={16} />}
          {t(lama ? 'Simpan perubahan' : 'Tambahkan ke matriks')}
        </button>
        <button type="button" className="btn-ghost" disabled={sibuk} onClick={onBatal}>
          {t('Batal')}
        </button>
      </div>
      {galat ? <PesanGalat>{galat}</PesanGalat> : null}
    </form>
  )
}

/** Mengarsipkan baris kebijakan tertulis (hilang dari matriks), atau memulihkannya. */
export function FormArsip({ id, aksi, onSelesai, onBatal }) {
  const t = useTeks()
  const nama = MATRIKS_SA.tambahan.find((b) => b.id === id)?.tindakan ?? id
  const arsipkan = aksi === 'arsipkan'
  const [alasan, setAlasan] = useState('')
  const { sibuk, galat, kirimMatriks } = useKirim(onSelesai)
  const kurangAlasan = alasan.trim().length < ALASAN_MIN

  function simpan(e) {
    e.preventDefault()
    if (sibuk || kurangAlasan) return
    kirimMatriks(
      { aksi, id, alasan: alasan.trim() },
      arsipkan ? t('"{tindakan}" diarsipkan.', { tindakan: nama }) : t('"{tindakan}" dipulihkan ke matriks.', { tindakan: nama }),
    )
  }

  return (
    <form id="ubah-matriks" onSubmit={simpan} className={KELAS_FORMULIR}>
      <div>
        <p className="text-[14px] font-bold text-ink">
          {arsipkan ? t('Arsipkan kebijakan: {tindakan}', { tindakan: nama }) : t('Pulihkan kebijakan: {tindakan}', { tindakan: nama })}
        </p>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          {t(
            arsipkan
              ? 'Barisnya hilang dari matriks beserta keterangannya dan bisa dipulihkan dari daftar Diarsipkan. Riwayatnya tetap di Log Aktivitas.'
              : 'Barisnya tampil lagi di matriks beserta keterangannya.',
          )}
        </p>
      </div>
      <IsianAlasan alasan={alasan} onAlasan={setAlasan} />
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn-primary" disabled={sibuk || kurangAlasan}>
          {arsipkan ? <IconHapus size={16} /> : <IconUndo size={16} />}
          {t(arsipkan ? 'Arsipkan sekarang' : 'Pulihkan sekarang')}
        </button>
        <button type="button" className="btn-ghost" disabled={sibuk} onClick={onBatal}>
          {t('Batal')}
        </button>
      </div>
      {galat ? <PesanGalat>{galat}</PesanGalat> : null}
    </form>
  )
}
