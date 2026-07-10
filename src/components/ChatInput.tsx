import { useState, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { FileText, Paperclip, SendHorizontal, X } from 'lucide-react'

interface Props {
  onSend: (text: string, imageBase64?: string, fileName?: string, file?: File) => void
  loading: boolean
}

export default function ChatInput({ onSend, loading }: Props) {
  const [text, setText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPreviewUrl(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSend = () => {
    if ((!text.trim() && !selectedFile) || loading) return

    if (selectedFile) {
      onSend(text.trim(), previewUrl || undefined, selectedFile.name, selectedFile)
    } else {
      onSend(text.trim())
    }

    setText('')
    removeFile()
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const adjustHeight = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  const canSend = (text.trim() || selectedFile) && !loading

  return (
    <div className="bg-glass/50 backdrop-blur-xl border-t border-glass-border px-6 py-4">
      {/* File preview */}
      {selectedFile && (
        <div className="mb-3 p-3 bg-glass backdrop-blur-xl rounded-xl border border-teal/30 flex items-center gap-3 animate-slideIn">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-teal/40" />
          ) : (
            <div className="w-12 h-12 rounded-lg border border-teal/40 bg-teal/10 text-teal flex items-center justify-center">
              <FileText size={22} />
            </div>
          )}
          <span className="flex-1 text-text-secondary text-sm font-medium truncate">{selectedFile?.name}</span>
          <button
            onClick={removeFile}
            aria-label="Eliminar imagen"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-error-bg text-error border border-error/30 hover:bg-error/20 transition-all duration-200 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Input row — unified pill */}
      <div className="flex items-end gap-2 bg-glass backdrop-blur-xl rounded-2xl border-2 border-glass-border transition-all duration-300 focus-within:border-teal focus-within:shadow-ring-teal-subtle px-4 py-3">
        {/* Attach button — left */}
        <label
          htmlFor="chatFileInput"
          title="Adjuntar comprobante"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-text-muted hover:text-teal hover:bg-teal/10 transition-all duration-200 cursor-pointer mb-0.5 focus:outline-none focus:ring-2 focus:ring-teal/40"
        >
          <Paperclip size={18} />
        </label>
        <input
          ref={fileInputRef}
          id="chatFileInput"
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta contable..."
          rows={1}
          disabled={loading}
          className="flex-1 bg-transparent text-text-primary text-sm outline-none resize-none max-h-[120px] placeholder:text-text-muted/70 leading-relaxed py-1 caret-teal transition-all duration-300 disabled:opacity-50 "
        />

        {/* Send button — right, rounded */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 mb-0.5 focus:outline-none focus:ring-2 focus:ring-teal/40 ${
            canSend
              ? 'bg-teal text-navy-900 hover:bg-teal/80 hover:scale-105 shadow-glow-teal cursor-pointer'
              : 'bg-glass-hover text-text-muted cursor-not-allowed opacity-50'
          }`}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <SendHorizontal size={17} />
          )}
        </button>
      </div>

      <p className="text-center text-text-muted/50 text-[10px] mt-2 leading-none">
        Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  )
}
