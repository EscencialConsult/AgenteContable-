import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import {
  Upload,
  FileDown,
  ScanSearch,
  Loader,
  FileEdit,
  CheckCircle,
} from 'lucide-react'
import type { Comprobante } from '../types/comprobante'
import { extractTextFromImage, extractTextFromPDF, type OCRProgress } from '../services/ocrService'
import { parseComprobante } from '../services/parserService'
import { addComprobante } from '../db/repositories/comprobanteRepository'
import { useToast } from '../context/ToastContext'
import ComprobanteForm from '../components/ComprobanteForm'
import Button from '../components/ui/Button'

type Step = 'upload' | 'processing' | 'review' | 'done'

export default function UploadPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [parsedData, setParsedData] = useState<Partial<Comprobante>>({})
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { addToast } = useToast()
  const isDirty = step === 'review'

  useBlocker(isDirty)

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleFile = async (selectedFile: File) => {
    setError('')
    setFile(selectedFile)

    const isImage = selectedFile.type.startsWith('image/')
    const isPDF = selectedFile.type === 'application/pdf'

    if (!isImage && !isPDF) {
      setError('Solo se aceptan imágenes (JPG, PNG) y PDFs')
      return
    }

    setStep('processing')

    try {
      let text: string

      if (isPDF) {
        text = await extractTextFromPDF(selectedFile, setOcrProgress)
      } else {
        text = await extractTextFromImage(selectedFile, setOcrProgress)
      }

      if (!text.trim()) {
        setError('No se pudo extraer texto del archivo. Probá con una imagen más clara.')
        setStep('upload')
        return
      }

      const parsed = parseComprobante(text, selectedFile.name)
      parsed.fileName = selectedFile.name

      const reader = new FileReader()
      reader.onload = () => {
        parsed.archivoBase64 = reader.result as string
        setParsedData(parsed)
        setStep('review')
      }
      reader.readAsDataURL(selectedFile)
    } catch (err) {
      console.error('OCR error:', err)
      setError('Error al procesar el archivo. Intentá de nuevo.')
      setStep('upload')
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFile(droppedFile)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const handleSave = async (comprobante: Partial<Comprobante>) => {
    try {
      await addComprobante(comprobante as Comprobante)
      setStep('done')
      addToast('success', 'Comprobante guardado correctamente')
    } catch (err) {
      console.error('Save error:', err)
      setError('Error al guardar el comprobante')
      addToast('error', 'Error al guardar el comprobante')
    }
  }

  const handleNewUpload = () => {
    setStep('upload')
    setFile(null)
    setParsedData({})
    setOcrProgress(null)
    setError('')
  }

  const progressPercent = ocrProgress
    ? Math.round(ocrProgress.progress * 100)
    : 0

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="bg-glass border-b border-glass-border px-8 py-4">
        <h2 className="text-text-primary text-lg font-semibold">Carga de Comprobantes</h2>
        <p className="text-text-muted text-xs">Subí facturas, tickets o recibos para procesarlos automáticamente</p>
      </div>

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {step === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
              dragOver
                ? 'border-teal bg-teal/10'
                : 'border-glass-border hover:border-teal/50 hover:bg-glass'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="mb-4 flex justify-center">
              {dragOver ? (
                <FileDown size={64} className="text-teal" />
              ) : (
                <Upload size={64} className="text-text-muted" />
              )}
            </div>
            <h3 className="text-text-primary text-lg font-semibold mb-2">
              {dragOver ? 'Soltá el archivo aquí' : 'Arrastrá tu comprobante'}
            </h3>
            <p className="text-text-muted text-sm mb-6">
              o hacé clic para seleccionar un archivo
            </p>
            <p className="text-text-muted text-xs">
              Formatos: JPG, PNG, PDF
            </p>

            {error && (
              <div className="mt-4 bg-error-bg border border-[rgba(255,82,82,0.3)] text-error px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'processing' && (
          <div className="bg-glass border border-glass-border rounded-2xl p-12 text-center">
            <div className="mb-4 flex justify-center">
              {ocrProgress?.status === 'recognizing' ? (
                <ScanSearch size={64} className="text-teal" />
              ) : (
                <Loader size={64} className="text-teal animate-spin" />
              )}
            </div>
            <h3 className="text-text-primary text-lg font-semibold mb-2">
              {ocrProgress?.status === 'recognizing'
                ? 'Leyendo el comprobante...'
                : 'Preparando el archivo...'}
            </h3>
            <p className="text-text-muted text-sm mb-6">
              {file?.name}
            </p>

            <div className="max-w-md mx-auto">
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal to-teal-dark rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-text-muted text-xs mt-2">
                {progressPercent}%
              </p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="bg-glass border border-glass-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileEdit size={24} className="text-teal" />
              <div>
                <h3 className="text-text-primary font-semibold">Revisar datos extraídos</h3>
                <p className="text-text-muted text-xs">Corregí cualquier campo antes de guardar</p>
              </div>
            </div>
            <ComprobanteForm
              initial={parsedData}
              onSave={handleSave}
              onCancel={handleNewUpload}
              fileName={file?.name}
            />
          </div>
        )}

        {step === 'done' && (
          <div className="bg-glass border border-glass-border rounded-2xl p-12 text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle size={64} className="text-teal" />
            </div>
            <h3 className="text-text-primary text-xl font-semibold mb-2">
              Comprobante guardado
            </h3>
            <p className="text-text-muted text-sm mb-8">
              Los datos se almacenaron correctamente en la base de datos local.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleNewUpload} size="lg">
                Cargar otro
              </Button>
              <Button variant="secondary" onClick={() => navigate('/bandeja')} size="lg">
                Ir a la bandeja
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
