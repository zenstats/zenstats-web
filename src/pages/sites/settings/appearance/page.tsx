import { Separator } from "@components/ui/separator"
import { AppearanceForm } from "./appearance-form"
import { useTranslation } from 'react-i18next'

export default function SettingsAppearancePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('settings.appearance.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('settings.appearance.description')}
        </p>
      </div>
      <Separator />
      <AppearanceForm />
    </div>
  )
}
