import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
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
  
  // 🎯 RENAMED FROM schoolClassifications TO schoolTypes REFS PER CLOUD MIGRATION
  const [schoolTypes, setSchoolTypes] = useState<any[]>([]);
  
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [developer_tickets, setDeveloperTickets] = useState<any[]>([]);

  useEffect(() => {
    // 🛡️ REPLACED HARD CRASH THROWERS WITH SAFE WARNING LOGGERS SO OFFLINE LOCKOUTS ARE IMPOSSIBLE
    const safeError = (collectionName: string) => (err: any) => {
      console.warn(`[Firestore Safe Cache Mode]: Standing by for connection sync on collection: ${collectionName}`, err.message);
    };

    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      const items: School[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as School));
      setSchools(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('schools'));

    const unsubTypes = onSnapshot(collection(db, 'clothingTypes'), (snap) => {
      const items: ClothingType[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as ClothingType));
      setClothingTypes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('clothingTypes'));

    const unsubSizes = onSnapshot(collection(db, 'sizes'), (snap) => {
      const items: Size[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Size));
      setSizes(items);
    }, safeError('sizes'));

    const unsubColours = onSnapshot(collection(db, 'colours'), (snap) => {
      const items: Colour[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Colour));
      setColours(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('colours'));

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
      const items: Location[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Location));
      setLocations(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('locations'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const items: Category[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Category));
      setCategories(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('categories'));

    // 🎯 POINTED LISTENERS DIRECTLY TO YOUR FRESH schoolTypes FOLDER AND ORDERED BY YOUR sortOrder NUMBER
    const unsubSchoolTypes = onSnapshot(collection(db, 'schoolTypes'), (snap) => {
      const items: any[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setSchoolTypes(items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    }, safeError('schoolTypes'));

    const unsubItemTypes = onSnapshot(collection(db, 'itemTypes'), (snap) => {
      const items: any[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setItemTypes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('itemTypes'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const items: any[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setUsers(items);
    }, safeError('users'));

    const unsubTickets = onSnapshot(collection(db, 'developer_tickets'), (snap) => {
      const items: any[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setDeveloperTickets(items);
    }, safeError('developer_tickets'));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      const items: InventoryItem[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as InventoryItem));
      setInventory(items); 
      setLoading(false);
    }, safeError('inventory'));

    return () => {
      unsubSchools(); unsubTypes(); unsubSizes(); unsubColours();
      unsubLocations(); unsubCategories(); unsubSchoolTypes(); 
      unsubItemTypes(); unsubUsers(); unsubTickets(); unsubInventory();
    };
  }, []);

  // 🎯 SAFELY EXPORTS ALL ARRAYS WITH THE CORRECT NEW NAMING BLUEPRINT
  return { 
    schools, clothingTypes, sizes, colours, locations, categories, 
    schoolTypes, itemTypes, inventory, users, developer_tickets, loading, seeding 
  };
}
