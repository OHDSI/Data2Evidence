import React, { FC, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Tab, Tabs } from "@portal/components";
import { PortalType, User } from "../../../types";
import { useDialogHelper } from "../../../hooks";
import { useToken, useTranslation, useUser } from "../../../contexts";
import env from "../../../env";
import { config } from "../../../config";
import { ChangeMyPasswordDialog } from "./ChangeMyPasswordDialog/ChangeMyPasswordDialog";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";
import TermsOfUse from "../LegalPages/TermsOfUse";
import PrivacyPolicy from "../LegalPages/PrivacyPolicy";
import Imprint from "../LegalPages/Imprint";
import "./Account.scss";

interface AccountProps {
  portalType: PortalType;
}

enum LegalTab {
  TermsOfUse,
  PrivacyPolicy,
  Imprint,
}

const subProp = env.REACT_APP_IDP_SUBJECT_PROP;
const nameProp = env.REACT_APP_IDP_NAME_PROP;

const EMPTY_MY_USER: User = { id: "", name: "" };

export const Account: FC<AccountProps> = ({ portalType }) => {
  const { getText, i18nKeys } = useTranslation();
  const navigate = useNavigate();
  const { idTokenClaims } = useToken();
  const [tabValue, setTabValue] = useState<LegalTab>(LegalTab.TermsOfUse);
  const [myUser, setMyUser] = useState(EMPTY_MY_USER);
  const [showDeleteAccount, openDeleteAccount, closeDeleteAccount] = useDialogHelper(false);
  const [showPwd, openPwdDialog, closePwdDialog] = useDialogHelper(false);
  const { user } = useUser();

  const legalTabs = [
    getText(i18nKeys.ACCOUNT__TERMS_OF_USE),
    getText(i18nKeys.ACCOUNT__PRIVACY_POLICY),
    getText(i18nKeys.ACCOUNT__IMPRINT),
  ];

  useEffect(() => {
    if (idTokenClaims) {
      setMyUser({
        id: idTokenClaims[subProp],
        name: idTokenClaims[nameProp],
      });
    }
  }, [idTokenClaims]);

  const handleTabSelectionChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const handleSwitch = useCallback(() => {
    navigate(portalType === "researcher" ? config.ROUTES.systemadmin : config.ROUTES.researcher);
  }, [navigate, portalType]);

  const handleLogout = useCallback(() => {
    navigate(config.ROUTES.logout);
  }, [navigate]);

  return (
    <div className="account">
      <div className="account__container">
        <div className="account__content">
          <div className="account__content_account">
            <Card title={getText(i18nKeys.ACCOUNT__ACCOUNT)}>
              <div className="account__content_account_details">
                <div>
                  <span>{getText(i18nKeys.ACCOUNT__NAME)}</span>
                  <span>{myUser?.name || "-"}</span>
                </div>
                <div>
                  <span>{getText(i18nKeys.ACCOUNT__EMAIL)}</span>
                  <span>{idTokenClaims.email || "-"}</span>
                </div>
              </div>
            </Card>
            <div className="account__content_actions">
              {portalType === "system_admin" && user.canAccessResearcherPortal && (
                <Button block text={getText(i18nKeys.ACCOUNT__SWITCH_TO_RESEARCHER_PORTAL)} onClick={handleSwitch} />
              )}
              {portalType === "researcher" && user.canAccessSystemAdminPortal && (
                <Button block text={getText(i18nKeys.ACCOUNT__SWITCH_TO_ADMIN_PORTAL)} onClick={handleSwitch} />
              )}
              <Button block text={getText(i18nKeys.ACCOUNT__LOGOUT)} onClick={handleLogout} />
              <Button
                block
                variant="outlined"
                text={getText(i18nKeys.ACCOUNT__CHANGE_PASSWORD)}
                onClick={openPwdDialog}
              />
              <Button
                block
                variant="outlined"
                text={getText(i18nKeys.ACCOUNT__DELETE_ACCOUNT)}
                onClick={openDeleteAccount}
              />
            </div>
          </div>
          <div className="account__content_legal">
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
      <DeleteAccountDialog open={showDeleteAccount} onClose={closeDeleteAccount} />
      <ChangeMyPasswordDialog open={showPwd} onClose={closePwdDialog} />
    </div>
  );
};
