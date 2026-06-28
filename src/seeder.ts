import { collection, getDocs, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { generateSkuid } from './skuUtils';

const defaultSchools = [
  { id: 'school_1', name: 'All Hallows Primary', skuCode: 'JINAHW' },
  { id: 'school_2', name: "St Jude's Academy", skuCode: 'STJUDE' },
  { id: 'school_3', name: 'Oakridge High', skuCode: 'OAKRIDGE' },
  { id: 'school_4', name: 'Almondbury Community', skuCode: 'ALMOND' },
  { id: 'school_5', name: 'Dalton School', skuCode: 'DALTON' },
];

const defaultClothingTypes = [
  { id: 'type_1', name: 'Unisex_Polo_Shirts', skuCode: 'UPSH' },
  { id: 'type_2', name: 'Knitwear_Cardigan', skuCode: 'KCAR' },
  { id: 'type_3', name: 'Blazer_Jacket', skuCode: 'BLAZ' },
  { id: 'type_4', name: 'Sweatshirt_Jumper', skuCode: 'SWEAT' },
];

const defaultSizes = [
  { id: 'size_1', label: '3-4yrs', skuCode: '0304' },
  { id: 'size_2', label: '5-6yrs', skuCode: '0506' },
  { id: 'size_3', label: '7-8yrs', skuCode: '0708' },
  { id: 'size_4', label: '9-10yrs', skuCode: '0910' },
  { id: 'size_5', label: 'S', skuCode: 'S' },
  { id: 'size_6', label: 'M', skuCode: 'M' },
  { id: 'size_7', label: 'L', skuCode: 'L' },
];

const defaultColours = [
  { id: 'colour_1', name: 'Red', skuCode: 'RED' },
  { id: 'colour_2', name: 'Navy Blue', skuCode: 'NAVY' },
  { id: 'colour_3', name: 'Bottle Green', skuCode: 'BOTTLE' },
  { id: 'colour_4', name: 'Royal Blue', skuCode: 'ROYAL' },
];

const defaultLocations = [
  { id: 'loc_1', name: 'Under Office', skuCode: 'UO', ruleProfile: 'VacPac Storage Area' as const },
  { id: 'loc_2', name: 'North Warehouse Bays', skuCode: 'NW', ruleProfile: 'VacPac Storage Area' as const },
  { id: 'loc_3', name: 'Main Front Counter', skuCode: 'FC', ruleProfile: 'Pickers Shelf' as const },
];

const defaultCategories = [
  { id: 'cat_1', name: 'Plain', skuCode: 'PLAIN' },
  { id: 'cat_2', name: 'Logo', skuCode: 'LOGO' },
];

const defaultItemTypes = [
  { id: 'itemtype_1', name: 'single', skuCode: 'SINGLE' },
  { id: 'itemtype_2', name: 'vacpac', skuCode: 'VACPAC' },
];

export async function seedDatabaseIfEmpty() {
  const checkEmpty = async (collName: string) => {
    try {
      const snap = await getDocs(collection(db, collName));
      return snap.empty;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, collName);
      return false;
    }
  };

  try {
    let seededMetadata = false;
    if (await checkEmpty('schools')) {
      for (const item of defaultSchools) {
        await setDoc(doc(db, 'schools', item.id), item);
      }
      seededMetadata = true;
    }
    if (await checkEmpty('clothingTypes')) {
      for (const item of defaultClothingTypes) {
        await setDoc(doc(db, 'clothingTypes', item.id), item);
      }
      seededMetadata = true;
    }
    if (await checkEmpty('sizes')) {
      for (const item of defaultSizes) {
        await setDoc(doc(db, 'sizes', item.id), item);
      }
      seededMetadata = true;
    }
    if (await checkEmpty('colours')) {
      for (const item of defaultColours) {
        await setDoc(doc(db, 'colours', item.id), item);
      }
      seededMetadata = true;
    }
    if (await checkEmpty('locations')) {
      for (const item of defaultLocations) {
        await setDoc(doc(db, 'locations', item.id), item);
      }
      seededMetadata = true;
    }
    if (await checkEmpty('categories')) {
      for (const item of defaultCategories) {
        await setDoc(doc(db, 'categories', item.id), item);
      }
      seededMetadata = true;
    }
    if (await checkEmpty('itemTypes')) {
      for (const item of defaultItemTypes) {
        await setDoc(doc(db, 'itemTypes', item.id), item);
      }
      seededMetadata = true;
    }

    // Check if inventory is empty. If it is, seed the 100 demo items with 5-30 qty in both configurations!
    if (await checkEmpty('inventory')) {
      // Fetch metadata to seed inventory
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const schoolsList = schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const typesSnap = await getDocs(collection(db, 'clothingTypes'));
      const typesList = typesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const sizesSnap = await getDocs(collection(db, 'sizes'));
      const sizesList = sizesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const coloursSnap = await getDocs(collection(db, 'colours'));
      const coloursList = coloursSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const locationsSnap = await getDocs(collection(db, 'locations'));
      const locationsList = locationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      await seedDemoInventory(
        schoolsList,
        typesList,
        sizesList,
        coloursList,
        locationsList
      );
    }
  } catch (err) {
    console.error('Error seeding collections:', err);
  }
}

