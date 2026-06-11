import { useState, useEffect } from 'react';
import { modulesAPI } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const TT = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 13px',fontSize:12 }}>
      <div style={{ color:'var(--text2)',marginBottom:6,fontWeight:600 }}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{ color:p.color||'var(--text)' }}>{p.name}: <strong>{typeof p.value==='number'?p.value.toFixed(2):p.value}</strong></div>)}
    </div>
  );
};

function StatBox({ label, value, color, sub }) {
  return (
    <div style={{ background:'var(--bg3)',borderRadius:8,padding:'12px 14px',textAlign:'center',border:`1px solid ${color}33` }}>
      <div style={{ fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.07em',fontWeight:600,marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22,fontWeight:800,color }}>{value}</div>
      {sub && <div style={{ fontSize:10,color:'var(--text3)',marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    modulesAPI.analysis().then(r => {
      setModules(r.data);
      if (r.data.length > 0) setSelected(r.data[r.data.length - 1]);
    }).finally(() => setLoading(false));
  }, []);

  const sorted = [...modules].sort((a,b) => b.moyenne - a.moyenne);

  if (loading) return <div style={{ padding:32 }}><div className="skeleton" style={{ height:400,borderRadius:12 }}/></div>;
  if (!modules.length) return (
    <div style={{ padding:32,textAlign:'center',color:'var(--text2)' }}>
      <div style={{ fontSize:48,marginBottom:14 }}>📚</div>
      <h3>Aucune donnée de module</h3>
      <p style={{ marginTop:8 }}>Importez des notes pour démarrer l'analyse.</p>
    </div>
  );

  const distData = selected ? Array.from({length:20},(_,i)=>({
    range:`${i}`,
    count: selected.distribution.filter(n=>n>=i&&n<i+1).length
  })) : [];

  return (
    <div style={{ padding:28 }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22,fontWeight:800 }}>Analyse par Module</h1>
        <p style={{ color:'var(--text2)',marginTop:4,fontSize:13 }}>Statistiques descriptives complètes — moyenne, médiane, variance, écart-type, quartiles</p>
      </div>

      {/* Graphique comparatif */}
      <div className="card" style={{ marginBottom:18 }}>
        <h3 style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>Comparaison des Moyennes</h3>
        <p style={{ color:'var(--text3)',fontSize:11,marginBottom:16 }}>Cliquez sur une barre pour voir les statistiques détaillées</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sorted} margin={{ top:0,right:10,left:-10,bottom:40 }}
            onClick={e => e?.activePayload && setSelected(e.activePayload[0].payload)}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
            <XAxis dataKey="module" tick={{ fill:'var(--text3)',fontSize:9 }} angle={-20} textAnchor="end" interval={0}/>
            <YAxis domain={[0,20]} tick={{ fill:'var(--text3)',fontSize:9 }}/>
            <Tooltip content={<TT/>}/>
            <ReferenceLine y={10} stroke="var(--danger)" strokeDasharray="4 4"
              label={{ value:'Seuil 10',fill:'var(--danger)',fontSize:10,position:'right' }}/>
            <Bar dataKey="moyenne" name="Moyenne" radius={[4,4,0,0]} cursor="pointer">
              {sorted.map((m,i)=>(
                <Cell key={i}
                  fill={selected?.module===m.module?'var(--accent2)':m.taux_reussite>=70?'var(--success)':m.taux_reussite>=50?'var(--warning)':'var(--danger)'}
                  opacity={selected&&selected.module!==m.module?0.5:1}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Barres de réussite */}
      <div className="card" style={{ marginBottom:18 }}>
        <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Taux de Réussite par Module</h3>
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {sorted.map((m,i)=>(
            <div key={i} onClick={()=>setSelected(m)}
              style={{ display:'flex',alignItems:'center',gap:12,cursor:'pointer',padding:'6px 8px',borderRadius:6,background:selected?.module===m.module?'var(--bg3)':'transparent' }}>
              <div style={{ width:160,fontSize:12,color:selected?.module===m.module?'var(--text)':'var(--text2)',fontWeight:selected?.module===m.module?600:400,flexShrink:0 }}>{m.module}</div>
              <div style={{ flex:1,height:8,background:'var(--border)',borderRadius:4,overflow:'hidden' }}>
                <div style={{ height:'100%',borderRadius:4,width:`${m.taux_reussite}%`,
                  background:m.taux_reussite>=70?'var(--success)':m.taux_reussite>=50?'var(--warning)':'var(--danger)',
                  transition:'width 0.5s ease' }}/>
              </div>
              <div style={{ width:42,textAlign:'right',fontSize:13,fontWeight:700,
                color:m.taux_reussite>=70?'var(--success)':m.taux_reussite>=50?'var(--warning)':'var(--danger)' }}>
                {m.taux_reussite}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Détail module sélectionné */}
      {selected && (
        <div className="card animate-in">
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18 }}>
            <div>
              <h3 style={{ fontSize:16,fontWeight:800 }}>📚 {selected.module}</h3>
              <p style={{ color:'var(--text3)',fontSize:12,marginTop:3 }}>{selected.nb_etudiants} étudiants évalués</p>
            </div>
            <span style={{ padding:'4px 12px',borderRadius:6,fontSize:12,fontWeight:700,
              background:selected.taux_reussite>=70?'rgba(16,185,129,0.15)':selected.taux_reussite>=50?'rgba(245,158,11,0.15)':'rgba(240,82,82,0.15)',
              color:selected.taux_reussite>=70?'var(--success)':selected.taux_reussite>=50?'var(--warning)':'var(--danger)' }}>
              {selected.taux_reussite}% réussite
            </span>
          </div>

          {/* 8 statistiques — dont variance (énoncé §2.3) */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:10,marginBottom:22 }}>
            <StatBox label="Moyenne"    value={selected.moyenne}    color="var(--accent)"  />
            <StatBox label="Médiane"    value={selected.mediane}    color="var(--accent3)" />
            <StatBox label="Variance"   value={selected.variance}   color="var(--accent2)" sub="σ²" />
            <StatBox label="Écart-type" value={selected.ecart_type} color="var(--text2)"   sub="σ" />
            <StatBox label="Minimum"    value={selected.min}        color="var(--danger)"  />
            <StatBox label="Maximum"    value={selected.max}        color="var(--success)" />
            <StatBox label="Q1 (25%)"   value={selected.q1}         color="var(--warning)" />
            <StatBox label="Q3 (75%)"   value={selected.q3}         color="var(--accent3)" />
          </div>

          <h4 style={{ fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:12 }}>Distribution des notes</h4>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={distData} margin={{ top:0,right:0,left:-20,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="range" tick={{ fill:'var(--text3)',fontSize:9 }}/>
              <YAxis tick={{ fill:'var(--text3)',fontSize:9 }}/>
              <Tooltip content={<TT/>}/>
              <ReferenceLine x="10" stroke="var(--danger)" strokeDasharray="4 4"/>
              <Bar dataKey="count" name="Étudiants" radius={[3,3,0,0]}>
                {distData.map((_,i)=><Cell key={i} fill={i>=10?'var(--success)':'var(--danger)'} opacity={0.8}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Interprétation */}
          <div style={{ marginTop:16,padding:'12px 14px',background:'var(--bg3)',borderRadius:8,fontSize:12,color:'var(--text2)' }}>
            <strong style={{ color:'var(--text)' }}>📊 Interprétation : </strong>
            {selected.moyenne >= 14 ? `Excellent module — les étudiants maîtrisent bien la matière (moy. ${selected.moyenne}/20).` :
             selected.moyenne >= 12 ? `Bon niveau global — quelques difficultés mineures (moy. ${selected.moyenne}/20).` :
             selected.moyenne >= 10 ? `Niveau passable — des efforts de remédiation seraient bénéfiques (moy. ${selected.moyenne}/20).` :
             `Module difficile — taux d'échec élevé (${100-selected.taux_reussite}%). Séances de renforcement recommandées.`}
            {selected.variance > 20 && ` La variance élevée (σ²=${selected.variance}) indique une forte hétérogénéité des niveaux.`}
          </div>
        </div>
      )}
    </div>
  );
}
