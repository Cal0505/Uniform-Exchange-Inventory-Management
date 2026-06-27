import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { seedDatabaseIfEmpty } from './seeder';
import { School, ClothingType, Size, Colour, Location, InventoryItem, Category, ItemType } from './types';

export function useFirestoreData() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schoolClassifications, setSchoolClassifications] = useState<any[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const runSeeder = async () => {
      setSeeding(true);
      try { await seedDatabaseIfEmpty(); } catch (err) { console.error(err); } finally { setSeeding(false); }
    };
    runSeeder();
  }, []);

  useEffect(() => {
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      const items: School[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as School));
      setSchools(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'schools'));

    const unsubTypes = onSnapshot(collection(db, 'clothingTypes'), (snap) => {
      const items: ClothingType[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ClothingType));
      setClothingTypes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clothingTypes'));

    const unsubSizes = onSnapshot(collection(db, 'sizes'), (snap) => {
      const items: Size[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Size));
      setSizes(items);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sizes'));

    const unsubColours = onSnapshot(collection(db, 'colours'), (snap) => {
      const items: Colour[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Colour));
      setColours(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'colours'));

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
      const items: Location[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Location));
      setLocations(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'locations'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const items: Category[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Category));
      setCategories(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const unsubSchoolClassifications = onSnapshot(collection(db, 'schoolClassifications'), (snap) => {
      const items: any[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setSchoolClassifications(items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'schoolClassifications'));

    const unsubItemTypes = onSnapshot(collection(db, 'itemTypes'), (snap) => {
      const items: ItemType[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ItemType));
      setItemTypes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'itemTypes'));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      const items: InventoryItem[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as InventoryItem));
      setInventory(items); setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

    return () => {
      unsubSchools(); unsubTypes(); unsubSizes(); unsubColours();
      unsubLocations(); unsubCategories(); unsubSchoolClassifications(); unsubItemTypes(); unsubInventory();
    };
  }, []);

  return { schools, clothingTypes, sizes, colours, locations, categories, schoolClassifications, itemTypes, inventory, loading, seeding };
}
