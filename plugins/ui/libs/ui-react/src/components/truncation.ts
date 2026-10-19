import { useEffect, useRef, type RefObject } from "react";

// The 1px allowance absorbs sub-pixel rounding on a fitting element.
export function isTruncated(
  el: Pick<HTMLElement, "scrollWidth" | "clientWidth">,
): boolean {
  return el.scrollWidth > el.clientWidth + 1;
}

// Sets `title` on the ref'd element while its text overflows, and removes it
// when it fits. Re-measures on resize. React counterpart of the Vue
// `vTruncationTitle` directive.
export function useTruncationTitle<
  T extends HTMLElement = HTMLElement,
>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      if (isTruncated(el)) {
        el.setAttribute("title", el.textContent?.trim() ?? "");
      } else {
        el.removeAttribute("title");
      }
    };

    sync();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  });

  return ref;
}
