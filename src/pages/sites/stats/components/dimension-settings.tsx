import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DimensionConfig {
  key: string;
  label: string;
  property: string;
  category: "traffic" | "page" | "audience" | "technology";
  enabled: boolean;
  order: number;
}

const AVAILABLE_DIMENSIONS: Omit<DimensionConfig, "enabled" | "order">[] = [
  // Traffic sources
  { key: "source", label: "来源", property: "visit:source", category: "traffic" },

  // Pages
  { key: "page", label: "页面路径", property: "event:page", category: "page" },
  { key: "entry_page", label: "入口页面", property: "visit:entry_page", category: "page" },
  { key: "exit_page", label: "退出页面", property: "visit:exit_page", category: "page" },

  // Audience (geography)
  { key: "country", label: "国家/地区", property: "visit:country", category: "audience" },
  { key: "region", label: "地区", property: "visit:region", category: "audience" },
  { key: "city", label: "城市", property: "visit:city", category: "audience" },

  // Technology
  { key: "browser", label: "浏览器", property: "visit:browser", category: "technology" },
  { key: "os", label: "操作系统", property: "visit:os", category: "technology" },
  { key: "device", label: "设备类型", property: "visit:device", category: "technology" },
  { key: "screen_size", label: "屏幕尺寸", property: "visit:screen_size", category: "technology" },

  // Events
  { key: "event_name", label: "事件名称", property: "event:name", category: "page" },
];

const CATEGORY_LABELS: Record<string, string> = {
  traffic: "流量来源",
  page: "页面",
  audience: "受众",
  technology: "技术",
};

const DEFAULT_ENABLED = ["source", "page", "entry_page", "country", "browser", "os", "device"];

interface DimensionSettingsProps {
  dimensions: DimensionConfig[];
  onChange: (dimensions: DimensionConfig[]) => void;
}

export function getDefaultDimensions(): DimensionConfig[] {
  return AVAILABLE_DIMENSIONS.map((dim, index) => ({
    ...dim,
    enabled: DEFAULT_ENABLED.includes(dim.key),
    order: index,
  }));
}

export default function DimensionSettings({ dimensions, onChange }: DimensionSettingsProps) {
  const [open, setOpen] = useState(false);
  const [localDims, setLocalDims] = useState<DimensionConfig[]>(dimensions);

  const handleToggle = (key: string) => {
    setLocalDims((prev) =>
      prev.map((d) => (d.key === key ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const handleSave = () => {
    onChange(localDims);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalDims(getDefaultDimensions());
  };

  // Group by category
  const grouped = localDims.reduce(
    (acc, dim) => {
      if (!acc[dim.category]) acc[dim.category] = [];
      acc[dim.category].push(dim);
      return acc;
    },
    {} as Record<string, DimensionConfig[]>
  );

  const enabledCount = localDims.filter((d) => d.enabled).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">维度设置</span>
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-full">
            {enabledCount}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>自定义统计维度</DialogTitle>
          <DialogDescription>
            选择要在统计面板中显示的分析维度。启用的维度将出现在分解标签页中。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {Object.entries(grouped).map(([category, dims]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {CATEGORY_LABELS[category] || category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dims.map((dim) => (
                  <button
                    key={dim.key}
                    onClick={() => handleToggle(dim.key)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                      dim.enabled
                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {dim.enabled ? (
                      <Eye className="h-4 w-4 text-indigo-500 shrink-0" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {dim.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                        {dim.property}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative shrink-0",
                        dim.enabled
                          ? "bg-indigo-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                          dim.enabled ? "left-[18px]" : "left-0.5"
                        )}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            恢复默认
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleSave}>
              保存设置
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}