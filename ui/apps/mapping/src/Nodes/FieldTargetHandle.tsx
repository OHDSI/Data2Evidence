import { useCallback, useMemo, useState } from "react";
import { CGreyIcon, CActiveIcon, CommentIcon, IconButton, TActiveIcon, TGreyIcon, Box } from "@portal/components";
import { MappingHandle, MappingHandleProps } from "./MappingHandle";
import { TransformConfigDialog } from "../Field/components/TransformConfigDialog";
import { ConstantValueDialog } from "../Field/components/ConstantValueDialog";
import { CommentDialog } from "../Field/components/CommentDialog";
import { useField } from "../contexts";
import "./FieldTargetHandle.scss";

interface FieldTargetHandleProps extends MappingHandleProps {}

export const FieldTargetHandle = (props: FieldTargetHandleProps) => {
  const [isTransformDialogOpen, setIsTransformDialogOpen] = useState(false);
  const [isConstantDialogOpen, setIsConstantDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const { edges } = useField();

  const isLinked = useMemo(
    () => edges.some((e) => e.targetHandle === `${props.data.tableName}-${props.data.label}`),
    [edges]
  );

  const handleOpenTransformDialog = useCallback(() => {
    setIsTransformDialogOpen(true);
  }, []);

  const handleCloseTransformDialog = useCallback(() => {
    setIsTransformDialogOpen(false);
  }, []);

  const handleOpenConstantDialog = useCallback(() => {
    setIsConstantDialogOpen(true);
  }, []);

  const handleCloseConstantDialog = useCallback(() => {
    setIsConstantDialogOpen(false);
  }, []);

  const handleOpenCommentDialog = useCallback(() => {
    setIsCommentDialogOpen(true);
  }, []);

  const handleCloseCommentDialog = useCallback(() => {
    setIsCommentDialogOpen(false);
  }, []);

  return (
    <>
      <MappingHandle {...props} className="field-target-handle">
        <div className="field-target-handle__content">
          <Box display="flex" gap={0.5} ml={0.5}>
            <IconButton
              startIcon={
                props.data.isSqlEnabled || props.data.isLookupEnabled ? (
                  <TActiveIcon width={18} height={18} />
                ) : (
                  <TGreyIcon width={18} height={18} />
                )
              }
              size="small"
              disableRipple
              disabled={!isLinked}
              onClick={handleOpenTransformDialog}
            />
            <IconButton
              startIcon={
                props.data.constantValue ? <CActiveIcon width={18} height={18} /> : <CGreyIcon width={18} height={18} />
              }
              size="small"
              disableRipple
              onClick={handleOpenConstantDialog}
            />
          </Box>
          <div className="field-target-handle__label">{props.data.label}</div>
          <div className="field-target-handle__column-type">{props.data.columnType}</div>
          <IconButton
            startIcon={<CommentIcon width={16} height={16} />}
            size="small"
            disableRipple
            onClick={handleOpenCommentDialog}
          />
        </div>
      </MappingHandle>
      <TransformConfigDialog open={isTransformDialogOpen} onClose={handleCloseTransformDialog} handleId={props.id} />
      <ConstantValueDialog open={isConstantDialogOpen} onClose={handleCloseConstantDialog} handleId={props.id} />
      <CommentDialog open={isCommentDialogOpen} onClose={handleCloseCommentDialog} handleId={props.id} />
    </>
  );
};
