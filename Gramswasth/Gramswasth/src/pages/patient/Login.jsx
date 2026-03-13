import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Hash, Leaf, WifiOff, ArrowLeft, User, Calendar, MapPin, Map, ChevronRight, ChevronLeft, Heart, AlertCircle, Pill, UserCheck, Zap } from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { usePatient } from '../../context/PatientContext';
import { authAPI } from '../../services/api';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh'
];

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'];

const ALLERGY_OPTIONS = [
  { key: 'pollen',     emoji: '🌸', label: 'Pollen' },
  { key: 'dust',       emoji: '💨', label: 'Dust' },
  { key: 'dairy',      emoji: '🥛', label: 'Dairy' },
  { key: 'nuts',       emoji: '🥜', label: 'Nuts' },
  { key: 'penicillin', emoji: '💊', label: 'Penicillin' },
  { key: 'sulpha',     emoji: '🧪', label: 'Sulphonamides' },
  { key: 'seafood',    emoji: '🐟', label: 'Seafood' },
  { key: 'latex',      emoji: '🧤', label: 'Latex' },
];

const CONDITION_OPTIONS = [
  { key: 'diabetes',      emoji: '🩸', label: 'Diabetes' },
  { key: 'hypertension',  emoji: '❤️', label: 'Hypertension' },
  { key: 'asthma',        emoji: '🫁', label: 'Asthma' },
  { key: 'heart',         emoji: '🫀', label: 'Heart Disease' },
  { key: 'thyroid',       emoji: '🦋', label: 'Thyroid' },
  { key: 'arthritis',     emoji: '🦴', label: 'Arthritis' },
  { key: 'kidney',        emoji: '🫘', label: 'Kidney Disease' },
  { key: 'anemia',        emoji: '🩺', label: 'Anemia' },
];

