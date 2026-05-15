import { useState, useRef, useEffect, type FC } from 'react'
import type { NotebookTemplateDto } from '../types'
import './TemplateSelect.scss'

const NO_TEMPLATE_LABEL = '— No template (blank notebook) —'

interface TemplateSelectProps {
  templates: NotebookTemplateDto[]
  selectedTemplateId: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export const TemplateSelect: FC<TemplateSelectProps> = ({
  templates,
  selectedTemplateId,
  onSelect,
  disabled = false,
}) => {
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

  const selected = templates.find((t) => t.id === selectedTemplateId)
  const triggerLabel = selected ? selected.name : NO_TEMPLATE_LABEL

  return (
    <div ref={containerRef} className="template-select">
      <button
        type="button"
        className="template-select__trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span className="template-select__trigger-label">{triggerLabel}</span>
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
          className={`template-select__arrow ${open ? 'template-select__arrow--open' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="template-select__dropdown">
          <div
            className={`template-select__item ${selectedTemplateId === '' ? 'template-select__item--active' : ''}`}
            onClick={() => handleSelect('')}
          >
            {NO_TEMPLATE_LABEL}
          </div>
          {templates.map((t) => (
            <div
              key={t.id}
              className={`template-select__item ${t.id === selectedTemplateId ? 'template-select__item--active' : ''}`}
              onClick={() => handleSelect(t.id)}
            >
              <span className="template-select__item-name">{t.name}</span>
              {t.description ? (
                <span className="template-select__item-description"> — {t.description}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
