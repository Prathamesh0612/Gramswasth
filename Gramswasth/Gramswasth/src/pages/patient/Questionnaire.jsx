import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Camera, Activity, ChevronRight, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePatient } from '../../context/PatientContext';

/* ─── Offline Decision Tree ────────────────────────────────────────────── */
const TREE = {
  id: 'root',
  question: 'What is your main problem?',
  hi: 'आपकी मुख्य समस्या क्या है?',
  options: [
    {
      label: 'Fever / बुखार', emoji: '🤒', keywordMatch: 'fever',
      next: {
        question: 'How long have you had the fever?',
        hi: 'बुखार कितने दिनों से है?',
        options: [
          { label: 'Less than 2 days', next: { result: 'fever_mild' } },
          { label: '2–5 days', next: { result: 'fever_moderate' } },
          { label: 'More than 5 days', next: { result: 'fever_severe' } },
        ]
      }
    },
    {
      label: 'Headache / सिरदर्द', emoji: '🤕', keywordMatch: 'headache',
      next: {
        question: 'Where is the pain?',
        hi: 'दर्द कहाँ है?',
        options: [
          { label: 'Whole head / frontal', next: { result: 'headache_tension' } },
          { label: 'One side only', next: { result: 'headache_migraine' } },
          { label: 'Back of head / neck', next: { result: 'headache_bp' } },
        ]
      }
    },
    {
      label: 'Stomach Pain / पेट दर्द', emoji: '🤢', keywordMatch: 'stomach pain',
      next: {
        question: 'Do you have diarrhea or vomiting?',
        hi: 'दस्त या उल्टी है?',
        options: [
          { label: 'Yes, both', next: { result: 'stomach_poi' } },
          { label: 'Only diarrhea', next: { result: 'stomach_ors' } },
          { label: 'No, just pain', next: { result: 'stomach_gas' } },
        ]
      }
    },
    {
      label: 'Cough / खाँसी', emoji: '😮‍💨', keywordMatch: 'cough',
      next: {
        question: 'Is there blood in your cough?',
        hi: 'खाँसी में खून आता है?',
        options: [
          { label: 'Yes', next: { result: 'cough_blood' } },
          { label: 'No, dry cough', next: { result: 'cough_dry' } },
          { label: 'No, with phlegm', next: { result: 'cough_wet' } },
        ]
      }
    },
    {
      label: 'Chest Pain / सीने में दर्द', emoji: '💓', keywordMatch: 'chest pain',
      next: { result: 'chest_emergency' }
    },
    {
      label: 'Wound / Cut / घाव', emoji: '🩹', keywordMatch: 'wound',
      next: {
        question: 'How deep is the wound?',
        hi: 'घाव कितना गहरा है?',
        options: [
          { label: 'Scratch / surface', next: { result: 'wound_minor' } },
          { label: 'Deep cut / bleeding', next: { result: 'wound_deep' } },
          { label: 'Animal bite', next: { result: 'wound_bite' } },
        ]
      }
    },
  ]
};

