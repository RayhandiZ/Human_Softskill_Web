/* Ikon garis inline — satu set kecil supaya tidak menambah dependensi. */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 20, children, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base} {...rest}>
      {children}
    </svg>
  )
}

export const IconGauge = (p) => (
  <Svg {...p}>
    <path d="M12 14.5 15.5 10" />
    <path d="M3.5 17a9 9 0 1 1 17 0" />
    <circle cx="12" cy="14.5" r="1.4" />
  </Svg>
)

export const IconTarget = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="0.8" />
  </Svg>
)

export const IconSpark = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.9L12 18.2 10.2 12.7 4.7 10.8 10.2 9z" />
  </Svg>
)

export const IconList = (p) => (
  <Svg {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.6" cy="6.5" r="1.1" />
    <circle cx="4.6" cy="12" r="1.1" />
    <circle cx="4.6" cy="17.5" r="1.1" />
  </Svg>
)

export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
  </Svg>
)

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8.5" r="3.2" />
    <path d="M3.6 19.4a6.2 6.2 0 0 1 11.8 0" />
    <path d="M16.2 6.1a3.1 3.1 0 0 1 0 5.9M17.4 14.4a5.4 5.4 0 0 1 3.1 4.4" />
  </Svg>
)

export const IconBuilding = (p) => (
  <Svg {...p}>
    <path d="M4.5 20.2V5.4a1.4 1.4 0 0 1 1.4-1.4h6.6a1.4 1.4 0 0 1 1.4 1.4v14.8" />
    <path d="M14 9.6h4.2a1.4 1.4 0 0 1 1.4 1.4v9.2M3 20.2h18" />
    <path d="M7.6 8h3M7.6 11.6h3M7.6 15.2h3M16.4 13.2h.8M16.4 16.6h.8" />
  </Svg>
)

export const IconCheckShield = (p) => (
  <Svg {...p}>
    <path d="M12 3.4 19 6v5.6c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V6z" />
    <path d="m9 12.2 2.1 2.1 4-4.1" />
  </Svg>
)

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.4" />
    <path d="M3.6 10h16.8M8.4 3.4v3.6M15.6 3.4v3.6" />
  </Svg>
)

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M6.4 9.6a5.6 5.6 0 1 1 11.2 0c0 4 1.4 5.6 1.4 5.6H5s1.4-1.6 1.4-5.6Z" />
    <path d="M10.2 18.6a2 2 0 0 0 3.6 0" />
  </Svg>
)

export const IconChat = (p) => (
  <Svg {...p}>
    <path d="M20 12.4c0 3.6-3.6 6.5-8 6.5a9.6 9.6 0 0 1-2.6-.35L4.6 20.2l1.2-3.3A6.2 6.2 0 0 1 4 12.4c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5Z" />
  </Svg>
)

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.8v2.1M12 19.1v2.1M4.7 4.7l1.5 1.5M17.8 17.8l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5" />
  </Svg>
)

export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.4" />
    <path d="m15.6 15.6 4 4" />
  </Svg>
)

export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Svg>
)

export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
)

// Penanda tautan yang membuka situs lain di tab baru.
export const IconTabBaru = (p) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Svg>
)

export const IconArrowLeft = (p) => (
  <Svg {...p}>
    <path d="M19 12H5.5M11 5.5 4.5 12l6.5 6.5" />
  </Svg>
)

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M12 3.8v10.4M8 10.4l4 4 4-4M4.4 19.6h15.2" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5.2v13.6M5.2 12h13.6" />
  </Svg>
)

export const IconMinus = (p) => (
  <Svg {...p}>
    <path d="M5.2 12h13.6" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m5 12.6 4.6 4.6L19 7.6" />
  </Svg>
)

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.4V12l3 1.8" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 4.4 21 19.6H3z" />
    <path d="M12 10v3.6M12 16.6h.01" />
  </Svg>
)

export const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M14.4 7.6V5.4a1.6 1.6 0 0 0-1.6-1.6H6a1.6 1.6 0 0 0-1.6 1.6v13.2A1.6 1.6 0 0 0 6 20.2h6.8a1.6 1.6 0 0 0 1.6-1.6v-2.2" />
    <path d="M10.6 12h9.2M16.6 8.8l3.2 3.2-3.2 3.2" />
  </Svg>
)

