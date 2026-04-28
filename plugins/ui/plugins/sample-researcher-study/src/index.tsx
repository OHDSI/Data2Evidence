import React from 'react'
import * as ReactDOM from 'react-dom/client'
import { ResearcherStudyMetadata } from '@portal/plugin'
import { plugin } from './module'

const mockMetadata: ResearcherStudyMetadata = {
  userId: 'Mock user',
  getToken: () => Promise.resolve('MockToken'),
  tenantId: 'Mock tenant',
  studyId: 'Mock study',
  data: null,
  fetchMenu: () => {},
  subFeatureFlags: {}
}

const PluginTester = () => {
  const Page = plugin.page
  return <Page metadata={mockMetadata} />
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<PluginTester />)
