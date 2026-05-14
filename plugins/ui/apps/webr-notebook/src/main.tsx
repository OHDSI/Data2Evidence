import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App
      datasetId="dev-dataset"
      username="dev-user"
      getToken={async () => 'dev-token'}
    />
  </React.StrictMode>
)
