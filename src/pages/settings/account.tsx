import { useEffect, useState } from "react";
import { User, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Loader2 } from "lucide-react";

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
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const subAccount = isSubAccount();

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem("name") || "");
  }, []);

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error(t('account.nameRequired'));
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await axios.put<BaseResponse<null>>("/user/profile", { name: name.trim() });
      if (data.code === 200) {
        localStorage.setItem("name", name.trim());
        window.dispatchEvent(new Event("zenstats:user-updated"));
        toast.success(t('account.saveSuccess'));
      } else {
        toast.error(t('account.saveFailed'));
      }
    } catch {
      toast.error(t('account.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error(t('account.passwordRequired'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('account.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('account.passwordTooShort'));
      return;
    }

    setIsPasswordLoading(true);
    try {
      const { data } = await axios.post<BaseResponse<null>>("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      if (data.code === 200) {
        toast.success(t('account.passwordChanged'));
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(t('account.passwordChangeFailed'));
      }
    } catch {
      toast.error(t('account.passwordChangeFailed'));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('account.title')}</h1>
        <p className="text-muted-foreground">{t('account.description')}</p>
      </div>

      {/* Profile Card */}
      <Card className="mb-6">
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
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('account.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('account.email')}</Label>
            <Input
              id="email"
              type="email"
              value={localStorage.getItem("email") || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">{t('account.emailDisabled')}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={isLoading || subAccount}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('account.saving') : t('account.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('account.changePassword')}</CardTitle>
              <CardDescription>{t('account.changePasswordDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oldPassword">{t('account.oldPassword')}</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('account.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('account.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={isPasswordLoading || subAccount}>
              {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPasswordLoading ? t('account.changingPassword') : t('account.changePasswordSubmit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