function Stepper({ step, t }) {
  const steps = [t('stepBasic'), t('stepMedical'), t('stepConfirm')];
  return (
    <div className="flex items-center gap-0 w-full mb-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
            ${i < step ? 'bg-sage-500 text-white' : i === step ? 'bg-sage-500 text-white ring-4 ring-sage-200' : 'bg-cream-200 text-gray-400'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 transition-all ${i < step ? 'bg-sage-500' : 'bg-cream-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ChipSelect({ options, selected, onToggle, t, prefix }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt.key);
        return (
          <button key={opt.key} type="button" onClick={() => onToggle(opt.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
              ${active ? 'bg-sage-500 text-white border-sage-500' : 'bg-white text-gray-600 border-gray-200 hover:border-sage-400'}`}>
            {opt.emoji} {t(prefix + opt.key) || opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PatientLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, updateProfile, addProfile } = usePatient();
  const [tab, setTab] = useState('login');
  const [regStep, setRegStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [basic, setBasic] = useState({ name: '', age: '', phone: '', village: '', state: '', gender: '' });
  const [medical, setMedical] = useState({ bloodType: '', allergies: [], conditions: [], currentMedications: '', emergencyContactName: '', emergencyContactPhone: '' });

  const toggleChip = (field, key) => setMedical(m => ({
    ...m,
    [field]: m[field].includes(key) ? m[field].filter(k => k !== key) : [...m[field], key]
  }));

  const sendOtpForRegister = async () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(basic.phone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      const res = await authAPI.sendOtp({ phone: basic.phone });
      if (res.success) {
        setRegStep(2);
      } else {
        alert(res.error || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending OTP");
    }
  };

  const sendOtpForLogin = async () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      const res = await authAPI.sendOtp({ phone });
      if (res.success) {
        setOtpSent(true);
      } else {
        alert(res.error || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending OTP");
    }
  };

  const handleRegister = async () => {
    if (otp.length !== 6 && otp !== '123456') {
      alert("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      const data = { 
        name: basic.name || 'Unknown Patient',
        phone: basic.phone,
        password: 'password123', // Legacy compatibility
        role: 'patient',
        village: basic.village,
        age: parseInt(basic.age) || 30,
        otp: otp
      };
      
      const regRes = await authAPI.register(data);
      if (!regRes.success) {
        throw new Error(regRes.error || "Registration failed");
      }
      
      // Auto-login after successful registration (mock password fallback handled natively)
      const res = await authAPI.login({ phone: basic.phone, password: 'password123' });
      if (res.success && res.data?.token && res.data?.user?.id) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('role', 'patient');

        if (!profile.phone) {
          updateProfile({ ...basic, ...medical, phone: basic.phone });
        } else {
          addProfile({ ...basic, ...medical, phone: basic.phone });
        }
        navigate('/patient/dashboard');
      } else {
        throw new Error(res.error || 'Failed to auto-login. Please login manually.');
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.message || 'Registration failed'));
    }
  };

  const handleLogin = async () => {
    if (otp.length !== 6 && otp !== '123456') {
      alert("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      const res = await authAPI.login({ phone, otp });
      if (res.success && res.data?.token && res.data?.user?.id) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('role', 'patient');
        
        updateProfile({ phone, name: res.data.user?.name || 'Patient', village: res.data.user?.village || 'Village' });
        navigate('/patient/dashboard');
      } else {
        alert("Login failed: " + (res.error || 'Invalid OTP. Have you registered?'));
      }
    } catch (err) {
      console.error(err);
      alert("Login failed. Ensure you have registered an account first.");
    }
  };

  const quickDemoLogin = async () => {
    try {
      const res = await authAPI.login({ phone: '9892090672', password: '123456', role: 'patient' });
      if (res.success && res.data?.token && res.data?.user?.id) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('role', 'patient');
        
        updateProfile({ 
          phone: '9892090672', 
          name: res.data.user?.name || 'Demo Patient', 
          village: res.data.user?.village || 'Demo Village' 
        });
        navigate('/patient/dashboard');
      } else {
        throw new Error(res.error || 'Demo login failed');
      }
    } catch (err) {
      alert("Demo login failed: " + (err.message || 'Invalid credentials'));
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200 pt-safe-top">
        <button onClick={() => navigate('/role')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
          <span className="font-bold text-sage-600">GramSwasth</span>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 py-6 gap-5 max-w-md mx-auto w-full">
        {/* Tab switcher */}
        <div className="w-full grid grid-cols-2 bg-cream-100 rounded-xl p-1 gap-1">
          {[{ key: 'login', en: 'Login', hi: 'प्रवेश करें' }, { key: 'register', en: 'Register', hi: 'पंजीकरण' }].map(tb => (
            <button key={tb.key} onClick={() => { setTab(tb.key); setRegStep(0); }}
              className={`py-3 rounded-lg text-sm font-semibold transition-all flex flex-col items-center leading-tight
                ${tab === tb.key ? 'bg-white text-sage-600 shadow-soft' : 'text-gray-500'}`}>
              <span>{tb.en}</span><span className="text-xs opacity-70">{tb.hi}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'login' ? (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full gs-card flex flex-col gap-5">
              <h2 className="text-xl font-bold text-gray-800">{t('login')} <span className="text-gray-400 font-normal text-base">/ प्रवेश करें</span></h2>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><Phone size={14} /> {t('phone')}</label>
                <input type="tel" inputMode="numeric" maxLength={10} className="gs-input" placeholder="9876543210"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/, ''))} disabled={otpSent} />
              </div>
              {otpSent && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><Hash size={14} /> {t('otp')}</label>
                  <input type="tel" inputMode="numeric" maxLength={6} className="gs-input tracking-widest text-center text-xl font-bold"
                    placeholder="• • • • • •" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ''))} />
                </motion.div>
              )}
              {!otpSent
                ? <button className="btn-primary" onClick={sendOtpForLogin}>{t('getOtp')} / OTP प्राप्त करें</button>
                : <button className="btn-primary" onClick={handleLogin}>{t('verify')}</button>}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <button className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-semibold py-2.5 rounded-lg transition-all" onClick={quickDemoLogin}>
                <Zap size={16} /> Demo Login
              </button>
              <p className="text-center text-sm text-gray-500">{t('newHere')}{' '}
                <button className="text-sage-600 font-semibold" onClick={() => setTab('register')}>{t('registerHere')}</button>
              </p>
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full flex flex-col gap-4">
              <Stepper step={regStep} t={t} />

              <AnimatePresence mode="wait">
                {/* STEP 0 — Basic Info */}
                {regStep === 0 && (
                  <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="gs-card flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><User size={18} className="text-sage-500" /> {t('sectionBasicInfo')}</h2>
                    {[
                      { key: 'name', icon: User,     label: t('fullName'),  type: 'text',   ph: 'Ramesh Kumar' },
                      { key: 'age',  icon: Calendar, label: t('age'),       type: 'number', ph: '35' },
                      { key: 'phone',icon: Phone,    label: t('phone'),     type: 'tel',    ph: '9876543210' },
                      { key: 'village',icon:MapPin,  label: t('village'),   type: 'text',   ph: 'Mandvi' },
                    ].map(f => {
                      const Icon = f.icon;
                      return (
                        <div key={f.key} className="flex flex-col gap-1">
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><Icon size={14} /> {f.label}</label>
                          <input type={f.type} className="gs-input" placeholder={f.ph}
                            value={basic[f.key]} onChange={e => setBasic(b => ({ ...b, [f.key]: e.target.value }))}
                            inputMode={f.type === 'number' || f.type === 'tel' ? 'numeric' : 'text'} />
                        </div>
                      );
                    })}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><Map size={14} /> {t('state')}</label>
                      <select className="gs-input" value={basic.state} onChange={e => setBasic(b => ({ ...b, state: e.target.value }))}>
                        <option value="">-- {t('state')} --</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><UserCheck size={14} /> {t('gender')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Male','Female','Other'].map(g => {
                          const gKey = g === 'Male' ? 'male' : g === 'Female' ? 'female' : 'otherGender';
                          return (
                            <button key={g} type="button" onClick={() => setBasic(b => ({ ...b, gender: g }))}
                              className={`py-2.5 rounded-xl text-sm font-medium border transition-all
                                ${basic.gender === g ? 'bg-sage-500 text-white border-sage-500' : 'bg-white text-gray-600 border-gray-200 hover:border-sage-400'}`}>
                              {g === 'Male' ? '👨' : g === 'Female' ? '👩' : '🧑'} {t(gKey)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setRegStep(1)}>
                      {t('nextMedical')} <ChevronRight size={16} />
                    </button>
                  </motion.div>
                )}

                {/* STEP 1 — Medical Details */}
                {regStep === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="gs-card flex flex-col gap-5">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Heart size={18} className="text-terra-500" /> {t('sectionMedical')}</h2>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-600">🩸 {t('bloodType')}</label>
                      <div className="flex flex-wrap gap-2">
                        {BLOOD_TYPES.map(bt => (
                          <button key={bt} type="button" onClick={() => setMedical(m => ({ ...m, bloodType: bt }))}
                            className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-all
                              ${medical.bloodType === bt ? 'bg-terra-500 text-white border-terra-500' : 'bg-white text-gray-600 border-gray-200 hover:border-terra-400'}`}>
                            {bt === 'Unknown' ? t('bloodTypeUnknown') : bt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500" /> {t('knownAllergies')}</label>
                      <ChipSelect options={ALLERGY_OPTIONS} selected={medical.allergies} onToggle={k => toggleChip('allergies', k)} t={t} prefix="allergy_" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-600">🏥 {t('chronicConditions')}</label>
                      <ChipSelect options={CONDITION_OPTIONS} selected={medical.conditions} onToggle={k => toggleChip('conditions', k)} t={t} prefix="condition_" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><Pill size={14} /> {t('currentMedications')}</label>
                      <textarea className="gs-input min-h-[72px] resize-none text-sm" placeholder={t('currentMedicationsPlaceholder')}
                        value={medical.currentMedications} onChange={e => setMedical(m => ({ ...m, currentMedications: e.target.value }))} />
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="text-sm font-medium text-gray-600">🆘 {t('emergencyContactSection')}</label>
                      <input className="gs-input text-sm" placeholder={t('emergencyContactName')}
                        value={medical.emergencyContactName} onChange={e => setMedical(m => ({ ...m, emergencyContactName: e.target.value }))} />
                      <input className="gs-input text-sm" type="tel" inputMode="numeric" placeholder={t('emergencyContactPhone')}
                        value={medical.emergencyContactPhone} onChange={e => setMedical(m => ({ ...m, emergencyContactPhone: e.target.value }))} />
                    </div>

                    <div className="flex gap-2">
                      <button className="btn-outline flex-1 flex items-center justify-center gap-1" onClick={() => setRegStep(0)}><ChevronLeft size={16} /> {t('back')}</button>
                      <button className="btn-primary flex-1 flex items-center justify-center gap-1" onClick={sendOtpForRegister}>{t('nextConfirm')} <ChevronRight size={16} /></button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 — OTP & Confirm */}
                {regStep === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="gs-card flex flex-col gap-5">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Phone size={18} className="text-sage-500" /> {t('sectionConfirmPhone')}</h2>
                    <div className="bg-cream-100 rounded-xl p-4 flex flex-col gap-1.5 text-sm text-gray-700">
                      <div><span className="text-gray-400 text-xs">{t('nameLabel')}</span><br/><strong>{basic.name || `— ${t('notProvided')}`}</strong></div>
                      <div><span className="text-gray-400 text-xs">{t('villageState')}</span><br/><strong>{basic.village || t('notProvided')}, {basic.state || t('notProvided')}</strong></div>
                      <div><span className="text-gray-400 text-xs">{t('bloodType')}</span><br/><strong>{medical.bloodType || t('bloodTypeUnknown')}</strong></div>
                      <div><span className="text-gray-400 text-xs">{t('knownAllergies')}</span><br/><strong>{medical.allergies.length ? medical.allergies.map(a => t('allergy_' + a)).join(', ') : t('allergiesNone')}</strong></div>
                      <div><span className="text-gray-400 text-xs">{t('chronicConditions')}</span><br/><strong>{medical.conditions.length ? medical.conditions.map(c => t('condition_' + c)).join(', ') : t('conditionsNone')}</strong></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><Hash size={14} /> {t('otpSentTo')} {basic.phone}</label>
                      <input type="tel" inputMode="numeric" maxLength={6} className="gs-input tracking-widest text-center text-xl font-bold"
                        placeholder="• • • • • •" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ''))} />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-outline flex-1 flex items-center justify-center gap-1" onClick={() => setRegStep(1)}><ChevronLeft size={16} /> {t('back')}</button>
                      <button className="btn-primary flex-1" onClick={handleRegister}>{t('createAccount')} ✓</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-center text-sm text-gray-500">{t('alreadyHave')}{' '}
                <button className="text-sage-600 font-semibold" onClick={() => setTab('login')}>{t('loginHere')}</button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-auto pb-2"><WifiOff size={12} /> {t('offlineNote')}</p>
      </div>
    </div>
  );
}
