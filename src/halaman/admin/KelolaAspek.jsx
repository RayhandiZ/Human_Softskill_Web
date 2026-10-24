import { useDeferredValue, useMemo, useState } from 'react'
import { Card, CardHeader, CatatanKaki, Select } from '../../components/Ui'
import { IconAlert, IconCheck, IconDocument, IconHapus, IconPencil, IconPlus, IconUndo } from '../../components/Icons'
import {
  AREA,
  CLUSTER,
  JENIS_MK,
  RANAH,
  SUMBER_LIST,
  getArea,
  getAspek,
  getAspekArsip,
  getAspekSemester,
  getCluster,
  getKomponen,
} from '../../lib/curriculum'
import { ALASAN_ASPEK_MIN, dampakAspek, kodeAspekBaru, periksaAspek, rapikanIsiAspek, susunPerubahan } from '../../lib/aspek'
import { CONFIG } from '../../lib/config'
import { STUDENTS } from '../../lib/data'
import { menungguPersetujuan, simpanAspek, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import EditorPenilaian from './EditorPenilaian'
import { Dampak } from './Kurikulum'
import { PesanMenunggu } from './PermintaanTerkirim'

/* Mengelola aspek CPMK itu sendiri: tambah aspek baru beserta komponen pertamanya, ubah struktur (kode, semester,
   cluster), hapus (= arsip), dan pulihkan. Dua bentuk:
   - KelolaAspek (bawaan): kartu Struktur aspek, Tambah aspek, dan Aspek diarsipkan di bawah Penilaian & Bobot (super
     admin) dan Kurikulum CPMK (panel Kemahasiswaan);
   - AspekSemester: daftar aspek satu semester di Input & Import Nilai, dengan Edit (teks dan komponen lewat
     EditorPenilaian), Ubah, Hapus, dan Tambah aspek di semester itu.
   Super admin menyimpan langsung; admin biasa selalu mengajukan ke super admin. Aturannya di src/lib/aspek.js,
   penyimpanannya di src/server/aspek.js; lihat README.md › Mengelola aspek CPMK. */

const LABEL_JENIS = { TUGAS: 'Tugas', SIKAP: 'Sikap', UTS: 'UTS', UAS: 'UAS' }
const SEMESTER = () => Array.from({ length: CONFIG.TOTAL_SEMESTER_PROGRAM }, (_, i) => String(i + 1))
const labelCluster = (id) => {
  const c = CLUSTER.find((x) => x.id === id)
  return c ? c.id + ' · ' + c.nama : id
}
const labelArea = (id) => {
  const a = AREA.find((x) => x.id === id)
  return a ? a.id + ' · ' + a.nama : id
}
const clusterArea = (area) => CLUSTER.filter((c) => c.area === area)

export default function KelolaAspek({ aspekId, onPilih }) {
  useStore()
  const aspek = aspekId ? getAspek(aspekId) : null
  const arsip = getAspekArsip()
  // Mengarsipkan dan memulihkan menghilangkan panelnya sendiri, jadi pesan berhasilnya ditampilkan di sini.
  const [pesan, setPesan] = useState('')
  return (
    <div className="space-y-6">
      <PesanBerhasil pesan={pesan} />
      {aspek?.aktif ? <StrukturAspek key={aspek.id} aspek={aspek} onPesan={setPesan} /> : null}
      <TambahAspek onPilih={onPilih} />
      {arsip.length ? <DaftarArsip arsip={arsip} onPilih={onPilih} onPesan={setPesan} /> : null}
    </div>
  )
}

/* ------------------------------ bagian bersama ------------------------------ */

/** Pengirim aksi aspek: { sibuk, galat, pesan, menunggu, kirim(isi, sesudah) }; admin biasa mendapat `menunggu`. */
function useKirimAspek() {
  const [keadaan, setKeadaan] = useState({ sibuk: false, galat: '', pesan: '', menunggu: null })
  async function kirim(isi, sesudah) {
    if (keadaan.sibuk) return
    setKeadaan({ sibuk: true, galat: '', pesan: '', menunggu: null })
    try {
      const hasil = await simpanAspek(isi)
      if (menungguPersetujuan(hasil)) setKeadaan({ sibuk: false, galat: '', pesan: '', menunggu: hasil })
      else setKeadaan({ sibuk: false, galat: '', pesan: sesudah(hasil), menunggu: null })
    } catch (e) {
      setKeadaan({ sibuk: false, galat: e.message, pesan: '', menunggu: null })
    }
  }
  return { ...keadaan, kirim }
}

/** Pratinjau dampak, dihitung dari seluruh mahasiswa yang termuat (ditunda supaya mengetik tetap lancar). */
function useDampak(isi) {
  const versi = useStore()
  const tunda = useDeferredValue(isi)
  const hasil = useMemo(() => {
    const rapi = rapikanIsiAspek(tunda)
    // Alasan belum diisi tidak menghalangi pratinjau.
    if (periksaAspek({ ...rapi, alasan: 'x'.repeat(ALASAN_ASPEK_MIN) }).length) return null
    return dampakAspek(STUDENTS, susunPerubahan(rapi), 20)
  }, [tunda, versi])
  return tunda === isi ? hasil : undefined
}

function Isian({ label, onChange, multi = false, ...sisa }) {
  return (
    <label className="block">
      <span className="mb-1.5 block label">{label}</span>
      {multi ? (
        <textarea className="field min-h-[84px] !py-2.5" onChange={(e) => onChange(e.target.value)} {...sisa} />
      ) : (
        <input className="field !py-2.5" onChange={(e) => onChange(e.target.value)} {...sisa} />
      )}
    </label>
  )
}

function Galat({ pesan }) {
  if (!pesan) return null
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
    >
      <IconAlert size={16} className="mt-px shrink-0" />
      {pesan}
    </p>
  )
}

