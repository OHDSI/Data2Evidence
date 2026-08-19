import { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import {
  ConceptMappingContext,
  ConceptMappingDispatchContext,
  initialState,
} from "../Context/ConceptMappingContext";
import { ConceptMappingState } from "../types";

export function renderWithProviders(
  ui: ReactElement,
  { state = initialState }: { state?: ConceptMappingState } = {}
) {
  const dispatch = vi.fn();
  const utils = render(
    <ConceptMappingContext.Provider value={state}>
      <ConceptMappingDispatchContext.Provider value={dispatch}>
        {ui}
      </ConceptMappingDispatchContext.Provider>
    </ConceptMappingContext.Provider>
  );
  return { dispatch, ...utils };
}
