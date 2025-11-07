import React, { FC, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { Loader, TableCell, TableRow, SubTitle, Card, Title } from "@portal/components";
import { StudyAttribute, StudyTag } from "../../../types";
import { usePublicDatasets } from "../../../hooks";
import { useActiveDataset, useTranslation } from "../../../contexts";
import "./PublicInformation.scss";

enum DatasetInfoTab {
  DatasetInfo = "info",
}

export const PublicInformation: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [datasets, loading, error] = usePublicDatasets();

  const { activeDataset } = useActiveDataset();
  const activeDatasetId = activeDataset.id;

  const dataset = datasets?.find((s) => s.id === activeDatasetId);

  const [tabValue, setTabValue] = useState(DatasetInfoTab.DatasetInfo);

  const attributes = dataset?.attributes || [];
  const tags = dataset?.tags || [];

  const handleTabSelectionChange = useCallback(async (event: React.SyntheticEvent, newValue: DatasetInfoTab) => {
    setTabValue(newValue);
  }, []);

  if (error) console.error(error.message);
  if (loading) return <Loader />;

  return (
    <Card
      className="public-information__container"
      title={
        <Tabs value={tabValue} onChange={handleTabSelectionChange}>
          <Tab
            disableRipple
            sx={{
              "&.MuiTab-root": {
                width: "200px",
              },
              marginRight: "8px",
            }}
            label={getText(i18nKeys.PUBLIC_INFORMATION__TAB_DATASET_INFO)}
            id="tab-0"
            value="info"
          />
        </Tabs>
      }
    >
      <div className="tab__content">
        <div className="tab__content__container">
          <Title>{dataset?.studyDetail?.name || getText(i18nKeys.PUBLIC_INFORMATION__UNTITLED)}</Title>
          {tabValue === DatasetInfoTab.DatasetInfo && (
            <div className="dataset__info">
              <ReactMarkdown>
                {dataset?.studyDetail?.description || getText(i18nKeys.PUBLIC_INFORMATION__NO_DATASET_DESCRIPTION)}
              </ReactMarkdown>
              <div className="metadata_tags_files__container">
                {(tags.length > 0 || attributes.length > 0) && (
                  <div className="metadata_tags__container">
                    {tags.length > 0 && (
                      <>
                        <div className="tags__content">
                          <SubTitle>{getText(i18nKeys.PUBLIC_INFORMATION__TAGS)}</SubTitle>
                          <Paper component="ul" className="tag__list" elevation={0}>
                            {tags.map((tag: StudyTag) => (
                              <li key={tag.name}>
                                <Chip label={tag.name} />
                              </li>
                            ))}
                          </Paper>
                        </div>
                      </>
                    )}
                    {attributes.length > 0 && (
                      <>
                        <div className="metadata__content">
                          <SubTitle>{getText(i18nKeys.PUBLIC_INFORMATION__METADATA)}</SubTitle>
                          <TableContainer className="study-metadata">
                            <Table>
                              <colgroup>
                                <col style={{ width: "40%" }} />
                                <col style={{ width: "60%" }} />
                              </colgroup>
                              <TableHead>
                                <TableRow>
                                  <TableCell>{getText(i18nKeys.PUBLIC_INFORMATION__RESOURCE_TYPE)}</TableCell>
                                  <TableCell>{getText(i18nKeys.PUBLIC_INFORMATION__DATASET)}</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {attributes.map((studyAttribute: StudyAttribute) => (
                                  <TableRow key={studyAttribute.attributeId}>
                                    <TableCell>{studyAttribute.attributeConfig.name}</TableCell>
                                    <TableCell>{studyAttribute.value}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
