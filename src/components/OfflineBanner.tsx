import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-error-bg border-b border-error/30 text-error text-sm text-center py-2 px-4 flex items-center justify-center gap-2" role="alert" aria-live="assertive">
      <WifiOff size={16} />
      Sin conexión. Los datos se guardan localmente y se sincronizarán cuando vuelvas a estar en línea.
    </div>
  )
}
