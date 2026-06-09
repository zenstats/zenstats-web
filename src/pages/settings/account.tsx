import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountSettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    setName(localStorage.getItem("name") || "");
    setEmail(localStorage.getItem("email") || "");
  }, []);

  const saveProfile = () => {
    localStorage.setItem("name", name.trim());
    localStorage.setItem("email", email.trim());
    window.dispatchEvent(new Event("zenstats:user-updated"));
    toast.success(t('account.saveSuccess'));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('account.title')}</h1>
        <p className="text-muted-foreground">{t('account.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('account.profile')}</CardTitle>
              <CardDescription>{t('account.profileDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('account.name')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('account.email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile}>{t('account.save')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}