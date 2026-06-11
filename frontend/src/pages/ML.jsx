import { useState } from 'react';
import { mlAPI } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Cell, ScatterChart, Scatter, Legend } from 'recharts';

const COLORS = ['#10b981','#4f8ef7','#7b6ff0','#f59e0b','#f05252'];

const TT = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return <div style={{ background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:12 }}><div style={{ color:'var(--text2)',marginBottom:4 }}>{label}</div>{payload.map((p,i)=><div key={i} style={{ color:p.color||'var(--text)' }}>{p.name}: <strong>{typeof p.value==='number'?p.value.toFixed(2):p.value}</strong></div>)}</div>;
};

function MetricCard({ label, value, color, desc }) {
  const pct = Math.round(value*100);
  return (
    <div style={{ background:'var(--bg3)',borderRadius:10,padding:'14px',border:`1px solid ${color}33` }}>
      <div style={{ fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600,marginBottom:7 }}>{label}</div>
      <div style={{ fontSize:28,fontWeight:800,color }}>{pct}<span style={{ fontSize:14,opacity:0.6 }}>%</span></div>
      <div style={{ marginTop:8,height:4,background:'var(--border)',borderRadius:2,overflow:'hidden' }}>
        <div style={{ height:'100%',width:`${pct}%`,background:color,borderRadius:2,transition:'width 1.2s ease' }}/>
      </div>
      {desc && <div style={{ fontSize:10,color:'var(--text3)',marginTop:6 }}>{desc}</div>}
    </div>
  );
}

function ConfusionMatrix({ matrix }) {
  if (!matrix||matrix.length<2) return null;
  const labels = ['Non-Risque','À Risque'];
  const total  = matrix.flat().reduce((a,b)=>a+b,0);
  return (
    <div>
      <h4 style={{ fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:10 }}>Matrice de Confusion</h4>
      <div style={{ display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:4 }}>
        <div/>
        {labels.map(l=><div key={l} style={{ textAlign:'center',fontSize:10,color:'var(--text3)',padding:'4px',fontWeight:600 }}>Prédit: {l}</div>)}
        {matrix.map((row,i)=>[
          <div key={`l${i}`} style={{ display:'flex',alignItems:'center',fontSize:10,color:'var(--text3)',fontWeight:600,paddingRight:6,whiteSpace:'nowrap' }}>Réel: {labels[i]}</div>,
          ...row.map((val,j)=>{
            const isOk = i===j;
            return (
              <div key={`${i}${j}`} style={{ background:isOk?'rgba(16,185,129,0.2)':val>0?'rgba(240,82,82,0.15)':'var(--bg3)',border:`1px solid ${isOk?'rgba(16,185,129,0.4)':'var(--border)'}`,borderRadius:8,padding:'14px',textAlign:'center' }}>
                <div style={{ fontSize:22,fontWeight:800,color:isOk?'var(--success)':val>0?'var(--danger)':'var(--text3)' }}>{val}</div>
                <div style={{ fontSize:10,color:'var(--text3)' }}>{total>0?Math.round(val/total*100):0}%</div>
              </div>
            );
          })
        ])}
      </div>
    </div>
  );
}

const VAR_LABELS = {
  moyenne:               'Moyenne générale',
  nb_absences:           'Nb absences',
  absences_injustifiees: 'Absences injustifiées',
  nb_retards:            'Nb retards',
  minutes_retard_total:  'Minutes de retard',
  ecart_type:            'Écart-type notes',
  nb_modules:            'Modules évalués',
};

