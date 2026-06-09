import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import axios, { type BaseResponse } from "@utils/axios";

interface SetupFormData {
  email: string;
  password: string;
  name: string;
}

interface SetupResponse {
  token: string;
  refresh_token: string;
  user: {
    name: string;
    email: string;
  }
}

export default function Setup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<SetupFormData>({
    name: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    email: '',
    password: '',
    name: ''
  });
  const [serverError, setServerError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = t('setup.validation.nameRequired');
      isValid = false;
    }

    if (!formData.email) {
      newErrors.email = t('setup.validation.emailRequired');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('setup.validation.emailInvalid');
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = t('setup.validation.passwordRequired');
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = t('setup.validation.passwordMinLength');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 清除对应字段的错误提示
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // 清除服务器错误提示
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      const response = await axios.post<BaseResponse<SetupResponse>>('/auth/init', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (response.data.code === 200) {
        // 初始化成功，重定向到登录页

        localStorage.setItem("token", response.data.data.token)
        localStorage.setItem("refreshToken", response.data.data.refresh_token)
        localStorage.setItem("name", response.data.data.user.name)
        localStorage.setItem("email", response.data.data.user.email)

        navigate('/sites', {
          state: { success: t('setup.successMessage') }
        });

      } else {
        setServerError(response.data.message || t('setup.initFailed'));
      }
    } catch (error) {
      console.error('Setup error:', error);
      setServerError(t('setup.serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('setup.title')}</CardTitle>
          <CardDescription>
            {t('setup.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('setup.adminName')}</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('setup.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('setup.password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            onClick={handleSubmit}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t('setup.submitting') : t('setup.submit')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}