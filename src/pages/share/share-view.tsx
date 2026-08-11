import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "@utils/axios";
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

  // 密码保护流程：info.password_protected 为真时先要求输入并校验密码，
  // 校验通过后把密码传给 ShareStatsPage，随每个统计请求发送。
  const [password, setPassword] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);
  const [pwError, setPwError] = useState(false);
  const [verifying, setVerifying] = useState(false);

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
  if (state.info.password_protected && verifiedPassword === null) {
    const verify = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) return;
      setVerifying(true);
      setPwError(false);
      try {
        // 用一个轻量统计请求校验密码；成功即视为通过
        const res = await axios.get<{ code: number }>(
          `/stats/${state.info.domain}/current-visitors`,
          { params: { slug: state.info.slug, link_password: password } },
        );
        if (res.data.code === 200) {
          setVerifiedPassword(password);
        } else {
          setPwError(true);
        }
      } catch {
        setPwError(true);
      } finally {
        setVerifying(false);
      }
    };

    return (
      <div className="flex items-center justify-center h-screen px-4">
        <form
          onSubmit={verify}
          className="w-full max-w-xs flex flex-col gap-3 rounded-lg border border-border p-6"
        >
          <h1 className="text-base font-semibold text-foreground">{state.info.name}</h1>
          <p className="text-sm text-muted-foreground">{t("share.passwordPrompt")}</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("share.passwordPlaceholder")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {pwError && (
            <p className="text-sm text-destructive">{t("share.passwordWrong")}</p>
          )}
          <button
            type="submit"
            disabled={verifying || !password}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {verifying ? t("share.loading") : t("share.passwordSubmit")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <ShareStatsPage
      domain={state.info.domain}
      slug={slug!}
      linkName={state.info.name}
      password={verifiedPassword ?? undefined}
    />
  );
}
