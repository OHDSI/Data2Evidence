import React, { FC, useState, useEffect, useCallback } from "react";
import { Card, Tab, Tabs, Loader } from "@portal/components";
import { useTranslation } from "../../../contexts";
import { usePortalDescriptionConfigs } from "../../../hooks";
import { ConfigTypes } from "../../../constant";
import ReactMarkdown from "react-markdown";

export const LegalCard: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [configs, loading] = usePortalDescriptionConfigs([
    ConfigTypes.TERMS_OF_USE,
    ConfigTypes.TERMS_OF_USE_DISPLAY,
    ConfigTypes.PRIVACY_POLICY,
    ConfigTypes.PRIVACY_POLICY_DISPLAY,
    ConfigTypes.IMPRINT,
    ConfigTypes.IMPRINT_DISPLAY,
  ]);

  const [tabs, setTabs] = useState<ConfigTypes[]>([]);
  const [tabValue, setTabValue] = useState<ConfigTypes>();
  const tabsLabel = {
    [ConfigTypes.TERMS_OF_USE]: getText(i18nKeys.ACCOUNT__TERMS_OF_USE),
    [ConfigTypes.PRIVACY_POLICY]: getText(i18nKeys.ACCOUNT__PRIVACY_POLICY),
    [ConfigTypes.IMPRINT]: getText(i18nKeys.ACCOUNT__IMPRINT),
  };

  const convertStringToBoolean = useCallback((s: string) => {
    return s === "1";
  }, []);

  useEffect(() => {
    const displayTabs = [];

    if (convertStringToBoolean(configs[ConfigTypes.TERMS_OF_USE_DISPLAY])) {
      displayTabs.push(ConfigTypes.TERMS_OF_USE);
    }

    if (convertStringToBoolean(configs[ConfigTypes.PRIVACY_POLICY_DISPLAY])) {
      displayTabs.push(ConfigTypes.PRIVACY_POLICY);
    }

    if (convertStringToBoolean(configs[ConfigTypes.IMPRINT_DISPLAY])) {
      displayTabs.push(ConfigTypes.IMPRINT);
    }
    setTabs(displayTabs);
    setTabValue(displayTabs[0]);
  }, [configs, convertStringToBoolean]);

  const handleTabSelectionChange = useCallback((event: React.SyntheticEvent, newValue: ConfigTypes) => {
    setTabValue(newValue);
  }, []);

  if (loading) {
    return (
      <Card>
        <Loader />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Tabs value={tabValue} onChange={handleTabSelectionChange} centered>
          {tabs.map((tab, index) => (
            <Tab
              label={tabsLabel[tab as keyof typeof tabsLabel]}
              key={tab}
              value={tab}
              sx={{
                "&.MuiTab-root": {
                  width: "180px",
                },
              }}
            />
          ))}
        </Tabs>
      }
    >
      <div className="tab__content">
        <div className="tab__content__container">
          {tabs.length > 0 ? (
            <ReactMarkdown>{configs[tabValue as keyof typeof configs]}</ReactMarkdown>
          ) : (
            <div>No legal pages configured</div>
          )}
        </div>
      </div>
    </Card>
  );
};
