import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import {
  Upload, FileDown, ScanSearch, Loader, FileEdit, CheckCircle,
  XCircle, AlertTriangle, FileText, Check, Download, RefreshCw, StopCircle
} from 'lucide-react'
import type { Comprobante, BatchItem } from '../types/comprobante'
import { extractTextFromImage, extractTextFromPDF, type OCRProgress } from '../services/ocrService'
import { parseComprobante } from '../services/parserService'
import { prepararComprobanteValidado } from '../services/validatorService'
import { addComprobante } from '../db/repositories/comprobanteRepository'
import { addLoteCarga, updateLoteCarga } from '../db/repositories/loteCargaRepository'
import { useToast } from '../context/ToastContext'
import ComprobanteForm from '../components/ComprobanteForm'
import PeriodoSelector from '../components/PeriodoSelector'
import Button from '../components/ui/Button'
import Modal from '../components/Modal'
import { exportBatchReport } from '../services/exportService'

type Step = 'upload' | 'processing' | 'batch-review' | 'done'

export default function UploadPage() {
  const [step, setStep] = useState<Step>('upload')
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [batchResults, setBatchResults] = useState<BatchItem[]>([])
  const [batchCurrent, setBatchCurrent] = useState('')
  const [batchIndex, setBatchIndex] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [periodoId, setPeriodoId] = useState<number | undefined>()
  const [currentLoteId, setCurrentLoteId] = useState<number | undefined>()
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [reviewItem, setReviewItem] = useState<BatchItem | null>(null)
  
  const isCancelled = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const isDirty = step === 'batch-review'

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

  const processFiles = async (files: File[], isRetry = false) => {
    setError('')
    isCancelled.current = false
    setStep('processing')
    setBatchTotal(files.length)
    setBatchIndex(0)

    let loteId = currentLoteId
    if (!isRetry || !loteId) {
      loteId = await addLoteCarga({
        periodoId: periodoId!,
        origen: 'manual',
        estado: 'procesando',
        cantidadArchivos: files.length,
        createdAt: new Date().toISOString(),
      })
      setCurrentLoteId(loteId)
    }

    const newResults: BatchItem[] = []

    for (let index = 0; index < files.length; index++) {
      if (isCancelled.current) break

      const currentFile = files[index]
      setBatchIndex(index + 1)
      setBatchCurrent(currentFile.name)
      setOcrProgress(null)

      const baseItem: BatchItem = {
        id: Date.now().toString() + Math.random(),
        file: currentFile,
        fileName: currentFile.name,
        status: 'error',
      }

      try {
        const text = await extractText(currentFile, setOcrProgress)
        if (!text.trim()) {
          newResults.push({ ...baseItem, status: 'sin_texto', message: 'No se pudo extraer texto' })
          continue
        }

        const parsed = parseComprobante(text, currentFile.name)
        const validado = await prepararComprobanteValidado({
          ...parsed,
          ocrRawText: text,
          fileName: currentFile.name,
          archivoBase64: await readFileAsDataURL(currentFile),
          periodoId,
          loteId,
          origen: 'manual',
          estadoRevision: 'pendiente',
        })

        const isDuplicateInMemory = (isRetry ? batchResults : newResults).some(r => 
          r.status === 'procesado' && 
          r.comprobante?.cuit === validado.cuit && 
          r.comprobante?.puntoVenta === validado.puntoVenta && 
          r.comprobante?.numero === validado.numero
        )
        const isDuplicateInDb = validado.validaciones?.some((v) => v.tipo === 'duplicado')

        if (isDuplicateInMemory || isDuplicateInDb) {
          newResults.push({ ...baseItem, status: 'duplicado', message: 'Comprobante duplicado', comprobante: validado })
        } else {
          newResults.push({ ...baseItem, status: 'procesado', comprobante: validado })
        }
      } catch (err) {
        console.error('Batch OCR error', err)
        newResults.push({ ...baseItem, status: 'error', message: 'Error al procesar el archivo' })
      }
    }

    if (isCancelled.current) {
      if (!isRetry && loteId) await updateLoteCarga(loteId, { estado: 'observado' })
      setStep('upload')
      if (!isRetry) setBatchResults([])
      addToast('info', 'Carga cancelada. Se han descartado los archivos del lote.')
      return
    }

    setBatchResults(prev => isRetry ? [...prev, ...newResults] : newResults)
    setBatchCurrent('')
    setStep('batch-review')
  }

  const handleBatchFiles = async (files: File[]) => {
    if (!periodoId) {
      setError('Seleccioná un período antes de cargar comprobantes.')
      return
    }
    const supported = files.filter(isSupportedFile)
    if (supported.length === 0) {
      setError('Solo se aceptan imágenes (JPG, PNG) y PDFs')
      return
    }
    setBatchResults([])
    await processFiles(supported)
  }

  const handleCancelProcess = () => {
    isCancelled.current = true
  }

  const handleRetryFailed = () => {
    const failedFiles = batchResults
      .filter(r => r.status === 'error' || r.status === 'sin_texto')
      .map(r => r.file)
      
    if (failedFiles.length === 0) return
    
    setBatchResults(prev => prev.filter(r => r.status !== 'error' && r.status !== 'sin_texto'))
    processFiles(failedFiles, true)
  }

  const handleReviewSave = async (updatedComprobante: Partial<Comprobante>) => {
    if (!reviewItem) return

    try {
      const validado = await prepararComprobanteValidado({
        ...reviewItem.comprobante,
        ...updatedComprobante,
        ocrRawText: updatedComprobante.ocrRawText || reviewItem.comprobante?.ocrRawText,
      })

      const isDuplicateInDb = validado.validaciones?.some((v) => v.tipo === 'duplicado')
      const isDuplicateInMemory = batchResults.some(r => 
        r.id !== reviewItem.id &&
        r.status === 'procesado' && 
        r.comprobante?.cuit === validado.cuit && 
        r.comprobante?.puntoVenta === validado.puntoVenta && 
        r.comprobante?.numero === validado.numero
      )

      const newStatus = (isDuplicateInDb || isDuplicateInMemory) ? 'duplicado' : 'procesado'

      setBatchResults(prev => prev.map(item => 
        item.id === reviewItem.id 
          ? { ...item, status: newStatus, comprobante: validado, message: newStatus === 'duplicado' ? 'Comprobante duplicado' : undefined } 
          : item
      ))
      setReviewItem(null)
      addToast('success', 'Comprobante actualizado en el lote')
    } catch {
      addToast('error', 'Error al validar el comprobante')
    }
  }

  const handleSaveValid = async () => {
    const validItems = batchResults.filter(r => r.status === 'procesado' && r.comprobante)
    if (validItems.length === 0) {
       addToast('info', 'No hay comprobantes válidos para guardar')
       return
    }
    
    try {
      for (const item of validItems) {
        await addComprobante(item.comprobante as Comprobante)
      }
      if (currentLoteId) {
        const hasErrors = batchResults.some(r => r.status !== 'procesado' && r.status !== 'duplicado')
        await updateLoteCarga(currentLoteId, { estado: hasErrors ? 'observado' : 'procesado' })
      }
      setStep('done')
      addToast('success', `${validItems.length} comprobantes guardados correctamente`)
    } catch (err) {
      console.error(err)
      addToast('error', 'Error al guardar los comprobantes')
    }
  }

  const handleExportReport = () => {
    if (currentLoteId) {
      exportBatchReport(batchResults, currentLoteId)
      addToast('success', 'Reporte exportado con éxito')
    }
  }

  const handleNewUpload = () => {
    setStep('upload')
    setOcrProgress(null)
    setBatchResults([])
    setBatchCurrent('')
    setBatchIndex(0)
    setBatchTotal(0)
    setCurrentLoteId(undefined)
    setError('')
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

  const progressPercent = ocrProgress ? Math.round(ocrProgress.progress * 100) : 0

  const summary = {
    valid: batchResults.filter(r => r.status === 'procesado').length,
    duplicate: batchResults.filter(r => r.status === 'duplicado').length,
    error: batchResults.filter(r => r.status === 'error' || r.status === 'sin_texto').length,
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="bg-glass border-b border-glass-border px-8 py-4">
        <h2 className="text-text-primary text-lg font-semibold">Carga de Comprobantes</h2>
        <p className="text-text-muted text-xs">Subí facturas, tickets o recibos para procesarlos automáticamente</p>
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {step === 'upload' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-glass border border-glass-border rounded-2xl p-5">
              <PeriodoSelector periodoId={periodoId} onPeriodoChange={setPeriodoId} />
            </div>
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                dragOver ? 'border-teal bg-teal/10' : 'border-glass-border hover:border-teal/50 hover:bg-glass'
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
                {dragOver ? <FileDown size={64} className="text-teal" /> : <Upload size={64} className="text-text-muted" />}
              </div>
              <h3 className="text-text-primary text-lg font-semibold mb-2">
                {dragOver ? 'Soltá el archivo aquí' : 'Arrastrá tu comprobante'}
              </h3>
              <p className="text-text-muted text-sm mb-6">o hacé clic para seleccionar un archivo</p>
              <p className="text-text-muted text-xs">Formatos: JPG, PNG, PDF. Podes seleccionar varios archivos.</p>
              {error && (
                <div className="mt-4 bg-error-bg border border-[rgba(255,82,82,0.3)] text-error px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="bg-glass border border-glass-border rounded-2xl p-12 text-center max-w-3xl mx-auto">
            <div className="mb-4 flex justify-center">
              {ocrProgress?.status === 'recognizing' ? (
                <ScanSearch size={64} className="text-teal" />
              ) : (
                <Loader size={64} className="text-teal animate-spin" />
              )}
            </div>
            <h3 className="text-text-primary text-lg font-semibold mb-2">
              {ocrProgress?.status === 'recognizing' ? 'Leyendo el comprobante...' : 'Preparando el archivo...'}
            </h3>
            <p className="text-text-muted text-sm mb-6">
              {batchCurrent && (
                <span className="block text-text-muted text-xs mt-1">
                  Archivo {batchIndex} de {batchTotal}: {batchCurrent}
                </span>
              )}
            </p>

            <div className="max-w-md mx-auto mb-6">
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal to-teal-dark rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-text-muted text-xs mt-2">{progressPercent}%</p>
            </div>
            
            <Button variant="secondary" onClick={handleCancelProcess} className="mt-4">
              <StopCircle size={18} className="mr-2" /> Cancelar Carga
            </Button>
          </div>
        )}

        {step === 'batch-review' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-text-primary text-xl font-semibold flex items-center gap-2">
                  <FileText className="text-teal" size={24} /> Revisión de Lote
                </h3>
                <p className="text-text-muted text-sm">Revisá y corregí los comprobantes antes de guardarlos.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleExportReport}>
                  <Download size={18} className="mr-2" /> Exportar Reporte
                </Button>
                {summary.error > 0 && (
                   <Button variant="secondary" onClick={handleRetryFailed}>
                     <RefreshCw size={18} className="mr-2" /> Reintentar Fallidos
                   </Button>
                )}
                <Button onClick={handleSaveValid} disabled={summary.valid === 0}>
                  <Check size={18} className="mr-2" /> Guardar {summary.valid} Válidos
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-glass border border-glass-border rounded-xl p-4 flex items-center gap-4">
                <div className="bg-teal/20 p-3 rounded-full text-teal"><CheckCircle size={24} /></div>
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider">Válidos</p>
                  <p className="text-text-primary text-2xl font-bold">{summary.valid}</p>
                </div>
              </div>
              <div className="bg-glass border border-glass-border rounded-xl p-4 flex items-center gap-4">
                <div className="bg-yellow-500/20 p-3 rounded-full text-yellow-500"><AlertTriangle size={24} /></div>
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider">Duplicados</p>
                  <p className="text-text-primary text-2xl font-bold">{summary.duplicate}</p>
                </div>
              </div>
              <div className="bg-glass border border-glass-border rounded-xl p-4 flex items-center gap-4">
                <div className="bg-error/20 p-3 rounded-full text-error"><XCircle size={24} /></div>
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider">Errores</p>
                  <p className="text-text-primary text-2xl font-bold">{summary.error}</p>
                </div>
              </div>
            </div>

            <div className="bg-glass border border-glass-border rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-glass-border/50 text-text-muted text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-medium">Estado</th>
                    <th className="py-3 px-4 font-medium">Archivo</th>
                    <th className="py-3 px-4 font-medium">Tipo</th>
                    <th className="py-3 px-4 font-medium">CUIT</th>
                    <th className="py-3 px-4 font-medium">Total</th>
                    <th className="py-3 px-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/30">
                  {batchResults.map(item => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${item.status === 'procesado' ? 'bg-teal/10 text-teal' :
                            item.status === 'duplicado' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-error/10 text-error'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-primary text-sm truncate max-w-[200px]" title={item.fileName}>
                        {item.fileName}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-sm">
                         {item.comprobante?.tipo || '-'}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-sm">
                         {item.comprobante?.cuit || '-'}
                      </td>
                      <td className="py-3 px-4 text-text-primary font-medium text-sm">
                         {item.comprobante?.total ? `$${item.comprobante.total}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setReviewItem(item)}
                          className="text-teal hover:text-teal-light opacity-50 hover:opacity-100 transition-opacity p-2 cursor-pointer"
                          title="Revisar y editar"
                        >
                          <FileEdit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {batchResults.length === 0 && (
                <div className="p-8 text-center text-text-muted">No hay resultados en el lote.</div>
              )}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-glass border border-glass-border rounded-2xl p-12 text-center max-w-3xl mx-auto">
            <div className="mb-4 flex justify-center">
              <CheckCircle size={64} className="text-teal" />
            </div>
            <h3 className="text-text-primary text-xl font-semibold mb-2">
              Lote procesado
            </h3>
            <p className="text-text-muted text-sm mb-8">
              Se guardaron {summary.valid} comprobantes en la base de datos local.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleNewUpload} size="lg">
                Cargar otro lote
              </Button>
              <Button variant="secondary" onClick={() => navigate('/bandeja')} size="lg">
                Ir a la bandeja
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {reviewItem && (
        <Modal 
          open={!!reviewItem} 
          onClose={() => setReviewItem(null)} 
          title={`Revisando: ${reviewItem.fileName}`}
          wide
        >
          <div className="max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
            {reviewItem.comprobante ? (
              <ComprobanteForm
                initial={reviewItem.comprobante}
                onSave={handleReviewSave}
                onCancel={() => setReviewItem(null)}
                fileName={reviewItem.fileName}
              />
            ) : (
              <div className="p-6 text-center text-text-muted">
                <AlertTriangle size={48} className="mx-auto mb-4 text-error opacity-80" />
                <p>Este archivo no se pudo parsear correctamente.</p>
                <p className="text-xs mt-2">Mensaje: {reviewItem.message}</p>
                <div className="mt-6">
                  <Button variant="secondary" onClick={() => setReviewItem(null)}>Cerrar</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
