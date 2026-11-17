import LogoPdp from './LogoPdp'

/* Panji kain berlapis di pojok kiri atas halaman masuk (pengganti pita kertas bergulung, 17 Nov 2026, mengikuti
   rujukan "Opsi 10 Layered Fabric" dari pengguna): kait, tali terpilin, batang perak bercincin dan berkenop emas,
   kain belakang krem yang sedikit lebih lebar dan lebih panjang, dan kain depan gading berujung runcing. Pita yang
   menjuntai di kedua sisi dilepas atas permintaan pengguna. Dibuat lebih rinci di hari yang sama ("lebih HD dan
   sedikit realistis"): serat kain
   (feTurbulence), cahaya dari kiri atas, bayangan di bawah kantong batang, jahitan putus-putus, bayangan kain depan
   di kain belakang, dan kilau logam. Lipatan tegak terang-gelap dilepas supaya tulisan pdp terbaca jelas. Semuanya satu SVG hiasan (aria-hidden) yang tidak beranimasi, jadi digambar sekali;
   logo pdp tetap LogoPdp di atas kain depan, jadi namanya tetap terbaca pembaca layar. Ukuran 160 × 178 px, setinggi
   pita lama, supaya halaman masuk tetap muat tanpa digulir di 1366×657. Gerak dan bayangannya di index.css ›
   panji logo masuk. */

const DEPAN = 'M27 31 H133 V141 L80 168 L27 141 Z'
const BELAKANG = 'M23 33 H137 V147 L80 177 L23 147 Z'

