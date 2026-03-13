import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, WifiOff } from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { authAPI } from '../../services/api';

export default function DoctorLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // Regex validation for 10-digit Indian phone number
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      alert("Please enter password");
      return;
    }

    try {
      const res = await authAPI.login({ phone, password });
      if (res.success && res.data?.token && res.data?.user?.id) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('role', 'doctor');
        navigate('/doctor/dashboard');
      } else {
        throw new Error(res.error || 'Invalid credentials');
      }
    } catch (err) {
      alert("Login failed: " + (err.message || 'Invalid credentials'));
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
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 gap-6 max-w-md mx-auto w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-terra-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🩺</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Doctor Login</h1>
          <p className="text-gray-500 text-sm mt-1">डॉक्टर लॉगिन</p>
        </div>
        <div className="gs-card w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Doctor ID / Phone</label>
            <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/, ''))} className="gs-input" placeholder="Registered phone number" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="gs-input" placeholder="••••••••" />
          </div>
          <button className="btn-primary" onClick={handleLogin}>Login as Doctor</button>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1.5"><WifiOff size={12} /> {t('offlineNote')}</p>
      </div>
    </div>
  );
}
