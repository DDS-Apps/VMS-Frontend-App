# DALLAH VMS - Current Parking System Documentation

## 1. Overview

The parking system in DALLAH VMS supports **three parking options** for visitors:
- **None** - Visitor arranges their own parking
- **Auto** - System automatically assigns a parking spot
- **Valet** - Valet driver parks the vehicle

---

## 2. Parking Infrastructure

### 2.1 Parking Locations

| Location ID | Display Name | Description |
|------------|--------------|-------------|
| `skbc_basement` | SKBC Basement | Primary parking (Levels B1, B2) |
| `red_sea_mall` | Red Sea Mall | Overflow parking (Levels A, B) |
| `valet_zone` | Valet Zone | VIP and valet service area |
| `none` | No Parking | Fallback when no spots available |

### 2.2 Parking Spot Types

| Type | Description |
|------|-------------|
| `visitor` | For visitors |
| `employee` | For staff members |
| `valet` | Managed by valet drivers |
| `reserved` | VIP/executive reserved spots |

### 2.3 Parking Spot Statuses

| Status | Description |
|--------|-------------|
| `available` | Open for allocation |
| `occupied` | Currently in use |
| `reserved` | Pre-allocated for specific use |
| `maintenance` | Temporarily unavailable |

---

## 3. User Flows

### 3.1 Employee Creating Visitor Request

1. Employee fills visitor request form
2. Toggles **"Needs Parking"** checkbox (default: OFF)
3. If enabled, `parkingPreference: 'auto'` is saved
4. If disabled, `parkingPreference: 'none'` is saved
5. **Walk-in visitors (receptionist)**: Parking is always set to `'none'`

### 3.2 Parking Assignment (Auto Allocation)

When a visitor needs parking:

1. System checks **Priority Rules** (configured by Building Admin)
2. Rules are ordered by priority (1 = highest)
3. System checks location occupancy against `maxOccupancyPercent` threshold
4. If under threshold, assigns spot from that location
5. If over threshold, falls through to next priority location
6. If all locations full, uses `defaultFallback` (typically 'none')

---

## 4. Priority Rules System

### 4.1 Default Configuration

| Priority | Location | Max Occupancy | Status |
|----------|----------|---------------|--------|
| 1 | SKBC Basement | 85% | Active |
| 2 | Red Sea Mall | 70% | Active |
| 3 | Valet Zone | 90% | Active |
| 4 | No Parking | 100% | Active (Fallback) |

### 4.2 Building Admin Controls

- **Reorder rules** by dragging up/down
- **Set occupancy thresholds** per location
- **Enable/disable** individual rules
- **Toggle auto-allocation** on/off globally

---

## 5. Data Models

### 5.1 Parking Spot (`ParkingSpotDto`)

```typescript
{
  id: string;
  spotNumber: string;        // e.g., "B1-001", "RSM-A01"
  location: ParkingLocation;
  level: string;             // e.g., "B1", "Level A"
  spotType: ParkingSpotType;
  status: ParkingSpotStatus;
  isActive: boolean;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  vehiclePlate?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 Parking Allocation (`ParkingAllocationDto`)

```typescript
{
  id: string;
  parkingSpaceId: string;
  parkingSpace?: ParkingSpaceDto;
  visitorId?: string;
  employeeId?: string;
  vehiclePlate?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  isActive: boolean;
}
```

### 5.3 Visitor Request Parking Fields

```typescript
{
  needsParking?: boolean;
  parkingPreference?: 'auto' | 'manual' | 'none';
  parkingType?: string;
  parkingSlot?: {
    slotNumber: string;
    location: string;
    floor?: string;
    status?: string;
  };
  parkingAllocation?: {
    id: string;
    spaceId: string;
    // ...
  };
}
```

### 5.4 Priority Rule (`ParkingPriorityRule`)

```typescript
{
  id: string;
  location: ParkingLocationId;
  priority: number;
  maxOccupancyPercent: number;
  isActive: boolean;
  description: string;
}
```

### 5.5 Parking Configuration (`ParkingConfig`)

```typescript
{
  priorityRules: ParkingPriorityRule[];
  defaultFallback: ParkingLocationId;
  enableAutoAllocation: boolean;
  updatedAt: string;
}
```

---

## 6. API Endpoints

### 6.1 Parking Spaces

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/parking/spaces` | GET | List all parking spaces |
| `/api/v1/parking/spaces` | POST | Create new parking space |
| `/api/v1/parking/spaces/{id}` | PATCH | Update parking space |
| `/api/v1/parking/spaces/available` | GET | Get available spaces (optional: filter by location) |

