import { useEffect, useRef, useState } from 'react'
import type { HeatmapData, HeatmapPage } from './types'

// Paint in CSS document coordinates. The backing bitmap is bounded even for
// tall pages; CSS scaling keeps the image and overlay at exactly the same ratio.
export default function HeatmapCanvas({ image, page, data, opacity }: {
  image: string; page: HeatmapPage; data: HeatmapData; opacity: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const node = container.current
    if (!node) return
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const node = canvas.current
    if (!node || !width) return
    const scale = Math.min(width / page.document_width, Math.sqrt(16000000 / (page.document_width * page.document_height)))
    node.width = Math.max(1, Math.round(page.document_width * scale))
    node.height = Math.max(1, Math.round(page.document_height * scale))
    const ctx = node.getContext('2d')
    if (!ctx) return
    const max = Math.max(1, ...data.points.map(p => p.count))
    for (const point of data.points) {
      const x = Math.min(page.document_width - .5, point.x + data.grid_size / 2) * scale
      const y = Math.min(page.document_height - .5, point.y + data.grid_size / 2) * scale
      const radius = Math.max(2, 28 * scale)
      const weight = Math.sqrt(point.count / max)
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(239,68,68,${.5 + weight * .5})`)
      gradient.addColorStop(.4, `rgba(250,204,21,${weight * .8})`)
      gradient.addColorStop(1, 'rgba(59,130,246,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
  }, [width, page, data])
  return <div ref={container} className="relative w-full overflow-hidden rounded-md border bg-white">
    <img src={image} alt={`${page.hostname}${page.path}`} className="block h-auto w-full" />
    <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }} />
  </div>
}
