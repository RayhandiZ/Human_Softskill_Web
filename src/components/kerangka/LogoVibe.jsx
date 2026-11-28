export default function LogoVibe({ className = '', terang = false, hiasan = false, ...rest }) {
  return (
    <img
      src="/logo-vibe.png"
      width={290}
      height={192}
      alt={hiasan ? '' : 'VIBE'}
      draggable={false}
      className={(terang === 'tetap' ? 'logo-vibe-putih ' : terang ? 'logo-vibe-terang ' : '') + className}
      {...rest}
    />
  )
}
