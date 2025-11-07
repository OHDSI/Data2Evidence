import React, { FC, useCallback, useState } from 'react'
import { PageProps, ResearcherStudyMetadata } from '@portal/plugin'
import './SampleResearcherStudy.scss'

interface SampleResearcherStudyProps extends PageProps<ResearcherStudyMetadata> {}

export const SampleResearcherStudy: FC<SampleResearcherStudyProps> = ({ metadata }: SampleResearcherStudyProps) => {
  const [token, setToken] = useState<string>()

  const handleClick = useCallback(async () => {
    setToken(await metadata.getToken())
  }, [])

  return (
    <div className="rs-plugin">
      <h1>Researcher study plugin page</h1>
      <section>
        <div>Hello {metadata.userId || 'there!'}</div>
        <div>Study {metadata.studyId || 'Untitled'}</div>
        <button onClick={handleClick}>Get JWT token</button>
        <div>{token}</div>
      </section>
    </div>
  )
}
