// Language switcher dropdown with all 22 Indian scheduled languages
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാளം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'ks', name: 'Kashmiri', native: 'کٲشُر' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी' },
  { code: 'mni', name: 'Manipuri', native: 'মৈতৈ' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'bod', name: 'Bodo', native: 'बड़ो' },
];

export { LANGUAGES };

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const select = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('gramswasth_lang', code);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-pill px-3 py-2 text-sm font-medium text-gray-700 hover:border-sage-400 transition-colors shadow-soft"
      >
        <Globe size={15} className="text-sage-500" />
        <span className="max-w-[80px] truncate">{current.native}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto py-1">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={`w-full text-left flex items-center justify-between px-4 py-2.5 text-sm hover:bg-cream-100 transition-colors
                ${l.code === i18n.language ? 'bg-cream-100 text-sage-600 font-semibold' : 'text-gray-700'}`}
            >
              <span>{l.native}</span>
              <span className="text-xs text-gray-400">{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
