import React, { FC, useCallback, useState, useEffect } from "react";
import { Study, UserWithRoles } from "../../../../types";
import { Dialog, Button, Feedback } from "@portal/components";
import Divider from "@mui/material/Divider";
import "./PermissionsDialog.scss";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import RequestPanel from "./Panels/RequestPanel";
import AccessPanel from "./Panels/AccessPanel";
import { api } from "../../../../axios/api";
import { SelectChangeEvent } from "@mui/material/Select";
import { useTranslation, useUser } from "../../../../contexts";

interface PermissionsDialogProps {
  study?: Study;
  open: boolean;
  onClose?: () => void;
}

export interface StudyAccessRequest {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  role: string;
  requestedOn: string;
}

export interface RoleEdit {
  userId: string;
  tenantId: string;
  studyId: string;
  changes: string[];
}

const PermissionsDialog: FC<PermissionsDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [loading, setLoading] = useState(false);

  //Request states
  const [approvedReqs, setApprovedReqs] = useState<StudyAccessRequest[]>([]);
  const [rejectedReqs, setRejectedReqs] = useState<StudyAccessRequest[]>([]);
  const [selectedAction, setSelectedAction] = useState("");

  //Edit roles states
  const [grantRolesList, setGrantRolesList] = useState<RoleEdit[]>([]);
  const [withdrawRolesList, setWithdrawRolesList] = useState<RoleEdit[]>([]);

  //Access request states
  const [accessRequests, setAccessRequests] = useState<StudyAccessRequest[]>([]);

  const { user, setUserGroup } = useUser();

  const clearOnSave = useCallback(() => {
    setApprovedReqs([]);
    setRejectedReqs([]);
    setGrantRolesList([]);
    setWithdrawRolesList([]);
  }, []);

  //FETCH STUDY USERS
  const fetchStudyUsers = useCallback(async () => {
    if (study?.id) {
      const users = await api.userMgmt.getUsersByStudy(study?.id);
      setUsers(users);
    }
  }, [study?.id]);

  useEffect(() => {
    fetchStudyUsers();
  }, [fetchStudyUsers]);

  const fetchStudyAccessRequests = useCallback(async () => {
    if (study?.id) {
      const accessRequests = await api.userMgmt.getStudyAccessRequests(study?.id);
      setAccessRequests(accessRequests);
    }
  }, [study?.id]);

  useEffect(() => {
    fetchStudyAccessRequests();
  }, [fetchStudyAccessRequests]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const clearFeedback = useCallback(() => {
    setFeedback({});
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  //Request helpers
  const exists = useCallback((request: StudyAccessRequest, reqArr: StudyAccessRequest[]) => {
    return reqArr.includes(request);
  }, []);

  const removeFromPendingArr = useCallback(
    (request: StudyAccessRequest) => {
      if (exists(request, approvedReqs)) {
        setApprovedReqs((prevState) => prevState.filter((req) => req.id !== request.id));
      }
      if (exists(request, rejectedReqs)) {
        setRejectedReqs((prevState) => prevState.filter((req) => req.id !== request.id));
      }
    },
    [approvedReqs, exists, rejectedReqs]
  );

  const handleActionChange = useCallback(
    (event: SelectChangeEvent<string>, request: StudyAccessRequest) => {
      if (event.target.value === "approve") {
        setSelectedAction(event.target.value);
        removeFromPendingArr(request);
        setApprovedReqs([...approvedReqs, request]);
      } else if (event.target.value === "reject") {
        setSelectedAction(event.target.value);
        removeFromPendingArr(request);
        setRejectedReqs([...rejectedReqs, request]);
      } else {
        setSelectedAction(event.target.value);
        removeFromPendingArr(request);
      }
    },
    [approvedReqs, rejectedReqs, removeFromPendingArr]
  );

  const handleReject = useCallback(async (request: StudyAccessRequest) => {
    try {
      await api.userMgmt.handleStudyAccessRequest("reject", request.id, request.userId, request.groupId);
    } catch (e) {
      console.error(e);
      throw new Error("Error rejecting request");
    }
  }, []);

  const handleApprove = useCallback(
    async (request: StudyAccessRequest) => {
      try {
        await api.userMgmt.handleStudyAccessRequest("approve", request.id, request.userId, request.groupId);

        if (request.userId === user.userId && user.idpUserId) {
          const userGroups = await api.userMgmt.getUserGroupList(user.idpUserId);
          setUserGroup(user.idpUserId, userGroups);
        }
      } catch (e) {
        throw new Error("Error approving request");
      }
    },
    [user, setUserGroup]
  );

  const handleRegisterRoles = useCallback(async (roleEditReq: RoleEdit) => {
    const { userId, tenantId, studyId, changes } = roleEditReq;
    try {
      await api.userMgmt.registerStudyRoles([userId], tenantId, studyId, changes);
    } catch (e) {
      throw new Error("Error registering roles");
    }
  }, []);

  const handleWithdrawEditRoles = useCallback(async (roleEditReq: RoleEdit) => {
    const { userId, tenantId, studyId, changes } = roleEditReq;
    try {
      await api.userMgmt.withdrawStudyRoles(userId, tenantId, studyId, changes);
    } catch (e) {
      throw new Error("Error withdrawing roles");
    }
  }, []);

  const handleRequests = useCallback(async () => {
    const approvedReqArr = approvedReqs.map((r) => handleApprove(r));
    const rejectedReqArr = rejectedReqs.map((r) => handleReject(r));
    const grantRolesReqArr = grantRolesList.map((r) => handleRegisterRoles(r));
    const withdrawRolesReqArr = withdrawRolesList.map((r) => handleWithdrawEditRoles(r));
    const promises = approvedReqArr.concat(rejectedReqArr, grantRolesReqArr, withdrawRolesReqArr);

    await Promise.all(promises)
      .then(() => {
        setFeedback({
          type: "success",
          message: getText(i18nKeys.PERMISSIONS_DIALOG__SUCCESS),
        });
        fetchStudyUsers();
        fetchStudyAccessRequests();
        clearOnSave();
      })
      .catch((e) => {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.PERMISSIONS_DIALOG__ERROR, [e]),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    approvedReqs,
    clearOnSave,
    fetchStudyAccessRequests,
    fetchStudyUsers,
    grantRolesList,
    handleApprove,
    handleRegisterRoles,
    handleReject,
    handleWithdrawEditRoles,
    rejectedReqs,
    withdrawRolesList,
    getText,
  ]);

  const handleSave = useCallback(() => {
    setLoading(true);
    handleRequests();
  }, [handleRequests]);

  const hasChanges = useCallback(() => {
    const allArrs = [approvedReqs, rejectedReqs, grantRolesList, withdrawRolesList];
    return allArrs.some((a) => a.length !== 0);
  }, [approvedReqs, grantRolesList, rejectedReqs, withdrawRolesList]);

  return (
    <Dialog
      className="permissions-dialog"
      title={getText(i18nKeys.PERMISSIONS_DIALOG__PERMISSIONS)}
      closable
      open={open}
      onClose={onClose}
      maxWidth="md"
      feedback={feedback}
      onCloseFeedback={clearFeedback}
    >
      <div className="permissions-dialog__content">
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          centered
          sx={{
            "&.MuiTabs-indicator": {
              height: "4px",
            },
          }}
        >
          <Tab
            label={getText(i18nKeys.PERMISSIONS_DIALOG__REQUEST)}
            disableRipple
            sx={{
              "&.MuiTab-root": {
                fontSize: "18px",
              },
            }}
          />
          <Tab
            label={getText(i18nKeys.PERMISSIONS_DIALOG__ACCESS)}
            disableRipple
            sx={{
              "&.MuiTab-root": {
                fontSize: "18px",
              },
            }}
          />
        </Tabs>
        {tabIndex == 0 && (
          <RequestPanel
            studyId={study?.id!}
            selectedAction={selectedAction}
            handleActionChange={handleActionChange}
            accessRequests={accessRequests}
            fetchStudyAccessRequests={fetchStudyAccessRequests}
          />
        )}
        {tabIndex == 1 && (
          <AccessPanel
            studyId={study?.id!}
            tenantId={study?.tenant?.id!}
            selectedAction={selectedAction}
            handleActionChange={handleActionChange}
            users={users}
            grantRolesList={grantRolesList}
            withdrawRolesList={withdrawRolesList}
            setGrantRolesList={setGrantRolesList}
            setWithdrawRolesList={setWithdrawRolesList}
            setFeedback={setFeedback}
            fetchStudyUsers={fetchStudyUsers}
            setLoading={setLoading}
          />
        )}
      </div>

      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.PERMISSIONS_DIALOG__CLOSE)}
          onClick={handleClose}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button
          text={getText(i18nKeys.PERMISSIONS_DIALOG__SAVE)}
          onClick={handleSave}
          block
          loading={loading}
          disabled={!hasChanges()}
        />
      </div>
    </Dialog>
  );
};

export default PermissionsDialog;
