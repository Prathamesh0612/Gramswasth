import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, FileText, Upload, CheckCircle2, AlertCircle, 
  Info, ShieldCheck, Download, Trash2, Database
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';

export default function InventorySync() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activePharmacy, updateInventory } = usePharmacy();

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type === 'text/csv' || selected.name.endsWith('.csv'))) {
      setFile(selected);
      setError(null);
      parseCSV(selected);
    } else {
      setError('Please select a valid CSV file.');
      setFile(null);
    }
  };

  const parseCSV = (file) => {
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const data = [];
      
      // Basic CSV parsing (skip header: Name, Quantity, Price, Barcode)
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        if (cols.length >= 4) {
          data.push({
            key: cols[0].trim(),
            qty: parseInt(cols[1]) || 0,
            price: parseFloat(cols[2]) || 0,
            barcode: cols[3].trim().replace('\r', '')
          });
        }
      }

      if (data.length === 0) {
        setError('No valid data found in CSV. Use the template below.');
      } else {
        setPreview(data);
      }
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const handleSync = async () => {
    if (preview.length === 0) return;
    setParsing(true);
    try {
      // Logic: Merge or Replace? Let's do a Selective Replace for this demo
      // In a real app, we'd probably match by Barcode and update Qty.
      await updateInventory(preview);
      setSuccess(true);
      setTimeout(() => navigate('/pharmacy/dashboard'), 2000);
    } catch (err) {
      setError('Failed to sync with database. Check your connection.');
    } finally {
      setParsing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Quantity,Price,Barcode\nParacetamol 500mg,100,15,8901234567890\nAmoxicillin 250mg,50,45,8901234567892";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gramswasth_inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="px-4 py-3 border-b border-cream-200 pt-safe-top flex items-center justify-between">
        <button onClick={() => navigate('/pharmacy/dashboard')} className="p-2 rounded-xl hover:bg-cream-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div className="flex flex-col items-center">
           <h1 className="font-bold text-gray-800 text-sm">Inventory Sync</h1>
           <span className="text-[10px] text-gray-400">External System Bridge</span>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </header>

      <main className="flex-1 p-5 max-w-md mx-auto w-full flex flex-col gap-6">
        <div className="gs-card !bg-blue-50 border-blue-100 flex items-start gap-3">
           <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
           <p className="text-xs text-blue-700 leading-relaxed font-medium">
             Export your inventory from <strong>Marg</strong>, <strong>RedBook</strong>, or other software as a <strong>CSV</strong> file and upload it here to sync Gramswasth instantly.
           </p>
        </div>

        {!file && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4">
             <div className="w-20 h-20 bg-cream-100 rounded-3xl flex items-center justify-center text-sage-600 animate-bounce-subtle">
                <FileText size={40} />
             </div>
             <div className="text-center">
                <h2 className="font-bold text-gray-800">Choose CSV File</h2>
                <p className="text-xs text-gray-400 mt-1">Upload your inventory export</p>
             </div>
             <div className="relative w-full">
                <button className="btn-primary w-full flex items-center justify-center gap-2">
                   <Upload size={18} /> Select CSV
                </button>
                <input 
                   type="file" 
                   accept=".csv" 
                   onChange={handleFileChange}
                   className="absolute inset-0 opacity-0 cursor-pointer" 
                />
             </div>
             <button onClick={downloadTemplate} className="text-xs font-bold text-sage-600 flex items-center gap-1.5 hover:underline">
                <Download size={14} /> Download Sample Template
             </button>
          </div>
        )}

        <AnimatePresence>
          {file && !success && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
               <div className="gs-card flex items-center gap-3 border-2 border-sage-500">
                  <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center text-sage-600">
                     <FileText size={20} />
                  </div>
                  <div className="flex-1">
                     <h3 className="text-sm font-bold text-gray-800 truncate">{file.name}</h3>
                     <p className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB · Ready to sync</p>
                  </div>
                  <button onClick={() => { setFile(null); setPreview([]); }} className="p-2 text-red-400">
                     <Trash2 size={16} />
                  </button>
               </div>

               <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-cream-50 px-4 py-2 border-b border-cream-200 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Preview (Top {preview.length})</span>
                     <span className="text-[10px] font-bold text-sage-600">{preview.length} Items Found</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                     {preview.map((m, idx) => (
                        <div key={idx} className="px-4 py-2 border-b border-cream-100 last:border-0 flex items-center justify-between text-xs">
                           <span className="text-gray-700 font-medium truncate max-w-[120px]">{m.key}</span>
                           <div className="flex gap-3 text-gray-400">
                              <span>Qty: <span className="text-gray-700">{m.qty}</span></span>
                              <span>₹{m.price}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <button 
                  onClick={handleSync}
                  disabled={parsing || preview.length === 0}
                  className="btn-primary flex items-center justify-center gap-2 py-4"
               >
                  {parsing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Database size={18} />}
                  Sync to Master Database
               </button>
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center gap-4">
               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle2 size={48} />
               </div>
               <div>
                  <h2 className="text-xl font-bold text-gray-800">Inventory Synced!</h2>
                  <p className="text-sm text-gray-500 mt-1">Your store is now up-to-date with your external system data.</p>
               </div>
               <div className="text-[10px] text-sage-600 font-bold bg-sage-50 px-4 py-1.5 rounded-full mt-4 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Redirecting to Dashboard...
               </div>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 p-4 rounded-2xl flex items-start gap-3 border border-red-100">
               <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
               <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-6 bg-cream-50 mt-auto">
         <div className="flex items-center gap-2 text-gray-400 mb-2">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Safety First</span>
         </div>
         <p className="text-[10px] text-gray-500 leading-relaxed italic">
           All sync operations are logged. If you make a mistake, you can always revert to a previous version of the master database by contacting support.
         </p>
      </footer>
    </div>
  );
}
