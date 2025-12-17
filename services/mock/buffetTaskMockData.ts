export interface BuffetTask {
  id: string;
  requestId: string;
  visitorName: string;
  company: string;
  hostName: string;
  visitDate: string;
  visitTime: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  guestCount: number;
  dietaryRequirements?: string[];
  location: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  notes?: string;
  assignedTo?: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}

const getDateString = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const getISOString = (daysOffset: number = 0, hoursOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  return date.toISOString();
};

const today = getDateString(0);
const tomorrow = getDateString(1);
const yesterday = getDateString(-1);

export const MOCK_BUFFET_TASKS: BuffetTask[] = [
  {
    id: 'buffet_001',
    requestId: 'req_015',
    visitorName: 'James Anderson',
    company: 'Global Tech Inc',
    hostName: 'Ahmed Al-Rashid',
    visitDate: today,
    visitTime: '12:30 PM',
    mealType: 'lunch',
    guestCount: 4,
    dietaryRequirements: ['Vegetarian', 'No nuts'],
    location: 'Executive Dining Room',
    status: 'pending',
    notes: 'VIP guest - prefer Saudi cuisine',
    assignedTo: 'Chef Mohammed Al-Farsi',
    assignedToId: 'staff_001',
    createdAt: getISOString(-1, 9),
    updatedAt: getISOString(-1, 9),
  },
  {
    id: 'buffet_002',
    requestId: 'req_016',
    visitorName: 'Maria Rodriguez',
    company: 'Design Studio Ltd',
    hostName: 'Fatima Al-Zahrani',
    visitDate: today,
    visitTime: '10:00 AM',
    mealType: 'breakfast',
    guestCount: 2,
    location: 'Meeting Room A',
    status: 'preparing',
    assignedTo: 'Chef Mohammed Al-Farsi',
    assignedToId: 'staff_001',
    createdAt: getISOString(-1, 8),
    updatedAt: getISOString(0, -1),
  },
  {
    id: 'buffet_003',
    requestId: 'req_017',
    visitorName: 'Liu Wei',
    company: 'Investment Partners',
    hostName: 'Sarah Johnson',
    visitDate: today,
    visitTime: '1:00 PM',
    mealType: 'lunch',
    guestCount: 6,
    dietaryRequirements: ['Halal', 'Gluten-free'],
    location: 'Conference Hall B',
    status: 'ready',
    notes: 'Important client meeting',
    assignedTo: 'Chef Mohammed Al-Farsi',
    assignedToId: 'staff_001',
    createdAt: getISOString(-1, 10),
    updatedAt: getISOString(0, 0),
  },
  {
    id: 'buffet_004',
    requestId: 'req_018',
    visitorName: 'Sophie Martin',
    company: 'Marketing Solutions',
    hostName: 'Khalid Ibrahim',
    visitDate: today,
    visitTime: '3:00 PM',
    mealType: 'snacks',
    guestCount: 8,
    location: 'Boardroom',
    status: 'pending',
    assignedTo: 'Chef Ali Hassan',
    assignedToId: 'staff_002',
    createdAt: getISOString(-1, 11),
    updatedAt: getISOString(-1, 11),
  },
  {
    id: 'buffet_005',
    requestId: 'req_019',
    visitorName: 'David Kim',
    company: 'Tech Innovations',
    hostName: 'Omar Hassan',
    visitDate: yesterday,
    visitTime: '12:00 PM',
    mealType: 'lunch',
    guestCount: 3,
    location: 'Executive Dining Room',
    status: 'served',
    assignedTo: 'Chef Ali Hassan',
    assignedToId: 'staff_002',
    createdAt: getISOString(-2, 9),
    updatedAt: getISOString(-1, 13),
  },
  {
    id: 'buffet_006',
    requestId: 'req_020',
    visitorName: 'Emily Chen',
    company: 'Finance Corp',
    hostName: 'Yusuf Al-Farsi',
    visitDate: tomorrow,
    visitTime: '11:00 AM',
    mealType: 'breakfast',
    guestCount: 5,
    dietaryRequirements: ['Vegetarian'],
    location: 'Meeting Room B',
    status: 'pending',
    notes: 'Board meeting breakfast',
    assignedTo: 'Chef Mohammed Al-Farsi',
    assignedToId: 'staff_001',
    createdAt: getISOString(0, -2),
    updatedAt: getISOString(0, -2),
  },
  {
    id: 'buffet_007',
    requestId: 'req_021',
    visitorName: 'Robert Smith',
    company: 'Consulting Group',
    hostName: 'Layla Hassan',
    visitDate: today,
    visitTime: '6:00 PM',
    mealType: 'dinner',
    guestCount: 10,
    dietaryRequirements: ['Halal'],
    location: 'Executive Dining Room',
    status: 'pending',
    notes: 'Client dinner event',
    createdAt: getISOString(0, -3),
    updatedAt: getISOString(0, -3),
  },
];

