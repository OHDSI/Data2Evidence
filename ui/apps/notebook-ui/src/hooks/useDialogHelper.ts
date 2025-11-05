import { useState, useCallback } from "react";

type DialogHelperReturnType = [boolean, () => void, () => void];

/**
 * Simple hook to manage dialog open/close state
 * Returns [isOpen, openDialog, closeDialog]
 */
export const useDialogHelper = (initialState: boolean = false): DialogHelperReturnType => {
  const [isOpen, setIsOpen] = useState(initialState);

  const openDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  return [isOpen, openDialog, closeDialog];
};
