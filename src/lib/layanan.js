import { IconChat, IconMail, IconPhone } from '../components/Icons'

// Kata sandi dikelola SSO UMN, bukan aplikasi ini, jadi pemulihannya juga di sana.
export const SSO_LUPA_SANDI = 'https://sso.umn.ac.id/password/public/forgottenpassword'

const NOMOR_WHATSAPP = '622154220808'

export const KONTAK_UMN = {
  telepon: {
    tampil: '(021) 5422 0808 ext. 3902',
    tautan: 'tel:+622154220808',
  },
  surel: {
    tampil: 'softskill@umn.ac.id',
    tautan: 'mailto:softskill@umn.ac.id',
  },
  whatsapp: {
    tampil: '+62 21 5422 0808',
    tautan:
      'https://wa.me/' +
      NOMOR_WHATSAPP +
      '?text=' +
      encodeURIComponent('Halo, saya mahasiswa UMN dan ingin bertanya soal nilai softskill 5C.'),
  },
  helpdesk: 'Gedung B Lantai 3, Ruang B315',
  jam: 'Senin sampai Jumat, 08.00 hingga 17.00 WIB',
}

export const LAYANAN = [
  {
    id: 'whatsapp',
    ikon: IconChat,
    label: 'WhatsApp UMN',
    rinci: 'Kirim pesan, dibalas pada jam kerja',
    tautan: KONTAK_UMN.whatsapp.tautan,
    keluar: true,
  },
  {
    id: 'telepon',
    ikon: IconPhone,
    label: 'Customer Service',
    rinci: 'Hubungi lewat telepon pada jam kerja',
    nilai: KONTAK_UMN.telepon.tampil,
    tautan: KONTAK_UMN.telepon.tautan,
  },
  {
    id: 'surel',
    ikon: IconMail,
    label: 'Surel Softskill 5C',
    rinci: 'Untuk pertanyaan yang butuh lampiran',
    nilai: KONTAK_UMN.surel.tampil,
    tautan: KONTAK_UMN.surel.tautan,
  },
]
