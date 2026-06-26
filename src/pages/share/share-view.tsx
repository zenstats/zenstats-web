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

  return (
    <ShareStatsPage
      domain={state.info.domain}
      slug={slug!}
      linkName={state.info.name}
    />
  );
}
