import { useEffect, useRef } from "react";

export const usePollingEffect = (
  asyncCallback: () => Promise<void>,
  dependencies: any[] = [],
  {
    isEnabled = true,
    intervalSeconds = 8,
    onCleanUp = () => {
      // No-op cleanup function
    },
  } = {}
) => {
  const timeoutIdRef = useRef<any>(null);

  useEffect(() => {
    console.log("usePollingEffect");
    let _stopped = false;

    (async function pollingCallback() {
      console.log("usePollingEffect.pollingCallback", isEnabled, _stopped);
      if (!isEnabled || _stopped) return;

      try {
        await asyncCallback();
      } finally {
        timeoutIdRef.current = !_stopped && isEnabled && setTimeout(pollingCallback, intervalSeconds * 1000);
      }
    })();

    return () => {
      _stopped = true;
      clearTimeout(timeoutIdRef.current);
      onCleanUp();
    };
  }, [...dependencies, intervalSeconds, isEnabled]);
};
