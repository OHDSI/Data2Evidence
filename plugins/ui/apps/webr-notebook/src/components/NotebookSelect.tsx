import { useState, useRef, useEffect, type FC } from 'react'
import type { NotebookRecord } from '../types'
import './NotebookSelect.scss'

interface NotebookSelectProps {
  notebooks: NotebookRecord[]
  activeNotebook: NotebookRecord | null
  onSelect: (id: string) => void
}

export const NotebookSelect: FC<NotebookSelectProps> = ({ notebooks, activeNotebook, onSelect }) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: string) => {
    onSelect(id)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="notebook-select">
      <button
        className="notebook-select__trigger"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span className="notebook-select__trigger-label">
          {activeNotebook?.name ?? 'Select notebook...'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="14"
          height="14"
          className={`notebook-select__arrow ${open ? 'notebook-select__arrow--open' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="notebook-select__dropdown">
          {notebooks.map((nb) => (
            <div
              key={nb.id}
              className={`notebook-select__item ${nb.id === activeNotebook?.id ? 'notebook-select__item--active' : ''}`}
              onClick={() => handleSelect(nb.id)}
            >
              {nb.name}
              {nb.isShared ? <span className="notebook-select__shared-badge"> (Shared)</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