// Seeds exactly 100 unique items, with quantities between 5 and 30, in BOTH a VacPac and Pickers Shelf location
export async function seedDemoInventory(
  schools: any[],
  clothingTypes: any[],
  sizes: any[],
  colours: any[],
  locations: any[],
  onProgress?: (progress: number) => void
) {
  if (!schools.length || !clothingTypes.length || !sizes.length || !colours.length || !locations.length) {
    throw new Error("Metadata must be fully populated to seed inventory.");
  }

  const pickerLocs = locations.filter(l => l.ruleProfile === 'Pickers Shelf');
  const storageLocs = locations.filter(l => l.ruleProfile === 'VacPac Storage Area');

  const defaultPickerLoc = pickerLocs[0] || locations.find(l => l.ruleProfile === 'Pickers Shelf') || locations[0];
  const defaultStorageLocs = storageLocs.length > 0 ? storageLocs : [locations[0]];

  // Generate exactly 100 unique combinations of (school, type, size, colour)
  const uniqueCombinations = new Set<string>();
  const combinationsList: Array<{
    school: any;
    type: any;
    size: any;
    colour: any;
  }> = [];

  let attempts = 0;
  while (combinationsList.length < 100 && attempts < 5000) {
    attempts++;
    const school = schools[Math.floor(Math.random() * schools.length)];
    const type = clothingTypes[Math.floor(Math.random() * clothingTypes.length)];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const colour = colours[Math.floor(Math.random() * colours.length)];

    const key = `${school.id}-${type.id}-${size.id}-${colour.id}`;
    if (!uniqueCombinations.has(key)) {
      uniqueCombinations.add(key);
      combinationsList.push({ school, type, size, colour });
    }
  }

  let batch = writeBatch(db);
  let batchSize = 0;
  let itemsSeeded = 0;

  for (const combo of combinationsList) {
    const { school, type, size, colour } = combo;
    const category: 'Plain' | 'Logo' = Math.random() > 0.5 ? 'Logo' : 'Plain';

    // 1. Pickers Shelf ("single") item
    const rowLetter = String.fromCharCode(65 + Math.floor(Math.random() * 10)); // A-J
    const colNum = Math.floor(Math.random() * 10) + 1; // 1-10
    const shelfCode = `${rowLetter}${colNum}`;

    const singleSkuid = generateSkuid({
      ruleProfile: 'Pickers Shelf',
      locationSku: defaultPickerLoc.skuCode,
      shelfCode,
      schoolSku: school.skuCode,
      colourSku: colour.skuCode,
      typeSku: type.skuCode,
      sizeSku: size.skuCode,
    });

    const singleDocId = `${singleSkuid}_${shelfCode}`;
    const singleDocRef = doc(db, 'inventory', singleDocId);

    // Qty between 5 and 30
    const qtySingle = Math.floor(Math.random() * 26) + 5;

    batch.set(singleDocRef, {
      id: singleDocId,
      skuid: singleSkuid,
      type: 'single',
      category,
      locationId: defaultPickerLoc.id,
      locationSku: defaultPickerLoc.skuCode,
      shelfCode,
      schoolId: school.id,
      schoolSku: school.skuCode,
      colourId: colour.id,
      colourSku: colour.skuCode,
      typeId: type.id,
      typeSku: type.skuCode,
      sizeId: size.id,
      sizeSku: size.skuCode,
      quantity: qtySingle,
      updatedAt: serverTimestamp(),
    });

    // 2. VacPac ("vacpac") item
    const packNumber = Math.floor(Math.random() * 100) + 1;
    const storageLoc = defaultStorageLocs[Math.floor(Math.random() * defaultStorageLocs.length)];

    const vacpacSkuid = generateSkuid({
      ruleProfile: 'VacPac Storage Area',
      locationSku: storageLoc.skuCode,
      packNumber,
      schoolSku: school.skuCode,
      colourSku: colour.skuCode,
      typeSku: type.skuCode,
      sizeSku: size.skuCode,
    });

    const vacpacDocRef = doc(db, 'inventory', vacpacSkuid);

    // Qty between 5 and 30
    const qtyVacpac = Math.floor(Math.random() * 26) + 5;

    batch.set(vacpacDocRef, {
      id: vacpacSkuid,
      skuid: vacpacSkuid,
      type: 'vacpac',
      category,
      locationId: storageLoc.id,
      locationSku: storageLoc.skuCode,
      packNumber,
      schoolId: school.id,
      schoolSku: school.skuCode,
      colourId: colour.id,
      colourSku: colour.skuCode,
      typeId: type.id,
      typeSku: type.skuCode,
      sizeId: size.id,
      sizeSku: size.skuCode,
      quantity: qtyVacpac,
      updatedAt: serverTimestamp(),
    });

    batchSize += 2;
    itemsSeeded++;

    // Committing in batches
    if (batchSize >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchSize = 0;
      if (onProgress) {
        onProgress(itemsSeeded);
      }
    }
  }

  if (batchSize > 0) {
    await batch.commit();
    if (onProgress) {
      onProgress(itemsSeeded);
    }
  }
}

// Purges ALL inventory items from the database
export async function clearInventoryCollection() {
// 🎯 ALIGN THIS WORD EXACTLY TO YOUR REAL CLOUD FOLDER NAME:
const qSnap = await getDocs(collection(db, 'inventory'));

  if (qSnap.empty) return;

  let batch = writeBatch(db);
  let batchSize = 0;

  for (const docSnap of qSnap.docs) {
    batch.delete(docSnap.ref);
    batchSize++;
    if (batchSize >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }
}
