import { tangani } from '../../../src/server/api'
import { muatData } from '../../../src/server/muat'
import { ambilMatriks, ambilWewenang } from '../../../src/server/wewenang'

/* Data halaman sesuai peran pemilik sesi. Isinya ada di src/server/muat.js. Sakelar wewenang yang ditutup Super Admin
   ikut dikirim, supaya tombolnya hilang setiap kali data dimuat ulang (masuk, atau sesudah menyimpan), tidak hanya
   saat halaman dimuat ulang. Super Admin juga menerima keterangan dan kebijakan tertulis matriks Peran & Wewenang;
   yang gagal dibaca (null) tidak ikut menggagalkan data lainnya. */
export const GET = (request) =>
  tangani(request, null, async (pengguna) => {
    const [isi, wewenang, matriks] = await Promise.all([
      muatData(pengguna),
      ambilWewenang(),
      pengguna.superAdmin
        ? ambilMatriks().catch((e) => {
            console.warn('Matriks wewenang tidak bisa dibaca dari basis data:', e.message)
            return null
          })
        : undefined,
    ])
    return { ...isi, wewenang, ...(pengguna.superAdmin ? { matriks } : {}) }
  })
