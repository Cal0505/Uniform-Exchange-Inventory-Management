import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  runTransaction,
  increment
} from "firebase/firestore";

// Initialize using your applet configuration setup
import firebaseConfig from "../firebase-applet-config.json"; 
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// TypeScript Interfaces explicitly matching your JSON blueprint
export interface School { id: string; name: string; skuCode: string; }
export interface ClothingType { id: string; name: string; skuCode: string; }
export interface Size { id: string; label: string; skuCode: string; }
export interface Colour { id: string; name: string; skuCode: string; }
export interface Location { id: string; name: string; skuCode: string; ruleProfile: "Pickers Shelf" | "VacPac Storage Area"; }

export interface InventoryItem {
  id: string;
  skuid: string; // The composite SKU string (e.g., "L-OAKH-JMPR-NVY-1213")
  type: "single" | "vacpac";
  locationId: string;
  locationSku: string;
  shelfCode: string;
  packNumber?: number;
  schoolId: string;
  schoolSku: string;
  colourId: string;
  colourSku: string;
  typeId: string;
  typeSku: string;
  sizeId: string;
  sizeSku: string;
  quantity: number;
}

/**
 * 🛠️ Utility: Pure Composite SKU Generator
 * Combines short-codes exactly as mandated by the system architecture rules.
 */
export function generateCompositeSku(
  categorySku: string, // "L", "P", "N"
  schoolSku: string | null | undefined, // Empty/null if category doesn't use schools
  typeSku: string,
  colourSku: string,
  sizeSku: string
): string {
  const segments = [
    categorySku,
    schoolSku || null,
    typeSku,
    colourSku,
    sizeSku
  ].filter(Boolean); // Cleanly drops null/falsy items

  return segments.join('-').toUpperCase();
}

/**
 * 🔄 Real-Time Atomic Ingestion (Upsert) Operation
 * Uses a Firestore Transaction to guarantee that quantity additions 
 * are race-condition safe on the warehouse floor.
 */
export async function upsertInventoryStock(
  categorySku: string,
  itemData: Omit<InventoryItem, "id" | "skuid">
) {
  // 1. Synthesize the unified lookup key
  const targetSkuid = generateCompositeSku(
    categorySku,
    itemData.schoolSku,
    itemData.typeSku,
    itemData.colourSku,
    itemData.sizeSku
  );

  const inventoryCollectionRef = collection(db, "inventory");

  // Run as an isolated transaction to secure concurrency control
  return await runTransaction(db, async (transaction) => {
    // Check if this SKU already exists at this physical warehouse location ID
    const q = query(
      inventoryCollectionRef,
      where("skuid", "==", targetSkuid),
      where("locationId", "==", itemData.locationId)
    );
    
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // PATH A: Row match found at location -> Execute safe numeric increment
      const existingDocRef = querySnapshot.docs[0].ref;
      transaction.update(existingDocRef, {
        quantity: increment(itemData.quantity)
      });
      return { action: "INCREMENTED", skuid: targetSkuid, id: existingDocRef.id };
    } else {
      // PATH B: No match -> Generate a brand new document record line
      const newDocRef = doc(inventoryCollectionRef);
      const newRecord: InventoryItem = {
        id: newDocRef.id,
        skuid: targetSkuid,
        ...itemData
      };
      
      transaction.set(newDocRef, newRecord);
      return { action: "CREATED", skuid: targetSkuid, id: newDocRef.id };
    }
  });
}