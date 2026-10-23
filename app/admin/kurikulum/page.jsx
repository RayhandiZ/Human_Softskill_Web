'use client'

import { useState } from 'react'
import Kurikulum from '../../../src/halaman/admin/Kurikulum'
import KelolaAspek from '../../../src/halaman/admin/KelolaAspek'
import { getAspekList } from '../../../src/lib/curriculum'

/* Kurikulum CPMK: bobot (Kurikulum) dan, di bawahnya, pengelolaan aspek itu sendiri (KelolaAspek). Aspek terpilih
   disamakan di antara keduanya; sesudah aspek ditambah atau dipulihkan, Kurikulum dipasang ulang supaya drafnya ikut
   memuat aspek itu. Lihat README.md › Mengelola aspek CPMK. */
export default function HalamanKurikulum() {
  const [pilih, setPilih] = useState(null)
  const [pasang, setPasang] = useState(0)
  return (
    <div className="space-y-6">
      <Kurikulum key={pasang} aspekAwal={pilih ?? undefined} onPilihAspek={setPilih} />
      <KelolaAspek
        aspekId={pilih ?? getAspekList()[0]?.id}
        onPilih={(id) => {
          setPilih(id)
          setPasang((n) => n + 1)
        }}
      />
    </div>
  )
}
