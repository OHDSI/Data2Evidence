import { useEffect, useRef, useState, type FC } from 'react'
import './Dialog.scss'
import './CreateNotebookDialog.scss'

interface RenameDialogProps {
  currentName: string
  existingNames: string[]
  onConfirm: (newName: string) => void
  onCancel: () => void
}

export const RenameDialog: FC<RenameDialogProps> = ({
  currentName,
  existingNames,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    inputRef.current?.select()
  }, [])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (
      trimmed.toUpperCase() !== currentName.toUpperCase() &&
      existingNames.some((n) => n.toUpperCase() === trimmed.toUpperCase())
    ) {
      setError(true)
      return
    }
    onConfirm(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <dialog ref={dialogRef} className="portal-dialog" onClose={onCancel}>
      <div className="portal-dialog__title">
        <span>Edit Notebook Title</span>
        <button className="portal-dialog__close" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>
      <hr className="portal-dialog__divider" />
      <div className="portal-dialog__content portal-dialog__content--form">
        <div className="create-notebook-dialog__input-wrapper">
          <label className="create-notebook-dialog__label">Notebook Title</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(false)
            }}
            onKeyDown={handleKeyDown}
            className="create-notebook-dialog__input"
            placeholder="Enter a title"
          />
          {error && (
            <div className="create-notebook-dialog__error">
              A notebook with this name already exists.
            </div>
          )}
        </div>
      </div>
      <hr className="portal-dialog__divider" />
      <div className="portal-dialog__actions">
        <button className="portal-dialog__btn portal-dialog__btn--outlined" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="portal-dialog__btn portal-dialog__btn--primary"
          onClick={handleConfirm}
          disabled={!name.trim()}
        >
          Save
        </button>
      </div>
    </dialog>
  )
}
