import React, { FC, useCallback } from "react";
import { Tenant } from "../../../types";

interface FilterProps {
  tenant: Tenant;
  checked: boolean;
  onChange: (tenantId: string, checked: boolean) => void;
}

export const TenantFilter: FC<FilterProps> = ({ tenant, checked, onChange }) => {
  const handleCheck = useCallback(() => {
    onChange(tenant.id, !checked);
  }, [onChange, tenant.id, checked]);

  return (
    <div className="checkbox" onClick={handleCheck}>
      <input type="checkbox" value={tenant.id} checked={checked} onChange={handleCheck} />
      <label>{tenant.name}</label>
      <br />
    </div>
  );
};
