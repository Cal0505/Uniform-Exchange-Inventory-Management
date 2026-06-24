import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export interface RawSize {
  category: string;
  id: string;
  label: string;
}

export interface RawClothingType {
  id: string;
  name: string;
  logo: boolean;
  plain: boolean;
  new: boolean;
}

export const sizeList: RawSize[] = [
  { category: "Clothes", id: "s0102", label: "1-2yrs" },
  { category: "Clothes", id: "s0203", label: "2-3yrs" },
  { category: "Clothes", id: "s0304", label: "3-4yrs" },
  { category: "Clothes", id: "s0405", label: "4-5yrs" },
  { category: "Clothes", id: "s0506", label: "5-6yrs" },
  { category: "Clothes", id: "s0607", label: "6-7yrs" },
  { category: "Clothes", id: "s0708", label: "7-8yrs" },
  { category: "Clothes", id: "s0809", label: "8-9yrs" },
  { category: "Clothes", id: "s0910", label: "9-10yrs" },
  { category: "Clothes", id: "s1011", label: "10-11yrs" },
  { category: "Clothes", id: "s1112", label: "11-12yrs" },
  { category: "Clothes", id: "s1213", label: "12-13yrs" },
  { category: "Clothes", id: "s1314", label: "13-14yrs" },
  { category: "Clothes", id: "s1415", label: "14-15yrs" },
  { category: "Clothes", id: "s1516", label: "15-16yrs" },
  { category: "Clothes", id: "s1617", label: "16-17yrs" },
  { category: "Clothes", id: "s1718", label: "17-18yrs" },
  { category: "Clothes", id: "s1820", label: "18-20yrs" },
  { category: "Clothes", id: "sYOTH", label: "YTH" },
  { category: "Clothes", id: "sYOSM", label: "YS" },
  { category: "Clothes", id: "sYOME", label: "YM" },
  { category: "Clothes", id: "sYOLA", label: "YL" },
  { category: "Clothes", id: "sYOXL", label: "YXL" },
  { category: "Clothes", id: "sXXSM", label: "XXS" },
  { category: "Clothes", id: "sXSMA", label: "XS" },
  { category: "Clothes", id: "sSMAL", label: "Small" },
  { category: "Clothes", id: "sMEDI", label: "Medium" },
  { category: "Clothes", id: "sLARG", label: "Large" },
  { category: "Clothes", id: "sXLAR", label: "XL" },
  { category: "Clothes", id: "sXXLA", label: "XXL" },
  { category: "Clothes", id: "sXXXL", label: "XXXL" },
  { category: "Clothes", id: "sIZE6", label: "Size 6" },
  { category: "Clothes", id: "sIZE8", label: "Size 8" },
  { category: "Clothes", id: "sIZ10", label: "Size 10" },
  { category: "Clothes", id: "sIZ12", label: "Size 12" },
  { category: "Clothes", id: "sIZ14", label: "Size 14" },
  { category: "Clothes", id: "sIZ16", label: "Size 16" },
  { category: "Clothes", id: "sIZ18", label: "Size 18" },
  { category: "Clothes", id: "sIZ20", label: "Size 20" },
  { category: "Clothes", id: "sIZ22", label: "Size 22" },
  { category: "Clothes", id: "s15IN", label: "15\"" },
  { category: "Clothes", id: "s15.5", label: "15.5\"" },
  { category: "Clothes", id: "s16IN", label: "16\"" },
  { category: "Clothes", id: "s16.5", label: "16.5\"" },
  { category: "Clothes", id: "s17IN", label: "17\"" },
  { category: "Clothes", id: "s17.5", label: "17.5\"" },
  { category: "Clothes", id: "s18IN", label: "18\"" },
  { category: "Clothes", id: "s18.5", label: "18.5\"" },
  { category: "Clothes", id: "s19IN", label: "19\"" },
  { category: "Clothes", id: "s19.5", label: "19.5\"" },
  { category: "Clothes", id: "s20IN", label: "20\"" },
  { category: "Clothes", id: "s2022", label: "20\"-22\"" },
  { category: "Clothes", id: "s21IN", label: "21\"" },
  { category: "Clothes", id: "s22IN", label: "22\"" },
  { category: "Clothes", id: "s2224", label: "22\"-24\"" },
  { category: "Clothes", id: "s23IN", label: "23\"" },
  { category: "Clothes", id: "s24IN", label: "24\"" },
  { category: "Clothes", id: "s2426", label: "24\"-26\"" },
  { category: "Clothes", id: "s25IN", label: "25\"" },
  { category: "Clothes", id: "s26IN", label: "26\"" },
  { category: "Clothes", id: "s2628", label: "26\"-28\"" },
  { category: "Clothes", id: "s27IN", label: "27\"" },
  { category: "Clothes", id: "s28IN", label: "28\"" },
  { category: "Clothes", id: "s2830", label: "28\"-30\"" },
  { category: "Clothes", id: "s29IN", label: "29\"" },
  { category: "Clothes", id: "s30IN", label: "30\"" },
  { category: "Clothes", id: "s3032", label: "30\"-32\"" },
  { category: "Clothes", id: "s31IN", label: "31\"" },
  { category: "Clothes", id: "s32IN", label: "32\"" },
  { category: "Clothes", id: "s3234", label: "32\"-34\"" },
  { category: "Clothes", id: "s33IN", label: "33\"" },
  { category: "Clothes", id: "s34IN", label: "34\"" },
  { category: "Clothes", id: "s3436", label: "34\"-36\"" },
  { category: "Clothes", id: "s35IN", label: "35\"" },
  { category: "Clothes", id: "s36IN", label: "36\"" },
  { category: "Clothes", id: "s3638", label: "36\"-38\"" },
  { category: "Clothes", id: "s37IN", label: "37\"" },
  { category: "Clothes", id: "s38IN", label: "38\"" },
  { category: "Clothes", id: "s3840", label: "38\"-40\"" },
  { category: "Clothes", id: "s39IN", label: "39\"" },
  { category: "Clothes", id: "s40IN", label: "40\"" },
  { category: "Clothes", id: "s4042", label: "40\"-42\"" },
  { category: "Clothes", id: "s41IN", label: "41\"" },
  { category: "Clothes", id: "s42IN", label: "42\"" },
  { category: "Clothes", id: "s4244", label: "42\"-44\"" },
  { category: "Clothes", id: "s43IN", label: "43\"" },
  { category: "Clothes", id: "s44IN", label: "44\"" },
  { category: "Clothes", id: "s4446", label: "44\"-46\"" },
  { category: "Clothes", id: "s45IN", label: "45\"" },
  { category: "Clothes", id: "s4648", label: "46-48\"" },
  { category: "Clothes", id: "s46IN", label: "46\"" },
  { category: "Clothes", id: "s47IN", label: "47\"" },
  { category: "Clothes", id: "s4850", label: "48-50\"" },
  { category: "Clothes", id: "s48IN", label: "48\"" },
  { category: "Clothes", id: "s49IN", label: "49\"" },
  { category: "Clothes", id: "s50IN", label: "50\"" },
  { category: "Boys_Socks", id: "sBS68.5", label: "Boys_6-8.5" },
  { category: "Boys_Socks", id: "sBS911.5", label: "Boys_9-11.5" },
  { category: "Boys_Socks", id: "sBS123.5", label: "Boys_12-3.5" },
  { category: "Boys_Socks", id: "sBS47", label: "Adult_4-7" },
  { category: "Boys_Socks", id: "sBS68", label: "Adult_6-8" },
  { category: "Boys_Socks", id: "sBS912", label: "Adult_9-12" },
  { category: "Boys_Cozy_Socks", id: "sBCS68.5", label: "Boys_6-8.5" },
  { category: "Boys_Cozy_Socks", id: "sBCS911.5", label: "Boys_9-11.5" },
  { category: "Boys_Cozy_Socks", id: "sBCS123.5", label: "Boys_12-3.5" },
  { category: "Boys_Cozy_Socks", id: "sBCS47.5", label: "Adult_4-7.5" },
  { category: "Girls_Socks", id: "sGS68.5", label: "Girls_6-8.5" },
  { category: "Girls_Socks", id: "sGS812", label: "Girls_8-12" },
  { category: "Girls_Socks", id: "sGS123.5", label: "Girls_12.3.5" },
  { category: "Girls_Socks", id: "sGS46.5", label: "Adult_4-6.5" },
  { category: "Girls_Socks", id: "sGS48", label: "Adult_4-8" },
  { category: "Girls_Cozy_Socks", id: "sGCS68.5", label: "Girls_6-8.5" },
  { category: "Girls_Cozy_Socks", id: "sGCS911.5", label: "Girls_9-11.5" },
  { category: "Girls_Cozy_Socks", id: "sGCS123.5", label: "Girls_12-3.5" },
  { category: "Girls_Cozy_Socks", id: "sGCS47", label: "Adult_4-7" },
  { category: "Boys_Hat_sets", id: "sBH36", label: "3-6yrs" },
  { category: "Boys_Hat_sets", id: "sBH56", label: "5-7yrs" },
  { category: "Boys_Hat_sets", id: "sBH811", label: "8-11yrs" },
  { category: "Boys_Hat_sets", id: "sBH13+", label: "13yrs+" },
  { category: "Girls_Hat_sets", id: "sGH36", label: "3-6yrs" },
  { category: "Girls_Hat_sets", id: "sGH57", label: "5-7yrs" },
  { category: "Girls_Hat_sets", id: "sGH811", label: "8-11yrs" },
  { category: "Girls_Hat_sets", id: "sGH13+", label: "13yrs+" },
  { category: "Boys_Shoes", id: "sBSHO1", label: "S-1" },
  { category: "Boys_Shoes", id: "sBSHO2", label: "S-2" },
  { category: "Boys_Shoes", id: "sBSHO3", label: "S-3" },
  { category: "Boys_Shoes", id: "sBSHO4", label: "S-4" },
  { category: "Boys_Shoes", id: "sBSHO5", label: "S-5" },
  { category: "Boys_Shoes", id: "sBSHO6", label: "S-6" },
  { category: "Boys_Shoes", id: "sBSHO7", label: "S-7" },
  { category: "Boys_Shoes", id: "sBSSH8", label: "Small S-8" },
  { category: "Boys_Shoes", id: "sBSHO8", label: "S-8" },
  { category: "Boys_Shoes", id: "sBSSH9", label: "Small S-9" },
  { category: "Boys_Shoes", id: "sBSHO9", label: "S-9" },
  { category: "Boys_Shoes", id: "sBSSH10", label: "Small S-10" },
  { category: "Boys_Shoes", id: "sBSHO10", label: "S-10" },
  { category: "Boys_Shoes", id: "sBSSH11", label: "Small S-11" },
  { category: "Boys_Shoes", id: "sBSHO11", label: "S-11" },
  { category: "Boys_Shoes", id: "sBSSH12", label: "Small S-12" },
  { category: "Boys_Shoes", id: "sBSHO12", label: "S-12" },
  { category: "Boys_Shoes", id: "sBSSH13", label: "Small S-13" },
  { category: "Boys_Shoes", id: "sBSHO13", label: "S-13" },
  { category: "Girls_Shoes", id: "sGSHO1", label: "S-1" },
  { category: "Girls_Shoes", id: "sGSHO2", label: "S-2" },
  { category: "Girls_Shoes", id: "sGSHO3", label: "S-3" },
  { category: "Girls_Shoes", id: "sGSHO4", label: "S-4" },
  { category: "Girls_Shoes", id: "sGSHO5", label: "S-5" },
  { category: "Girls_Shoes", id: "sGSHO6", label: "S-6" },
  { category: "Girls_Shoes", id: "sGSHO7", label: "S-7" },
  { category: "Girls_Shoes", id: "sGSSH8", label: "Small S-8" },
  { category: "Girls_Shoes", id: "sGSHO8", label: "S-8" },
  { category: "Girls_Shoes", id: "sGSSH9", label: "Small S-9" },
  { category: "Girls_Shoes", id: "sGSHO9", label: "S-9" },
  { category: "Girls_Shoes", id: "sGSSH10", label: "Small S-10" },
  { category: "Girls_Shoes", id: "sGSHO10", label: "S-10" },
  { category: "Girls_Shoes", id: "sGSSH11", label: "Small S-11" },
  { category: "Girls_Shoes", id: "sGSHO11", label: "S-11" },
  { category: "Girls_Shoes", id: "sGSSH12", label: "Small S-12" },
  { category: "Girls_Shoes", id: "sGSHO12", label: "S-12" },
  { category: "Girls_Shoes", id: "sGSSH13", label: "Small S-13" },
  { category: "Girls_Shoes", id: "sGSHO13", label: "S-13" },
  { category: "One_Size", id: "OS", label: "One_Size" },
  { category: "Clothes", id: "Od3233", label: "32\"-33\"" },
  { category: "Girls_Hat_sets", id: "7-11", label: "7-11" }
];

