import React from "react";
import { render, fireEvent, within } from "@testing-library/react";
import { AiAssistantDrawer } from "../AiAssistantDrawer";
import { AI_ASSISTANT_TOGGLE_EVENT, PA_LEFT_PANE_OPENED_EVENT } from "../aiAssistantEvents";
import { AppProvider } from "../../../contexts";

const renderDrawer = (onClose = jest.fn()) => {
  const utils = render(
    <AppProvider>
      <AiAssistantDrawer open onClose={onClose} />
    </AppProvider>
  );
  return { ...utils, onClose };
};

describe("AiAssistantDrawer", () => {
  it("renders the welcome state with greeting and suggestions", () => {
    const { getByText, getByTestId } = renderDrawer();

    expect(getByText("Hi, how can I help you?")).toBeInTheDocument();
    expect(getByTestId("ai-suggestion-build-cohort")).toHaveTextContent("Help me to build cohort");
  });

  it("starts a conversation when a suggestion is clicked", () => {
    const { getByTestId, queryByText } = renderDrawer();

    fireEvent.click(getByTestId("ai-suggestion-build-cohort"));

    const conversation = getByTestId("ai-assistant-conversation");
    expect(within(conversation).getByText("Help me to build cohort")).toBeInTheDocument();
    expect(within(conversation).getByText(/found a few things to clarify/i)).toBeInTheDocument();
    // Welcome greeting is gone once a conversation is active.
    expect(queryByText("Hi, how can I help you?")).not.toBeInTheDocument();
  });

  it("sends a typed message via the composer", () => {
    const { getByTestId } = renderDrawer();

    fireEvent.change(getByTestId("ai-assistant-input"), { target: { value: "Female patients over 60" } });
    fireEvent.click(getByTestId("ai-assistant-send"));

    const conversation = getByTestId("ai-assistant-conversation");
    expect(within(conversation).getByText("Female patients over 60")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const { getByTestId, onClose } = renderDrawer();

    fireEvent.click(getByTestId("ai-assistant-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // On wide viewports the panel is inset out of the page content by the CSS rule
  // `.ai-assistant--open ~ main`, so the open flag has to reach the drawer root and that root
  // has to stay a sibling of <main>.
  describe("docked layout", () => {
    const renderWithMain = (open: boolean) =>
      render(
        <AppProvider>
          <AiAssistantDrawer open={open} onClose={jest.fn()} />
          <main />
        </AppProvider>
      );

    it("marks the drawer root as open so the page content can be inset", () => {
      const { container } = renderWithMain(true);

      expect(container.querySelector(".ai-assistant--open ~ main")).toBeInTheDocument();
    });

    it("leaves the page content full width while closed", () => {
      const { container } = renderWithMain(false);

      expect(container.querySelector(".ai-assistant")).toBeInTheDocument();
      expect(container.querySelector(".ai-assistant--open ~ main")).not.toBeInTheDocument();
    });
  });

  // Plugin apps (Patient Analytics) run in this same window under single-spa and give up
  // their own side panes while the drawer is docked, coordinated over window events.
  describe("plugin pane handshake", () => {
    it("broadcasts the open state so plugins can make room", () => {
      const onToggle = jest.fn();
      window.addEventListener(AI_ASSISTANT_TOGGLE_EVENT, onToggle);

      const { rerender } = render(
        <AppProvider>
          <AiAssistantDrawer open={false} onClose={jest.fn()} />
        </AppProvider>
      );
      expect(onToggle.mock.calls.at(-1)?.[0].detail).toEqual({ open: false });

      rerender(
        <AppProvider>
          <AiAssistantDrawer open onClose={jest.fn()} />
        </AppProvider>
      );
      expect(onToggle.mock.calls.at(-1)?.[0].detail).toEqual({ open: true });
      // Readable too, for plugins that mount after the drawer was opened and missed the event.
      expect(window.__alpAiAssistantOpen).toBe(true);

      window.removeEventListener(AI_ASSISTANT_TOGGLE_EVENT, onToggle);
    });

    it("closes when a plugin re-opens the pane it gave up", () => {
      const { onClose } = renderDrawer();

      window.dispatchEvent(new CustomEvent(PA_LEFT_PANE_OPENED_EVENT));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("ignores the pane event while already closed", () => {
      const onClose = jest.fn();
      render(
        <AppProvider>
          <AiAssistantDrawer open={false} onClose={onClose} />
        </AppProvider>
      );

      window.dispatchEvent(new CustomEvent(PA_LEFT_PANE_OPENED_EVENT));

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
