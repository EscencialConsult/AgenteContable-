import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../types/comprobante'
import { getAllMessages, saveMessage as saveChatMessage } from '../db/repositories/chatRepository'
import { sendMessage } from '../services/chatService'
import { useAuth } from '../hooks/useAuth'
import MessageBubble from '../components/MessageBubble'
import ChatInput from '../components/ChatInput'
import LoadingDots from '../components/LoadingDots'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { token } = useAuth()

  useEffect(() => {
    getAllMessages().then(setMessages)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (text: string, imageBase64?: string, fileName?: string) => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: text || (imageBase64 ? 'Analiza esta imagen' : ''),
      imageBase64,
      fileName,
      createdAt: new Date().toISOString(),
    }

    const savedUser = await saveChatMessage(userMessage)
    setMessages((prev) => [...prev, savedUser])

    setLoading(true)

    try {
      const { reply } = await sendMessage(text, imageBase64, token ?? undefined)

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      }

      const savedAssistant = await saveChatMessage(assistantMessage)
      setMessages((prev) => [...prev, savedAssistant])
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

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="bg-glass border-b border-glass-border px-8 py-4">
        <h2 className="text-text-primary text-lg font-semibold">Chat Contable</h2>
        <p className="text-text-muted text-xs">Consultá sobre contabilidad, impuestos y comprobantes</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput onSend={handleSend} loading={loading} />
    </div>
  )
}
