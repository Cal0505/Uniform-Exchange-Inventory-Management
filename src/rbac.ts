interface RoleRecord {
  name?: string;
  weight?: number | string;
  permissions?: unknown;
  permissionsVersion?: number;
}

const defaultPermissions = ['home', 'dashboard', 'profile', 'account'];

export const getLegacyPermissions = (weight: number): string[] => {
  const permissions = [
    ...defaultPermissions,
    'training',
    'pickers',
    'pickers_ready',
    'pickers_waiting',
    'pickers_picked',
    'inventory',
    'inventory:*',
  ];
  if (weight >= 5) permissions.push('management', 'management:*', 'admin', 'staff', 'statistics');
  if (weight >= 10) permissions.push('dev_tools');
  return permissions;
};

export function getEffectivePermissions(roles: RoleRecord[], roleName: string): string[] {
  if (roleName.toLowerCase() === 'head_dev') return ['*'];

  const currentRole = roles.find((role) => role.name?.toLowerCase() === roleName.toLowerCase());
  if (!currentRole) return [];

  const currentWeight = Number(currentRole.weight || 0);
  const permissions = new Set<string>();

  roles
    .filter((role) => role === currentRole || Number(role.weight || 0) < currentWeight)
    .forEach((role) => {
      if (Array.isArray(role.permissions)) {
        const rolePermissions = role.permissions.filter((permission): permission is string => typeof permission === 'string');
        rolePermissions.forEach((permission) => permissions.add(permission));
        if (Number(role.permissionsVersion || 0) < 2) {
          if (rolePermissions.includes('dashboard') || rolePermissions.includes('training')) permissions.add('home');
          if (rolePermissions.includes('pickers')) permissions.add('pickers:*');
          if (rolePermissions.includes('inventory')) permissions.add('inventory:*');
          if (rolePermissions.includes('management')) permissions.add('management:*');
          if (['staff', 'statistics', 'dev_tools'].some((permission) => rolePermissions.includes(permission))) permissions.add('admin');
          if (rolePermissions.includes('account')) permissions.add('profile');
        }
      } else {
        getLegacyPermissions(Number(role.weight || 0)).forEach((permission) => permissions.add(permission));
      }
    });

  return Array.from(permissions);
}