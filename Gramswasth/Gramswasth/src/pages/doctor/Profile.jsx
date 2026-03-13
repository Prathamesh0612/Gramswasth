import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, Edit2, Save, Stethoscope, Star, Clock } from 'lucide-react';

export default function DoctorProfile() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({
    name: 'Dr. Anjali Rao',
    specialization: 'Cardiologist',
    license: 'MCI-TG-2015-4521',
    hospital: 'PHC Nalgonda',
    experience: '11 years',
    languages: 'Telugu, Hindi, English',
    hours: '9:00 AM – 5:00 PM',
    totalConsultations: 2840,
    emergencyCalls: 143,
  });

  const F = ({ label, k }) => (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-gray-400">{label}</p>
      {editing
        ? <input className="gs-input !text-sm !py-2" value={data[k]} onChange={e => setData(d => ({ ...d, [k]: e.target.value }))} />
        : <p className="text-sm font-semibold text-gray-800">{data[k]}</p>}
    </div>
  );

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/doctor/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800 flex-1">Doctor Profile</h1>
        {editing
          ? <button onClick={() => setEditing(false)} className="chip bg-sage-500 text-white flex items-center gap-1"><Save size={13} /> Save</button>
          : <button onClick={() => setEditing(true)} className="chip bg-cream-200 text-sage-700 flex items-center gap-1"><Edit2 size={13} /> Edit</button>}
      </header>
      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-sage-500 flex items-center justify-center text-white text-2xl font-bold">AR</div>
          <div>
            <div className="font-bold text-gray-800 text-lg">{data.name}</div>
            <div className="text-sm text-gray-500">{data.specialization}</div>
            <div className="chip bg-green-100 text-green-700 mt-1">✓ Verified Doctor</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Total Consultations', value: data.totalConsultations, icon: Stethoscope, color: 'text-sage-600' },
            { label: 'Emergency Calls', value: data.emergencyCalls, icon: Star, color: 'text-red-500' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="gs-card text-center !py-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="gs-card flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5"><Stethoscope size={14} /> Professional Details</h2>
          <F label="License Number" k="license" />
          <F label="Hospital / PHC" k="hospital" />
          <F label="Experience" k="experience" />
          <F label="Languages Spoken" k="languages" />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> Working Hours</p>
            {editing
              ? <input className="gs-input !text-sm !py-2" value={data.hours} onChange={e => setData(d => ({ ...d, hours: e.target.value }))} />
              : <p className="text-sm font-semibold text-gray-800">{data.hours}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
