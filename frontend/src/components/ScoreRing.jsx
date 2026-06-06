import { useEffect, useRef } from 'react'

export default function ScoreRing({ score = 71, size = 200 }) {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = size/2, cy = size/2, r = size*0.38, lw = size*0.055
    ctx.clearRect(0,0,size,size)

    // Track
    ctx.beginPath()
    ctx.arc(cx,cy,r,0,Math.PI*2)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth   = lw
    ctx.stroke()

    // Arc
    const pct   = score/100
    const start = -Math.PI/2
    const end   = start + pct*Math.PI*2
    const grad  = ctx.createLinearGradient(0,0,size,size)
    grad.addColorStop(0, '#E05252')
    grad.addColorStop(0.5, '#D99E32')
    grad.addColorStop(1, '#3FB97E')
    ctx.beginPath()
    ctx.arc(cx,cy,r,start,end)
    ctx.strokeStyle = grad
    ctx.lineWidth   = lw
    ctx.lineCap     = 'round'
    ctx.stroke()
  }, [score, size])

  const color = score >= 70 ? '#3FB97E' : score >= 50 ? '#D99E32' : '#E05252'

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <canvas ref={ref} width={size} height={size} style={{ position:'absolute', inset:0 }} />
      <div style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{ fontFamily:'var(--f-display)', fontSize:size*.28, lineHeight:1, color }}>
          {score}
        </div>
        <div style={{ fontFamily:'var(--f-mono)', fontSize:size*.065, color:'var(--dim)', marginTop:2 }}>
          / 100
        </div>
      </div>
    </div>
  )
}
