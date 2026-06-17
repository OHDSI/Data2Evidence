import type { NotebookRecord } from '../types'
import { NotebookSelect } from './NotebookSelect'
import { SyncFromRemoteButton } from './SyncFromRemoteButton'
import './NotebookHeader.scss'

interface NotebookHeaderProps {
  notebooks: NotebookRecord[]
  activeNotebook: NotebookRecord | null
  onSelect: (id: string) => void
  onCreate: () => void
  onSave: () => void
  onDelete?: () => void
  onRename?: () => void
  onImport: () => void
  onExport?: () => void
  onToggleShare?: () => void
  isShared: boolean
  canSave?: boolean
  datasetId: string
  onSyncSuccess: () => Promise<void>
  onFeedback: (type: 'success' | 'error', message: string) => void
}

export function NotebookHeader({
  notebooks,
  activeNotebook,
  onSelect,
  onCreate,
  onSave,
  onDelete,
  onRename,
  onImport,
  onExport,
  onToggleShare,
  isShared,
  canSave = true,
  datasetId,
  onSyncSuccess,
  onFeedback,
}: NotebookHeaderProps) {
  return (
    <div className="notebook-header">
      <div className="notebook-header__content">
        <div className="notebook-header__content-title">
          <NotebookSelect
            notebooks={notebooks}
            activeNotebook={activeNotebook}
            onSelect={onSelect}
          />

          {onRename && (
            <button
              className="notebook-header__icon-btn"
              onClick={onRename}
              title="Rename"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
          )}
        </div>

        <div className="notebook-header__actions">
          {onToggleShare && (
            <label className="notebook-header__share-label">
              <input
                type="checkbox"
                checked={isShared}
                onChange={onToggleShare}
              />
              Shared
            </label>
          )}

          {onExport && (
            <button className="notebook-header__btn" onClick={onExport}>
              Export
            </button>
          )}

          <button className="notebook-header__btn" onClick={onImport}>
            Import
          </button>

          <button className="notebook-header__btn" onClick={onCreate}>
            New
          </button>

          <button
            className="notebook-header__btn"
            onClick={onSave}
            disabled={!activeNotebook || !canSave}
          >
            Save
          </button>

          {activeNotebook && (
            <button
              className="notebook-header__btn"
              onClick={onDelete}
              disabled={!onDelete}
            >
              Delete
            </button>
          )}

          <SyncFromRemoteButton
            activeNotebook={activeNotebook}
            datasetId={datasetId}
            onSyncSuccess={onSyncSuccess}
            onFeedback={onFeedback}
          />
        </div>
      </div>
    </div>
  )
}
