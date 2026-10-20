export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export interface RolePermission {
  id: number;
  code: string;
  name: string;
  action: PermissionAction;
}

export interface PermissionModule {
  code: string;
  name: string;
  icon: string;
  permissions: RolePermission[];
}

export interface ManagedRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  userCount: number;
  permissionIds: number[];
  enabledPermissionCount: number;
}

export interface RoleConfiguration {
  roles: ManagedRole[];
  modules: PermissionModule[];
}

export interface RolePayload {
  name: string;
  description?: string;
}
