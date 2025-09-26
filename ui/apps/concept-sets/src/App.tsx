import { useCallback, useContext, useEffect, useState } from "react";
import { ThemeProvider } from "@mui/material";
import {
  ConceptSetsProvider,
  ConceptSetsDispatchContext,
} from "./context/ConceptSetsContext";
import { ACTION_TYPES } from "./context/reducers/reducer";
import { PortalProps } from "./types/portal";
import { parseJwtToken } from "./utils/jwt";
import { ConceptSets } from "./ConceptSets/ConceptSets";
import { TerminologyWithEventListener } from "./Terminology/TerminologyWithEventListener";
import { setTokenGetter } from "./axios/request";
import { theme_d2e, theme_atlas } from "./theme/theme";
import "./webcomponents/registerWebComponents";

function AppContent(props: PortalProps) {
  const dispatch = useContext(ConceptSetsDispatchContext);
  const [userId, setUserId] = useState<string | undefined>();
  const [isActiveRoute, setIsActiveRoute] = useState(
    props.isActiveRoute || false
  );

  const initializeUserId = useCallback(async () => {
    if (!userId && props.getToken) {
      const token = await props.getToken();
      if (token) {
        const payload = parseJwtToken(token);
        const sub = payload?.sub;
        if (sub) {
          setUserId(sub);
        }
      }
    }
  }, [userId, props.getToken]);

  useEffect(() => {
    initializeUserId();
  }, [initializeUserId]);

  useEffect(() => {
    if (props.getToken) {
      setTokenGetter(props.getToken);
    }
  }, [props.getToken]);

  useEffect(() => {
    dispatch({
      type: ACTION_TYPES.SET_PORTAL_DATA,
      payload: {
        userName: props.username,
        userId,
        getToken: props.getToken,
        datasetId: props.datasetId,
      },
    });
  }, [dispatch, props.username, userId, props.getToken, props.datasetId]);

  useEffect(() => {
    if (props.locale) {
      dispatch({
        type: ACTION_TYPES.CHANGE_LOCALE,
        payload: props.locale,
      });
    }
  }, [dispatch, props.locale]);

  useEffect(() => {
    setIsActiveRoute(props.isActiveRoute || false);
  }, [props.isActiveRoute]);

  useEffect(() => {
    const handleRouteChange: EventListener = (event: Event) => {
      const evt = event as CustomEvent<{ activeRoute: string }>;
      setIsActiveRoute(evt.detail.activeRoute === "/concepts");
    };

    window.addEventListener("route-change", handleRouteChange);
    return () => {
      window.removeEventListener("route-change", handleRouteChange);
    };
  }, []);

  return (
    <>
      {isActiveRoute && <ConceptSets />}
      <TerminologyWithEventListener />
    </>
  );
}

export default function App(props: PortalProps) {
  const mockGetToken = async () => {
    // Mock JWT token with sub: 'testuser'
    const mockPayload = { sub: "testuser" };
    const mockToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${btoa(
      JSON.stringify(mockPayload)
    )}.mock_signature`;
    return mockToken;
  };

  const propsWithMock = {
    ...props,
    // getToken: props.getToken || mockGetToken,
    // Using mock getToken for now for no-auth
    getToken: mockGetToken,
  };

  const theme = props.isAtlas ? theme_atlas : theme_d2e;
  return (
    <ThemeProvider theme={theme}>
      <ConceptSetsProvider>
        <AppContent {...propsWithMock} />
      </ConceptSetsProvider>
    </ThemeProvider>
  );
}
