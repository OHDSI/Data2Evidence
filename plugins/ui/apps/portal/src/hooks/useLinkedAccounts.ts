import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { LinkedAccount } from "../axios/linked-accounts";
import { AppError } from "../types";

export const useLinkedAccounts = () => {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | undefined>();

  const captureError = useCallback((e: unknown) => {
    const message = e instanceof Error ? e.message : typeof e === "string" ? e : "Unexpected error";
    setError({ message });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setAccounts(await api.linkedAccounts.list());
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
    const { url } = await api.linkedAccounts.startPhysionet();
    window.location.href = url;
  }, []);

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

  return { accounts, loading, error, reload, linkPhysionet, refreshPhysionet, unlinkPhysionet };
};
