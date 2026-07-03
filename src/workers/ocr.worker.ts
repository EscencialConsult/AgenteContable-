import Tesseract from 'tesseract.js'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface StartMessage {
  type: 'start'
  fileBuffer: ArrayBuffer
  fileName: string
  fileType: string
}

interface ProgressMessage {
  type: 'progress'
  status: 'loading' | 'recognizing' | 'done' | 'error'
  progress: number
}

interface ResultMessage {
  type: 'result'
  text: string
}

interface ErrorMessage {
  type: 'error'
  error: string
}

type ImageMode = 'gray' | 'binary' | 'contrast'

interface CropRatio {
  x: number
  y: number
  width: number
  height: number
}

interface OCRVariant {
  label: string
  blob: Blob
  psm: Tesseract.PSM
}

self.onmessage = async (e: MessageEvent<StartMessage>) => {
  const { fileBuffer, fileType } = e.data
  const blob = new Blob([fileBuffer], { type: fileType })
  const isPDF = fileType === 'application/pdf'

  try {
    if (isPDF) {
      const text = await processPDF(blob)
      self.postMessage({ type: 'result', text } as ResultMessage)
    } else {
      const text = await processImage(blob)
      self.postMessage({ type: 'result', text } as ResultMessage)
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'No se pudo extraer texto del archivo',
    } as ErrorMessage)
  }
}

function postProgress(status: ProgressMessage['status'], progress: number) {
  self.postMessage({ type: 'progress', status, progress } as ProgressMessage)
}

async function processImage(blob: Blob): Promise<string> {
  postProgress('loading', 0)
  const text = await recognizeInvoiceImage(blob)
  postProgress('done', 1)
  return text
}

async function preprocessImage(
  blob: Blob,
  mode: ImageMode = 'binary',
  crop?: CropRatio,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const sourceX = Math.round((crop?.x || 0) * bitmap.width)
  const sourceY = Math.round((crop?.y || 0) * bitmap.height)
  const sourceWidth = Math.round((crop?.width || 1) * bitmap.width)
  const sourceHeight = Math.round((crop?.height || 1) * bitmap.height)
  const longestSide = Math.max(sourceWidth, sourceHeight)
  const scale = longestSide < 1200 ? 3.2 : longestSide < 1900 ? 2.4 : 1.7
  const width = Math.round(sourceWidth * scale)
  const height = Math.round(sourceHeight * scale)
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) return blob

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  )
  bitmap.close()

  const imageData = context.getImageData(0, 0, width, height)
  const data = imageData.data
  let total = 0

  for (let i = 0; i < data.length; i += 4) {
    let gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
    if (mode === 'contrast') {
      gray = Math.max(0, Math.min(255, Math.round((gray - 128) * 1.55 + 128)))
    }
    total += gray
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  if (mode === 'gray' || mode === 'contrast') {
    context.putImageData(imageData, 0, 0)
    return canvas.convertToBlob({ type: 'image/png' })
  }

  const average = total / (data.length / 4)
  const threshold = Math.max(125, Math.min(215, average - 22))
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] < threshold ? 0 : 255
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }

  context.putImageData(imageData, 0, 0)
  return canvas.convertToBlob({ type: 'image/png' })
}

async function buildOCRVariants(blob: Blob): Promise<OCRVariant[]> {
  const fullGray = await preprocessImage(blob, 'gray')
  const fullBinary = await preprocessImage(blob, 'binary')
  const fullContrast = await preprocessImage(blob, 'contrast')
  const header = await preprocessImage(blob, 'gray', { x: 0, y: 0, width: 1, height: 0.42 })
  const body = await preprocessImage(blob, 'gray', { x: 0, y: 0.28, width: 1, height: 0.42 })
  const totals = await preprocessImage(blob, 'gray', { x: 0.38, y: 0.62, width: 0.62, height: 0.34 })
  const footer = await preprocessImage(blob, 'gray', { x: 0, y: 0.78, width: 1, height: 0.22 })

  return [
    { label: 'full-gray-auto', blob: fullGray, psm: Tesseract.PSM.AUTO },
    { label: 'full-binary-sparse', blob: fullBinary, psm: Tesseract.PSM.SPARSE_TEXT },
    { label: 'full-contrast-block', blob: fullContrast, psm: Tesseract.PSM.SINGLE_BLOCK },
    { label: 'header-sparse', blob: header, psm: Tesseract.PSM.SPARSE_TEXT },
    { label: 'body-sparse', blob: body, psm: Tesseract.PSM.SPARSE_TEXT },
    { label: 'totals-sparse', blob: totals, psm: Tesseract.PSM.SPARSE_TEXT },
    { label: 'footer-sparse', blob: footer, psm: Tesseract.PSM.SPARSE_TEXT },
  ]
}

function mergeOCRTexts(texts: string[]): string {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const text of texts) {
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/\s+/g, ' ').trim()
      if (!line) continue

      const key = line.toUpperCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(line)
    }
  }

  return merged.join('\n')
}

async function recognizeInvoiceImage(blob: Blob): Promise<string> {
  const variants = await buildOCRVariants(blob)
  const worker = await Tesseract.createWorker('spa', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        postProgress('recognizing', Math.min(0.98, m.progress || 0))
      }
    },
  })
  const texts: string[] = []

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })

    for (let index = 0; index < variants.length; index++) {
      const variant = variants[index]
      postProgress('recognizing', index / variants.length)
      await worker.setParameters({
        tessedit_pageseg_mode: variant.psm,
      })
      const result = await worker.recognize(variant.blob, { rotateAuto: true })
      if (result.data.text.trim()) {
        texts.push(`--- ${variant.label} ---\n${result.data.text}`)
      }
    }
  } finally {
    await worker.terminate()
  }

  return mergeOCRTexts(texts)
}

async function processPDF(blob: Blob): Promise<string> {
  postProgress('loading', 0)

  const arrayBuffer = await blob.arrayBuffer()
  const pdf = await getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    postProgress('recognizing', (i - 1) / pdf.numPages)

    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()

    if (pageText.length > 10) {
      fullText += pageText + '\n\n'
      continue
    }

    const viewport = page.getViewport({ scale: 3 })
    const canvas = new OffscreenCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    )
    const canvasContext = canvas.getContext('2d')

    if (!canvasContext) {
      throw new Error('No se pudo preparar el canvas para leer el PDF')
    }

    await page.render({
      canvasContext: canvasContext as unknown as CanvasRenderingContext2D,
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise

    const pageBlob = await canvas.convertToBlob({ type: 'image/png' })
    fullText += await recognizeInvoiceImage(pageBlob) + '\n\n'
  }

  postProgress('done', 1)
  return fullText.trim()
}
