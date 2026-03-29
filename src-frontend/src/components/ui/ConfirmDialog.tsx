// Path: src-frontend/src/components/ui/ConfirmDialog.tsx

import { Modal } from './Modal'
import { Button } from './Button'

/**
 * Props for the reusable confirm/cancel dialog.
 */
interface ConfirmDialogProps {
  /** Controls whether the dialog is rendered. */
  open: boolean
  /** Called when the dialog should close without confirming. */
  onClose: () => void
  /** Called when the user confirms the action. */
  onConfirm: () => void
  /** Dialog heading text. */
  title: string
  /** Primary explanatory copy. */
  message: string
  /** Label for the confirm button. */
  confirmLabel?: string
  /** Label for the cancel button. */
  cancelLabel?: string
  /** Uses danger styling for destructive actions. */
  danger?: boolean
  /** Shows a loading state on the confirm button. */
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-5">
        <p className="text-body-md text-on-surface-variant">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
