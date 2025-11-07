import React, { FC, useMemo, useState, useCallback } from "react";
import classNames from "classnames";
import debounce from "lodash/debounce";
import ReactMarkdown from "react-markdown";
import { Loader } from "@portal/components";
import { useDatasets, useOverviewDescription } from "../../../hooks";
import { FEATURE_DATASET_FILTER, config } from "../../../config/index";
import { DatasetFilters } from "./components/DatasetFilters";
import { DatasetCard } from "../DatasetCard/DatasetCard";
import noStudyImg from "../../shared/StudyOverview/images/no-study.png";
import { FeatureGate } from "../../../config/FeatureGate";
import { useTranslation } from "../../../contexts";
import { HomeHeader } from "./components/HomeHeader";
import { SearchBarDataset } from "./components/SearchBarDatasets";
import { AccountButton } from "./components/AccountButton";
import env from "../../../env";
import "./Overview.scss";

export const Overview: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [searchString, setSearchString] = useState<string>();
  const [searchText, setSearchText] = useState<string>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const debounceSetFilters = debounce((filters: Record<string, string>) => setFilters(filters), 300);
  const [refetch, setRefetch] = useState(0);
  const [datasets, loading, error] = useDatasets("researcher", searchText, filters, refetch);
  const [overviewDescription] = useOverviewDescription();

  const RenderDatasets = useMemo(() => {
    const isEmpty = datasets.length === 0;
    const classes = classNames("overview__datasets", { "overview__datasets--empty": isEmpty });

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
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              path={config.ROUTES.researcher}
              highlightText={searchText}
            />
          ))
        )}
      </div>
    );
  }, [datasets, loading, searchText, getText]);

  const handleFiltersChange = useCallback(
    (filters: Record<string, string>) => {
      debounceSetFilters(filters);
    },
    [debounceSetFilters]
  );

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

  return (
    <div className="overview">
      <HomeHeader searchKeyword={searchString} onSearchEnter={handleSearchEnter} onSearchChange={handleSearchChange} />
      <div className="overview__banner">
        <div className="overview__banner-content">
          <img alt="Illustration" src={`${env.PUBLIC_URL}/assets/landing-page-illustration.svg`} />
          <div className="overview__banner-title">
            <div className="overview__banner-title-text">Data2Evidence</div>
            <div className="overview__banner-description">
              <ReactMarkdown>{overviewDescription.value || getText(i18nKeys.HOME__DESCRIPTION)}</ReactMarkdown>
            </div>
            <SearchBarDataset keyword={searchString} onEnter={handleSearchEnter} onChange={handleSearchChange} />
          </div>
        </div>
        <AccountButton />
      </div>
      <div className="overview__body">
        <FeatureGate featureFlags={[FEATURE_DATASET_FILTER]}>
          <div className="overview__filter">
            <DatasetFilters onChange={handleFiltersChange} />
          </div>
        </FeatureGate>
        <div className={classNames("overview__content", { "overview__content--empty": datasets.length === 0 })}>
          {RenderDatasets}
        </div>
      </div>
    </div>
  );
};
