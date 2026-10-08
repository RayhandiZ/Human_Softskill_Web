import { Component } from 'react'

/* Tanpa ini, satu galat saat render membuat React melepas seluruh pohon komponen
   dan yang tersisa hanya halaman kosong tanpa petunjuk apa pun. */

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Galat saat render:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
        <div
          style={{
            maxWidth: 640,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            borderRadius: 16,
            padding: '2rem',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, color: 'var(--critical)' }}>Aplikasi gagal dimuat</h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Terjadi galat saat merender halaman. Pesan aslinya:
          </p>
          <pre
            style={{
              marginTop: 12,
              padding: '1rem',
              overflow: 'auto',
              borderRadius: 12,
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '.7rem 1.2rem',
              borderRadius: 12,
              border: 0,
              background: 'var(--brand)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Muat ulang
          </button>
        </div>
      </div>
    )
  }
}