export default function PanjiPdp() {
  return (
    <div className="panji">
      <div className="panji-bayang">
        <svg className="block" width="160" height="178" viewBox="0 0 160 178" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="panji-klip-depan">
              <path d={DEPAN} />
            </clipPath>
            <clipPath id="panji-klip-belakang">
              <path d={BELAKANG} />
            </clipPath>

            {/* Serat kain: bintik halus hitam tembus pandang dari derau, digambar sekali. */}
            <filter id="panji-serat" x="0" y="0" width="160" height="178" filterUnits="userSpaceOnUse">
              <feTurbulence type="fractalNoise" baseFrequency="0.9 0.55" numOctaves="2" seed="7" result="derau" />
              <feColorMatrix
                in="derau"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 -0.4"
              />
            </filter>
            {/* Bayangan lembut kain depan yang jatuh ke kain belakang. */}
            <filter id="panji-kabur" x="0" y="0" width="160" height="178" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="1.4" />
            </filter>

            <linearGradient id="panji-batang" x1="0" y1="30" x2="0" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fbfcfd" />
              <stop offset="0.3" stopColor="#d6dce3" />
              <stop offset="0.7" stopColor="#9ca5b0" />
              <stop offset="1" stopColor="#6c7581" />
            </linearGradient>
            <linearGradient id="panji-emas-tegak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbe7a1" />
              <stop offset="0.45" stopColor="#d4ac3a" />
              <stop offset="1" stopColor="#8a6611" />
            </linearGradient>
            <radialGradient id="panji-kenop" cx="0.36" cy="0.3" r="0.78">
              <stop offset="0" stopColor="#fff6d2" />
              <stop offset="0.38" stopColor="#e5c159" />
              <stop offset="0.8" stopColor="#a8821f" />
              <stop offset="1" stopColor="#6f520c" />
            </radialGradient>
            <radialGradient id="panji-kait" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#c9d0d8" />
              <stop offset="0.55" stopColor="#6b737e" />
              <stop offset="1" stopColor="#353b44" />
            </radialGradient>

            <linearGradient id="panji-kain-belakang" x1="23" y1="0" x2="137" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#d9d0be" />
              <stop offset="0.5" stopColor="#ebe4d6" />
              <stop offset="1" stopColor="#d4cab6" />
            </linearGradient>
            {/* Lipatan tegak terang-gelap sempat ada, lalu dilepas atas permintaan pengguna supaya tulisan pdp di
                atasnya terbaca jelas. Yang tersisa: kain sedikit lebih gelap ke ujung runcing, di bawah logo. */}
            <linearGradient id="panji-tegak" x1="0" y1="31" x2="0" y2="168" gradientUnits="userSpaceOnUse">
              <stop offset="0.68" stopColor="#000000" stopOpacity="0" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.06" />
            </linearGradient>
            {/* Bayangan lembut yang dijatuhkan kantong batang ke kain tepat di bawahnya. */}
            <linearGradient id="panji-bayang-kantong" x1="0" y1="38.5" x2="0" y2="47" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#000000" stopOpacity="0.2" />
              <stop offset="0.35" stopColor="#000000" stopOpacity="0.08" />
              <stop offset="1" stopColor="#000000" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="panji-cahaya" cx="52" cy="58" r="78" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="panji-kantong" x1="0" y1="27" x2="0" y2="38.5" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#f6f4ee" />
              <stop offset="0.85" stopColor="#e2ded5" />
              <stop offset="1" stopColor="#cfcabf" />
            </linearGradient>
          </defs>

          {/* Tali terpilin dari cincin batang ke kait: bayangan, tali dasar, lalu pilinan terang. */}
          <path d="M18.5 33.6 L80 8.2 L141.5 33.6" fill="none" stroke="#000000" strokeOpacity="0.32" strokeWidth="2" strokeLinejoin="round" />
          <path d="M18.5 33 L80 7.6 L141.5 33" fill="none" stroke="#bfb29a" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M18.5 33 L80 7.6 L141.5 33" fill="none" stroke="#f1e8d6" strokeWidth="1.7" strokeDasharray="1.1 1.3" strokeLinejoin="round" />
          <ellipse cx="80.6" cy="10" rx="3" ry="1.1" fill="#000000" fillOpacity="0.3" />
          <circle cx="80" cy="7" r="3.4" fill="url(#panji-kait)" />
          <circle cx="78.9" cy="5.9" r="0.9" fill="#ffffff" fillOpacity="0.85" />

          {/* Batang perak: badan, kilau di atas, garis gelap di bawah, lalu cincin emas dekat kenop. */}
          <rect x="12" y="30" width="136" height="6" rx="3" fill="url(#panji-batang)" />
          <line x1="14" y1="31.2" x2="146" y2="31.2" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="14" y1="35.4" x2="146" y2="35.4" stroke="#3f4650" strokeOpacity="0.45" strokeWidth="0.6" strokeLinecap="round" />
          <rect x="15.4" y="29.1" width="3.2" height="7.8" rx="1.1" fill="url(#panji-emas-tegak)" />
          <rect x="141.4" y="29.1" width="3.2" height="7.8" rx="1.1" fill="url(#panji-emas-tegak)" />

          {/* Kain belakang: krem bertekstur, tepinya sedikit gelap, dengan bayangan kain depan yang jatuh ke atasnya. */}
          <path d={BELAKANG} fill="url(#panji-kain-belakang)" />
          <g clipPath="url(#panji-klip-belakang)">
            <rect width="160" height="178" fill="#000000" filter="url(#panji-serat)" opacity="0.22" />
            <path d={DEPAN} transform="translate(0 2.2)" fill="#000000" fillOpacity="0.28" filter="url(#panji-kabur)" />
          </g>
          <path d={BELAKANG} fill="none" stroke="#000000" strokeOpacity="0.14" strokeWidth="0.8" />

          {/* Kain depan: gading, berserat, berlipat, terang di kiri atas, dengan jahitan di tepi. */}
          <path d={DEPAN} fill="#fbfaf6" />
          <g clipPath="url(#panji-klip-depan)">
            <rect width="160" height="178" fill="url(#panji-cahaya)" />
            <rect width="160" height="178" fill="url(#panji-tegak)" />
            <rect width="160" height="178" fill="#000000" filter="url(#panji-serat)" opacity="0.12" />
            <rect x="27" y="38.5" width="106" height="8.5" fill="url(#panji-bayang-kantong)" />
          </g>
          <path d={DEPAN} fill="none" stroke="#000000" strokeOpacity="0.16" strokeWidth="0.8" />
          <path
            d="M30.6 41.5 V139.6 L80 164.3 L129.4 139.6 V41.5"
            fill="none"
            stroke="#a99d86"
            strokeOpacity="0.9"
            strokeWidth="0.7"
            strokeDasharray="2.3 1.6"
            strokeLinejoin="round"
          />

          {/* Kantong batang di atas kain: membulat (terang di atas, teduh di bawah), dengan jahitan di bawahnya. */}
          <rect x="27" y="27" width="106" height="11.5" rx="2" fill="url(#panji-kantong)" />
          <line x1="28" y1="28.1" x2="132" y2="28.1" stroke="#ffffff" strokeWidth="0.8" />
          <line x1="29" y1="39.8" x2="131" y2="39.8" stroke="#a99d86" strokeOpacity="0.9" strokeWidth="0.7" strokeDasharray="2.3 1.6" />

          {/* Kenop emas: bola dengan tepi gelap tipis dan titik kilau. */}
          <circle cx="10" cy="33" r="5.4" fill="url(#panji-kenop)" stroke="#5a420a" strokeOpacity="0.35" strokeWidth="0.6" />
          <ellipse cx="8.3" cy="31.2" rx="1.6" ry="1.1" fill="#ffffff" fillOpacity="0.85" />
          <circle cx="150" cy="33" r="5.4" fill="url(#panji-kenop)" stroke="#5a420a" strokeOpacity="0.35" strokeWidth="0.6" />
          <ellipse cx="148.3" cy="31.2" rx="1.6" ry="1.1" fill="#ffffff" fillOpacity="0.85" />
        </svg>
        <LogoPdp className="absolute left-[44px] top-[52px] h-[74px] w-auto text-brand-deep" />
      </div>
    </div>
  )
}
