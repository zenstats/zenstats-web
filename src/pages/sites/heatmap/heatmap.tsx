import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";
import HeatmapCanvas from "./heatmap-canvas";
import {
  layoutKey,
  pageIdentity,
  pageKey,
  type HeatmapConfig,
  type HeatmapData,
  type PageCount,
  type Snapshot,
} from "./types";

function dateInZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const initialDate = new Date().toISOString().slice(0, 10);
const field = "rounded-md border bg-background px-3 py-2 text-sm";

export default function Heatmap() {
  const { domain = "" } = useParams();
  const { t } = useTranslation();
  const base = `/sites/${encodeURIComponent(domain)}/heatmap`;
  const [config, setConfig] = useState<HeatmapConfig | null>(null);
  const readOnly = isSubAccount() || config?.can_write === false;
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = searchParams.get("scope") === "key" ? "key" : "url";
  const filterKey = scope === "key" ? searchParams.get("key") || "" : "";
  const filterPath = scope === "url" ? searchParams.get("path") || "" : "";
  const [captureURL, setCaptureURL] = useState(""),
    [capturing, setCapturing] = useState(false);
  const [pages, setPages] = useState<PageCount[]>([]);
  const [selected, setSelected] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotID, setSnapshotID] = useState<number | null>(null);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loadedDataKey, setLoadedDataKey] = useState("");
  const [loadedImageID, setLoadedImageID] = useState<number | null>(null);
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState(false);
  const [start, setStart] = useState(initialDate);
  const [end, setEnd] = useState(initialDate);
  const [range, setRange] = useState({ start: initialDate, end: initialDate });
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [opacity, setOpacity] = useState(0.7);
  const dataRequestKey = JSON.stringify([
    scope,
    filterKey,
    filterPath,
    selected,
    range.start,
    range.end,
  ]);
  const currentData = loadedDataKey === dataRequestKey ? data : null;
  const page = pages.find((p) => pageKey(p) === selected);
  const matching = snapshots.filter((p) => layoutKey(p, scope) === selected);
  const snapshot = matching.find((s) => s.id === snapshotID) ?? matching[0];

  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setError(false);
    setConfig(null);
    setPages([]);
    setSelected("");
    setData(null);
    setSnapshots([]);
    axios
      .get<BaseResponse<HeatmapConfig>>(base + "/config", {
        signal: controller.signal,
        timeout: 10000,
      })
      .then(({ data: res }) => {
        if (controller.signal.aborted) return;
        setConfig(res.data);
        const today = dateInZone(new Date(), res.data.timezone);
        const week = dateInZone(
          new Date(Date.now() - 6 * 86400000),
          res.data.timezone,
        );
        setStart(week);
        setEnd(today);
        setRange({ start: week, end: today });
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);
    setPages([]);
    setSnapshots([]);
    Promise.all([
      axios.get<BaseResponse<PageCount[]>>(base + "/pages", {
        params: { ...range, scope, key: filterKey, path: filterPath },
        signal: controller.signal,
        timeout: 10000,
      }),
      axios.get<BaseResponse<Snapshot[]>>(base + "/snapshots", {
        signal: controller.signal,
        timeout: 10000,
      }),
    ])
      .then(([p, s]) => {
        if (controller.signal.aborted) return;
        setPages(p.data.data);
        setSnapshots(s.data.data);
        setSelected((old) =>
          p.data.data.some((p) => pageKey(p) === old)
            ? old
            : p.data.data[0]
              ? pageKey(p.data.data[0])
              : "",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [base, ready, range, revision, scope, filterKey, filterPath]);

  useEffect(() => {
    setData(null);
    if (!ready || !selected || !pages.some((p) => pageKey(p) === selected))
      return;
    const controller = new AbortController();
    axios
      .get<BaseResponse<HeatmapData>>(base + "/data", {
        params: { ...range, page: selected, scope },
        signal: controller.signal,
        timeout: 20000,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          setData(res.data.data);
          setLoadedDataKey(
            JSON.stringify([
              scope,
              filterKey,
              filterPath,
              selected,
              range.start,
              range.end,
            ]),
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base, ready, selected, range, pages, scope, filterKey, filterPath]);

  useEffect(() => {
    setImage("");
    setImageError(false);
    if (!snapshot) return;
    const controller = new AbortController();
    let objectURL = "";
    axios
      .get<Blob>(`${base}/snapshots/${snapshot.id}/image`, {
        responseType: "blob",
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (controller.signal.aborted) return;
        objectURL = URL.createObjectURL(res.data);
        setImage(objectURL);
        setLoadedImageID(snapshot.id);
      })
      .catch(() => {
        if (!controller.signal.aborted) setImageError(true);
      });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [base, snapshot?.id]);

  useEffect(() => {
    if (!page) {
      setCaptureURL("");
      return;
    }
    const example =
      scope === "key"
        ? config?.groups?.find(
            (g) => g.key === page.aggregation_key && g.example_url,
          )?.example_url
        : "";
    setCaptureURL(
      example ||
        (scope === "url" ? `https://${page.hostname}${page.path}` : ""),
    );
  }, [selected, scope, config]);
  async function capture() {
    if (!page || !captureURL) return;
    setCapturing(true);
    try {
      const res = await axios.post<BaseResponse<Snapshot>>(
        base + "/capture",
        { url: captureURL, page: pageIdentity(page), scope },
        { timeout: 45000 },
      );
      setSnapshots((old) => [res.data.data, ...old]);
      setSnapshotID(res.data.data.id);
      toast.success(t("heatmap.captureSuccess"));
    } catch {
      /* axios reports errors */
    } finally {
      setCapturing(false);
    }
  }
  async function upload(file?: File) {
    if (!page || !file || scope === "key") return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("heatmap.imageLimit"));
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("page", JSON.stringify(pageIdentity(page)));
    form.append("image", file);
    try {
      const res = await axios.post<BaseResponse<Snapshot>>(
        base + "/snapshots",
        form,
      );
      setSnapshots((old) => [res.data.data, ...old]);
      setSnapshotID(res.data.data.id);
    } catch {
      /* axios reports request errors */
    } finally {
      setUploading(false);
    }
  }
  function preset(days: number, yesterday = false) {
    const timezone = config?.timezone ?? "UTC",
      now = Date.now() - (yesterday ? 86400000 : 0);
    const next = {
      start: dateInZone(new Date(now - (days - 1) * 86400000), timezone),
      end: dateInZone(new Date(now), timezone),
    };
    setStart(next.start);
    setEnd(next.end);
    setRange(next);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <Link
        to={`/sites/${domain}/stats`}
        className="text-sm text-primary hover:underline"
      >
        ← {domain}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{t("heatmap.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("heatmap.description")}
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded border border-red-400 p-3">
          {t("heatmap.loadFailed")}{" "}
          <Button
            variant="outline"
            onClick={() =>
              ready ? setRevision((v) => v + 1) : window.location.reload()
            }
          >
            {t("heatmap.refresh")}
          </Button>
        </p>
      )}
      {!config && !error && <p>{t("common.loading")}</p>}
      {config && (
        <>
          <p className="text-sm text-muted-foreground">
            {t(config.enabled ? "heatmap.enabled" : "heatmap.disabled")} ·{" "}
            <Link
              className="text-primary hover:underline"
              to={`/sites/${domain}/settings/heatmap`}
            >
              {t("heatmap.settings")}
            </Link>
          </p>
          <Card>
            <CardHeader>
              <CardTitle>{t("heatmap.explore")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block text-sm">
                {t("heatmap.viewBy")}
                <select
                  aria-label={t("heatmap.viewBy")}
                  className={`${field} ml-2`}
                  value={scope}
                  onChange={(e) => {
                    setSearchParams({ scope: e.target.value });
                    setSelected("");
                    setData(null);
                    setImage("");
                    setSnapshotID(null);
                  }}
                >
                  <option value="url">{t("heatmap.byURL")}</option>
                  <option value="key">{t("heatmap.byKey")}</option>
                </select>
              </label>
              {(filterKey || filterPath) && (
                <p className="text-sm text-muted-foreground">
                  {t("heatmap.currentFilter")}:{" "}
                  <code>{filterKey || filterPath}</code> ·{" "}
                  <Link
                    className="text-primary hover:underline"
                    to={`/sites/${domain}/heatmap`}
                  >
                    {t("heatmap.showAll")}
                  </Link>
                </p>
              )}
              {scope === "key" && (
                <p className="text-sm text-muted-foreground">
                  {t("heatmap.groupLayoutHelp")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {[1, 7, 30].map((days) => (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    onClick={() => preset(days)}
                  >
                    {t(days === 1 ? "heatmap.today" : "heatmap.lastDays", {
                      days,
                    })}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => preset(1, true)}
                >
                  {t("heatmap.yesterday")}
                </Button>
              </div>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setRange({ start, end });
                  setRevision((v) => v + 1);
                }}
              >
                <label className="text-sm">
                  {t("heatmap.start")}
                  <Input
                    type="date"
                    required
                    value={start}
                    max={end}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  {t("heatmap.end")}
                  <Input
                    type="date"
                    required
                    value={end}
                    min={start}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <Button type="submit" disabled={loading}>
                  {t(loading ? "common.loading" : "heatmap.refresh")}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                {t("heatmap.dateHelp", { timezone: config.timezone })}
              </p>
              {!loading && pages.length === 0 && (
                <p className="py-6 text-center text-muted-foreground">
                  {t("heatmap.empty")}
                </p>
              )}
              {pages.length > 0 && (
                <label className="block text-sm">
                  {t("heatmap.pageLayout")}
                  <select
                    aria-label={t("heatmap.pageLayout")}
                    className={`${field} mt-1 w-full`}
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setSnapshotID(null);
                    }}
                  >
                    {pages.map((p) => (
                      <option key={pageKey(p)} value={pageKey(p)}>
                        {scope === "key"
                          ? `${p.aggregation_key} · ${p.hostname}`
                          : `${p.hostname}${p.path}`}{" "}
                        · {p.version}/{p.variant} · {p.viewport_width}×
                        {p.viewport_height} → {p.document_width}×
                        {p.document_height} · {p.clicks}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {pages.length >= 200 && (
                <p className="text-sm text-amber-600">
                  {t("heatmap.pageLimit")}
                </p>
              )}
            </CardContent>
          </Card>
          {page && (
            <>
              {page.version === "unknown" && (
                <p className="rounded border border-amber-400 p-3 text-sm">
                  {t("heatmap.unknownVersion")}
                </p>
              )}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-4">
                  {!readOnly && (
                    <form
                      className="space-y-2 rounded border p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void capture();
                      }}
                    >
                      <label className="block text-sm">
                        {t(
                          scope === "key"
                            ? "heatmap.exampleURL"
                            : "heatmap.captureURL",
                        )}
                        <Input
                          type="url"
                          required
                          value={captureURL}
                          onChange={(e) => setCaptureURL(e.target.value)}
                          placeholder={`https://${page.hostname}/soft/example.html`}
                        />
                      </label>
                      <Button
                        type="submit"
                        disabled={
                          capturing ||
                          !config.screenshot_available ||
                          !captureURL
                        }
                      >
                        {t(capturing ? "heatmap.capturing" : "heatmap.capture")}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          config.screenshot_available
                            ? "heatmap.captureHelp"
                            : "heatmap.captureUnavailable",
                        )}
                      </p>
                    </form>
                  )}
                  {snapshot?.source_url && (
                    <p className="break-all text-xs text-muted-foreground">
                      {t("heatmap.sourceURL")}: {snapshot.source_url}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    {matching.length > 0 && (
                      <select
                        aria-label={t("heatmap.snapshot")}
                        className={field}
                        value={snapshot?.id ?? ""}
                        onChange={(e) => setSnapshotID(Number(e.target.value))}
                      >
                        {matching.map((s) => (
                          <option key={s.id} value={s.id}>
                            {new Date(s.created_at).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    )}
                    {!readOnly && (
                      <>
                        <label
                          className={`${field} cursor-pointer ${scope === "key" ? "hidden" : ""}`}
                        >
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/png,image/jpeg"
                            disabled={uploading}
                            onChange={(e) => {
                              void upload(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                          {t(uploading ? "common.loading" : "heatmap.upload")}
                        </label>
                        {snapshot && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!window.confirm(t("heatmap.deleteConfirm")))
                                return;
                              try {
                                await axios.delete(
                                  `${base}/snapshots/${snapshot.id}`,
                                );
                                setSnapshots((old) =>
                                  old.filter((s) => s.id !== snapshot.id),
                                );
                              } catch {
                                /* axios reports errors */
                              }
                            }}
                          >
                            {t("heatmap.delete")}
                          </Button>
                        )}
                      </>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      {t("heatmap.opacity")}
                      <input
                        aria-label={t("heatmap.opacity")}
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("heatmap.snapshotHelp", {
                      width: page.viewport_width,
                      height: page.viewport_height,
                      docWidth: page.document_width,
                      docHeight: page.document_height,
                      version: page.version,
                    })}
                  </p>
                  {!snapshot && (
                    <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                      {t("heatmap.noSnapshot")}
                    </div>
                  )}
                  {imageError && <p role="alert">{t("heatmap.loadFailed")}</p>}
                  {snapshot && !image && !imageError && (
                    <p>{t("common.loading")}</p>
                  )}
                  {snapshot &&
                    loadedImageID === snapshot.id &&
                    image &&
                    currentData && (
                      <HeatmapCanvas
                        image={image}
                        page={page}
                        data={currentData}
                        opacity={opacity}
                      />
                    )}
                </div>
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle>{t("heatmap.clicks")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!currentData ? (
                      <p>{t("common.loading")}</p>
                    ) : (
                      <>
                        <p className="text-3xl font-semibold">
                          {currentData.clicks.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("heatmap.sampledCounts")}
                        </p>
                        <p className="text-sm">
                          {t("heatmap.unmapped", {
                            count: currentData.unmapped,
                          })}
                        </p>
                        {currentData.truncated && (
                          <p className="text-sm text-amber-600">
                            {t("heatmap.truncated")}
                          </p>
                        )}
                        <h2 className="font-medium">{t("heatmap.elements")}</h2>
                        <p className="text-xs text-muted-foreground">
                          {t("heatmap.elementsHelp")}
                        </p>
                        <ol className="space-y-2">
                          {currentData.elements.map((e) => (
                            <li
                              key={e.element}
                              className="flex justify-between gap-2 text-sm"
                            >
                              <span className="break-all">{e.element}</span>
                              <span>{e.count.toLocaleString()}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
