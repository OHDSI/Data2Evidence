import { useState, useCallback } from "react";
import { Feedback } from "../../../../../types";

interface ExecuteOptions {
  successMessage?: string;
  errorMessage?: string;
}

export function useAsyncOperation() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});

  const clearFeedback = useCallback(() => {
    setFeedback({});
  }, []);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ExecuteOptions = {}
  ): Promise<T | undefined> => {
    setFeedback({});
    setLoading(true);
    try {
      const result = await operation();
      if (options.successMessage) {
        setFeedback({ type: "success", message: options.successMessage });
      }
      return result;
    } catch (error) {
      console.error("Operation failed:", error);
      if (options.errorMessage) {
        setFeedback({ type: "error", message: options.errorMessage });
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, feedback, clearFeedback, execute, setFeedback };
}
