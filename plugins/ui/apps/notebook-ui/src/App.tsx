import React, { FC, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { Snackbar } from "@portal/components";
import { PortalProps } from "./types/portal";
import {
  TranslationProvider,
  FeedbackProvider,
  ConversationHistoryProvider,
  UserProvider,
  useFeedback,
} from "./contexts";
import { setTokenProvider } from "./api";
import { setFetchTokenProvider } from "./utils/fetchRequest";
import { Starboard } from "./components/Starboard/Starboard";
import { theme } from "./theme";
import "./App.css";

const AppContent: FC<PortalProps> = (props) => {
  const { clearFeedback, getFeedback } = useFeedback();
  const feedback = getFeedback();

  return (
    <>
      <Snackbar
        type={feedback?.type}
        handleClose={() => clearFeedback()}
        message={feedback?.message}
        description={feedback?.description}
        visible={feedback?.message != null}
      />
      <Starboard
        datasetId={props.datasetId}
        userId={props.username}
        getToken={props.getToken}
        uiFilesUrl={props.uiFilesUrl || "/"}
      />
    </>
  );
};

const App: FC<PortalProps> = (props) => {
  const [customProps, setCustomProps] = useState<Partial<PortalProps>>({});

  const mergedProps = useMemo(
    () => ({ ...props, ...customProps }),
    [props, customProps]
  );

  // Initialize API and fetch token providers
  useEffect(() => {
    if (mergedProps.getToken) {
      setTokenProvider(mergedProps.getToken);
      setFetchTokenProvider(mergedProps.getToken);
    }
  }, [mergedProps.getToken]);

  useEffect(() => {
    const handlePropsChange = (event: Event) => {
      const { appId, ...newProps } = (event as CustomEvent).detail || {};
      if (appId === props.appId) {
        setCustomProps(newProps);
      }
    };

    window.addEventListener("custom-props-changed", handlePropsChange);
    return () => {
      window.removeEventListener("custom-props-changed", handlePropsChange);
    };
  }, [props.appId]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TranslationProvider locale={mergedProps.locale || "en"}>
        <FeedbackProvider>
          <ConversationHistoryProvider>
            <UserProvider
              username={mergedProps.username}
              idpUserId={mergedProps.idpUserId}
            >
              <AppContent {...mergedProps} />
            </UserProvider>
          </ConversationHistoryProvider>
        </FeedbackProvider>
      </TranslationProvider>
    </ThemeProvider>
  );
};

export default App;
