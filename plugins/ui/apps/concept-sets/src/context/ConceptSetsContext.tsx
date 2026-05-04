import { FC, createContext, useReducer, Dispatch } from "react";
import { ConceptSetsProviderProps, AppState } from "../types";
import { reducer, DispatchType } from "./reducers/reducer";
import { i18nDefault, portalDefault } from "./state";

export const initialState: AppState = {
  feedback: undefined,
  translation: {
    locale: "default",
    translations: i18nDefault,
  },
  portal: portalDefault,
};

export const ConceptSetsContext = createContext<AppState>(initialState);
export const ConceptSetsDispatchContext = createContext<Dispatch<DispatchType>>(
  () => undefined
);

export const ConceptSetsProvider: FC<ConceptSetsProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <ConceptSetsContext.Provider value={state}>
      <ConceptSetsDispatchContext.Provider value={dispatch}>
        {children}
      </ConceptSetsDispatchContext.Provider>
    </ConceptSetsContext.Provider>
  );
};
