// ==========================================
// 🚀 FIRESTORE CENTRAL MIGRATION ENGINE
// ==========================================
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import * as path from 'path';

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

  const rawSchools = parseExcelFile('School.xlsx');
  const rawColours = parseExcelFile('Colour.xlsx');
  const rawGarments = parseExcelFile('Clothing_Type.xlsx');
  const rawSizes = parseExcelFile('Size.xlsx');
  const rawLocations = parseExcelFile('Location.xlsx');
  const rawSchoolTypes = parseExcelFile('School_type.xlsx');

  const schoolsList = rawSchools.map(row => ({
    skuCode: String(row['SKUprefix'] || '').trim(),
    name: String(row['School Name'] || '').trim(),
    schoolType: String(row['Type id'] || '').trim(),
    schoolIdCode: String(row['Key'] || '').trim(),
    logoUrl: row['School Logo'] ? String(row['School Logo']).trim() : null
  })).filter(s => s.skuCode);

  const ColourList = rawColours.map(row => ({
    prefix: String(row['SKUprefix'] || '').trim(),
    name: String(row['colour name'] || '').trim()
  })).filter(c => c.prefix);

  const garmentsList = rawGarments.map(row => ({
    skuPrefix: String(row['Type_ID'] || '').trim(),
    name: String(row['Type'] || '').trim(),
    hasLogo: String(row['Logo'] || '').toLowerCase() === 'true',
    hasPlain: String(row['Plain'] || '').toLowerCase() === 'true'
  })).filter(g => g.skuPrefix);

  const SizeList = rawSizes.map(row => ({
    category: String(row['Catagory'] || '').trim(),
    sizeId: String(row['Size_ID'] || '').trim(),
    name: String(row['Size'] || '').trim()
  })).filter(sz => sz.name);

  const LocationList = rawLocations.map(row => ({
    name: String(row['Name'] || '').trim(),
    label: String(row['Label'] || '').trim(),
    skuPrefix: String(row['SKUprefix'] || '').trim()
  })).filter(l => l.skuPrefix);

  // FIX: Renamed variable to SchoolTypeList to remove invalid space
  const SchoolTypeList = rawSchoolTypes.map(row => ({
    id: String(row['id'] || String(row['Type_ID'] || '')).trim(),
    name: String(row['name'] || String(row['Type'] || '')).trim()
  })).filter(st => st.id);

  const categoriesList = [
    { name: "Logo", id: "LOGO", skuPrefix: "L", packagingType: "Both", hasSchools: true },
    { name: "Plain", id: "PLAIN", skuPrefix: "P", packagingType: "VacPac", hasSchools: false }
  ];

  console.log("📥 WRITING REFERENCE PARAMETERS TO FIRESTORE...");
  const refBatch = writeBatch(db);

  schoolsList.forEach(s => refBatch.set(doc(collection(db, 'schools')), s));
  categoriesList.forEach(c => refBatch.set(doc(collection(db, 'categories')), c));
  ColourList.forEach(col => refBatch.set(doc(collection(db, 'Colour')), { label: col.name, name: col.name, skuCode: col.prefix }));
  LocationList.forEach(loc => refBatch.set(doc(collection(db, 'Location')), { label: loc.label, name: loc.name, skuCode: loc.skuPrefix }));
  
  // FIX: Using corrected variable and matching collection name
  SchoolTypeList.forEach(st => refBatch.set(doc(collection(db, 'School_Type')), st));
  
  garmentsList.forEach(g => {
    refBatch.set(doc(collection(db, 'Clothing_Type')), { name: g.name, skuCode: g.skuPrefix });
  });
  
  SizeList.forEach((sz) => {
    refBatch.set(doc(collection(db, 'Size')), { label: sz.name, name: sz.name, categoryGroup: sz.category, skuCode: sz.sizeId });
  });

  await refBatch.commit();
  console.log("✅ REFERENCE LOOKUP COLLECTION INJECTION COMPLETE.");

  // ... [Stochastic Permutation Engine logic continues same as before] ...
  console.log("🏁 MIGRATION MATRIX COMPLETED SUCCESSFULLY.");
};