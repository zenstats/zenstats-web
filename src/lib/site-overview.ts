import { useEffect, useRef, useState, type RefObject } from "react";
import axios, { type BaseResponse } from "@utils/axios";
import type { AggregateResponse, MainGraphPoint } from "@/pages/sites/types/interfaces";

/**
 * 站点列表里每张卡片需要"今日访客/浏览量"和一条迷你趋势线，各自独立请求时
 * 50 个站点会在挂载瞬间发出 100 个并发请求。这里做三件事：
 *  1. 结果按 domain 缓存 60s：切换卡片/列表视图、返回列表页不再重复请求；
 *  2. 同 domain 的 in-flight 请求合并：卡片里的两个子组件只触发一次；
 *  3. 并发上限 4：请求按视口出现顺序排队，首屏可见的卡片先出数据。
 */
export interface SiteOverview {
  visitors: number;
  pageviews: number;
  sparkline: number[];
}

const CACHE_TTL_MS = 60_000;
const MAX_CONCURRENT = 4;

const cache = new Map<string, { at: number; data: SiteOverview }>();
const inflight = new Map<string, Promise<SiteOverview>>();

let active = 0;
const queue: Array<() => void> = [];
function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      task()
        .then(resolve, reject)
        .finally(() => {
          active--;
          queue.shift()?.();
        });
    };
    if (active < MAX_CONCURRENT) run();
    else queue.push(run);
  });
}

async function fetchOverview(domain: string): Promise<SiteOverview> {
  const [agg, graph] = await Promise.all([
    axios.get<BaseResponse<AggregateResponse>>(`/stats/${domain}/aggregate`, {
      params: { period: "day", metrics: "visitors,pageviews" },
    }),
    axios.get<BaseResponse<MainGraphPoint[]>>(`/stats/${domain}/main-graph`, {
      params: { period: "day", metrics: "visitors" },
    }),
  ]);
  const results = agg.data?.data?.results;
  return {
    visitors: results?.visitors?.value ?? 0,
    pageviews: results?.pageviews?.value ?? 0,
    sparkline: (graph.data?.data ?? []).map((p) => p.metrics?.visitors || 0),
  };
}

export function getSiteOverview(domain: string): Promise<SiteOverview> {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Promise.resolve(hit.data);
  const pending = inflight.get(domain);
  if (pending) return pending;
  const p = schedule(() => fetchOverview(domain))
    .then((data) => {
      cache.set(domain, { at: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(domain));
  inflight.set(domain, p);
  return p;
}

/** 元素进入视口（含 200px 预读边距）后返回 true，之后保持 true。 */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView];
}

export function useSiteOverview(domain: string, enabled = true) {
  const [data, setData] = useState<SiteOverview | null>(() => {
    const hit = cache.get(domain);
    return hit && Date.now() - hit.at < CACHE_TTL_MS ? hit.data : null;
  });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setFailed(false);
    getSiteOverview(domain)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [domain, enabled]);
  return { data, loading: enabled && data === null && !failed, failed };
}
