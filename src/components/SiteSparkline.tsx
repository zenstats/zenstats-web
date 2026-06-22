import { useEffect, useState } from "react"
import axios, { type BaseResponse } from "@utils/axios"
import type { MainGraphPoint } from "@/pages/sites/types/interfaces"

interface Props {
  domain: string
}

export default function SiteSparkline({ domain }: Props) {
  const [points, setPoints] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    axios.get<BaseResponse<MainGraphPoint[]>>(`/stats/${domain}/main-graph`, {
      params: { period: "day", metrics: "visitors" }
    }).then(res => {
      if (cancelled || !res.data?.data) return
      const visitors = res.data.data.map(p => p.metrics?.visitors || 0)
      setPoints(visitors)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [domain])

  if (points.length < 2) return null

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
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-9 opacity-40 group-hover:opacity-60 transition-opacity"
      preserveAspectRatio="none"
    >
      <polygon points={area} fill="currentColor" className="text-emerald-400 dark:text-emerald-600" />
      <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="1.5"
        className="text-emerald-500 dark:text-emerald-500" />
    </svg>
  )
}
