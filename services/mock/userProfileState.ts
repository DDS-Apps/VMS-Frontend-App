import { UserRole } from "@/types/vms.types";

export interface UserProfile {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: UserRole;
  joinDate: string;
  avatarUrl?: string;
  lastUpdated: string;
}

let userProfileStore: Map<string, UserProfile> = new Map();

export const getUserProfile = (userId: string, defaultName: string, role: UserRole): UserProfile => {
  const existing = userProfileStore.get(userId);
  if (existing) {
    return existing;
  }
  
  const defaultProfile: UserProfile = {
    userId,
    employeeId: generateEmployeeId(role),
    name: defaultName,
    email: generateEmail(defaultName),
    phone: '+966 50 123 4567',
    department: getDepartmentForRole(role),
    designation: getDesignationForRole(role),
    role,
    joinDate: '2023-01-15',
    lastUpdated: new Date().toISOString(),
  };
  
  userProfileStore.set(userId, defaultProfile);
  return defaultProfile;
};

export const updateUserProfile = (userId: string, updates: Partial<Omit<UserProfile, 'userId' | 'role' | 'email' | 'designation' | 'employeeId' | 'joinDate' | 'lastUpdated'>>): UserProfile => {
  const existing = userProfileStore.get(userId);
  if (!existing) {
    throw new Error('User profile not found');
  }
  
  const updated: UserProfile = {
    ...existing,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  
  userProfileStore.set(userId, updated);
  return updated;
};

export const resetUserProfile = (userId: string): void => {
  userProfileStore.delete(userId);
};

const generateEmployeeId = (role: UserRole): string => {
  const prefixes: Record<UserRole, string> = {
    employee: 'EMP',
    manager: 'MGR',
    building_admin: 'ADM',
    buffet_admin: 'BFA',
    buffet_staff: 'BFS',
    valet_admin: 'VLA',
    valet_driver: 'VLD',
    visitor: 'VIS',
    receptionist: 'REC',
    security: 'SEC',
  };
  const prefix = prefixes[role] || 'USR';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
};

const generateEmail = (name: string): string => {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleanName}@dallah-digital.com`;
};

const getDepartmentForRole = (role: UserRole): string => {
  switch (role) {
    case 'employee':
    case 'manager':
      return 'Information Technology';
    case 'receptionist':
      return 'Front Office';
    case 'security':
      return 'Security';
    case 'buffet_admin':
    case 'buffet_staff':
      return 'Hospitality';
    case 'valet_admin':
    case 'valet_driver':
      return 'Valet Services';
    case 'building_admin':
      return 'Building Management';
    default:
      return 'General';
  }
};

const getDesignationForRole = (role: UserRole): string => {
  switch (role) {
    case 'employee':
      return 'Software Engineer';
    case 'manager':
      return 'Department Manager';
    case 'receptionist':
      return 'Front Desk Receptionist';
    case 'security':
      return 'Security Officer';
    case 'buffet_admin':
      return 'Hospitality Manager';
    case 'buffet_staff':
      return 'Hospitality Associate';
    case 'valet_admin':
      return 'Valet Services Manager';
    case 'valet_driver':
      return 'Valet Driver';
    case 'building_admin':
      return 'Building Administrator';
    default:
      return 'Staff Member';
  }
};
