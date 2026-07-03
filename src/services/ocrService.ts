export interface OCRProgress {
  status: 'loading' | 'recognizing' | 'done' | 'error'
  progress: number
  text?: string
}

interface OCRWorkerMessage {
  type: 'progress' | 'result' | 'error'
  status?: OCRProgress['status']
  progress?: number
  text?: string
  error?: string
}

function createWorker(): Worker {
  return new Worker(
    new URL('../workers/ocr.worker.ts', import.meta.url),
    { type: 'module' },
  )
}

function runOCR(
  file: File,
  onProgress?: (p: OCRProgress) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = createWorker()

    worker.onmessage = (e) => {
      const msg = e.data as OCRWorkerMessage

      if (msg.type === 'progress') {
        onProgress?.({
          status: msg.status ?? 'loading',
          progress: msg.progress ?? 0,
        })
      } else if (msg.type === 'result') {
        worker.terminate()
        if (msg.text) {
          resolve(msg.text)
        } else {
          reject(new Error('No se pudo extraer texto del archivo'))
        }
      } else if (msg.type === 'error') {
        worker.terminate()
        reject(new Error(msg.error || 'No se pudo extraer texto del archivo'))
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }

    file.arrayBuffer().then((buffer) => {
      worker.postMessage(
        {
          type: 'start',
          fileBuffer: buffer,
          fileName: file.name,
          fileType: file.type,
        },
        [buffer],
      )
    }, reject)
  })
}

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: OCRProgress) => void,
): Promise<string> {
  return runOCR(file, onProgress)
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: OCRProgress) => void,
): Promise<string> {
  return runOCR(file, onProgress)
}
