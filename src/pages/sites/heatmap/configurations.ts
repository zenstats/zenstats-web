import type { HeatmapConfig } from "./types";

export interface ConfiguredHeatmap {
  id: string;
  type: "key" | "url";
  path: string;
  key: string;
  example: string;
  groupIndex?: number;
}
export interface HeatmapDraft {
  type: "key" | "url";
  path: string;
  key: string;
  example: string;
}
export const configurationID = (type: string, path: string, key = "") =>
  JSON.stringify([type, path, key]);
export function configuredHeatmaps(config: HeatmapConfig): ConfiguredHeatmap[] {
  return [
    ...config.groups.map((g, groupIndex) => ({
      id: configurationID("key", g.path, g.key),
      type: "key" as const,
      path: g.path,
      key: g.key,
      example: g.example_url,
      groupIndex,
    })),
    ...[...new Set(config.paths)]
      .filter((path) => !config.groups.some((g) => g.path === path))
      .map((path) => ({
        id: configurationID("url", path),
        type: "url" as const,
        path,
        key: "",
        example: "",
      })),
  ];
}

export function updateHeatmap(
  config: HeatmapConfig,
  draft: HeatmapDraft,
  original?: ConfiguredHeatmap,
): HeatmapConfig {
  const path = draft.path.trim(),
    key = draft.type === "key" ? draft.key.trim() : "";
  if (!path.startsWith("/") || path.length > 1000 || /[?[\]\\\r\n]/.test(path))
    throw new Error("invalidRulePath");
  if (draft.type === "key" && !/^[a-zA-Z0-9_.:/@-]{1,120}$/.test(key))
    throw new Error("invalidGroupKey");
  if (
    configuredHeatmaps(config).some(
      (e) => e.id !== original?.id && e.path === path,
    )
  )
    throw new Error("duplicatePath");
  const rule = { path, key, example_url: draft.example.trim() };
  let groups = [...config.groups];
  if (original?.type === "key") {
    // Replacing in place preserves the first-match precedence of existing rules.
    groups = groups.flatMap((g, index) =>
      index === original.groupIndex
        ? draft.type === "key"
          ? [rule]
          : []
        : [g],
    );
  } else if (draft.type === "key") groups.push(rule);
  let paths = [...config.paths];
  if (
    original &&
    original.path !== path &&
    !groups.some((g) => g.path === original.path)
  )
    paths = paths.filter((p) => p !== original.path);
  if (!paths.includes(path)) paths.push(path);
  return { ...config, paths, groups };
}

export function removeHeatmap(
  config: HeatmapConfig,
  entry: ConfiguredHeatmap,
): HeatmapConfig {
  const groups =
    entry.type === "key"
      ? config.groups.filter((_, i) => i !== entry.groupIndex)
      : config.groups;
  const paths = groups.some((g) => g.path === entry.path)
    ? config.paths
    : config.paths.filter((p) => p !== entry.path);
  return {
    ...config,
    groups,
    paths,
    enabled: paths.length > 0 && config.enabled,
  };
}
export function heatmapQuery(entry: ConfiguredHeatmap) {
  return new URLSearchParams(
    entry.type === "key"
      ? { scope: "key", key: entry.key }
      : { scope: "url", path: entry.path },
  ).toString();
}
