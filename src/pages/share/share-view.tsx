import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import axios from "@utils/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ShareStatsPage from "./share-stats";

interface SharedLinkInfo {
  slug: string;
  name: string;
  domain: string;
  password_protected: boolean;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; info: SharedLinkInfo };

export default function ShareView() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ status: "loading" });

  // 密码仅用于换取短期只读 Token，统计请求不携带明文密码。
  const [password, setPassword] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [pwError, setPwError] = useState<"wrong" | "rateLimited" | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleAuthExpired = useCallback(() => {
    setShareToken(null);
    setPassword("");
    setPwError(null);
  }, []);

  useEffect(() => {
    if (!slug) { setState({ status: "error" }); return; }
    axios
      .get<{ code: number; data: SharedLinkInfo }>(`/share/${slug}`)
      .then((res) => setState({ status: "ready", info: res.data.data }))
      .catch(() => setState({ status: "error" }));
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        {t("share.loading")}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        {t("share.notFound")}
      </div>
    );
  }

  // 需要密码且尚未验证：显示密码输入
  if (state.info.password_protected && shareToken === null) {
    const verify = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) return;
      setVerifying(true);
      setPwError(null);
      try {
        const res = await axios.post<{ code: number; data?: { token: string } }>(
          `/share/${state.info.slug}/authenticate`,
          { password },
        );
        if (res.data.code === 200 && res.data.data?.token) {
          setShareToken(res.data.data.token);
          setPassword("");
        } else {
          setPwError(res.data.code === 429 ? "rateLimited" : "wrong");
        }
      } catch (error) {
        const rateLimited = isAxiosError<{ code?: number }>(error) &&
          (error.response?.status === 429 || error.response?.data?.code === 429);
        setPwError(rateLimited ? "rateLimited" : "wrong");
      } finally {
        setVerifying(false);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-background">
        <Card className="w-full max-w-sm rounded-2xl border-border/80 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{state.info.name}</CardTitle>
            <CardDescription>{t("share.passwordPrompt")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={verify} className="space-y-3">
              <Input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("share.passwordPlaceholder")}
              />
              {pwError && (
                <p className="text-xs text-destructive">
                  {t(pwError === "rateLimited" ? "share.passwordRateLimited" : "share.passwordWrong")}
                </p>
              )}
              <Button
                type="submit"
                disabled={verifying || !password}
                className="w-full"
              >
                {verifying ? t("share.loading") : t("share.passwordSubmit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ShareStatsPage
      domain={state.info.domain}
      slug={slug!}
      linkName={state.info.name}
      shareToken={shareToken ?? undefined}
      onAuthExpired={handleAuthExpired}
    />
  );
}
