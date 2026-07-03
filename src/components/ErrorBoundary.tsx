import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error.name)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
          <AlertTriangle size={48} className="text-error mb-4" />
          <h2 className="text-text-primary text-lg font-semibold mb-2">Algo salió mal</h2>
          <p className="text-text-muted text-sm mb-6 max-w-md">
            Ocurrió un error inesperado en esta sección.
          </p>
          <Button onClick={this.handleRetry}>
            <RefreshCw size={16} className="mr-2" />
            Reintentar
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
