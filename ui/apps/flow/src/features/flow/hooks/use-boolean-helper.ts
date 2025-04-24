import { useState } from "react";

export const useBooleanHelper = (
  initialValue: boolean
): [boolean, () => void, () => void] => {
  const [visible, setVisible] = useState(initialValue);

  const open = () => {
    setVisible(true);
  };

  const close = () => {
    setVisible(false);
  };

  return [visible, open, close];
};
