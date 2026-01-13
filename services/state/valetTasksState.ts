import { ValetDriver, ValetService } from '@/types/vms.types';

export interface EmployeeValetTask {
  id: string;
  employeeId: string;
  employeeName: string;
  vehicleInfo: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
  };
  dropOffLocation: string;
  requestedReturnTime: string;
  valet: ValetService;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValetTask {
  id: string;
  requestId: string;
  visitorName: string;
  visitorCompany: string;
  hostName: string;
  visitDate: string;
  pickupTime: string;
  returnTime: string;
  location: string;
  valet: ValetService;
  vehicleInfo?: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_VALET_DRIVERS: ValetDriver[] = [
  {
    id: 'driver_001',
    name: 'Mohammed Saleh',
    phone: '+966-50-234-5678',
    status: 'available',
    currentTasks: 2,
  },
  {
    id: 'driver_002',
    name: 'Ahmed Al-Rashid',
    phone: '+966-50-345-6789',
    status: 'busy',
    currentTasks: 4,
  },
  {
    id: 'driver_003',
    name: 'Khalid Ibrahim',
    phone: '+966-50-456-7890',
    status: 'available',
    currentTasks: 1,
  },
  {
    id: 'driver_004',
    name: 'Omar Hassan',
    phone: '+966-50-567-8901',
    status: 'busy',
    currentTasks: 3,
  },
  {
    id: 'driver_005',
    name: 'Youssef Al-Mansour',
    phone: '+966-50-678-9012',
    status: 'off_duty',
    currentTasks: 0,
  },
  {
    id: 'driver_006',
    name: 'Faisal Al-Qahtani',
    phone: '+966-50-789-0123',
    status: 'available',
    currentTasks: 0,
  },
];

export const MOCK_VALET_TASKS: ValetTask[] = [
  {
    id: 'task_001',
    requestId: 'req_001',
    visitorName: 'Michael Chen',
    visitorCompany: 'Tech Solutions Ltd',
    hostName: 'Sarah Johnson',
    visitDate: '2025-11-25',
    pickupTime: '2:00 PM',
    returnTime: '4:00 PM',
    location: 'SKBC Main Entrance',
    valet: {
      id: 'valet_001',
      driver: MOCK_VALET_DRIVERS[0],
      pickupTime: '2:00 PM',
      returnTime: '4:00 PM',
      status: 'assigned',
    },
    vehicleInfo: {
      make: 'Toyota',
      model: 'Camry',
      color: 'Silver',
      plateNumber: 'ABC 1234',
    },
    notes: 'VIP visitor - handle with care',
    createdAt: '2025-11-18T08:00:00Z',
    updatedAt: '2025-11-18T09:00:00Z',
  },
  {
    id: 'task_002',
    requestId: 'req_008',
    visitorName: 'Yuki Tanaka',
    visitorCompany: 'Asia Tech Solutions',
    hostName: 'Sarah Johnson',
    visitDate: '2025-11-24',
    pickupTime: '2:00 PM',
    returnTime: '4:00 PM',
    location: 'SKBC Main Entrance',
    valet: {
      id: 'valet_003',
      pickupTime: '2:00 PM',
      returnTime: '4:00 PM',
      status: 'pending',
    },
    notes: 'Product demonstration visit',
    createdAt: '2025-11-19T10:00:00Z',
    updatedAt: '2025-11-19T10:00:00Z',
  },
  {
    id: 'task_003',
    requestId: 'req_003',
    visitorName: 'Fatima Al-Zahrani',
    visitorCompany: 'Emirates Consulting',
    hostName: 'David Lee',
    visitDate: '2025-11-25',
    pickupTime: '11:00 AM',
    returnTime: '1:00 PM',
    location: 'SKBC Main Entrance',
    valet: {
      id: 'valet_004',
      driver: MOCK_VALET_DRIVERS[1],
      pickupTime: '11:00 AM',
      returnTime: '1:00 PM',
      status: 'in_progress',
    },
    vehicleInfo: {
      make: 'BMW',
      model: 'X5',
      color: 'Black',
      plateNumber: 'XYZ 5678',
    },
    notes: 'Consulting session - Important client',
    createdAt: '2025-11-18T08:45:00Z',
    updatedAt: '2025-11-24T10:30:00Z',
  },
  {
    id: 'task_004',
    requestId: 'req_009',
    visitorName: 'Robert Thompson',
    visitorCompany: 'Global Ventures Inc',
    hostName: 'John Smith',
    visitDate: '2025-11-24',
    pickupTime: '9:00 AM',
    returnTime: '11:00 AM',
    location: 'SKBC Main Entrance',
    valet: {
      id: 'valet_005',
      driver: MOCK_VALET_DRIVERS[2],
      pickupTime: '9:00 AM',
      returnTime: '11:00 AM',
      status: 'completed',
    },
    vehicleInfo: {
      make: 'Mercedes',
      model: 'E-Class',
      color: 'White',
      plateNumber: 'DEF 9012',
    },
    createdAt: '2025-11-23T15:00:00Z',
    updatedAt: '2025-11-24T11:00:00Z',
  },
  {
    id: 'task_005',
    requestId: 'req_010',
    visitorName: 'Elena Rodriguez',
    visitorCompany: 'Innovate Corp',
    hostName: 'Michael Brown',
    visitDate: '2025-11-25',
    pickupTime: '3:00 PM',
    returnTime: '5:00 PM',
    location: 'SKBC Main Entrance',
    valet: {
      id: 'valet_006',
      pickupTime: '3:00 PM',
      returnTime: '5:00 PM',
      status: 'pending',
    },
    createdAt: '2025-11-20T14:00:00Z',
    updatedAt: '2025-11-20T14:00:00Z',
  },
  {
    id: 'task_006',
    requestId: 'req_011',
    visitorName: 'Hassan Al-Otaibi',
    visitorCompany: 'Saudi Tech Partners',
    hostName: 'Lisa Chen',
    visitDate: '2025-11-25',
    pickupTime: '10:00 AM',
    returnTime: '12:00 PM',
    location: 'SKBC Main Entrance',
    valet: {
      id: 'valet_007',
      driver: MOCK_VALET_DRIVERS[3],
      pickupTime: '10:00 AM',
      returnTime: '12:00 PM',
      status: 'assigned',
    },
    vehicleInfo: {
      make: 'Lexus',
      model: 'LS 500',
      color: 'Dark Blue',
      plateNumber: 'GHI 3456',
    },
    notes: 'Partnership discussion meeting',
    createdAt: '2025-11-19T11:00:00Z',
    updatedAt: '2025-11-20T08:00:00Z',
  },
  {
    id: 'task_007',
    requestId: 'req_012',
    visitorName: 'Jennifer Park',
    visitorCompany: 'Seoul Investments',
    hostName: 'Sarah Johnson',
    visitDate: '2025-11-24',
    pickupTime: '1:00 PM',
    returnTime: '3:00 PM',
    location: 'SKBC Main Entrance',
    valet: {
      id: 'valet_008',
      driver: MOCK_VALET_DRIVERS[0],
      pickupTime: '1:00 PM',
      returnTime: '3:00 PM',
      status: 'completed',
    },
    vehicleInfo: {
      make: 'Audi',
      model: 'A6',
      color: 'Gray',
      plateNumber: 'JKL 7890',
    },
    createdAt: '2025-11-23T10:00:00Z',
    updatedAt: '2025-11-24T15:00:00Z',
  },
];

let valetTasksState = [...MOCK_VALET_TASKS];

export const getValetTasks = (): ValetTask[] => {
  return [...valetTasksState];
};

export const getValetTaskById = (taskId: string): ValetTask | undefined => {
  return valetTasksState.find((task) => task.id === taskId);
};

export const updateValetTask = (taskId: string, updates: Partial<ValetTask>): ValetTask | null => {
  const index = valetTasksState.findIndex((task) => task.id === taskId);
  if (index !== -1) {
    valetTasksState[index] = {
      ...valetTasksState[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return valetTasksState[index];
  }
  return null;
};

export const assignDriverToTask = (
  taskId: string,
  driverId: string
): ValetTask | null => {
  const driver = MOCK_VALET_DRIVERS.find((d) => d.id === driverId);
  if (!driver) return null;

  const task = valetTasksState.find((t) => t.id === taskId);
  if (!task) return null;

  return updateValetTask(taskId, {
    valet: {
      ...task.valet,
      driver: { ...driver },
      status: 'assigned',
    },
  });
};

export const updateTaskStatus = (
  taskId: string,
  status: ValetService['status']
): ValetTask | null => {
  const task = valetTasksState.find((t) => t.id === taskId);
  if (!task) return null;

  return updateValetTask(taskId, {
    valet: {
      ...task.valet,
      status,
    },
  });
};

export const getAvailableDrivers = (): ValetDriver[] => {
  return MOCK_VALET_DRIVERS.filter((driver) => driver.status === 'available');
};

export const getAllDrivers = (): ValetDriver[] => {
  return MOCK_VALET_DRIVERS;
};

export const getDriverTasks = (driverId: string): ValetTask[] => {
  return [...valetTasksState.filter(
    (task) => task.valet.driver?.id === driverId
  )];
};

export const acceptTask = (taskId: string): ValetTask | null => {
  const task = valetTasksState.find((t) => t.id === taskId);
  if (!task || task.valet.status !== 'assigned') return null;
  return updateTaskStatus(taskId, 'accepted');
};

export const rejectTask = (taskId: string): ValetTask | null => {
  const task = valetTasksState.find((t) => t.id === taskId);
  if (!task || task.valet.status !== 'assigned') return null;
  return updateTaskStatus(taskId, 'rejected');
};

export const startTask = (taskId: string): ValetTask | null => {
  const task = valetTasksState.find((t) => t.id === taskId);
  if (!task || task.valet.status !== 'accepted') return null;
  return updateTaskStatus(taskId, 'in_progress');
};

export const completeTask = (taskId: string): ValetTask | null => {
  const task = valetTasksState.find((t) => t.id === taskId);
  if (!task || task.valet.status !== 'in_progress') return null;
  return updateTaskStatus(taskId, 'completed');
};

export const MOCK_EMPLOYEE_VALET_TASKS: EmployeeValetTask[] = [
  {
    id: 'emp_valet_001',
    employeeId: 'emp_001',
    employeeName: 'Sarah Johnson',
    vehicleInfo: {
      make: 'Honda',
      model: 'Accord',
      color: 'White',
      plateNumber: 'SAR 1234',
    },
    dropOffLocation: 'SKBC Main Entrance',
    requestedReturnTime: '5:00 PM',
    valet: {
      id: 'emp_val_001',
      driver: MOCK_VALET_DRIVERS[0],
      pickupTime: '8:30 AM',
      returnTime: '5:00 PM',
      status: 'in_progress',
    },
    notes: 'Daily parking request',
    createdAt: '2025-11-25T08:30:00Z',
    updatedAt: '2025-11-25T08:45:00Z',
  },
  {
    id: 'emp_valet_002',
    employeeId: 'emp_001',
    employeeName: 'Sarah Johnson',
    vehicleInfo: {
      make: 'Honda',
      model: 'Accord',
      color: 'White',
      plateNumber: 'SAR 1234',
    },
    dropOffLocation: 'SKBC Main Entrance',
    requestedReturnTime: '6:00 PM',
    valet: {
      id: 'emp_val_002',
      pickupTime: '9:00 AM',
      returnTime: '6:00 PM',
      status: 'completed',
    },
    notes: 'Late meeting today',
    createdAt: '2025-11-24T09:00:00Z',
    updatedAt: '2025-11-24T18:15:00Z',
  },
  {
    id: 'emp_valet_003',
    employeeId: 'emp_001',
    employeeName: 'Sarah Johnson',
    vehicleInfo: {
      make: 'Honda',
      model: 'Accord',
      color: 'White',
      plateNumber: 'SAR 1234',
    },
    dropOffLocation: 'SKBC Main Entrance',
    requestedReturnTime: '4:30 PM',
    valet: {
      id: 'emp_val_003',
      pickupTime: '8:00 AM',
      returnTime: '4:30 PM',
      status: 'pending',
    },
    createdAt: '2025-11-26T07:45:00Z',
    updatedAt: '2025-11-26T07:45:00Z',
  },
];

let employeeValetTasksState = [...MOCK_EMPLOYEE_VALET_TASKS];

export const getEmployeeValetTasks = (employeeId: string): EmployeeValetTask[] => {
  return employeeValetTasksState.filter((task) => task.employeeId === employeeId);
};

export const getEmployeeValetTaskById = (taskId: string): EmployeeValetTask | undefined => {
  return employeeValetTasksState.find((task) => task.id === taskId);
};

export const createEmployeeValetTask = (
  task: Omit<EmployeeValetTask, 'id' | 'createdAt' | 'updatedAt' | 'valet'>
): EmployeeValetTask => {
  const now = new Date().toISOString();
  const newId = `emp_valet_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const newTask: EmployeeValetTask = {
    ...task,
    id: newId,
    dropOffLocation: task.dropOffLocation || 'SKBC Main Entrance',
    valet: {
      id: `emp_val_${Date.now()}`,
      pickupTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      returnTime: task.requestedReturnTime,
      status: 'pending',
    },
    createdAt: now,
    updatedAt: now,
  };

  employeeValetTasksState.unshift(newTask);
  return newTask;
};

export const updateEmployeeValetTaskStatus = (
  taskId: string,
  status: ValetService['status']
): EmployeeValetTask | null => {
  const index = employeeValetTasksState.findIndex((task) => task.id === taskId);
  if (index === -1) return null;

  employeeValetTasksState[index] = {
    ...employeeValetTasksState[index],
    valet: {
      ...employeeValetTasksState[index].valet,
      status,
    },
    updatedAt: new Date().toISOString(),
  };

  return employeeValetTasksState[index];
};

export const getAllEmployeeValetTasks = (): EmployeeValetTask[] => {
  return [...employeeValetTasksState];
};

export const resetEmployeeValetTasks = () => {
  employeeValetTasksState = [...MOCK_EMPLOYEE_VALET_TASKS];
};
