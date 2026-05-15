import { useEffect, useRef, useState, type FC } from 'react'
import * as notebookApi from '../api/notebook-api'
import type { NotebookTemplateDto } from '../types'
import { TemplateSelect } from './TemplateSelect'
import './CreateNotebookDialog.scss'
import './Dialog.scss'

interface CreateNotebookDialogProps {
  datasetId: string
  onConfirm: (name: string, templateId: string | null) => void
  onCancel: () => void
  existingNames: string[]
}

export const CreateNotebookDialog: FC<CreateNotebookDialogProps> = ({
  datasetId,
  onConfirm,
  onCancel,
  existingNames,
}) => {
  const [name, setName] = useState('Untitled')
  const [error, setError] = useState(false)
  const [templates, setTemplates] = useState<NotebookTemplateDto[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!datasetId) return
      try {
        setLoadingTemplates(true)
        const list = await notebookApi.getTemplates(datasetId)
        if (!cancelled) setTemplates(list)
      } catch (err) {
        // Silent fail — missing/misconfigured templates repo must not block creation.
        console.error('Failed to load notebook templates:', err)
      } finally {
        if (!cancelled) setLoadingTemplates(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [datasetId])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (existingNames.some((n) => n.toUpperCase() === trimmed.toUpperCase())) {
      setError(true)
      return
    }
    onConfirm(trimmed, selectedTemplateId || null)
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
        <span>Create Notebook</span>
        <button className="portal-dialog__close" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>
      <hr className="portal-dialog__divider" />
      <div className="portal-dialog__content portal-dialog__content--form">
        <div className="create-notebook-dialog__input-wrapper">
          <label className="create-notebook-dialog__label">Notebook name</label>
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
            placeholder="Enter a name"
          />
          {error && (
            <div className="create-notebook-dialog__error">
              A notebook with this name already exists.
            </div>
          )}
        </div>

        <div className="create-notebook-dialog__input-wrapper">
          <label className="create-notebook-dialog__label">Template</label>
          <TemplateSelect
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
            disabled={loadingTemplates}
          />
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
          Create
        </button>
      </div>
    </dialog>
  )
}
