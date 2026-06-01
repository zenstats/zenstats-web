import { X } from "lucide-react";

interface Filter {
  property: string;
  label: string;
  value: string;
}

interface FilterBarProps {
  filters: Filter[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
}

export default function FilterBar({ filters, onRemove, onClearAll }: FilterBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        筛选条件:
      </span>
      {filters.map((filter, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800"
        >
          <span className="text-indigo-500 dark:text-indigo-400">{filter.label}</span>
          <span className="text-indigo-400 dark:text-indigo-500">=</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemove(index)}
            className="ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
        >
          清除全部
        </button>
      )}
    </div>
  );
}