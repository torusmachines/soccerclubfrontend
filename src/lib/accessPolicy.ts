export type UserRole = 'Admin' | 'Player' | 'Scout';

export type Permission =
  | 'dashboard:view'
  | 'clubs:view'
  | 'clubs:manage'
  | 'players:view'
  | 'players:manage'
  | 'scouts:view'
  | 'scouts:manage'
  | 'tasks:view'
  | 'tasks:manage'
  | 'templates:view'
  | 'templates:manage'
  | 'matching:view'
  | 'commercial:view';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: [
    'dashboard:view',
    'clubs:view',
    'clubs:manage',
    'players:view',
    'players:manage',
    'scouts:view',
    'scouts:manage',
    'tasks:view',
    'tasks:manage',
    'templates:view',
    'templates:manage',
    'matching:view',
    'commercial:view',
  ],
  Player: [
    'dashboard:view',
    'players:view',
    'players:manage',
    'scouts:view',
    'tasks:view',
  ],
  Scout: [
    'dashboard:view',
    'clubs:view',
    'players:view',
    'scouts:view',
    'tasks:view',
    'matching:view',
  ],
};

export const normalizeRole = (role?: string | null): UserRole | null => {
  if (role === 'Admin' || role === 'Player' || role === 'Scout') {
    return role;
  }
  return null;
};

export const hasPermission = (role: string | null | undefined, permission: Permission): boolean => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  return ROLE_PERMISSIONS[normalizedRole].includes(permission);
};

export const isPlayerRole = (role: string | null | undefined): boolean => normalizeRole(role) === 'Player';

export const isScoutRole = (role: string | null | undefined): boolean => normalizeRole(role) === 'Scout';

export const isAdminRole = (role: string | null | undefined): boolean => normalizeRole(role) === 'Admin';

export const normalizeName = (value: string | null | undefined): string =>
  (value || '').trim().toLowerCase();
