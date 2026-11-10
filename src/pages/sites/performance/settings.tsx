import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";
import type { PerformanceConfig } from "./types";

export default function PerformanceSettings() {
  const { domain = "" } = useParams(),
    { t } = useTranslation();
  const base = `/sites/${encodeURIComponent(domain)}/performance`;
  const [config, setConfig] = useState<PerformanceConfig | null>(null),
    [error, setError] = useState(false),
    [saving, setSaving] = useState(false),
    [revision, setRevision] = useState(0);
  const [paths, setPaths] = useState("");
  const readOnly = isSubAccount() || config?.can_write === false;
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setConfig(null);
    axios
      .get<BaseResponse<PerformanceConfig>>(base + "/config", {
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          setConfig(res.data.data);
          setPaths(res.data.data.paths.join("\n"));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base, revision]);
  const trackerOrigin = window.location.origin;
  const snippet = `<script defer src="${trackerOrigin}/js/script.js"\n  data-domain="${domain}"\n  data-performance="true"\n  data-performance-version="release-1"></script>`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{t("performance.settings")}</h3>
        <Button asChild variant="outline">
          <Link to={`/sites/${domain}/performance`}>
            {t("performance.view")}
          </Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("performance.settingsHelp")}
      </p>
      {error && (
        <div role="alert">
          <p>{t("performance.failed")}</p>
          <Button onClick={() => setRevision((r) => r + 1)}>
            {t("common.retry")}
          </Button>
        </div>
      )}
      {!config && !error && <p>{t("common.loading")}</p>}
      {config && (
        <form
          className="space-y-4 rounded-lg border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (readOnly) return;
            setSaving(true);
            try {
              const { data: res } = await axios.put<
                BaseResponse<PerformanceConfig>
              >(base + "/config", {
                ...config,
                paths: paths
                  .split("\n")
                  .map((p) => p.trim())
                  .filter(Boolean),
              });
              setConfig({ ...res.data, can_write: config.can_write });
              setPaths(res.data.paths.join("\n"));
              toast.success(t("heatmap.saved"));
            } catch {
              /* axios reports errors */
            } finally {
              setSaving(false);
            }
          }}
        >
          <fieldset
            disabled={readOnly || saving}
            className="space-y-4 disabled:opacity-70"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  setConfig({ ...config, enabled: e.target.checked })
                }
              />
              {t("performance.enable")}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                {t("heatmap.sample")}
                <Input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={Math.round(config.sample_rate * 100)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sample_rate: Number(e.target.value) / 100,
                    })
                  }
                />
              </label>
              <label className="text-sm">
                {t("performance.retention")}
                <Input
                  type="number"
                  min={1}
                  max={7}
                  required
                  value={config.raw_days}
                  onChange={(e) =>
                    setConfig({ ...config, raw_days: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label className="block text-sm">
              {t("heatmap.paths")}
              <textarea
                className="mt-2 block min-h-28 w-full rounded border bg-background p-2 font-mono"
                value={paths}
                onChange={(e) => setPaths(e.target.value)}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {t("heatmap.rulesHelp")}
            </p>
            <Button type="submit">{t("heatmap.save")}</Button>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            {t("performance.configStatus", {
              version: config.config_version,
              timezone: config.timezone,
            })}
          </p>
        </form>
      )}
      <section className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">{t("performance.install")}</h4>
        <p className="text-sm text-muted-foreground">
          {t("performance.installHelp")}
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
          <code>{snippet}</code>
        </pre>
      </section>
    </div>
  );
}
