import { db } from './firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

export const runDatabaseSeeder = async (): Promise<void> => {
  console.log("⚡ INITIATING SEEDER WITH FIXED MASTER CONFIGURATIONS...");

  // 1️⃣ FIXED ROOT SPECIFICATIONS
  const schoolsList = [
    { name: "Oakwood Primary Academy", skuCode: "OAKP", schoolType: "JIN", schoolIdCode: "OAKP-01" },
    { name: "Huddersfield Secondary School", skuCode: "HUDS", schoolType: "H", schoolIdCode: "HUDS-02" },
    { name: "St. Mary's Catholic Infants", skuCode: "STMI", schoolType: "IN", schoolIdCode: "STMI-03" },
    { name: "Green Valley High School", skuCode: "GVEH", schoolType: "H", schoolIdCode: "GVEH-04" },
    { name: "Pennine Community Middle School", skuCode: "PENN", schoolType: "M", schoolIdCode: "PENN-05" },
    { name: "Castle Hill Prep School", skuCode: "CSTH", schoolType: "JIN", schoolIdCode: "CSTH-06" },
    { name: "Highfield Grammar Academy", skuCode: "HFGA", schoolType: "H", schoolIdCode: "HFGA-07" },
    { name: "Westgate Primary School", skuCode: "WSTP", schoolType: "JIN", schoolIdCode: "WSTP-08" }
  ];

  const categoriesList = [
    { name: "Logo", id: "LOGO", skuPrefix: "L", packagingType: "Both", hasSchools: true },
    { name: "Plain", id: "PLAIN", skuPrefix: "P", packagingType: "VacPac", hasSchools: false }
  ];

  const garmentTypes = [
    "V-Neck Knitted Jumper",
    "Crewneck Fleece Sweatshirt",
    "Embroidered Polo Shirt",
    "Tailored Slim Trousers",
    "Pleated School Skirt",
    "Heavy Duty Waterproof Parka",
    "Formal Button-Up Shirt",
    "Athletic Cotton PE Shorts",
    "Padded Winter Gilet",
    "Premium Leather School Shoes"
  ];

  const colours = [
    "Navy Blue",
    "Bottle Green",
    "Burgundy Maroon",
    "Charcoal Grey",
    "Jet Black",
    "Classic Amber"
  ];

  const shoeSizes = [
    "Kids Size 1",
    "Kids Size 2",
    "Kids Size 3",
    "Ladies Size 4",
    "Ladies Size 5",
    "Ladies Size 6",
    "Ladies Size 7",
    "Ladies Size 8",
    "Ladies Size 9",
    "Ladies Size 10",
    "Ladies Size 11",
    "Ladies Size 12"
  ];

  const kidsSizes = [
    "1-2 Yrs",
    "3-4 Yrs",
    "5-6 Yrs",
    "7-8 Yrs",
    "9-10 Yrs",
    "11-12 Yrs",
    "13-14 Yrs",
    "15-16 Yrs",
    "16-17 Yrs"
  ];

  const waistSizes = [
    "Waist 24\"",
    "Waist 26\"",
    "Waist 28\"",
    "Waist 30\"",
    "Waist 32\"",
    "Waist 34\"",
    "Waist 36\""
  ];

  const chestSizes = [
    "Chest 28\"",
    "Chest 30\"",
    "Chest 32\"",
    "Chest 34\"",
    "Chest 36\"",
    "Chest 38\"",
    "Chest 40\""
  ];

  const ladiesSizes = [
    "Ladies Size 6",
    "Ladies Size 8",
    "Ladies Size 10",
    "Ladies Size 12",
    "Ladies Size 14",
    "Ladies Size 16"
  ];

  const generateLocations = (): string[] => {
    const locs: string[] = ["Pickers Shelf Front", "VacPack Sealed Box 1", "VacPack Sealed Box 2", "Overstock Bay 4"];
    const rows = ["A", "B", "C", "D", "E", "F", "G", "R", "X", "Z"];
    for (let r of rows) { for (let i = 1; i <= 10; i++) { locs.push(`Shelf Row ${r}${i}`); } }
    return locs;
  };
  const locationPool = generateLocations();

  // 🏢 SEED FIXED ROOT SCHEMAS INTO LOOKUP TABLES
  console.log("📥 COMMITTING ROOT CONFIGURATIONS...");
  const refBatch = writeBatch(db);

  schoolsList.forEach(s => refBatch.set(doc(collection(db, 'schools')), s));
  categoriesList.forEach(c => refBatch.set(doc(collection(db, 'categories')), c));
  garmentTypes.forEach((g, idx) => refBatch.set(doc(collection(db, 'clothingTypes')), { name: g, skuCode: `GAR-${100 + idx}` }));
  colours.forEach((col, idx) => refBatch.set(doc(collection(db, 'colours')), { label: col, name: col, skuCode: `COL-${100 + idx}` }));
  
  const unifiedSizes = Array.from(new Set([...shoeSizes, ...kidsSizes, ...waistSizes, ...chestSizes, ...ladiesSizes]));
  unifiedSizes.forEach((sz, idx) => refBatch.set(doc(collection(db, 'sizes')), { label: sz, name: sz, skuCode: `SIZ-${100 + idx}` }));
  locationPool.slice(0, 30).forEach((loc, idx) => refBatch.set(doc(collection(db, 'locations')), { label: loc, name: loc, skuCode: `LOC-${100 + idx}` }));

  await refBatch.commit();
  // 3️⃣ COMBINATORICS COMBINATIONS MATRIX ENGINE
  let seedItems: any[] = [];
  let itemCounter = 0;

  for (let gType of garmentTypes) {
    for (let col of colours) {
      let currentSizeArray = kidsSizes;
      if (gType.includes("Shoes")) currentSizeArray = shoeSizes;
      else if (gType.includes("Trousers")) currentSizeArray = waistSizes;
      else if (gType.includes("Skirt")) currentSizeArray = ladiesSizes;
      else if (gType.includes("Jumper") || gType.includes("Shirt")) currentSizeArray = chestSizes;

      for (let sizeStr of currentSizeArray) {
        for (let cat of categoriesList) {
          const isLogoItem = cat.id === "LOGO";
          const associatedSchool = isLogoItem ? schoolsList[itemCounter % schoolsList.length] : null;
          
          const generatedName = associatedSchool 
            ? `[${associatedSchool.skuCode}] ${gType} - ${col}`
            : `[PLAIN] ${gType} - ${col}`;

          const randomQuantity = Math.floor(Math.random() * 99) + 1;
          const assignedLocation = locationPool[itemCounter % locationPool.length];

          seedItems.push({
            name: generatedName,
            category: cat.name,
            categoryId: cat.id,
            schoolName: associatedSchool ? associatedSchool.name : "Plain Catalog",
            schoolId: associatedSchool ? associatedSchool.skuCode : "PLAIN",
            garmentType: gType,
            colour: col,
            size: sizeStr,
            quantity: randomQuantity,
            location: assignedLocation,
            timestamp: new Date()
          });

          itemCounter++;
        }
      }
    }
  }

  console.log(`📊 PUMPING 3,000+ ADAPTIVE CHUNKS FOR SPECIFIC FIXED TIERS: Total items: ${seedItems.length}`);

  const CHUNK_SIZE = 400;
  for (let i = 0; i < seedItems.length; i += CHUNK_SIZE) {
    const currentChunk = seedItems.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    currentChunk.forEach((item) => {
      const newDocRef = doc(collection(db, 'inventory'));
      batch.set(newDocRef, item);
    });

    await batch.commit();
  }

  console.log("🏁 DATA INJECTION REFRESH COMPLETE.");
};
