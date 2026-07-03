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
      addToast('success', 'Copia completa descargada')
      await refreshStorage()
    } catch (err) {
      console.error('Backup export error')
      addToast('error', err instanceof Error ? err.message : 'No se pudo descargar la copia')
    } finally {
      setLoading('')
    }
  }

  const handlePeriodoBackup = async () => {
    if (!periodoId) {
      addToast('error', 'Selecciona un periodo para descargar')
      return
    }

    setLoading('periodo')
    try {
      const backup = await buildPeriodoBackup(periodoId)
      downloadBackup(backup)
      addToast('success', 'Periodo descargado')
      await refreshStorage()
    } catch (err) {
      console.error('Period backup export error')
      addToast('error', err instanceof Error ? err.message : 'No se pudo descargar el periodo')
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
      addToast('success', 'Archivo listo para recuperar')
    } catch (err) {
      console.error('Backup import parse error')
      addToast('error', err instanceof Error ? err.message : 'El archivo no es valido')
    } finally {
      setLoading('')
    }
  }

  const handleRestore = async () => {
    if (!pendingBackup) return

    const confirmMessage = restoreMode === 'replace'
      ? 'Esto va a reemplazar la informacion guardada en este equipo por la del archivo seleccionado. Si quieres, antes puedes descargar una copia actual. Continuar?'
      : 'Esto va a sumar o actualizar informacion del archivo sin borrar lo que ya tienes guardado. Continuar?'

    if (!window.confirm(confirmMessage)) return

    setLoading('restore')
    try {
      await restoreBackup(pendingBackup, restoreMode)
      setPendingBackup(null)
      addToast('success', 'Copia recuperada correctamente')
      await refreshStorage()
    } catch (err) {
      console.error('Backup restore error')
      addToast('error', err instanceof Error ? err.message : 'No se pudo recuperar la copia')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="bg-glass border-b border-glass-border px-8 py-5">
        <h2 className="text-text-primary text-lg font-semibold">Seguridad y copias</h2>
        <p className="text-text-secondary text-sm mt-1">
          Guarda una copia de tu informacion y recuperala cuando la necesites.
        </p>
      </div>

      <div className="p-8 space-y-6 max-w-6xl">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoTile label="Espacio usado" value={formatBytes(storage.usage)} />
          <InfoTile label="Espacio disponible" value={formatBytes(storage.quota)} />
          <InfoTile label="Nivel de ocupacion" value={storage.percent !== undefined ? `${storage.percent}%` : 'No disponible'} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-glass-border rounded-lg bg-navy-800/50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <DatabaseBackup size={20} className="text-teal" />
              <h3 className="text-text-primary font-semibold">Guardar copia completa</h3>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              Descarga una copia con toda la informacion cargada en esta app.
            </p>
            <Button onClick={handleFullBackup} disabled={loading === 'full'}>
              <Download size={16} />
              Descargar copia completa
            </Button>
          </div>

          <div className="border border-glass-border rounded-lg bg-navy-800/50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <FileArchive size={20} className="text-teal" />
              <h3 className="text-text-primary font-semibold">Guardar un periodo</h3>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              Descarga solo la informacion del periodo que selecciones.
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
            <h3 className="text-text-primary font-semibold">Recuperar una copia</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
            <div>
              <p className="text-text-secondary text-sm mb-4">
                Selecciona una copia descargada desde esta app para volver a cargarla.
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
                  Seleccionar archivo
                </Button>
                {pendingBackup && (
                  <Button onClick={handleRestore} disabled={loading === 'restore'}>
                    Recuperar
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-text-muted text-xs uppercase tracking-wide">Como recuperar</label>
              <select
                value={restoreMode}
                onChange={(event) => setRestoreMode(event.target.value as 'merge' | 'replace')}
                className="w-full px-3 py-2 bg-navy-900 border border-glass-border rounded-lg text-text-primary text-sm outline-none"
              >
                <option value="merge">Sumar sin borrar</option>
                <option value="replace">Reemplazar lo actual</option>
              </select>
              {pendingBackup && (
                <div className="text-xs text-text-secondary border border-glass-border rounded-lg p-3 bg-navy-900">
                  <p className="text-text-primary font-semibold mb-1">Archivo seleccionado</p>
                  <p>Fecha: {new Date(pendingBackup.manifest.exportedAt).toLocaleString('es-AR')}</p>
                  <p>Comprobantes: {pendingBackup.manifest.counts.comprobantes}</p>
                  <p>Incluye archivos: {pendingBackup.manifest.includesAdjuntos ? 'Si' : 'No'}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border border-glass-border rounded-lg bg-navy-800/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={20} className="text-teal" />
            <h3 className="text-text-primary font-semibold">Antes de compartir una copia</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Tu informacion queda en este equipo', 'Lo que cargues en la app se guarda en este navegador, en esta computadora.'],
              ['La copia puede incluir archivos adjuntos', 'Si tus comprobantes tienen imagenes o PDFs, la copia tambien puede llevarlos.'],
              ['Trata la copia como informacion privada', 'Si la vas a enviar por mail o chat, hazlo solo con personas de confianza.'],
              ['Cada usuario trabaja por separado', 'Lo que ve una persona en su navegador no aparece automaticamente en otro equipo.'],
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
              Si varias personas van a usar esta app, conviene acordar un habito simple para descargar y guardar copias con frecuencia.
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
