import { useInView, useSiteOverview } from "@/lib/site-overview"

interface Props {
  domain: string
}

export default function SiteSparkline({ domain }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const { data } = useSiteOverview(domain, inView)
  const points = data?.sparkline ?? []

  // 始终渲染占位容器以便观察视口；数据不足两点时保持空白但不塌陷
  if (points.length < 2) return <div ref={ref} className="h-9" />

  const w = 160, h = 36, pad = 2
  const max = Math.max(...points, 1)
  const min = Math.min(...points)
  const range = max - min || 1
  const stepX = (w - pad * 2) / (points.length - 1)

  const polyline = points
    .map((v, i) => {
      const x = pad + i * stepX
      const y = pad + (1 - (v - min) / range) * (h - pad * 2)
      return `${x},${y.toFixed(1)}`
    })
    .join(" ")

  const area = `${polyline} ${w - pad},${h - pad} ${pad},${h - pad}`

  return (
    <div ref={ref}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-9 opacity-40 group-hover:opacity-60 transition-opacity"
        preserveAspectRatio="none"
      >
        <polygon points={area} fill="currentColor" className="text-emerald-400 dark:text-emerald-600" />
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="1.5"
          className="text-emerald-500 dark:text-emerald-500" />
      </svg>
    </div>
  )
}
