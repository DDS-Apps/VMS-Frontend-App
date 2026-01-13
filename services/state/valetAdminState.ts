import { ValetDriver, ValetService, ParkingSlot } from '@/types/vms.types';

export interface ValetRequest {
  id: string;
  visitorName: string;
  visitorCompany: string;
  hostName: string;
  visitDate: string;
  pickupTime: string;
  returnTime: string;
  location: string;
  status: 'pending' | 'assigned' | 'parked' | 'ready_for_pickup' | 'completed' | 'cancelled';
  assignedDriver?: ValetDriver;
  parkingSlot?: string;
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

export interface ValetParkingSlot {
  id: string;
  slotNumber: string;
  zone: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  vehiclePlate?: string;
  assignedRequest?: string;
}

export interface ValetDriverExtended extends ValetDriver {
  phone: string;
  assignedTasks: number;
  completedToday: number;
  shift: string;
}

const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const getYesterday = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

export const MOCK_VALET_DRIVERS: ValetDriverExtended[] = [
  {
    id: 'driver_001',
    name: 'Mohammed Saleh',
    phone: '+966-50-234-5678',
    status: 'available',
    currentTasks: 2,
    assignedTasks: 2,
    completedToday: 5,
    shift: '8:00 AM - 4:00 PM',
  },
  {
    id: 'driver_002',
    name: 'Ahmed Al-Rashid',
    phone: '+966-50-345-6789',
    status: 'busy',
    currentTasks: 4,
    assignedTasks: 4,
    completedToday: 3,
    shift: '8:00 AM - 4:00 PM',
  },
  {
    id: 'driver_003',
    name: 'Khalid Ibrahim',
    phone: '+966-50-456-7890',
    status: 'available',
    currentTasks: 1,
    assignedTasks: 1,
    completedToday: 7,
    shift: '12:00 PM - 8:00 PM',
  },
  {
    id: 'driver_004',
    name: 'Omar Hassan',
    phone: '+966-50-567-8901',
    status: 'busy',
    currentTasks: 3,
    assignedTasks: 3,
    completedToday: 4,
    shift: '8:00 AM - 4:00 PM',
  },
  {
    id: 'driver_005',
    name: 'Youssef Al-Mansour',
    phone: '+966-50-678-9012',
    status: 'off_duty',
    currentTasks: 0,
    assignedTasks: 0,
    completedToday: 0,
    shift: '4:00 PM - 12:00 AM',
  },
  {
    id: 'driver_006',
    name: 'Faisal Al-Qahtani',
    phone: '+966-50-789-0123',
    status: 'available',
    currentTasks: 0,
    assignedTasks: 0,
    completedToday: 2,
    shift: '12:00 PM - 8:00 PM',
  },
  {
    id: 'driver_007',
    name: 'Saeed Al-Mutairi',
    phone: '+966-50-890-1234',
    status: 'off_duty',
    currentTasks: 0,
    assignedTasks: 0,
    completedToday: 6,
    shift: '8:00 AM - 4:00 PM',
  },
  {
    id: 'driver_008',
    name: 'Abdullah Al-Harbi',
    phone: '+966-50-901-2345',
    status: 'busy',
    currentTasks: 2,
    assignedTasks: 2,
    completedToday: 3,
    shift: '12:00 PM - 8:00 PM',
  },
];

export const MOCK_PARKING_SLOTS: ValetParkingSlot[] = [
  { id: 'slot_001', slotNumber: 'A-01', zone: 'Zone A - VIP', status: 'occupied', vehiclePlate: 'ABC 1234', assignedRequest: 'vr_001' },
  { id: 'slot_002', slotNumber: 'A-02', zone: 'Zone A - VIP', status: 'available' },
  { id: 'slot_003', slotNumber: 'A-03', zone: 'Zone A - VIP', status: 'reserved', assignedRequest: 'vr_002' },
  { id: 'slot_004', slotNumber: 'A-04', zone: 'Zone A - VIP', status: 'available' },
  { id: 'slot_005', slotNumber: 'B-01', zone: 'Zone B - Standard', status: 'occupied', vehiclePlate: 'XYZ 5678', assignedRequest: 'vr_003' },
  { id: 'slot_006', slotNumber: 'B-02', zone: 'Zone B - Standard', status: 'available' },
  { id: 'slot_007', slotNumber: 'B-03', zone: 'Zone B - Standard', status: 'maintenance' },
  { id: 'slot_008', slotNumber: 'B-04', zone: 'Zone B - Standard', status: 'occupied', vehiclePlate: 'DEF 9012', assignedRequest: 'vr_004' },
  { id: 'slot_009', slotNumber: 'B-05', zone: 'Zone B - Standard', status: 'available' },
  { id: 'slot_010', slotNumber: 'C-01', zone: 'Zone C - Overflow', status: 'available' },
  { id: 'slot_011', slotNumber: 'C-02', zone: 'Zone C - Overflow', status: 'available' },
  { id: 'slot_012', slotNumber: 'C-03', zone: 'Zone C - Overflow', status: 'occupied', vehiclePlate: 'GHI 3456', assignedRequest: 'vr_005' },
];

const INITIAL_VALET_REQUESTS: ValetRequest[] = [
  {
    id: 'vr_001',
    visitorName: 'Michael Chen',
    visitorCompany: 'Tech Solutions Ltd',
    hostName: 'Sarah Johnson',
    visitDate: getToday(),
    pickupTime: '9:00 AM',
    returnTime: '11:00 AM',
    location: 'SKBC Main Entrance',
    status: 'parked',
    assignedDriver: MOCK_VALET_DRIVERS[0],
    parkingSlot: 'A-01',
    vehicleInfo: {
      make: 'Toyota',
      model: 'Camry',
      color: 'Silver',
      plateNumber: 'ABC 1234',
    },
    notes: 'VIP visitor - handle with care',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr_002',
    visitorName: 'Fatima Al-Zahrani',
    visitorCompany: 'Emirates Consulting',
    hostName: 'David Lee',
    visitDate: getToday(),
    pickupTime: '10:30 AM',
    returnTime: '1:00 PM',
    location: 'SKBC Main Entrance',
    status: 'assigned',
    assignedDriver: MOCK_VALET_DRIVERS[1],
    parkingSlot: 'A-03',
    vehicleInfo: {
      make: 'BMW',
      model: 'X5',
      color: 'Black',
      plateNumber: 'XYZ 5678',
    },
    notes: 'Important client meeting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr_003',
    visitorName: 'Robert Thompson',
    visitorCompany: 'Global Ventures Inc',
    hostName: 'John Smith',
    visitDate: getToday(),
    pickupTime: '11:00 AM',
    returnTime: '2:00 PM',
    location: 'SKBC Main Entrance',
    status: 'parked',
    assignedDriver: MOCK_VALET_DRIVERS[2],
    parkingSlot: 'B-01',
    vehicleInfo: {
      make: 'Mercedes',
      model: 'E-Class',
      color: 'White',
      plateNumber: 'XYZ 5678',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr_004',
    visitorName: 'Elena Rodriguez',
    visitorCompany: 'Innovate Corp',
    hostName: 'Michael Brown',
    visitDate: getToday(),
    pickupTime: '2:00 PM',
    returnTime: '4:00 PM',
    location: 'SKBC Main Entrance',
    status: 'pending',
    vehicleInfo: {
      make: 'Audi',
      model: 'A6',
      color: 'Gray',
      plateNumber: 'DEF 9012',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr_005',
    visitorName: 'Hassan Al-Otaibi',
    visitorCompany: 'Saudi Tech Partners',
    hostName: 'Lisa Chen',
    visitDate: getToday(),
    pickupTime: '3:00 PM',
    returnTime: '5:00 PM',
    location: 'SKBC Main Entrance',
    status: 'ready_for_pickup',
    assignedDriver: MOCK_VALET_DRIVERS[3],
    parkingSlot: 'C-03',
    vehicleInfo: {
      make: 'Lexus',
      model: 'LS 500',
      color: 'Dark Blue',
      plateNumber: 'GHI 3456',
    },
    notes: 'Partnership discussion',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr_006',
    visitorName: 'Jennifer Park',
    visitorCompany: 'Seoul Investments',
    hostName: 'Sarah Johnson',
    visitDate: getToday(),
    pickupTime: '4:00 PM',
    returnTime: '6:00 PM',
    location: 'SKBC Main Entrance',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr_007',
    visitorName: 'Ahmed Khalid',
    visitorCompany: 'Gulf Trading',
    hostName: 'John Smith',
    visitDate: getYesterday(),
    pickupTime: '10:00 AM',
    returnTime: '12:00 PM',
    location: 'SKBC Main Entrance',
    status: 'completed',
    assignedDriver: MOCK_VALET_DRIVERS[0],
    parkingSlot: 'A-02',
    vehicleInfo: {
      make: 'Range Rover',
      model: 'Sport',
      color: 'Green',
      plateNumber: 'JKL 7890',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vr_008',
    visitorName: 'Yuki Tanaka',
    visitorCompany: 'Asia Tech Solutions',
    hostName: 'David Lee',
    visitDate: getTomorrow(),
    pickupTime: '9:30 AM',
    returnTime: '11:30 AM',
    location: 'SKBC Main Entrance',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let valetRequestsState = [...INITIAL_VALET_REQUESTS];
let parkingSlotsState = [...MOCK_PARKING_SLOTS];
let driversState = [...MOCK_VALET_DRIVERS];

export const getValetRequests = (): ValetRequest[] => {
  return [...valetRequestsState];
};

export const getTodayValetRequests = (): ValetRequest[] => {
  const today = getToday();
  return valetRequestsState.filter(r => r.visitDate === today);
};

export const getValetRequestById = (id: string): ValetRequest | undefined => {
  return valetRequestsState.find(r => r.id === id);
};

export const getValetRequestStats = () => {
  const today = getToday();
  const todayRequests = valetRequestsState.filter(r => r.visitDate === today);
  
  return {
    total: todayRequests.length,
    pending: todayRequests.filter(r => r.status === 'pending').length,
    assigned: todayRequests.filter(r => r.status === 'assigned').length,
    parked: todayRequests.filter(r => r.status === 'parked').length,
    readyForPickup: todayRequests.filter(r => r.status === 'ready_for_pickup').length,
    completed: todayRequests.filter(r => r.status === 'completed').length,
  };
};

export const updateValetRequestStatus = (
  requestId: string, 
  status: ValetRequest['status']
): ValetRequest | null => {
  const index = valetRequestsState.findIndex(r => r.id === requestId);
  if (index !== -1) {
    valetRequestsState[index] = {
      ...valetRequestsState[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    return valetRequestsState[index];
  }
  return null;
};

export const assignDriverToRequest = (
  requestId: string,
  driverId: string
): ValetRequest | null => {
  const driver = driversState.find(d => d.id === driverId);
  if (!driver) return null;

  const index = valetRequestsState.findIndex(r => r.id === requestId);
  if (index !== -1) {
    valetRequestsState[index] = {
      ...valetRequestsState[index],
      assignedDriver: driver,
      status: 'assigned',
      updatedAt: new Date().toISOString(),
    };
    return valetRequestsState[index];
  }
  return null;
};

export const assignParkingSlot = (
  requestId: string,
  slotId: string
): ValetRequest | null => {
  const slot = parkingSlotsState.find(s => s.id === slotId);
  if (!slot || slot.status !== 'available') return null;

  const request = valetRequestsState.find(r => r.id === requestId);
  if (!request) return null;

  const slotIndex = parkingSlotsState.findIndex(s => s.id === slotId);
  if (slotIndex !== -1) {
    parkingSlotsState[slotIndex] = {
      ...parkingSlotsState[slotIndex],
      status: 'occupied',
      vehiclePlate: request.vehicleInfo?.plateNumber,
      assignedRequest: requestId,
    };
  }

  const requestIndex = valetRequestsState.findIndex(r => r.id === requestId);
  if (requestIndex !== -1) {
    valetRequestsState[requestIndex] = {
      ...valetRequestsState[requestIndex],
      parkingSlot: slot.slotNumber,
      status: 'parked',
      updatedAt: new Date().toISOString(),
    };
    return valetRequestsState[requestIndex];
  }
  return null;
};

export const releaseParkingSlot = (slotId: string): ValetParkingSlot | null => {
  const index = parkingSlotsState.findIndex(s => s.id === slotId);
  if (index !== -1) {
    parkingSlotsState[index] = {
      ...parkingSlotsState[index],
      status: 'available',
      vehiclePlate: undefined,
      assignedRequest: undefined,
    };
    return parkingSlotsState[index];
  }
  return null;
};

export const getValetDrivers = (): ValetDriverExtended[] => {
  return [...driversState];
};

export const getDriverStats = () => {
  return {
    total: driversState.length,
    available: driversState.filter(d => d.status === 'available').length,
    busy: driversState.filter(d => d.status === 'busy').length,
    offDuty: driversState.filter(d => d.status === 'off_duty').length,
  };
};

export const toggleDriverStatus = (driverId: string): ValetDriverExtended | null => {
  const index = driversState.findIndex(d => d.id === driverId);
  if (index !== -1) {
    const currentStatus = driversState[index].status;
    let newStatus: 'available' | 'busy' | 'off_duty';
    
    if (currentStatus === 'off_duty') {
      newStatus = 'available';
    } else if (currentStatus === 'available') {
      newStatus = 'off_duty';
    } else {
      newStatus = currentStatus;
    }
    
    driversState[index] = {
      ...driversState[index],
      status: newStatus,
    };
    return driversState[index];
  }
  return null;
};

export const getParkingSlots = (): ValetParkingSlot[] => {
  return [...parkingSlotsState];
};

export const getParkingStats = () => {
  return {
    total: parkingSlotsState.length,
    available: parkingSlotsState.filter(s => s.status === 'available').length,
    occupied: parkingSlotsState.filter(s => s.status === 'occupied').length,
    reserved: parkingSlotsState.filter(s => s.status === 'reserved').length,
    maintenance: parkingSlotsState.filter(s => s.status === 'maintenance').length,
  };
};

export const resetValetAdminState = () => {
  valetRequestsState = [...INITIAL_VALET_REQUESTS];
  parkingSlotsState = [...MOCK_PARKING_SLOTS];
  driversState = [...MOCK_VALET_DRIVERS];
};

let currentDriverId: string | null = null;
let currentDriverName: string | null = null;

export function setCurrentDriver(driverId: string, driverName: string): void {
  currentDriverId = driverId;
  currentDriverName = driverName;
}

export function getCurrentDriver(): { id: string | null; name: string | null } {
  return { id: currentDriverId, name: currentDriverName };
}

export function clearCurrentDriver(): void {
  currentDriverId = null;
  currentDriverName = null;
}

export function getRequestsByDriverId(driverId: string): ValetRequest[] {
  return valetRequestsState
    .filter(r => r.assignedDriver?.id === driverId)
    .map(r => ({ ...r }));
}

export function driverAcceptRequest(requestId: string): ValetRequest | null {
  const request = valetRequestsState.find(r => r.id === requestId);
  if (request && request.status === 'assigned') {
    const updatedRequest: ValetRequest = {
      ...request,
      status: 'assigned',
      updatedAt: new Date().toISOString(),
    };
    valetRequestsState = valetRequestsState.map(r =>
      r.id === requestId ? updatedRequest : { ...r }
    );
    return { ...updatedRequest };
  }
  return null;
}

export function driverRejectRequest(requestId: string): ValetRequest | null {
  const request = valetRequestsState.find(r => r.id === requestId);
  if (request && (request.status === 'assigned' || request.status === 'pending')) {
    const updatedRequest: ValetRequest = {
      ...request,
      status: 'cancelled',
      assignedDriver: undefined,
      updatedAt: new Date().toISOString(),
    };
    valetRequestsState = valetRequestsState.map(r =>
      r.id === requestId ? updatedRequest : { ...r }
    );
    return { ...updatedRequest };
  }
  return null;
}

export function driverParkVehicle(requestId: string, slotNumber: string): ValetRequest | null {
  const request = valetRequestsState.find(r => r.id === requestId);
  if (request && (request.status === 'assigned' || request.status === 'pending')) {
    const slot = parkingSlotsState.find(s => s.slotNumber === slotNumber && s.status === 'available');
    if (slot) {
      const slotIndex = parkingSlotsState.findIndex(s => s.id === slot.id);
      if (slotIndex !== -1) {
        parkingSlotsState[slotIndex] = {
          ...parkingSlotsState[slotIndex],
          status: 'occupied',
          vehiclePlate: request.vehicleInfo?.plateNumber,
          assignedRequest: requestId,
        };
      }
    }
    
    const updatedRequest: ValetRequest = {
      ...request,
      status: 'parked',
      parkingSlot: slotNumber,
      updatedAt: new Date().toISOString(),
    };
    valetRequestsState = valetRequestsState.map(r =>
      r.id === requestId ? updatedRequest : { ...r }
    );
    return { ...updatedRequest };
  }
  return null;
}

export function driverMarkReadyForPickup(requestId: string): ValetRequest | null {
  const request = valetRequestsState.find(r => r.id === requestId);
  if (request && request.status === 'parked') {
    const updatedRequest: ValetRequest = {
      ...request,
      status: 'ready_for_pickup',
      updatedAt: new Date().toISOString(),
    };
    valetRequestsState = valetRequestsState.map(r =>
      r.id === requestId ? updatedRequest : { ...r }
    );
    return { ...updatedRequest };
  }
  return null;
}

export function driverCompleteRequest(requestId: string): ValetRequest | null {
  const request = valetRequestsState.find(r => r.id === requestId);
  if (request && (request.status === 'parked' || request.status === 'ready_for_pickup' || request.status === 'assigned')) {
    if (request.parkingSlot) {
      const slotIndex = parkingSlotsState.findIndex(s => s.slotNumber === request.parkingSlot);
      if (slotIndex !== -1) {
        parkingSlotsState[slotIndex] = {
          ...parkingSlotsState[slotIndex],
          status: 'available',
          vehiclePlate: undefined,
          assignedRequest: undefined,
        };
      }
    }
    
    const updatedRequest: ValetRequest = {
      ...request,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
    valetRequestsState = valetRequestsState.map(r =>
      r.id === requestId ? updatedRequest : { ...r }
    );
    return { ...updatedRequest };
  }
  return null;
}

export function getAvailableParkingSlots(): ValetParkingSlot[] {
  return parkingSlotsState.filter(s => s.status === 'available').map(s => ({ ...s }));
}
