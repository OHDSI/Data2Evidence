import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import ReplayIcon from "@mui/icons-material/Replay";
import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from "@portal/components";
import {
  clearStatus,
  setDataflowId,
  setRevisionId,
} from "~/features/flow/reducers";
import {
  useGetDataflowByIdQuery,
  useGetDataflowsQuery,
} from "~/features/flow/slices";
import { RootState, dispatch } from "~/store";
import "./FlowListSelect.scss";

export interface FlowListSelectProps {}

export const FlowListSelect: FC<FlowListSelectProps> = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);
  const { data: dataflows } = useGetDataflowsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      data: data?.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }),
  });
  const { data: dataflow } = useGetDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });
  const revision = dataflow?.revisions?.find((r) => r.id == revisionId);

  useEffect(() => {
    if (!dataflowId && dataflows && dataflows.length > 0) {
      dispatch(setDataflowId(dataflows[0].id));
    }
  }, [dataflowId, dataflows]);

  const handleDataflowChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      dispatch(setDataflowId(e.target.value));
      dispatch(setRevisionId(undefined));
      dispatch(clearStatus());
    },
    []
  );

  const handleShowLatest = useCallback(() => {
    dispatch(setDataflowId(dataflowId));
    dispatch(setRevisionId(undefined));
    dispatch(clearStatus());
  }, [dataflowId]);

  if (!dataflows || !dataflowId) return;

  return (
    <Box display="flex" gap={1}>
      <FormControl sx={{ minWidth: "300px" }}>
        <TextField
          select
          className="flow-list-select"
          variant="outlined"
          size="small"
          value={dataflowId}
          onChange={handleDataflowChange}
        >
          {dataflows.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
              {d.id == dataflowId && (
                <span className="old-version">
                  &nbsp;{!!revisionId && `(Version #${revision.version})`}
                </span>
              )}
            </MenuItem>
          ))}
        </TextField>
      </FormControl>
      {!!revisionId && (
        <Tooltip title="Revert to latest version">
          <div>
            <IconButton
              startIcon={<ReplayIcon sx={{ width: 28, height: 30 }} />}
              onClick={handleShowLatest}
            />
          </div>
        </Tooltip>
      )}
    </Box>
  );
};
