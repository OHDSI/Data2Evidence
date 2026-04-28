import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducer";
import { TokenClaimState } from "../states";

export const useToken = () => {
  const { token } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setIdToken = useCallback((idToken: string) => {
    dispatch({ type: ACTION_TYPES.SET_ID_TOKEN, payload: idToken });
  }, []);

  const setIdTokenClaim = useCallback((idTokenClaim: TokenClaimState) => {
    dispatch({ type: ACTION_TYPES.SET_ID_TOKEN_CLAIM, payload: idTokenClaim });
  }, []);

  const clearToken = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_TOKEN });
  }, []);

  return { idTokenClaims: token.idTokenClaims, setIdToken, setIdTokenClaim, clearToken };
};
