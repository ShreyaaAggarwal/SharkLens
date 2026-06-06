import { useEffect, useRef } from 'react'

export default function Sparkline({ data = [], width=90, height=28, color='#E05252' }) {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,width,height)
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v,i) => ({
      x: (i/(data.length-1))*(width-2)+1,
      y: height-4 - ((v-min)/range)*(height-8),
    }))
    // Fill
    ctx.beginPath()
    pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y))
    ctx.lineTo(pts[pts.length-1].x, height)
    ctx.lineTo(pts[0].x, height)
    ctx.closePath()
    ctx.fillStyle = color.replace(')',', 0.12)').replace('rgb','rgba')
    ctx.fill()
    // Line
    ctx.beginPath()
    pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y))
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineJoin  = 'round'
    ctx.stroke()
  }, [data, width, height, color])

  return <canvas ref={ref} width={width} height={height} style={{ display:'block' }} />
}
