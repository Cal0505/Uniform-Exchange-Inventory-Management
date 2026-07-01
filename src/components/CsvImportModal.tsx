import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Clothing_Type, Size, Colour, Location } from '../types';
import { db } from '../firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { generateSkuid, validateShelfCode } from '../skuUtils';
import { X, Upload, FileSpreadsheet, AlertCircle, Info } from 'lucide-react';
import { read, utils } from 'xlsx';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  Clothing_Type: Clothing_Type[];
  Size: Size[];
  Colour: Colour[];
  Location: Location[];
}

export default function CsvImportModal({
  isOpen,
  onClose,
  schools,
  Clothing_Type,
  Size,
  Colour,
  Location,
}: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [excelRows, setExcelRows] = useState<any[][] | null>(null);
  const [importSource, setImportSource] = useState<'csv' | 'excel'>('csv');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // File Upload parsing helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          if (rows.length < 2) {
            throw new Error("Excel sheet must contain a header row and at least one data row.");
          }

          setExcelRows(rows);
          setImportSource('excel');
          setCsvText(`Loaded ${rows.length - 1} data rows from Excel file: ${file.name}`);
        } catch (err: any) {
          setError('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.onerror = () => {
        setError('Failed to read Excel file.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text || '');
        setImportSource('csv');
        setExcelRows(null);
      };
      reader.onerror = () => {
        setError('Failed to read selected CSV file.');
      };
      reader.readAsText(file);
    }
  };

  const handleRunImport = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!csvText.trim()) {
      setError('Please select a CSV/Excel file or paste valid CSV content first.');
      setLoading(false);
      return;
    }

    try {
      let rows: any[][] = [];

      if (importSource === 'excel' && excelRows) {
        rows = excelRows;
      } else {
        const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          throw new Error("CSV must contain at least a header row and one data row.");
        }

        // Safe parse split helper taking quotes into consideration
        const parseCsvLine = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        rows = lines.map(line => parseCsvLine(line));
      }

      if (rows.length < 2) {
        throw new Error("Import data must contain at least a header row and one data row.");
      }

      const getVal = (row: any[], index: number): string => {
        return (row && row[index] !== undefined && row[index] !== null) ? String(row[index]).trim() : '';
      };

      const headers = rows[0].map((h: any) => String(h || '').toLowerCase().trim().replace(/[\s_]/g, ''));
      
      let skuidIdx = headers.indexOf('skuid');
      if (skuidIdx < 0) skuidIdx = headers.findIndex((h: string) => h.includes('skuid'));

      let catIdx = headers.indexOf('category');
      if (catIdx < 0) catIdx = headers.findIndex((h: string) => h.includes('cat'));

      let itemTypeIdx = headers.indexOf('itemtype');
      if (itemTypeIdx < 0) itemTypeIdx = headers.findIndex((h: string) => h === 'type' || h.includes('itemtype') || h.includes('format') || h.includes('packaging'));

      let locIdx = headers.indexOf('location');
      if (locIdx < 0) locIdx = headers.findIndex((h: string) => h.includes('loc'));

      let shelfIdx = headers.indexOf('shelf');
      if (shelfIdx < 0) shelfIdx = headers.findIndex((h: string) => h.includes('shelf') || h.includes('grid'));

      let packIdx = headers.indexOf('packnumber');
      if (packIdx < 0) packIdx = headers.findIndex((h: string) => h.includes('pack'));

      let schIdx = headers.indexOf('school');
      if (schIdx < 0) schIdx = headers.findIndex((h: string) => h.includes('school') || h.includes('sch'));

      let colIdx = headers.indexOf('colour');
      if (colIdx < 0) colIdx = headers.findIndex((h: string) => h.includes('colour') || h.includes('color') || h.includes('col'));

      let garmentIdx = headers.indexOf('garmenttype');
      if (garmentIdx < 0) garmentIdx = headers.findIndex((h: string) => h.includes('garment') || h.includes('clothing') || h === 'item');

      let sizeIdx = headers.indexOf('size');
      if (sizeIdx < 0) sizeIdx = headers.findIndex((h: string) => h.includes('size') || h.includes('siz'));

      let qtyIdx = headers.indexOf('quantity');
      if (qtyIdx < 0) qtyIdx = headers.findIndex((h: string) => h.includes('qty') || h.includes('quant'));

      // Fallback to strict requested sequence index order if headers are missing or custom
      if (skuidIdx < 0) skuidIdx = 0;
      if (catIdx < 0) catIdx = 1;
      if (itemTypeIdx < 0) itemTypeIdx = 2;
      if (locIdx < 0) locIdx = 3;
      if (shelfIdx < 0) shelfIdx = 4;
      if (packIdx < 0) packIdx = 5;
      if (schIdx < 0) schIdx = 6;
      if (colIdx < 0) colIdx = 7;
      if (garmentIdx < 0) garmentIdx = 8;
      if (sizeIdx < 0) sizeIdx = 9;
      if (qtyIdx < 0) qtyIdx = 10;

      const findSchool = (val: string) => {
        if (!val) return schools[0];
        const v = val.trim().toLowerCase();
        return schools.find(s => 
          s.id === val || 
          s.skuCode.toLowerCase() === v || 
          s.name.toLowerCase() === v ||
          s.name.toLowerCase().includes(v)
        ) || schools[0];
      };

      const findColour = (val: string) => {
        if (!val) return Colour[0];
        const v = val.trim().toLowerCase();
        return Colour.find(c => 
          c.id === val || 
          c.skuCode.toLowerCase() === v || 
          c.name.toLowerCase() === v ||
          c.name.toLowerCase().includes(v)
        ) || Colour[0];
      };

      const findType = (val: string) => {
        if (!val) return Clothing_Type[0];
        const v = val.trim().toLowerCase().replace(/[\s_]/g, '');
        return Clothing_Type.find(t => 
          t.id === val || 
          t.skuCode.toLowerCase() === v || 
          t.name.toLowerCase().replace(/[\s_]/g, '') === v ||
          t.name.toLowerCase().replace(/[\s_]/g, '').includes(v)
        ) || Clothing_Type[0];
      };

      const findSize = (val: string) => {
        if (!val) return Size[0];
        const v = val.trim().toLowerCase();
        return Size.find(s => 
          s.id === val || 
          s.skuCode.toLowerCase() === v || 
          s.label.toLowerCase() === v ||
          s.label.toLowerCase().includes(v)
        ) || Size[0];
      };

      const findLocation = (val: string, type: 'single' | 'vacpac') => {
        const profile = type === 'single' ? 'Pickers Shelf' : 'VacPac Storage Area';
        if (!val) {
          return Location.find(l => l.ruleProfile === profile) || Location[0];
        }
        const v = val.trim().toLowerCase();
        return Location.find(l => 
          l.ruleProfile === profile && 
          (l.id === val || 
           l.skuCode.toLowerCase() === v || 
           l.name.toLowerCase() === v ||
           l.name.toLowerCase().includes(v))
        ) || Location.find(l => l.ruleProfile === profile) || Location[0];
      };

      const batch = writeBatch(db);
      let count = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !getVal(row, catIdx)) continue;

        // Category matching
        const rawCat = getVal(row, catIdx);
        const category: 'Plain' | 'Logo' = rawCat.toLowerCase().includes('logo') ? 'Logo' : 'Plain';

        // Format matching
        const rawType = getVal(row, itemTypeIdx);
        const itemType: 'single' | 'vacpac' = rawType.toLowerCase().includes('vac') ? 'vacpac' : 'single';

        // Quantity matching
        const qtyStr = getVal(row, qtyIdx);
        const qty = parseInt(qtyStr) || 1;

        // School translation matching
        const schVal = getVal(row, schIdx);
        const matchedSchool = findSchool(schVal);

        // Colour matching
        const colVal = getVal(row, colIdx);
        const matchedColour = findColour(colVal);

        // Garment type matching
        const garmentVal = getVal(row, garmentIdx);
        const matchedType = findType(garmentVal);

        // Size matching
        const sizeVal = getVal(row, sizeIdx);
        const matchedSize = findSize(sizeVal);

        const matchedLocation = findLocation(getVal(row, locIdx), itemType);

        if (!matchedSchool || !matchedColour || !matchedType || !matchedSize) continue;

        if (itemType === 'single') {
          const shelfCodeRaw = getVal(row, shelfIdx).toUpperCase();
          const shelfCode = validateShelfCode(shelfCodeRaw) ? shelfCodeRaw : 'E7';

          const skuid = generateSkuid({
            ruleProfile: 'Pickers Shelf',
            locationSku: matchedLocation.skuCode,
            shelfCode,
            schoolSku: matchedSchool.skuCode,
            colourSku: matchedColour.skuCode,
            typeSku: matchedType.skuCode,
            sizeSku: matchedSize.skuCode,
          });

          const docId = `${skuid}_${shelfCode}`;
          const docRef = doc(db, 'inventory', docId);

          batch.set(docRef, {
            id: docId,
            skuid,
            type: 'single',
            category,
            locationId: matchedLocation.id,
            locationSku: matchedLocation.skuCode,
            shelfCode,
            schoolId: matchedSchool.id,
            schoolSku: matchedSchool.skuCode,
            colourId: matchedColour.id,
            colourSku: matchedColour.skuCode,
            typeId: matchedType.id,
            typeSku: matchedType.skuCode,
            sizeId: matchedSize.id,
            sizeSku: matchedSize.skuCode,
            quantity: qty,
            updatedAt: serverTimestamp(),
          });
          count++;
        } else {
          const packNumStr = getVal(row, packIdx);
          const packNumber = parseInt(packNumStr) || 1;

          const skuid = generateSkuid({
            ruleProfile: 'VacPac Storage Area',
            locationSku: matchedLocation.skuCode,
            packNumber,
            schoolSku: matchedSchool.skuCode,
            colourSku: matchedColour.skuCode,
            typeSku: matchedType.skuCode,
            sizeSku: matchedSize.skuCode,
          });

          const docRef = doc(db, 'inventory', skuid);

          batch.set(docRef, {
            id: skuid,
            skuid,
            type: 'vacpac',
            category,
            locationId: matchedLocation.id,
            locationSku: matchedLocation.skuCode,
            packNumber,
            schoolId: matchedSchool.id,
            schoolSku: matchedSchool.skuCode,
            colourId: matchedColour.id,
            colourSku: matchedColour.skuCode,
            typeId: matchedType.id,
            typeSku: matchedType.skuCode,
            sizeId: matchedSize.id,
            sizeSku: matchedSize.skuCode,
            quantity: qty,
            updatedAt: serverTimestamp(),
          });
          count++;
        }
      }

      await batch.commit();
      setSuccess(`Import completed! Successfully registered/updated ${count} stock items.`);
      setCsvText('');
      setExcelRows(null);
    } catch (err: any) {
      setError('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          {/* Backdrop clickaway */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="bg-primary text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <div>
                  <h3 className="font-display font-bold text-base">Import Stock CSV / Excel</h3>
                  <p className="text-xs opacity-90">Kirklees School Uniform Exchange</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 transition-all text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-teal-50 border border-teal-100 text-teal-800 text-xs rounded-2xl">
                  <span>{success}</span>
                </div>
              )}

              {/* Template Helper */}
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Expected CSV / Excel Columns and Order:
                </span>
                <pre className="text-[9px] font-mono text-slate-600 bg-white p-2.5 rounded-xl border border-amber-100 overflow-x-auto leading-relaxed">
{`SKUID,Category,Item Type,Location,Shelf,Pack Number,School,Colour,Garment Type,Size,Quantity
,Plain,single,Pickers Shelf,E7,,All Hallows,Navy,Boys_Shirts,1-2yrs,12
,Logo,vacpac,VacPac Storage Area,,3,All Hallows,Navy,Boys_Shirts,1-2yrs,50`}
                </pre>
                <p className="text-[10px] text-amber-700 mt-1 leading-normal">
                  Our smart parser maps schools, Colour, garment types, and Size using either their codes or their raw names. It is highly forgiving of spacing and capitalization.
                </p>
              </div>

              {/* File input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Option A: Select CSV or Excel File
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-4 text-center transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1.5" />
                  <span className="block text-xs font-semibold text-slate-700">Choose File or Drag & Drop</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Supports .csv, .xls, .xlsx files</span>
                </div>
              </div>

              {/* Pasting area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Option B: Paste Raw CSV Text
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setImportSource('csv');
                    setExcelRows(null);
                  }}
                  placeholder="SKUID,Category,Item Type,Location,Shelf,Pack Number,School,Colour,Garment Type,Size,Quantity..."
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
              </div>

              {/* Run Importer Button */}
              <button
                onClick={handleRunImport}
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs sm:text-sm tracking-wide transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                {loading ? 'Executing Import...' : 'Run Importer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
