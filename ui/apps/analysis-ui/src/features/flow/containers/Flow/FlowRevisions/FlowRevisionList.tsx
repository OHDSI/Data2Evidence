import React, { FC, useCallback } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { Box, Button, List, ListItem } from "@portal/components";
import { DataflowRevisionDto } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import {
  clearStatus,
  replaceEdges,
  replaceNodes,
  setRevisionId,
} from "~/features/flow/reducers";
import { useBooleanHelper } from "~/features/flow/hooks";
import { DeleteFlowRevisionDialog } from "./DeleteFlowRevisionDialog";
import { DuplicateFlowRevisionDialog } from "./DuplicateFlowRevisionDialog";
import "./FlowRevisionList.scss";

export interface RevisionItemProps {
  revisions: DataflowRevisionDto[];
  onAfterView?: () => void;
}

export const FlowRevisionList: FC<RevisionItemProps> = ({
  revisions,
  onAfterView,
}) => {
  const [duplicateDlgVisible, openDuplicateDlg, closeDuplicateDlg] =
    useBooleanHelper(false);
  const [deleteDlgVisible, openDeleteDlg, closeDeleteDlg] =
    useBooleanHelper(false);
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);

  const handleView = useCallback(
    (revisionId: string) => {
      const index = revisions.findIndex((r) => r.id === revisionId);
      const isLatest = index === 0;
      if (index >= 0) {
        const revision = revisions[index];
        dispatch(setRevisionId(isLatest ? undefined : revisionId));
        dispatch(replaceNodes(revision.flow.nodes));
        dispatch(replaceEdges(revision.flow.edges));
        dispatch(clearStatus());
      }
      typeof onAfterView === "function" && onAfterView();
    },
    [dataflowId, revisions]
  );

  const handleDuplicate = useCallback(
    (revisionId: string) => {
      dispatch(setRevisionId(revisionId));
      openDuplicateDlg();
    },
    [openDuplicateDlg]
  );

  const handleDelete = useCallback(
    (revisionId: string) => {
      dispatch(setRevisionId(revisionId));
      openDeleteDlg();
    },
    [openDeleteDlg]
  );

  return (
    <>
      <List className="flow-revision-list">
        {revisions?.map((item: DataflowRevisionDto) => (
          <React.Fragment key={item.id}>
            <ListItem className="flow-revision-item">
              <Box display="flex" flexDirection="column" flex="1">
                <Box display="flex" gap={1}>
                  <Box display="flex" flexDirection="column" flex="1">
                    <div className="flow-revision-item__version">
                      Version #{item.version}
                    </div>
                    <div className="flow-revision-item__audit">
                      {dayjs(item.createdDate).format("DD MMM YYYY h:mm:ss a")}
                    </div>
                  </Box>
                  <Box
                    display="flex"
                    gap={1}
                    className="flow-revision-item__actions"
                  >
                    <Button
                      text="View"
                      variant="text"
                      onClick={() => handleView(item.id)}
                    />
                    <Button
                      text="Duplicate"
                      variant="text"
                      onClick={() => handleDuplicate(item.id)}
                    />
                    <Button
                      text="Delete"
                      variant="text"
                      onClick={() => handleDelete(item.id)}
                    />
                  </Box>
                </Box>
                {item.comment && true && (
                  <div className="flow-revision-item__comment">
                    <blockquote>{item.comment}</blockquote>
                  </div>
                )}
              </Box>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
      <DuplicateFlowRevisionDialog
        open={duplicateDlgVisible}
        onClose={closeDuplicateDlg}
      />
      <DeleteFlowRevisionDialog
        open={deleteDlgVisible}
        onClose={closeDeleteDlg}
      />
    </>
  );
};
