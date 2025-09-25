import { Box } from "@portal/components";
import React, {
  CSSProperties,
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Controls,
  EdgeChange,
  FitViewOptions,
  MiniMap,
  NodeChange,
  OnConnectStartParams,
  Panel,
  SelectionMode,
  useReactFlow,
  XYPosition,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { isCircular } from "~/utils";
import { dispatch, RootState } from "../../../../../store";
import {
  markStatusAsDraft,
  replaceEdges,
  replaceNodes,
  selectEdges,
  setAddNodeTypeDialog,
  setEdge,
  setNode,
} from "../../../reducers";
import { selectFlowNodes, selectLastNode } from "../../../selectors";
import { useGetLatestDataflowByIdQuery } from "../../../slices";
import { EdgeState, NodeState } from "../../../types";
import {
  getNodeClassName,
  getNodeColors,
  NODE_TYPES,
  NodeChoiceMap,
  NodeType,
  NodeTypeChoice,
  SelectNodeTypesDialog,
} from "../../Node/NodeTypes";
import { RunFlowButton } from "../RunFlow/RunFlowButton";
import "./FlowPanel.scss";

interface FlowPanelProps {}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 0.7;
const fitViewOptions: FitViewOptions = { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM };
const snapGrid: [number, number] = [10, 10];
const flowStyles: CSSProperties = { backgroundColor: "#faf8f8" };
const defaultPosition = { startX: 100, startY: 100, gapX: 100, gapY: 100 };

const getHandleType = (handleId: string) => {
  const arr = handleId.split("_");
  return arr[arr.length - 1];
};

const getCohortTypeFromLabel = (
  label?: string
): "event" | "target" | "exit" | "comparator" | "outcome" | "" => {
  if (!label) return "";
  const normalized = label.toLowerCase().replace(/_/g, " ");
  if (normalized.includes("event")) return "event";
  if (normalized.includes("target")) return "target";
  if (normalized.includes("exit")) return "exit";
  if (normalized.includes("comparator")) return "comparator";
  if (normalized.includes("outcome")) return "outcome";
  return "";
};

const getCohortTypeFromTargetHandle = (
  targetHandle?: string
): "event" | "target" | "exit" | "comparator" | "outcome" | "" => {
  if (!targetHandle) return "";
  const parts = targetHandle.split("_");
  // Pattern: <nodeId>_<direction>_<label...>_<handleIOType>
  const labelTokens = parts.slice(2, -1);
  const handleLabel = labelTokens.join("_").toLowerCase().replace(/_/g, " ");
  if (handleLabel.includes("event")) return "event";
  if (handleLabel.includes("target")) return "target";
  if (handleLabel.includes("exit")) return "exit";
  if (handleLabel.includes("comparator")) return "comparator";
  if (handleLabel.includes("outcome")) return "outcome";
  return "";
};

export const FlowPanel: FC<FlowPanelProps> = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const { data: dataflow } = useGetLatestDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });
  const addNodeTypeDialog = useSelector(
    (state: RootState) => state.flow.addNodeTypeDialog
  );

  const [position, setPosition] = useState<XYPosition>();
  const nodes = useSelector(selectFlowNodes);
  const edges = useSelector(selectEdges);
  const lastNode = useSelector(selectLastNode);
  const reactFlowWrapper = useRef<any>(null);
  const connectingNodeId = useRef<string | null>(null);
  const { setCenter, setViewport, getViewport, project } = useReactFlow();

  const centerViewport = useCallback(
    (nodes: NodeState[], overrideZoom?: number) => {
      const wrapper = reactFlowWrapper.current;
      if (wrapper) {
        const { zoom: currentZoom } = getViewport();
        const zoom = overrideZoom ?? currentZoom;

        const wrapperWidth = wrapper.offsetWidth;
        const wrapperHeight = wrapper.offsetHeight;

        if (zoom >= MIN_ZOOM) {
          const minX = Math.min(...nodes.map((node) => node.position.x)) * zoom;
          const maxX =
            Math.max(...nodes.map((node) => node.position.x + node.width)) *
            zoom;
          const minY = Math.min(...nodes.map((node) => node.position.y)) * zoom;
          const maxY =
            Math.max(...nodes.map((node) => node.position.y + node.height)) *
            zoom;

          const graphWidth = maxX - minX;
          const graphHeight = maxY - minY;
          const x = (wrapperWidth - graphWidth) / 2 - minX;
          const y = (wrapperHeight - graphHeight) / 2 - minY;

          const isCropped = x < 0;
          if (isCropped) {
            centerViewport(nodes, zoom - 0.1);
          }

          if (!isCropped || zoom === MIN_ZOOM) {
            setViewport({ x, y, zoom }, { duration: 300 });
          }
        }
      }
    },
    [reactFlowWrapper, setViewport, getViewport]
  );

  useEffect(() => {
    let savedNodes: NodeState[] = [];
    let savedEdges: EdgeState[] = [];

    if (dataflow?.flow) {
      savedNodes = dataflow.flow.nodes;
      savedEdges = dataflow.flow.edges;
    }

    dispatch(replaceNodes(savedNodes));
    dispatch(replaceEdges(savedEdges));

    centerViewport(savedNodes);
  }, [dataflow, centerViewport]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updates = applyNodeChanges(changes, nodes);
      dispatch(replaceNodes(updates));
    },
    [nodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updates = applyEdgeChanges(changes, edges);
      dispatch(replaceEdges(updates));

      nodes
        .filter((n) => n.type === "cohort_node")
        .forEach((cohortNode) => {
          const outgoing = updates.find((e) => e.source === cohortNode.id);
          const nextType = outgoing
            ? getCohortTypeFromTargetHandle(outgoing.targetHandle as string)
            : "";
          const currType = (cohortNode.data as any)?.type || "";
          if (nextType !== currType) {
            dispatch(
              setNode({
                ...cohortNode,
                data: { ...cohortNode.data, cohortType: nextType },
              })
            );
          }
        });
    },
    [edges, nodes]
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      const updates = addEdge(params, edges);
      dispatch(replaceEdges(updates));
      dispatch(markStatusAsDraft());

      // If source is a cohort node, set its type based on target handle
      const cohortNode = nodes.find(
        (n) => n.id === params.source && n.type === "cohort_node"
      );
      if (cohortNode) {
        const nextType = getCohortTypeFromTargetHandle(
          params.targetHandle as string
        );
        dispatch(
          setNode({
            ...cohortNode,
            data: { ...cohortNode.data, cohortType: nextType },
          })
        );
      }
    },
    [edges, nodes]
  );

  const handleConnectStart = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent,
      params: OnConnectStartParams
    ) => {
      connectingNodeId.current = params.nodeId;
    },
    []
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent | any) => {
      const targetIsPane = event.target?.classList.contains("react-flow__pane");
      if (targetIsPane) {
        const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({
          x: event.clientX - left,
          y: event.clientY - top,
        });
        setPosition(position);
      }
    },
    [project]
  );

  const createNode = useCallback(
    (type: NodeType, position: XYPosition): NodeState => {
      const id = uuidv4();
      const nodeCount = nodes.filter((n) => n.type === type).length;
      return {
        id,
        type,
        data: {
          name: `${type}_${nodeCount}`,
          description: `Describe the task of node ${id.substring(0, 8)}`,
          ...NodeChoiceMap[type].defaultData,
        },
        position,
        width: 350,
        height: 210,
        selected: true,
      };
    },
    [nodes]
  );

  const handleCloseDialog = useCallback(
    (type?: NodeTypeChoice) => {
      dispatch(setAddNodeTypeDialog({ visible: false }));
      if (!type) {
        console.warn("Unable to add node. Node type is empty");
        return;
      }

      dispatch(markStatusAsDraft());

      let nodePosition = position;
      if (!nodePosition) {
        // Placing relative to the node where the add action originated
        const baseNode = nodes.find(
          (n) => n.id === addNodeTypeDialog.selectedNodeId
        );
        if (baseNode) {
          const newX = baseNode.position.x - (450 + defaultPosition.gapX);
          const newY = baseNode.position.y;
          nodePosition = { x: newX, y: newY };
        } else {
          const x = lastNode
            ? lastNode.position.x + defaultPosition.gapX
            : defaultPosition.startX;
          const y = lastNode
            ? lastNode.position.y + defaultPosition.gapY
            : defaultPosition.startY;
          nodePosition = { x, y };
        }
      }

      // Deselect all existing nodes before adding the new one
      dispatch(
        replaceNodes(nodes.map((node) => ({ ...node, selected: false })))
      );

      let newNode = createNode(type, nodePosition);

      let newEdge: EdgeState | undefined;
      if (addNodeTypeDialog.selectedNodeId) {
        newEdge = {
          id: uuidv4(),
          source: newNode.id,
          target: addNodeTypeDialog.selectedNodeId,
          sourceHandle: `${newNode.id}_source_${addNodeTypeDialog.selectedNodeHandleType}`,
          targetHandle: `${addNodeTypeDialog.selectedNodeId}_target_${addNodeTypeDialog.nodeHandleLabel}_${addNodeTypeDialog.selectedNodeHandleType}`,
        };
      }

      if (newEdge) {
        // If adding a cohort node via a handle, set its type based on the handle label
        if (newNode.type === "cohort_node") {
          const inferredType = getCohortTypeFromLabel(
            addNodeTypeDialog.nodeHandleLabel
          );
          newNode = {
            ...newNode,
            data: { ...newNode.data, type: inferredType },
          } as NodeState;
        }
        // Upsert node with possibly updated type before creating edge
        dispatch(setNode(newNode));
        dispatch(setEdge(newEdge));
      } else {
        // No edge created; just upsert node
        dispatch(setNode(newNode));
      }
      const { zoom } = getViewport();
      setCenter(
        newNode.position.x + newNode.width / 2,
        newNode.position.y + newNode.height / 2,
        {
          zoom,
          duration: 300,
        }
      );

      // reset
      connectingNodeId.current = null;
    },
    [
      position,
      createNode,
      setCenter,
      getViewport,
      lastNode,
      addNodeTypeDialog,
      nodes,
    ]
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const source = connection.source;
      const target = connection.target;
      const isDifferentNode = source !== target;
      const routes = edges.reduce<{ [key: string]: string[] }>((acc, edge) => {
        if (edge.source && edge.target) {
          if (acc[edge.source]) {
            acc[edge.source].push(edge.target);
          } else {
            acc[edge.source] = [edge.target];
          }
        }
        return acc;
      }, {});

      const sourceType = getHandleType(connection.sourceHandle);
      const targetType = getHandleType(connection.targetHandle);
      const isValidType = sourceType === targetType;

      // Restrict cohort_node to only one outgoing connection
      const sourceNode = nodes.find((n) => n.id === source);
      const hasExistingOutgoing = edges.some((e) => e.source === source);
      const cohortHasSingleConnection =
        sourceNode?.type === "cohort_node" ? !hasExistingOutgoing : true;

      return (
        isDifferentNode &&
        !isCircular(routes, source, target) &&
        isValidType &&
        cohortHasSingleConnection
      );
    },
    [edges, nodes]
  );
  return (
    <div ref={reactFlowWrapper} className="flow-panel">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        snapToGrid
        snapGrid={snapGrid}
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        fitView
        fitViewOptions={fitViewOptions}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidConnection}
        style={flowStyles}
      >
        <Controls />
        <MiniMap
          nodeColor={getNodeColors}
          nodeClassName={getNodeClassName}
          zoomable
          pannable
        />
        <Panel position="top-right">
          <Box className="flow-panel__custom-controls">
            <RunFlowButton />
          </Box>
        </Panel>
      </ReactFlow>
      <SelectNodeTypesDialog
        open={addNodeTypeDialog.visible}
        handleType={addNodeTypeDialog.handleType}
        onClose={handleCloseDialog}
        handleNodeType={addNodeTypeDialog.selectedNodeHandleType}
      />
    </div>
  );
};
