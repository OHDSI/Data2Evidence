import React from 'react'
import ReactDOMClient from 'react-dom/client'
import singleSpaReact from 'single-spa-react'
import App from './App'
import type { PortalProps } from './types'

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: (props: PortalProps) => <App {...props} />,
  errorBoundary(err: Error) {
    console.error('Notebook Plugin Error:', err)
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Notebook Error</h2>
        <p>An error occurred while loading the Notebook application.</p>
        <details>
          <summary>Error Details</summary>
          <pre>{err?.toString()}</pre>
        </details>
      </div>
    )
  },
  domElementGetter: (props: PortalProps) => {
    const containerId = props?.containerId

    if (containerId) {
      const container = document.getElementById(containerId)
      if (container) {
        return container
      }
      console.warn('[Notebook] Container element not found in DOM:', containerId)
    }

    console.warn('[Notebook] No containerId provided, using single-spa default')
    return undefined as unknown as HTMLElement
  },
})

export const bootstrap = lifecycles.bootstrap
export const mount = lifecycles.mount
export const unmount = lifecycles.unmount
