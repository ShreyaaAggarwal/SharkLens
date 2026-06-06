import { useEffect, useRef } from 'react'
import { RADAR_AXES } from '../services/mlEngine'

export default function RadarChart({ data = [64,55,48,80,70], size = 240 }) {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx   = canvas.getContext('2d')
    const W = size, H = size
    const cx = W/2, cy = H/2, R = W * 0.32
    const n  = RADAR_AXES.length
    ctx.clearRect(0,0,W,H)

    // Grid rings
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(255,255,255,${ring===4?.08:.04})`
      ctx.lineWidth = 1
      for (let i = 0; i < n; i++) {
        const a = (i/n)*Math.PI*2 - Math.PI/2
        const r = (ring/4)*R
        i===0 ? ctx.moveTo(cx+r*Math.cos(a), cy+r*Math.sin(a))
              : ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a))
      }
      ctx.closePath(); ctx.stroke()
    }

    // Spokes
    for (let i = 0; i < n; i++) {
      const a = (i/n)*Math.PI*2 - Math.PI/2
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx+R*Math.cos(a), cy+R*Math.sin(a))
      ctx.stroke()
    }

    // Data polygon
    ctx.beginPath()
    data.forEach((v, i) => {
      const a = (i/n)*Math.PI*2 - Math.PI/2
      const r = (v/100)*R
      i===0 ? ctx.moveTo(cx+r*Math.cos(a), cy+r*Math.sin(a))
            : ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a))
    })
    ctx.closePath()
    ctx.fillStyle   = 'rgba(224,82,82,0.12)'
    ctx.strokeStyle = 'rgba(224,82,82,0.7)'
    ctx.lineWidth   = 1.5
    ctx.fill(); ctx.stroke()

    // Data points
    data.forEach((v, i) => {
      const a = (i/n)*Math.PI*2 - Math.PI/2
      const r = (v/100)*R
      ctx.beginPath()
      ctx.fillStyle = '#E05252'
      ctx.arc(cx+r*Math.cos(a), cy+r*Math.sin(a), 3, 0, Math.PI*2)
      ctx.fill()
    })

    // Labels
    ctx.font = `500 10px 'IBM Plex Mono', monospace`
    ctx.textAlign = 'center'
    RADAR_AXES.forEach((lbl, i) => {
      const a = (i/n)*Math.PI*2 - Math.PI/2
      const r = R + 18
      ctx.fillStyle = 'rgba(139,148,158,0.9)'
      ctx.fillText(lbl, cx+r*Math.cos(a), cy+r*Math.sin(a)+4)
    })
  }, [data, size])

  return <canvas ref={ref} width={size} height={size} style={{ display:'block', margin:'0 auto' }} />
}