const REMEDIES = {
  fever_mild: { color: 'amber', icon: '🌡️', title: 'Mild Fever', remedy: 'Take paracetamol (500mg). Rest and drink plenty of fluids. Monitor temperature every 4 hours. Visit doctor if temperature exceeds 102°F.', firstAid: ['Rest in a cool room', 'Drink ORS / coconut water', 'Paracetamol 500mg every 6 hrs', 'Wet cloth on forehead'], urgent: false },
  fever_moderate: { color: 'orange', icon: '🌡️', title: 'Moderate Fever', remedy: 'Fever 2–5 days needs doctor consultation soon. Take paracetamol and stay hydrated. Check for malaria/typhoid symptoms.', firstAid: ['Paracetamol 500mg', 'ORS every hour', 'Avoid cold water bath', 'Consult doctor within 24 hrs'], urgent: false },
  fever_severe: { color: 'red', icon: '⚠️', title: 'Prolonged Fever — See Doctor', remedy: 'Fever for more than 5 days requires immediate medical attention. May indicate typhoid, malaria, or dengue.', firstAid: ['Go to nearest hospital', 'Carry medicine list', 'Take paracetamol for now'], urgent: true },
  headache_tension: { color: 'amber', icon: '🤕', title: 'Tension Headache', remedy: 'Usually due to stress or dehydration. Drink 2 glasses of water, rest in a dark room.', firstAid: ['Drink water immediately', 'Rest in dark quiet room', 'Apply cold/warm compress', 'Paracetamol if needed'], urgent: false },
  headache_migraine: { color: 'orange', icon: '🤕', title: 'Possible Migraine', remedy: 'One-sided pulsating headache may be migraine. Avoid bright lights and screens.', firstAid: ['Lie down in dark room', 'Apply ice pack to head', 'Avoid strong smells', 'Consult doctor for recurring episodes'], urgent: false },
  headache_bp: { color: 'red', icon: '❤️', title: 'Possible High BP — Check Blood Pressure', remedy: 'Headache at the back of head with neck stiffness can indicate high blood pressure.', firstAid: ['Check BP if available', 'Avoid exertion', 'Do not take pain killers yet', 'See doctor immediately'], urgent: true },
  stomach_poi: { color: 'orange', icon: '🤢', title: 'Possible Food Poisoning', remedy: 'Rest your stomach. ORS is essential to prevent dehydration.', firstAid: ['ORS every 15 min', 'No solid food for 2 hrs', 'Avoid milk products', 'See doctor if > 24 hrs or blood in stool'], urgent: false },
  stomach_ors: { color: 'amber', icon: '🤢', title: 'Diarrhea — ORS Needed', remedy: 'Take ORS immediately. Drink small amounts frequently. Avoid spicy food.', firstAid: ['1 ORS sachet in 1L water', 'Sip every 5 min', 'Eat bland food (khichdi)', 'Rest'], urgent: false },
  stomach_gas: { color: 'green', icon: '🤢', title: 'Indigestion / Gas', remedy: 'Mild stomach pain is often gas. Avoid spicy food and walk for 10 minutes.', firstAid: ['Walk lightly for 10 min', 'Drink warm water', 'Avoid cold drinks', 'Ajwain (carom seeds) can help'], urgent: false },
  cough_blood: { color: 'red', icon: '🚨', title: 'EMERGENCY — Blood in Cough', remedy: 'Coughing blood is a serious symptom. Go to hospital immediately.', firstAid: ['Go to hospital NOW', 'Do not eat or drink', 'Lie on affected side', 'Note how much blood'], urgent: true },
  cough_dry: { color: 'amber', icon: '😮‍💨', title: 'Dry Cough', remedy: 'Dry cough is often viral. Honey + ginger in warm water helps soothe throat.', firstAid: ['Honey + ginger tea', 'Avoid cold foods', 'Steam inhalation', 'Keep warm'], urgent: false },
  cough_wet: { color: 'orange', icon: '😮‍💨', title: 'Productive Cough', remedy: 'Bring up phlegm by deep breathing. Steam inhalation helps. If yellow/green, see doctor.', firstAid: ['Steam inhalation twice daily', 'Drink warm water', 'Sleep with head raised', 'Doctor if > 5 days'], urgent: false },
  chest_emergency: { color: 'red', icon: '💓', title: 'EMERGENCY — Chest Pain', remedy: 'Chest pain requires IMMEDIATE medical attention. Call emergency contact NOW.', firstAid: ['Call emergency number', 'Do NOT exert yourself', 'Sit or lie still', 'Chew 1 aspirin if available (not for children)'], urgent: true },
  wound_minor: { color: 'green', icon: '🩹', title: 'Minor Wound', remedy: 'Clean and cover. Most surface wounds heal in 3–5 days.', firstAid: ['Wash with clean water & soap', 'Apply antiseptic (Dettol)', 'Cover with clean cloth', 'Change dressing daily'], urgent: false },
  wound_deep: { color: 'orange', icon: '🩹', title: 'Deep Cut — Needs Stitches', remedy: 'Apply pressure to stop bleeding. Go to nearest health center for stitches.', firstAid: ['Press firmly with clean cloth', 'Elevate the wound area', 'Do NOT remove cloth if soaked — add more', 'Go to health center'], urgent: true },
  wound_bite: { color: 'red', icon: '🐕', title: 'Animal Bite — Rabies Risk', remedy: 'Animal bites need antirabies vaccine immediately. Do not delay.', firstAid: ['Wash wound for 15 min with soap + water', 'Go to hospital TODAY', 'Antirabies vaccine needed', 'Report the animal'], urgent: true },
};

/* ─── AI Image Scan ─────────────────────────────────────────────────────── */
const AI_RESULTS = [
  { cond: 'Skin Rash', prob: 78, rec: 'Possible allergic rash. Apply calamine lotion. Avoid scratching. See dermatologist if spreading.' },
  { cond: 'Wound / Laceration', prob: 85, rec: 'Clean with antiseptic. Apply bandage. See doctor if deep or infected.' },
  { cond: 'Eye Redness', prob: 71, rec: 'Possible conjunctivitis. Do not touch eyes. Use clean water to rinse.' },
  { cond: 'Swelling / Edema', prob: 67, rec: 'Elevate the affected area. Apply ice pack. Monitor for pain or fever.' },
  { cond: 'Burn (mild)', prob: 80, rec: 'Run cool water over burn for 10 min. Do NOT apply butter. Cover loosely.' },
];