function PesanBerhasil({ pesan }) {
  return (
    <p role="status" className={pesan ? 'teks-baik flex items-center gap-2 text-[13.5px] font-semibold' : 'sr-only'}>
      {pesan ? <IconCheck size={16} className="shrink-0" /> : null}
      {pesan}
    </p>
  )
}

/** Hasil kirim: pesan berhasil, pemberitahuan menunggu super admin, atau galat. */
function HasilKirim({ k }) {
  const t = useTeks()
  return (
    <>
      {k.menunggu ? (
        <PesanMenunggu hasil={k.menunggu} keterangan={t('Perubahan aspek oleh admin selalu menunggu persetujuan Super Admin sebelum berlaku.')} />
      ) : null}
      <PesanBerhasil pesan={k.pesan} />
      <Galat pesan={k.galat} />
    </>
  )
}

/** Alasan, pratinjau dampak, dan tombol kirim; dipakai keempat aksi. */
function BagianKirim({ isi, alasan, onAlasan, label, bahaya = false, k, onBatal = null }) {
  const t = useTeks()
  const { user } = useAuth()
  const dampak = useDampak(isi)
  const masalah = periksaAspek(rapikanIsiAspek({ ...isi, alasan: 'x'.repeat(ALASAN_ASPEK_MIN) })).map((m) => m.pesan)
  // Isian struktur yang belum diubah bukan kesalahan; cukup diberi petunjuk.
  const belumDiubah = isi.aksi === 'ubah' && masalah.length === 1 && masalah[0].startsWith('Tidak ada perubahan')
  return (
    <div className="space-y-4">
      {belumDiubah ? (
        <p className="text-[13.5px] text-ink-2">{t('Ubah kode, semester, atau cluster untuk melihat dampaknya.')}</p>
      ) : masalah.length ? (
        // Pesan aturan yang sama dengan penolakan server, jadi ditampilkan apa adanya seperti galat server.
        <ul className="space-y-1 text-[13px] font-semibold text-[var(--critical)]">
          {masalah.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : dampak === undefined ? (
        <p className="text-[13.5px] text-ink-2">{t('Menghitung dampak…')}</p>
      ) : dampak ? (
        <Dampak
          dampak={dampak}
          kosong={t('Tidak ada nilai mahasiswa yang berubah. Angkatan yang sudah disahkan tidak ikut berubah.')}
        />
      ) : null}
      <label className="block max-w-xl">
        <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_ASPEK_MIN })}</span>
        <input className="field !py-2.5" value={alasan} onChange={(e) => onAlasan(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="submit"
          className={
            bahaya
              ? 'btn border border-[color-mix(in_srgb,var(--critical)_45%,transparent)] text-[var(--critical)] hover:bg-[color-mix(in_srgb,var(--critical)_10%,transparent)]'
              : 'btn-primary'
          }
          disabled={k.sibuk || masalah.length > 0 || alasan.trim().length < ALASAN_ASPEK_MIN}
        >
          <IconCheck size={16} />
          {user?.superAdmin ? label : t('Ajukan ke Super Admin')}
        </button>
        {onBatal ? (
          <button type="button" className="btn-ghost" disabled={k.sibuk} onClick={onBatal}>
            {t('Batal')}
          </button>
        ) : null}
      </div>
      <HasilKirim k={k} />
    </div>
  )
}

/* ------------------------------- formulir aksi -------------------------------- */

// Setiap formulir memanggil onSelesai(pesan) sesudah tersimpan; tanpa onSelesai, pesannya tampil di formulir itu.
// Pengajuan admin biasa tidak memanggil onSelesai: formulirnya tetap terbuka dan menampilkan pesan menunggu.

/** Kode tampilan, semester, dan cluster satu aspek; area mengikuti cluster. */
function FormUbahAspek({ aspek, onSelesai = null, onBatal = null, className = '' }) {
  const t = useTeks()
  const k = useKirimAspek()
  const [isian, setIsian] = useState({ kode: aspek.kode, semester: String(aspek.semester), cluster: aspek.cluster })
  const [alasan, setAlasan] = useState('')
  const pasang = (kunci) => (nilai) => setIsian((x) => ({ ...x, [kunci]: nilai }))
  const isi = { aksi: 'ubah', id: aspek.id, ...isian, semester: Number(isian.semester), alasan }
  return (
    <form
      className={'space-y-4 ' + className}
      onSubmit={(e) => {
        e.preventDefault()
        k.kirim(isi, () => {
          setAlasan('')
          const pesan = t('Struktur aspek {kode} tersimpan.', { kode: isian.kode })
          if (!onSelesai) return pesan
          onSelesai(pesan)
          return ''
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Isian label={t('Kode')} value={isian.kode} onChange={pasang('kode')} />
        <Select
          label={t('Semester')}
          value={isian.semester}
          onChange={pasang('semester')}
          options={SEMESTER()}
          tampilkan={(s) => t('Semester {n}', { n: s })}
        />
        <Select label={t('Cluster')} value={isian.cluster} onChange={pasang('cluster')} options={CLUSTER.map((c) => c.id)} tampilkan={labelCluster} />
      </div>
      <p className="text-[12.5px] text-ink-2">
        {t('Area {area}', { area: getArea(getCluster(isian.cluster)?.area)?.nama ?? '–' })}
        {aspek.semesterSementara ? ' · ' + t('Semester aspek ini masih menunggu konfirmasi; menyimpannya di sini menetapkannya.') : ''}
      </p>
      <BagianKirim isi={isi} alasan={alasan} onAlasan={setAlasan} label={t('Simpan struktur')} k={k} onBatal={onBatal} />
    </form>
  )
}

/** Hapus = arsip: aspek tidak tampil dan tidak dihitung, nilainya tetap, bisa dipulihkan. */
function FormArsipAspek({ aspek, onSelesai, onBatal = null, className = '' }) {
  const t = useTeks()
  const k = useKirimAspek()
  const [alasan, setAlasan] = useState('')
  const isi = { aksi: 'arsipkan', id: aspek.id, alasan }
  return (
    <form
      className={'space-y-4 ' + className}
      onSubmit={(e) => {
        e.preventDefault()
        k.kirim(isi, () => {
          setAlasan('')
          onSelesai(t('Aspek {kode} diarsipkan. Nilainya tetap tersimpan dan bisa dipulihkan.', { kode: aspek.kode }))
          return ''
        })
      }}
    >
      <p className="text-[13.5px] leading-relaxed text-ink">
        {t('Aspek ini tidak tampil dan tidak dihitung lagi untuk angkatan yang belum disahkan. Komponen dan nilainya tidak dihapus, dan angkatan yang sudah disahkan tetap menghitungnya.')}
      </p>
      <BagianKirim isi={isi} alasan={alasan} onAlasan={setAlasan} label={t('Arsipkan aspek')} bahaya k={k} onBatal={onBatal} />
    </form>
  )
}

const KOMPONEN_KOSONG = { label: '', sumber: 'MK', jenis: 'TUGAS', ranah: 'kognitif', status: 'resmi' }

/**
 * Isian awal aspek baru. Di dalam satu semester (`semesterTetap`), area dan cluster mengikuti aspek terakhir di
 * semester itu; selain itu area terakhir. Kodenya nomor kosong berikutnya di huruf area itu (mis. A.5).
 */
function isianTambahAwal(semesterTetap) {
  const terakhir = semesterTetap ? getAspekSemester(semesterTetap).at(-1) : null
  const area = terakhir?.area ?? AREA[AREA.length - 1].id
  const cluster = terakhir?.cluster ?? clusterArea(area)[0]?.id ?? CLUSTER[0].id
  return {
    area,
    cluster,
    semester: String(semesterTetap ?? CONFIG.TOTAL_SEMESTER_PROGRAM),
    kode: kodeAspekBaru(cluster),
    nama: '',
    deskripsi: '',
    pdp: '',
    mk: '',
    engagement: '',
  }
}

/** Aspek baru beserta komponen pertamanya: pilih area dulu, lalu cluster di area itu; kode bisa diketik ulang. */
function FormTambahAspek({ semesterTetap = null, onSelesai, onBatal = null, className = '' }) {
  const t = useTeks()
  const k = useKirimAspek()
  const [isian, setIsian] = useState(() => isianTambahAwal(semesterTetap))
  const [komponen, setKomponen] = useState(KOMPONEN_KOSONG)
  const [alasan, setAlasan] = useState('')
  const pasang = (kunci) => (nilai) => setIsian((x) => ({ ...x, [kunci]: nilai }))
  // Kode usulan mengikuti area/cluster, kecuali sudah diketik sendiri.
  const gantiCluster = (x, cluster) => ({ ...x, cluster, kode: x.kode === kodeAspekBaru(x.cluster) ? kodeAspekBaru(cluster) : x.kode })
  const gantiArea = (area) => setIsian((x) => ({ ...gantiCluster(x, clusterArea(area)[0]?.id ?? x.cluster), area }))
  // `area` hanya untuk menyaring cluster di layar; server menurunkan area dari cluster.
  const isi = {
    aksi: 'tambah',
    ...isian,
    semester: Number(isian.semester),
    komponen: [{ ...komponen, jenis: komponen.sumber === 'MK' ? komponen.jenis : null }],
    alasan,
  }

  return (
    <form
      className={'space-y-4 ' + className}
      onSubmit={(e) => {
        e.preventDefault()
        k.kirim(isi, (hasil) => {
          setIsian(isianTambahAwal(semesterTetap))
          setKomponen(KOMPONEN_KOSONG)
          setAlasan('')
          onSelesai(t('Aspek {kode} ditambahkan.', { kode: hasil.aspek?.kode ?? isian.kode }), hasil.aspek?.id)
          return ''
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label={t('Area')} value={isian.area} onChange={gantiArea} options={AREA.map((a) => a.id)} tampilkan={labelArea} />
        <Select
          label={t('Cluster')}
          value={isian.cluster}
          onChange={(v) => setIsian((x) => gantiCluster(x, v))}
          options={clusterArea(isian.area).map((c) => c.id)}
          tampilkan={labelCluster}
        />
        {semesterTetap ? (
          <div>
            <span className="mb-1.5 block label">{t('Semester')}</span>
            <p className="py-2.5 text-[14px] font-semibold text-ink">{t('Semester {n}', { n: semesterTetap })}</p>
          </div>
        ) : (
          <Select
            label={t('Semester')}
            value={isian.semester}
            onChange={pasang('semester')}
            options={SEMESTER()}
            tampilkan={(s) => t('Semester {n}', { n: s })}
          />
        )}
        <Isian label={t('Kode')} value={isian.kode} onChange={pasang('kode')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Isian label={t('Nama aspek')} value={isian.nama} onChange={pasang('nama')} />
        <Isian label={t('Kegiatan PDP')} value={isian.pdp} onChange={pasang('pdp')} />
        <Isian label={t('Mata kuliah')} value={isian.mk} onChange={pasang('mk')} />
        <Isian label={t('Kegiatan Kemahasiswaan')} value={isian.engagement} onChange={pasang('engagement')} />
      </div>
      <Isian label={t('Deskripsi')} multi value={isian.deskripsi} onChange={pasang('deskripsi')} />

      <fieldset className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
        <legend className="px-1 text-[13.5px] font-bold text-ink">{t('Komponen pertama')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Isian label={t('Nama komponen')} value={komponen.label} onChange={(v) => setKomponen((x) => ({ ...x, label: v }))} />
          <Select
            label={t('Sumber penilaian')}
            value={komponen.sumber}
            onChange={(v) => setKomponen((x) => ({ ...x, sumber: v }))}
            options={SUMBER_LIST.map((s) => s.id)}
            tampilkan={(id) => t(SUMBER_LIST.find((s) => s.id === id)?.label ?? id)}
          />
          {komponen.sumber === 'MK' ? (
            <Select
              label={t('Jenis')}
              value={komponen.jenis}
              onChange={(v) => setKomponen((x) => ({ ...x, jenis: v }))}
              options={JENIS_MK}
              tampilkan={(j) => t(LABEL_JENIS[j] ?? j)}
            />
          ) : null}
          <Select
            label={t('Ranah')}
            value={komponen.ranah}
            onChange={(v) => setKomponen((x) => ({ ...x, ranah: v }))}
            options={Object.keys(RANAH)}
            tampilkan={(r) => t(RANAH[r].label)}
          />
        </div>
      </fieldset>

      <BagianKirim isi={isi} alasan={alasan} onAlasan={setAlasan} label={t('Tambah aspek')} k={k} onBatal={onBatal} />
    </form>
  )
}

function PulihkanAspek({ aspek, onSelesai }) {
  const t = useTeks()
  const k = useKirimAspek()
  const [alasan, setAlasan] = useState('')
  const isi = { aksi: 'pulihkan', id: aspek.id, alasan }
  return (
    <form
      className="mt-3 rounded-xl border border-line bg-surface-2/60 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        k.kirim(isi, () => {
          onSelesai(t('Aspek {kode} dipulihkan.', { kode: aspek.kode }))
          return ''
        })
      }}
    >
      <BagianKirim isi={isi} alasan={alasan} onAlasan={setAlasan} label={t('Pulihkan aspek')} k={k} />
    </form>
  )
}

/* --------------------- kartu di Penilaian & Bobot dan Kurikulum --------------------- */

function StrukturAspek({ aspek, onPesan }) {
  const t = useTeks()
  const [mode, setMode] = useState('ubah') // 'ubah' | 'arsipkan'
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconDocument}
        title={t('Struktur aspek {kode}', { kode: aspek.kode })}
        subtitle={t('ID {id} tetap; kode tampilan, semester, dan cluster bisa diubah. Area mengikuti cluster.', { id: aspek.id })}
        action={
          <button
            type="button"
            className="btn-ghost teks-kritis !px-3 !py-2 text-[13px]"
            aria-pressed={mode === 'arsipkan'}
            onClick={() => setMode(mode === 'arsipkan' ? 'ubah' : 'arsipkan')}
          >
            <IconHapus size={15} />
            {t(mode === 'arsipkan' ? 'Batal arsipkan' : 'Arsipkan aspek')}
          </button>
        }
      />
      {mode === 'arsipkan' ? (
        <FormArsipAspek aspek={aspek} onSelesai={onPesan} className="px-5 py-5 sm:px-6" />
      ) : (
        <FormUbahAspek aspek={aspek} className="px-5 py-5 sm:px-6" />
      )}
    </Card>
  )
}

function TambahAspek({ onPilih }) {
  const t = useTeks()
  const [buka, setBuka] = useState(false)
  const [pesan, setPesan] = useState('')
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconPlus}
        title={t('Tambah aspek')}
        subtitle={t('Aspek baru langsung dihitung untuk angkatan yang belum disahkan, mulai dari semesternya. Komponen lain bisa ditambah sesudahnya di editor penilaian.')}
        action={
          buka ? null : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setBuka(true)
                setPesan('')
              }}
            >
              <IconPlus size={16} />
              {t('Tambah aspek')}
            </button>
          )
        }
      />
      {buka ? (
        <FormTambahAspek
          className="px-5 py-5 sm:px-6"
          onSelesai={(p, id) => {
            setPesan(p)
            setBuka(false)
            if (id) onPilih?.(id)
          }}
          onBatal={() => setBuka(false)}
        />
      ) : pesan ? (
        <div className="px-5 py-4 sm:px-6">
          <PesanBerhasil pesan={pesan} />
        </div>
      ) : null}
    </Card>
  )
}