### 6.2 Parking Allocation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/parking/allocate/auto` | POST | Auto-allocate parking based on priority rules |
| `/api/v1/parking/allocate/{spaceId}` | POST | Manual allocation to specific spot |
| `/api/v1/parking/allocations` | GET | List all allocations |
| `/api/v1/parking/allocations/{id}/check-in` | POST | Check in to parking |
| `/api/v1/parking/allocations/{id}/check-out` | POST | Check out from parking |
| `/api/v1/parking/allocations/{id}/release` | POST | Release allocation |

### 6.3 Statistics & Employee Parking

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/parking/stats` | GET | Get parking statistics |
| `/api/v1/parking/employees` | GET | List employee parking assignments |
| `/api/v1/parking/employees/bulk-assign` | POST | Bulk assign spots to employees |

---

## 7. Admin Screens

### 7.1 Building Admin Screens

| Screen | File | Purpose |
|--------|------|---------|
| Parking Spots | `ParkingSpotsScreen.tsx` | CRUD operations for parking spots, KPI cards, filtering by location/type/status |
| Priority Rules | `ParkingPriorityRulesScreen.tsx` | Configure allocation priority rules, reorder, set thresholds |
| Utilization | `ParkingUtilizationScreen.tsx` | View occupancy metrics by location/date, historical trends |

### 7.2 System Admin Screens

| Screen | File | Purpose |
|--------|------|---------|
| Parking & Valet Settings | `ParkingValetSettingsScreen.tsx` | Manage parking areas and valet zones |
| Parking Occupancy | `ParkingOccupancyScreen.tsx` | Global occupancy monitoring |
| Employee Parking | `EmployeeParkingAssignmentScreen.tsx` | Assign permanent spots to employees |

### 7.3 Valet Admin Screens

| Screen | File | Purpose |
|--------|------|---------|
| Valet Parking | `ValetAdminParkingScreen.tsx` | Manage valet-specific parking operations |

---

## 8. Display Components

### 8.1 `ParkingSection` Component

Location: `components/ParkingSection.tsx`

Renders parking info based on `parkingType`:

| Type | Display | Details Shown |
|------|---------|---------------|
| `none` | "No Parking" card with slash icon | "Visitor will arrange own parking" |
| `auto` | "Auto Parking" card with map-pin icon | Location, slot number, floor + PENDING/ASSIGNED badge |
| `valet` | "Valet Service" card with truck icon | Driver name, phone + PENDING/ASSIGNED badge |

### 8.2 Usage Locations

- `screens/Employee/RequestDetailsScreen.tsx`
- `screens/Manager/ManagerApprovalDetailScreen.tsx`
- `screens/Receptionist/VisitorDetailScreen.tsx`
- `screens/Security/SecurityCheckInScreen.tsx`
- `screens/Security/SecurityVisitorDetailScreen.tsx`

---

## 9. Mock Data State

### 9.1 File Location

`services/mock/parkingManagementState.ts`

### 9.2 Initial Data

- **22 parking spots** across 3 locations
- **4 priority rules** (one per location + fallback)
- **7 days of utilization logs** (auto-generated)

### 9.3 State Functions

```typescript
// Spots
getParkingSpots(): ParkingSpot[]
getParkingSpotById(id: string): ParkingSpot | undefined
getActiveSpots(): ParkingSpot[]
getSpotsByLocation(location): ParkingSpot[]
getSpotsByType(type): ParkingSpot[]
addParkingSpot(spot): ParkingSpot
updateParkingSpot(id, updates): ParkingSpot | null
toggleSpotActive(id): ParkingSpot | null
deleteParkingSpot(id): boolean

