import { useEffect, useRef } from "react";

export const usePollingEffect = (
  asyncCallback: () => Promise<void>,
  dependencies = [],
  { isEnabled = true, intervalSeconds = 8, onCleanUp = () => {} } = {}
) => {
  const timeoutIdRef = useRef(null);

  useEffect(() => {
    let _stopped = false;

    (async function pollingCallback() {
      if (!isEnabled || _stopped) return;

      try {
        await asyncCallback();
      } finally {
        timeoutIdRef.current =
          !_stopped &&
          isEnabled &&
          setTimeout(pollingCallback, intervalSeconds * 1000);
      }
    })();

    return () => {
      _stopped = true;
      clearTimeout(timeoutIdRef.current);
      onCleanUp();
    };
  }, [...dependencies, intervalSeconds, isEnabled]);
};
