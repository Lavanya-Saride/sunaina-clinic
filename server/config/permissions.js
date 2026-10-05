export const ROLES = ['ADMIN', 'CLINICIAN', 'STAFF'];

export const PERMISSIONS = {
  'appointments:view': ['ADMIN', 'CLINICIAN', 'STAFF'],
  'appointments:create': ['ADMIN', 'CLINICIAN', 'STAFF'],
  'appointments:cancel': ['ADMIN', 'CLINICIAN'],
  'payments:confirm': ['ADMIN', 'CLINICIAN'],
  'attendance:mark': ['ADMIN', 'CLINICIAN'],
  'automation:retry': ['ADMIN', 'CLINICIAN'],
  'patients:view': ['ADMIN', 'CLINICIAN', 'STAFF'],
};

export function hasPermission(role, permission) {
  return Boolean(PERMISSIONS[permission]?.includes(role));
}

export function getPermissionsForRole(role) {
  return Object.keys(PERMISSIONS).filter((permission) => hasPermission(role, permission));
}