export const IconDocument = (p) => (
  <Svg {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    {/* Garis-garis teks */}
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </Svg>
)

export const IconBook = (p) => (
  <Svg {...p}>
    <path d="M4.4 5.2A1.6 1.6 0 0 1 6 3.6h4.4A2.6 2.6 0 0 1 12 5.8v13a2.2 2.2 0 0 0-1.6-.8H4.4z" />
    <path d="M19.6 5.2A1.6 1.6 0 0 0 18 3.6h-4.4A2.6 2.6 0 0 0 12 5.8v13a2.2 2.2 0 0 1 1.6-.8h6z" />
  </Svg>
)

export const IconLogo = ({ size = 26, ...rest }) => (
  /* Piringan biru yang "melarut" menjadi kotak-kotak di sisi kiri atas, dengan
     cincin putih mengelilinginya.

     Warnanya sengaja TETAP, tidak mengikuti currentColor. Alasannya: warna
     piringan hampir sama dengan biru navbar, jadi tanpa cincin putih lambangnya
     akan lesap ke latar. Cincin itulah yang memisahkannya di navbar, sekaligus
     tidak mengganggu saat lambang berdiri di atas kartu putih.

     Kotak-kotaknya kini putih pejal, bukan lubang tembus — seluruhnya berada di
     dalam r=42 sehingga tidak pernah menyentuh cincin. */
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" {...rest}>
    <circle cx="50" cy="50" r="45" fill="#0b5ca0" />
    <circle cx="50" cy="50" r="46.5" fill="none" stroke="#ffffff" strokeWidth="4" />
    <rect x="19" y="23" width="10" height="10" fill="#ffffff" />
    <rect x="45" y="14" width="10" height="10" fill="#ffffff" />
    <rect x="30" y="25" width="9" height="9" fill="#ffffff" />
    <rect x="36" y="36" width="9" height="9" fill="#ffffff" />
    <rect x="47" y="40" width="9" height="9" fill="#ffffff" />
    <rect x="19" y="42" width="10" height="10" fill="#ffffff" />
    <rect x="32" y="50" width="9" height="9" fill="#ffffff" />
    <rect x="24" y="61" width="9" height="9" fill="#ffffff" />
    <rect x="33" y="73" width="9" height="9" fill="#ffffff" />
  </svg>
)

export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="4.6" y="10.4" width="14.8" height="9.8" rx="2.4" />
    <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
    <path d="M12 14v2.6" />
  </Svg>
)

/* Kotak masuk — dipakai panel dosen untuk pengumpulan yang baru datang. */
export const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M3.4 13.2 6 5.6A2 2 0 0 1 7.9 4.2h8.2A2 2 0 0 1 18 5.6l2.6 7.6" />
    <path d="M3.4 13.2h4.3l1.1 2.4h6.4l1.1-2.4h4.3v4.6a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z" />
  </Svg>
)

export const IconUpload = (p) => (
  <Svg {...p}>
    <path d="M12 15.6V4.4M8 8.4l4-4 4 4M4.4 19.6h15.2" />
  </Svg>
)

export const IconPrint = (p) => (
  <Svg {...p}>
    <path d="M7 9.2V3.8h10v5.4" />
    <rect x="4" y="9.2" width="16" height="7" rx="2" />
    <path d="M7 13.6h10v6.6H7z" />
  </Svg>
)

export const IconCertificate = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="9.4" r="5.4" />
    <path d="m9 13.8-1.2 6.4L12 18.4l4.2 1.8L15 13.8" />
    <path d="m10.2 9.3 1.3 1.3 2.4-2.5" />
  </Svg>
)

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M15.4 4.8l3.8 3.8L8.6 19.2l-4.6.8.8-4.6z" />
    <path d="m13.6 6.6 3.8 3.8" />
  </Svg>
)

export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M20.4 12a8.4 8.4 0 1 1-2.46-5.94" />
    <path d="M20.4 4.2v4.6h-4.6" />
  </Svg>
)

export const IconUndo = (p) => (
  <Svg {...p}>
    <path d="M4.4 9.6h8.8a5.6 5.6 0 1 1 0 11.2H7" />
    <path d="m7.8 5.2-3.4 4.4 3.4 4.4" />
  </Svg>
)

export const IconRoute = (p) => (
  <Svg {...p}>
    <circle cx="6.2" cy="6.2" r="2.4" />
    <circle cx="17.8" cy="17.8" r="2.4" />
    <path d="M8.6 6.2h5.2a3.6 3.6 0 0 1 0 7.2h-3.6a3.6 3.6 0 0 0 0 7.2h5.2" />
  </Svg>
)

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 11v5.4M12 7.8h.01" />
  </Svg>
)

export const IconFilter = (p) => (
  <Svg {...p}>
    <path d="M4.2 5.6h15.6l-6 7v5.4l-3.6 1.8v-7.2z" />
  </Svg>
)

export const IconPhone = (p) => (
  <Svg {...p}>
    <path d="M8.2 4.2H5.4a1.6 1.6 0 0 0-1.6 1.7c.3 5.9 5 10.6 10.9 10.9a1.6 1.6 0 0 0 1.7-1.6v-2.8l-3.4-1.2-1.5 1.8a12 12 0 0 1-4.8-4.8l1.8-1.5z" />
  </Svg>
)

export const IconMail = (p) => (
  <Svg {...p}>
    <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2" />
    <path d="m3.8 7 8.2 5.6L20.2 7" />
  </Svg>
)
