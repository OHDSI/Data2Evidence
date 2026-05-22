import { useEffect, useRef, type FC } from 'react'
import './Dialog.scss'

interface DeleteDialogProps {
  notebookName: string
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteDialog: FC<DeleteDialogProps> = ({ notebookName, onConfirm, onCancel }) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const handleConfirm = () => {
    onConfirm()
    onCancel()
  }

  return (
    <dialog ref={dialogRef} className="portal-dialog" onClose={onCancel}>
      <div className="portal-dialog__title">
        <span>Delete Notebook</span>
        <button className="portal-dialog__close" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>
      <hr className="portal-dialog__divider" />
      <div className="portal-dialog__content">
        <div>Are you sure you want to delete the following notebook:</div>
        <div>
          <strong>&quot;{notebookName}&quot;</strong>?
        </div>
      </div>
      <hr className="portal-dialog__divider" />
      <div className="portal-dialog__actions">
        <button className="portal-dialog__btn portal-dialog__btn--outlined" onClick={onCancel}>
          Cancel
        </button>
        <button className="portal-dialog__btn portal-dialog__btn--primary" onClick={handleConfirm}>
          Delete
        </button>
      </div>
    </dialog>
  )
}
