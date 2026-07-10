import { useState, useRef, useEffect } from 'react'
import { AlertTriangle, CheckCircle, FileText, Upload, X } from 'lucide-react'
import type { ChatMessage, Comprobante } from '../types/comprobante'
import { getAllMessages, saveMessage as saveChatMessage } from '../db/repositories/chatRepository'
import { sendMessage } from '../services/chatService'
import {
  ingestComprobanteFile,
  isSupportedComprobanteFile,
} from '../services/comprobanteIngestionService'
import type { OCRProgress } from '../services/ocrService'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../hooks/useAuth'
import { useCliente } from '../hooks/useCliente'
import PageHeader from '../components/ui/PageHeader'
import MessageBubble from '../components/MessageBubble'
import ChatInput from '../components/ChatInput'
import LoadingDots from '../components/LoadingDots'

interface PendingComprobante {
  file: File
  fileName: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingComprobante, setPendingComprobante] = useState<PendingComprobante | null>(null)
  const [loadingComprobante, setLoadingComprobante] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [comprobanteError, setComprobanteError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { token } = useAuth()
  const { clienteActivo } = useCliente()

  useEffect(() => {
    getAllMessages().then(setMessages)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, pendingComprobante, loadingComprobante])

  const appendAssistantMessage = async (content: string) => {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    }
    const savedAssistant = await saveChatMessage(assistantMessage)
    setMessages((prev) => [...prev, savedAssistant])
  }

  const handleSend = async (
    text: string,
    imageBase64?: string,
    fileName?: string,
    file?: File,
  ) => {
    const hasSupportedComprobante = file ? isSupportedComprobanteFile(file) : false
    const fallbackContent = file
      ? 'Adjunte un comprobante para analizarlo.'
      : imageBase64
        ? 'Analiza esta imagen'
        : ''
    const userMessage: ChatMessage = {
      role: 'user',
      content: text || fallbackContent,
      imageBase64,
      fileName,
      createdAt: new Date().toISOString(),
    }

    const savedUser = await saveChatMessage(userMessage)
    setMessages((prev) => [...prev, savedUser])

    if (file && hasSupportedComprobante) {
      setPendingComprobante({ file, fileName: file.name })
      setComprobanteError('')
      setOcrProgress(null)
    }

    setLoading(true)

    try {
      const imageForAssistant = hasSupportedComprobante ? undefined : imageBase64
      const { reply } = await sendMessage(text || fallbackContent, imageForAssistant, token ?? undefined)

      await appendAssistantMessage(reply)
    } catch (error) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: error instanceof Error
          ? error.message
          : 'Error desconocido. Intenta nuevamente.',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    }

    setLoading(false)
  }

  const describeLoadedComprobante = (comprobante?: Partial<Comprobante>) => {
    if (!comprobante) return pendingComprobante?.fileName || 'Comprobante'
    const tipo = comprobante.tipo || 'Comprobante'
    const numero = comprobante.puntoVenta && comprobante.numero
      ? `${String(comprobante.puntoVenta).padStart(4, '0')}-${String(comprobante.numero).padStart(8, '0')}`
      : 'numero sin detectar'
    const emisor = comprobante.razonSocial || 'emisor sin detectar'
    const total = typeof comprobante.total === 'number' ? `$${formatCurrency(comprobante.total)}` : 'total sin detectar'
    return `${tipo} ${numero} - ${emisor} - ${total}`
  }

  const handleLoadPendingComprobante = async () => {
    if (!pendingComprobante || loadingComprobante) return

    setLoadingComprobante(true)
    setComprobanteError('')
    setOcrProgress(null)

    try {
      const result = await ingestComprobanteFile(
        pendingComprobante.file,
        { origen: 'formulario', estadoRevision: 'pendiente', clienteId: clienteActivo?.id },
        setOcrProgress,
      )

      if (result.status === 'procesado') {
        await appendAssistantMessage(
          `Listo, cargue el comprobante en Bandeja para revision.\n${describeLoadedComprobante(result.comprobante)}`,
        )
        setPendingComprobante(null)
        return
      }

      if (result.status === 'duplicado') {
        await appendAssistantMessage(
          `No lo cargue porque parece duplicado.\n${describeLoadedComprobante(result.comprobante)}`,
        )
        setPendingComprobante(null)
        return
      }

      setComprobanteError(result.message || 'No se pudo extraer texto del archivo.')
    } catch {
      setComprobanteError('No pude cargar este comprobante. Revisalo desde Carga de Comprobantes.')
    } finally {
      setLoadingComprobante(false)
    }
  }

  const progressPercent = ocrProgress ? Math.round(ocrProgress.progress * 100) : 0

  return (
    <div className="flex-1 flex flex-col h-full">
      <PageHeader title="Chat Contable" subtitle="Consultá sobre contabilidad, impuestos y comprobantes" />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="flex items-start gap-3 animate-slideIn">
            <div className="w-8 h-8 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-teal text-xs font-bold">IA</span>
            </div>
            <div className="max-w-[80%] bg-glass backdrop-blur-xl text-text-primary/95 rounded-2xl rounded-tl-sm p-4 border border-glass-border border-l-teal border-l-[3px] shadow-lg">
              <p className="text-sm leading-relaxed">
                👋 Hola! Soy tu <strong>Agente Contable</strong> inteligente. Puedo ayudarte con consultas sobre contabilidad, impuestos, finanzas y más. ¿En qué puedo asistirte hoy?
              </p>
            </div>
          </div>
        )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id || msg.createdAt} message={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-teal text-xs font-bold">IA</span>
              </div>
              <div className="bg-glass backdrop-blur-xl rounded-2xl rounded-tl-sm border border-glass-border shadow-lg">
                <LoadingDots />
              </div>
            </div>
          )}

          {pendingComprobante && (
            <div className="flex items-start gap-3 animate-slideIn">
              <div className="w-8 h-8 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center shrink-0 mt-0.5">
                <FileText size={15} className="text-teal" />
              </div>
              <div className="max-w-[80%] bg-glass backdrop-blur-xl text-text-primary/95 rounded-2xl rounded-tl-sm p-4 border border-glass-border border-l-teal border-l-[3px] shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Comprobante detectado</p>
                    <p className="text-xs text-text-muted mt-1 truncate max-w-md">
                      {pendingComprobante.fileName}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPendingComprobante(null)
                      setComprobanteError('')
                    }}
                    aria-label="Descartar comprobante"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-error hover:bg-error-bg transition-all focus:outline-none focus:ring-2 focus:ring-teal/40"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-xs text-text-secondary mt-3">
                  Puedo procesarlo con OCR y guardarlo en Bandeja como pendiente de revision.
                </p>

                {loadingComprobante && (
                  <div className="mt-4">
                    <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal to-teal-dark rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-text-muted text-[11px] mt-2">{progressPercent}%</p>
                  </div>
                )}

                {comprobanteError && (
                  <div className="mt-3 flex items-start gap-2 text-error text-xs bg-error-bg border border-error/25 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{comprobanteError}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={handleLoadPendingComprobante}
                    disabled={loadingComprobante}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal text-navy-900 text-xs font-semibold hover:bg-teal/80 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900"
                  >
                    {loadingComprobante ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Cargar a Bandeja
                  </button>
                  <button
                    onClick={() => {
                      setPendingComprobante(null)
                      setComprobanteError('')
                    }}
                    disabled={loadingComprobante}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-glass-border text-text-secondary text-xs font-medium hover:text-text-primary hover:bg-glass-hover disabled:opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900"
                  >
                    <CheckCircle size={14} />
                    Solo consultar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput onSend={handleSend} loading={loading || loadingComprobante} />
    </div>
  )
}
