import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: SliderProps) {
  const currentValue = value[0] ?? min

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([Number(e.target.value)])
  }

  const pct = ((currentValue - min) / (max - min)) * 100

  return (
    <div className={cn("relative w-full py-2", className)}>
      <input
        type="range"
        value={currentValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          "w-full h-2 rounded-full appearance-none cursor-pointer",
          "bg-muted",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:h-5",
          "[&::-webkit-slider-thumb]:w-5",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-primary",
          "[&::-webkit-slider-thumb]:border-2",
          "[&::-webkit-slider-thumb]:border-primary",
          "[&::-webkit-slider-thumb]:shadow-sm",
          "[&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-webkit-slider-thumb]:mt-[-6px]",
          "[&::-moz-range-thumb]:h-5",
          "[&::-moz-range-thumb]:w-5",
          "[&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:bg-primary",
          "[&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:border-primary",
          "[&::-moz-range-thumb]:cursor-pointer",
          "[&::-moz-range-track]:bg-muted",
          "[&::-moz-range-track]:h-2",
          "[&::-moz-range-track]:rounded-full",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
        }}
      />
    </div>
  )
}

export { Slider }
