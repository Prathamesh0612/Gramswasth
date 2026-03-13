import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, LogOut, Package, AlertTriangle, Plus, Search, Edit2, Trash2, X, Save, UserCircle2 } from 'lucide-react';


export default function PharmacyDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getMedicines = () => [
    { id: 1, nameKey: 'medicine_paracetamol', catKey: 'cat_analgesic',   qty: 150, unit: 'tablets', updated: '12 Mar 2026' },
    { id: 2, nameKey: 'medicine_amoxicillin', catKey: 'cat_antibiotic',  qty: 8,   unit: 'capsules',updated: '11 Mar 2026' },
    { id: 3, nameKey: 'medicine_metformin',   catKey: 'cat_antidiabetic',qty: 0,   unit: 'tablets', updated: '10 Mar 2026' },
    { id: 4, nameKey: 'medicine_ors',         catKey: 'cat_rehydration', qty: 240, unit: 'sachets', updated: '12 Mar 2026' },
    { id: 5, nameKey: 'medicine_atorvastatin',catKey: 'cat_cardiac',     qty: 5,   unit: 'tablets', updated: '9 Mar 2026' },
    { id: 6, nameKey: 'medicine_azithromycin',catKey: 'cat_antibiotic',  qty: 60,  unit: 'tablets', updated: '8 Mar 2026' },
  ];

  const [medicines, setMedicines] = useState(getMedicines());
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', qty: '', unit: 'tablets' });

  const filtered = medicines.filter(m =>
    t(m.nameKey).toLowerCase().includes(search.toLowerCase()) ||
    t(m.catKey).toLowerCase().includes(search.toLowerCase())
  );
  const lowStock = medicines.filter(m => m.qty > 0 && m.qty < 10);
  const outStock  = medicines.filter(m => m.qty === 0);

  const save = () => {
    if (editId) {
      setMedicines(ms => ms.map(m => m.id === editId ? { ...m, qty: Number(form.qty), unit: form.unit, updated: '12 Mar 2026' } : m));
      setEditId(null);
    } else {
      setMedicines(ms => [...ms, { id: Date.now(), nameKey: 'medicine_paracetamol', catKey: 'cat_analgesic', qty: Number(form.qty), unit: form.unit, updated: '12 Mar 2026' }]);
    }
    setForm({ name: '', category: '', qty: '', unit: 'tablets' });
    setShowAdd(false);
  };

  const startEdit = (m) => {
    setForm({ name: t(m.nameKey), category: t(m.catKey), qty: String(m.qty), unit: m.unit });
    setEditId(m.id);
    setShowAdd(true);
  };

  const StockBadge = ({ qty }) => {
    if (qty === 0) return <span className="chip bg-red-100 text-red-600">{t('outOfStock')}</span>;
    if (qty < 10) return <span className="chip bg-amber-100 text-amber-700">{t('onlySomeLeft', { qty })}</span>;
    return <span className="chip bg-green-100 text-green-700">{t('availableQty', { qty })}</span>;
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col pb-safe-bottom">
      <header className="bg-white border-b border-cream-200 px-4 py-3 pt-safe-top flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={16} className="text-white" /></div>
          <div>
            <div className="font-bold text-sage-600 text-sm leading-none">{t('pharmacy_sai')}</div>
            <div className="text-xs text-gray-500 leading-none mt-0.5">{t('village_nalgonda')}</div>
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
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('totalMedicines'), value: medicines.length, color: 'text-sage-600' },
            { label: t('lowStockItems'),  value: lowStock.length,  color: 'text-amber-600' },
            { label: t('outOfStock'),     value: outStock.length,  color: 'text-red-500' },
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
            <input className="gs-input !pl-9 !text-sm" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', category: '', qty: '', unit: 'tablets' }); }}
            className="bg-sage-500 text-white px-3 py-2.5 rounded-xl flex items-center gap-1.5 text-sm font-semibold flex-shrink-0">
            <Plus size={15} /> {t('addMedicine')}
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="gs-card flex flex-col gap-3 border-2 border-sage-400 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">{editId ? t('medicineName') : t('addMedicine')}</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} className="text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input className="gs-input !text-sm" placeholder={t('medicineName')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <input className="gs-input !text-sm" placeholder={t('category')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                <input type="number" className="gs-input !text-sm" placeholder={t('quantity')} value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={save} className="btn-primary !py-2.5 !text-sm flex items-center justify-center gap-1.5"><Save size={14} /> {t('save')}</button>
                <button onClick={() => setShowAdd(false)} className="btn-outline !py-2.5 !text-sm">{t('cancel')}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5"><Package size={15} /> {t('inventory')}</h2>
          {filtered.map(m => (
            <div key={m.id} className={`gs-card flex items-center gap-3 !py-3 ${m.qty === 0 ? 'border-l-4 border-red-300' : m.qty < 10 ? 'border-l-4 border-amber-300' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 truncate">{t(m.nameKey)}</div>
                <div className="text-xs text-gray-500">{t(m.catKey)} · {m.unit}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StockBadge qty={m.qty} />
                <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-sage-100 text-sage-600"><Edit2 size={14} /></button>
                <button onClick={() => setMedicines(ms => ms.filter(x => x.id !== m.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {(lowStock.length > 0 || outStock.length > 0) && (
          <div className="gs-card border-l-4 border-amber-400 flex flex-col gap-2">
            <h3 className="font-semibold text-amber-700 text-sm flex items-center gap-1.5"><AlertTriangle size={14} /> {t('lowStock')}</h3>
            {[...outStock, ...lowStock].map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700">{t(m.nameKey)}</span>
                  <span className="text-xs text-gray-400 ml-2">{m.qty === 0 ? t('outOfStock') : t('onlySomeLeft', { qty: m.qty })}</span>
                </div>
                <button onClick={() => startEdit(m)} className="chip bg-amber-100 text-amber-700 hover:bg-amber-200">Restock</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
