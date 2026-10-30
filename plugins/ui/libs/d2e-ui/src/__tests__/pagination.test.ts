import { describe, expect, it } from "vitest";
import {
  PAGINATION_ICON_PATHS,
  PAGINATION_STYLE_MAP,
  pagerState,
  pageTarget,
} from "../components/pagination";

describe("D2ePagination style map", () => {
  it("matches the standard pagination (Figma 2755:6060)", () => {
    expect(PAGINATION_STYLE_MAP).toEqual({
      sizeSelectWidth: 90,
      sizeSelectHeight: 40,
      rangeMinWidth: 116,
      iconSize: 24,
      disabledOpacity: 0.26,
    });
  });

  it("has a glyph for each of the four buttons", () => {
    expect(Object.keys(PAGINATION_ICON_PATHS)).toEqual([
      "first",
      "previous",
      "next",
      "last",
    ]);
  });
});

describe("pagerState", () => {
  it("disables first and previous on the first page", () => {
    expect(pagerState(1, 10, 25)).toEqual({
      lastPage: 3,
      canGoBack: false,
      canGoForward: true,
    });
  });

  it("disables next and last on the last page", () => {
    expect(pagerState(3, 10, 25)).toEqual({
      lastPage: 3,
      canGoBack: true,
      canGoForward: false,
    });
  });

  it("disables all four buttons when one page holds every row", () => {
    expect(pagerState(1, 12, 2)).toEqual({
      lastPage: 1,
      canGoBack: false,
      canGoForward: false,
    });
  });

  it("disables all four buttons when there are no rows", () => {
    expect(pagerState(1, 10, 0)).toEqual({
      lastPage: 1,
      canGoBack: false,
      canGoForward: false,
    });
  });
});

describe("pageTarget", () => {
  it("returns a page inside the range that is not the current page", () => {
    expect(pageTarget(2, 1, 3)).toBe(2);
  });

  it("returns null for the current page or a page out of range", () => {
    expect(pageTarget(1, 1, 3)).toBeNull();
    expect(pageTarget(0, 1, 3)).toBeNull();
    expect(pageTarget(4, 3, 3)).toBeNull();
  });
});
