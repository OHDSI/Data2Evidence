import React, { FC, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import {
  Card,
  CalendarIcon,
  DatabaseIcon,
  DocPlayIcon,
  PadlockEmptyUnlockIcon,
  UsersIcon,
  PadlockEmptyIcon,
} from "@portal/components";
import { HighlightText } from "../../../components";
import { Study } from "../../../types";
import { DatasetAttribute } from "../../../constant";
import { useActiveDataset, useTranslation, useUser } from "../../../contexts";
import "./DatasetCard.scss";

interface DatasetCardProps {
  dataset: Study;
  path: string;
  highlightText?: string;
}

const colorPalette = [
  "#FDA2A2",
  "#000E7E",
  "#A2FDCD",
  "#FF5E59",
  "#CCDEF1",
  "#2599A7",
  "#FFC4AD",
  "#999FCB",
  "#EBF0C8",
  "#CE7AEB",
  "#69BBF6",
  "#FDEEA2",
  "#9215BC",
  "#9FC5E8",
  "#FFD9A5",
];

export const DatasetCard: FC<DatasetCardProps> = ({ dataset, path, highlightText }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getText, i18nKeys } = useTranslation();
  const { setActiveDatasetId } = useActiveDataset();

  const getAttributeValue = useCallback(
    (id: string) => dataset.attributes?.find((att) => att.attributeId === id)?.value,
    [dataset.attributes]
  );

  const patientCount = getAttributeValue(DatasetAttribute.PATIENT_COUNT);
  const createdDate = getAttributeValue(DatasetAttribute.CREATED_DATE);
  const version = getAttributeValue(DatasetAttribute.VERSION);

  const getOptions = useCallback(
    (data: { [key: string]: any }) => {
      const labels = Object.keys(data);
      const counts = Object.values(data).map(Number);

      return {
        tooltip: {
          trigger: "item",
          formatter: "{a} <br/>{b}: {c} ({d}%)",
        },
        series: [
          {
            name: getText(i18nKeys.DATASET_CARD__CHART_NAME),
            type: "pie",
            radius: ["40%", "80%"],
            avoidLabelOverlap: false,
            label: {
              show: false,
              position: "center",
            },
            labelLine: {
              show: false,
            },
            color: colorPalette,
            data: labels.map((label, index) => ({
              value: counts[index],
              name: label,
            })),
          },
        ],
      };
    },
    [getText, i18nKeys]
  );

  const entityCounts = getAttributeValue(DatasetAttribute.ENTITY_COUNT_DISTRIBUTION);
  const chartData = useMemo(() => {
    try {
      const data = JSON.parse(entityCounts || "{}");
      const filteredData = Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== "0"));
      return filteredData;
    } catch {
      return {};
    }
  }, [entityCounts]);

  const handleCardClick = useCallback(() => {
    setActiveDatasetId(dataset.id);

    navigate(`${path}/information`, {
      state: {
        tenantId: dataset.tenant.id,
      },
    });
  }, [setActiveDatasetId, navigate, path, dataset]);

  return (
    <Card className="dataset-card" borderRadius={18} onClick={handleCardClick}>
      <div className="dataset-card__chart">
        <ReactECharts style={{ width: "248px", height: "264px" }} option={getOptions(chartData)} />
      </div>
      <div className="dataset-card__content">
        <div className="dataset-card__title">
          {dataset.visibilityStatus}
          {user.isDatasetResearcher[dataset.id] ? (
            <PadlockEmptyUnlockIcon className="dataset-card__permission-icon" />
          ) : (
            <PadlockEmptyIcon className="dataset-card__permission-icon dataset-card__permission-icon--inaccessible" />
          )}
          <HighlightText text={dataset.studyDetail?.name || "Untitled"} searchText={highlightText} />
        </div>
        <div className="dataset-card__summary">
          <HighlightText
            text={dataset.studyDetail?.summary || getText(i18nKeys.DATASET_CARD__NO_DATASET_SUMMARY)}
            searchText={highlightText}
          />
        </div>
        <div className="dataset-card__attributes">
          <div className="dataset-card__attribute">
            <UsersIcon />
            {getText(i18nKeys.DATASET_CARD__PATIENT_COUNT)}: {patientCount || 0}
          </div>
          <div className="dataset-card__attribute">
            <CalendarIcon />
            {getText(i18nKeys.DATASET_CARD__DATE)}: {createdDate || "-"}
          </div>
          <div className="dataset-card__attribute">
            <DocPlayIcon />
            {getText(i18nKeys.DATASET_CARD__VERSION)}: {version || "-"}
          </div>
          <div className="dataset-card__attribute">
            <DatabaseIcon />
            {getText(i18nKeys.DATASET_CARD__DATA_MODEL)}: {dataset.dataModel || "-"}
          </div>
        </div>
      </div>
    </Card>
  );
};
