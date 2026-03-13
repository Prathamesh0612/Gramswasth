import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Camera, Activity, ChevronRight, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePatient } from '../../context/PatientContext';

/* ─── Offline Decision Tree with DEEP Smart Keywords ─────────────────── */
const TREE = {
  id: 'root',
  question: 'What is your main problem?',
  options: [
    {
      label: 'Fever / बुखार', emoji: '🤒', keywords: ['fever', 'temperature', 'hot'],
      next: {
        question: 'How long have you had the fever?',
        options: [
          { label: 'Less than 2 days', keywords: ['morning', 'yesterday', '1 day', '2 days', 'today'], next: { result: 'fever_mild' } },
          { label: '2–5 days', keywords: ['3 days', '4 days', '5 days'], next: { result: 'fever_moderate' } },
          { label: 'More than 5 days', keywords: ['6 days', '7 days', 'week'], next: { result: 'fever_severe' } },
        ]
      }
    },
    {
      label: 'Headache / सिरदर्द', emoji: '🤕', keywords: ['headache', 'head hurts', 'migraine'],
      next: {
        question: 'Where is the pain?',
        options: [
          { label: 'Whole head / frontal', keywords: ['whole', 'front', 'everywhere'], next: { result: 'headache_tension' } },
          { label: 'One side only', keywords: ['one side', 'half', 'left', 'right'], next: { result: 'headache_migraine' } },
          { label: 'Back of head / neck', keywords: ['back', 'neck'], next: { result: 'headache_bp' } },
        ]
      }
    },
    {
      label: 'Stomach Pain / पेट दर्द', emoji: '🤢', keywords: ['stomach', 'belly', 'tummy', 'abdomen'],
      next: {
        question: 'Do you have diarrhea or vomiting?',
        options: [
          { label: 'Yes, both', keywords: ['both', 'vomiting and diarrhea'], next: { result: 'stomach_poi' } },
          { label: 'Only diarrhea', keywords: ['diarrhea', 'loose motion'], next: { result: 'stomach_ors' } },
          { label: 'No, just pain', keywords: ['just pain', 'gas', 'acid'], next: { result: 'stomach_gas' } },
        ]
      }
    },
    {
      label: 'Cough / खाँसी', emoji: '😮‍💨', keywords: ['cough', 'coughing'],
      next: {
        question: 'Is there blood in your cough?',
        options: [
          { label: 'Yes', keywords: ['blood', 'red'], next: { result: 'cough_blood' } },
          { label: 'No, dry cough', keywords: ['dry'], next: { result: 'cough_dry' } },
          { label: 'No, with phlegm', keywords: ['phlegm', 'wet', 'mucus'], next: { result: 'cough_wet' } },
        ]
      }
    },
    {
      label: 'Wound / Cut / घाव', emoji: '🩹', keywords: ['wound', 'cut', 'scratch'],
      next: {
        question: 'How deep is the wound?',
        options: [
          { label: 'Scratch / surface', keywords: ['scratch', 'small', 'surface'], next: { result: 'wound_minor' } },
          { label: 'Deep cut / bleeding', keywords: ['deep', 'bleeding'], next: { result: 'wound_deep' } },
          { label: 'Animal bite', keywords: ['dog', 'cat', 'bite'], next: { result: 'wound_bite' } },
        ]
      }
    },
  ]
};

