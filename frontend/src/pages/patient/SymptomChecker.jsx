import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Leaf, Activity, AlertCircle } from 'lucide-react';
import { aiAPI } from '../../services/api';

export default function SymptomChecker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Each rule maps to i18n keys for conditions and recommendation
  const RULES = {
    // English keywords that trigger each rule
    fever:   { keywords: ['fever', 'bukhar', 'kaychsal', 'jwara', 'ज्वर', 'बुखार', 'காய்ச்சல்', 'జ్వరం', 'জ্বর', 'ताव', 'ਬੁਖ਼ਾਰ'], conditions: ['cond_viral_fever','cond_malaria','cond_typhoid'],    rec: 'rec_fever' },
    headache:{ keywords: ['headache', 'head', 'sir','tala','माथा','siro','tala','तलावेदना','ਸਿਰਦਰਦ','डोके'],                                              conditions: ['cond_tension_headache','cond_migraine','cond_dehydration'], rec: 'rec_headache' },
    cough:   { keywords: ['cough', 'khansi', 'irumal','দাফেকা','కష','cof','खाँसी','ਖੰਘ'],                                                               conditions: ['cond_common_cold','cond_bronchitis','cond_allergies'],     rec: 'rec_cough' },
    chest:   { keywords: ['chest', 'seene','chati','nenje','छाती','ছাতি','ఛాతి','மார்பு','ਛਾਤੀ'],                                                        conditions: ['cond_angina','cond_acid_reflux','cond_muscle_strain'],     rec: 'rec_chest' },
    stomach: { keywords: ['stomach','pet','vayiru','karsham','buk','পেট','پیٹ','ਪੇਟ','वयिरू'],                                                           conditions: ['cond_gastritis','cond_food_poisoning','cond_ibs'],         rec: 'rec_stomach' },
    joint:   { keywords: ['joint','ghutna','muttu','mukkal','घुटना','মুটু','ਗੋਡੇ','joint','గుడ్డ'],                                                       conditions: ['cond_arthritis','cond_gout','cond_fatigue'],               rec: 'rec_joint' },
  };

  const analyze = async () => {
    if(!input.trim()) return;
    setLoading(true);
    
    try {
      // 1. Try real backend API
      const aiResult = await aiAPI.checkSymptoms({ symptoms: [input] });
      if (aiResult.success && aiResult.data) {
         setResult({
           conditions: [aiResult.data.condition],
           rec: aiResult.data.action,
           isEmergency: aiResult.data.emergency,
           fromApi: true
         });
         return;
      }
    } catch(err) {
      console.warn("AI API failed, falling back to local processing", err);
    } finally {
      setLoading(false);
    }

    // 2. Fallback to local offline rules
    const lower = input.toLowerCase();
    const matched = Object.values(RULES).find(r => r.keywords.some(kw => lower.includes(kw)));
    if (matched) {
      setResult({ conditions: matched.conditions, rec: matched.rec, fromApi: false });
    } else {
      setResult({ conditions: ['cond_unknown'], rec: 'rec_unknown', fromApi: false });
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
            disabled={loading}
          />
          <button className="btn-primary" disabled={loading || !input.trim()} onClick={analyze}>
            {loading ? 'Analyzing...' : t('analyze')}
          </button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gs-card flex flex-col gap-3">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <AlertCircle size={16} className="text-amber-500" /> {t('possibleConditions')}
              </div>
              <div className="flex flex-wrap gap-2">
                {result.conditions.map(ck => <span key={ck} className="chip bg-sage-100 text-sage-700">{result.fromApi ? ck : t(ck)}</span>)}
              </div>
              <div className={`border rounded-xl p-3 text-sm leading-relaxed ${result.isEmergency ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {result.fromApi ? result.rec : t(result.rec)}
              </div>
              <p className="text-xs text-gray-400 text-center">{t('disclaimer')}</p>
              
              {result.isEmergency ? (
                 <button className="btn-primary !bg-red-600 border-red-600 shadow-red-500/30" onClick={() => navigate('/patient/dashboard')}>🚨 Trigger Emergency SOS</button>
              ) : (
                 <button className="btn-primary" onClick={() => navigate('/patient/specialists')}>🩺 {t('consultDoctor')}</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
