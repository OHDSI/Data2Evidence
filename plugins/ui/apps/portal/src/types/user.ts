export interface UserQuery {
  myAccount: User;
}

export interface User {
  id: string;
  name: string;
}

export interface UserWithRoles {
  userId: string | null;
  username: string;
  roles: string[];
  active?: boolean;
}

export interface UserWithRolesInfo extends UserWithRoles {
  system: string | null;
  tenantId: string | null;
  studyId: string | null;
}

export interface UserGroup {
  id: string;
  userId: string | null;
  username: string | null;
  active: boolean;
  b2cGroupId: string;
  role: string;
  tenantId: string | null;
  studyId: string | null;
}

export interface UserWithRolesInfoExt {
  userId: string;
  username: string;
  roles: string[];
  tenantId: string;
  system: string;
  active: boolean;
}