const REMEDIES = {
  fever_mild:      { color: 'amber', icon: '🌡️', title: 'Mild Fever', remedy: 'Take paracetamol (500mg). Rest and drink plenty of fluids.', firstAid: ['Rest in a cool room','Drink ORS / coconut water','Paracetamol 500mg every 6 hrs'], urgent: false },
  fever_moderate:  { color: 'orange', icon: '🌡️', title: 'Moderate Fever', remedy: 'Fever 2–5 days needs doctor consultation soon.', firstAid: ['Paracetamol 500mg','ORS every hour','Consult doctor within 24 hrs'], urgent: false },
  fever_severe:    { color: 'red', icon: '⚠️', title: 'Prolonged Fever — See Doctor', remedy: 'Fever for more than 5 days requires immediate medical attention.', firstAid: ['Go to nearest hospital','Take paracetamol for now'], urgent: true },
  headache_tension:{ color: 'amber', icon: '🤕', title: 'Tension Headache', remedy: 'Usually due to stress or dehydration. Drink 2 glasses of water.', firstAid: ['Drink water immediately','Rest in dark quiet room','Paracetamol if needed'], urgent: false },
  headache_migraine:{ color: 'orange', icon: '🤕', title: 'Possible Migraine', remedy: 'One-sided pulsating headache may be migraine.', firstAid: ['Lie down in dark room','Apply ice pack to head','Consult doctor for recurring episodes'], urgent: false },
  headache_bp:     { color: 'red', icon: '❤️', title: 'Possible High BP', remedy: 'Headache at the back of head with neck stiffness can indicate high blood pressure.', firstAid: ['Check BP if available','Do not take pain killers yet','See doctor immediately'], urgent: true },
  stomach_poi:     { color: 'orange', icon: '🤢', title: 'Possible Food Poisoning', remedy: 'Rest your stomach. ORS is essential.', firstAid: ['ORS every 15 min','No solid food for 2 hrs','See doctor if > 24 hrs'], urgent: false },
  stomach_ors:     { color: 'amber', icon: '🤢', title: 'Diarrhea — ORS Needed', remedy: 'Take ORS immediately. Drink small amounts frequently.', firstAid: ['1 ORS sachet in 1L water','Sip every 5 min','Eat bland food (khichdi)'], urgent: false },
  stomach_gas:     { color: 'green', icon: '🤢', title: 'Indigestion / Gas', remedy: 'Mild stomach pain is often gas. Walk for 10 minutes.', firstAid: ['Walk lightly for 10 min','Drink warm water','Ajwain (carom seeds) can help'], urgent: false },
  cough_blood:     { color: 'red', icon: '🚨', title: 'EMERGENCY — Blood in Cough', remedy: 'Coughing blood is a serious symptom. Go to hospital immediately.', firstAid: ['Go to hospital NOW','Do not eat or drink','Note how much blood'], urgent: true },
  cough_dry:       { color: 'amber', icon: '😮‍💨', title: 'Dry Cough', remedy: 'Dry cough is often viral. Honey + ginger helps.', firstAid: ['Honey + ginger tea','Steam inhalation','Keep warm'], urgent: false },
  cough_wet:       { color: 'orange', icon: '😮‍💨', title: 'Productive Cough', remedy: 'Bring up phlegm by deep breathing. Steam inhalation helps.', firstAid: ['Steam inhalation twice daily','Drink warm water','Doctor if > 5 days'], urgent: false },
  wound_minor:     { color: 'green', icon: '🩹', title: 'Minor Wound', remedy: 'Clean and cover. Most surface wounds heal in 3–5 days.', firstAid: ['Wash with clean water & soap','Apply antiseptic (Dettol)','Cover with clean cloth'], urgent: false },
  wound_deep:      { color: 'orange', icon: '🩹', title: 'Deep Cut — Needs Stitches', remedy: 'Apply pressure to stop bleeding. Go to health center.', firstAid: ['Press firmly with clean cloth','Elevate the wound area','Go to health center'], urgent: true },
  wound_bite:      { color: 'red', icon: '🐕', title: 'Animal Bite — Rabies Risk', remedy: 'Animal bites need antirabies vaccine immediately.', firstAid: ['Wash wound for 15 min with soap','Go to hospital TODAY','Report the animal'], urgent: true },
};

