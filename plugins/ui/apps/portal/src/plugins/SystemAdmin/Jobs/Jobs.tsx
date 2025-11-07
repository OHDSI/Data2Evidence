import React, { FC, useState, useEffect } from "react";
import JobsViewer from "./JobsViewer/JobsViewer";

const Jobs: FC = () => {
  const [jobsViewerScriptsLoaded, setJobsViewerScriptsLoaded] = useState(false);
  const [jobsViewerDivLoaded, setJobsViewerDivLoaded] = useState(false);

  useEffect(() => {
    if (jobsViewerScriptsLoaded && jobsViewerDivLoaded) {
      if (typeof (window as any)?.mountJobs !== "function") {
        setJobsViewerScriptsLoaded(false);
      } else {
        console.log("mounting...", typeof (window as any)?.mountJobs);
        (window as any).mountJobs();
      }
    }
  }, [jobsViewerScriptsLoaded, jobsViewerDivLoaded]);

  return (
    <JobsViewer
      setJobsViewerScriptsLoaded={setJobsViewerScriptsLoaded}
      setJobsViewerDivLoaded={setJobsViewerDivLoaded}
    />
  );
};

export default Jobs;
