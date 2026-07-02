import type { ChatMessage } from '../types/comprobante'

interface Props {
  message: ChatMessage
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} animate-slideIn`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center shrink-0 mb-0.5">
          <span className="text-teal text-[10px] font-bold">IA</span>
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl p-4 shadow-lg text-sm leading-relaxed ${
          isUser
            ? 'bg-teal/20 backdrop-blur-xl text-text-primary border border-teal/30 rounded-br-sm'
            : 'bg-glass backdrop-blur-xl text-text-primary/95 border border-glass-border border-l-teal border-l-[3px] rounded-tl-sm'
        }`}
      >
        {message.imageBase64 && (
          <img
            src={message.imageBase64}
            alt={message.fileName || 'Imagen adjunta'}
            className="max-w-full rounded-lg mb-3"
          />
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* User spacer to keep alignment */}
      {isUser && <div className="w-7 shrink-0" />}
    </div>
  )
}
