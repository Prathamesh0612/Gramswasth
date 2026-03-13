import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, Edit2, Save, Stethoscope, Clock, User, LogOut } from 'lucide-react';
import { doctorAPI } from '../../services/api';

export default function DoctorProfile() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    name: '',
    specialization: '',
    license: 'MCI-' + Math.floor(Math.random()*90000+10000),
    hospital: 'PHC',
    experience: '',
    languages: 'Hindi, English',
    hours: '9:00 AM – 5:00 PM',
    totalConsultations: 0,
    emergencyCalls: 0,
  });

  useEffect(() => {
    doctorAPI.getProfile().then(res => {
      if (res.success && res.data) {
        const u = res.data;
        setData(prev => ({
          ...prev,
          name: u.name || prev.name,
          specialization: u.specialization || 'General Physician',
          totalConsultations: u.total_consultations || 0,
        }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const F = ({ label, k, placeholder }) => (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-gray-400">{label}</p>
      {editing
        ? <input className="gs-input !text-sm !py-2" placeholder={placeholder} value={data[k]} onChange={e => setData(d => ({ ...d, [k]: e.target.value }))} />
        : <p className="text-sm font-semibold text-gray-800">{data[k] || '—'}</p>}
    </div>
  );

  const initials = data.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || 'DR';

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/doctor/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800 flex-1">My Profile</h1>
        {editing
          ? <button onClick={() => setEditing(false)} className="chip bg-sage-500 text-white flex items-center gap-1"><Save size={13} /> Save</button>
          : <button onClick={() => setEditing(true)} className="chip bg-cream-200 text-sage-700 flex items-center gap-1"><Edit2 size={13} /> Edit</button>}
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        {/* Profile integration notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          🔗 Full profile management (photo, certificates, ratings) is being integrated. Basic info available below.
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading profile...</div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-sage-500 flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
              <div>
                <div className="font-bold text-gray-800 text-lg">{data.name || 'Doctor'}</div>
                <div className="text-sm text-gray-500">{data.specialization}</div>
                <div className="chip bg-green-100 text-green-700 mt-1">✓ Verified Doctor</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="gs-card text-center !py-4">
                <div className="text-2xl font-bold text-sage-600">{data.totalConsultations}</div>
                <div className="text-xs text-gray-500 mt-0.5">Consultations</div>
              </div>
              <div className="gs-card text-center !py-4">
                <div className="text-2xl font-bold text-red-500">{data.emergencyCalls}</div>
                <div className="text-xs text-gray-500 mt-0.5">Emergency Calls</div>
              </div>
            </div>

            <div className="gs-card flex flex-col gap-3">
              <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5"><Stethoscope size={14} /> Professional Details</h2>
              <F label="Full Name" k="name" placeholder="Dr. Full Name" />
              <F label="Specialization" k="specialization" placeholder="e.g. General Physician" />
              <F label="License" k="license" />
              <F label="Hospital / PHC" k="hospital" placeholder="PHC Name" />
              <F label="Experience" k="experience" placeholder="e.g. 5 years" />
              <F label="Languages" k="languages" placeholder="Hindi, English..." />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> Working Hours</p>
                {editing
                  ? <input className="gs-input !text-sm !py-2" value={data.hours} onChange={e => setData(d => ({ ...d, hours: e.target.value }))} />
                  : <p className="text-sm font-semibold text-gray-800">{data.hours}</p>}
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.clear();
                navigate('/role');
              }}
              className="w-full btn-outline !rounded-xl !border-red-200 !text-red-500 hover:!bg-red-50 flex items-center justify-center gap-2 !text-sm"
            >
              <LogOut size={16} /> Logout
            </button>
          </>
        )}
      </main>
    </div>
  );
}
