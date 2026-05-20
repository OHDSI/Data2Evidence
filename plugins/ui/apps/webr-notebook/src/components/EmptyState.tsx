import './EmptyState.scss'

interface EmptyStateProps {
  hasNotebooks: boolean
  onCreate: () => void
  onImport: () => void
}

export function EmptyState({ hasNotebooks, onCreate, onImport }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <p className="empty-state__title">
        {hasNotebooks ? 'Select a notebook to get started' : 'No notebooks yet'}
      </p>
      <p className="empty-state__subtitle">
        {hasNotebooks
          ? 'Choose from the dropdown above or create a new one'
          : 'Create your first notebook to start writing code and analysis'}
      </p>
      <div className="empty-state__actions">
        <button className="empty-state__btn empty-state__btn--primary" onClick={onCreate}>
          Create Notebook
        </button>
        <button className="empty-state__btn empty-state__btn--outlined" onClick={onImport}>
          Import .ipynb
        </button>
      </div>
    </div>
  )
}
