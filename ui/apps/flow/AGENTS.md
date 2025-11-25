# AGENTS.md

## Overview

Visual ETL dataflow designer built with React and ReactFlow. Allows users to design data transformation pipelines using a node-based interface.

## Tech Stack

- **Framework**: React
- **Build**: Webpack
- **State**: Redux
- **Graph**: ReactFlow
- **UI**: Portal components

## Commands

```bash
npm start              # Webpack dev server
npm run build          # Production build
npm run build:dev      # Development build
npm run clean          # Remove dist
```

## Project Structure

```
flow/
├── src/
│   ├── components/    # React components
│   │   ├── nodes/    # Node type components
│   │   └── panels/   # Side panels
│   ├── store/        # Redux store
│   ├── services/     # API services
│   └── types/        # TypeScript types
├── webpack.config.js
└── package.json
```

## Node Types

- **CSV Node** - File input/output
- **SQL Node** - SQL transformations
- **Python Node** - Python code execution
- **R Node** - R code execution
- **Mapping Node** - Field mapping
- **Filter Node** - Data filtering

## Code Pattern

```tsx
import ReactFlow, { Node, Edge } from 'reactflow';
import { useDispatch, useSelector } from 'react-redux';

const FlowDesigner: React.FC = () => {
  const nodes = useSelector(state => state.flow.nodes);
  const edges = useSelector(state => state.flow.edges);
  const dispatch = useDispatch();

  const onNodesChange = (changes) => {
    dispatch(updateNodes(changes));
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={customNodeTypes}
    />
  );
};
```

## Important Files

- `src/components/nodes/` - Custom node components
- `src/store/` - Redux state and actions
- `webpack.config.js` - Build configuration
