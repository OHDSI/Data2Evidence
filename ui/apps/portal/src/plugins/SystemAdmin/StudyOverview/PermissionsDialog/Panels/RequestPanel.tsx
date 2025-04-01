import React, { FC } from "react";
import dayjs from "dayjs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { SelectChangeEvent } from "@mui/material/Select";
import { FormControl } from "@mui/material";
import { TableRow, TableCell } from "@portal/components";
import env from "../../../../../env";
import { StudyAccessRequest } from "../PermissionsDialog";
import "./PanelTables.scss";
import { useTranslation } from "../../../../../contexts";

interface RequestPanelProps {
  studyId: string;
  selectedAction: string;
  handleActionChange: (event: SelectChangeEvent<string>, request: StudyAccessRequest) => void;
  accessRequests: StudyAccessRequest[];
  fetchStudyAccessRequests: () => Promise<void>;
}

const RequestPanel: FC<RequestPanelProps> = ({ selectedAction, handleActionChange, accessRequests }) => {
  const { getText, i18nKeys } = useTranslation();
  return (
    <div className="request-panel">
      <div className="request-panel__title">{getText(i18nKeys.REQUEST_PANEL__REQUESTS)}</div>
      <TableContainer className="pending-requests">
        <Table>
          <colgroup>
            <col style={{ width: "45%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell>{getText(i18nKeys.REQUEST_PANEL__EMAIL)}</TableCell>
              <TableCell>{getText(i18nKeys.REQUEST_PANEL__REQUESTED)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(!accessRequests || accessRequests.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  {getText(i18nKeys.REQUEST_PANEL__NO_DATA)}
                </TableCell>
              </TableRow>
            )}
            {accessRequests?.map((request, index) => (
              <TableRow key={request.id}>
                <TableCell style={{ wordBreak: "break-all", color: "#000e7e" }}>{request.username}</TableCell>
                <TableCell style={{ color: "#000e7e" }}>
                  {dayjs(
                    new Date(request.requestedOn)
                    // new Date(parseInt(request.requestedOn.toString()))
                  ).format(env.REACT_APP_DATETIME_FORMAT)}
                </TableCell>
                <TableCell className="col-action">
                  <FormControl>
                    <Select
                      value={selectedAction}
                      onChange={(event) => handleActionChange(event, request)}
                      displayEmpty
                    >
                      <MenuItem value="">{getText(i18nKeys.REQUEST_PANEL__SELECT_ACTION)}</MenuItem>
                      <MenuItem value="approve">{getText(i18nKeys.REQUEST_PANEL__APPROVE)}</MenuItem>
                      <MenuItem value="reject">{getText(i18nKeys.REQUEST_PANEL__REJECT)}</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default RequestPanel;
