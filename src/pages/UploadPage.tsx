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
import { prepararComprobanteValidado } from '../services/validatorService'
import { addComprobante } from '../db/repositories/comprobanteRepository'
import { addLoteCarga, updateLoteCarga } from '../db/repositories/loteCargaRepository'
import { useToast } from '../context/ToastContext'
import ComprobanteForm from '../components/ComprobanteForm'
import PeriodoSelector from '../components/PeriodoSelector'
import Button from '../components/ui/Button'

type Step = 'upload' | 'processing' | 'review' | 'done'

interface BatchResult {
  fileName: string
  status: 'procesado' | 'duplicado' | 'error' | 'sin_texto'
  message?: string
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [parsedData, setParsedData] = useState<Partial<Comprobante>>({})
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])
  const [batchCurrent, setBatchCurrent] = useState('')
  const [batchIndex, setBatchIndex] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [periodoId, setPeriodoId] = useState<number | undefined>()
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

  const isSupportedFile = (selectedFile: File) =>
    selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf'

  const extractText = (
    selectedFile: File,
    onProgress?: (progress: OCRProgress) => void,
  ) => {
    if (selectedFile.type === 'application/pdf') {
      return extractTextFromPDF(selectedFile, onProgress)
    }
    return extractTextFromImage(selectedFile, onProgress)
  }

  const readFileAsDataURL = (selectedFile: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(selectedFile)
    })

  const handleFile = async (selectedFile: File) => {
    setError('')
    setFile(selectedFile)

    if (!periodoId) {
      setError('Seleccioná un período antes de cargar el comprobante.')
      return
    }

    if (!isSupportedFile(selectedFile)) {
      setError('Solo se aceptan imágenes (JPG, PNG) y PDFs')
      return
    }

    setStep('processing')
    let activeLoteId: number | undefined

    try {
      const createdLoteId = await addLoteCarga({
        periodoId,
        origen: 'manual',
        estado: 'procesando',
        cantidadArchivos: 1,
        createdAt: new Date().toISOString(),
      })
      activeLoteId = createdLoteId

      const text = await extractText(selectedFile, setOcrProgress)

      if (!text.trim()) {
        await updateLoteCarga(createdLoteId, { estado: 'observado' })
        setError('No se pudo extraer texto del archivo. Probá con una imagen más clara.')
        setStep('upload')
        return
      }

      const parsed = parseComprobante(text, selectedFile.name)
      parsed.fileName = selectedFile.name
      parsed.periodoId = periodoId
      parsed.loteId = createdLoteId
      parsed.origen = 'manual'
      parsed.estadoRevision = 'pendiente'

      parsed.archivoBase64 = await readFileAsDataURL(selectedFile)
      setParsedData(parsed)
      setStep('review')
    } catch {
      console.error('OCR error')
      if (activeLoteId) {
        await updateLoteCarga(activeLoteId, { estado: 'observado' })
      }
      setError('Error al procesar el archivo. Intentá de nuevo.')
      setStep('upload')
    }
  }

  const handleBatchFiles = async (files: File[]) => {
    setError('')
    setBatchResults([])
    setBatchCurrent('')

    if (!periodoId) {
      setError('SeleccionÃ¡ un perÃ­odo antes de cargar comprobantes.')
      return
    }

    const supported = files.filter(isSupportedFile)
    if (supported.length === 0) {
      setError('Solo se aceptan imÃ¡genes (JPG, PNG) y PDFs')
      return
    }

    if (supported.length === 1) {
      await handleFile(supported[0])
      return
    }

    setStep('processing')
    setBatchTotal(supported.length)
    setBatchIndex(0)

    const loteId = await addLoteCarga({
      periodoId,
      origen: 'manual',
      estado: 'procesando',
      cantidadArchivos: supported.length,
      createdAt: new Date().toISOString(),
    })

    const results: BatchResult[] = []

    for (let index = 0; index < supported.length; index++) {
      const currentFile = supported[index]
      setBatchIndex(index + 1)
      setBatchCurrent(currentFile.name)
      setFile(currentFile)
      setOcrProgress(null)

      try {
        const text = await extractText(currentFile, setOcrProgress)
        if (!text.trim()) {
          results.push({
            fileName: currentFile.name,
            status: 'sin_texto',
            message: 'No se pudo extraer texto',
          })
          setBatchResults([...results])
          continue
        }

        const parsed = parseComprobante(text, currentFile.name)
        const validado = await prepararComprobanteValidado({
          ...parsed,
          fileName: currentFile.name,
          archivoBase64: await readFileAsDataURL(currentFile),
          periodoId,
          loteId,
          origen: 'manual',
          estadoRevision: 'pendiente',
        })

        const duplicado = validado.validaciones?.some((v) => v.tipo === 'duplicado')
        if (duplicado) {
          results.push({
            fileName: currentFile.name,
            status: 'duplicado',
            message: 'Comprobante duplicado',
          })
          setBatchResults([...results])
          continue
        }

        await addComprobante(validado as Comprobante)
        results.push({ fileName: currentFile.name, status: 'procesado' })
        setBatchResults([...results])
      } catch {
        console.error('Batch OCR error')
        results.push({
          fileName: currentFile.name,
          status: 'error',
          message: 'Error al procesar el archivo',
        })
        setBatchResults([...results])
      }
    }

    await updateLoteCarga(loteId, {
      estado: results.some((r) => r.status !== 'procesado') ? 'observado' : 'procesado',
    })

    setBatchCurrent('')
    setStep('done')
    addToast(
      results.some((r) => r.status !== 'procesado') ? 'info' : 'success',
      `Lote procesado: ${results.filter((r) => r.status === 'procesado').length}/${supported.length}`,
    )
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length) handleBatchFiles(droppedFiles)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length) handleBatchFiles(selected)
  }

  const handleSave = async (comprobante: Partial<Comprobante>) => {
    try {
      const validado = await prepararComprobanteValidado(comprobante)
      const duplicado = validado.validaciones?.some((v) => v.tipo === 'duplicado')

      if (duplicado) {
        setError('Este comprobante ya existe para el mismo CUIT, punto de venta y número.')
        addToast('error', 'Comprobante duplicado')
        return
      }

      await addComprobante(validado as Comprobante)
      if (validado.loteId) {
        await updateLoteCarga(validado.loteId, { estado: 'procesado' })
      }
      setStep('done')
      addToast('success', 'Comprobante guardado correctamente')
    } catch {
      console.error('Save error')
      setError('Error al guardar el comprobante')
      addToast('error', 'Error al guardar el comprobante')
    }
  }

  const handleNewUpload = () => {
    setStep('upload')
    setFile(null)
    setParsedData({})
    setOcrProgress(null)
    setBatchResults([])
    setBatchCurrent('')
    setBatchIndex(0)
    setBatchTotal(0)
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
          <div className="space-y-4">
          <div className="bg-glass border border-glass-border rounded-2xl p-5">
            <PeriodoSelector
              periodoId={periodoId}
              onPeriodoChange={setPeriodoId}
            />
          </div>
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
              multiple
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
              Formatos: JPG, PNG, PDF. Podes seleccionar varios archivos.
            </p>

            {error && (
              <div className="mt-4 bg-error-bg border border-[rgba(255,82,82,0.3)] text-error px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
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
              {batchCurrent && (
                <span className="block text-text-muted text-xs mt-1">
                  Archivo {batchIndex} de {batchTotal}: {batchCurrent}
                </span>
              )}
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
            {batchResults.length > 0 && (
              <div className="max-w-xl mx-auto mb-8 text-left border border-glass-border rounded-lg overflow-hidden">
                {batchResults.map((result) => (
                  <div
                    key={result.fileName}
                    className="flex items-center justify-between gap-3 px-4 py-2 border-b border-glass-border/40 text-xs"
                  >
                    <span className="text-text-secondary truncate">{result.fileName}</span>
                    <span
                      className={
                        result.status === 'procesado'
                          ? 'text-teal'
                          : result.status === 'duplicado'
                            ? 'text-yellow-400'
                            : 'text-error'
                      }
                    >
                      {result.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