export const clothingTypeList: RawClothingType[] = [
  { id: "BBAG", name: "Book_Bag", logo: true, plain: false, new: true },
  { id: "BLZR", name: "Boys_Blazer", logo: true, plain: false, new: true },
  { id: "BCOA", name: "Boys_Coats", logo: false, plain: true, new: true },
  { id: "BCZS", name: "Boys_Cozy_Socks", logo: false, plain: false, new: true },
  { id: "BHAT", name: "Boys_Hat_sets", logo: false, plain: false, new: true },
  { id: "BPNT", name: "Boys_Pants", logo: false, plain: false, new: true },
  { id: "BPYJ", name: "Boys_Pyjamas", logo: false, plain: false, new: true },
  { id: "BSHO", name: "Boys_School_Shorts", logo: true, plain: true, new: false },
  { id: "BSHI", name: "Boys_Shirts", logo: true, plain: true, new: true },
  { id: "BSHE", name: "Boys_Shoes", logo: false, plain: false, new: true },
  { id: "BSOK", name: "Boys_Socks", logo: false, plain: false, new: true },
  { id: "BTRO", name: "Boys_Trousers", logo: true, plain: true, new: true },
  { id: "BVST", name: "Boys_Vests", logo: false, plain: false, new: true },
  { id: "BTAR", name: "Brambles_Tartan_Skirt", logo: true, plain: false, new: false },
  { id: "CARD", name: "Cardigan", logo: true, plain: true, new: true },
  { id: "CPIN", name: "Carlton_Pinafore", logo: true, plain: false, new: false },
  { id: "CSKT", name: "Carlton_Skirt", logo: true, plain: false, new: false },
  { id: "FLEJ", name: "Fleece", logo: true, plain: false, new: false },
  { id: "FCOA", name: "Fleece_Coat", logo: true, plain: true, new: false },
  { id: "GLZR", name: "Girls_Blazer", logo: true, plain: true, new: true },
  { id: "GCOA", name: "Girls_Coats", logo: false, plain: true, new: true },
  { id: "GCZY", name: "Girls_Cozy_Socks", logo: false, plain: false, new: true },
  { id: "GHAT", name: "Girls_Hat_sets", logo: false, plain: false, new: true },
  { id: "GTSH", name: "Girls_PE_TOP", logo: true, plain: false, new: false },
  { id: "GPTT", name: "Girls_PE_Training_Top", logo: true, plain: false, new: false },
  { id: "GPSH", name: "Girls_Polo_Shirts", logo: true, plain: true, new: true },
  { id: "GPYJ", name: "Girls_Pyjamas", logo: false, plain: false, new: true },
  { id: "GSHO", name: "Girls_School_Shorts", logo: true, plain: true, new: false },
  { id: "GSHI", name: "Girls_Shirts", logo: true, plain: true, new: true },
  { id: "GSHE", name: "Girls_Shoes", logo: false, plain: false, new: true },
  { id: "GSOK", name: "Girls_Socks", logo: false, plain: false, new: true },
  { id: "GTRO", name: "Girls_Trousers", logo: true, plain: true, new: true },
  { id: "GVST", name: "Girls_Vests", logo: false, plain: false, new: true },
  { id: "JUMP", name: "Jumper", logo: true, plain: true, new: true },
  { id: "GKNI", name: "Knickers", logo: false, plain: false, new: true },
  { id: "MIXP", name: "Mixed_PE", logo: false, plain: true, new: false },
  { id: "PEBG", name: "PE_Bag", logo: false, plain: false, new: true },
  { id: "PEJO", name: "PE_joggers", logo: true, plain: true, new: false },
  { id: "PEJU", name: "PE_jumper_hoodie", logo: true, plain: true, new: false },
  { id: "PELE", name: "PE_Leggings", logo: true, plain: true, new: false },
  { id: "PESH", name: "PE_Shorts", logo: true, plain: true, new: true },
  { id: "PESK", name: "PE_Skorts", logo: true, plain: true, new: false },
  { id: "TSHI", name: "PE_Top", logo: true, plain: true, new: true },
  { id: "PINA", name: "Pinafores", logo: false, plain: true, new: false },
  { id: "RUGT", name: "Rugby_Tops", logo: true, plain: false, new: false },
  { id: "SCBG", name: "School_Bag", logo: true, plain: false, new: true },
  { id: "SKRT", name: "Skirt", logo: true, plain: true, new: false },
  { id: "SUDR", name: "Summer_Dress", logo: false, plain: true, new: false },
  { id: "STIE", name: "Tie", logo: true, plain: false, new: false },
  { id: "TIGH", name: "Tights", logo: false, plain: false, new: false },
  { id: "UPTT", name: "Unisex_PE_Training_Top", logo: true, plain: false, new: false },
  { id: "UPSH", name: "Unisex_Polo_Shirts", logo: true, plain: true, new: true },
  { id: "WPEJ", name: "Waterproof_PE_Jacket", logo: true, plain: false, new: false }
];

