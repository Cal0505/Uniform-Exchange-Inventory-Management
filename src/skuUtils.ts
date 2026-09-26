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

function normalizeCategoryKey(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getSizeCategoryForGarment(garmentName: string): string {
  const normalized = normalizeCategoryKey(garmentName);

  if (!normalized) return 'Clothes';

  const aliases: Record<string, string> = {
    boys_socks: 'Boys_Socks',
    boys_cozy_socks: 'Boys_Cozy_Socks',
    boys_hat_sets: 'Boys_Hat_sets',
    boys_hatset: 'Boys_Hat_sets',
    boys_hats: 'Boys_Hat_sets',
    boys_shoes: 'Boys_Shoes',
    girls_socks: 'Girls_Socks',
    girls_cozy_socks: 'Girls_Cozy_Socks',
    girls_hat_sets: 'Girls_Hat_sets',
    girls_hatset: 'Girls_Hat_sets',
    girls_hats: 'Girls_Hat_sets',
    girls_shoes: 'Girls_Shoes',
    book_bag: 'One_Size',
    tie: 'One_Size',
    scarf: 'One_Size',
    one_size: 'One_Size',
    socks: 'Clothes',
    shoes: 'Clothes',
  };

  if (aliases[normalized]) return aliases[normalized];

  if (normalized.includes('boys') && normalized.includes('shoe')) return 'Boys_Shoes';
  if (normalized.includes('girls') && normalized.includes('shoe')) return 'Girls_Shoes';
  if (normalized.includes('boys') && normalized.includes('sock')) return 'Boys_Socks';
  if (normalized.includes('girls') && normalized.includes('sock')) return 'Girls_Socks';
  if (normalized.includes('boys') && normalized.includes('hat')) return 'Boys_Hat_sets';
  if (normalized.includes('girls') && normalized.includes('hat')) return 'Girls_Hat_sets';
  if (normalized.includes('boy') && normalized.includes('cozy') && normalized.includes('sock')) return 'Boys_Cozy_Socks';
  if (normalized.includes('girl') && normalized.includes('cozy') && normalized.includes('sock')) return 'Girls_Cozy_Socks';

  return 'Clothes';
}
