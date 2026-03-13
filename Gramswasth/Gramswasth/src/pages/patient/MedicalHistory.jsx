import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, FileText, Stethoscope, ChevronRight, Calendar, Clock, History as HistoryIcon } from 'lucide-react';
import { consultationAPI } from '../../services/api';

export default function MedicalHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await consultationAPI.getAll();
        if (res.success && res.data) {
          // Filter for completed/accepted or just show all but label them
          setHistory(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800">{t('medicalHistory')}</h1>
      </header>
      <main className="flex-1 flex flex-col gap-3 px-4 py-5 max-w-md mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
            <div className="w-8 h-8 border-4 border-sage-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-500">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HistoryIcon size={24} className="text-cream-400" />
            </div>
            <p className="text-gray-400 text-sm">No consultations found yet.</p>
          </div>
        ) : (
          history.map(h => (
            <div key={h.id} 
              onClick={() => navigate('/patient/videocall', { state: { consultationId: h.id } })}
              className={`gs-card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow ${h.status === 'ongoing' ? 'border-l-4 border-sage-500' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${h.status === 'completed' ? 'bg-sage-100' : 'bg-cream-100'}`}>
                <Stethoscope size={18} className={h.status === 'completed' ? 'text-sage-600' : 'text-cream-600'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="font-semibold text-sm text-gray-800 truncate pr-2">
                    {h.doctor_name || 'General Consultation'}
                  </div>
                  <div className="text-[10px] text-gray-400 whitespace-nowrap">
                    {formatDate(h.created_at)}
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                  <span className="truncate">{h.specialization || 'General Physician'}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`chip text-[10px] ${
                    h.status === 'completed' ? 'bg-green-50 text-green-600' : 
                    h.status === 'ongoing' ? 'bg-blue-50 text-blue-600' : 
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                  </span>
                  {h.notes && <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full truncate max-w-[100px]">{h.notes}</span>}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          ))
        )}
      </main>
    </div>
  );
}
