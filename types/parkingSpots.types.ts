export type ParkingSpotStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';
export type ParkingSpotType = 'visitor' | 'employee' | 'valet' | 'reserved';
export type ParkingLocation = 'skbc_basement' | 'red_sea_mall' | 'valet_zone';

export interface ParkingSpotDto {
  id: string;
  spotNumber: string;
  location: ParkingLocation;
  level: string;
  spotType: ParkingSpotType;
  status: ParkingSpotStatus;
  isActive: boolean;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  vehiclePlate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParkingSpotDto {
  spotNumber: string;
  location: ParkingLocation;
  level: string;
  spotType: ParkingSpotType;
  isActive?: boolean;
}

export interface UpdateParkingSpotDto {
  spotNumber?: string;
  location?: ParkingLocation;
  level?: string;
  spotType?: ParkingSpotType;
  status?: ParkingSpotStatus;
  isActive?: boolean;
  assignedEmployeeId?: string;
  vehiclePlate?: string;
}

export interface ListParkingSpotsParams {
  limit?: number;
  page?: number;
  search?: string;
  level?: string;
  isActive?: boolean;
  status?: ParkingSpotStatus;
  spotType?: ParkingSpotType;
  location?: ParkingLocation;
}

export interface ParkingSpotsResponse {
  data: ParkingSpotDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
