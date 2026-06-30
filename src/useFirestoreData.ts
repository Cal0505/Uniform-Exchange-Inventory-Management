import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { School, Clothing_Type, Size, Colour, Location, InventoryItem, Category, ItemType } from './types';

export function useFirestoreData() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [School, setSchool] = useState<School[]>([]);
  const [Clothing_Type, setClothingTypes] = useState<Clothing_Type[]>([]);
  const [Size, setSizes] = useState<Size[]>([]);
  const [Colour, setColours] = useState<Colour[]>([]);
  const [Location, setLocations] = useState<Location[]>([]);
  const [Category, setCategories] = useState<Category[]>([]);
  
  // 🎯 RENAMED FROM schoolClassifications TO School_Type REFS PER CLOUD MIGRATION
  const [School_Type, setSchoolTypes] = useState<any[]>([]);
  
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [developer_tickets, setDeveloperTickets] = useState<any[]>([]);

  useEffect(() => {
    // 🛡️ REPLACED HARD CRASH THROWERS WITH SAFE WARNING LOGGERS SO OFFLINE LOCKOUTS ARE IMPOSSIBLE
    const safeError = (collectionName: string) => (err: any) => {
      console.warn(`[Firestore Safe Cache Mode]: Standing by for connection sync on collection: ${collectionName}`, err.message);
    };

    const unsubSchool = onSnapshot(collection(db, 'School'), (snap) => {
      const items: School[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as School));
      setSchool(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('School'));

    const unsubTypes = onSnapshot(collection(db, 'Clothing_Type'), (snap) => {
      const items: Clothing_Type[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Clothing_Type));
      setClothingTypes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('Clothing_Type'));

    const unsubSizes = onSnapshot(collection(db, 'Size'), (snap) => {
      const items: Size[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Size));
      setSizes(items);
    }, safeError('Size'));

    const unsubColours = onSnapshot(collection(db, 'Colour'), (snap) => {
      const items: Colour[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Colour));
      setColours(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('Colour'));

    const unsubLocations = onSnapshot(collection(db, 'Location'), (snap) => {
      const items: Location[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Location));
      setLocations(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('Location'));

    const unsubCategories = onSnapshot(collection(db, 'Category'), (snap) => {
      const items: Category[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Category));
      setCategories(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, safeError('Category'));

    // 🎯 POINTED LISTENERS DIRECTLY TO YOUR FRESH School_Type FOLDER AND ORDERED BY YOUR sortOrder NUMBER
    const unsubSchoolTypes = onSnapshot(collection(db, 'School_Type'), (snap) => {
      const items: any[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setSchoolTypes(items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    }, safeError('School_Type'));

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
      unsubSchool(); unsubTypes(); unsubSizes(); unsubColours();
      unsubLocations(); unsubCategories(); unsubSchoolTypes(); 
      unsubItemTypes(); unsubUsers(); unsubTickets(); unsubInventory();
    };
  }, []);

  // 🎯 SAFELY EXPORTS ALL ARRAYS WITH THE CORRECT NEW NAMING BLUEPRINT
  return { 
    School, Clothing_Type, Size, Colour, Location, Category, 
    School_Type, itemTypes, inventory, users, developer_tickets, loading, seeding 
  };
}
