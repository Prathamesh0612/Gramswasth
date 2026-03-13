import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Search, Package, MapPin } from 'lucide-react';

export default function NearbyPharmacy() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const MOCK_PHARMACIES = [
    {
      id: 0,
      name: t('pharmacy_sai'),
      village: t('village_nalgonda'),
      distance: t('pharmacyDistance_0'),
      medicines: [
        { key: 'medicine_paracetamol', qty: 150 },
        { key: 'medicine_ors',         qty: 240 },
        { key: 'medicine_amoxicillin', qty: 8 },
      ],
    },
    {
      id: 1,
      name: t('pharmacy_ravi'),
      village: t('village_kothur'),
      distance: t('pharmacyDistance_1'),
      medicines: [
        { key: 'medicine_paracetamol', qty: 60 },
        { key: 'medicine_metformin',   qty: 0 },
      ],
    },
  ];

  const filtered = MOCK_PHARMACIES.map(p => ({
    ...p,
    medicines: p.medicines.filter(m =>
      !search || t(m.key).toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(p => !search || p.medicines.length > 0);

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800">{t('nearbyPharmacy')}</h1>
      </header>
      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="gs-input !pl-9" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.map(p => (
          <div key={p.id} className="gs-card flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-800">{p.name}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><MapPin size={11} /> {p.village} · {p.distance}</div>
              </div>
              <span className="chip bg-sage-100 text-sage-700">{t('openStatus')}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {p.medicines.map(m => (
                <div key={m.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><Package size={13} className="text-gray-400" />{t(m.key)}</div>
                  {m.qty === 0
                    ? <span className="chip bg-red-100 text-red-500">{t('outOfStock')}</span>
                    : <span className="chip bg-green-100 text-green-700">{t('availableQty', { qty: m.qty })}</span>
                  }
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
