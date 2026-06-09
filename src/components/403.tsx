// 403 Forbidden component

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export default function Forbidden() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">{t('error.403')}</h1>
      <p className="text-2xl text-gray-700 mb-8">{t('error.forbidden')}</p>
      <Button variant="default" onClick={() => navigate("/")}>
        {t('error.backToHome')}
      </Button>
    </div>
  );
}
