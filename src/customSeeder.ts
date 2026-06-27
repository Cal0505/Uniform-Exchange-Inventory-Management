import { db } from './firebase';
import { collection, getDocs, addDoc, writeBatch } from 'firebase/firestore';

// 💥 DESTRUCTIVE MACRO: Cleans out the primary stock rows collection entirely
export async function clearInventoryToZero() {
  const snap = await getDocs(collection(db, 'inventory'));
  if (snap.empty) return;

  let batch = writeBatch(db);
  let size = 0;
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    size++;
    if (size >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      size = 0;
    }
  }
  if (size > 0) {
    await batch.commit();
  }
}

// 🌱 SMART VARIABLE SEEDER ENGINE: Mixes and matches dynamic parameters on-demand
export async function seedSchools() {
  // Clear warehouse inventory tracking rows first
  await clearInventoryToZero();

  // Fetch all mutable parameter configurations currently inside your live database collections
  const [catSnap, schoolSnap, typeSnap, sizeSnap, colSnap, locSnap] = await Promise.all([
    getDocs(collection(db, 'categories')),
    getDocs(collection(db, 'schools')),
    getDocs(collection(db, 'clothingTypes')),
    getDocs(collection(db, 'sizes')),
    getDocs(collection(db, 'colours')),
    getDocs(collection(db, 'locations'))
  ]);

  if (catSnap.empty || typeSnap.empty || sizeSnap.empty) {
    throw new Error("Seeding Aborted: You must register at least one Category, Garment Type, and Size in the Admin panel before generating random stocks.");
  }

  const activeCategories = catSnap.docs.map(d => d.data());
  const activeSchools = schoolSnap.docs.map(d => d.data());
  const activeTypes = typeSnap.docs.map(d => d.data());
  const activeSizes = sizeSnap.docs.map(d => d.data());
  const activeColours = colSnap.docs.map(d => d.data());
  const activeLocations = locSnap.docs.map(d => d.data());

  // Helper helper function to grab a completely random element out of an active parameter array array
  const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

  // Generate 45 realistic, independent physical stock entries matching a flat spreadsheet matrix style
  for (let i = 0; i < 45; i++) {
    const chosenCategory = pickRandom(activeCategories);
    const chosenType = pickRandom(activeTypes);
    const chosenColour = activeColours.length > 0 ? pickRandom(activeColours).name : 'Navy_Blue';
    
    // Conditionally filter sizing codes based on the garment's preset size tag
    const matchingSizes = activeSizes.filter(s => s.sizeGroupTag === chosenType.sizeGroupTag);
    const chosenSize = matchingSizes.length > 0 ? pickRandom(matchingSizes).label : pickRandom(activeSizes).label;
    
    // Conditionally assign school anchors based on your category required rules flags
    let targetSchoolName = 'NONE';
    let targetSchoolSku = '';
    if (chosenCategory.requiresSchool && activeSchools.length > 0) {
      const schoolObj = pickRandom(activeSchools);
      targetSchoolName = schoolObj.name;
      targetSchoolSku = schoolObj.skuCode || '';
    }

    // Determine storage profile destinations
    const locationObj = activeLocations.length > 0 ? pickRandom(activeLocations) : { skuCode: 'PS', ruleProfile: 'Fixed Shelf' };

    const randomQuantity = Math.floor(Math.random() * 45) + 1; // Quantities range between 1 and 45 items

    await addDoc(collection(db, 'inventory'), {
      category: chosenCategory.name,
      school: targetSchoolName,
      garmentType: chosenType.name,
      size: chosenSize,
      colour: chosenColour,
      location: locationObj.skuCode,
      storageProfile: locationObj.ruleProfile || 'Fixed Shelf',
      quantity: randomQuantity,
      timestamp: new Date().toISOString()
    });
  }
}
