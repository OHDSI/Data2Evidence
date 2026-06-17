import { useState, useMemo, useRef, type FC } from 'react'
import { AiChat, type ChatItem } from '@nlux/react'
import { useAsStreamAdapter, type StreamSend } from '@nlux/react'
import '@nlux/themes/nova.css'
import './CodingAssistant.scss'
import type { NotebookData } from 'react-notebook/src/types/notebook'
import type { AgentRequest, EditOp, EditSummary } from '../agent/types'
import { serializeCellsForRequest } from '../agent/serializeCells'
import { createSentinelSplitter } from '../agent/sentinelSplitter'

interface CodingAssistantProps {
  open: boolean
  onClose: () => void
  datasetId: string
  getNotebookData: () => NotebookData
  applyEdits: (edits: EditOp[]) => EditSummary
  getToken?: () => Promise<string>
}

function summaryText(s: EditSummary): string {
  const parts: string[] = []
  if (s.added) parts.push(`➕ added ${s.added}`)
  if (s.updated) parts.push(`✏️ updated ${s.updated}`)
  if (s.deleted) parts.push(`🗑️ deleted ${s.deleted}`)
  if (s.skipped) parts.push(`⚠️ skipped ${s.skipped}`)
  if (parts.length === 0) return ''
  return `\n\n_Applied: ${parts.join(' · ')} cell(s)._`
}

function createSend(
  datasetId: string,
  getNotebookData: () => NotebookData,
  applyEdits: (edits: EditOp[]) => EditSummary,
  historyRef: { current: ChatItem[] },
  getToken?: () => Promise<string>
): StreamSend {
  return async (prompt, observer) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (getToken) {
        const token = await getToken()
        if (token) headers.Authorization = `Bearer ${token}`
      }

      const body: AgentRequest = {
        cells: serializeCellsForRequest(getNotebookData()),
        userInput: prompt,
        history: historyRef.current.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.message === 'string' ? m.message : '',
        })),
      }

      const response = await fetch(
        `/code-suggestion/agent?datasetId=${encodeURIComponent(datasetId)}`,
        { method: 'POST', headers, body: JSON.stringify(body) }
      )

      if (response.status !== 200 || !response.body) {
        observer.error(new Error('Failed to connect to the agent'))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const splitter = createSentinelSplitter()
      let narration = ''

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const text = splitter.push(decoder.decode(value, { stream: true }))
          if (text) {
            narration += text
            observer.next(text)
          }
        }
        const tail = splitter.flush()
        if (tail) {
          narration += tail
          observer.next(tail)
        }

        const edits = splitter.getEdits()
        if (edits.length > 0) {
          const summary = applyEdits(edits)
          const note = summaryText(summary)
          if (note) observer.next(note)
          narration += note
        }

        historyRef.current = [
          ...historyRef.current,
          { role: 'user', message: prompt },
          { role: 'assistant', message: narration },
        ]
      } finally {
        reader.releaseLock()
        observer.complete()
      }
    } catch (err) {
      observer.error(err instanceof Error ? err : new Error(String(err)))
    }
  }
}

export const CodingAssistant: FC<CodingAssistantProps> = ({
  open,
  datasetId,
  getNotebookData,
  applyEdits,
  getToken,
}) => {
  const [conversationHistory] = useState<ChatItem[]>([])
  const historyRef = useRef<ChatItem[]>([])

  const send = useMemo(
    () => createSend(datasetId, getNotebookData, applyEdits, historyRef, getToken),
    [datasetId, getNotebookData, applyEdits, getToken]
  )
  const adapter = useAsStreamAdapter(send, [send])

  if (!open) return null

  return (
    <div className="chat-container">
      <AiChat
        adapter={adapter}
        displayOptions={{ colorScheme: 'light' }}
        composerOptions={{ placeholder: 'Ask the agent to change your notebook' }}
        messageOptions={{ waitTimeBeforeStreamCompletion: 3000 }}
        initialConversation={conversationHistory}
      />
    </div>
  )
}
