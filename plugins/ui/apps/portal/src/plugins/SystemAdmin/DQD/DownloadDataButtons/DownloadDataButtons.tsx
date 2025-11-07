import React, { FC } from "react";
import { Button } from "@portal/components";
import { dqdParseToCsv, filterJSON, downloadFile, DownloadColumn } from "../../../../utils/Export";
import { CheckResults, OverviewResults } from "../../../../components/DQD/types";
import { useTranslation } from "../../../../contexts";
import "./DownloadDataButtons.scss";

interface DownloadDataButtonsProps {
  data: CheckResults[];
  overviewData: OverviewResults | undefined;
  datasetName: string;
}

const DownloadDataButtons: FC<DownloadDataButtonsProps> = ({ data, overviewData, datasetName }) => {
  const { getText, i18nKeys } = useTranslation();
  const downloadColumns: DownloadColumn[] = [
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__STATUS), accessor: "failed" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__CONTEXT), accessor: "context" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__TABLE), accessor: "cdmTableName" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__CATEGORY), accessor: "category" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__SUBCATEGORY), accessor: "subcategory" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__LEVEL), accessor: "checkLevel" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__NOTES), accessor: "notesValue" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__DESCRIPTION), accessor: "checkDescription" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__VIOLATEDROWS), accessor: "pctViolatedRows" },
    { header: getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__NUMVIOLATEDROWS), accessor: "numViolatedRows" },
  ];
  return (
    <div className="download-data-buttons">
      <Button
        onClick={() =>
          downloadFile({
            data: dqdParseToCsv(data.map((d) => ({ ...d }))),
            fileName: datasetName,
            fileType: "text/csv",
          })
        }
        text={getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__DOWNLOAD_CSV)}
      />
      <Button
        onClick={() =>
          downloadFile({
            data: filterJSON(
              data.map((d) => ({ ...d })),
              overviewData
            ),
            fileName: `${datasetName}.json`,
            fileType: "text/json",
          })
        }
        text={getText(i18nKeys.DOWNLOAD_DATA_BUTTONS__DOWNLOAD_JSON)}
      />
    </div>
  );
};

export default DownloadDataButtons;
