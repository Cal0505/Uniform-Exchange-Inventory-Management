// ==========================================
// 🚀 FIRESTORE CENTRAL MIGRATION ENGINE
// ==========================================
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import * as path from 'path';

// 📑 Helper Function to parse standalone Excel workbooks into raw JSON matrices
const parseExcelFile = (fileName: string): any[] => {
  try {
    const workbookPath = path.join(__dirname, fileName);
    const workbook = XLSX.readFile(workbookPath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json<any>(worksheet, { raw: false });
  } catch (error: any) {
    console.error(`❌ Failed to read spreadsheet layer [${fileName}]:`, error.message);
    return [];
  }
};

export const runDatabaseSeeder = async (): Promise<void> => {
  console.log("⚡ INITIATING CENTRAL DATABASE EXCEL SEEDER MATRIX...");

  // 1️⃣ INGEST INDEPENDENT WORKBOOKS DYNAMICALLY
  const rawSchools = parseExcelFile('schools.xlsx');
  const rawColours = parseExcelFile('colours.xlsx');
  const rawGarments = parseExcelFile('garment_types.xlsx');
  const rawSizes = parseExcelFile('sizes.xlsx');
  const rawLocations = parseExcelFile('locations.xlsx');
  const rawSchoolTypes = parseExcelFile('school_types.xlsx');

  // 2️⃣ SANITIZE DATA ARRAYS BASED ON YOUR INSTALLED FILE HEADERS
  const schoolsList = rawSchools.map(row => ({
    skuCode: String(row['SKUprefix'] || '').trim(),
    name: String(row['School Name'] || '').trim(),
    schoolType: String(row['Type id'] || '').trim(),
    schoolIdCode: String(row['Key'] || '').trim(),
    logoUrl: row['School Logo'] ? String(row['School Logo']).trim() : null
  })).filter(s => s.skuCode);

  const coloursList = rawColours.map(row => ({
    prefix: String(row['SKUprefix'] || '').trim(),
    name: String(row['colour name'] || '').trim()
  })).filter(c => c.prefix);

  const garmentsList = rawGarments.map(row => ({
    skuPrefix: String(row['Type_ID'] || '').trim(),
    name: String(row['Type'] || '').trim(),
    hasLogo: String(row['Logo'] || '').toLowerCase() === 'true',
    hasPlain: String(row['Plain'] || '').toLowerCase() === 'true'
  })).filter(g => g.skuPrefix);

  const sizesList = rawSizes.map(row => ({
    category: String(row['Catagory'] || '').trim(),
    sizeId: String(row['Size_ID'] || '').trim(),
    name: String(row['Size'] || '').trim()
  })).filter(sz => sz.name);

  const locationsList = rawLocations.map(row => ({
    name: String(row['Name'] || '').trim(),
    label: String(row['Label'] || '').trim(),
    skuPrefix: String(row['SKUprefix'] || '').trim()
  })).filter(l => l.skuPrefix);

  const schoolTypesList = rawSchoolTypes.map(row => ({
    id: String(row['id'] || String(row['Type_ID'] || '')).trim(),
    name: String(row['name'] || String(row['Type'] || '')).trim()
  })).filter(st => st.id);

  // Fallback system categories structural configurations laws
  const categoriesList = [
    { name: "Logo", id: "LOGO", skuPrefix: "L", packagingType: "Both", hasSchools: true },
    { name: "Plain", id: "PLAIN", skuPrefix: "P", packagingType: "VacPac", hasSchools: false }
  ];

  // 3️⃣ WRITE CORE REFERENCE LOOKUP PARAMETERS TO STORAGE
  console.log("📥 WRITING REFERENCE PARAMETERS TO FIRESTORE LOOKUP TARGETS...");
  const refBatch = writeBatch(db);

  schoolsList.forEach(s => refBatch.set(doc(collection(db, 'schools')), s));
  categoriesList.forEach(c => refBatch.set(doc(collection(db, 'categories')), c));
  coloursList.forEach(col => refBatch.set(doc(collection(db, 'colours')), { label: col.name, name: col.name, skuCode: col.prefix }));
  locationsList.forEach(loc => refBatch.set(doc(collection(db, 'locations')), { label: loc.label, name: loc.name, skuCode: loc.skuPrefix }));
  schoolTypesList.forEach(st => refBatch.set(doc(collection(db, 'schoolTypes')), st));
  
  garmentsList.forEach(g => {
    refBatch.set(doc(collection(db, 'clothingTypes')), { name: g.name, skuCode: g.skuPrefix });
  });
  
  sizesList.forEach((sz) => {
    refBatch.set(doc(collection(db, 'sizes')), { label: sz.name, name: sz.name, categoryGroup: sz.category, skuCode: sz.sizeId });
  });

  await refBatch.commit();
  console.log("✅ REFERENCE LOOKUP COLLECTION INJECTION COMPLETE.");

  // 4️⃣ STOCHASTIC VARIATION PERMUTATION ENGINE (3,000 TARGETS)
  console.log("🎲 COLLECTING VARIATION MATRICES FOR 3000 UNIQUE ITEMS...");
  const seedItems: any[] = [];
  const uniqueKeysTrack = new Set<string>();
  const TARGET_COUNT = 3000;

  const sample = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Group size entries matching your file's explicit tab classifications
  const getSizesByGroup = (groupName: string) => sizesList.filter(s => s.category === groupName).map(s => s.name);

  const clothesSizes = getSizesByGroup('Clothes');
  const boysShoesSizes = getSizesByGroup('Boys_Shoes');
  const girlsShoesSizes = getSizesByGroup('Girls_Shoes');
  const boysSocksSizes = getSizesByGroup('Boys_Socks');
  const girlsSocksSizes = getSizesByGroup('Girls_Socks');
  const boysCozySocks = getSizesByGroup('Boys_Cozy_Socks');
  const girlsCozySocks = getSizesByGroup('Girls_Cozy_Socks');
  const boysHatSizes = getSizesByGroup('Boys_Hat_sets');
  const girlsHatSizes = getSizesByGroup('Girls_Hat_sets');
  const universalOneSize = getSizesByGroup('One_Size');

  while (seedItems.length < TARGET_COUNT) {
    const randomGarment = sample(garmentsList);
    const randomColourObj = sample(coloursList);
    const randomCategory = sample(categoriesList);
    
    // Evaluate matching size taxonomy based on product type context strings
    let relevantSizes = clothesSizes.length > 0 ? clothesSizes : sizesList.map(s => s.name);
    const garmentName = randomGarment.name.toLowerCase();

    if (garmentName.includes("shoe")) {
      if (garmentName.includes("girl") && girlsShoesSizes.length > 0) relevantSizes = girlsShoesSizes;
      else if (boysShoesSizes.length > 0) relevantSizes = boysShoesSizes;
    } 
    else if (garmentName.includes("sock")) {
      if (garmentName.includes("cozy") || garmentName.includes("cosy")) {
        if (garmentName.includes("girl") && girlsCozySocks.length > 0) relevantSizes = girlsCozySocks;
        else if (boysCozySocks.length > 0) relevantSizes = boysCozySocks;
      } else {
        if (garmentName.includes("girl") && girlsSocksSizes.length > 0) relevantSizes = girlsSocksSizes;
        else if (boysSocksSizes.length > 0) relevantSizes = boysSocksSizes;
      }
    } 
    else if (garmentName.includes("hat") || garmentName.includes("cap") || garmentName.includes("set")) {
      if (garmentName.includes("girl") && girlsHatSizes.length > 0) relevantSizes = girlsHatSizes;
      else if (boysHatSizes.length > 0) relevantSizes = boysHatSizes;
    } 
    else if ((garmentName.includes("bag") || garmentName.includes("tie")) && universalOneSize.length > 0) {
      relevantSizes = universalOneSize;
    }

    const randomSize = sample(relevantSizes);
    const randomSchool = randomCategory.hasSchools && schoolsList.length > 0 ? sample(schoolsList) : null;

    const schoolUniqueId = randomSchool ? randomSchool.skuCode : "PLAIN";
    const integrityKey = `${randomGarment.name}|${randomColourObj.prefix}|${randomSize}|${randomCategory.id}|${schoolUniqueId}`;

    if (!uniqueKeysTrack.has(integrityKey)) {
      uniqueKeysTrack.add(integrityKey);

      const generatedName = randomSchool 
        ? `[${randomSchool.skuCode}] ${randomGarment.name.replace(/_/g, ' ')} - ${randomColourObj.name}`
        : `[PLAIN] ${randomGarment.name.replace(/_/g, ' ')} - ${randomColourObj.name}`;

      const randomQuantity = Math.floor(Math.random() * 150) + 1;
      const randomLocation = sample(locationsList);

      const cleanSizeCode = randomSize.replace(/[^a-zA-Z0-9]/g, '');
      const generatedSku = `${randomCategory.skuPrefix}-${randomColourObj.prefix}-${cleanSizeCode}`.toUpperCase();

      seedItems.push({
        name: generatedName,
        sku: generatedSku,
        category: randomCategory.name,
        categoryId: randomCategory.id,
        schoolName: randomSchool ? randomSchool.name : "Plain Catalog",
        schoolId: schoolUniqueId,
        schoolLogo: randomSchool ? randomSchool.logoUrl : null,
        garmentType: randomGarment.name,
        colour: randomColourObj.name,
        colourSku: randomColourObj.prefix,
        size: randomSize,
        quantity: randomQuantity,
        location: randomLocation.name,
        locationSku: randomLocation.skuPrefix,
        timestamp: new Date()
      });
    }
  }

  // 5️⃣ CHUNKED TRANSACTION BLOCK DISPATCHER
  console.log(`📊 BULK UPLOADING ${seedItems.length} ADAPTIVE BLOCKS TO INVENTORY...`);
  const CHUNK_SIZE = 400;
  for (let i = 0; i < seedItems.length; i += CHUNK_SIZE) {
    const currentChunk = seedItems.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    currentChunk.forEach((item) => {
      const newDocRef = doc(collection(db, 'inventory'));
      batch.set(newDocRef, item);
    });

    await batch.commit();
    console.log(`Uploaded chunk containing indices ${i} to ${Math.min(i + CHUNK_SIZE, seedItems.length)}`);
  }

  console.log("🏁 MIGRATION MATRIX COMPLETED SUCCESSFULLY.");
};
