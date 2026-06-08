import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    setName(localStorage.getItem("name") || "");
    setEmail(localStorage.getItem("email") || "");
  }, []);

  const saveProfile = () => {
    localStorage.setItem("name", name.trim());
    localStorage.setItem("email", email.trim());
    window.dispatchEvent(new Event("zenstats:user-updated"));
    toast.success("用户设置已保存");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">用户设置</h1>
        <p className="text-muted-foreground">管理你的账户资料和偏好设置。</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>更新显示在右上角菜单中的信息。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile}>保存设置</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}