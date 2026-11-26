import { useId } from "react"
import { useInView, useSiteOverview } from "@/lib/site-overview"

interface Props {
  domain: string
}

export default function SiteSparkline({ domain }: Props) {
  const gradId = useId()
  const [ref, inView] = useInView<HTMLDivElement>()
  const { data } = useSiteOverview(domain, inView)
  const points = data?.sparkline ?? []

  // 始终渲染占位容器以便观察视口；数据不足两点时保持柔和基线但不塌陷
  if (points.length < 2) {
    return (
      <div ref={ref} className="h-11 flex items-end pb-1">
        <div className="w-full h-px bg-border/60 rounded-full" />
      </div>
    )
  }

  const w = 200, h = 44, padX = 3, padY = 5
  const max = Math.max(...points, 1)
  const min = Math.min(...points)
  const range = max - min || 1
  const stepX = (w - padX * 2) / (points.length - 1)

  const coords = points.map((v, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - (v - min) / range) * (h - padY * 2),
  }))

  // Construct smooth cubic curve through points
  let linePath = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i]
    const next = coords[i + 1]
    const midX = ((curr.x + next.x) / 2).toFixed(1)
    linePath += ` C ${midX},${curr.y.toFixed(1)} ${midX},${next.y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`
  }

  const last = coords[coords.length - 1]
  const areaPath = `${linePath} L ${last.x.toFixed(1)},${h} L ${coords[0].x.toFixed(1)},${h} Z`

  return (
    <div ref={ref} className="pt-1">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-11 overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
          className="transition-opacity duration-300 opacity-80 group-hover:opacity-100"
        />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="text-emerald-500 dark:text-emerald-400 transition-colors"
        />
      </svg>
    </div>
  )
}
