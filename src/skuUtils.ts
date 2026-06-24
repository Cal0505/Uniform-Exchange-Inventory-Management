export interface SkuParams {
  ruleProfile: 'Pickers Shelf' | 'VacPac Storage Area';
  locationSku: string;
  shelfCode?: string;
  packNumber?: number;
  schoolSku: string;
  colourSku: string;
  typeSku: string;
  sizeSku: string;
}

export function generateSkuid(params: SkuParams): string {
  let locationBlock = '';
  if (params.ruleProfile === 'Pickers Shelf') {
    locationBlock = (params.shelfCode || '').toUpperCase().trim();
  } else {
    const locSku = params.locationSku.toUpperCase().trim();
    const pNum = params.packNumber !== undefined ? params.packNumber : '';
    locationBlock = `${locSku}${pNum}`;
  }
  
  const school = params.schoolSku.toUpperCase().trim();
  const colour = params.colourSku.toUpperCase().trim();
  const type = params.typeSku.toUpperCase().trim();
  const size = params.sizeSku.toUpperCase().trim();
  
  return `${locationBlock}${school}${colour}${type}s${size}`;
}

export function validateShelfCode(code: string): boolean {
  // Regex to match grid code A1 to Z10
  const match = /^[A-Z]([1-9]|10)$/i.test(code.trim());
  return match;
}

export function getSizeCategoryForGarment(garmentName: string): string {
  const normalized = (garmentName || '').replace(/[\s]/g, '_').toLowerCase();
  if (normalized === 'boys_socks') return 'Boys_Socks';
  if (normalized === 'boys_cozy_socks') return 'Boys_Cozy_Socks';
  if (normalized === 'book_bag') return 'One_Size';
  if (normalized === 'tie') return 'One_Size';
  if (normalized === 'girls_socks') return 'Girls_Socks';
  if (normalized === 'girls_cozy_socks') return 'Girls_Cozy_Socks';
  if (normalized === 'boys_hat_sets') return 'Boys_Hat_sets';
  if (normalized === 'girls_hat_sets') return 'Girls_Hat_sets';
  if (normalized === 'boys_shoes') return 'Boys_Shoes';
  if (normalized === 'girls_shoes') return 'Girls_Shoes';
  return 'Clothes';
}
