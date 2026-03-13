import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Stethoscope, Pill, Activity, ShoppingBag,
  FileText, Download, ChevronRight, Leaf, LogOut, Droplets, Phone, AlertCircle,
  UserCircle2, HelpCircle, Video, ChevronDown, Plus
} from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import { usePatient } from '../../context/PatientContext';
import { consultationAPI, emergencyAPI } from '../../services/api';

export default function PatientDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { profile, profiles, switchProfile } = usePatient();
  const [emergency, setEmergency] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const HEALTH_INFO = [
    { icon: Droplets, label: t('bloodGroup'), value: profile.bloodType || 'O+', color: 'text-terra-500' },
    { icon: AlertCircle, label: t('allergies'), value: profile.allergies?.length ? profile.allergies.slice(0,2).join(', ') : t('health_none'), color: 'text-sage-600' },
    { icon: Phone, label: t('emergencyContact'), value: profile.emergencyContactPhone || '+91 98765 43210', color: 'text-gray-500' },
  ];

  const TILES = [
    { icon: Stethoscope, label: t('consultDoctor'),  bg: 'bg-sage-500',  text: 'text-white',    path: '/patient/specialists' },
    { icon: Pill,        label: t('prescriptions'),   bg: 'bg-cream-200', text: 'text-sage-700', path: '/patient/prescriptions' },
    { icon: Activity,   label: t('checkSymptoms'),   bg: 'bg-cream-200', text: 'text-sage-700', path: '/patient/symptoms' },
    { icon: HelpCircle, label: t('offlineQuestionnaire') || 'Questionnaire',       bg: 'bg-cream-200', text: 'text-sage-700', path: '/patient/questionnaire' },
    { icon: ShoppingBag,label: t('nearbyPharmacy'),  bg: 'bg-cream-100', text: 'text-gray-700', path: '/patient/pharmacy' },
  ];

  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await consultationAPI.getAll();
      setHistory(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const getLocationWithTimeout = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Location timeout'));
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        { timeout: 5000, maximumAge: 0 },
      );
    });
  };

  const handleEmergency = async () => {
    setEmergency(true);
    try {
      let locationPayload = { location: 'Manual location' };

      try {
        const position = await getLocationWithTimeout();
        const { latitude, longitude } = position.coords;
        locationPayload = {
          location: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`,
          latitude,
          longitude,
        };
      } catch (geoError) {
        console.warn('GPS location unavailable, falling back to manual location', geoError);
      }

      await emergencyAPI.createAlert(locationPayload);
      setTimeout(() => setEmergency(false), 3000);
    } catch (e) {
      console.error(e);
      setEmergency(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col pb-safe-bottom">
      <header className="bg-white border-b border-cream-200 px-4 py-3 pt-safe-top flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf size={16} className="text-white" />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-1 text-left"
            >
              <div>
                <div className="font-bold text-sage-600 text-sm leading-none flex items-center gap-1">
                  {profile.name || t('patient_ramesh')} <ChevronDown size={14} className="text-gray-400" />
                </div>
                <div className="text-xs text-gray-500 leading-none mt-1">{profile.village || t('village_mandvi')}</div>
              </div>
            </button>
            
            {showSwitcher && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-cream-200 z-50 overflow-hidden">
                  <div className="p-2 bg-cream-100 border-b border-cream-200 text-xs font-semibold text-gray-500 uppercase">
                    Select Profile
                  </div>
                  {profiles?.map((p, idx) => (
                    <button 
                      key={p.id || idx}
                      onClick={() => { switchProfile(idx); setShowSwitcher(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                        ${profile.id === p.id ? 'bg-sage-50 text-sage-600 font-semibold' : 'hover:bg-cream-100 text-gray-700'}`}
                    >
                      <span className="truncate">{p.name || `Patient ${idx+1}`}</span>
                      {profile.id === p.id && <div className="w-2 h-2 rounded-full bg-sage-500" />}
                    </button>
                  ))}
                  <button 
                    onClick={() => { setShowSwitcher(false); navigate('/patient/login'); }}
                    className="w-full text-left px-4 py-3 text-sm text-terra-600 font-medium hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-cream-200"
                  >
                    <Plus size={16} /> Add Family Member
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`chip ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isOnline ? t('online') : t('offline')}
          </div>
          <LanguageSwitcher />
          <button onClick={() => navigate('/patient/profile')} className="p-2 rounded-xl hover:bg-cream-100">
            <UserCircle2 size={18} className="text-sage-500" />
          </button>
          <button onClick={() => navigate('/role')} className="p-2 rounded-xl hover:bg-cream-100">
            <LogOut size={16} className="text-gray-400" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-2xl mx-auto w-full">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleEmergency}
          className={`btn-emergency flex items-center justify-center gap-3 rounded-card w-full ${emergency ? 'animate-pulse bg-red-700' : ''}`}
        >
          <span className="text-2xl">🚨</span>
          <div className="text-left">
            <div className="text-lg font-bold leading-none">{t('emergency')}</div>
            <div className="text-xs opacity-80 mt-0.5">{t('emergencyNote')}</div>
          </div>
        </motion.button>

        {emergency && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium text-center">
            🔴 {t('chat_emergency_msg')}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {HEALTH_INFO.map(info => {
            const Icon = info.icon;
            return (
              <div key={info.label} className="gs-card p-3 flex flex-col items-center text-center gap-1 !py-3">
                <Icon size={16} className={info.color} />
                <div className="text-xs text-gray-500 leading-tight">{info.label}</div>
                <div className="text-xs font-bold text-gray-800 leading-tight">{info.value}</div>
              </div>
            );
          })}
        </div>

        {/* Active Consultation Banner — shown if patient has a pending/active consultation */}
        {(() => {
          const active = history.find(c => ['pending', 'accepted', 'ongoing'].includes(c.status));
          if (!active) return null;
          const isLive = active.status === 'accepted' || active.status === 'ongoing';
          return (
            <div className={`rounded-2xl border-2 p-4 flex flex-col gap-3 ${isLive ? 'border-emerald-400 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                <div className="flex-1">
                  <div className="font-bold text-gray-800 text-sm">
                    {isLive ? '🎙️ Active Consultation' : '⏳ Waiting for Doctor'}
                  </div>
                  <div className="text-xs text-gray-500">Dr. {active.doctor_name || 'Assigned Doctor'} • {active.status}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/patient/consultation', { state: { consultationId: active.id } })}
                  className="flex-1 btn-outline !rounded-xl !text-sm !py-2.5"
                >
                  💬 Open Chat
                </button>
                {isLive && (
                  <button
                    onClick={() => navigate('/videocall', { state: { consultationId: active.id } })}
                    className="flex-1 btn-primary !rounded-xl !text-sm !py-2.5"
                  >
                    📹 Join Call
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-3">
          {TILES.map((tile, i) => {
            const Icon = tile.icon;
            const isColored = tile.bg !== 'bg-cream-200' && tile.bg !== 'bg-cream-100';
            return (
              <motion.button
                key={tile.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => navigate(tile.path)}
                className={`action-tile ${tile.bg} ${tile.text} border-0`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                  ${isColored ? 'bg-white/20' : 'bg-sage-100'}`}>
                  <Icon size={24} className={isColored ? 'text-white' : 'text-sage-600'} />
                </div>
                <div className="text-sm font-semibold leading-tight">{tile.label}</div>
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5">
            <FileText size={15} /> {t('recentActivity')}
          </h2>
          <div className="flex flex-col gap-2">
            {history.length === 0 ? (
               <div className="text-center text-sm text-gray-400 py-4">No recent activity</div>
            ) : history.map(item => (
              <div key={item.id} onClick={() => navigate('/patient/consultation', { state: { consultationId: item.id } })} className="gs-card flex items-center gap-3 !py-3.5 cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={16} className="text-sage-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800 truncate">Dr. {item.doctor_name || 'Assigned soon'}</div>
                  <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {item.type === 'emergency' && (
                    <span className="chip bg-red-100 text-red-600">{t('emergency_tag')}</span>
                  )}
                  <span className={`chip ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
