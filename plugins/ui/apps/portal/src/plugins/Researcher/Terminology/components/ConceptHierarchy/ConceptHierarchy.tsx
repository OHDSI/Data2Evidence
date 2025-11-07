import React, { FC, useEffect, useState, useCallback } from "react";
import ReactFlow, { Node, Edge, Position, MarkerType } from "reactflow";
import { Select, SelectChangeEvent, InputLabel, Loader } from "@portal/components";
import { MenuItem } from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { Terminology } from "../../../../../axios/terminology";
import { useFeedback, useTranslation } from "../../../../../contexts";
import { ConceptHierarchyResponse, ConceptHierarchyNode, ConceptHierarchyNodeCounts } from "../../utils/types";
import { i18nKeys } from "../../../../../contexts/app-context/states";
import "reactflow/dist/style.css";
import "./ConceptHierarchy.scss";

interface ConceptHierarchyProps {
  userId?: string;
  conceptId: number;
  datasetId?: string;
}

const xAxisOffset = 200;
const yAxisOffset = 150;

const numParentLevels = 10;
const numParentLevelsArray = [...Array(numParentLevels).keys()].map((i) => i + 1);

const countAndGroupNodesByLevel = (nodes: ConceptHierarchyNode[]) => {
  const nodeCounts: ConceptHierarchyNodeCounts = {};

  nodes.forEach((node: ConceptHierarchyNode) => {
    if (!nodeCounts[node.level]) {
      nodeCounts[node.level] = { count: 0, nodes: [] };
    }

    nodeCounts[node.level].count++;
    nodeCounts[node.level].nodes.push(node);
  });

  return nodeCounts;
};

const createNodes = (nodes: ConceptHierarchyNode[]): Node[] => {
  const parsedNodes: Node[] = [];

  const nodeLevels: ConceptHierarchyNodeCounts = countAndGroupNodesByLevel(nodes);

  for (const [level, value] of Object.entries(nodeLevels)) {
    const { nodes } = value;
    const mid = Math.floor(nodes.length / 2);
    for (let i = 0; i < nodes.length; i++) {
      const positionY: number = yAxisOffset * (i - mid);
      const positionX: number = -xAxisOffset * parseInt(level);

      parsedNodes.push({
        id: nodes[i].conceptId.toString(),
        position: { x: positionX, y: positionY },
        data: { label: nodes[i].display },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    }
  }
  return parsedNodes;
};

const ConceptHierarchy: FC<ConceptHierarchyProps> = ({ userId, conceptId, datasetId }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [level, setLevel] = useState<string>("1");
  const [data, setData] = useState<ConceptHierarchyResponse>();
  const { setFeedback } = useFeedback();
  const { getText } = useTranslation();

  const handleChange = useCallback((level: string) => {
    setLevel(level);
  }, []);

  useEffect(() => {
    if (userId && datasetId) {
      const fetchData = async () => {
        if (userId) {
          try {
            setIsLoading(true);
            const terminologyApi = new Terminology();
            const response = await terminologyApi.getConceptHierarchy(datasetId, conceptId, parseInt(level));
            setData(response);
          } catch (error) {
            console.error(error);
            setFeedback({
              type: "error",
              message: getText(i18nKeys.COHORT_HIERARCHY__ERROR),
              description: getText(i18nKeys.COHORT_HIERARCHY__ERROR),
            });
          } finally {
            setIsLoading(false);
          }
        }
      };
      fetchData();
    }
  }, [level, conceptId, datasetId, userId, setFeedback, getText, i18nKeys]);

  const nodes: Node[] = data ? createNodes(data.nodes) : [];

  const edges: Edge[] = data
    ? data?.edges.map((edge) => ({
        id: uuidv4(),
        source: edge.source.toString(),
        target: edge.target.toString(),
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }))
    : [];

  return (
    <div className="concept-hierarchy__container">
      <div className="concept-hierarchy__select">
        <InputLabel>Number of Parent Levels</InputLabel>

        <Select
          variant="outlined"
          sx={{
            minWidth: "50px",
            borderRadius: "6px",
            backgroundColor: "#000080",
            color: "white",
            ".MuiSelect-select": {
              padding: "8px 14px",
            },
            ".MuiSvgIcon-root": { fill: "white" },
          }}
          value={level}
          onChange={(e: SelectChangeEvent) => handleChange(e.target.value)}
        >
          {numParentLevelsArray.map((parentLevel) => (
            <MenuItem key={parentLevel} value={parentLevel}>
              {parentLevel}
            </MenuItem>
          ))}
        </Select>
      </div>

      {isLoading && <Loader />}

      {!isLoading && data && <ReactFlow nodes={nodes} edges={edges} fitView></ReactFlow>}
    </div>
  );
};

export default ConceptHierarchy;
