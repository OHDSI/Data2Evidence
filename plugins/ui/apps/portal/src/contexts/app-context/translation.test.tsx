import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AxiosError } from "axios";
import { api } from "../../axios/api";
import { AppProvider } from "./AppContext";
import { useTranslation } from ".";

jest.mock("../../axios/api", () => ({
  api: {
    translation: {
      getTranslation: jest.fn(),
    },
  },
}));

const TestComponent = (): JSX.Element => {
  const { locale, changeLocale, getText, i18nKeys } = useTranslation();

  const onClickLocale = (locale: string) => {
    changeLocale(locale);
  };
  return (
    <div>
      <div onClick={() => onClickLocale("en")}>English</div>
      <div onClick={() => onClickLocale("es")}>Spanish</div>
      <div onClick={() => onClickLocale("fr")}>French</div>
      <div>TEST_VALUE: {getText(i18nKeys.TEST_KEY)}</div>
      <div>TEST_LOCALE: {locale}</div>
      <div>TEST</div>
    </div>
  );
};

const TestApp = (): JSX.Element => {
  return (
    <AppProvider>
      <TestComponent />
    </AppProvider>
  );
};

const customRender = (ui: JSX.Element, { providerProps, ...renderOptions }: { providerProps: any }) => {
  return render(<AppProvider {...providerProps}>{ui}</AppProvider>, renderOptions);
};

// Captures the latest hook value so tests can invoke the async API (changeLocale)
// and the synchronous reader (getTextForLocale) directly, outside of click handlers.
let latestHook: ReturnType<typeof useTranslation> | null = null;
const CaptureComponent = (): JSX.Element => {
  latestHook = useTranslation();
  return <div>TEST</div>;
};

beforeEach(() => {
  latestHook = null;
  // @ts-ignore
  api.translation.getTranslation.mockReset();
});

test("TestApp shows default value", () => {
  render(<TestApp />);
  expect(screen.getByText(/^TEST_VALUE:/)).toHaveTextContent("TEST_VALUE: default");
});

test("TestApp shows value when context is updated", async () => {
  const providerProps = {};
  customRender(<TestApp />, { providerProps });

  await waitFor(() => {
    // @ts-ignore
    api.translation.getTranslation.mockResolvedValue({ data: { TEST_KEY: "fr greeting" } }); // Mock the API response
    fireEvent.click(screen.getByText("French"));
    expect(screen.getByText(/^TEST_VALUE:/)).toHaveTextContent("TEST_VALUE: fr greeting");
    expect(screen.getByText(/^TEST_LOCALE:/)).toHaveTextContent("TEST_LOCALE: fr");
  });
  await waitFor(() => {
    // @ts-ignore
    api.translation.getTranslation.mockResolvedValue({ data: { TEST_KEY: "es greeting" } }); // Mock the API response
    fireEvent.click(screen.getByText("Spanish"));
    expect(screen.getByText(/^TEST_VALUE:/)).toHaveTextContent("TEST_VALUE: es greeting");
    expect(screen.getByText(/^TEST_LOCALE:/)).toHaveTextContent("TEST_LOCALE: es");
  });
});

test("changeLocale with { rethrow: true } rejects on non-404 errors", async () => {
  render(
    <AppProvider>
      <CaptureComponent />
    </AppProvider>
  );

  const serverError = new AxiosError("server error");
  // @ts-ignore — only status is read by changeLocale
  serverError.response = { status: 500 };
  // @ts-ignore
  api.translation.getTranslation.mockRejectedValue(serverError);

  await act(async () => {
    await expect(latestHook!.changeLocale("fr", { rethrow: true })).rejects.toThrow("server error");
  });
});

test("changeLocale without rethrow swallows non-404 errors (falls back to default)", async () => {
  render(
    <AppProvider>
      <CaptureComponent />
    </AppProvider>
  );

  const serverError = new AxiosError("server error");
  // @ts-ignore
  serverError.response = { status: 500 };
  // @ts-ignore
  api.translation.getTranslation.mockRejectedValue(serverError);

  await act(async () => {
    // Should resolve, not reject, when rethrow is not set.
    await expect(latestHook!.changeLocale("fr")).resolves.toBeUndefined();
  });
  expect(latestHook!.locale).toBe("default");
});

test("getTextForLocale resolves freshly-loaded translations and falls back to default", async () => {
  render(
    <AppProvider>
      <CaptureComponent />
    </AppProvider>
  );

  // @ts-ignore
  api.translation.getTranslation.mockResolvedValue({ data: { TEST_KEY: "fr fresh" } });

  let immediate = "";
  await act(async () => {
    await latestHook!.changeLocale("fr", { rethrow: true });
    // Read synchronously right after changeLocale resolves — before the dispatch-driven
    // re-render commits — to verify getTextForLocale sees the fresh bundle via the ref.
    immediate = latestHook!.getTextForLocale("fr", latestHook!.i18nKeys.TEST_KEY);
  });
  expect(immediate).toBe("fr fresh");

  // A locale that was never loaded falls back to the default bundle.
  expect(latestHook!.getTextForLocale("de", latestHook!.i18nKeys.TEST_KEY)).toBe("default");
});
