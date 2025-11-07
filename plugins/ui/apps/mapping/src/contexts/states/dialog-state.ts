export interface DialogState {
  saveMappingDialogVisible: boolean;
  loadMappingDialogVisible: boolean;
}

export const INIT_DIALOG_STATE: DialogState = {
  saveMappingDialogVisible: false,
  loadMappingDialogVisible: false,
};
