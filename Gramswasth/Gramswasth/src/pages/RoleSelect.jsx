import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { User, Stethoscope, ShoppingBag, Leaf } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const roles = [
  { key: 'patient',  icon: User,          color: 'bg-sage-500',   textColor: 'text-white', path: '/patient/login',  labelEn: 'Patient',  labelHi: 'मरीज़' },
  { key: 'doctor',   icon: Stethoscope,   color: 'bg-terra-500',  textColor: 'text-white', path: '/doctor/login',   labelEn: 'Doctor',   labelHi: 'डॉक्टर' },
  { key: 'pharmacy', icon: ShoppingBag,   color: 'bg-cream-200',  textColor: 'text-sage-700', path: '/pharmacy/login', labelEn: 'Pharmacy', labelHi: 'दवाखाना' },
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe-top py-3 border-b border-cream-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center">
            <Leaf size={16} className="text-white" />
          </div>
          <span className="font-bold text-sage-600 text-lg">GramSwasth</span>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 gap-8">
        <div className="text-center">
          <h1 className="text-fluid-xl font-bold text-gray-800 leading-tight">{t('selectRole')}</h1>
          <p className="text-gray-500 mt-1 text-fluid-sm">{t('continueAs')} →</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(role.path)}
                className={`${role.color} ${role.textColor} rounded-card p-5 flex items-center gap-4 shadow-card hover:shadow-md active:scale-95 transition-all duration-150 text-left w-full`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="text-lg font-bold">{role.labelEn}</div>
                  <div className="text-sm opacity-80">{role.labelHi}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-2">
          🌿 {t('offlineNote')}
        </p>
      </div>
    </div>
  );
}
