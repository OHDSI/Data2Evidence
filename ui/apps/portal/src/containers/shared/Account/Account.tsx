import React, { FC, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Loader } from "@portal/components";
import { PortalType, User } from "../../../types";
import { useDialogHelper } from "../../../hooks";
import { useToken, useTranslation, useUser } from "../../../contexts";
import env from "../../../env";
import { config } from "../../../config";
import { api } from "../../../axios/api";
import { ChangeMyPasswordDialog } from "./ChangeMyPasswordDialog/ChangeMyPasswordDialog";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";
import { ChangeLanguageDialog } from "./ChangeLanguageDialog/ChangeLanguageDialog";
import { LegalCard } from "../Legal/LegalCard";
import "./Account.scss";

interface AccountProps {
  portalType: PortalType;
}

const subProp = env.REACT_APP_IDP_SUBJECT_PROP;
const nameProp = env.REACT_APP_IDP_NAME_PROP;

const EMPTY_MY_USER: User = { id: "", name: "" };

export const Account: FC<AccountProps> = ({ portalType }) => {
  const { getText, i18nKeys } = useTranslation();
  const navigate = useNavigate();
  const { idTokenClaims } = useToken();
  const [myUser, setMyUser] = useState(EMPTY_MY_USER);
  const [showDeleteAccount, openDeleteAccount, closeDeleteAccount] = useDialogHelper(false);
  const [showPwd, openPwdDialog, closePwdDialog] = useDialogHelper(false);
  const [showLanguage, openLanguageDialog, closeLanguageDialog] = useDialogHelper(false);
  const { user, setUserGroup } = useUser();
  const [loading, setLoading] = useState(false);

  const fetchUserGroups = useCallback(async () => {
    setLoading(true);
    const userGroups = await api.userMgmt.getUserGroupList(idTokenClaims[subProp]);
    setUserGroup(idTokenClaims[subProp], userGroups);
    setLoading(false);
  }, [idTokenClaims, setUserGroup]);

  useEffect(() => {
    if (idTokenClaims) {
      fetchUserGroups();
      setMyUser({
        id: idTokenClaims[subProp],
        name: idTokenClaims[nameProp],
      });
    }
  }, [idTokenClaims, fetchUserGroups]);

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
              {loading ? (
                <Loader />
              ) : (
                <>
                  {portalType === "system_admin" && user.canAccessResearcherPortal && (
                    <Button
                      block
                      text={getText(i18nKeys.ACCOUNT__SWITCH_TO_RESEARCHER_PORTAL)}
                      onClick={handleSwitch}
                    />
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
                    text={getText(i18nKeys.ACCOUNT__CHANGE_LANGAUGE)}
                    onClick={openLanguageDialog}
                  />
                  <Button
                    block
                    variant="outlined"
                    text={getText(i18nKeys.ACCOUNT__DELETE_ACCOUNT)}
                    onClick={openDeleteAccount}
                  />
                </>
              )}
            </div>
          </div>
          <div className="account__content_legal">
            <LegalCard />
          </div>
        </div>
      </div>
      <DeleteAccountDialog open={showDeleteAccount} onClose={closeDeleteAccount} />
      <ChangeMyPasswordDialog open={showPwd} onClose={closePwdDialog} />
      <ChangeLanguageDialog open={showLanguage} onClose={closeLanguageDialog} />
    </div>
  );
};
