import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, FileText, Stethoscope, ChevronRight } from 'lucide-react';

export default function MedicalHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const MOCK_HISTORY = [
    { id: 1, date: '10 Mar 2026', doctorKey: 'doctor_anjali', diagKey: 'diag_viral_fever',  meds: 2, type: 'regular' },
    { id: 2, date: '2 Feb 2026',  doctorKey: 'doctor_meera',  diagKey: 'diag_throat',       meds: 1, type: 'regular' },
    { id: 3, date: '15 Jan 2026', doctorKey: 'doctor_kiran',  diagKey: 'diag_chest_pain',   meds: 3, type: 'emergency' },
  ];

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800">{t('medicalHistory')}</h1>
      </header>
      <main className="flex-1 flex flex-col gap-3 px-4 py-5 max-w-md mx-auto w-full">
        {MOCK_HISTORY.map(h => (
          <div key={h.id} className={`gs-card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow ${h.type === 'emergency' ? 'border-l-4 border-terra-400' : ''}`}>
            <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Stethoscope size={18} className="text-sage-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800">{t(h.diagKey)}</div>
              <div className="text-xs text-gray-500">{t(h.doctorKey)} · {h.date}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="chip bg-cream-200 text-gray-600">
                  <FileText size={10} /> {h.meds} {h.meds > 1 ? t('medicineName') : t('medicineName')}
                </span>
                {h.type === 'emergency' && <span className="chip bg-red-100 text-red-600">{t('emergency_tag')}</span>}
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        ))}
      </main>
    </div>
  );
}
