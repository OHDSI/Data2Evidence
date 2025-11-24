import React, { FC, useEffect } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { PortalProps } from "./types/portal";
import {
  TranslationProvider,
  FeedbackProvider,
  ConversationHistoryProvider,
  UserProvider,
} from "./contexts";
import { setTokenProvider } from "./api";
import { setFetchTokenProvider } from "./utils/fetchRequest";
import { Starboard } from "./components/Starboard/Starboard";
import { theme } from "./theme";
import "./App.css";

const App: FC<PortalProps> = (props) => {
  // Initialize API and fetch token providers
  useEffect(() => {
    if (props.getToken) {
      setTokenProvider(props.getToken);
      setFetchTokenProvider(props.getToken);
    }
  }, [props.getToken]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TranslationProvider locale={props.locale || "en"}>
        <FeedbackProvider>
          <ConversationHistoryProvider>
            <UserProvider username={props.username}>
              <Starboard
                datasetId={props.datasetId}
                userId={props.username}
                getToken={props.getToken}
                uiFilesUrl={props.uiFilesUrl || "/"}
              />
            </UserProvider>
          </ConversationHistoryProvider>
        </FeedbackProvider>
      </TranslationProvider>
    </ThemeProvider>
  );
};

export default App;
