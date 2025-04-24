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
import { Box } from "@portal/components";
import { isCircular } from "~/utils";
import {
  markStatusAsDraft,
  replaceEdges,
  replaceNodes,
  selectEdges,
  setAddNodeTypeDialog,
  setEdge,
  setNode,
} from "../../../reducers";
import { dispatch, RootState } from "../../../../../store";
import { selectFlowNodes, selectLastNode } from "../../../selectors";
import { useGetLatestDataflowByIdQuery } from "../../../slices";
import { EdgeState, NodeState } from "../../../types";
import {
  getNodeClassName,
  getNodeColors,
  NodeType,
  NODE_TYPES,
  SelectNodeTypesDialog,
} from "../../Node/NodeTypes";
import {
  NodeChoiceMap,
  NodeTypeChoice,
  SHARED_RESOURCES_NODE_COLORS,
  MODULE_SPECIFICATIONS_NODE_COLORS,
  SHARED_RESOURCES_HANDLE_COLOR,
  MODULE_SPECIFICATIONS_HANDLE_COLOR,
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
    },
    [edges]
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      const updates = addEdge(params, edges);
      dispatch(replaceEdges(updates));
      dispatch(markStatusAsDraft());
    },
    [edges]
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
        const x = lastNode
          ? lastNode.position.x + defaultPosition.gapX
          : defaultPosition.startX;
        const y = lastNode
          ? lastNode.position.y + defaultPosition.gapY
          : defaultPosition.startY;
        nodePosition = { x, y };
      }

      const newNode = createNode(type, nodePosition);
      dispatch(setNode(newNode));

      let edge: EdgeState | undefined;

      if (newNode.id && addNodeTypeDialog.selectedNodeId) {
        edge = {
          id: uuidv4(),
          source: newNode.id,
          target: addNodeTypeDialog.selectedNodeId,
          sourceHandle: `${newNode.id}_source_${addNodeTypeDialog.nodeType}`,
          targetHandle: `${addNodeTypeDialog.selectedNodeId}_target_${addNodeTypeDialog.selectedNodeClassifier}_${addNodeTypeDialog.nodeType}`,
        };
        dispatch(setEdge(edge));
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
    [position, createNode, setCenter, getViewport, lastNode, addNodeTypeDialog]
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

      // HandleId is defined as NODEID_TYPE_CLASSIFIER_COLOR, compare the last portion
      const getHandleColor = (handleId: string) => {
        const arr = handleId.split("_");
        return arr[arr.length - 1];
      };
      const sourceHandleType = getHandleColor(connection.sourceHandle);
      const targetHandleType = getHandleColor(connection.targetHandle);

      const isSameNodeType = sourceHandleType === targetHandleType;

      // Allow sharedResources / moduleSpecifications connections to the strategus node
      const isSourceModuleSpecification =
        MODULE_SPECIFICATIONS_NODE_COLORS.includes(sourceHandleType);
      const isSourceSharedResources =
        SHARED_RESOURCES_NODE_COLORS.includes(sourceHandleType);
      const isTargetModuleSpecification =
        MODULE_SPECIFICATIONS_HANDLE_COLOR === targetHandleType;
      const isTargetSharedResources =
        SHARED_RESOURCES_HANDLE_COLOR === targetHandleType;

      const isValidStrategusConnection =
        (isSourceModuleSpecification && isTargetModuleSpecification) ||
        (isSourceSharedResources && isTargetSharedResources);

      return (
        isDifferentNode &&
        !isCircular(routes, source, target) &&
        (isSameNodeType || isValidStrategusConnection)
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
        onClose={handleCloseDialog}
        connectorType={addNodeTypeDialog.nodeType}
      />
    </div>
  );
};
