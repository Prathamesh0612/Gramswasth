import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Stethoscope, Video, MessageCircle, Heart, Brain, Eye, Baby, Bone } from 'lucide-react';
import { consultationAPI } from '../../services/api';

export default function SpecialistSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [creating, setCreating] = useState(false);

  const startConsultation = async (mode) => {
    if (!selectedSpecialist || creating) return;
    setCreating(true);
    try {
      const payload = {
        type: mode === 'video' ? 'video' : 'chat',
        specialization_id: selectedSpecialist.id,
        specialization: selectedSpecialist.name,
        notes: `Selected Specialist: ${selectedSpecialist.name}`,
      };
      const res = await consultationAPI.create(payload);
      if (!res.success || !res.data?.id) {
        throw new Error(res.error || 'Failed to create consultation');
      }
      const consultationId = res.data.id;
      if (mode === 'video') {
        navigate('/videocall', { state: { consultationId } });
      } else {
        navigate('/patient/consultation', { state: { consultationId } });
      }
    } catch (e) {
      alert(e.message || 'Could not start consultation. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const SPECIALISTS = [
    { id: 'general', name: t('spec_general') || 'General Physician', icon: Stethoscope, color: 'text-sage-600', bg: 'bg-sage-100', desc: t('spec_general_desc') || 'Common illnesses, fever, cold' },
    { id: 'cardio', name: t('spec_cardio') || 'Cardiologist', icon: Heart, color: 'text-red-500', bg: 'bg-red-100', desc: t('spec_cardio_desc') || 'Heart, blood pressure' },
    { id: 'pediatric', name: t('spec_pediatric') || 'Pediatrician', icon: Baby, color: 'text-blue-500', bg: 'bg-blue-100', desc: t('spec_pediatric_desc') || 'Children & infant care' },
    { id: 'ortho', name: t('spec_ortho') || 'Orthopedist', icon: Bone, color: 'text-amber-600', bg: 'bg-amber-100', desc: t('spec_ortho_desc') || 'Bone, joint & muscle pain' },
    { id: 'neuro', name: t('spec_neuro') || 'Neurologist', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-100', desc: t('spec_neuro_desc') || 'Brain, nerves, headaches' },
    { id: 'eye', name: t('spec_eye') || 'Ophthalmologist', icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-100', desc: t('spec_eye_desc') || 'Eye and vision problems' },
  ];

  return (
    <div className="min-h-dvh bg-white flex flex-col pb-safe-bottom">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <h1 className="font-bold text-gray-800 flex-1">{t('consultDoctor') || 'Consult Doctor'}</h1>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full relative">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-gray-800">{t('selectSpecialist') || 'Select a Specialist'}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('whoDoYouNeed') || 'Who do you need to talk to today?'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-24">
          {SPECIALISTS.map((spec) => {
            const Icon = spec.icon;
            const isSelected = selectedSpecialist?.id === spec.id;
            return (
              <motion.button
                key={spec.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedSpecialist(spec)}
                className={`gs-card flex flex-col items-center text-center p-4 border-2 transition-all duration-200
                  ${isSelected ? 'border-sage-500 bg-sage-50/50 shadow-soft' : 'border-transparent'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isSelected ? 'bg-sage-500 text-white' : `${spec.bg} ${spec.color}`}`}>
                  <Icon size={24} className={isSelected ? 'text-white' : ''} />
                </div>
                <div className="font-bold text-gray-800 text-sm">{spec.name}</div>
                <div className="text-xs text-gray-500 mt-1 leading-tight">{spec.desc}</div>
              </motion.button>
            );
          })}
        </div>

        {/* Action Panel that slides up when a specialist is selected */}
        <AnimatePresence>
          {selectedSpecialist && (() => {
            const SelectedIcon = selectedSpecialist.icon;
            return (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-cream-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-30"
              >
                <div className="max-w-md mx-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center ${selectedSpecialist.bg} ${selectedSpecialist.color}`}>
                      <SelectedIcon size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 leading-tight">{t('consultDoctor') || 'Consult'} {selectedSpecialist.name}</div>
                      <div className="text-xs text-sage-600 font-medium tracking-wide uppercase">Doctors Available</div>
                    </div>
                  </div>
                
                <div className="flex gap-3">
                  <button 
                    disabled={creating}
                    onClick={() => startConsultation('chat')}
                    className="flex-1 btn-outline flex-col !py-3 !rounded-2xl gap-1 active:bg-cream-100"
                  >
                    <MessageCircle size={20} className="text-sage-600 mb-1" />
                    <span className="text-sm font-bold text-gray-800">{t('chatConsultation') || 'Chat Now'}</span>
                    <span className="text-xs text-gray-500 font-normal">Starts immediately</span>
                  </button>
                  <button 
                    disabled={creating}
                    onClick={() => startConsultation('video')}
                    className="flex-1 btn-primary flex-col !py-3 !rounded-2xl gap-1 shadow-md shadow-sage-200"
                  >
                    <Video size={20} className="text-white mb-1" />
                    <span className="text-sm font-bold text-white tracking-wide">{t('videoCallTitle') || 'Video Call'}</span>
                    <span className="text-xs text-sage-100 font-normal opacity-90">High quality</span>
                  </button>
                </div>
              </div>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </main>
    </div>
  );
}
