import { useState, useEffect, useRef } from "react";
import { createSession } from "../api/client";

const SESSION_KEY = "d2e_ai_session_id";

interface SessionState {
  sessionId: string | null;
  loading: boolean;
  error: string | null;
  resetSession: () => void;
}

/**
 * Manages the ai-assistant session lifecycle.
 *
 * - Reads a persisted sessionId from sessionStorage on mount.
 * - Creates a new session via POST /ai-assistant/sessions when none exists.
 * - Resets and recreates the session if the datasetId changes.
 * - Stores the sessionId in sessionStorage so a page reload restores it
 *   (the backend TTL governs whether the session is still valid).
 */
export function useAiAssistantSession(datasetId: string | undefined): SessionState {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Eagerly read from sessionStorage to avoid a flash on first render
    return sessionStorage.getItem(SESSION_KEY);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevDatasetId = useRef<string | undefined>(undefined);

  const resetSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setError(null);
  };

  useEffect(() => {
    if (!datasetId) return;

    // Dataset switched → discard old session
    if (prevDatasetId.current !== undefined && prevDatasetId.current !== datasetId) {
      sessionStorage.removeItem(SESSION_KEY);
      setSessionId(null);
    }
    prevDatasetId.current = datasetId;

    // Already have a session for this dataset
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      if (stored !== sessionId) setSessionId(stored);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    createSession(datasetId)
      .then((session) => {
        if (cancelled) return;
        sessionStorage.setItem(SESSION_KEY, session.sessionId);
        setSessionId(session.sessionId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to create session";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  return { sessionId, loading, error, resetSession };
}
