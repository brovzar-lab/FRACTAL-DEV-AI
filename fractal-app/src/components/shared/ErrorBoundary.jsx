import { Component } from 'react'

/**
 * ErrorBoundary — catches render errors and shows a recovery UI.
 * Prevents a single broken view from crashing the entire app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary] Caught render error:', error, info)
  }

  handleReset = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const { title = 'Something went wrong', compact = false } = this.props

    if (compact) {
      return (
        <div style={{
          padding: '12px 16px',
          background: 'var(--status-fail-bg, #3B1515)',
          border: '1px solid rgba(184,64,64,0.4)',
          borderRadius: 'var(--radius-md, 8px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--status-fail, #B84040)' }}>
            ⚠ {title}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={this.handleReset}
            style={{ marginLeft: 'auto' }}
          >
            Retry
          </button>
        </div>
      )
    }

    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
        color: 'var(--text-secondary)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--status-fail-bg, #3B1515)',
          border: '2px solid rgba(184,64,64,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
        }}>
          ⚠
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-editorial)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>
            {title}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 360 }}>
            {this.state.error?.message || 'An unexpected error occurred in this view.'}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={this.handleReset}>
          Try again
        </button>
      </div>
    )
  }
}
