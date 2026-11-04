import { RefObject, useLayoutEffect, useState } from "react";
import { getAvailableTableHeight } from "../utils/tableHeight";

export const useAvailableHeight = (
  ref: RefObject<HTMLElement>
): number | undefined => {
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      setHeight(getAvailableTableHeight(window.innerHeight, top));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [ref]);

  return height;
};
