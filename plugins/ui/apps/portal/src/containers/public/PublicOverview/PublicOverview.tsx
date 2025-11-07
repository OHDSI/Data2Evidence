import React, { FC, useEffect, useState, useMemo, useCallback } from "react";
import classNames from "classnames";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { Loader } from "@portal/components";
import { useOverviewDescription, usePublicDatasets } from "../../../hooks";
import { config } from "../../../config/index";
import { useTranslation } from "../../../contexts";
import noStudyImg from "../../shared/StudyOverview/images/no-study.png";
import { PublicDatasetCard } from "../PublicDatasetCard/PublicDatasetCard";
import { SearchBarDataset } from "../../researcher/Overview/components/SearchBarDatasets";
import { HomeHeader } from "../../researcher/Overview/components/HomeHeader";
import { AccountButton } from "../../researcher/Overview/components/AccountButton";
import { i18nKeys } from "../../../contexts/app-context/states";
import env from "../../../env";
import "./PublicOverview.scss";

export const PublicOverview: FC = () => {
  const { getText } = useTranslation();
  const [searchString, setSearchString] = useState<string>();
  const [searchText, setSearchText] = useState<string>();
  const navigate = useNavigate();

  const [refetch, setRefetch] = useState(0);
  const [datasets, loading, error] = usePublicDatasets(searchText, refetch);
  const [overviewDescription] = useOverviewDescription(true);

  useEffect(() => {
    if (datasets && datasets.length === 0) {
      navigate(config.ROUTES.login);
    }
  }, [datasets, navigate]);

  const RenderDatasets = useMemo(() => {
    const isEmpty = datasets == null || datasets.length === 0;
    const classes = classNames("public-overview__datasets", { "public-overview__datasets--empty": isEmpty });

    if (loading) return <Loader />;

    return (
      <div className={classes}>
        {isEmpty ? (
          <>
            <img alt="No dataset" src={noStudyImg} height="160" width="270" />
            <p>{getText(i18nKeys.OVERVIEW__NO_DATASET)}</p>
          </>
        ) : (
          datasets.map((dataset) => (
            <PublicDatasetCard
              key={dataset.id}
              dataset={dataset}
              path={config.ROUTES.public}
              highlightText={searchText}
            />
          ))
        )}
      </div>
    );
  }, [datasets, loading, searchText, getText]);

  const handleSearchEnter = useCallback((keyword: string) => {
    setSearchText((current) => {
      if (current === keyword) {
        setRefetch((refetch) => refetch + 1);
        return current;
      } else {
        return keyword;
      }
    });
  }, []);

  const handleSearchChange = useCallback((keyword: string) => {
    setSearchString(keyword);
  }, []);

  if (error) console.error(error.message);
  if (loading) return <Loader />;

  return (
    <div className="public-overview">
      <HomeHeader searchKeyword={searchString} onSearchEnter={handleSearchEnter} onSearchChange={handleSearchChange} />
      <div className="public-overview__banner">
        <div className="public-overview__banner-content">
          <img alt="Illustration" src={`${env.PUBLIC_URL}/assets/landing-page-illustration.svg`} />
          <div className="public-overview__banner-title">
            <div className="public-overview__banner-title-text">Data2Evidence</div>
            <div className="public-overview__banner-description">
              <ReactMarkdown>{overviewDescription.value || getText(i18nKeys.HOME__DESCRIPTION)}</ReactMarkdown>
            </div>
            <SearchBarDataset keyword={searchString} onEnter={handleSearchEnter} onChange={handleSearchChange} />
          </div>
        </div>
        <AccountButton />
      </div>
      <div className="public-overview__content">{RenderDatasets}</div>
    </div>
  );
};
