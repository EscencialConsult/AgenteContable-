import Button from './Button'
import Modal from '../Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-text-secondary text-sm mb-6">{message}</div>
      <div className="flex gap-3">
        <Button variant={variant} onClick={onConfirm} loading={loading} className="flex-1">
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  )
}
