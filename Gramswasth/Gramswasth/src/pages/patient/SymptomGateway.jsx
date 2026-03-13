import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Leaf, Activity, AlertCircle, Info, Zap, Mic, MicOff, Phone, Video, Loader2 } from 'lucide-react';
import { consultationAPI } from '../../services/api';

// TIER 1: Ambulance / ER (Immediate Life Threat)
const criticalKeywords = [
   "chest pain", "heart", "stroke", "unconscious", "pass out",
   "seizure", "poison", "slur", "vision loss", "crush", "faint"
];

// TIER 2: Immediate Online Doctor (Urgent but not dying)
const urgentKeywords = [
   "severe pain", "bleed", "bleeding", "blood", "head injury", "numb",
   "droop", "burn", "fracture", "broken", "asthma",
   "breathing", "breathe", "dizzy", "high fever", "shortness of breath"
];

// TIER 3: Minor (Skip questionnaire, go directly to solution)
const minorKeywords = [
   "cough", "fever", "headache", "cold", "runny nose", "sore throat",
   "nausea", "vomit", "vomiting", "diarrhea", "fatigue", "body ache", "chills",
   "stomach pain", "wound", "cut"
];

export default function SymptomGateway() {
   const { t } = useTranslation();
   const navigate = useNavigate();

   const [transcript, setTranscript] = useState('');
   const [isListening, setIsListening] = useState(false);
   const [triageState, setTriageState] = useState('INPUT'); // 'INPUT', 'CRITICAL', 'URGENT'
   const [isCreating, setIsCreating] = useState(false);
   const recognitionRef = useRef(null);

   const startEmergencyConsultation = async () => {
      setIsCreating(true);
      try {
         const res = await consultationAPI.create({
            specialization_id: 'general',
            type: 'video',
            notes: `Emergency from Symptom Checker. Symptoms: ${transcript}`
         });
         if (res.success && res.data?.id) {
            navigate('/patient/videocall', { state: { consultationId: res.data.id } });
         } else {
            alert("Failed to start emergency consultation.");
         }
      } catch (err) {
         console.error(err);
         alert("Error starting consultation.");
      } finally {
         setIsCreating(false);
      }
   };

   // Smart Regex Matcher to ensure we only match whole words
   const checkKeywords = (text, keywordsArray) => {
      return keywordsArray.filter(word => {
         const regex = new RegExp(`\\b${word}\\b`, 'i');
         return regex.test(text);
      });
   };

   const toggleListening = () => {
      if (isListening) {
         recognitionRef.current?.stop();
         setIsListening(false);
         return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
         alert("Your browser does not support voice input. Please type your symptoms.");
         return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event) => {
         let currentTranscript = '';
         for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
         }
         setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
         console.error("Speech recognition error", event.error);
         setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
   };

   const handleAnalyze = () => {
      if (!transcript.trim()) return;

      // 1. Check Tier 1 (Critical) -> Triggers Red Ambulance UI
      const foundCritical = checkKeywords(transcript, criticalKeywords);
      if (foundCritical.length > 0) {
         setTriageState('CRITICAL');
         return;
      }

      // 2. Check Tier 2 (Urgent) -> Triggers Orange Online Doctor UI
      const foundUrgent = checkKeywords(transcript, urgentKeywords);
      if (foundUrgent.length > 0) {
         setTriageState('URGENT');
         return;
      }

      // 3. Check Tier 3 (Minor) -> SKIPS Questionnaire, goes to Solution
      const foundMinor = checkKeywords(transcript, minorKeywords);

      if (foundMinor.length > 0) {
         // SUCCESS! We found minor symptoms. 
         // NOTE: Make sure '/patient/consultation' is the correct route for your solution page!
         navigate('/patient/consultation', {
            state: {
               rawTranscript: transcript,
               symptoms: foundMinor
            }
         });
      } else {
         // 4. Fallback -> Only go to the manual questionnaire if the app has NO idea what they said
         navigate('/patient/questionnaire');
      }
   };

   return (
      <div className="min-h-dvh bg-white flex flex-col">
         <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
            <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100">
               <ArrowLeft size={20} className="text-gray-500" />
            </button>
            <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center">
               <Leaf size={13} className="text-white" />
            </div>
            <h1 className="font-bold text-gray-800">Symptom Assessment</h1>
         </header>

         <main className="flex-1 px-4 py-8 max-w-md mx-auto w-full flex flex-col gap-6">
            <AnimatePresence mode="wait">

               {/* DEFAULT INPUT STATE */}
               {triageState === 'INPUT' && (
                  <motion.div
                     key="input-stage"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="flex flex-col gap-6"
                  >
                     <div className="text-center mb-2">
                        <div className="w-16 h-16 bg-sage-50 rounded-3xl flex items-center justify-center text-sage-600 mx-auto mb-4">
                           <Activity size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">How are you feeling?</h2>
                        <p className="text-sm text-gray-500 mt-2 px-6">
                           Describe your symptoms using your voice or type them below. Our system will guide you to the right care.
                        </p>
                     </div>

                     <div className="relative">
                        <textarea
                           value={transcript}
                           onChange={(e) => setTranscript(e.target.value)}
                           placeholder="E.g., I have a mild fever and a dry cough..."
                           className="w-full h-36 p-4 pr-14 rounded-2xl border-2 border-sage-200 focus:border-sage-500 focus:ring-0 resize-none text-gray-700 bg-sage-50/30"
                        />
                        <button
                           onClick={toggleListening}
                           className={`absolute right-3 bottom-4 p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                              }`}
                        >
                           {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                     </div>

                     <div className="flex flex-col gap-3">
                        <button
                           onClick={handleAnalyze}
                           disabled={!transcript.trim()}
                           className="w-full py-4 bg-sage-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage-700 transition-colors"
                        >
                           <Zap size={18} />
                           Analyze Symptoms
                        </button>

                        <button
                           onClick={() => navigate('/patient/questionnaire')}
                           className="w-full py-3 text-sage-600 font-medium text-sm hover:bg-sage-50 rounded-xl transition-colors"
                        >
                           Skip to Manual Selection
                        </button>
                     </div>
                  </motion.div>
               )}

               {/* TIER 2: URGENT STATE (Online Doctor) */}
               {triageState === 'URGENT' && (
                  <motion.div
                     key="urgent-stage"
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex flex-col items-center text-center gap-6 mt-4"
                  >
                     <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 animate-pulse">
                        <AlertCircle size={48} />
                     </div>

                     <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Doctor Consultation Recommended</h2>
                        <p className="text-gray-600 px-4">
                           Your symptoms require professional medical advice, but do not appear to be life-threatening.
                        </p>
                     </div>

                     <div className="w-full bg-orange-50 border border-orange-200 rounded-2xl p-5 mt-2">
                        <button
                           onClick={startEmergencyConsultation}
                           disabled={isCreating}
                           className="w-full py-4 bg-[#A0522D] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#8B4513] transition-colors disabled:opacity-50"
                        >
                           {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Video size={20} />}
                           Emergency: Tap for immediate doctor help
                        </button>
                        <p className="text-xs text-orange-700 mt-4 font-medium">
                           Connect with our on-call physician online instantly.
                        </p>
                     </div>

                     <button
                        onClick={() => setTriageState('INPUT')}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mt-4"
                     >
                        <ArrowLeft size={16} />
                        Go back and edit symptoms
                     </button>
                  </motion.div>
               )}

               {/* TIER 1: CRITICAL STATE (108 Ambulance) */}
               {triageState === 'CRITICAL' && (
                  <motion.div
                     key="emergency-stage"
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex flex-col items-center text-center gap-6 mt-4"
                  >
                     <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-pulse">
                        <AlertCircle size={48} />
                     </div>

                     <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Critical Symptoms Detected</h2>
                        <p className="text-gray-600">
                           You may be experiencing a medical emergency. Please seek immediate medical attention.
                        </p>
                     </div>

                     <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-5 mt-2">
                        <button
                           onClick={() => window.location.href = 'tel:108'}
                           className="w-full py-4 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-red-700 transition-colors"
                        >
                           <Phone size={20} />
                           Call Ambulance (108)
                        </button>
                        <p className="text-xs text-red-500 mt-4 font-medium">
                           Do not wait for an online consultation. Proceed to the nearest hospital.
                        </p>
                     </div>

                     <button
                        onClick={() => setTriageState('INPUT')}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mt-4"
                     >
                        <ArrowLeft size={16} />
                        Go back and edit symptoms
                     </button>
                  </motion.div>
               )}

            </AnimatePresence>

            <div className="mt-auto p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
               <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="text-[11px] text-blue-800 font-medium">
                     This tool is an automated screener and does not replace official medical diagnosis by a doctor.
                  </p>
               </div>
            </div>
         </main>
      </div>
   );
}