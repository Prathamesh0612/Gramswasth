import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Leaf, Activity, AlertCircle } from 'lucide-react';
import { usePatient } from '../../context/PatientContext';

export default function SymptomChecker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addRecordToProfile } = usePatient(); // Connect to centralized DB sync hook
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);

  const analyze = async () => {
    if (!input.trim()) return;
    
    try {
      // Use real backend AI API
      const res = await aiAPI.checkSymptoms({ symptoms: [input] });
      if (res.success && res.data) {
        setResult({
          conditions: res.data.condition ? [res.data.condition] : ['cond_unknown'],
          rec: res.data.health_tips?.[0] || 'rec_unknown',
          isReal: true
        });

        // Silently save this analysis to the user's profile
        addRecordToProfile('symptoms', {
          input_text: input,
          identified_conditions: res.data.condition ? [res.data.condition] : [],
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("AI Analysis error:", err);
      // Fallback or error state
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800">{t('symptomChecker')}</h1>
      </header>
      <main className="flex-1 flex flex-col gap-5 px-4 py-6 max-w-md mx-auto w-full">
        <div className="gs-card flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sage-700 font-semibold"><Activity size={18} /> {t('describeSymptoms')}</div>
          <textarea
            className="gs-input min-h-[100px] resize-none"
            placeholder={t('symptom_placeholder')}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button className="btn-primary" onClick={analyze}>{t('analyze')}</button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gs-card flex flex-col gap-3">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <AlertCircle size={16} className="text-amber-500" /> {t('possibleConditions')}
              </div>
              <div className="flex flex-wrap gap-2">
                {result.conditions.map(ck => <span key={ck} className="chip bg-sage-100 text-sage-700">{result.isReal ? ck : t(ck)}</span>)}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 leading-relaxed">{result.isReal ? result.rec : t(result.rec)}</div>
              <p className="text-xs text-gray-400 text-center">{t('disclaimer')}</p>
              <button className="btn-primary" onClick={() => navigate('/patient/consultation')}>🩺 {t('consultDoctor')}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
