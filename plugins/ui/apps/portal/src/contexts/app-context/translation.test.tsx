import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
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
