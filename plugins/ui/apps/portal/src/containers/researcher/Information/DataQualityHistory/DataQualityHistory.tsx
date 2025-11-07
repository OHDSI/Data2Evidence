import React, { FC, useState, useEffect, useCallback } from "react";
import { Loader, SubTitle } from "@portal/components";
import { api } from "../../../../axios/api";
import {
  HistoricalDataQualityChart,
  HistoricalDataQualityMultiSeriesChart,
  DomainContinuityChart,
} from "../../../../components/Charts/SourceKeys/DataQualityHistory";
import {
  DomainContinuity,
  HistoricalDataQuality,
  HistoricalDataQualityMultiSeries,
} from "../../../../components/DQD/types";
import "./DataQualityHistory.scss";
import { useTranslation } from "../../../../contexts";

interface DataQualityHistoryProps {
  activeDatasetId: string;
}

const DataQualityHistory: FC<DataQualityHistoryProps> = ({ activeDatasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [historicalDataQuality, setHistoricalDataQuality] = useState<HistoricalDataQuality[]>([]);
  const [historicalDataQualityByCategory, setHistoricalDataQualityByCategory] = useState<
    HistoricalDataQualityMultiSeries[]
  >([]);
  const [historicalDataQualityByDomain, setHistoricalDataQualityByDomain] = useState<
    HistoricalDataQualityMultiSeries[]
  >([]);
  const [domainContinuity, setDomainContinuity] = useState<DomainContinuity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await Promise.all([
        api.dataflow.getHistoricalDataQuality(activeDatasetId),
        api.dataflow.getHistoricalDataQualityByCategory(activeDatasetId),
        api.dataflow.getHistoricalDataQualityByDomain(activeDatasetId),
        api.dataflow.getDomainContinuity(activeDatasetId),
      ]);
      setHistoricalDataQuality(data[0]);
      setHistoricalDataQualityByCategory(data[1]);
      setHistoricalDataQualityByDomain(data[2]);
      setDomainContinuity(data[3]);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError(getText(i18nKeys.DATA_QUALITY_HISTORY__ERROR));
    }
  }, [activeDatasetId]);

  useEffect(() => {
    if (activeDatasetId) {
      fetchData();
    } else {
      setHistoricalDataQuality([]);
      setHistoricalDataQualityByCategory([]);
      setHistoricalDataQualityByDomain([]);
      setDomainContinuity([]);
    }
  }, [activeDatasetId]);

  if (loading) return <Loader />;

  if (error) return <div className="error__description">{error}</div>;

  return (
    <>
      <div className="history__container">
        <div className="history__table">
          <HistoricalDataQualityChart data={historicalDataQuality} />
        </div>
        <div className="history__table">
          <HistoricalDataQualityMultiSeriesChart data={historicalDataQualityByCategory} seriesType="category" />
        </div>
        <div className="history__table">
          <HistoricalDataQualityMultiSeriesChart data={historicalDataQualityByDomain} seriesType="domain" />
        </div>
      </div>
      <div className="domain-continuity__container">
        <SubTitle>{getText(i18nKeys.DATA_QUALITY_HISTORY__DOMAIN_CONTINUITY)}</SubTitle>
        {domainContinuity &&
          domainContinuity.map((domainData) => {
            return (
              <div key={domainData.domain} className="domain-continuity__table">
                <DomainContinuityChart data={domainData} />
              </div>
            );
          })}
      </div>
    </>
  );
};

export default DataQualityHistory;
