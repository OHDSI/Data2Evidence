import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../..";
import { ACTION_TYPES } from "../reducer";

export const usePostLoginRedirectUri = () => {
  const { postLoginRedirectUri } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setPostLoginRedirectUri = useCallback((uri: string) => {
    dispatch({ type: ACTION_TYPES.SET_POST_LOGIN_REDIRECT_URI, payload: uri });
  }, []);

  const popPostLoginRedirectUri = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_POST_LOGIN_REDIRECT_URI });
    return postLoginRedirectUri;
  }, [postLoginRedirectUri]);

  return { setPostLoginRedirectUri, popPostLoginRedirectUri };
};
