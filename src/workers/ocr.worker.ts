import Tesseract from 'tesseract.js'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs'

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
    self.postMessage({ type: 'result', text: '' } as ResultMessage)
  }
}

function postProgress(status: ProgressMessage['status'], progress: number) {
  self.postMessage({ type: 'progress', status, progress } as ProgressMessage)
}

async function processImage(blob: Blob): Promise<string> {
  postProgress('loading', 0)

  const result = await Tesseract.recognize(blob, 'spa', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        postProgress('recognizing', m.progress || 0)
      }
    },
  })

  postProgress('done', 1)
  return result.data.text
}

async function processPDF(blob: Blob): Promise<string> {
  postProgress('loading', 0)

  const arrayBuffer = await blob.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    postProgress('recognizing', (i - 1) / pdf.numPages)

    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2 })

    const canvas = new OffscreenCanvas(viewport.width, viewport.height)
    await page.render({ canvas, viewport } as any).promise

    const pageBlob = await canvas.convertToBlob({ type: 'image/png' })

    const result = await Tesseract.recognize(pageBlob, 'spa')
    fullText += result.data.text + '\n\n'
  }

  postProgress('done', 1)
  return fullText.trim()
}
