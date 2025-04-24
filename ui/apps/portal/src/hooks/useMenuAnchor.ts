import { MouseEvent, useCallback, useState } from "react";

export const useMenuAnchor = (): [any, (event: MouseEvent<HTMLElement>) => void, () => void] => {
  const [anchorEl, setAnchorEl] = useState<(EventTarget & HTMLElement) | null>(null);

  const openMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const closeMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return [anchorEl, openMenu, closeMenu];
};
