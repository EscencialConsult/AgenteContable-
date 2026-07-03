import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, DatabaseBackup, Download, FileArchive, Shield, Upload } from 'lucide-react'
import Button from '../components/ui/Button'
import PeriodoSelector from '../components/PeriodoSelector'
import { useToast } from '../context/ToastContext'
import {
  buildFullBackup,
  buildPeriodoBackup,
  downloadBackup,
  formatBytes,
  getStorageInfo,
  parseBackupFile,
  restoreBackup,
  type BackupPayload,
  type StorageInfo,
} from '../services/backupService'

export default function BackupPage() {
  const [periodoId, setPeriodoId] = useState<number | undefined>()
  const [storage, setStorage] = useState<StorageInfo>({})
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null)
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge')
  const [loading, setLoading] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  useEffect(() => {
    getStorageInfo().then(setStorage).catch(() => setStorage({}))
  }, [])

  const refreshStorage = async () => {
    setStorage(await getStorageInfo())
  }

  const handleFullBackup = async () => {
    setLoading('full')
    try {
      const backup = await buildFullBackup()
      downloadBackup(backup)
      addToast('success', 'Backup completo descargado')
      await refreshStorage()
    } catch (err) {
      console.error('Backup export error')
      addToast('error', err instanceof Error ? err.message : 'No se pudo exportar el backup')
    } finally {
      setLoading('')
    }
  }

  const handlePeriodoBackup = async () => {
    if (!periodoId) {
      addToast('error', 'Selecciona un periodo para exportar')
      return
    }

    setLoading('periodo')
    try {
      const backup = await buildPeriodoBackup(periodoId)
      downloadBackup(backup)
      addToast('success', 'Periodo exportado con adjuntos')
      await refreshStorage()
    } catch (err) {
      console.error('Period backup export error')
      addToast('error', err instanceof Error ? err.message : 'No se pudo exportar el periodo')
    } finally {
      setLoading('')
    }
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setLoading('parse')
    try {
      const parsed = await parseBackupFile(file)
      setPendingBackup(parsed)
      addToast('success', 'Backup listo para restaurar')
    } catch (err) {
      console.error('Backup import parse error')
      addToast('error', err instanceof Error ? err.message : 'Archivo de backup invalido')
    } finally {
      setLoading('')
    }
  }

  const handleRestore = async () => {
    if (!pendingBackup) return

    const confirmMessage = restoreMode === 'replace'
      ? 'Esto reemplaza la base local actual por el backup seleccionado. Es recomendable exportar un backup completo antes de continuar. ¿Restaurar de todos modos?'
      : 'Esto agrega o actualiza registros del backup sobre la base local actual. ¿Continuar?'

    if (!window.confirm(confirmMessage)) return

    setLoading('restore')
    try {
      await restoreBackup(pendingBackup, restoreMode)
      setPendingBackup(null)
      addToast('success', 'Backup restaurado correctamente')
      await refreshStorage()
    } catch (err) {
      console.error('Backup restore error')
      addToast('error', err instanceof Error ? err.message : 'No se pudo restaurar el backup')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="bg-glass border-b border-glass-border px-8 py-5">
        <h2 className="text-text-primary text-lg font-semibold">Seguridad y Backup</h2>
        <p className="text-text-secondary text-sm mt-1">
          Respaldo local, restauracion y controles de privacidad para comprobantes reales.
        </p>
      </div>

      <div className="p-8 space-y-6 max-w-6xl">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoTile label="Uso local" value={formatBytes(storage.usage)} />
          <InfoTile label="Cuota navegador" value={formatBytes(storage.quota)} />
          <InfoTile label="Ocupacion estimada" value={storage.percent !== undefined ? `${storage.percent}%` : 'No disponible'} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-glass-border rounded-lg bg-navy-800/50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <DatabaseBackup size={20} className="text-teal" />
              <h3 className="text-text-primary font-semibold">Backup completo</h3>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              Exporta comprobantes, periodos, lotes, mensajes y adjuntos guardados en IndexedDB.
            </p>
            <Button onClick={handleFullBackup} disabled={loading === 'full'}>
              <Download size={16} />
              Descargar backup completo
            </Button>
          </div>

          <div className="border border-glass-border rounded-lg bg-navy-800/50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <FileArchive size={20} className="text-teal" />
              <h3 className="text-text-primary font-semibold">Exportar periodo</h3>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              Descarga solo los comprobantes del periodo seleccionado, incluyendo PDFs/imagenes adjuntas.
            </p>
            <div className="mb-4">
              <PeriodoSelector periodoId={periodoId} onPeriodoChange={setPeriodoId} allowEmpty compact />
            </div>
            <Button onClick={handlePeriodoBackup} disabled={loading === 'periodo'}>
              <Download size={16} />
              Descargar periodo
            </Button>
          </div>
        </section>

        <section className="border border-glass-border rounded-lg bg-navy-800/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Upload size={20} className="text-teal" />
            <h3 className="text-text-primary font-semibold">Restaurar backup</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
            <div>
              <p className="text-text-secondary text-sm mb-4">
                Carga un JSON exportado desde esta aplicacion. El modo fusionar conserva datos actuales y actualiza coincidencias por id.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFile}
              />
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={loading === 'parse'}>
                  Seleccionar backup
                </Button>
                {pendingBackup && (
                  <Button onClick={handleRestore} disabled={loading === 'restore'}>
                    Restaurar
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-text-muted text-xs uppercase tracking-wide">Modo</label>
              <select
                value={restoreMode}
                onChange={(event) => setRestoreMode(event.target.value as 'merge' | 'replace')}
                className="w-full px-3 py-2 bg-navy-900 border border-glass-border rounded-lg text-text-primary text-sm outline-none"
              >
                <option value="merge">Fusionar</option>
                <option value="replace">Reemplazar base local</option>
              </select>
              {pendingBackup && (
                <div className="text-xs text-text-secondary border border-glass-border rounded-lg p-3 bg-navy-900">
                  <p className="text-text-primary font-semibold mb-1">Backup seleccionado</p>
                  <p>Exportado: {new Date(pendingBackup.manifest.exportedAt).toLocaleString('es-AR')}</p>
                  <p>Comprobantes: {pendingBackup.manifest.counts.comprobantes}</p>
                  <p>Adjuntos: {pendingBackup.manifest.includesAdjuntos ? 'Si' : 'No'}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border border-glass-border rounded-lg bg-navy-800/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={20} className="text-teal" />
            <h3 className="text-text-primary font-semibold">Privacidad y datos sensibles</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Base local', 'Comprobantes, importes, CUITs y adjuntos se guardan en IndexedDB del navegador.'],
              ['Backups', 'Los JSON exportados incluyen adjuntos en Base64 si existen; tratarlos como documentacion sensible.'],
              ['Login', 'El token y usuario quedan en localStorage para mantener sesion local.'],
              ['APIs externas', 'El OCR y la preliquidacion corren en el navegador. El chat puede enviar mensajes al backend y de ahi a OpenAI si se usa esa funcion.'],
              ['Logs', 'La app evita imprimir comprobantes completos o adjuntos en consola; solo registra errores genericos.'],
              ['Multiusuario', 'IndexedDB es local al navegador/perfil. Para multiusuario real falta separar datos por cuenta en backend o por base local.'],
            ].map(([title, body]) => (
              <div key={title} className="p-4 rounded-lg bg-navy-900 border border-glass-border">
                <p className="text-text-primary text-sm font-semibold mb-1">{title}</p>
                <p className="text-text-secondary text-xs leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2 text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>
              Si este sistema se usa en produccion con varios usuarios, el siguiente paso es migrar a almacenamiento por usuario en servidor, cifrado/backup administrado y politicas de retencion.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-glass-border rounded-lg bg-navy-800/50 p-4">
      <p className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-text-primary text-lg font-semibold">{value}</p>
    </div>
  )
}
