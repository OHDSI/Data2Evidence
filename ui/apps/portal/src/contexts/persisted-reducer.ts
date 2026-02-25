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
  whitelist: (keyof State)[],
  whitelistBySession?: (keyof State)[]
) {
  const sessionKeys = whitelistBySession ?? [];

  const [state, dispatch] = useReducer(reducer, initialState, init);
  const prevState = usePrevious(state);

  function init(): State {
    let persisted: Partial<State> = {};

    const localState = localStorage.getItem(storageKey);
    if (localState) {
      try {
        persisted = { ...persisted, ...JSON.parse(localState) };
      } catch {
        // ignore corrupt data
      }
    }

    const sessionState = sessionStorage.getItem(storageKey);
    if (sessionState) {
      try {
        persisted = { ...persisted, ...JSON.parse(sessionState) };
      } catch {
        // ignore corrupt data
      }
    }

    return Object.keys(persisted).length > 0 ? { ...initialState, ...persisted } : initialState;
  }

  useEffect(() => {
    const stateEqual = deepEqual(prevState, state);
    if (!stateEqual) {
      if (whitelist.length > 0) {
        const stringifiedLocal = stringifyWithWhitelist(state, whitelist);
        localStorage.setItem(storageKey, stringifiedLocal);
      }
      if (sessionKeys.length > 0) {
        const stringifiedSession = stringifyWithWhitelist(state, sessionKeys);
        sessionStorage.setItem(storageKey, stringifiedSession);
      }
    }
  }, [state, whitelist, sessionKeys]);

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
