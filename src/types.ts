export interface School {
  id: string;
  name: string;
  skuCode: string;
}

export interface Clothing_Type {
  id: string;
  name: string;
  skuCode: string;
  logo?: boolean;
  plain?: boolean;
  new?: boolean;
}

export interface Size {
  id: string;
  label: string;
  skuCode: string;
  category?: string;
}

export interface Colour {
  id: string;
  name: string;
  skuCode: string;
}

export interface Location {
  id: string;
  name: string;
  skuCode: string;
  ruleProfile: 'Pickers Shelf' | 'VacPac Storage Area';
}

export interface Category {
  id: string;
  name: string;
  skuCode: string;
}

export interface ItemType {
  id: string;
  name: string;
  skuCode: string;
}

export interface InventoryItem {
  id: string; // skuid_shelfCode for single, skuid for vacpac
  skuid: string;
  type: 'single' | 'vacpac';
  category?: 'Plain' | 'Logo';
  locationId: string;
  locationSku: string; // For location metadata matching
  shelfCode?: string; // Shelf Grid (e.g., E7) for Singles
  packNumber?: number; // Pack Number (e.g., 1) for VacPacs
  schoolId: string;
  schoolSku: string;
  colourId: string;
  colourSku: string;
  typeId: string;
  typeSku: string;
  sizeId: string;
  sizeSku: string;
  quantity: number; // Single quantity or Units Per Pack
  updatedAt: any;
}
