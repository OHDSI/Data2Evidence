import React, { FC, useState, useCallback } from "react";
import { Card, Tab, Tabs } from "@portal/components";
import { useTranslation } from "../../../contexts";
import TermsOfUse from "../LegalPages/TermsOfUse";
import PrivacyPolicy from "../LegalPages/PrivacyPolicy";
import Imprint from "../LegalPages/Imprint";
import "./Legal.scss";

enum LegalTab {
  TermsOfUse,
  PrivacyPolicy,
  Imprint,
}

export const Legal: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [tabValue, setTabValue] = useState<LegalTab>(LegalTab.TermsOfUse);

  const legalTabs = [
    getText(i18nKeys.ACCOUNT__TERMS_OF_USE),
    getText(i18nKeys.ACCOUNT__PRIVACY_POLICY),
    getText(i18nKeys.ACCOUNT__IMPRINT),
  ];

  const handleTabSelectionChange = useCallback((event: React.SyntheticEvent, newValue: LegalTab) => {
    setTabValue(newValue);
  }, []);

  return (
    <div className="legal">
      <div className="legal__container">
        <div className="legal__content">
          <Card
            title={
              <Tabs value={tabValue} onChange={handleTabSelectionChange} centered>
                {legalTabs.map((tab, index) => (
                  <Tab
                    label={tab}
                    key={index}
                    value={index}
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
                {tabValue === LegalTab.TermsOfUse && <TermsOfUse />}
                {tabValue === LegalTab.PrivacyPolicy && <PrivacyPolicy />}
                {tabValue === LegalTab.Imprint && <Imprint />}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
