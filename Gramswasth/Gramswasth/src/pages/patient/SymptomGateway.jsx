import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Leaf, Activity, AlertCircle, Info, Zap, Mic, MicOff, Phone, Video, Loader2, CheckCircle } from 'lucide-react';
import { consultationAPI } from '../../services/api';
import { DISEASES } from '../../data/symptomData';

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
   const [triageState, setTriageState] = useState('INPUT'); // 'INPUT', 'CRITICAL', 'URGENT', 'LOCAL_RESULT', 'AI_RESULT'
   const [isCreating, setIsCreating] = useState(false);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [bandwidth, setBandwidth] = useState('low'); // 'low', 'high'
   const [localResult, setLocalResult] = useState(null);
   const [aiResult, setAiResult] = useState(null);
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

   const handleAnalyze = async () => {
      if (!transcript.trim()) return;

      // Check Bandwidth
      if (bandwidth === 'low') {
         // USE LOCAL KNOWLEDGE CACHE - BEST MATCH LOGIC
         const words = transcript.toLowerCase().split(/\W+/);
         
         let bestMatch = null;
         let maxMatches = 0;

         DISEASES.forEach(d => {
            const matchCount = d.keywords.filter(k => 
               words.some(w => w.includes(k.toLowerCase()) || k.toLowerCase().includes(w))
            ).length;

            if (matchCount > maxMatches) {
               maxMatches = matchCount;
               bestMatch = d;
            }
         });

         if (bestMatch && maxMatches > 0) {
            setLocalResult(bestMatch);
            setTriageState('LOCAL_RESULT');
            return;
         }
      } else {
         // HIGH BANDWIDTH - CALL AI API
         setIsAnalyzing(true);
         try {
            const { aiAPI } = await import('../../services/api');
            const res = await aiAPI.checkSymptoms({ 
               symptoms: [transcript],
               bandwidth: 'high'
            });
            if (res.success && res.data) {
               setAiResult(res.data);
               setTriageState('AI_RESULT');
               return;
            }
         } catch (err) {
            console.error("AI Analysis failed:", err);
            // Show a small hint that we fell back
            alert("AI connection failed. Using local knowledge cache instead.");
         } finally {
            setIsAnalyzing(false);
         }
      }

      // Best Match Fallback (if bandwidth was high but it failed or no LLM response)
      const words = transcript.toLowerCase().split(/\W+/);
      let bestMatch = null;
      let maxMatches = 0;

      DISEASES.forEach(d => {
         const matchCount = d.keywords.filter(k => 
            words.some(w => w.includes(k.toLowerCase()) || k.toLowerCase().includes(w))
         ).length;

         if (matchCount > maxMatches) {
            maxMatches = matchCount;
            bestMatch = d;
         }
      });

      if (bestMatch && maxMatches > 0) {
         setLocalResult(bestMatch);
         setTriageState('LOCAL_RESULT');
         return;
      }

      // Fallback for both modes if no instant match
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
         navigate('/patient/consultation', {
            state: {
               rawTranscript: transcript,
               symptoms: foundMinor
            }
         });
      } else {
         navigate('/patient/questionnaire', { state: { text: transcript.toLowerCase() } });
      }
   };

   return (
      <div className="min-h-dvh bg-white flex flex-col">
         <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
            <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100">
               <ArrowLeft size={20} className="text-gray-500" />
            </button>
            <div className="flex-1 flex flex-col">
               <h1 className="font-bold text-gray-800 leading-none">Symptom Assessment</h1>
               <div 
                  className={`flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full cursor-pointer transition-all ${bandwidth === 'high' ? 'bg-green-50' : 'bg-amber-50'}`} 
                  onClick={() => setBandwidth(b => b === 'low' ? 'high' : 'low')}
               >
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${bandwidth === 'high' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${bandwidth === 'high' ? 'text-green-700' : 'text-amber-700'}`}>
                     {bandwidth === 'high' ? 'AI Assessment Active' : 'Offline Mode: Local Cache'}
                  </span>
               </div>
            </div>
            <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center">
               <Leaf size={14} className="text-white" />
            </div>
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
                           disabled={!transcript.trim() || isAnalyzing}
                           className="w-full py-4 bg-sage-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage-700 transition-colors"
                        >
                           {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                           {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Symptoms'}
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

               {/* LOCAL CACHE RESULT STATE */}
               {triageState === 'LOCAL_RESULT' && localResult && (
                  <motion.div
                     key="local-stage"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="flex flex-col gap-5"
                  >
                     <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex items-center gap-3">
                        <CheckCircle className="text-sage-500" size={20} />
                        <span className="text-xs font-bold text-sage-800">Analysis completed using Offline Knowledge Cache</span>
                     </div>

                     <div className="gs-card flex flex-col gap-3 border-2 border-sage-300">
                        <div className="flex items-center justify-between">
                           <h3 className="font-bold text-gray-900 text-lg">{localResult.name}</h3>
                           {localResult.urgent && <span className="chip bg-red-100 text-red-600 font-bold text-[10px]">URGENT</span>}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-xl p-3 border border-sage-100">
                           {localResult.remedy}
                        </p>
                     </div>

                     <div className="flex flex-col gap-3">
                        <button
                           onClick={() => navigate('/patient/consultation')}
                           className="w-full py-4 bg-sage-600 text-white rounded-xl font-bold"
                        >
                           🩺 Book Consultation
                        </button>
                        <button
                           onClick={() => setTriageState('INPUT')}
                           className="w-full py-3 text-gray-500 font-medium text-sm"
                        >
                           Try another symptom
                        </button>
                     </div>
                  </motion.div>
               )}

               {/* AI RESULT STATE */}
               {triageState === 'AI_RESULT' && aiResult && (
                  <motion.div
                     key="ai-stage"
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex flex-col gap-5"
                  >
                     <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                        <Zap className={`text-blue-500 ${aiResult.is_llm ? 'animate-pulse' : ''}`} size={20} />
                        <span className="text-xs font-bold text-blue-800">
                           {aiResult.is_llm ? 'Llama 3.1 Analysis Complete' : 'Enhanced AI Analysis Complete'}
                        </span>
                     </div>

                     <div className="gs-card flex flex-col gap-3 border-2 border-blue-300">
                        <div className="flex items-center justify-between">
                           <h3 className="font-bold text-gray-900 text-lg capitalize">{aiResult.condition}</h3>
                           <span className={`chip font-bold text-[10px] ${aiResult.severity === 'high' || aiResult.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                              {aiResult.severity?.toUpperCase()}
                           </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-xl p-3 border border-blue-100">
                           {aiResult.action === 'call_108' ? 'Critical condition detected. Please seek immediate help.' : aiResult.action}
                        </p>
                        
                        {aiResult.health_tips && aiResult.health_tips.length > 0 && (
                           <div className="mt-2 space-y-2">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Health Tips:</p>
                              {aiResult.health_tips.slice(0, 3).map((tip, i) => (
                                 <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                    <div className="w-1 h-1 rounded-full bg-blue-300 mt-1.5 flex-shrink-0" />
                                    {tip}
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="flex flex-col gap-3">
                        <button
                           onClick={() => {
                              if (aiResult.action === 'call_108') {
                                 window.location.href = 'tel:108';
                              } else if (aiResult.action === 'online_doctor_video') {
                                 startEmergencyConsultation();
                              } else {
                                 navigate('/patient/consultation');
                              }
                           }}
                           className={`w-full py-4 text-white rounded-xl font-bold shadow-lg ${aiResult.emergency ? 'bg-red-600' : 'bg-blue-600'}`}
                        >
                           {aiResult.emergency ? '🚨 Emergency Help' : '🩺 Get Consultation'}
                        </button>
                        <button
                           onClick={() => setTriageState('INPUT')}
                           className="w-full py-3 text-gray-500 font-medium text-sm"
                        >
                           Try another symptom
                        </button>
                     </div>
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