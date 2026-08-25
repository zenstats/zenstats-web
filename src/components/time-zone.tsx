import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";

type TimeZoneOption = { value: string; label: string };

// 56KB 的时区表只在"站点通用设置"里用到，按需加载并在模块级缓存，避免进入首屏包。
let timeZonesCache: TimeZoneOption[] | null = null;
let timeZonesPromise: Promise<TimeZoneOption[]> | null = null;
function loadTimeZones(): Promise<TimeZoneOption[]> {
  if (timeZonesCache) return Promise.resolve(timeZonesCache);
  if (!timeZonesPromise) {
    timeZonesPromise = import("@/constants/time-zones.json").then((m) => {
      timeZonesCache = m.default as TimeZoneOption[];
      return timeZonesCache;
    });
  }
  return timeZonesPromise;
}

type TimeZoneSelectorProps = {
  // 选择时区后的回调函数
  onChange: (...event: unknown[]) => void;
  // 默认选中的时区
  defaultValue?: string;
  value?: string;
};

export function TimeZoneSelector({
  onChange,
  defaultValue,
  value,
}: TimeZoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeZones, setTimeZones] = useState<TimeZoneOption[]>(timeZonesCache ?? []);
  useEffect(() => {
    let cancelled = false;
    loadTimeZones().then((list) => {
      if (!cancelled) setTimeZones(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const filteredTimeZones = timeZones.filter((timeZone) =>
    timeZone.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const initialValue = value !== undefined ? value : defaultValue;

  return (
    <Select defaultValue={initialValue} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent className="relative">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search timezones"
          className="sticky top-0 z-10 bg-background mb-2"
        />
        {filteredTimeZones.map((timeZone) => (
          <SelectItem key={timeZone.value} value={timeZone.value}>
            {timeZone.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
