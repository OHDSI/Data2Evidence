import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { Text } from "../Text";

const writeText = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  // navigator.clipboard is non-writable in jsdom by default, so it must be
  // redefined rather than assigned — same pattern used in
  // apps/vue-mri-ui-lib/src/utils/__tests__/CohortUrlCodec.test.ts.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    writable: true,
    configurable: true,
  });
});

function getCopyButton(container: HTMLElement) {
  const button = container.querySelector(".alp-text__copy-button-container button");
  if (!button) throw new Error("copy button not found");
  return button as HTMLButtonElement;
}

// Both CopyIcon and CheckIcon render their meaningful path with fill="navy" —
// CheckIcon also renders an unfilled background rect path, so this selector
// (not a plain "svg path") is what actually distinguishes the two icons.
function getIconPathData(button: HTMLButtonElement) {
  return button.querySelector('svg path[fill="navy"]')?.getAttribute("d") ?? "";
}

const COPY_ICON_PATH_PREFIX = "M20 8a3";
const CHECK_ICON_PATH_PREFIX = "M5.25 9.45";

it("shows a 'Copy' tooltip on hover", async () => {
  const { container } = render(
    <Text textFormat="wrap" showCopy>
      hello world
    </Text>
  );

  fireEvent.mouseOver(getCopyButton(container));

  const tooltip = await screen.findByRole("tooltip");
  expect(tooltip).toHaveTextContent("Copy");
});

it("copies the text and swaps to the check icon on click, reverting after 3s", () => {
  jest.useFakeTimers();
  const { container } = render(
    <Text textFormat="wrap" showCopy>
      hello world
    </Text>
  );
  const button = getCopyButton(container);
  expect(getIconPathData(button)).toContain(COPY_ICON_PATH_PREFIX);

  fireEvent.click(button);

  expect(writeText).toHaveBeenCalledWith("hello world");
  expect(getIconPathData(button)).toContain(CHECK_ICON_PATH_PREFIX);

  act(() => {
    jest.advanceTimersByTime(2999);
  });
  expect(getIconPathData(button)).toContain(CHECK_ICON_PATH_PREFIX);

  act(() => {
    jest.advanceTimersByTime(1);
  });
  expect(getIconPathData(button)).toContain(COPY_ICON_PATH_PREFIX);

  jest.useRealTimers();
});

it("restarts the 3s window on a repeated click instead of reverting early", () => {
  jest.useFakeTimers();
  const { container } = render(
    <Text textFormat="wrap" showCopy>
      hello world
    </Text>
  );
  const button = getCopyButton(container);

  fireEvent.click(button);
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(getIconPathData(button)).toContain(CHECK_ICON_PATH_PREFIX);

  fireEvent.click(button);
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  // 4000ms since the first click, but only 2000ms since the second — must still show the check icon.
  expect(getIconPathData(button)).toContain(CHECK_ICON_PATH_PREFIX);

  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(getIconPathData(button)).toContain(COPY_ICON_PATH_PREFIX);

  jest.useRealTimers();
});

it("clears the pending reset timeout on unmount without a React act warning", () => {
  jest.useFakeTimers();
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const { container, unmount } = render(
    <Text textFormat="wrap" showCopy>
      hello world
    </Text>
  );

  fireEvent.click(getCopyButton(container));
  unmount();

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
  jest.useRealTimers();
});
