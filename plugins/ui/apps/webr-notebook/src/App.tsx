import { useEffect, useMemo, useState } from 'react'
import { setTokenProvider } from './api/request'
import { NotebookManager } from './components/NotebookManager'
import type { PortalProps } from './types'
import './index.css'

export default function App(props: PortalProps) {
  const [customProps, setCustomProps] = useState<Partial<PortalProps>>({})

  const mergedProps = useMemo(
    () => ({ ...props, ...customProps }),
    [props, customProps]
  )

  // Configure auth token provider
  useEffect(() => {
    if (mergedProps.getToken) {
      setTokenProvider(mergedProps.getToken)
    }
  }, [mergedProps.getToken])

  // Listen for portal prop updates, filtering by appId
  useEffect(() => {
    const handlePropsChange = (event: Event) => {
      const { appId, ...newProps } = (event as CustomEvent).detail || {}
      if (appId === props.appId) {
        setCustomProps(newProps)
      }
    }

    window.addEventListener('custom-props-changed', handlePropsChange)
    return () => window.removeEventListener('custom-props-changed', handlePropsChange)
  }, [props.appId])

  return (
    <div className="flex flex-col text-foreground" style={{ height: '100%' }}>
      <NotebookManager
        datasetId={mergedProps.datasetId ?? ''}
        userId={mergedProps.idpUserId ?? ''}
        getToken={mergedProps.getToken}
      />
    </div>
  )
}