export const defaultSchoolsList = [
  { id: 'school_1', name: 'All Hallows Primary', skuCode: 'JINAHW' },
  { id: 'school_2', name: "St Jude's Academy", skuCode: 'STJUDE' },
  { id: 'school_3', name: 'Oakridge High', skuCode: 'OAKRIDGE' },
  { id: 'school_4', name: 'Almondbury Community', skuCode: 'ALMOND' },
  { id: 'school_5', name: 'Dalton School', skuCode: 'DALTON' },
];

export const defaultColoursList = [
  { id: 'colour_1', name: 'Red', skuCode: 'RED' },
  { id: 'colour_2', name: 'Navy Blue', skuCode: 'NAVY' },
  { id: 'colour_3', name: 'Bottle Green', skuCode: 'BOTTLE' },
  { id: 'colour_4', name: 'Royal Blue', skuCode: 'ROYAL' },
  { id: 'colour_5', name: 'Black', skuCode: 'BLACK' },
  { id: 'colour_6', name: 'White', skuCode: 'WHITE' },
  { id: 'colour_7', name: 'Grey', skuCode: 'GREY' },
];

export async function clearCollection(collName: string) {
  const snap = await getDocs(collection(db, collName));
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

export async function seedAllSizes() {
  await clearCollection('sizes');
  for (const size of sizeList) {
    await setDoc(doc(db, 'sizes', size.id), {
      id: size.id,
      label: size.label,
      skuCode: size.id,
      category: size.category
    });
  }
}

export async function seedAllClothingTypes() {
  await clearCollection('clothingTypes');
  for (const type of clothingTypeList) {
    await setDoc(doc(db, 'clothingTypes', type.id), {
      id: type.id,
      name: type.name,
      skuCode: type.id,
      logo: type.logo,
      plain: type.plain,
      new: type.new
    });
  }
}

export async function seedSchools() {
  await clearCollection('schools');
  for (const school of defaultSchoolsList) {
    await setDoc(doc(db, 'schools', school.id), school);
  }
}

export async function seedColours() {
  await clearCollection('colours');
  for (const col of defaultColoursList) {
    await setDoc(doc(db, 'colours', col.id), col);
  }
}

export async function clearInventoryToZero() {
  await clearCollection('inventory');
}
