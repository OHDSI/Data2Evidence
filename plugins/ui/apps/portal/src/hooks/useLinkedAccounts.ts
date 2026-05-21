import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { LinkedAccount } from "../axios/linked-accounts";
import { AppError } from "../types";

export const useLinkedAccounts = () => {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | undefined>();
  const [disabled, setDisabled] = useState(false);

  const captureError = useCallback((e: unknown) => {
    const status = (e as { response?: { status?: number }; status?: number })?.response?.status
      ?? (e as { status?: number })?.status;
    if (status === 404) {
      setDisabled(true);
      return;
    }
    const message = e instanceof Error ? e.message : typeof e === "string" ? e : "Unexpected error";
    setError({ message });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setAccounts(await api.linkedAccounts.list());
      setDisabled(false);
    } catch (e) {
      captureError(e);
    } finally {
      setLoading(false);
    }
  }, [captureError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const linkPhysionet = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { url } = await api.linkedAccounts.startPhysionet();
      window.location.href = url;
    } catch (e) {
      captureError(e);
      setLoading(false);
    }
  }, [captureError]);

  const refreshPhysionet = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setAccounts(await api.linkedAccounts.refreshPhysionet());
    } catch (e) {
      captureError(e);
    } finally {
      setLoading(false);
    }
  }, [captureError]);

  const unlinkPhysionet = useCallback(async () => {
    await api.linkedAccounts.unlinkPhysionet();
    await reload();
  }, [reload]);

  return { accounts, loading, error, disabled, reload, linkPhysionet, refreshPhysionet, unlinkPhysionet };
};
