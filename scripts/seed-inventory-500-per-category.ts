import { collection, getDocs, doc, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import { generateSkuid } from '../src/skuUtils';

const TARGET_CATEGORIES = ['Logo', 'New', 'Plain'] as const;
const PER_CATEGORY = 500;

const normalize = (value: string = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const fallbackColour = { id: 'fallback', name: 'Navy', skuCode: 'NAV' } as any;
const fallbackLocation = { id: 'fallback', name: 'Warehouse', skuCode: 'WH', ruleProfile: 'Pickers Shelf' } as any;

const getAllowedTypes = (categoryName: string, clothingTypes: any[]) => {
  const cat = normalize(categoryName);
  return clothingTypes.filter((type) => {
    if (cat === 'logo') return type.logo !== false;
    if (cat === 'new') return type.new !== false;
    if (cat === 'plain') return type.plain !== false;
    return true;
  });
};

const buildSizePool = (typeName: string, sizes: any[]) => {
  const label = normalize(typeName);

  if (label.includes('shoe')) {
    return sizes.filter((size) => ['Boys_Shoes', 'Girls_Shoes', 'One_Size', 'Clothes'].includes(size.category || 'Clothes'));
  }

  if (label.includes('sock')) {
    return sizes.filter((size) => ['Boys_Socks', 'Girls_Socks', 'One_Size', 'Clothes'].includes(size.category || 'Clothes'));
  }

  if (label.includes('hat')) {
    return sizes.filter((size) => ['Boys_Hat_sets', 'Girls_Hat_sets', 'One_Size', 'Clothes'].includes(size.category || 'Clothes'));
  }

  return sizes.filter((size) => ['Clothes', 'One_Size'].includes(size.category || 'Clothes'));
};

async function ensureCategoriesExist(categories: any[]) {
  const existing = new Map(categories.map((c) => [normalize(c.name || ''), c]));

  for (const categoryName of TARGET_CATEGORIES) {
    if (!existing.has(normalize(categoryName))) {
      const categoryRef = doc(collection(db, 'categories'));
      const payload = {
        id: categoryRef.id,
        name: categoryName,
        skuCode: categoryName.slice(0, 2).toUpperCase(),
        hasSchools: categoryName !== 'Plain',
        hasSingles: true,
        hasBulk: true,
        createdAt: new Date(),
      };
      await setDoc(categoryRef, payload);
      existing.set(normalize(categoryName), payload);
      console.log(`Created category: ${categoryName}`);
    }
  }

  return Array.from(existing.values());
}

async function main() {
  const [categorySnap, typeSnap, sizeSnap, colourSnap, schoolSnap, locationSnap] = await Promise.all([
    getDocs(collection(db, 'categories')),
    getDocs(collection(db, 'clothingTypes')),
    getDocs(collection(db, 'sizes')),
    getDocs(collection(db, 'colours')),
    getDocs(collection(db, 'schools')),
    getDocs(collection(db, 'locations')),
  ]);

  const categories = categorySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const clothingTypes = typeSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const sizes = sizeSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const colours = colourSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const schools = schoolSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const locations = locationSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const verifiedCategories = await ensureCategoriesExist(categories);
  const categoryMap = new Map(verifiedCategories.map((category) => [normalize(category.name || ''), category]));

  let totalInserted = 0;

  for (const categoryName of TARGET_CATEGORIES) {
    const category = categoryMap.get(normalize(categoryName));
    if (!category) {
      console.warn(`Missing category: ${categoryName}`);
      continue;
    }

    const allowedTypes = getAllowedTypes(categoryName, clothingTypes);
    const batch = writeBatch(db);

    for (let index = 0; index < PER_CATEGORY; index++) {
      const type = pick(allowedTypes.length ? allowedTypes : clothingTypes);
      const sizePool = buildSizePool(type.name || '', sizes);
      const size = pick(sizePool.length ? sizePool : sizes);
      const colour = pick<any>(colours.length ? colours : [fallbackColour]);
      const location = pick<any>(locations.length ? locations : [fallbackLocation]);
      const school = category.hasSchools !== false && schools.length ? pick(schools) : null;
      const packaging = Math.random() > 0.35 ? 'Single' : 'VacPac';
      const quantity = randInt(1, 75);
      const shelfCode = packaging === 'Single' ? `${String.fromCharCode(65 + (index % 26))}${randInt(1, 10)}` : undefined;
      const packNumber = packaging === 'VacPac' ? randInt(1, 99) : undefined;
      const locationRule = (location as any).ruleProfile as 'Pickers Shelf' | 'VacPac Storage Area' || 'Pickers Shelf';
      const ruleProfile = packaging === 'Single' ? 'Pickers Shelf' : locationRule === 'VacPac Storage Area' ? 'VacPac Storage Area' : 'Pickers Shelf';

      const skuid = generateSkuid({
        ruleProfile,
        locationSku: (location as any).skuCode || 'LOC',
        shelfCode,
        packNumber,
        schoolSku: (school as any)?.skuCode || 'N/A',
        colourSku: (colour as any).skuCode || 'COL',
        typeSku: type.skuCode || type.id,
        sizeSku: size.skuCode || size.id,
      });

      const itemId = `${categoryName}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: Record<string, any> = {
        id: itemId,
        skuid,
        category: categoryName,
        categoryId: category.id,
        type: packaging === 'Single' ? 'single' : 'vacpac',
        packagingType: packaging,
        locationId: location.id,
        locationSku: (location as any).skuCode || 'LOC',
        locationName: (location as any).name || 'Warehouse',
        colourId: colour.id,
        colourSku: (colour as any).skuCode || 'COL',
        colourName: (colour as any).name || 'Navy',
        typeId: type.id,
        typeSku: type.skuCode || type.id,
        typeName: type.name || 'Garment',
        sizeId: size.id,
        sizeSku: size.skuCode || size.id,
        sizeLabel: size.label || size.name || 'N/A',
        quantity,
        schoolId: school?.id || 'N/A',
        schoolSku: (school as any)?.skuCode || 'N/A',
        schoolName: (school as any)?.name || 'N/A',
        updatedAt: new Date(),
      };

      if (packaging === 'Single') {
        payload.shelfCode = shelfCode;
      } else {
        payload.packNumber = packNumber;
      }

      batch.set(doc(db, 'inventory', itemId), payload);
    }

    await batch.commit();
    totalInserted += PER_CATEGORY;
    console.log(`Inserted ${PER_CATEGORY} item records into ${categoryName}`);
  }

  console.log(`Completed inventory seeding. Total inserted: ${totalInserted}`);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