export default function Questionnaire() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecordToProfile } = usePatient(); 
  const [node, setNode] = useState(TREE);
  const [history, setHistory] = useState([]);
  const hasProcessed = useRef(false);

  // --- THE DEEP AUTO-ANSWER ENGINE ---
  useEffect(() => {
    const text = location.state?.text;
    if (text && !hasProcessed.current) {
      hasProcessed.current = true; // Run only once

      // 1. Find the Main Problem
      const matchedRoot = TREE.options.find(opt => 
        opt.keywords?.some(k => text.includes(k))
      );

      if (matchedRoot) {
        // 2. See if we can answer the Follow-Up Question too!
        if (matchedRoot.next.options) {
          const matchedSub = matchedRoot.next.options.find(subOpt => 
            subOpt.keywords?.some(k => text.includes(k))
          );

          if (matchedSub) {
            // BOOM! Double-skip right to the solution!
            setHistory([TREE, matchedRoot.next]);
            setNode({ result: matchedSub.next.result });
            return;
          }
        }

        // 3. If we only found the main problem, skip to its follow-up question
        setHistory([TREE]);
        if (matchedRoot.next.result) {
          setNode({ result: matchedRoot.next.result });
        } else {
          setNode(matchedRoot.next);
        }
      }
    }
  }, [location.state]);

  const pick = (opt) => {
    if (opt.next.result) {
      setHistory(h => [...h, node]);
      setNode({ result: opt.next.result });
      addRecordToProfile('questionnaires', {
        diagnosis_key: opt.next.result,
        timestamp: new Date().toISOString()
      });
    } else {
      setHistory(h => [...h, node]);
      setNode(opt.next);
    }
  };

  const back = () => {
    if (history.length === 0) return;
    setNode(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  };

  const reset = () => { setNode(TREE); setHistory([]); };

  const remedy = node.result ? REMEDIES[node.result] : null;
  const colorMap = { red: 'border-red-400 bg-red-50', orange: 'border-orange-400 bg-orange-50', amber: 'border-amber-400 bg-amber-50', green: 'border-green-400 bg-green-50' };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={history.length > 0 ? back : () => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800 flex-1">Symptom Questionnaire</h1>
        <button className="chip bg-sage-100 text-sage-700 flex items-center gap-1.5 font-semibold cursor-pointer hover:bg-sage-200">
          <Scan size={13} /> AI Scan
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-2 self-start mb-4 chip bg-green-100 text-green-700">
          <CheckCircle size={12} /> Works offline — no internet needed
        </div>

        <AnimatePresence mode="wait">
          {remedy ? (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col gap-4">
              <div className={`gs-card border-2 ${colorMap[remedy.color]} flex flex-col gap-3`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{remedy.icon}</span>
                  <div>
                    <div className="font-bold text-gray-800 text-lg leading-tight">{remedy.title}</div>
                    {remedy.urgent && <span className="chip bg-red-500 text-white text-xs mt-1">⚠️ See Doctor Urgently</span>}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{remedy.remedy}</p>
              </div>

              <div className="gs-card flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Activity size={15} className="text-sage-500" /> First Aid Steps</h3>
                <ol className="flex flex-col gap-2">
                  {remedy.firstAid.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
                        ${remedy.urgent ? 'bg-red-100 text-red-600' : 'bg-sage-100 text-sage-700'}`}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* FINALLY! The button to see the doctor ONLY appears if the remedy page recommends it! */}
              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => navigate('/patient/videocall')}>
                🩺 Consult a Doctor Now
              </button>
              <button className="btn-outline" onClick={reset}>← Try Another Symptom</button>
            </motion.div>
          ) : (
            <motion.div key={node.question} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full flex flex-col gap-4">
              <div className="gs-card flex flex-col gap-1">
                <p className="font-bold text-gray-800 text-lg leading-snug">{node.question}</p>
              </div>
              <div className="flex flex-col gap-3">
                {node.options?.map((opt, i) => (
                  <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    onClick={() => pick(opt)}
                    className="gs-card flex items-center justify-between !py-4 hover:border-sage-400 hover:bg-sage-50 transition-all text-left group">
                    <span className="font-medium text-gray-800">{opt.emoji && <span className="mr-2">{opt.emoji}</span>}{opt.label}</span>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-sage-500 flex-shrink-0 transition-colors" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}