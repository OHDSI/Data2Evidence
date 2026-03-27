import { useEffect, useReducer, useRef } from "react";
import deepEqual from "fast-deep-equal/es6";

export function usePrevious(value: any) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
};

export function usePersistedReducer<State extends object, Action>(
  reducer: (state: State, action: Action) => State,
  initialState: State,
  storageKey: string,
  whitelist: string[]
) {
  const [state, dispatch] = useReducer(reducer, initialState, init);
  const prevState = usePrevious(state);

  function init(): State {
    const stringState = localStorage.getItem(storageKey);
    if (stringState) {
      try {
        const persisted = JSON.parse(stringState);
        const merged = JSON.parse(JSON.stringify(initialState));
        for (const path of whitelist) {
          const value = getNestedValue(persisted, path);
          if (value !== undefined) {
            setNestedValue(merged, path, value);
          }
        }
        return merged;
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

const stringifyWithWhitelist = (obj: any, whitelist: string[]): string => {
  const filteredObject: any = {};
  for (const path of whitelist) {
    const value = getNestedValue(obj, path);
    if (value !== undefined) {
      setNestedValue(filteredObject, path, value);
    }
  }
  return JSON.stringify(filteredObject);
};
