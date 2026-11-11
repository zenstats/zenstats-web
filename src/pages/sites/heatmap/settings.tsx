import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";
import type { HeatmapConfig } from "./types";
import {
  configurationID,
  configuredHeatmaps,
  heatmapQuery,
  removeHeatmap,
  updateHeatmap,
  type HeatmapDraft,
} from "./configurations";

const field = "rounded-md border bg-background px-3 py-2 text-sm";
const emptyDraft: HeatmapDraft = {
  type: "url",
  path: "",
  key: "",
  example: "",
};

export default function HeatmapSettings() {
  const { domain = "" } = useParams(),
    { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const base = `/sites/${encodeURIComponent(domain)}/heatmap`;
  const [config, setConfig] = useState<HeatmapConfig | null>(null);
  const [draft, setDraft] = useState<HeatmapDraft>(emptyDraft);
  const [collection, setCollection] = useState<HeatmapConfig | null>(null);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(false);
  const readOnly = isSubAccount() || config?.can_write === false;
  const entries = useMemo(
    () => (config ? configuredHeatmaps(config) : []),
    [config],
  );
  const selected = entries.find((e) => e.id === params.get("entry"));
  const requestedView = params.get("view");
  const view =
    requestedView === "new" ||
    requestedView === "edit" ||
    requestedView === "collection"
      ? requestedView
      : params.has("entry")
        ? "detail"
        : "list";
  const back = () => setParams({});

  useEffect(() => {
    const controller = new AbortController();
    setConfig(null);
    setError(false);
    axios
      .get<BaseResponse<HeatmapConfig>>(base + "/config", {
        signal: controller.signal,
        timeout: 10000,
      })
      .then(({ data: res }) => {
        if (!controller.signal.aborted)
          setConfig({ ...res.data, groups: res.data.groups || [] });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base]);
  useEffect(() => {
    if (view === "new") setDraft({ ...emptyDraft });
    if (view === "edit" && selected)
      setDraft({
        type: selected.type,
        path: selected.path,
        key: selected.key,
        example: selected.example,
      });
    if (view === "collection") setCollection(config);
  }, [view, selected, config]);

  async function persist(next: HeatmapConfig) {
    const { data: res } = await axios.put<BaseResponse<HeatmapConfig>>(
      base + "/config",
      next,
    );
    const saved = {
      ...res.data,
      groups: res.data.groups || [],
      can_write: config?.can_write,
      screenshot_available: config?.screenshot_available,
    };
    setConfig(saved);
    toast.success(t("heatmap.saved"));
    return saved;
  }
  async function saveEntry() {
    if (!config || readOnly || (view === "edit" && !selected)) return;
    let next: HeatmapConfig;
    try {
      next = updateHeatmap(
        config,
        draft,
        view === "edit" ? selected : undefined,
      );
    } catch (e) {
      toast.error(t(`heatmap.${(e as Error).message}`));
      return;
    }
    setSaving(true);
    try {
      await persist(next);
      setParams({
        entry: configurationID(
          draft.type,
          draft.path.trim(),
          draft.type === "key" ? draft.key.trim() : "",
        ),
      });
    } catch {
      /* axios reports request errors */
    } finally {
      setSaving(false);
    }
  }
  async function deleteEntry() {
    if (
      !config ||
      !selected ||
      readOnly ||
      !window.confirm(
        t("heatmap.removeConfiguredConfirm", {
          name: selected.key || selected.path,
        }),
      )
    )
      return;
    setSaving(true);
    try {
      await persist(removeHeatmap(config, selected));
      back();
    } catch {
      /* axios reports request errors */
    } finally {
      setSaving(false);
    }
  }

  const collectionStatus = config
    ? t("heatmap.scroll.collectionStatus", {
        clicks: t(config.enabled && config.clicks_enabled !== false ? "heatmap.enabled" : "heatmap.disabled"),
        scroll: t(config.enabled && config.scroll_enabled ? "heatmap.enabled" : "heatmap.disabled"),
      })
    : "";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium">
          {t(
            view === "new"
              ? "heatmap.newHeatmap"
              : view === "edit"
                ? "heatmap.editHeatmap"
                : view === "detail"
                  ? "heatmap.heatmapDetails"
                  : view === "collection"
                    ? "heatmap.collectionSettings"
                    : "heatmap.settings",
          )}
        </h3>
        <div className="flex flex-wrap gap-2">
          {view === "list" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setParams({ view: "collection" })}
              >
                {t("heatmap.collectionSettings")}
              </Button>
              {!readOnly && config && (
                <Button onClick={() => setParams({ view: "new" })}>
                  {t("heatmap.newHeatmap")}
                </Button>
              )}
            </>
          ) : (
            <Button variant="outline" disabled={saving} onClick={back}>
              {t("heatmap.backToList")}
            </Button>
          )}
        </div>
      </div>
      {error && <p role="alert">{t("heatmap.loadFailed")}</p>}
      {!config && !error && <p>{t("common.loading")}</p>}
      {config && (
        <>
          {view === "list" && (
            <section
              className="space-y-3 rounded-lg border p-4"
              aria-labelledby="configured-heatmaps"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 id="configured-heatmaps" className="font-medium">
                  {t("heatmap.configuredList")} ({entries.length})
                </h4>
                <span className="text-sm text-muted-foreground">
                  {collectionStatus}
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
                            <button
                              className="break-all text-left font-medium text-primary hover:underline"
                              onClick={() => setParams({ entry: entry.id })}
                            >
                              {entry.key || entry.path}
                            </button>
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
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setParams({ entry: entry.id })}
                              >
                                {t("heatmap.details")}
                              </Button>
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  to={`/sites/${domain}/heatmap?${heatmapQuery(entry)}`}
                                >
                                  {t("heatmap.viewConfigured")}
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {(view === "detail" || view === "edit") && !selected && (
            <p role="alert">{t("heatmap.configurationNotFound")}</p>
          )}
          {view === "detail" && selected && (
            <section className="space-y-5 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="break-all text-lg font-medium">
                  {selected.key || selected.path}
                </h4>
                <Button asChild>
                  <Link
                    to={`/sites/${domain}/heatmap?${heatmapQuery(selected)}`}
                  >
                    {t("heatmap.viewConfigured")}
                  </Link>
                </Button>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">
                    {t("heatmap.viewBy")}
                  </dt>
                  <dd className="mt-1">
                    {t(
                      selected.type === "key"
                        ? "heatmap.byKey"
                        : "heatmap.byURL",
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("heatmap.rulePath")}
                  </dt>
                  <dd className="mt-1 break-all font-mono">{selected.path}</dd>
                </div>
                {selected.type === "key" && (
                  <>
                    <div>
                      <dt className="text-muted-foreground">
                        {t("heatmap.groupKey")}
                      </dt>
                      <dd className="mt-1 break-all">{selected.key}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t("heatmap.exampleURL")}
                      </dt>
                      <dd className="mt-1 break-all">
                        {selected.example || "—"}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <p className="text-sm text-muted-foreground">
                {t("heatmap.sharedCollectionHelp", {
                  sample: Math.round(config.sample_rate * 100),
                  raw: config.raw_days,
                  aggregate: config.aggregate_days,
                })}{" "}
                · {collectionStatus}
              </p>
              {!readOnly && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      setParams({ entry: selected.id, view: "edit" })
                    }
                  >
                    {t("heatmap.editHeatmap")}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={saving}
                    onClick={() => void deleteEntry()}
                  >
                    {t("heatmap.removeConfigured")}
                  </Button>
                </div>
              )}
            </section>
          )}
          {(view === "new" || (view === "edit" && selected)) && (
            <form
              className="space-y-4 rounded-lg border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void saveEntry();
              }}
            >
              <fieldset
                disabled={readOnly || saving}
                className="space-y-4 disabled:opacity-70"
              >
                <label className="block text-sm">
                  {t("heatmap.viewBy")}
                  <select
                    className={`${field} mt-1 block w-full`}
                    value={draft.type}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        type: e.target.value as "key" | "url",
                      })
                    }
                  >
                    <option value="url">{t("heatmap.byURL")}</option>
                    <option value="key">{t("heatmap.byKey")}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  {t("heatmap.rulePath")}
                  <Input
                    required
                    maxLength={1000}
                    value={draft.path}
                    placeholder={
                      draft.type === "key" ? "/soft/*.html" : "/pricing"
                    }
                    onChange={(e) =>
                      setDraft({ ...draft, path: e.target.value })
                    }
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("heatmap.rulesHelp")}
                </p>
                {draft.type === "key" && (
                  <>
                    <label className="block text-sm">
                      {t("heatmap.groupKey")}
                      <Input
                        required
                        maxLength={120}
                        value={draft.key}
                        placeholder="software-detail"
                        onChange={(e) =>
                          setDraft({ ...draft, key: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      {t("heatmap.exampleURL")}
                      <Input
                        type="url"
                        maxLength={2000}
                        value={draft.example}
                        placeholder={`https://${domain}/soft/example.html`}
                        onChange={(e) =>
                          setDraft({ ...draft, example: e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                <p className="text-sm text-muted-foreground">
                  {t("heatmap.entryCollectionHelp")}
                </p>
                {!readOnly && (
                  <Button type="submit" disabled={saving}>
                    {t(saving ? "common.loading" : "heatmap.save")}
                  </Button>
                )}
              </fieldset>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() =>
                  selected && view === "edit"
                    ? setParams({ entry: selected.id })
                    : back()
                }
              >
                {t("heatmap.cancel")}
              </Button>
            </form>
          )}
          {view === "collection" && collection && (
            <form
              className="space-y-4 rounded-lg border p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (readOnly) return;
                setSaving(true);
                try {
                  await persist(collection);
                  back();
                } catch {
                  /* axios reports errors */
                } finally {
                  setSaving(false);
                }
              }}
            >
              <p className="text-sm text-muted-foreground">
                {t("heatmap.collectionScopeHelp")}
              </p>
              <fieldset
                disabled={readOnly || saving}
                className="space-y-4 disabled:opacity-70"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={collection.enabled}
                    disabled={collection.paths.length === 0}
                    onChange={(e) =>
                      setCollection({
                        ...collection,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  {t("heatmap.enable")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={collection.clicks_enabled !== false}
                    onChange={e => setCollection({ ...collection, clicks_enabled: e.target.checked })}
                  />
                  {t("heatmap.scroll.enableClicks")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={collection.scroll_enabled === true}
                    onChange={e => setCollection({ ...collection, scroll_enabled: e.target.checked })}
                  />
                  {t("heatmap.scroll.enableScroll")}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("heatmap.scroll.help", { days: Math.min(collection.raw_days, 7) })}
                </p>
                {collection.paths.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("heatmap.noConfigured")}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    {t("heatmap.sample")}
                    <Input
                      type="number"
                      required
                      min={1}
                      max={100}
                      step={1}
                      value={Math.round(collection.sample_rate * 100)}
                      onChange={(e) =>
                        setCollection({
                          ...collection,
                          sample_rate: Number(e.target.value) / 100,
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("heatmap.maxClicks")}
                    <Input
                      type="number"
                      required
                      min={1}
                      max={1000}
                      value={collection.max_clicks}
                      onChange={(e) =>
                        setCollection({
                          ...collection,
                          max_clicks: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("heatmap.rawDays")}
                    <Input
                      type="number"
                      required
                      min={1}
                      max={14}
                      value={collection.raw_days}
                      onChange={(e) =>
                        setCollection({
                          ...collection,
                          raw_days: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("heatmap.aggregateDays")}
                    <Input
                      type="number"
                      required
                      min={collection.raw_days}
                      max={180}
                      value={collection.aggregate_days}
                      onChange={(e) =>
                        setCollection({
                          ...collection,
                          aggregate_days: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                {!readOnly && (
                  <Button type="submit" disabled={saving}>
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
              <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{`<script defer data-domain="${domain}" src="${window.location.origin}/js/script.heatmap.js"\n  data-heatmap="true" data-heatmap-version="release-2026-11"\n  data-heatmap-variant="default"></script>\n<button data-zs-id="pricing.signup">Sign up</button>\n<div data-zs-ignore>Private content</div>`}</pre>
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
            </form>
          )}
        </>
      )}
    </div>
  );
}
