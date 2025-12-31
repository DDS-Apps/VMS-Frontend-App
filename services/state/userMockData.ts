/**
 * User Mock Data Management
 * Provides user data for the VMS admin functions
 */

import { UserRole } from '@/types/vms.types';

export interface User {
  id: string;
  email: string;
  fullName: string;
  fullNameAr?: string;
  phone?: string;
  role: UserRole;
  department?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

let users: User[] = [
  {
    id: 'usr-001',
    email: 'ahmed.rashid@skbc.com',
    fullName: 'Ahmed Al-Rashid',
    fullNameAr: 'أحمد الراشد',
    phone: '+966501111111',
    role: 'employee',
    department: 'Engineering',
    status: 'active',
    createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'usr-002',
    email: 'sara.qahtani@skbc.com',
    fullName: 'Sara Al-Qahtani',
    fullNameAr: 'سارة القحطاني',
    phone: '+966502222222',
    role: 'employee',
    department: 'Marketing',
    status: 'active',
    createdAt: new Date(Date.now() - 300 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'mgr-001',
    email: 'khalid.fahad@skbc.com',
    fullName: 'Khalid Al-Fahad',
    fullNameAr: 'خالد الفهد',
    phone: '+966503333333',
    role: 'manager',
    department: 'Engineering',
    status: 'active',
    createdAt: new Date(Date.now() - 500 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'mgr-002',
    email: 'nora.harbi@skbc.com',
    fullName: 'Nora Al-Harbi',
    fullNameAr: 'نورة الحربي',
    phone: '+966504444444',
    role: 'manager',
    department: 'Marketing',
    status: 'active',
    createdAt: new Date(Date.now() - 400 * 86400000).toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'rec-001',
    email: 'mariam.ali@skbc.com',
    fullName: 'Mariam Ali',
    fullNameAr: 'مريم علي',
    phone: '+966505555555',
    role: 'receptionist',
    department: 'Administration',
    status: 'active',
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'rec-002',
    email: 'fatima.omar@skbc.com',
    fullName: 'Fatima Omar',
    fullNameAr: 'فاطمة عمر',
    phone: '+966506666666',
    role: 'receptionist',
    department: 'Administration',
    status: 'active',
    createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'sec-001',
    email: 'abdullah.security@skbc.com',
    fullName: 'Abdullah Al-Zahrani',
    fullNameAr: 'عبدالله الزهراني',
    phone: '+966507777777',
    role: 'security',
    department: 'Security',
    status: 'active',
    createdAt: new Date(Date.now() - 600 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'sec-002',
    email: 'sultan.security@skbc.com',
    fullName: 'Sultan Al-Mutairi',
    fullNameAr: 'سلطان المطيري',
    phone: '+966508888888',
    role: 'security',
    department: 'Security',
    status: 'active',
    createdAt: new Date(Date.now() - 450 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'sec-003',
    email: 'omar.security@skbc.com',
    fullName: 'Omar Al-Ghamdi',
    fullNameAr: 'عمر الغامدي',
    phone: '+966509999999',
    role: 'security',
    department: 'Security',
    status: 'inactive',
    createdAt: new Date(Date.now() - 700 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'valet-admin-001',
    email: 'rashid.valet@skbc.com',
    fullName: 'Rashid Al-Dosari',
    fullNameAr: 'راشد الدوسري',
    phone: '+966510000000',
    role: 'valet_admin',
    department: 'Valet Services',
    status: 'active',
    createdAt: new Date(Date.now() - 250 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'valet-driver-001',
    email: 'hassan.driver@skbc.com',
    fullName: 'Hassan Al-Otaibi',
    fullNameAr: 'حسن العتيبي',
    phone: '+966511111111',
    role: 'valet_driver',
    department: 'Valet Services',
    status: 'active',
    createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'valet-driver-002',
    email: 'yasser.driver@skbc.com',
    fullName: 'Yasser Al-Shehri',
    fullNameAr: 'ياسر الشهري',
    phone: '+966512222222',
    role: 'valet_driver',
    department: 'Valet Services',
    status: 'active',
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 1500000).toISOString(),
  },
  {
    id: 'buffet-admin-001',
    email: 'hana.buffet@skbc.com',
    fullName: 'Hana Al-Qahtani',
    fullNameAr: 'هنا القحطاني',
    phone: '+966513333333',
    role: 'buffet_admin',
    department: 'Catering',
    status: 'active',
    createdAt: new Date(Date.now() - 280 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'buffet-staff-001',
    email: 'aisha.buffet@skbc.com',
    fullName: 'Aisha Al-Harbi',
    fullNameAr: 'عائشة الحربي',
    phone: '+966514444444',
    role: 'buffet_staff',
    department: 'Catering',
    status: 'active',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'buffet-staff-002',
    email: 'noura.buffet@skbc.com',
    fullName: 'Noura Al-Shamsi',
    fullNameAr: 'نورة الشمسي',
    phone: '+966515555555',
    role: 'buffet_staff',
    department: 'Catering',
    status: 'active',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'building-admin-001',
    email: 'faisal.admin@skbc.com',
    fullName: 'Faisal Al-Naimi',
    fullNameAr: 'فيصل النعيمي',
    phone: '+966516666666',
    role: 'building_admin',
    department: 'Administration',
    status: 'active',
    createdAt: new Date(Date.now() - 800 * 86400000).toISOString(),
    lastLogin: new Date().toISOString(),
  },
];

export const getUsers = (): User[] => {
  return [...users];
};

export const getUsersByRole = (role: UserRole | UserRole[]): User[] => {
  const roles = Array.isArray(role) ? role : [role];
  return users.filter(u => roles.includes(u.role));
};

export const getUserById = (id: string): User | undefined => {
  return users.find(u => u.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

export const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
  const newUser: User = {
    ...userData,
    id: `usr-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  users = [...users, newUser];
  return newUser;
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  
  const updated = {
    ...users[index],
    ...updates,
  };
  users = users.map(u => u.id === userId ? updated : u);
  return updated;
};

export const deleteUser = (userId: string): boolean => {
  const initialLength = users.length;
  users = users.filter(u => u.id !== userId);
  return users.length < initialLength;
};

export const toggleUserStatus = (userId: string): User | null => {
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  
  return updateUser(userId, {
    status: user.status === 'active' ? 'inactive' : 'active',
  });
};

export const resetUsers = () => {
  users = [];
};
