import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const { t } = useTranslation();
  return (
    <div className="offline-banner flex items-center justify-center gap-2 z-50 sticky top-0">
      <WifiOff size={14} />
      <span>{t('offlineBanner')}</span>
    </div>
  );
}
