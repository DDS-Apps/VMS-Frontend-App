import { formatBuildingAddress } from '@/utils/buildingAddress';

const oldAddress = 'SKBC Tower, King Abdulaziz Road, Jeddah';
const newAddress = 'Dallah HQ, Saleh Kamel Business Center, Building No. 2860, Ash Shati District, Jeddah, Saudi Arabia';

it.each([oldAddress, ` ${oldAddress} `, oldAddress.toLowerCase()])(
  'replaces the legacy address with the exact updated address: %s',
  address => expect(formatBuildingAddress(address)).toBe(newAddress),
);

it.each([newAddress, 'Another Building, Riyadh', '', undefined])(
  'preserves other addresses and empty-state behavior: %s',
  address => expect(formatBuildingAddress(address)).toBe(address || ''),
);
