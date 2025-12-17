import { UserRole } from '@/types/vms.types';

export type UserSource = 'microsoft_ad' | 'app_created';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  source: UserSource;
  autoApproval: boolean;
}

export const MOCK_USERS: User[] = [
  {
    id: 'user_001',
    name: 'Ahmed Al-Rashid',
    email: 'ahmed.alrashid@dallah.com',
    role: 'manager',
    department: 'Executive Office',
    phoneNumber: '+966 50 123 4567',
    status: 'active',
    createdAt: '2024-01-15T09:00:00Z',
    lastLogin: '2025-11-24T10:30:00Z',
    source: 'microsoft_ad',
    autoApproval: true,
  },
  {
    id: 'user_002',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@dallah.com',
    role: 'employee',
    department: 'Marketing',
    phoneNumber: '+966 50 234 5678',
    status: 'active',
    createdAt: '2024-03-10T09:00:00Z',
    lastLogin: '2025-11-24T09:45:00Z',
    source: 'microsoft_ad',
    autoApproval: false,
  },
  {
    id: 'user_003',
    name: 'Mohammed Al-Zahrani',
    email: 'mohammed.zahrani@dallah.com',
    role: 'security',
    department: 'Security',
    phoneNumber: '+966 50 345 6789',
    status: 'active',
    createdAt: '2024-02-20T09:00:00Z',
    lastLogin: '2025-11-24T07:00:00Z',
    source: 'app_created',
    autoApproval: false,
  },
  {
    id: 'user_004',
    name: 'Fatima Al-Zahrani',
    email: 'fatima.zahrani@dallah.com',
    role: 'receptionist',
    department: 'Front Desk',
    phoneNumber: '+966 50 456 7890',
    status: 'active',
    createdAt: '2024-05-01T09:00:00Z',
    lastLogin: '2025-11-24T08:15:00Z',
    source: 'app_created',
    autoApproval: false,
  },
  {
    id: 'user_005',
    name: 'Omar Hassan',
    email: 'omar.hassan@dallah.com',
    role: 'building_admin',
    department: 'Facilities',
    phoneNumber: '+966 50 567 8901',
    status: 'active',
    createdAt: '2024-01-05T09:00:00Z',
    lastLogin: '2025-11-24T11:00:00Z',
    source: 'microsoft_ad',
    autoApproval: true,
  },
  {
    id: 'user_006',
    name: 'Khalid Ibrahim',
    email: 'khalid.ibrahim@dallah.com',
    role: 'valet_admin',
    department: 'Valet Services',
    phoneNumber: '+966 50 678 9012',
    status: 'active',
    createdAt: '2024-04-12T09:00:00Z',
    lastLogin: '2025-11-24T09:00:00Z',
    source: 'app_created',
    autoApproval: false,
  },
  {
    id: 'user_007',
    name: 'Ali Mohammed',
    email: 'ali.mohammed@dallah.com',
    role: 'valet_driver',
    department: 'Valet Services',
    phoneNumber: '+966 50 789 0123',
    status: 'active',
    createdAt: '2024-06-15T09:00:00Z',
    lastLogin: '2025-11-24T08:30:00Z',
    source: 'app_created',
    autoApproval: false,
  },
  {
    id: 'user_008',
    name: 'Layla Al-Dosari',
    email: 'layla.dosari@dallah.com',
    role: 'buffet_admin',
    department: 'Catering',
    phoneNumber: '+966 50 890 1234',
    status: 'active',
    createdAt: '2024-02-28T09:00:00Z',
    lastLogin: '2025-11-24T10:00:00Z',
    source: 'app_created',
    autoApproval: false,
  },
  {
    id: 'user_009',
    name: 'Hassan Al-Qahtani',
    email: 'hassan.qahtani@dallah.com',
    role: 'buffet_staff',
    department: 'Catering',
    phoneNumber: '+966 50 901 2345',
    status: 'active',
    createdAt: '2024-07-01T09:00:00Z',
    lastLogin: '2025-11-24T07:45:00Z',
    source: 'app_created',
    autoApproval: false,
  },
  {
    id: 'user_010',
    name: 'John Smith',
    email: 'john.smith@techcorp.com',
    role: 'visitor',
    phoneNumber: '+1 555 123 4567',
    status: 'active',
    createdAt: '2025-11-20T14:00:00Z',
    source: 'app_created',
    autoApproval: false,
  },
];

let usersState = [...MOCK_USERS];

export const getUsers = (): User[] => {
  return [...usersState];
};

export const getUserById = (userId: string): User | undefined => {
  return usersState.find((user) => user.id === userId);
};

export const getUsersByRole = (role: UserRole): User[] => {
  return usersState.filter((user) => user.role === role);
};

export const addUser = (user: Omit<User, 'id' | 'createdAt'>): User => {
  const newUser: User = {
    ...user,
    id: `user_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: user.source || 'app_created',
    autoApproval: user.autoApproval || false,
  };
  usersState.push(newUser);
  return newUser;
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  const index = usersState.findIndex((user) => user.id === userId);
  if (index !== -1) {
    usersState[index] = {
      ...usersState[index],
      ...updates,
    };
    return { ...usersState[index] };
  }
  return null;
};

export const deleteUser = (userId: string): boolean => {
  const index = usersState.findIndex((user) => user.id === userId);
  if (index !== -1) {
    usersState.splice(index, 1);
    return true;
  }
  return false;
};
