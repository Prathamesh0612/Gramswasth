import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Pill, Download } from 'lucide-react';
import { prescriptionAPI } from '../../services/api';
import html2pdf from 'html2pdf.js';

export default function Prescriptions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await prescriptionAPI.getAll();
      if (res.success && res.data) {
        setPrescriptions(res.data);
      } else {
        setPrescriptions([]);
      }
    } catch(err) {
      console.error("Failed to fetch prescriptions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (prescription) => {
    const element = document.getElementById(`prescription-${prescription.id}`);
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: `prescription_${new Date(prescription.created_at).toLocaleDateString().replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800">{t('prescriptions')}</h1>
      </header>
      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-10">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-10">No prescriptions found.</div>
        ) : (
          prescriptions.map(p => (
            <div key={p.id} id={`prescription-${p.id}`} className="gs-card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Dr. {p.doctor_name || '...'}</div>
                  <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(p)}
                  className="chip bg-sage-100 text-sage-700 flex items-center gap-1"
                >
                  <Download size={12} /> PDF
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {(p.medicines || []).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Pill size={13} className="text-sage-500 flex-shrink-0" /> {m.name} ({m.dosage})
                  </div>
                ))}
              </div>
              {p.notes && <div className="bg-cream-100 rounded-xl px-3 py-2 text-xs text-gray-600">{p.notes}</div>}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
