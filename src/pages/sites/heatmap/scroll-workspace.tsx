import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios, { type BaseResponse } from "@utils/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  layoutKey,
  pageIdentity,
  pageKey,
  type HeatmapConfig,
  type ScrollData,
  type ScrollPage,
  type Snapshot,
} from "./types";

function dayInZone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)?.value)
    .join("-");
}
function shiftDay(day: string, days: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ScrollWorkspace({
  base,
  config,
  readOnly,
}: {
  base: string;
  config: HeatmapConfig;
  readOnly: boolean;
}) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const scope = params.get("scope") === "key" ? "key" : "url";
  const key = scope === "key" ? params.get("key") || "" : "";
  const path = scope === "url" ? params.get("path") || "" : "";
  const today = dayInZone(config.timezone),
    earliest = shiftDay(today, 1 - Math.min(config.raw_days, 7));
  const [start, setStart] = useState(earliest),
    [end, setEnd] = useState(today);
  const [pages, setPages] = useState<ScrollPage[]>([]),
    [selected, setSelected] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]),
    [snapshotID, setSnapshotID] = useState<number>();
  const [data, setData] = useState<ScrollData | null>(null),
    [image, setImage] = useState("");
  const [error, setError] = useState(false),
    [imageError, setImageError] = useState(false),
    [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0),
    [active, setActive] = useState(39),
    [opacity, setOpacity] = useState(0.45);
  const [captureURL, setCaptureURL] = useState(""),
    [capturing, setCapturing] = useState(false);
  const page = pages.find((p) => pageKey(p) === selected);
  const matching = useMemo(
    () => snapshots.filter((s) => layoutKey(s, scope) === selected),
    [snapshots, scope, selected],
  );
  const snapshot = matching.find((s) => s.id === snapshotID) ?? matching[0];
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = JSON.stringify([
    base,
    scope,
    key,
    path,
    start,
    end,
    selected,
  ]);
  const current = loadedKey === requestKey ? data : null;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setPages([]);
    setData(null);
    Promise.all([
      axios.get<BaseResponse<ScrollPage[]>>(base + "/scroll/pages", {
        params: { start, end, scope, key, path },
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
  }, [base, start, end, scope, key, path, revision]);

  useEffect(() => {
    setData(null);
    if (!page) return;
    const controller = new AbortController();
    setError(false);
    axios
      .get<BaseResponse<ScrollData>>(base + "/scroll/data", {
        params: { start, end, scope, page: JSON.stringify(pageIdentity(page)) },
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          setData(res.data.data);
          setLoadedKey(requestKey);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base, start, end, scope, page, requestKey]);

  useEffect(() => {
    setImage("");
    setImageError(false);
    if (!snapshot) return;
    const controller = new AbortController();
    let objectURL = "";
    axios
      .get(base + `/snapshots/${snapshot.id}/image`, {
        responseType: "blob",
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          objectURL = URL.createObjectURL(res.data);
          setImage(objectURL);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setImageError(true);
      });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [base, snapshot]);

  useEffect(() => {
    const example =
      scope === "key"
        ? config.groups.find((g) => g.key === page?.aggregation_key)
            ?.example_url
        : "";
    setCaptureURL(
      example ||
        (page && scope === "url" ? `https://${page.hostname}${page.path}` : ""),
    );
  }, [page, scope, config.groups]);

  async function capture() {
    if (!page || !captureURL) return;
    setCapturing(true);
    setImageError(false);
    try {
      const { data: res } = await axios.post<BaseResponse<Snapshot>>(
        base + "/capture",
        { url: captureURL, page: pageIdentity(page), scope },
        { timeout: 45000 },
      );
      setSnapshots((old) => [res.data, ...old]);
      setSnapshotID(res.data.id);
    } catch {
      setImageError(true);
    } finally {
      setCapturing(false);
    }
  }
  const band = current?.regions[active];
  return (
    <section className="space-y-4" aria-label={t("heatmap.scroll.title")}>
      <p className="text-sm text-muted-foreground">
        {t("heatmap.scroll.help", { days: Math.min(config.raw_days, 7) })}
      </p>
      {!config.scroll_enabled && (
        <p className="rounded border p-3 text-sm">
          {t("heatmap.scroll.disabled")}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <label className="text-sm">
          {t("heatmap.viewBy")}
          <select
            aria-label={t("heatmap.viewBy")}
            className="block rounded border bg-background p-2"
            value={scope}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("scope", e.target.value);
              next.delete("key");
              next.delete("path");
              setParams(next);
            }}
          >
            <option value="url">{t("heatmap.byURL")}</option>
            <option value="key">{t("heatmap.byKey")}</option>
          </select>
        </label>
        <label className="text-sm">
          {t("heatmap.scroll.start")}
          <Input
            aria-label={t("heatmap.scroll.start")}
            type="date"
            min={earliest}
            max={end}
            value={start}
            onChange={(e) => e.target.value && setStart(e.target.value)}
          />
        </label>
        <label className="text-sm">
          {t("heatmap.scroll.end")}
          <Input
            aria-label={t("heatmap.scroll.end")}
            type="date"
            min={start}
            max={today}
            value={end}
            onChange={(e) => e.target.value && setEnd(e.target.value)}
          />
        </label>
        <Button variant="outline" onClick={() => setRevision((r) => r + 1)}>
          {t("heatmap.refresh")}
        </Button>
        {pages.length > 0 && (
          <label className="min-w-0 flex-1 text-sm">
            {t("heatmap.pageLayout")}
            <select
              aria-label={t("heatmap.pageLayout")}
              className="block w-full rounded border bg-background p-2"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {pages.map((p) => (
                <option key={pageKey(p)} value={pageKey(p)}>
                  {scope === "key" ? p.aggregation_key : p.hostname + p.path} ·{" "}
                  {p.version}/{p.variant} ·{" "}
                  {t(
                    `heatmap.device.${p.viewport_width < 768 ? "mobile" : p.viewport_width < 1024 ? "tablet" : "desktop"}`,
                  )}{" "}
                  · {p.sampled_views} {t("heatmap.scroll.views")}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && <p role="alert">{t("heatmap.loadFailed")}</p>}
      {loading && <p>{t("common.loading")}</p>}
      {!loading && !pages.length && !error && (
        <p>{t("heatmap.scroll.empty")}</p>
      )}
      {current && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["sampled", current.sampled_views.toLocaleString()],
                ["valid", current.valid_views.toLocaleString()],
                ["average", `${current.average_max_depth.toFixed(1)}%`],
              ] as const
            ).map(([name, value]) => (
              <div key={name} className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                  {t(`heatmap.scroll.${name}`)}
                </p>
                <p className="text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[25, 50, 75, 100].map((depth) => {
              const p = current.regions.find((r) => r.depth === depth);
              return (
                <button
                  key={depth}
                  className="rounded border bg-card p-3 text-left"
                  onClick={() => setActive((depth / 100) * 80 - 1)}
                >
                  <span className="text-sm">
                    {t("heatmap.scroll.reach", { depth })}
                  </span>
                  <p className="text-xl font-semibold">
                    {current.valid_views && p ? `${p.rate.toFixed(1)}%` : "—"}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("heatmap.scroll.exclusions", {
              dynamic: current.dynamic_views,
              clipped: current.clipped_views,
              unsupported: current.unsupported_views,
              late: current.late_init_views,
            })}
          </p>
          {current.mixed_sampling && (
            <p className="text-sm text-amber-600">
              {t("heatmap.scroll.mixed")}
            </p>
          )}
          <label className="block text-sm">
            {t("heatmap.scroll.depth")}
            <input
              className="mx-3 align-middle"
              aria-label={t("heatmap.scroll.depth")}
              type="range"
              min={0}
              max={79}
              value={active}
              onChange={(e) => setActive(Number(e.target.value))}
            />
          </label>
          <p aria-live="polite" className="text-sm">
            {band &&
              t("heatmap.scroll.detail", {
                depth: band.depth.toFixed(2),
                views: band.views,
                total: current.valid_views,
                rate: band.rate.toFixed(1),
              })}
          </p>
        </>
      )}
      {page && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            {matching.length > 0 && (
              <label className="text-sm">
                {t("heatmap.snapshot")}
                <select
                  aria-label={t("heatmap.snapshot")}
                  className="block rounded border bg-background p-2"
                  value={snapshot?.id}
                  onChange={(e) => setSnapshotID(Number(e.target.value))}
                >
                  {matching.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.created_at).toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm">
              {t("heatmap.opacity")}
              <input
                className="mx-3 align-middle"
                aria-label={t("heatmap.opacity")}
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>
            {!readOnly && (
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void capture();
                }}
              >
                <Input
                  type="url"
                  required
                  aria-label={t("heatmap.exampleURL")}
                  value={captureURL}
                  onChange={(e) => setCaptureURL(e.target.value)}
                />
                <Button
                  disabled={
                    capturing || !config.screenshot_available || !captureURL
                  }
                >
                  {t(capturing ? "heatmap.capturing" : "heatmap.capture")}
                </Button>
              </form>
            )}
          </div>
          {imageError && <p role="alert">{t("heatmap.loadFailed")}</p>}
          {!snapshot && (
            <p className="rounded border p-6 text-sm">
              {t("heatmap.noSnapshot")}
            </p>
          )}
          {image && current && (
            <div
              className="relative overflow-hidden rounded border bg-white"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setActive(
                  Math.min(
                    79,
                    Math.max(
                      0,
                      Math.floor(((e.clientY - r.top) / r.height) * 80),
                    ),
                  ),
                );
              }}
            >
              <img
                src={image}
                alt={`${page.hostname}${page.path}`}
                className="block h-auto w-full"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ opacity }}
              >
                {current.regions.map((r, i) => (
                  <div
                    key={i}
                    data-testid="scroll-band"
                    style={{
                      height: "1.25%",
                      backgroundColor: `hsl(${240 * (1 - r.rate / 100)} 85% 50%)`,
                    }}
                  />
                ))}
              </div>
              {[25, 50, 75].map((depth) => (
                <div
                  key={depth}
                  className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-black/60 text-right text-xs text-black"
                  style={{ top: `${depth}%` }}
                >
                  {depth}%
                </div>
              ))}
              <div
                className="pointer-events-none absolute left-0 right-0 border-t-2 border-blue-600 text-xs text-blue-950"
                style={{ top: `${Math.min(99, current.average_fold)}%` }}
              >
                <span className="bg-white/90">
                  {t("heatmap.scroll.fold")} {current.average_fold.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
