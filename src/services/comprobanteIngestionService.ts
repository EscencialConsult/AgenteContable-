import type { Comprobante, OrigenComprobante } from '../types/comprobante'
import { addComprobante } from '../db/repositories/comprobanteRepository'
import { addLoteCarga, updateLoteCarga } from '../db/repositories/loteCargaRepository'
import { getOrCreatePeriodo, getPeriodoFromFecha } from '../db/repositories/periodoRepository'
import { extractTextFromImage, extractTextFromPDF, type OCRProgress } from './ocrService'
import { parseComprobante } from './parserService'
import { prepararComprobanteValidado } from './validatorService'

export type IngestionStatus = 'procesado' | 'duplicado' | 'sin_texto'

export interface ComprobanteIngestionResult {
  status: IngestionStatus
  comprobante?: Partial<Comprobante>
  loteId?: number
  periodoId?: number
  extractedText?: string
  message?: string
}

interface IngestOptions {
  periodoId?: number
  origen?: OrigenComprobante
  estadoRevision?: Comprobante['estadoRevision']
}

export function isSupportedComprobanteFile(file: File) {
  return file.type.startsWith('image/') || file.type === 'application/pdf'
}

export function extractTextFromComprobanteFile(
  file: File,
  onProgress?: (progress: OCRProgress) => void,
) {
  if (file.type === 'application/pdf') {
    return extractTextFromPDF(file, onProgress)
  }
  return extractTextFromImage(file, onProgress)
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function resolvePeriodoId(comprobante: Partial<Comprobante>, periodoId?: number) {
  if (periodoId) return periodoId
  const { mes, anio } = getPeriodoFromFecha(comprobante.fecha || '')
  return getOrCreatePeriodo(mes, anio)
}

export async function ingestComprobanteFile(
  file: File,
  options: IngestOptions = {},
  onProgress?: (progress: OCRProgress) => void,
): Promise<ComprobanteIngestionResult> {
  if (!isSupportedComprobanteFile(file)) {
    throw new Error('Formato no soportado')
  }

  const extractedText = await extractTextFromComprobanteFile(file, onProgress)
  if (!extractedText.trim()) {
    return {
      status: 'sin_texto',
      extractedText,
      message: 'No se pudo extraer texto del archivo',
    }
  }

  const parsed = parseComprobante(extractedText, file.name)
  const periodoId = await resolvePeriodoId(parsed, options.periodoId)
  const origen = options.origen || 'manual'

  const loteId = await addLoteCarga({
    periodoId,
    origen,
    estado: 'procesando',
    cantidadArchivos: 1,
    createdAt: new Date().toISOString(),
  })

  try {
    const validado = await prepararComprobanteValidado({
      ...parsed,
      ocrRawText: extractedText,
      fileName: file.name,
      archivoBase64: await readFileAsDataURL(file),
      periodoId,
      loteId,
      origen,
      estadoRevision: options.estadoRevision || 'pendiente',
    })

    const duplicado = validado.validaciones?.some((validacion) => validacion.tipo === 'duplicado')
    if (duplicado) {
      await updateLoteCarga(loteId, { estado: 'observado' })
      return {
        status: 'duplicado',
        comprobante: validado,
        loteId,
        periodoId,
        extractedText,
        message: 'Comprobante duplicado',
      }
    }

    await addComprobante(validado as Comprobante)
    await updateLoteCarga(loteId, { estado: 'procesado' })

    return {
      status: 'procesado',
      comprobante: validado,
      loteId,
      periodoId,
      extractedText,
    }
  } catch (error) {
    await updateLoteCarga(loteId, { estado: 'observado' })
    throw error
  }
}
