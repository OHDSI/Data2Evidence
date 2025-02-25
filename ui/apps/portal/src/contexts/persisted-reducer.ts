import { useEffect, useReducer, useRef } from "react";
import deepEqual from "fast-deep-equal/es6";

export function usePrevious(value: any) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function usePersistedReducer<State extends object, Action>(
  reducer: (state: State, action: Action) => State,
  initialState: State,
  storageKey: string,
  whitelist: (keyof State)[]
) {
  const [state, dispatch] = useReducer(reducer, initialState, init);
  const prevState = usePrevious(state);

  function init(): State {
    const stringState = localStorage.getItem(storageKey);
    if (stringState) {
      try {
        return { ...initialState, ...JSON.parse(stringState) };
      } catch (error) {
        return initialState;
      }
    } else {
      return initialState;
    }
  }

  useEffect(() => {
    const stateEqual = deepEqual(prevState, state);
    if (!stateEqual) {
      const stringifiedState = stringifyWithWhitelist(state, whitelist);
      localStorage.setItem(storageKey, stringifiedState);
    }
  }, [state, whitelist]);

  return { state, dispatch };
}

const stringifyWithWhitelist = <State extends object>(obj: State, whitelist: (keyof State)[]): string => {
  const filteredObject: Partial<State> = {};
  for (const key of whitelist) {
    if (obj.hasOwnProperty(key)) {
      filteredObject[key] = obj[key];
    }
  }
  return JSON.stringify(filteredObject);
};
