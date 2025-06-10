import { useState } from "react";

export const useDialogHelper = (initialValue: boolean): [boolean, () => void, () => void] => {
  const [show, setShow] = useState(initialValue);

  const open = () => {
    setShow(true);
  };

  const close = () => {
    setShow(false);
  };

  return [show, open, close];
};
