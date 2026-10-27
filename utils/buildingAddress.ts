const LEGACY_BUILDING_ADDRESS = 'SKBC Tower, King Abdulaziz Road, Jeddah';
const CURRENT_BUILDING_ADDRESS = 'Dallah HQ, Saleh Kamel Business Center, Building No. 2860, Ash Shati District, Jeddah, Saudi Arabia';

/** Update the known legacy address without replacing other buildings' addresses. */
export function formatBuildingAddress(address?: string): string {
  if (!address) return '';
  return address.trim().toLowerCase() === LEGACY_BUILDING_ADDRESS.toLowerCase()
    ? CURRENT_BUILDING_ADDRESS
    : address;
}
