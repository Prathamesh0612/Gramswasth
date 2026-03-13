import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, Edit2, Save, Package, Clock, Phone } from 'lucide-react';

export default function PharmacyProfile() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({
    pharmName: 'Sai Medical Store',
    owner: 'Sai Prasad Reddy',
    registration: 'AP-PHM-2019-1234',
    district: 'Nalgonda',
    state: 'Telangana',
    contact: '+91 98765 43210',
    hours: '8:00 AM – 9:00 PM',
    totalMedicines: 6,
    dispensedToday: 23,
  });

  const F = ({ label, k, icon: Icon }) => (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-gray-400 flex items-center gap-1">{Icon && <Icon size={10} />} {label}</p>
      {editing
        ? <input className="gs-input !text-sm !py-2" value={data[k]} onChange={e => setData(d => ({ ...d, [k]: e.target.value }))} />
        : <p className="text-sm font-semibold text-gray-800">{data[k]}</p>}
    </div>
  );

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/pharmacy/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800 flex-1">Pharmacy Profile</h1>
        {editing
          ? <button onClick={() => setEditing(false)} className="chip bg-sage-500 text-white flex items-center gap-1"><Save size={13} /> Save</button>
          : <button onClick={() => setEditing(true)} className="chip bg-cream-200 text-sage-700 flex items-center gap-1"><Edit2 size={13} /> Edit</button>}
      </header>
      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-sage-500 flex items-center justify-center text-4xl">💊</div>
          <div>
            <div className="font-bold text-gray-800 text-lg">{data.pharmName}</div>
            <div className="text-sm text-gray-500">{data.district}, {data.state}</div>
            <div className="chip bg-green-100 text-green-700 mt-1">✓ Licensed Pharmacy</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Total Medicines', value: data.totalMedicines, color: 'text-sage-600' },
            { label: 'Dispensed Today', value: data.dispensedToday, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="gs-card text-center !py-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="gs-card flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5"><Package size={14} /> Pharmacy Details</h2>
          <F label="Owner / Pharmacist" k="owner" />
          <F label="Registration Number" k="registration" />
          <F label="District" k="district" />
          <F label="Contact" k="contact" icon={Phone} />
          <F label="Operating Hours" k="hours" icon={Clock} />
        </div>
      </main>
    </div>
  );
}
