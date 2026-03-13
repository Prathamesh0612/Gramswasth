import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ToggleLeft, ToggleRight, Leaf, LogOut, Clock,
  MessageCircle, Users, AlertTriangle, FileText, X, Hospital, UserCircle2, Video, ImagePlus, FilePlus2, History as HistoryIcon
} from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { doctorAPI, consultationAPI, emergencyAPI, mediaAPI } from '../../services/api';
import { socketService } from '../../services/socketService';

export default function DoctorDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  
  // Data
  const [queue, setQueue] = useState([]);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const fileInputRef = useRef(null);

  const [newRequestBadge, setNewRequestBadge] = useState(false);

  useEffect(() => {
    fetchProfileAndQueue();

    // Auto-refresh queue every 10 seconds as a reliable fallback
    const interval = setInterval(fetchProfileAndQueue, 10000);

    // Setup Socket.IO
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
      
      socketService.on('emergency_alert', (data) => {
        setEmergencyAlert(data);
        if (activeTab !== 'consultation') setActiveTab('queue');
      });

      socketService.on('receive_message', (data) => {
        if (data.sender_id !== localStorage.getItem('userId')) {
           setChat(c => [...c, { sender: 'patient', text: data.message, image: data.image, time: data.timestamp }]);
        }
      });

      socketService.on('new_consultation_request', (data) => {
        console.log('New consultation request received:', data);
        fetchProfileAndQueue();
        setNewRequestBadge(true);
        setActiveTab('queue'); // Auto-switch to queue tab
      });
    }

    return () => {
      clearInterval(interval);
      socketService.off('emergency_alert');
      socketService.off('receive_message');
      socketService.off('new_consultation_request');
    };
  }, []);

  const fetchProfileAndQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Fetch queue (consultations assigned to this doctor)
      const qRes = await consultationAPI.getAll();
      if (qRes.success && Array.isArray(qRes.data)) {
        setQueue(qRes.data);
      }
      
      // Also fetch availability status
      try {
        const pRes = await doctorAPI.getProfile();
        if (pRes.success) setAvailable(pRes.data?.is_available ?? true);
      } catch (e) { /* ignore */ }
      
    } catch (err) {
      console.error('Queue fetch error:', err);
    }
  };

  const toggleAvailability = async () => {
    try {
      const res = await doctorAPI.updateProfile({ available: !available });
      setAvailable(res.is_available);
    } catch (err) {
      console.error(err);
    }
  };

  const acceptEmergency = async () => {
    if (!emergencyAlert) return;
    try {
      await emergencyAPI.accept(emergencyAlert.alert_id);
      setEmergencyAlert(null);
      fetchProfileAndQueue(); // refresh to show emergency in queue
    } catch (err) {
      console.error('Failed to accept emergency', err);
    }
  };

  const acceptConsultation = async (consultation) => {
    try {
      if (consultation.status === 'pending') {
        await consultationAPI.accept(consultation.id);
      }
      setActiveConsultation(consultation);
      setActiveTab('consultation');
      socketService.emit('join_consultation', { consultation_id: consultation.id });
      setChat([]); // reset chat for new consultation
    } catch (err) {
      console.error('Failed to accept consultation', err);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const sendMsg = () => {
    if (!msg.trim() || !activeConsultation) return;
    
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setChat(c => [...c, { sender: 'doctor', text: msg, time }]);
    
    socketService.emit('send_message', {
      consultation_id: activeConsultation.id,
      sender_id: localStorage.getItem('userId'),
      message: msg,
      timestamp: time
    });
    setMsg('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file && activeConsultation) {
      setIsUploading(true);
      try {
        const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        // Upload to Cloudinary
        const res = await mediaAPI.upload(file);
        console.log('Upload response:', res); // Debug log
        
        if (res.success && res.data?.image_url) {
          const remoteUrl = res.data.image_url;
          setChat(c => [...c, { sender: 'doctor', image: remoteUrl, time }]);
          
          socketService.emit('send_message', {
            consultation_id: activeConsultation.id,
            sender_id: localStorage.getItem('userId'),
            image: remoteUrl,
            timestamp: time
          });
        } else {
          console.error('Upload failed:', res.error || 'Unknown error');
          alert("Image upload failed. Try again.");
        }
      } catch (err) {
        console.error("Image upload error:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const NAV = [
    { key: 'queue',        icon: Users,         label: t('patientQueue') || 'Queue' },
    { key: 'consultation', icon: MessageCircle, label: t('consultation') || 'Ongoing' },
    { key: 'history',      icon: HistoryIcon,    label: t('history') || 'History' },
  ];

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <AnimatePresence>
        {emergencyAlert && (
          <motion.div initial={{ y: -80 }} animate={{ y: 0 }} exit={{ y: -80 }}
            className="bg-amber-50 border-b-2 border-amber-400 px-4 py-3 pt-safe-top flex items-center gap-3 sticky top-0 z-50">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-amber-800 truncate">🚨 SOS from {emergencyAlert.patient_name}</div>
              <div className="text-xs text-amber-600">{emergencyAlert.location}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={acceptEmergency}
                className="bg-terra-500 text-white text-xs font-bold px-3 py-1.5 rounded-pill">
                {t('accept')}
              </button>
              <button onClick={() => setEmergencyAlert(null)} className="p-1.5 rounded-full hover:bg-amber-100">
                <X size={16} className="text-amber-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b border-cream-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={16} className="text-white" /></div>
          <div>
            <div className="font-bold text-sage-600 text-sm">Dashboard</div>
            <div className="text-xs text-gray-500">Live View</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleAvailability}
            className={`flex items-center gap-1 chip ${available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {available ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <span className="text-xs font-medium">{available ? t('available') : t('busy')}</span>
          </button>
          <LanguageSwitcher />
          <button onClick={() => navigate('/doctor/profile')} className="p-2 rounded-xl hover:bg-cream-100">
            <UserCircle2 size={18} className="text-sage-500" />
          </button>
          <button onClick={() => {
            socketService.disconnect();
            localStorage.clear();
            navigate('/role');
          }} className="p-2 rounded-xl hover:bg-cream-100">
            <LogOut size={16} className="text-gray-400" />
          </button>
        </div>
      </header>

      <div className="flex gap-1 px-4 py-3">
        {NAV.map(n => {
          const Icon = n.icon;
          return (
            <button key={n.key} onClick={() => setActiveTab(n.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${activeTab === n.key ? 'bg-sage-500 text-white shadow-soft' : 'bg-cream-100 text-gray-500'}`}>
              <Icon size={15} /> {n.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="wait">
          {activeTab === 'queue' ? (
            <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                {newRequestBadge && (
                  <div className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> New patient waiting!
                  </div>
                )}
                <button 
                  onClick={() => { fetchProfileAndQueue(); setNewRequestBadge(false); }}
                  className="ml-auto text-xs text-sage-600 bg-cream-100 hover:bg-cream-200 px-3 py-1.5 rounded-full font-semibold transition-colors"
                >
                  ↻ Refresh Queue
                </button>
              </div>
              {queue.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length === 0 ? (
                <div className="text-center text-gray-400 py-10 flex flex-col items-center gap-2">
                  <span className="text-3xl">🩺</span>
                  <p className="font-medium text-gray-500">No patients in queue yet.</p>
                  <p className="text-sm">Waiting for incoming requests...</p>
                </div>
              ) : (
                queue.filter(p => p.status !== 'completed' && p.status !== 'cancelled').map(p => (
                  <div key={p.id} className="gs-card flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{p.patient_name || 'Patient'}</span>
                          <span className="text-xs text-gray-500">{p.village}</span>
                          <span className={`chip ${p.type === 'emergency' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {p.type === 'emergency' ? t('emergency_tag') : p.status}
                          </span>
                          {p.type === 'video' && <span className="chip bg-emerald-100 text-emerald-700">📹 Video</span>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 leading-tight">{p.notes || 'No notes left'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { acceptConsultation(p); setNewRequestBadge(false); }} className="flex-1 btn-primary !py-2.5 !text-sm">
                        {p.status === 'pending' ? '✓ Accept & Start' : 'Open Chat'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : activeTab === 'history' ? (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
               <div className="flex items-center justify-between px-1">
                 <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Past Consultations</div>
               </div>
               {queue.filter(p => p.status === 'completed' || p.status === 'cancelled').length === 0 ? (
                 <div className="text-center text-gray-400 py-10">No history found.</div>
               ) : (
                 queue.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => (
                   <div key={p.id} className="gs-card flex flex-col gap-2 !bg-gray-50/50">
                     <div className="flex items-center justify-between">
                       <span className="font-semibold text-gray-700 text-sm">{p.patient_name}</span>
                       <span className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleDateString()}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                         {p.status}
                       </span>
                       <span className="text-[10px] text-gray-500">{p.village}</span>
                     </div>
                   </div>
                 ))
               )}
            </motion.div>
          ) : (
            <motion.div key="consultation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {!activeConsultation ? (
                <div className="text-center text-gray-500 py-10">Please accept a patient from the queue to start.</div>
              ) : (
                <>
                  <div className="gs-card flex items-center gap-3 !py-3">
                    <div className="w-9 h-9 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sage-700 font-bold text-sm">P</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">{activeConsultation.patient_name}</div>
                      <div className="text-xs text-gray-500">{activeConsultation.village}</div>
                    </div>
                  </div>

                  <div className="gs-card flex flex-col gap-3 min-h-48">
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                      {chat.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-snug
                            ${m.sender === 'doctor' ? 'bg-sage-500 text-white rounded-br-sm' : 'bg-cream-200 text-gray-800 rounded-bl-sm'}`}>
                            {m.image ? (
                              <img src={m.image} alt="Upload" className="max-w-full rounded-lg mb-1 max-h-40 object-cover" />
                            ) : (
                              m.text
                            )}
                            <div className="text-xs opacity-60 mt-0.5 text-right">{m.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-cream-200">
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="text-sage-500 p-2 hover:bg-cream-200 rounded-xl flex-shrink-0 transition-colors">
                        <ImagePlus size={20} />
                      </button>
                      <input className="gs-input flex-1 !text-sm !py-2.5" placeholder={t('typeMessage')}
                        value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} />
                      <button onClick={sendMsg} className="bg-sage-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0">{t('send')}</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1">Active Consultation</div>
                    <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        navigate('/doctor/prescription-form', {
                          state: { consultationId: activeConsultation.id },
                        })
                      }
                      className="btn-outline !rounded-xl flex items-center justify-center gap-2 !text-sm"
                    >
                      <FilePlus2 size={15} />
                      {t('writePrescription') || 'Prescription'}
                    </button>
                    <button
                      onClick={() =>
                        navigate('/doctor/videocall', {
                          state: { consultationId: activeConsultation.id },
                        })
                      }
                      className="btn-primary !rounded-xl flex items-center justify-center gap-2 !text-sm shadow-md shadow-emerald-100"
                    >
                      <Video size={15} /> Join Video Call
                    </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
