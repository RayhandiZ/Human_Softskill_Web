import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Badge, Card } from '../components/Ui'
import { IconAlert, IconCheck, IconChevronDown, IconPencil, IconUpload } from '../components/Icons'
import { LABEL_PERAN, useAuth } from '../lib/auth'
import { useTeks } from '../lib/bahasa'
import { CONFIG } from '../lib/config'
import { SUMBER } from '../lib/curriculum'
import { PERIODE_AKTIF, dosenSesi, labelPeriode, mahasiswaSesi } from '../lib/data'
import { useStore } from '../lib/store'
import { BATAS_FOTO_MB, bacaFoto, kunciSesi, simpanProfil, useProfil } from '../lib/profil'
import PenyuntingFoto from '../components/PenyuntingFoto'

/* --------------------------------------------------------------------------
   Halaman profil untuk TIGA peran, satu berkas.

   Susunannya mengambil konsep dari halaman profil E-Learning: judul berisi nama
   dan NIM, bagian-bagian yang bisa dilipat, label di kiri dan kolom isian di
   kanan, foto dengan area seret-dan-lepas, lalu satu tombol simpan di bawah.

   Yang paling penting dari rujukan itu justru bukan tata letaknya, melainkan
   PEMBEDAAN DUA JENIS KOLOM:

     abu, tidak bisa disunting  → milik institusi. Nama, NIM, email, program
                                  studi, angkatan. Kalau ini bisa ditimpa dari
                                  sini, seseorang bisa menampilkan NIM orang
                                  lain pada transkripnya sendiri.
     putih, bisa disunting      → milik orangnya. Telepon, ponsel, alamat, foto.
                                  Tidak satu pun memengaruhi perhitungan nilai.

   Tombol "Perbarui profil" hanya menyentuh kelompok kedua, dan simpanannya
   nyata — lihat lib/profil.js.
   -------------------------------------------------------------------------- */

/* ------------------------------ bagian bisa dilipat ----------------------- */

function Seksi({ judul, terbuka, onToggle, children }) {
  return (
    <Card className="overflow-hidden">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={terbuka}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface-2 sm:px-6"
        >
          <span className="text-[17px] font-extrabold text-ink">{judul}</span>
          <IconChevronDown
            size={20}
            className={'shrink-0 text-ink-2 transition-transform ' + (terbuka ? '' : '-rotate-90')}
          />
        </button>
      </h2>
      {terbuka ? <div className="border-t border-line px-5 py-5 sm:px-6">{children}</div> : null}
    </Card>
  )
}

/* Satu baris formulir: label di kiri, kendali di kanan. Pada layar sempit
   labelnya naik ke atas kolomnya sendiri agar tidak berdesakan. */
function Baris({ label, htmlFor, children, catatan }) {
  return (
    <div className="grid gap-x-6 gap-y-1.5 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-start">
      <label
        htmlFor={htmlFor}
        className="pt-2 text-[14.5px] font-semibold leading-snug text-ink-2"
      >
        {label}
      </label>
      <div className="min-w-0 max-w-[420px]">
        {children}
        {catatan ? <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{catatan}</p> : null}
      </div>
    </div>
  )
}

/* Kolom terkunci. Abu penuh dan tanpa bingkai fokus — bentuknya sendiri sudah
   memberi tahu bahwa isinya tidak bisa diketik, sebelum ada yang mencoba. */
function Tetap({ children, angka = false }) {
  return (
    <p
      className={
        'rounded-xl bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink-2 ' + (angka ? 'tabular-nums' : '')
      }
    >
      {children}
    </p>
  )
}

const KELAS_ISIAN =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-3 focus:border-brand-ink focus:ring-2 focus:ring-brand-soft'

/* --------------------------------- halaman -------------------------------- */

const SEMUA_SEKSI = ['umum', 'foto', 'akademik', 'opsional']
const TELEPON_SAH = /^[0-9+().\- ]{6,25}$/

