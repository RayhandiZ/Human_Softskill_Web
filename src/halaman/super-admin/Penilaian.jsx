import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, Tabs, TandaContoh, TandaDraft } from '../../components/Ui'
import { IconAlert, IconChevronRight } from '../../components/Icons'
import { aspekPunyaDraft, getAspekList, getKomponen } from '../../lib/curriculum'
import { bobotMasihContoh, susunanBobot } from '../../lib/bobot'
import { PERMINTAAN, useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import EditorPenilaian from '../admin/EditorPenilaian'
import KelolaAspek from '../admin/KelolaAspek'
import Kurikulum from '../admin/Kurikulum'

/* Aspek, komponen asesmen, dan bobot penilaian. Memakai editor yang sama dengan panel Kemahasiswaan
   (Input Manual dan Kurikulum); bedanya, simpanan super admin langsung berlaku tanpa persetujuan.
   Lihat README.md › Panel Super Admin. */

const AKSI_PENILAIAN = ['UBAH_PENILAIAN', 'UBAH_BOBOT', 'KELOLA_ASPEK']

export default function Penilaian() {
  const t = useTeks()
  const versi = useStore()
  const daftarAspek = useMemo(() => getAspekList(), [versi])
  const bobot = useMemo(() => susunanBobot(), [versi])
  const [tab, setTab] = useState('aspek')
  const [pilih, setPilih] = useState(() => daftarAspek[0]?.id ?? null)
  // Editor aspek menyimpan drafnya sendiri; berganti aspek atau tab membuangnya, jadi ditanyakan dulu.
  const [belumDisimpan, setBelumDisimpan] = useState(false)

  const aspek = daftarAspek.find((a) => a.id === pilih) ?? daftarAspek[0]
  const menunggu = PERMINTAAN.filter((p) => p.status === 'menunggu' && AKSI_PENILAIAN.includes(p.aksi))

  const boleh = () => !belumDisimpan || window.confirm(t('Perubahan yang belum disimpan akan hilang. Lanjutkan?'))
  const gantiAspek = (id) => {
    if (id === aspek?.id || !boleh()) return
    setBelumDisimpan(false)
    setPilih(id)
  }
  const gantiTab = (v) => {
    if (v === tab || !boleh()) return
    setBelumDisimpan(false)
    setTab(v)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Penilaian & Bobot')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t('Ubah aspek, komponen asesmen, dan bobotnya, termasuk menambah komponen secara manual. Sebagai Super Admin, perubahan Anda langsung berlaku untuk semua angkatan tanpa menunggu persetujuan, dan tetap tercatat di Log Aktivitas.')}{' '}
          {t('Aspek juga bisa ditambah, diubah strukturnya, atau diarsipkan di bawah editor; angkatan yang sudah disahkan tetap memakai susunan aspek saat ia disahkan.')}
        </p>
      </header>

      {menunggu.length ? (
        <Link
          href="/super/persetujuan"
          className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-4 py-3.5 transition hover:bg-[color-mix(in_srgb,var(--warning)_18%,transparent)]"
        >
          <IconAlert size={18} className="mt-0.5 shrink-0 text-[var(--warning-ink)]" />
          <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink">
            <span className="font-bold">
              {t('{n} permintaan admin untuk mengubah penilaian atau bobot menunggu keputusan Anda.', { n: menunggu.length })}
            </span>{' '}
            {t('Putuskan lebih dulu: permintaan yang datanya sudah berubah akan gagal dijalankan.')}
          </span>
          <IconChevronRight size={18} className="mt-0.5 shrink-0 text-ink-3" />
        </Link>
      ) : null}

      <Tabs
        value={tab}
        onChange={gantiTab}
        items={[
          { value: 'aspek', label: t('Aspek & komponen') },
          { value: 'bobot', label: t('Bobot') },
        ]}
      />

      {tab === 'aspek' ? (
        <div className="space-y-5">
          <p className="text-[14px] text-ink-2">{t('Pilih aspek yang ingin diubah.')}</p>
          {/* Dua kolom sejak layar HP, supaya sepuluh aspek tidak mendorong editornya jauh ke bawah. */}
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {daftarAspek.map((a) => {
              const terpilih = a.id === aspek?.id
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => gantiAspek(a.id)}
                    aria-pressed={terpilih}
                    className={
                      'card block h-full w-full p-3.5 text-left transition hover:border-brand-ink ' +
                      (terpilih ? 'border-brand-ink bg-brand-soft' : '')
                    }
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-extrabold tracking-tight text-ink">{a.kode}</span>
                      {aspekPunyaDraft(a.id) ? <TandaDraft>{t('draft')}</TandaDraft> : null}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{a.nama}</span>
                    <span className="mt-2 block text-[12px] text-ink-3">
                      {t('{n} komponen', { n: getKomponen(a.id).length })} ·{' '}
                      {t(bobot.aspek[a.id] != null ? 'bobot manual' : 'bobot otomatis')}
                      {bobotMasihContoh(a.id) ? <TandaContoh className="ml-1">{t('contoh')}</TandaContoh> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {aspek ? (
            // Editor ini juga dipasang di Input Manual dengan garis bawah; di dalam kartu garis itu tidak perlu.
            <Card className="overflow-hidden [&>form]:border-b-0">
              <EditorPenilaian key={aspek.id} aspekId={aspek.id} onPerubahan={setBelumDisimpan} />
            </Card>
          ) : null}

          <KelolaAspek
            aspekId={aspek?.id}
            onPilih={(id) => {
              setBelumDisimpan(false)
              setPilih(id)
            }}
          />
        </div>
      ) : (
        <Kurikulum tertanam aspekAwal={aspek?.id} onPilihAspek={setPilih} onPerubahan={setBelumDisimpan} />
      )}
    </div>
  )
}