// Configuration
getParkingConfig(): ParkingConfig
getPriorityRules(): ParkingPriorityRule[]
updatePriorityRule(id, updates): ParkingPriorityRule | null
reorderPriorityRules(orderedIds): ParkingPriorityRule[]
updateParkingConfig(updates): ParkingConfig

// Utilization
getUtilizationLogs(): ParkingUtilizationLog[]
getUtilizationByDate(date): ParkingUtilizationLog[]
getUtilizationByLocation(location): ParkingUtilizationLog[]
getCurrentUtilization(): { total, available, occupied, reserved, maintenance, byLocation, byType }

// Reset
resetParkingManagementState(): void
```

---

## 10. Visitor Request Form Integration

### 10.1 File Location

`screens/Employee/VisitorRequestFormScreen.tsx`

### 10.2 Parking Selection

```typescript
const [needsParking, setNeedsParking] = useState(false);

// In form submission:
{
  needsParking: asReceptionist ? false : needsParking,
  needsValet: false,
  parkingPreference: asReceptionist ? 'none' : (needsParking ? 'auto' : 'none'),
}
```

### 10.3 UI Element

Toggle checkbox in "Additional Services" section labeled "Parking"

---

## 11. Current Limitations & Notes

1. **No manual spot selection for visitors** - Only auto-allocation or valet options
2. **Walk-ins don't get parking** - Receptionist flow always sets `parkingPreference: 'none'`
3. **No visitor self-service parking** - Visitors cannot request parking changes after invite sent
4. **Priority rules are per-location** - No per-spot-type or per-visitor-type rules
5. **Mock data mode** - Priority rules use local state (`parkingManagementState.ts`), not backend API
6. **No real-time availability** - Spot availability is not pushed in real-time
7. **No vehicle plate pre-registration** - Vehicle info not collected during invite creation
8. **Valet assignment is separate** - Valet driver assignment handled through valet admin flow

---

## 12. Related Type Definitions

### 12.1 Files

- `types/parking.types.ts` - Employee parking assignment types
- `types/parkingSpots.types.ts` - Parking spot CRUD types
- `types/vms.types.ts` - Core VMS types including `ParkingType`, `ParkingSlot`, `ValetService`
- `types/api.types.ts` - API-level parking types

### 12.2 Key Type Exports

```typescript
// From vms.types.ts
export type ParkingType = 'auto' | 'valet' | 'none';
export type ParkingLocation = 'SKBC_basement' | 'skbc_basement' | 'valet' | 'red_sea_mall';

export interface ParkingSlot {
  slotNumber: string;
  location: ParkingLocation;
  floor?: string;
  status?: string;
}

export interface ValetDriver {
  id: string;
  name: string;
  phone?: string;
}

export interface ValetService {
  status: string;
  driver?: ValetDriver;
}
```

---

## 13. Query Hooks

### 13.1 Files

- `hooks/queries/useParkingQueries.ts` - General parking queries
- `hooks/queries/useParkingSpotsQueries.ts` - Parking spots CRUD hooks
- `hooks/queries/useEmployeeParkingQueries.ts` - Employee parking assignment hooks

### 13.2 Available Hooks

```typescript
// Parking Spots
useParkingSpotsQuery(params)
useCreateParkingSpotMutation()
useUpdateParkingSpotMutation()
useDeleteParkingSpotMutation()

// Parking Allocations
useParkingSpacesQuery(params)
useParkingAllocationsQuery(params)
useAutoAllocateParkingMutation()
useManualAllocateParkingMutation()
useParkingCheckInMutation()
useParkingCheckOutMutation()
useReleaseParkingMutation()
useParkingStatsQuery()
```

---

*Last Updated: December 2025*
