/**
 * Parking Management State
 * System-level parking configuration for Building Admin
 */

export type ParkingSpotType = 'visitor' | 'employee' | 'valet' | 'reserved';
export type ParkingLocationId = 'skbc_basement' | 'red_sea_mall' | 'valet_zone' | 'none';

export interface ParkingSpot {
  id: string;
  spotNumber: string;
  location: ParkingLocationId;
  level: string;
  type: ParkingSpotType;
  isActive: boolean;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  assignedTo?: string;
  vehiclePlate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingPriorityRule {
  id: string;
  location: ParkingLocationId;
  priority: number;
  maxOccupancyPercent: number;
  isActive: boolean;
  description: string;
}

export interface ParkingUtilizationLog {
  id: string;
  date: string;
  location: ParkingLocationId;
  totalSpots: number;
  occupiedSpots: number;
  reservedSpots: number;
  maintenanceSpots: number;
  peakOccupancy: number;
  peakHour: string;
}

export interface ParkingConfig {
  priorityRules: ParkingPriorityRule[];
  defaultFallback: ParkingLocationId;
  enableAutoAllocation: boolean;
  updatedAt: string;
}

const getToday = () => new Date().toISOString().split('T')[0];
const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};
const getDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const INITIAL_PARKING_SPOTS: ParkingSpot[] = [
  { id: 'ps_001', spotNumber: 'B1-001', location: 'skbc_basement', level: 'B1', type: 'visitor', isActive: true, status: 'occupied', vehiclePlate: 'ABC 1234', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_002', spotNumber: 'B1-002', location: 'skbc_basement', level: 'B1', type: 'visitor', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_003', spotNumber: 'B1-003', location: 'skbc_basement', level: 'B1', type: 'visitor', isActive: true, status: 'reserved', assignedTo: 'VIP Guest', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_004', spotNumber: 'B1-004', location: 'skbc_basement', level: 'B1', type: 'employee', isActive: true, status: 'occupied', assignedTo: 'Sarah Johnson', vehiclePlate: 'XYZ 5678', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_005', spotNumber: 'B1-005', location: 'skbc_basement', level: 'B1', type: 'employee', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_006', spotNumber: 'B1-006', location: 'skbc_basement', level: 'B1', type: 'reserved', isActive: true, status: 'reserved', assignedTo: 'CEO', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_007', spotNumber: 'B2-001', location: 'skbc_basement', level: 'B2', type: 'visitor', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_008', spotNumber: 'B2-002', location: 'skbc_basement', level: 'B2', type: 'visitor', isActive: true, status: 'occupied', vehiclePlate: 'DEF 9012', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_009', spotNumber: 'B2-003', location: 'skbc_basement', level: 'B2', type: 'employee', isActive: true, status: 'maintenance', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_010', spotNumber: 'B2-004', location: 'skbc_basement', level: 'B2', type: 'valet', isActive: true, status: 'occupied', vehiclePlate: 'GHI 3456', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_011', spotNumber: 'RSM-A01', location: 'red_sea_mall', level: 'Level A', type: 'visitor', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_012', spotNumber: 'RSM-A02', location: 'red_sea_mall', level: 'Level A', type: 'visitor', isActive: true, status: 'occupied', vehiclePlate: 'JKL 7890', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_013', spotNumber: 'RSM-A03', location: 'red_sea_mall', level: 'Level A', type: 'visitor', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_014', spotNumber: 'RSM-B01', location: 'red_sea_mall', level: 'Level B', type: 'visitor', isActive: true, status: 'occupied', vehiclePlate: 'MNO 1234', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_015', spotNumber: 'RSM-B02', location: 'red_sea_mall', level: 'Level B', type: 'employee', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_016', spotNumber: 'V-001', location: 'valet_zone', level: 'Valet Area', type: 'valet', isActive: true, status: 'occupied', vehiclePlate: 'PQR 5678', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_017', spotNumber: 'V-002', location: 'valet_zone', level: 'Valet Area', type: 'valet', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_018', spotNumber: 'V-003', location: 'valet_zone', level: 'Valet Area', type: 'valet', isActive: true, status: 'occupied', vehiclePlate: 'STU 9012', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_019', spotNumber: 'V-004', location: 'valet_zone', level: 'Valet Area', type: 'valet', isActive: true, status: 'reserved', assignedTo: 'VIP Event', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_020', spotNumber: 'V-005', location: 'valet_zone', level: 'Valet Area', type: 'valet', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_021', spotNumber: 'B1-007', location: 'skbc_basement', level: 'B1', type: 'visitor', isActive: false, status: 'maintenance', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'ps_022', spotNumber: 'B1-008', location: 'skbc_basement', level: 'B1', type: 'employee', isActive: true, status: 'available', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
];

const INITIAL_PRIORITY_RULES: ParkingPriorityRule[] = [
  { id: 'pr_001', location: 'skbc_basement', priority: 1, maxOccupancyPercent: 85, isActive: true, description: 'SKBC Basement - Primary parking location' },
  { id: 'pr_002', location: 'red_sea_mall', priority: 2, maxOccupancyPercent: 70, isActive: true, description: 'Red Sea Mall - Overflow parking' },
  { id: 'pr_003', location: 'valet_zone', priority: 3, maxOccupancyPercent: 90, isActive: true, description: 'Valet Zone - VIP and valet service' },
  { id: 'pr_004', location: 'none', priority: 4, maxOccupancyPercent: 100, isActive: true, description: 'No Parking - Default fallback' },
];

const INITIAL_CONFIG: ParkingConfig = {
  priorityRules: INITIAL_PRIORITY_RULES,
  defaultFallback: 'none',
  enableAutoAllocation: true,
  updatedAt: new Date().toISOString(),
};

const generateUtilizationHistory = (): ParkingUtilizationLog[] => {
  const logs: ParkingUtilizationLog[] = [];
  const locations: ParkingLocationId[] = ['skbc_basement', 'red_sea_mall', 'valet_zone'];
  
  for (let i = 0; i < 7; i++) {
    const date = getDaysAgo(i);
    locations.forEach((location, locIdx) => {
      const baseTotal = location === 'skbc_basement' ? 12 : location === 'red_sea_mall' ? 5 : 5;
      const occupied = Math.floor(Math.random() * (baseTotal * 0.7)) + Math.floor(baseTotal * 0.2);
      const reserved = Math.floor(Math.random() * 2);
      const maintenance = location === 'skbc_basement' && i === 0 ? 1 : 0;
      
      logs.push({
        id: `log_${date}_${location}`,
        date,
        location,
        totalSpots: baseTotal,
        occupiedSpots: occupied,
        reservedSpots: reserved,
        maintenanceSpots: maintenance,
        peakOccupancy: Math.min(occupied + 2, baseTotal),
        peakHour: `${10 + Math.floor(Math.random() * 4)}:00`,
      });
    });
  }
  return logs;
};

let parkingSpotsState = [...INITIAL_PARKING_SPOTS];
let parkingConfigState = { ...INITIAL_CONFIG };
let utilizationLogsState = generateUtilizationHistory();

export const getParkingSpots = (): ParkingSpot[] => [...parkingSpotsState];

export const getParkingSpotById = (id: string): ParkingSpot | undefined => 
  parkingSpotsState.find(s => s.id === id);

export const getActiveSpots = (): ParkingSpot[] => 
  parkingSpotsState.filter(s => s.isActive);

export const getSpotsByLocation = (location: ParkingLocationId): ParkingSpot[] => 
  parkingSpotsState.filter(s => s.location === location);

export const getSpotsByType = (type: ParkingSpotType): ParkingSpot[] => 
  parkingSpotsState.filter(s => s.type === type);

export const addParkingSpot = (spot: Omit<ParkingSpot, 'id' | 'createdAt' | 'updatedAt'>): ParkingSpot => {
  const newSpot: ParkingSpot = {
    ...spot,
    id: `ps_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  parkingSpotsState = [...parkingSpotsState, newSpot];
  return newSpot;
};

export const updateParkingSpot = (id: string, updates: Partial<ParkingSpot>): ParkingSpot | null => {
  const index = parkingSpotsState.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  parkingSpotsState[index] = {
    ...parkingSpotsState[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return parkingSpotsState[index];
};

export const toggleSpotActive = (id: string): ParkingSpot | null => {
  const spot = parkingSpotsState.find(s => s.id === id);
  if (!spot) return null;
  return updateParkingSpot(id, { isActive: !spot.isActive });
};

export const deleteParkingSpot = (id: string): boolean => {
  const initialLength = parkingSpotsState.length;
  parkingSpotsState = parkingSpotsState.filter(s => s.id !== id);
  return parkingSpotsState.length < initialLength;
};

export const getParkingConfig = (): ParkingConfig => ({ ...parkingConfigState });

export const getPriorityRules = (): ParkingPriorityRule[] => 
  [...parkingConfigState.priorityRules].sort((a, b) => a.priority - b.priority);

export const updatePriorityRule = (id: string, updates: Partial<ParkingPriorityRule>): ParkingPriorityRule | null => {
  const ruleIndex = parkingConfigState.priorityRules.findIndex(r => r.id === id);
  if (ruleIndex === -1) return null;
  
  parkingConfigState.priorityRules[ruleIndex] = {
    ...parkingConfigState.priorityRules[ruleIndex],
    ...updates,
  };
  parkingConfigState.updatedAt = new Date().toISOString();
  return parkingConfigState.priorityRules[ruleIndex];
};

export const reorderPriorityRules = (orderedIds: string[]): ParkingPriorityRule[] => {
  const newRules = orderedIds.map((id, index) => {
    const rule = parkingConfigState.priorityRules.find(r => r.id === id);
    if (rule) {
      return { ...rule, priority: index + 1 };
    }
    return null;
  }).filter(Boolean) as ParkingPriorityRule[];
  
  parkingConfigState.priorityRules = newRules;
  parkingConfigState.updatedAt = new Date().toISOString();
  return newRules;
};

export const updateParkingConfig = (updates: Partial<ParkingConfig>): ParkingConfig => {
  parkingConfigState = {
    ...parkingConfigState,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return parkingConfigState;
};

export const getUtilizationLogs = (): ParkingUtilizationLog[] => [...utilizationLogsState];

export const getUtilizationByDate = (date: string): ParkingUtilizationLog[] => 
  utilizationLogsState.filter(l => l.date === date);

export const getUtilizationByLocation = (location: ParkingLocationId): ParkingUtilizationLog[] => 
  utilizationLogsState.filter(l => l.location === location);

export const getCurrentUtilization = () => {
  const spots = getActiveSpots();
  const locations: ParkingLocationId[] = ['skbc_basement', 'red_sea_mall', 'valet_zone'];
  
  const byLocation = locations.map(location => {
    const locationSpots = spots.filter(s => s.location === location);
    return {
      location,
      total: locationSpots.length,
      available: locationSpots.filter(s => s.status === 'available').length,
      occupied: locationSpots.filter(s => s.status === 'occupied').length,
      reserved: locationSpots.filter(s => s.status === 'reserved').length,
      maintenance: locationSpots.filter(s => s.status === 'maintenance').length,
    };
  });
  
  const types: ParkingSpotType[] = ['visitor', 'employee', 'valet', 'reserved'];
  const byType = types.map(type => {
    const typeSpots = spots.filter(s => s.type === type);
    return {
      type,
      total: typeSpots.length,
      available: typeSpots.filter(s => s.status === 'available').length,
      occupied: typeSpots.filter(s => s.status === 'occupied').length,
      reserved: typeSpots.filter(s => s.status === 'reserved').length,
    };
  });
  
  return {
    total: spots.length,
    available: spots.filter(s => s.status === 'available').length,
    occupied: spots.filter(s => s.status === 'occupied').length,
    reserved: spots.filter(s => s.status === 'reserved').length,
    maintenance: spots.filter(s => s.status === 'maintenance').length,
    byLocation,
    byType,
  };
};

export const getLocationLabel = (location: ParkingLocationId): string => {
  switch (location) {
    case 'skbc_basement': return 'SKBC Basement';
    case 'red_sea_mall': return 'Red Sea Mall';
    case 'valet_zone': return 'Valet Zone';
    case 'none': return 'No Parking';
    default: return location;
  }
};

export const getSpotTypeLabel = (type: ParkingSpotType): string => {
  switch (type) {
    case 'visitor': return 'Visitor';
    case 'employee': return 'Employee';
    case 'valet': return 'Valet';
    case 'reserved': return 'Reserved';
    default: return type;
  }
};

export const resetParkingManagementState = () => {
  parkingSpotsState = [...INITIAL_PARKING_SPOTS];
  parkingConfigState = { ...INITIAL_CONFIG };
  utilizationLogsState = generateUtilizationHistory();
};
