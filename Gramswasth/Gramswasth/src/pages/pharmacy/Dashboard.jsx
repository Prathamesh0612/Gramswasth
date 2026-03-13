import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, LogOut, Package, AlertTriangle, Plus, Search, Edit2, Trash2, X, Save, 
  UserCircle2, ScanLine, ShoppingCart, History, CheckCircle2 
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import BarcodeScanner from '../../components/BarcodeScanner';

export default function PharmacyDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activePharmacy, sellMedicine, updateInventory, lastTransaction, cancelLastTransaction, deleteMedicine } = usePharmacy();

  const medicines = activePharmacy?.medicines || [];
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ key: '', qty: '', price: '' });
  const [lastSale, setLastSale] = useState(null);

  const filtered = medicines.filter(m =>
    m.key.toLowerCase().includes(search.toLowerCase())
  );
  
  const lowStock = medicines.filter(m => m.qty > 0 && m.qty < 20);
  const outStock = medicines.filter(m => m.qty === 0);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const handleCancelClick = async () => {
    setShowConfirmCancel(false);
    const result = await cancelLastTransaction();
    if (result.success) {
      alert(`Transaction for ${result.productName} reversed! Stock restored.`);
    } else {
      alert(result.message);
    }
  };

  const handleScanSuccess = async (barcode) => {
    setShowScanner(false);
    const result = await sellMedicine(barcode);
    
    if (result.success) {
      setLastSale({
        name: result.productName,
        time: new Date().toLocaleTimeString(),
        qty: 1
      });

      if (result.newQty === 0) {
        alert(`STOCK ALERT: "${result.productName}" is now COMPLETELY OUT OF STOCK.`);
      }

      // Clear after 5 seconds
      setTimeout(() => setLastSale(null), 5000);
    } else {
      alert(result.message);
    }
  };

  const save = async () => {
    // Basic Validation
    if (!form.key.trim() || form.qty === '' || form.price === '') {
      alert('Please fill all fields.');
      return;
    }

    const qty = Number(form.qty);
    const price = Number(form.price);

    if (qty < 0) {
      alert('Quantity cannot be negative. If out of stock, use 0.');
      return;
    }

    // Duplicate Check
    const exists = medicines.find(m => m.key.toLowerCase() === form.key.trim().toLowerCase());
    
    let newInventory;
    if (editId) {
       // When editing, we don't check for existence (since it exists as the one we are editing)
       // Note: the name is disabled in the UI for edits anyway
       newInventory = medicines.map(m => 
          m.key === editId ? { ...m, qty, price } : m
       );
    } else {
       if (exists) {
         alert(`Medicine "${form.key}" already exists! Please edit the existing entry instead.`);
         return;
       }
       newInventory = [
         ...medicines, 
         { key: form.key.trim(), qty, price, barcode: "TEMP_" + Date.now() }
       ];
    }
    await updateInventory(newInventory);
    setEditId(null);
    setShowAdd(false);
    setForm({ key: '', qty: '', price: '' });
  };

  const handleDelete = async (m) => {
    if (window.confirm(`Are you sure you want to remove "${m.key}" from inventory?`)) {
      await deleteMedicine(m.barcode);
    }
  };

  const startEdit = (m) => {
    setForm({ key: m.key, qty: String(m.qty), price: String(m.price) });
    setEditId(m.key);
    setShowAdd(true);
  };

  const StockBadge = ({ qty }) => {
    if (qty < 0) return <span className="chip bg-red-200 text-red-800 font-bold animate-pulse">Error ({qty})</span>;
    if (qty === 0) return <span className="chip bg-red-100 text-red-600">Out of Stock</span>;
    if (qty < 20) return <span className="chip bg-amber-100 text-amber-700">Low Stock ({qty})</span>;
    return <span className="chip bg-green-100 text-green-700">{qty} in Stock</span>;
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col pb-safe-bottom">
      <header className="bg-white border-b border-cream-200 px-4 py-3 pt-safe-top flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center">
            <Leaf size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sage-600 text-sm leading-none">{activePharmacy?.name || 'Pharmacy'}</div>
            <div className="text-xs text-gray-500 leading-none mt-0.5">{activePharmacy?.village || 'Loading...'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/pharmacy/profile')} className="p-2 rounded-xl hover:bg-cream-100">
            <UserCircle2 size={18} className="text-sage-500" />
          </button>
          <button onClick={() => navigate('/role')} className="p-2 rounded-xl hover:bg-cream-100">
            <LogOut size={16} className="text-gray-400" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-2xl mx-auto w-full">
        {/* Quick Billing Section */}
        <section className="flex flex-col gap-3">
           <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={18} className="text-sage-500" /> Quick Billing
              </h2>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowScanner(true)}
                className="bg-sage-600 text-white p-4 rounded-2xl flex flex-col items-center gap-2 shadow-lg shadow-sage-200 active:scale-95 transition-all"
              >
                 <ScanLine size={24} />
                 <span className="font-bold text-sm">Scan & Bill</span>
              </button>
              
              <div className="flex flex-col gap-2">
                 <div className="bg-cream-50 border border-cream-200 p-2.5 rounded-2xl flex-1 flex flex-col items-center justify-center text-center">
                    {lastSale ? (
                      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center text-green-600">
                         <CheckCircle2 size={20} />
                         <span className="text-[10px] font-bold mt-1">Sold: {lastSale.name}</span>
                         <span className="text-[8px] opacity-70">Stock Updated ✓</span>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                         <History size={18} />
                         <span className="text-[10px] font-medium mt-1 uppercase tracking-wider">Ready</span>
                      </div>
                    )}
                 </div>
                 
                 <button 
                    onClick={() => setShowConfirmCancel(true)}
                    disabled={!lastTransaction}
                    className={`flex items-center justify-center gap-2 p-2 rounded-xl text-[10px] font-bold transition-all ${
                       lastTransaction 
                       ? 'bg-red-50 text-red-600 border border-red-100 active:bg-red-100' 
                       : 'bg-gray-50 text-gray-300 border border-gray-100 grayscale cursor-not-allowed'
                    }`}
                 >
                    <X size={12} /> Returns / Error
                 </button>
              </div>
           </div>
        </section>

        {/* Inventory Management Section */}
        <section className="gs-card !bg-sage-50 border-sage-100 flex items-center justify-between !py-3">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sage-600 shadow-sm">
                 <Package size={20} />
              </div>
              <div>
                 <h4 className="font-bold text-gray-800 text-sm">External System Sync</h4>
                 <p className="text-[10px] text-gray-500">Import CSV from Marg/RedBook</p>
              </div>
           </div>
           <button 
              onClick={() => navigate('/pharmacy/sync')}
              className="bg-white text-sage-600 border border-sage-200 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-sage-50 active:scale-95 transition-all"
           >
              Import CSV
           </button>
        </section>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Medicines', value: medicines.length, color: 'text-sage-600' },
            { label: 'Low Stock', value: lowStock.length,  color: 'text-amber-600' },
            { label: 'Out of Stock', value: outStock.length,  color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="gs-card text-center !py-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="gs-input !pl-9 !text-sm" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ key: '', qty: '', price: '' }); }}
            className="bg-sage-500 text-white px-3 py-2.5 rounded-xl flex items-center gap-1.5 text-sm font-semibold flex-shrink-0">
            <Plus size={15} /> Add
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="gs-card flex flex-col gap-3 border-2 border-sage-400 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">{editId ? 'Edit Medicine' : 'Add New Medicine'}</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} className="text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input className="gs-input !text-sm" placeholder="Medicine Name" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} disabled={!!editId} />
                </div>
                <input type="number" className="gs-input !text-sm" placeholder="Quantity" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} inputMode="numeric" />
                <input type="number" className="gs-input !text-sm" placeholder="Price (₹)" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={save} className="btn-primary !py-2.5 !text-sm flex items-center justify-center gap-1.5"><Save size={14} /> {t('save')}</button>
                <button onClick={() => setShowAdd(false)} className="btn-outline !py-2.5 !text-sm">{t('cancel')}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5"><Package size={15} /> Inventory</h2>
          {filtered.map(m => (
            <div key={m.key} className={`gs-card flex items-center gap-3 !py-3 ${m.qty === 0 ? 'border-l-4 border-red-300' : m.qty < 20 ? 'border-l-4 border-amber-300' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 truncate">{m.key}</div>
                <div className="text-xs text-gray-500">₹{m.price} · {m.barcode || 'No barcode'}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <StockBadge qty={m.qty} />
                <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-sage-100 text-sage-600" title="Edit Item"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Remove Item"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {(lowStock.length > 0 || outStock.length > 0) && (
          <div className="gs-card border-l-4 border-amber-400 flex flex-col gap-2">
            <h3 className="font-semibold text-amber-700 text-sm flex items-center gap-1.5"><AlertTriangle size={14} /> Alerts</h3>
            {[...outStock, ...lowStock].map(m => (
              <div key={m.key} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700">{m.key}</span>
                  <span className="text-xs text-gray-400 ml-2">{m.qty === 0 ? 'Out of stock' : `Only ${m.qty} left`}</span>
                </div>
                <button onClick={() => startEdit(m)} className="chip bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold">Refill</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showScanner && (
        <BarcodeScanner 
          onScanSuccess={handleScanSuccess}
          onCancel={() => setShowScanner(false)}
        />
      )}

      {/* Confirmation Modal for Cancel */}
      <AnimatePresence>
        {showConfirmCancel && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4"
            >
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <AlertTriangle size={32} />
               </div>
               <div>
                  <h3 className="font-bold text-gray-800 text-lg">Cancel Sale?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                     Are you sure you want to reverse the last transaction for <span className="font-bold text-gray-700">{lastTransaction?.medicineKey}</span>?
                  </p>
                  <p className="text-xs text-amber-600 font-medium mt-2 bg-amber-50 p-2 rounded-lg">
                     This will add 1 unit back to the inventory stock.
                  </p>
               </div>
               <div className="grid grid-cols-2 gap-2 w-full mt-2">
                  <button onClick={handleCancelClick} className="btn-primary !bg-red-600 border-red-700 !py-2.5 !text-sm">Yes, Cancel</button>
                  <button onClick={() => setShowConfirmCancel(false)} className="btn-outline !py-2.5 !text-sm">No, Keep</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
