export const USER_ROLES = [
  'employee',
  'manager',
  'building_admin',
  'buffet_admin',
  'buffet_staff',
  'valet_admin',
  'valet_driver',
  'security',
  'visitor',
  'receptionist',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}
