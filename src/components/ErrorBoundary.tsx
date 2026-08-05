import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Filet de sécurité.
 *
 * Sans lui, une exception au rendu vide toute la page sans un mot : l'écran
 * blanc, le pire des messages d'erreur. Ici on dit ce qui s'est passé et on
 * propose de recharger.
 */
type State = { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Réserve — erreur non rattrapée', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="text-[22px] font-extrabold tracking-[-0.025em]">
          Ça a cassé quelque part
        </span>
        <p className="text-ink-muted text-[15px] leading-[1.5]">
          Recharge la page. Si ça recommence, le message ci-dessous aidera à comprendre.
        </p>
        <p className="text-ink-faint max-w-full overflow-x-auto font-mono text-[12px] break-words">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-corail shadow-corail mt-2 h-13 rounded-full px-7 text-[15px] font-bold text-white"
        >
          Recharger
        </button>
      </div>
    )
  }
}