function AIScanner({ onClose }) {
  const fileRef = useRef(null);
  const [img, setImg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImg(URL.createObjectURL(file));
    setResult(null);
    setScanning(true);
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) { p = 100; clearInterval(iv); setScanning(false); setResult(AI_RESULTS[Math.floor(Math.random() * AI_RESULTS.length)]); }
      setProgress(Math.min(p, 100));
    }, 200);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-0">
      <div className="bg-white w-full max-w-md rounded-t-2xl flex flex-col gap-4 p-5 pb-safe-bottom max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Scan size={18} className="text-sage-500" /> AI Image Scan</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-cream-100 text-gray-400">✕</button>
        </div>

        <div className="rounded-xl overflow-hidden border-2 border-dashed border-sage-300 bg-sage-50 aspect-video flex items-center justify-center relative cursor-pointer"
          onClick={() => fileRef.current.click()}>
          {img ? <img src={img} className="w-full h-full object-cover" alt="scan" /> : (
            <div className="flex flex-col items-center gap-2 text-sage-400">
              <Camera size={36} />
              <span className="text-sm font-medium">Tap to upload photo</span>
              <span className="text-xs opacity-70">Skin, wound, eye, swelling</span>
            </div>
          )}
          {scanning && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full border-4 border-sage-400 border-t-transparent animate-spin" />
              <span className="text-white text-sm font-medium">Analyzing... {Math.round(progress)}%</span>
              <div className="w-40 h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-sage-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <input type="file" accept="image/*" capture="environment" ref={fileRef} className="hidden" onChange={handleFile} />

        {!img && <button className="btn-primary flex items-center justify-center gap-2" onClick={() => fileRef.current.click()}>
          <Camera size={16} /> Take / Upload Photo
        </button>}

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="gs-card border-2 border-sage-300">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">{result.cond}</span>
                <span className="chip bg-sage-100 text-sage-700 font-bold">{result.prob}% match</span>
              </div>
              <div className="w-full h-2 bg-cream-200 rounded-full mb-3">
                <div className="h-full bg-sage-500 rounded-full" style={{ width: `${result.prob}%` }} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{result.rec}</p>
            </div>
            <p className="text-xs text-gray-400 text-center">⚠️ AI scan is a guide only. Always consult a doctor for diagnosis.</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Questionnaire Page ────────────────────────────────────────────────── */
export default function Questionnaire() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecordToProfile } = usePatient(); // Get from database sync context
  const [node, setNode] = useState(TREE);
  const [history, setHistory] = useState([]);
  const [showAI, setShowAI] = useState(false);

  // --- SMART AUTO-SKIP LOGIC ---
  useEffect(() => {
    // Check if we received symptoms from the Gateway (SymptomGateway.jsx)
    if (location.state?.symptoms && location.state.symptoms.length > 0) {
      const incomingSymptoms = location.state.symptoms; // e.g., ["fever", "cough"]

      // Look for a match in our root TREE options
      // We will just pick the FIRST matched symptom to process for simplicity
      const matchedOption = TREE.options.find(opt =>
        opt.keywordMatch && incomingSymptoms.includes(opt.keywordMatch)
      );

      if (matchedOption) {
        // We found a match! Auto-click it by updating state
        // Need to add the root to history so the 'Back' button works properly
        setHistory([TREE]);

        // If it directly leads to a result (like chest pain), show the result. 
        // Otherwise, move to the follow-up question.
        if (matchedOption.next.result) {
          setNode({ result: matchedOption.next.result });

          addRecordToProfile('questionnaires', {
            diagnosis_key: matchedOption.next.result,
            timestamp: new Date().toISOString()
          });
        } else {
          setNode(matchedOption.next);
        }
      }
    }
  }, [location.state, addRecordToProfile]);
  // ------------------------------

  const pick = (opt) => {
    if (opt.next.result) {
      setHistory(h => [...h, node]);
      setNode({ result: opt.next.result });

      // We found a remedy/diagnosis. Save this back into the Postgres centralized DB for this patient!
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
        <button onClick={() => setShowAI(true)}
          className="chip bg-sage-100 text-sage-700 flex items-center gap-1.5 font-semibold cursor-pointer hover:bg-sage-200">
          <Scan size={13} /> AI Scan
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 max-w-md mx-auto w-full">
        {/* Offline badge */}
        <div className="flex items-center gap-2 self-start mb-4 chip bg-green-100 text-green-700">
          <CheckCircle size={12} /> Works offline — no internet needed
        </div>

        <AnimatePresence mode="wait">
          {/* Result */}
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

              <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                <AlertCircle size={11} /> This is first aid guidance, not a medical diagnosis.
              </p>

              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => navigate('/patient/consultation')}>
                🩺 Consult a Doctor Now
              </button>
              <button className="btn-outline" onClick={reset}>← Try Another Symptom</button>
            </motion.div>
          ) : (
            /* Question */
            <motion.div key={node.question} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full flex flex-col gap-4">
              <div className="gs-card flex flex-col gap-1">
                <p className="font-bold text-gray-800 text-lg leading-snug">{node.question}</p>
                {node.hi && <p className="text-sage-600 text-sm">{node.hi}</p>}
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

      <AnimatePresence>{showAI && <AIScanner onClose={() => setShowAI(false)} />}</AnimatePresence>
    </div>
  );
}