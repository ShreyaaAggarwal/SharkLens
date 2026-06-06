import RadarChart from './RadarChart'
import Sparkline  from './Sparkline'
import { EMOTION_COLOR, MCP_TEXTS, NONSENSE } from '../services/mlEngine'

export default function MLSidebar({ ml, onHint, onEnd }) {
  const conf    = Math.round(ml.confidence)
  const confCol = conf >= 70 ? 'var(--vc)' : conf >= 50 ? 'var(--angel)' : 'var(--cuban)'
  const ns      = NONSENSE[ml.nonsenseIdx] || NONSENSE[0]

  const topFillers = Object.entries(ml.fillerCounts)
    .sort((a,b)=>b[1]-a[1]).slice(0,6)

  return (
    <div style={{
      width:294, flexShrink:0,
      borderLeft:'1px solid var(--border)',
      background:'var(--surface)',
      display:'flex', flexDirection:'column',
      overflowY:'auto',
      height:'calc(100vh - 60px)',
    }}>

      {/* ---- Confidence ---- */}
      <Section label="Confidence Score">
        <div style={{ display:'flex', alignItems:'flex-end', gap:12 }}>
          <div style={{
            fontFamily:'var(--f-display)', fontSize:52, lineHeight:1,
            color:confCol, animation:'countIn .4s ease',
          }}>
            {conf}<span style={{ fontSize:22, opacity:.6 }}>%</span>
          </div>
          <Sparkline data={ml.history} color={confCol} width={88} height={30} />
        </div>
        <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
          <div className="dot dot-pulse" style={{
            background: confCol, width:6, height:6,
          }}/>
          <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)' }}>
            FUSION NET · LIVE
          </span>
        </div>
      </Section>

      {/* ---- Gaze ---- */}
      <Section label="Eye Contact">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontFamily:'var(--f-display)', fontSize:32, color:'var(--vc)' }}>
            {Math.round(ml.gaze)}%
          </div>
          <div style={{ flex:1 }}>
            <div style={{ height:4, background:'var(--surface3)', borderRadius:2, overflow:'hidden' }}>
              <div style={{
                height:'100%', width:`${ml.gaze}%`,
                background:'var(--vc)', borderRadius:2,
                transition:'width .6s ease',
              }}/>
            </div>
            <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--dim)', marginTop:5 }}>
              MEDIAPIPE IRIS · GAZE VECTOR
            </div>
          </div>
          <span style={{ fontSize:18 }}>👁</span>
        </div>
      </Section>

      {/* ---- Emotion ---- */}
      <Section label="Emotion">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{
            fontFamily:'var(--f-cond)', fontSize:22, fontWeight:700,
            color: EMOTION_COLOR[ml.emotion] || 'var(--sub)',
          }}>
            {ml.emotion}
          </div>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--dim)', textAlign:'right' }}>
            MOBILEVIT<br/>INFERENCE
          </div>
        </div>
      </Section>

      {/* ---- Filler Words ---- */}
      <Section label={`Filler Words · WAV2VEC2`}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {topFillers.map(([w,c]) => (
            <span key={w} style={{
              background: c>=5 ? 'var(--cuban-mute)' : 'var(--surface2)',
              border: `1px solid ${c>=5 ? 'var(--cuban)' : 'var(--border)'}`,
              color: c>=5 ? 'var(--cuban)' : 'var(--sub)',
              fontFamily:'var(--f-mono)', fontSize:11,
              padding:'3px 9px', borderRadius:20,
              transition:'all .3s',
            }}>
              {w} ×{c}
            </span>
          ))}
        </div>
      </Section>

      {/* ---- WPM / Turns ---- */}
      <Section label="Session Metrics">
        {[
          ['Speech Rate', `${Math.round(ml.wpm)} WPM`, ml.wpm>180||ml.wpm<100?'var(--angel)':'var(--sub)'],
          ['Turns', String(ml.turns), 'var(--sub)'],
          ['Stress Level', `${Math.round(ml.stress)}%`, ml.stress>60?'var(--cuban)':'var(--sub)'],
        ].map(([k,v,c]) => (
          <div key={k} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'6px 0', borderBottom:'1px solid var(--border)',
          }}>
            <span style={{ fontSize:12, color:'var(--sub)' }}>{k}</span>
            <span style={{ fontFamily:'var(--f-mono)', fontSize:12, color:c }}>{v}</span>
          </div>
        ))}
      </Section>

      {/* ---- Radar ---- */}
      <Section label="Performance Radar">
        <RadarChart data={ml.radarData} size={240} />
      </Section>

      {/* ---- Nonsense Detector ---- */}
      <Section label="Nonsense Detector">
        <div style={{
          background: ns.alert ? 'rgba(224,82,82,0.08)' : 'var(--surface2)',
          border: `1px solid ${ns.alert ? 'var(--cuban)' : 'var(--border)'}`,
          borderRadius:'var(--r)',
          padding:'10px 12px',
          transition:'all .4s',
        }}>
          {ns.alert && <div style={{
            fontFamily:'var(--f-mono)', fontSize:9, color:'var(--cuban)',
            letterSpacing:1.5, marginBottom:4,
          }}>⚠ ALERT</div>}
          <div style={{ fontSize:12, color: ns.alert?'var(--text)':'var(--sub)', lineHeight:1.5 }}>
            {ns.text}
          </div>
        </div>
      </Section>

      {/* ---- MCP ---- */}
      <Section label="Web Search MCP">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div className="spin-ring"/>
          <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', lineHeight:1.4 }}>
            {MCP_TEXTS[ml.mcpIdx]}
          </span>
        </div>
      </Section>

      {/* ---- Controls ---- */}
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, marginTop:'auto' }}>
        <button onClick={onHint} style={{
          width:'100%', padding:'9px', borderRadius:'var(--r)',
          border:'1px solid var(--border)',
          background:'var(--surface2)', color:'var(--sub)',
          fontFamily:'var(--f-cond)', fontSize:13, fontWeight:600,
          cursor:'pointer', transition:'all .2s', letterSpacing:.3,
        }}
          onMouseEnter={e=>{ e.target.style.borderColor='var(--angel)'; e.target.style.color='var(--text)' }}
          onMouseLeave={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.color='var(--sub)' }}
        >
          ⏸ 10s FREEZE — GET AI HINT
        </button>
        <button onClick={onEnd} style={{
          width:'100%', padding:'9px', borderRadius:'var(--r)',
          border:'1px solid rgba(224,82,82,.3)',
          background:'rgba(224,82,82,.06)', color:'var(--cuban)',
          fontFamily:'var(--f-cond)', fontSize:13, fontWeight:600,
          cursor:'pointer', transition:'all .2s',
        }}>
          END SESSION →
        </button>
      </div>

    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{
      padding:'14px 16px',
      borderBottom:'1px solid var(--border)',
    }}>
      <div className="card-lbl" style={{ marginBottom:10 }}>{label}</div>
      {children}
    </div>
  )
}
