import React from 'react';
import AdminPanel from './components/AdminPanel';
import { School, ClothingType, Size, Colour, Location, Category, ItemType } from './types';

interface AdminTabContainerProps {
  schools: School[];
  clothingTypes: ClothingType[];
  sizes: Size[];
  colours: Colour[];
  locations: Location[];
  categories: Category[];
  itemTypes: ItemType[];
}

export default function AdminTabContainer({
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  categories,
  itemTypes
}: AdminTabContainerProps) {
  return (
    <AdminPanel 
      schools={schools}
      clothingTypes={clothingTypes}
      sizes={sizes}
      colours={colours}
      locations={locations}
      categories={categories}
      itemTypes={itemTypes}
    />
  );
}
