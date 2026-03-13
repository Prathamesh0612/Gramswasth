import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pharmacyAPI } from '../../services/api';

export default function NearbyPharmacy() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('distance_asc');
  
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await pharmacyAPI.getAll();
        if (res.success && res.data) {
          setPharmacies(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch pharmacies', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  let filtered = pharmacies.map(p => ({
    ...p,
    medicines: p.medicines.filter(m =>
      !search || m.key.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(p => !search || p.medicines.length > 0);

  filtered.sort((a, b) => {
    if (sortBy === 'distance_asc') {
      return a.distanceKm - b.distanceKm;
    }
    
    if (sortBy.startsWith('price_')) {
      const getMinPrice = (phar) => Math.min(...phar.medicines.map(m => m.price));
      const minA = getMinPrice(a);
      const minB = getMinPrice(b);
      
      if (!isFinite(minA) || !isFinite(minB)) return 0;
      
      return sortBy === 'price_asc' ? minA - minB : minB - minA;
    }
    return 0;
  });

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800">{t('nearbyPharmacy')}</h1>
      </header>
      
      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        <div className="flex gap-2 h-[42px]">
          <div className="relative flex-1 bg-cream-50 rounded-xl overflow-hidden border border-cream-200 focus-within:border-sage-400 transition-colors">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              className="w-full h-full bg-transparent pl-9 pr-3 text-sm text-gray-800 outline-none" 
              placeholder={t('search') + " medicines..."} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="relative w-36 flex-shrink-0 bg-cream-50 rounded-xl overflow-hidden border border-cream-200 focus-within:border-sage-400 transition-colors">
            <select 
              className="w-full h-full bg-transparent appearance-none pl-9 pr-3 text-sm font-semibold text-sage-700 outline-none cursor-pointer"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="distance_asc">Distance</option>
              <option value="price_asc">Price: Low</option>
              <option value="price_desc">Price: High</option>
            </select>
            <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-500 pointer-events-none" />
          </div>
        </div>

        {loading ? (
             <div className="flex flex-col items-center justify-center p-10 text-sage-500 gap-3">
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm font-medium">Loading local pharmacies...</span>
             </div>
        ) : (
             filtered.map(p => (
              <div key={p.id} className="gs-card flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{p.name}</div>
                    <div className="flex items-center gap-1 text-xs text-sage-600 font-medium mt-0.5"><MapPin size={11} /> {p.village} · {p.distanceKm} km away</div>
                  </div>
                  <span className="chip bg-sage-100 text-sage-700">{t('openStatus')}</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-cream-200 pt-2 mt-1 -mx-2">
                  {p.medicines.map((m, i) => (
                    <div key={m.key} className={`flex items-center justify-between text-sm py-2 px-2 rounded-lg 
                      ${i % 2 === 0 ? 'bg-cream-50/50' : 'bg-transparent'}`}>
                      <div className="flex items-center gap-2">
                         <Package size={13} className="text-gray-400 flex-shrink-0" />
                         <span className="font-medium text-gray-700">{m.key}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                          {m.quantity === 0
                            ? <span className="chip !py-0.5 bg-red-100 text-red-600">{t('outOfStock')}</span>
                            : <span className="chip !py-0.5 bg-green-100 text-green-700">{m.quantity} left</span>
                          }
                          <span className="font-bold text-gray-800 text-sm whitespace-nowrap bg-cream-100 px-2.5 py-1 rounded-md">₹{m.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
        
        {!loading && filtered.length === 0 && (
          <div className="text-center text-gray-500 my-10 text-sm bg-cream-50 p-6 rounded-2xl border border-dashed border-cream-200">
             <Package size={32} className="mx-auto mb-2 text-gray-300" />
             No pharmacies found matching your criteria.
          </div>
        )}
      </main>
    </div>
  );
}