export default function Profil() {
  useStore()
  const t = useTeks()
  const { user, admin } = useAuth()

  const mahasiswa = user?.role === 'student'
  const student = mahasiswa ? mahasiswaSesi(user) : null

  /* Halaman ini dipakai tiga peran. Yang berbeda hanya identitas dan satu
     seksi keterangan; seluruh isian yang bisa disunting — telepon, alamat,
     foto — sama persis, jadi tidak ada alasan membuat tiga halaman. */
  const dosen = dosenSesi(user)

  const kunci = kunciSesi(user, student?.nim)
  const tersimpan = useProfil(kunci)

  const [terbuka, setTerbuka] = useState(() => new Set(SEMUA_SEKSI))
  const [form, setForm] = useState(tersimpan)
  const [galat, setGalat] = useState(null)
  const [tersimpanPesan, setTersimpanPesan] = useState(false)
  const [seret, setSeret] = useState(false)
  /* Gambar yang sedang diatur posisinya. Selama ini terisi, penyunting terbuka
     dan belum ada apa pun yang masuk ke formulir. */
  const [sedangDiatur, setSedangDiatur] = useState(null)
  const berkasRef = useRef(null)

  /* Berpindah akun (keluar lalu masuk sebagai orang lain) harus memuat ulang
     isian, bukan meninggalkan ketikan pemilik sesi sebelumnya di layar.

     Yang diamati KUNCI AKUN, bukan objek `tersimpan`. Objek itu berganti
     identitas setiap kali disimpan, dan menyalakan efek ini di situ akan
     langsung menghapus pesan "Perubahan tersimpan" yang baru saja muncul. */
  const kunciSebelumnya = useRef(kunci)
  useEffect(() => {
    if (kunciSebelumnya.current === kunci) return
    kunciSebelumnya.current = kunci
    setForm(tersimpan)
    setGalat(null)
    setTersimpanPesan(false)
  }, [kunci, tersimpan])

  const nama = mahasiswa ? student.name : (dosen?.nama ?? admin.name)
  const email = mahasiswa ? student.email : (dosen?.email ?? admin.email)
  const inisial = mahasiswa
    ? student.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (dosen?.inisial ?? 'KH')

  const [depan, ...sisa] = nama.split(' ')
  const belakang = sisa.join(' ')

  const berubah = useMemo(
    () =>
      form.telepon !== tersimpan.telepon ||
      form.ponsel !== tersimpan.ponsel ||
      form.alamat !== tersimpan.alamat ||
      form.foto !== tersimpan.foto ||
      form.fotoSumber !== tersimpan.fotoSumber,
    [form, tersimpan],
  )

  const semuaTerbuka = terbuka.size === SEMUA_SEKSI.length

  const toggle = (id) =>
    setTerbuka((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const ubah = (bidang) => (e) => {
    setForm((f) => ({ ...f, [bidang]: e.target.value }))
    setTersimpanPesan(false)
  }

  /* Berkas yang dipilih TIDAK langsung menjadi foto: ia dibuka di penyunting
     dulu supaya posisinya bisa diatur. */
  async function ambilFoto(file) {
    setGalat(null)
    try {
      setSedangDiatur(await bacaFoto(file))
      setTersimpanPesan(false)
    } catch (e) {
      setGalat(e.message)
    }
  }

  async function simpan(e) {
    e.preventDefault()
    const telepon = form.telepon.trim()
    const ponsel = form.ponsel.trim()

    if (telepon && !TELEPON_SAH.test(telepon)) {
      setGalat(t('Nomor telepon hanya boleh berisi angka, spasi, dan tanda + ( ) - .'))
      return
    }
    if (ponsel && !TELEPON_SAH.test(ponsel)) {
      setGalat(t('Nomor ponsel hanya boleh berisi angka, spasi, dan tanda + ( ) - .'))
      return
    }

    setGalat(null)
    try {
      await simpanProfil(kunci, { ...form, telepon, ponsel, alamat: form.alamat.trim() })
      setTersimpanPesan(true)
    } catch (err) {
      setGalat(err.message)
    }
  }

  return (
    <form onSubmit={simpan} className="max-w-4xl space-y-5">
      {/* --------------------------------- judul -------------------------------- */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[27px] font-extrabold leading-tight tracking-tight text-ink">
            {nama}
            {mahasiswa ? (
              <span className="font-bold tabular-nums text-ink-2"> ({student.nim})</span>
            ) : null}
          </h1>
          <p className="mt-1.5">
            <Badge tone="brand">{t(LABEL_PERAN[user?.role] ?? 'Kemahasiswaan')}</Badge>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTerbuka(semuaTerbuka ? new Set() : new Set(SEMUA_SEKSI))}
          className="text-[15px] font-bold text-brand-ink underline underline-offset-4 hover:text-brand"
        >
          {t(semuaTerbuka ? 'Tutup semua' : 'Buka semua')}
        </button>
      </header>

      {/* --------------------------------- umum --------------------------------- */}
      <Seksi judul={t('Umum')} terbuka={terbuka.has('umum')} onToggle={() => toggle('umum')}>
        {mahasiswa ? (
          <>
            <Baris label={t('Nama depan')}>
              <Tetap>{depan}</Tetap>
            </Baris>
            <Baris label={t('Nama belakang')}>
              <Tetap>{belakang || '—'}</Tetap>
            </Baris>
            <Baris label={t('Nomor induk mahasiswa')}>
              <Tetap angka>{student.nim}</Tetap>
            </Baris>
          </>
        ) : dosen ? (
          <>
            <Baris label={t('Nama depan')}>
              <Tetap>{depan}</Tetap>
            </Baris>
            <Baris label={t('Nama belakang')}>
              <Tetap>{belakang || '—'}</Tetap>
            </Baris>
            <Baris label={t('Nomor induk dosen')}>
              <Tetap angka>{dosen.nip}</Tetap>
            </Baris>
          </>
        ) : (
          <>
            <Baris label={t('Unit pengelola')}>
              <Tetap>{admin.name}</Tetap>
            </Baris>
            <Baris label={t('Nama resmi')}>
              <Tetap>{admin.unit}</Tetap>
            </Baris>
            <Baris label={t('Penanggung jawab')}>
              <Tetap>{admin.officer}</Tetap>
            </Baris>
          </>
        )}
        <Baris
          label={t('Alamat email')}
          // catatan="Kolom abu berasal dari sistem akademik dan tidak dapat diubah di sini."
        >
          <Tetap>{email}</Tetap>
        </Baris>
      </Seksi>

      {/* --------------------------------- foto --------------------------------- */}
      <Seksi judul={t('Foto profil')} terbuka={terbuka.has('foto')} onToggle={() => toggle('foto')}>
        <Baris label={t('Foto saat ini')}>
          <div className="flex items-center gap-4">
            <Avatar
              initials={inisial}
              size={64}
              src={tersimpan.foto}
              alt={tersimpan.foto ? 'Foto profil yang tersimpan' : ''}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] text-ink-2">
                {t(tersimpan.foto ? 'Terpasang' : 'Belum ada, inisial nama yang dipakai')}
              </span>
              {/* Menyunting ulang memakai gambar ASAL yang tersimpan, bukan
                  hasil potongan 256 px — kalau tidak, memperbesar sedikit saja
                  sudah membuat fotonya pecah. */}
              {tersimpan.foto ? (
                <button
                  type="button"
                  onClick={() => setSedangDiatur(tersimpan.fotoSumber ?? tersimpan.foto)}
                  /* Nama panjangnya dieja untuk pembaca layar: "Edit" sendirian
                     tidak memberi tahu apa yang disunting. Tetap diawali kata
                     yang terlihat, supaya perintah suara tetap cocok. */
                  aria-label={t('Edit foto profil')}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink"
                >
                  <IconPencil size={14} />
                  Edit
                </button>
              ) : null}
            </span>
          </div>
        </Baris>

        <Baris
          label={t('Foto baru')}
          catatan={t('JPG, PNG, WebP, atau GIF. Maksimal {mb} MB.', { mb: BATAS_FOTO_MB })}
        >
          <input
            ref={berkasRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) ambilFoto(f)
              e.target.value = ''
            }}
          />

          {sedangDiatur ? (
            <PenyuntingFoto
              sumber={sedangDiatur}
              onBatal={() => setSedangDiatur(null)}
              onSelesai={(hasil) => {
                setForm((f) => ({ ...f, foto: hasil, fotoSumber: sedangDiatur }))
                setSedangDiatur(null)
                setTersimpanPesan(false)
              }}
            />
          ) : (
          <button
            type="button"
            onClick={() => berkasRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setSeret(true)
            }}
            onDragLeave={() => setSeret(false)}
            onDrop={(e) => {
              e.preventDefault()
              setSeret(false)
              const f = e.dataTransfer.files?.[0]
              if (f) ambilFoto(f)
            }}
            className={
              'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ' +
              (seret ? 'border-brand-ink bg-brand-soft' : 'border-line hover:border-brand-ink hover:bg-surface-2')
            }
          >
            <IconUpload size={26} className="text-ink-2" />
            <span className="text-[14.5px] leading-relaxed text-ink-2">
              Seret berkas ke sini, atau <span className="font-bold text-brand-ink">pilih berkas</span>
            </span>
          </button>
          )}

          {form.foto !== tersimpan.foto ? (
            <div className="mt-3 flex items-center gap-3">
              {form.foto ? (
                <img
                  src={form.foto}
                  alt="Pratinjau foto baru"
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : null}
              <span className="text-[14px] text-ink-2">
                {t(form.foto ? 'Siap disimpan' : 'Foto akan dihapus')}
              </span>
              {form.fotoSumber ? (
                <button
                  type="button"
                  onClick={() => setSedangDiatur(form.fotoSumber)}
                  className="inline-flex items-center gap-1 text-[14px] font-bold text-brand-ink hover:underline"
                >
                  <IconPencil size={14} />
                  Atur lagi
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, foto: tersimpan.foto, fotoSumber: tersimpan.fotoSumber }))
                }
                className="text-[14px] font-bold text-brand-ink underline underline-offset-4"
              >
                Batalkan pilihan
              </button>
            </div>
          ) : tersimpan.foto ? (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, foto: null }))}
              className="mt-3 text-[14px] font-bold text-[var(--critical)] underline underline-offset-4"
            >
              Hapus foto
            </button>
          ) : null}
        </Baris>
      </Seksi>

      {/* ------------------------------- akademik ------------------------------- */}
      <Seksi
        judul={t(mahasiswa ? 'Akademik' : dosen ? 'Penugasan mengajar' : 'Periode kerja')}
        terbuka={terbuka.has('akademik')}
        onToggle={() => toggle('akademik')}
      >
        {mahasiswa ? (
          <>
            <Baris label={t('Fakultas')}>
              <Tetap>{student.faculty}</Tetap>
            </Baris>
            <Baris label={t('Program studi')}>
              <Tetap>
                {student.program} · {student.jenjang}
              </Tetap>
            </Baris>
            <Baris label={t('Angkatan')}>
              <Tetap>{student.angkatanLabel}</Tetap>
            </Baris>
            <Baris label={t('Semester berjalan')}>
              <Tetap>
                Semester {student.semesterAktif} dari {CONFIG.TOTAL_SEMESTER_PROGRAM}
              </Tetap>
            </Baris>
          </>
        ) : dosen ? (
          <>
            <Baris label={t('Unit asesmen')}>
              <Tetap>{SUMBER[dosen.sumber]?.nama ?? dosen.sumber}</Tetap>
            </Baris>
            <Baris
              label={t('Kelas yang dipegang')}
              catatan={t('Menentukan pengumpulan mana yang masuk ke antrean Anda dan komponen mana yang boleh Anda nilai.')}
            >
              <Tetap>
                Semester {dosen.semester} · {dosen.prodi}
              </Tetap>
            </Baris>
            <Baris label={t('Fakultas')}>
              <Tetap>{dosen.fakultas}</Tetap>
            </Baris>
            <Baris label={t('Periode aktif')}>
              <Tetap>{labelPeriode(PERIODE_AKTIF)}</Tetap>
            </Baris>
          </>
        ) : (
          <>
            <Baris label={t('Periode aktif')}>
              <Tetap>{labelPeriode(PERIODE_AKTIF)}</Tetap>
            </Baris>
            <Baris label={t('Cakupan program')}>
              <Tetap>
                {t('Semester 1 sampai {total}', { total: CONFIG.TOTAL_SEMESTER_PROGRAM })}
              </Tetap>
            </Baris>
            <Baris
              label={t('Rata-rata minimal sertifikat')}
              catatan={t('Bobot dan rata-rata minimal diubah lewat berkas konfigurasi oleh pengelola sistem.')}
            >
              <Tetap angka>{CONFIG.AMBANG_SERTIFIKAT}</Tetap>
            </Baris>
          </>
        )}
      </Seksi>

      {/* ------------------------------- opsional ------------------------------- */}
      <Seksi judul={t('Opsional')} terbuka={terbuka.has('opsional')} onToggle={() => toggle('opsional')}>
        <Baris label={t('Telepon')} htmlFor="telepon">
          <input
            id="telepon"
            type="tel"
            value={form.telepon}
            onChange={ubah('telepon')}
            maxLength={25}
            placeholder="(021) 5422 0808"
            className={KELAS_ISIAN}
          />
        </Baris>
        <Baris label={t('Ponsel')} htmlFor="ponsel">
          <input
            id="ponsel"
            type="tel"
            value={form.ponsel}
            onChange={ubah('ponsel')}
            maxLength={25}
            placeholder="0811 1000 000"
            className={KELAS_ISIAN}
          />
        </Baris>
        <Baris
          label={t('Alamat')}
          htmlFor="alamat"
          // catatan="Hanya dipakai bila Biro Kemahasiswaan perlu menghubungi Anda. Kolom ini boleh dikosongkan."
        >
          <textarea
            id="alamat"
            rows={3}
            value={form.alamat}
            onChange={ubah('alamat')}
            maxLength={200}
            className={KELAS_ISIAN + ' resize-y'}
          />
        </Baris>
      </Seksi>

      {/* ------------------------------- tindakan ------------------------------- */}
      {galat ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[var(--critical)] bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-4 py-3 text-[14.5px] leading-relaxed text-[var(--critical)]"
        >
          <IconAlert size={17} className="mt-0.5 shrink-0" />
          {galat}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={!berubah}
          className="rounded-xl bg-brand px-5 py-2.5 text-[15px] font-bold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t('Perbarui profil')}
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(tersimpan)
            setGalat(null)
            setTersimpanPesan(false)
          }}
          disabled={!berubah}
          className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-bold text-ink transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t('Batal')}
        </button>

        {tersimpanPesan ? (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[var(--good)]"
          >
            <IconCheck size={17} />
            {t('Perubahan tersimpan')}
          </span>
        ) : null}
      </div>

      {/* <p className="pt-1 text-[13px] leading-relaxed text-ink-3">
        Telepon, ponsel, alamat, dan foto tersimpan di peramban ini saja — purwarupa ini belum
        terhubung ke basis data kampus. Nama, NIM, program studi, dan angkatan diurus lewat BAAK.
      </p> */}
    </form>
  )
}
