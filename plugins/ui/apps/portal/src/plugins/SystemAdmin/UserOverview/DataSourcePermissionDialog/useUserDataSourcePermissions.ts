import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../../axios/api";
import { Roles, STUDY_ROLES } from "../../../../config";
import { useUser } from "../../../../contexts";
import { Study, UserWithRolesInfoExt } from "../../../../types";

export type AccessStatus = "pending" | "access";

export interface DataSourcePermissionRow {
  key: string;
  studyId: string;
  tenantId: string;
  name: string;
  role: string;
  roleLabel: string;
  status: AccessStatus;
  request?: { id: string; userId: string; groupId: string };
}

export const useUserDataSourcePermissions = (user?: UserWithRolesInfoExt) => {
  const { user: ctxUser, setUserGroup } = useUser();
  const [datasets, setDatasets] = useState<Study[]>([]);
  const [rows, setRows] = useState<DataSourcePermissionRow[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoadedUserId(undefined);
    setError(false);
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [allDatasets, groups, requests] = await Promise.all([
          api.systemPortal.getDatasets("systemAdmin", undefined, new URLSearchParams()),
          api.userMgmt.getUserStudyRoles(user.username),
          api.userMgmt.getUserStudyAccessRequests(user.userId),
        ]);
        const byId = new Map(allDatasets.map((d) => [d.id, d]));
        const toRow = (
          studyId: string,
          role: string,
          status: AccessStatus,
          tenantId?: string | null
        ): DataSourcePermissionRow => {
          const dataset = byId.get(studyId);
          return {
            key: `${status}-${studyId}-${role}`,
            studyId,
            tenantId: tenantId || dataset?.tenant?.id || "",
            name: dataset?.studyDetail?.name || studyId,
            role,
            roleLabel: STUDY_ROLES[role] ?? role,
            status,
          };
        };

        const accessRows = groups
          .filter((g) => g.studyId && Object.keys(STUDY_ROLES).includes(g.role))
          .map((g) => toRow(g.studyId as string, g.role, "access", g.tenantId));
        const accessKeys = new Set(accessRows.map((r) => `${r.studyId}-${r.role}`));
        const pendingRows = requests
          .filter((r) => !accessKeys.has(`${r.studyId}-${r.role}`))
          .map((r) => ({
            ...toRow(r.studyId, r.role, "pending", r.tenantId),
            request: { id: r.id, userId: r.userId, groupId: r.groupId },
          }));

        if (cancelled) return;
        setDatasets(allDatasets);
        setRows([...pendingRows, ...accessRows]);
      } catch (err) {
        if (cancelled) return;
        console.error("Error when loading data source permissions", err);
        setRows([]);
        setError(true);
      }
      setLoadedUserId(user.userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loading = user != null && loadedUserId !== user.userId;

  const refreshOwnGroups = useCallback(async () => {
    if (user?.userId === ctxUser.userId && ctxUser.idpUserId) {
      const userGroups = await api.userMgmt.getUserGroupList(ctxUser.idpUserId);
      setUserGroup(ctxUser.idpUserId, userGroups);
    }
  }, [user, ctxUser, setUserGroup]);

  const approve = useCallback(
    async (row: DataSourcePermissionRow) => {
      if (!row.request) return;
      const { id, userId, groupId } = row.request;
      await api.userMgmt.handleStudyAccessRequest("approve", id, userId, groupId);
      setRows((prev) =>
        prev.map((r) =>
          r.key === row.key ? { ...r, key: `access-${r.studyId}-${r.role}`, status: "access", request: undefined } : r
        )
      );
      await refreshOwnGroups();
    },
    [refreshOwnGroups]
  );

  const reject = useCallback(async (row: DataSourcePermissionRow) => {
    if (!row.request) return;
    const { id, userId, groupId } = row.request;
    await api.userMgmt.handleStudyAccessRequest("reject", id, userId, groupId);
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  }, []);

  const revoke = useCallback(
    async (row: DataSourcePermissionRow) => {
      if (!user) return;
      await api.userMgmt.withdrawStudyRoles(user.userId, row.tenantId, row.studyId, [row.role]);
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      await refreshOwnGroups();
    },
    [user, refreshOwnGroups]
  );

  const add = useCallback(
    async (dataset: Study) => {
      if (!user) return;
      const role = Roles.STUDY_RESEARCHER;
      await api.userMgmt.registerStudyRoles([user.userId], dataset.tenant.id, dataset.id, [role]);
      setRows((prev) => [
        ...prev.filter((r) => !(r.studyId === dataset.id && r.role === role)),
        {
          key: `access-${dataset.id}-${role}`,
          studyId: dataset.id,
          tenantId: dataset.tenant.id,
          name: dataset.studyDetail?.name || dataset.id,
          role,
          roleLabel: STUDY_ROLES[role] ?? role,
          status: "access",
        },
      ]);
      await refreshOwnGroups();
    },
    [user, refreshOwnGroups]
  );

  const assignableDatasets = useMemo(() => {
    const assigned = new Set(rows.filter((r) => r.status === "access").map((r) => r.studyId));
    return datasets.filter((d) => !assigned.has(d.id));
  }, [datasets, rows]);

  return { rows, loading, error, assignableDatasets, approve, reject, revoke, add };
};
