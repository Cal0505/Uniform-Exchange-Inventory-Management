// components/IntakeForm.tsx
export default function IntakeForm() {
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 w-full max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-[#54595F] mb-4">New Intake</h2>
      
      {/* Thumb-friendly selection grid */}
      <div className="grid grid-cols-1 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Location</span>
          <select className="w-full mt-1 p-3 border rounded-md text-base">
            <option>Under Office (UNO)</option>
            <option>Container 1 (CU1)</option>
          </select>
        </label>
        
        {/* Add more fields here... */}
        
        <button className="w-full bg-[#FF8C00] text-white py-4 rounded-md font-bold text-lg mt-4 shadow-md hover:bg-[#e07b00] transition">
          Generate SKU & Save
        </button>
      </div>
    </div>
  );
}