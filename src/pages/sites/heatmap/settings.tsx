import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";
import type { HeatmapConfig } from "./types";
const field = "rounded-md border bg-background px-3 py-2 text-sm";
export default function HeatmapSettings() {
  const { domain = "" } = useParams(),
    { t } = useTranslation();
  const base = `/sites/${encodeURIComponent(domain)}/heatmap`;
  const [config, setConfig] = useState<HeatmapConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<HeatmapConfig | null>(null);
  const [rules, setRules] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(false);
  const readOnly = isSubAccount() || config?.can_write === false;
  useEffect(() => {
    const controller = new AbortController();
    setConfig(null);
    setSavedConfig(null);
    setError(false);
    axios
      .get<BaseResponse<HeatmapConfig>>(base + "/config", {
        signal: controller.signal,
      })
      .then(({ data: res }) => {
        const saved = { ...res.data, groups: res.data.groups || [] };
        setConfig(saved);
        setSavedConfig(saved);
        setRules(res.data.paths.join("\n"));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base]);
  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await axios.put<BaseResponse<HeatmapConfig>>(
        base + "/config",
        {
          ...config,
          paths: rules
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean),
        },
      );
      const saved = {
        ...res.data.data,
        can_write: config.can_write,
        screenshot_available: config.screenshot_available,
      };
      setConfig(saved);
      setSavedConfig(saved);
      setRules(res.data.data.paths.join("\n"));
      toast.success(t("heatmap.saved"));
    } catch {
      /* axios reports request errors */
    } finally {
      setSaving(false);
    }
  }

  const entries = savedConfig
    ? [
        ...savedConfig.groups.map((g, index) => ({
          id: `group-${index}`,
          type: "key",
          name: g.key,
          path: g.path,
          example: g.example_url,
          query: new URLSearchParams({ scope: "key", key: g.key }).toString(),
        })),
        ...savedConfig.paths
          .filter((path) => !savedConfig.groups.some((g) => g.path === path))
          .map((path) => ({
            id: `path-${path}`,
            type: "url",
            name: path,
            path,
            example: "",
            query: new URLSearchParams({ scope: "url", path }).toString(),
          })),
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium">{t("heatmap.settings")}</h3>
        <Button asChild variant="outline">
          <Link to={`/sites/${domain}/heatmap`}>{t("heatmap.explore")}</Link>
        </Button>
      </div>
      {error && <p role="alert">{t("heatmap.loadFailed")}</p>}
      {!config && !error && <p>{t("common.loading")}</p>}
      {config && (
        <>
          <section
            className="space-y-3 rounded-lg border p-4"
            aria-labelledby="configured-heatmaps"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 id="configured-heatmaps" className="font-medium">
                {t("heatmap.configuredList")} ({entries.length})
              </h4>
              <span className="text-sm text-muted-foreground">
                {t(
                  savedConfig?.enabled ? "heatmap.enabled" : "heatmap.disabled",
                )}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("heatmap.configuredHelp")}
            </p>
            {entries.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {t("heatmap.noConfigured")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="p-2 font-medium">
                        {t("heatmap.configuredName")}
                      </th>
                      <th className="p-2 font-medium">
                        {t("heatmap.rulePath")}
                      </th>
                      <th className="p-2 font-medium">
                        {t("heatmap.exampleURL")}
                      </th>
                      <th className="p-2 font-medium">
                        {t("heatmap.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="p-2">
                          <span className="break-all font-medium">
                            {entry.name}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {t(
                              entry.type === "key"
                                ? "heatmap.byKey"
                                : "heatmap.byURL",
                            )}
                          </p>
                        </td>
                        <td className="p-2">
                          <code className="break-all">{entry.path}</code>
                        </td>
                        <td className="max-w-64 break-all p-2 text-muted-foreground">
                          {entry.example || "—"}
                        </td>
                        <td className="p-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to={`/sites/${domain}/heatmap?${entry.query}`}
                            >
                              {t("heatmap.viewConfigured")}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="rounded-lg border p-4">
            <p className="font-medium">
              {t("heatmap.settings")} ·{" "}
              {t(config.enabled ? "heatmap.enabled" : "heatmap.disabled")}
            </p>
            <div className="mt-4 space-y-4">
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
                  {t("heatmap.enable")}
                </label>
                <label className="block text-sm">
                  {t("heatmap.paths")}
                  <textarea
                    className={`${field} mt-1 block min-h-24 w-full`}
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    placeholder={"/pricing\n/blog/*"}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("heatmap.rulesHelp")}
                </p>
                <div className="space-y-3">
                  <h4 className="font-medium">{t("heatmap.groups")}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t("heatmap.groupsHelp")}
                  </p>
                  {config.groups.map((g, i) => (
                    <div key={i} className="space-y-2 rounded border p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-sm">
                          {t("heatmap.rulePath")}
                          <Input
                            value={g.path}
                            placeholder="/soft/*.html"
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                groups: config.groups.map((v, n) =>
                                  n === i ? { ...v, path: e.target.value } : v,
                                ),
                              })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          {t("heatmap.groupKey")}
                          <Input
                            value={g.key}
                            placeholder="software-detail"
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                groups: config.groups.map((v, n) =>
                                  n === i ? { ...v, key: e.target.value } : v,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                      <label className="block text-sm">
                        {t("heatmap.exampleURL")}
                        <Input
                          type="url"
                          value={g.example_url}
                          placeholder={`https://${domain}/soft/example.html`}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              groups: config.groups.map((v, n) =>
                                n === i
                                  ? { ...v, example_url: e.target.value }
                                  : v,
                              ),
                            })
                          }
                        />
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setConfig({
                            ...config,
                            groups: config.groups.filter((_, n) => n !== i),
                          })
                        }
                      >
                        {t("heatmap.removeRule")}
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={config.groups.length >= 50}
                    onClick={() =>
                      setConfig({
                        ...config,
                        groups: [
                          ...config.groups,
                          { path: "", key: "", example_url: "" },
                        ],
                      })
                    }
                  >
                    {t("heatmap.addRule")}
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <label className="text-sm">
                    {t("heatmap.sample")}
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
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
                    {t("heatmap.maxClicks")}
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={config.max_clicks}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          max_clicks: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("heatmap.rawDays")}
                    <Input
                      type="number"
                      min={1}
                      max={14}
                      value={config.raw_days}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          raw_days: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("heatmap.aggregateDays")}
                    <Input
                      type="number"
                      min={config.raw_days}
                      max={180}
                      value={config.aggregate_days}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          aggregate_days: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                {!readOnly && (
                  <Button disabled={saving} onClick={() => void save()}>
                    {t(saving ? "common.loading" : "heatmap.save")}
                  </Button>
                )}
              </fieldset>
              <p className="text-sm text-muted-foreground">
                {t("heatmap.timezone", { timezone: config.timezone })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("heatmap.retentionHelp")}
              </p>
              <p className="text-sm">{t("heatmap.installHelp")}</p>
              <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{`<script defer data-domain="${domain}" src="${window.location.origin}/js/script.js"\n  data-heatmap="true" data-heatmap-version="release-2026-11"\n  data-heatmap-variant="default" data-heatmap-key="software-detail"></script>\n<button data-zs-id="pricing.signup">Sign up</button>\n<div data-zs-ignore>Private content</div>`}</pre>
              <p className="text-xs text-muted-foreground">
                {t("heatmap.privacyHelp")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  config.screenshot_available
                    ? "heatmap.captureReady"
                    : "heatmap.captureUnavailable",
                )}
              </p>
              <Link
                to="/docs#heatmap"
                className="text-sm text-primary hover:underline"
              >
                {t("heatmap.documentation")}
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
