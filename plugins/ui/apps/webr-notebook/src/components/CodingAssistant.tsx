import { useState, useMemo, type FC } from 'react'
import { AiChat, type ChatItem } from '@nlux/react'
import { useAsStreamAdapter, type StreamSend } from '@nlux/react'
import '@nlux/themes/nova.css'
import './CodingAssistant.scss'

interface CodingAssistantProps {
  open: boolean
  onClose: () => void
  datasetId: string
  getNotebookContent: () => string
  getToken?: () => Promise<string>
}

function createSend(
  datasetId: string,
  context: string,
  getToken?: () => Promise<string>
): StreamSend {
  return async (prompt, observer) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (getToken) {
        const token = await getToken()
        if (token) headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(
        `/code-suggestion/chat?datasetId=${encodeURIComponent(datasetId)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ context, userInput: prompt }),
        }
      )

      if (response.status !== 200) {
        observer.error(new Error('Failed to connect to the server'))
        return
      }

      if (!response.body) {
        observer.complete()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          observer.next(chunk)
        }
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
  getNotebookContent,
  getToken,
}) => {
  const [conversationHistory] = useState<ChatItem[]>([])

  const content = getNotebookContent()
  const send = useMemo(
    () => createSend(datasetId, content, getToken),
    [datasetId, content, getToken]
  )
  const adapter = useAsStreamAdapter(send, [send])

  if (!open) return null

  return (
    <div className="chat-container">
      <AiChat
        adapter={adapter}
        displayOptions={{ colorScheme: 'light' }}
        composerOptions={{ placeholder: 'Type your query' }}
        messageOptions={{ waitTimeBeforeStreamCompletion: 3000 }}
        initialConversation={conversationHistory}
      />
    </div>
  )
}