function DaftarArsip({ arsip, onPilih, onPesan }) {
  const t = useTeks()
  const [buka, setBuka] = useState(null)
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconUndo}
        title={t('Aspek diarsipkan')}
        subtitle={t('Tidak tampil dan tidak dihitung, kecuali untuk angkatan yang disahkan sebelum aspeknya diarsipkan.')}
      />
      <ul className="divide-y divide-line">
        {arsip.map((a) => (
          <li key={a.id} className="px-5 py-3.5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold text-ink">
                  {a.kode} {a.nama}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-2">
                  {t('Semester {n}', { n: a.semester })} · {labelCluster(a.cluster)}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost !px-3 !py-2 text-[13px]"
                aria-expanded={buka === a.id}
                onClick={() => setBuka(buka === a.id ? null : a.id)}
              >
                <IconUndo size={15} />
                {t('Pulihkan aspek')}
              </button>
            </div>
            {buka === a.id ? (
              <PulihkanAspek
                aspek={a}
                onSelesai={(pesan) => {
                  onPesan(pesan)
                  onPilih?.(a.id)
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <div className="px-5 pb-4 sm:px-6">
        <CatatanKaki>{t('Aspek tidak pernah dihapus permanen, supaya nilai dan riwayatnya tetap utuh.')}</CatatanKaki>
      </div>
    </Card>
  )
}

/* ------------------------ daftar per semester (Input & Import Nilai) ------------------------ */

/** Tombol aksi satu baris aspek; aria-expanded menandai panel yang sedang terbuka. */
function TombolAksi({ terbuka, onClick, ikon: Ikon, children, bahaya = false }) {
  return (
    <button
      type="button"
      className={'btn-ghost !px-3 !py-2 text-[13px] ' + (bahaya ? 'teks-kritis' : '')}
      aria-expanded={terbuka}
      onClick={onClick}
    >
      <Ikon size={15} />
      {children}
    </button>
  )
}

/**
 * Aspek CPMK satu semester di Input & Import Nilai: Edit (teks dan komponen), Ubah (kode, semester, cluster), Hapus
 * (= arsip), Tambah aspek di semester itu, dan pulihkan aspek semester itu yang pernah dihapus.
 */
export function AspekSemester({ semester }) {
  const t = useTeks()
  useStore()
  const { user } = useAuth()
  const aktif = getAspekSemester(semester)
  const arsip = getAspekArsip().filter((a) => a.semester === semester)
  // Satu panel terbuka: { id, mode: 'edit' | 'ubah' | 'hapus' | 'pulihkan' } atau { mode: 'tambah' }.
  const [buka, setBuka] = useState(null)
  const [pesan, setPesan] = useState('')
  const terbuka = (id, mode) => buka?.id === id && buka?.mode === mode
  const alih = (id, mode) => {
    setPesan('')
    setBuka(terbuka(id, mode) ? null : { id, mode })
  }
  const selesai = (p) => {
    setPesan(p)
    setBuka(null)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconDocument}
        title={t('Aspek CPMK Semester {n}', { n: semester })}
        subtitle={t(
          user?.superAdmin
            ? 'Tambah, edit, ubah, atau hapus aspek yang dinilai di semester ini. Perubahan langsung berlaku; angkatan yang sudah disahkan tidak ikut berubah.'
            : 'Tambah, edit, ubah, atau hapus aspek yang dinilai di semester ini. Perubahan Anda dikirim ke Super Admin dan berlaku setelah disetujui.',
        )}
        action={
          <button
            type="button"
            className="btn-primary"
            aria-expanded={terbuka(null, 'tambah')}
            onClick={() => alih(null, 'tambah')}
          >
            <IconPlus size={16} />
            {t('Tambah aspek')}
          </button>
        }
      />
      {pesan ? (
        <div className="border-b border-line px-5 py-3 sm:px-6">
          <PesanBerhasil pesan={pesan} />
        </div>
      ) : null}
      {terbuka(null, 'tambah') ? (
        <FormTambahAspek
          key={'tambah-' + semester}
          semesterTetap={semester}
          className="border-b border-line bg-surface-2/40 px-5 py-5 sm:px-6"
          onSelesai={selesai}
          onBatal={() => setBuka(null)}
        />
      ) : null}

      <ul className="divide-y divide-line">
        {aktif.map((a) => (
          <li key={a.id} className="px-5 py-3.5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold text-ink">
                  {a.kode} {a.nama}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-2">
                  {labelCluster(a.cluster)} · {t('{n} komponen', { n: getKomponen(a.id).length })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <TombolAksi terbuka={terbuka(a.id, 'edit')} onClick={() => alih(a.id, 'edit')} ikon={IconPencil}>
                  {t('Edit')}
                </TombolAksi>
                <TombolAksi terbuka={terbuka(a.id, 'ubah')} onClick={() => alih(a.id, 'ubah')} ikon={IconDocument}>
                  {t('Ubah')}
                </TombolAksi>
                <TombolAksi terbuka={terbuka(a.id, 'hapus')} onClick={() => alih(a.id, 'hapus')} ikon={IconHapus} bahaya>
                  {t('Hapus')}
                </TombolAksi>
              </div>
            </div>
            {terbuka(a.id, 'edit') ? (
              // Teks aspek dan komponennya memakai editor yang sama dengan Input Manual.
              <div className="mt-3 overflow-hidden rounded-xl border border-line [&>form]:border-b-0">
                <EditorPenilaian key={a.id} aspekId={a.id} />
              </div>
            ) : null}
            {terbuka(a.id, 'ubah') ? (
              <FormUbahAspek
                key={a.id}
                aspek={a}
                className="mt-3 rounded-xl border border-line bg-surface-2/60 p-4"
                onSelesai={selesai}
                onBatal={() => setBuka(null)}
              />
            ) : null}
            {terbuka(a.id, 'hapus') ? (
              <FormArsipAspek
                key={a.id}
                aspek={a}
                className="mt-3 rounded-xl border border-line bg-surface-2/60 p-4"
                onSelesai={selesai}
                onBatal={() => setBuka(null)}
              />
            ) : null}
          </li>
        ))}
        {!aktif.length ? <li className="px-5 py-4 text-[13.5px] text-ink-2 sm:px-6">{t('Belum ada aspek di semester ini.')}</li> : null}
      </ul>

      {arsip.length ? (
        <div className="border-t border-line px-5 py-4 sm:px-6">
          <p className="text-[13.5px] font-bold text-ink">{t('Aspek yang dihapus dari semester ini')}</p>
          <ul className="mt-2 space-y-2">
            {arsip.map((a) => (
              <li key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <p className="text-[13.5px] text-ink-2">
                    <span className="font-semibold text-ink">{a.kode}</span> {a.nama}
                  </p>
                  <TombolAksi terbuka={terbuka(a.id, 'pulihkan')} onClick={() => alih(a.id, 'pulihkan')} ikon={IconUndo}>
                    {t('Pulihkan aspek')}
                  </TombolAksi>
                </div>
                {terbuka(a.id, 'pulihkan') ? <PulihkanAspek key={a.id} aspek={a} onSelesai={selesai} /> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="px-5 pb-4 sm:px-6">
        <CatatanKaki>
          {t('Hapus = arsip: aspek tidak tampil dan tidak dihitung, tetapi komponen dan nilainya tetap tersimpan dan bisa dipulihkan. Kode aspek lain tidak berubah.')}
        </CatatanKaki>
      </div>
    </Card>
  )
}