export default function MLPage() {
  const [riskResult,    setRiskResult]    = useState(null);
  const [clusterResult, setClusterResult] = useState(null);
  const [loadingRisk,   setLoadingRisk]   = useState(false);
  const [loadingCluster,setLoadingCluster]= useState(false);
  const [nClusters,     setNClusters]     = useState(4);

  const runRisk = async () => {
    setLoadingRisk(true);
    try { const r = await mlAPI.riskModel(); setRiskResult(r.data); }
    catch(e) { setRiskResult({ error: e.response?.data?.detail||'Erreur' }); }
    finally { setLoadingRisk(false); }
  };

  const runCluster = async () => {
    setLoadingCluster(true);
    try { const r = await mlAPI.clustering(nClusters); setClusterResult(r.data); }
    catch(e) { setClusterResult({ error: e.response?.data?.detail||'Erreur' }); }
    finally { setLoadingCluster(false); }
  };

  const fiData = riskResult?.feature_importance
    ? Object.entries(riskResult.feature_importance)
        .map(([k,v]) => ({ name: VAR_LABELS[k]||k, value: Math.round(v*100) }))
        .sort((a,b) => b.value-a.value)
    : [];

  return (
    <div style={{ padding:28 }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22,fontWeight:800 }}>Intelligence Artificielle</h1>
        <p style={{ color:'var(--text2)',marginTop:4,fontSize:13 }}>Modèles prédictifs et segmentation automatique des profils étudiants</p>
      </div>

      {/* ── Bonus A ── */}
      <div className="card" style={{ marginBottom:18,borderTop:'3px solid var(--accent)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18 }}>
          <div>
            <div style={{ fontSize:10,color:'var(--accent)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4 }}>Bonus A</div>
            <h2 style={{ fontSize:17,fontWeight:800 }}>🎯 Modèle Prédictif du Risque d'Échec</h2>
            <p style={{ color:'var(--text2)',fontSize:12,marginTop:4 }}>Random Forest Classifier — variables : notes, absences, <strong style={{ color:'var(--accent)' }}>retards</strong>, progression</p>
          </div>
          <button onClick={runRisk} disabled={loadingRisk} style={{ padding:'10px 20px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>
            {loadingRisk?'⟳ Entraînement...':'▶ Entraîner le Modèle'}
          </button>
        </div>

        {/* Variables utilisées */}
        <div style={{ display:'flex',gap:8,marginBottom:18,flexWrap:'wrap' }}>
          {['Moyenne /20','Nb absences','Absences injustifiées','Nb retards ⭐','Minutes retard ⭐','Écart-type','Nb modules'].map((v,i)=>(
            <span key={i} style={{ padding:'4px 11px',borderRadius:6,background:'var(--bg3)',border:'1px solid var(--border)',fontSize:11,color:v.includes('⭐')?'var(--accent)':'var(--text2)' }}>{v}</span>
          ))}
        </div>

        {riskResult?.error && (
          <div style={{ padding:'11px 14px',background:'rgba(240,82,82,0.1)',border:'1px solid rgba(240,82,82,0.3)',borderRadius:8,color:'var(--danger)',fontSize:13 }}>❌ {riskResult.error}</div>
        )}

        {riskResult && !riskResult.error && (
          <div className="animate-in">
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
              <MetricCard label="Accuracy"  value={riskResult.accuracy}  color="var(--success)" desc="Taux de bonnes prédictions"/>
              <MetricCard label="Precision" value={riskResult.precision} color="var(--accent)"  desc="Vrais positifs / positifs prédits"/>
              <MetricCard label="Recall"    value={riskResult.recall}    color="var(--accent2)" desc="Vrais positifs / positifs réels"/>
              <MetricCard label="F1-Score"  value={riskResult.f1_score}  color="var(--accent3)" desc="Équilibre precision / recall"/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:18 }}>
              <div>
                <h4 style={{ fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:10 }}>Importance des Variables</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fiData} layout="vertical" margin={{ top:0,right:20,left:120,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                    <XAxis type="number" domain={[0,100]} tick={{ fill:'var(--text3)',fontSize:9 }} tickFormatter={v=>`${v}%`}/>
                    <YAxis type="category" dataKey="name" tick={{ fill:'var(--text2)',fontSize:10 }} tickLine={false} width={120}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="value" name="Importance" radius={[0,4,4,0]}>
                      {fiData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ConfusionMatrix matrix={riskResult.confusion_matrix}/>
            </div>
            <div style={{ marginTop:14,padding:'9px 13px',background:'var(--bg3)',borderRadius:8,fontSize:12,color:'var(--text3)' }}>
              📊 Entraîné sur <strong style={{ color:'var(--text)' }}>{riskResult.nb_train}</strong> étudiants · testé sur <strong style={{ color:'var(--text)' }}>{riskResult.nb_test}</strong> · {(riskResult.variables_utilisees||[]).length} variables dont retards
            </div>
          </div>
        )}
      </div>

      {/* ── Bonus B ── */}
      <div className="card" style={{ borderTop:'3px solid var(--accent2)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18 }}>
          <div>
            <div style={{ fontSize:10,color:'var(--accent2)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4 }}>Bonus B</div>
            <h2 style={{ fontSize:17,fontWeight:800 }}>🔵 Segmentation Automatique KMeans</h2>
            <p style={{ color:'var(--text2)',fontSize:12,marginTop:4 }}>Clustering non-supervisé — variables : moyenne, absences, <strong style={{ color:'var(--accent2)' }}>retards</strong>, écart-type</p>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'flex-end' }}>
            <div>
              <div style={{ fontSize:10,color:'var(--text3)',marginBottom:4 }}>Nb clusters</div>
              <select value={nClusters} onChange={e=>setNClusters(Number(e.target.value))}
                style={{ padding:'8px 12px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }}>
                {[2,3,4,5].map(n=><option key={n} value={n}>{n} groupes</option>)}
              </select>
            </div>
            <button onClick={runCluster} disabled={loadingCluster} style={{ padding:'10px 20px',background:'linear-gradient(135deg,var(--accent2),var(--accent))',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>
              {loadingCluster?'⟳ Clustering...':'▶ Lancer le Clustering'}
            </button>
          </div>
        </div>

        {clusterResult?.error && (
          <div style={{ padding:'11px 14px',background:'rgba(240,82,82,0.1)',border:'1px solid rgba(240,82,82,0.3)',borderRadius:8,color:'var(--danger)',fontSize:13 }}>❌ {clusterResult.error}</div>
        )}

        {clusterResult && !clusterResult.error && (
          <div className="animate-in">
            <div style={{ display:'grid',gridTemplateColumns:`repeat(${clusterResult.clusters.length},1fr)`,gap:12,marginBottom:20 }}>
              {clusterResult.clusters.map((c,i)=>(
                <div key={i} style={{ background:'var(--bg3)',borderRadius:10,padding:'14px',border:`2px solid ${COLORS[i%COLORS.length]}33`,textAlign:'center' }}>
                  <div style={{ width:36,height:36,borderRadius:'50%',background:`${COLORS[i%COLORS.length]}22`,border:`2px solid ${COLORS[i%COLORS.length]}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',fontWeight:800,color:COLORS[i%COLORS.length],fontSize:16 }}>{i+1}</div>
                  <div style={{ fontWeight:700,fontSize:13,color:COLORS[i%COLORS.length],marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:22,fontWeight:800 }}>{c.nb_etudiants}</div>
                  <div style={{ fontSize:10,color:'var(--text3)',marginBottom:8 }}>étudiants</div>
                  <div style={{ fontSize:11,color:'var(--text2)',marginBottom:3 }}>Moy: <strong style={{ color:c.moyenne>=10?'var(--success)':'var(--danger)' }}>{c.moyenne}/20</strong></div>
                  <div style={{ fontSize:11,color:'var(--text2)',marginBottom:3 }}>Abs: <strong>{c.nb_absences}</strong></div>
                  <div style={{ fontSize:11,color:'var(--text2)' }}>Ret: <strong>{c.nb_retards}</strong></div>
                </div>
              ))}
            </div>
            <h4 style={{ fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:10 }}>Visualisation des Clusters (Absences vs Moyenne)</h4>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top:0,right:20,left:-10,bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="nb_absences" name="Absences" tick={{ fill:'var(--text3)',fontSize:9 }} label={{ value:'Absences',position:'insideBottom',fill:'var(--text3)',fontSize:10,offset:-10 }}/>
                <YAxis dataKey="moyenne" name="Moyenne" domain={[0,20]} tick={{ fill:'var(--text3)',fontSize:9 }} label={{ value:'Moyenne',angle:-90,position:'insideLeft',fill:'var(--text3)',fontSize:10 }}/>
                <Tooltip cursor={{ stroke:'var(--border)' }} contentStyle={{ background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12 }}/>
                <Legend wrapperStyle={{ fontSize:11 }}/>
                {clusterResult.clusters.map((c,i)=>(
                  <Scatter key={i} name={c.label}
                    data={(clusterResult.data||[]).filter(d=>d.cluster===i)}
                    fill={COLORS[i%COLORS.length]} opacity={0.8}/>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
