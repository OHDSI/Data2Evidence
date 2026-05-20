import { useCallback, useEffect, useState, type FC } from 'react'
import * as notebookApi from '../api/notebook-api'
import type { NotebookRecord, RemoteDiffCheckResponse } from '../types'

interface SyncFromRemoteButtonProps {
  activeNotebook: NotebookRecord | null
  datasetId: string
  onSyncSuccess: () => Promise<void>
  onFeedback: (type: 'success' | 'error', message: string) => void
}

const POLL_INTERVAL_MS = 30_000

export const SyncFromRemoteButton: FC<SyncFromRemoteButtonProps> = ({
  activeNotebook,
  datasetId,
  onSyncSuccess,
  onFeedback,
}) => {
  const [diffCheck, setDiffCheck] = useState<RemoteDiffCheckResponse | null>(null)
  const [isCheckingDiff, setIsCheckingDiff] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const notebookId = activeNotebook?.id

  const checkDiff = useCallback(async () => {
    if (!notebookId || !datasetId) return
    try {
      setIsCheckingDiff(true)
      const result = await notebookApi.checkRemoteDiff(notebookId, datasetId)
      setDiffCheck(result)
    } catch (error) {
      console.error('Failed to check remote diff:', error)
      setDiffCheck({ hasDifferences: false, reason: 'Error checking differences' })
    } finally {
      setIsCheckingDiff(false)
    }
  }, [notebookId, datasetId])

  useEffect(() => {
    if (!notebookId || !datasetId) {
      setDiffCheck(null)
      return
    }
    checkDiff()
    const interval = setInterval(checkDiff, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [notebookId, datasetId, checkDiff])

  const handleClick = useCallback(async () => {
    if (!notebookId || !datasetId) return
    try {
      setIsSyncing(true)
      await notebookApi.overwriteFromRemote(notebookId, datasetId)
      onFeedback('success', 'Notebook overwritten from remote.')
      await onSyncSuccess()
      checkDiff()
    } catch (error) {
      console.error('Failed to sync from remote:', error)
      const apiError = error as { response?: { data?: { message?: string } }; message?: string }
      onFeedback(
        'error',
        apiError?.response?.data?.message || apiError?.message || 'Failed to sync from remote.'
      )
    } finally {
      setIsSyncing(false)
    }
  }, [notebookId, datasetId, onSyncSuccess, onFeedback, checkDiff])

  if (!notebookId || !datasetId) return null

  const disabled = isSyncing || isCheckingDiff || !diffCheck?.hasDifferences

  return (
    <button
      className="notebook-header__btn"
      onClick={handleClick}
      disabled={disabled}
    >
      {isSyncing ? 'Syncing…' : 'Sync from Remote'}
    </button>
  )
}
