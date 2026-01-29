import { PortalProps } from "./types/portal";

export default function App(props: PortalProps) {
  return (
    <div>
      <h1>Wizards App</h1>
      <p>Wizard functionality coming soon...</p>
      {props.datasetId && <p>Dataset: {props.datasetId}</p>}
      {props.username && <p>User: {props.username}</p>}
    </div>
  );
}