let buffetTasksState = [...MOCK_BUFFET_TASKS];

let taskIdCounter = 100;

export const getBuffetTasks = (): BuffetTask[] => {
  return [...buffetTasksState];
};

export const getBuffetTaskById = (taskId: string): BuffetTask | undefined => {
  return buffetTasksState.find((task) => task.id === taskId);
};

export const updateBuffetTaskStatus = (
  taskId: string,
  status: BuffetTask['status']
): BuffetTask | null => {
  const index = buffetTasksState.findIndex((task) => task.id === taskId);
  if (index !== -1) {
    buffetTasksState[index] = {
      ...buffetTasksState[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    return { ...buffetTasksState[index] };
  }
  return null;
};

export const assignBuffetTask = (
  taskId: string,
  staffName: string
): BuffetTask | null => {
  const index = buffetTasksState.findIndex((task) => task.id === taskId);
  if (index !== -1) {
    buffetTasksState[index] = {
      ...buffetTasksState[index],
      assignedTo: staffName,
      updatedAt: new Date().toISOString(),
    };
    return { ...buffetTasksState[index] };
  }
  return null;
};

export const createBuffetTask = (
  taskData: Omit<BuffetTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): BuffetTask => {
  const now = new Date().toISOString();
  const newTask: BuffetTask = {
    ...taskData,
    id: `buffet_${taskIdCounter++}`,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  buffetTasksState = [newTask, ...buffetTasksState];
  return { ...newTask };
};

export const getTasksByStatus = (status: BuffetTask['status']): BuffetTask[] => {
  return buffetTasksState.filter((task) => task.status === status);
};

export const getTodayTasks = (): BuffetTask[] => {
  const today = new Date().toISOString().split('T')[0];
  return buffetTasksState.filter((task) => task.visitDate === today);
};

export const getAssignedTasks = (staffName: string): BuffetTask[] => {
  return buffetTasksState.filter((task) => task.assignedTo === staffName);
};

export const getTasksByStaffId = (staffId: string): BuffetTask[] => {
  return buffetTasksState.filter((task) => task.assignedToId === staffId);
};

export const getUnassignedTasks = (): BuffetTask[] => {
  return buffetTasksState.filter((task) => !task.assignedTo);
};

export const assignTaskToStaff = (
  taskId: string,
  staffId: string,
  staffName: string
): BuffetTask | null => {
  const index = buffetTasksState.findIndex((task) => task.id === taskId);
  if (index !== -1) {
    const currentStatus = buffetTasksState[index].status;
    const newStatus = currentStatus === 'pending' ? 'preparing' : currentStatus;
    buffetTasksState[index] = {
      ...buffetTasksState[index],
      assignedTo: staffName,
      assignedToId: staffId,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    return { ...buffetTasksState[index] };
  }
  return null;
};

let currentStaffId: string | null = null;
let currentStaffName: string | null = null;

export const setCurrentStaff = (staffId: string, staffName: string): void => {
  currentStaffId = staffId;
  currentStaffName = staffName;
};

export const getCurrentStaff = (): { id: string | null; name: string | null } => {
  return { id: currentStaffId, name: currentStaffName };
};

export const getMyTasks = (): BuffetTask[] => {
  if (!currentStaffId) return [];
  return buffetTasksState.filter((task) => task.assignedToId === currentStaffId);
};

export const resetBuffetTasks = (): void => {
  buffetTasksState = [...MOCK_BUFFET_TASKS];
  taskIdCounter = 100;
};
