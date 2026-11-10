import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface GeoIPStatus {
  ready: boolean;
  database_type: string;
  built_at: string | null;
  city_available: boolean;
  stale: boolean;
  country_fallback_built_at: string | null;
  lookups: number;
  country_found: number;
  city_found: number;
  not_public: number;
  invalid: number;
  not_found: number;
  errors: number;
}

export default function GeoIPQuality({ status }: { status?: GeoIPStatus }) {
  const { t, i18n } = useTranslation();
  if (!status) return null;
  const date = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(i18n.language) : "—";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("geoipQuality.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          {t("geoipQuality.database")}: {status.database_type || "—"} ·{" "}
          {t("geoipQuality.builtAt")}: {date(status.built_at)}
        </p>
        {status.country_fallback_built_at && (
          <p className="text-xs text-muted-foreground">
            {t("geoipQuality.fallbackBuiltAt")}:{" "}
            {date(status.country_fallback_built_at)}
          </p>
        )}
        {!status.ready && (
          <p
            role="alert"
            className="rounded border border-amber-400 p-3 text-sm"
          >
            {t("geoipQuality.unavailable")}
          </p>
        )}
        {status.ready && !status.city_available && (
          <p
            role="status"
            className="rounded border border-amber-400 p-3 text-sm"
          >
            {t("geoipQuality.countryOnly")}
          </p>
        )}
        {status.ready && status.stale && (
          <p
            role="status"
            className="rounded border border-amber-400 p-3 text-sm"
          >
            {t("geoipQuality.stale")}
          </p>
        )}
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              "lookups",
              "country_found",
              "city_found",
              "not_found",
              "not_public",
              "invalid",
              "errors",
            ] as const
          ).map((key) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground">
                {t(`geoipQuality.${key}`)}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">
                {status[key].toLocaleString(i18n.language)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          {t("geoipQuality.scope")}
        </p>
      </CardContent>
    </Card>
  );
}
