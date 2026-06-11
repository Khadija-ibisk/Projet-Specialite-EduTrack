import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
         Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { dashboardAPI, rapportAPI } from '../api';

const SEG_COLORS = { excellent:'#10b981', stable:'#4f8ef7', moyen:'#7b6ff0', fragile:'#f59e0b', risque:'#f05252' };

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:12 }}>
      <div style={{ color:'var(--text2)',marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color||'var(--text)' }}>
          {p.name}: <strong>{typeof p.value==='number' ? p.value.toFixed(2) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

function Kpi({ label, value, color, icon, sub }) {
  return (
    <div className="card animate-in" style={{ borderLeft:`3px solid ${color}`,position:'relative',overflow:'hidden' }}>
      <div style={{ position:'absolute',top:14,right:14,fontSize:24,opacity:0.09 }}>{icon}</div>
      <div style={{ color:'var(--text3)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:28,fontFamily:'var(--font-head)',fontWeight:800,color,marginTop:4 }}>{value}</div>
      {sub && <div style={{ color:'var(--text2)',fontSize:11,marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ userPerms }) {
  const [kpis,    setKpis]    = useState(null);
  const [corr,    setCorr]    = useState(null);
  const [prog,    setProg]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoad, setPdfLoad] = useState(false);

  useEffect(() => {
    Promise.all([dashboardAPI.kpis(), dashboardAPI.correlations(), dashboardAPI.progression()])
      .then(([k,c,p]) => { setKpis(k.data); setCorr(c.data); setProg(p.data); })
      .finally(() => setLoading(false));
  }, []);

  const handlePDF = async () => {
    setPdfLoad(true);
    try { await rapportAPI.downloadPDF(); }
    finally { setPdfLoad(false); }
  };

  if (loading) return (
    <div style={{ padding:28 }}>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:20 }}>
        {Array(6).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:90 }}/>)}
      </div>
    </div>
  );

  if (!kpis || kpis.no_data) return (
    <div style={{ padding:32,textAlign:'center',color:'var(--text2)' }}>
      <div style={{ fontSize:48,marginBottom:14 }}>📂</div>
      <h3>Aucune donnée disponible</h3>
      <p style={{ marginTop:8 }}>Importez des données via l'onglet <strong>Importation</strong> pour démarrer.</p>
    </div>
  );

  const notesDist = Array.from({length:20},(_,i) => ({
    range:`${i}-${i+1}`,
    count: (kpis.distribution_notes||[]).filter(n => n>=i && n<i+1).length
  }));

  const segData = Object.entries(kpis.segments||{}).map(([name,value]) => ({
    name: name.charAt(0).toUpperCase()+name.slice(1), value
  }));

  return (
    <div style={{ padding:28 }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800 }}>Tableau de Bord Pédagogique</h1>
          <p style={{ color:'var(--text2)',marginTop:4,fontSize:13 }}>
            {kpis.nb_etudiants} étudiants · {kpis.module_stats?.length} modules · données en temps réel
          </p>
        </div>
        <button onClick={handlePDF} disabled={pdfLoad} style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'linear-gradient(135deg,#f05252,#e53e3e)',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>
          {pdfLoad ? '⟳ Génération...' : '📄 Rapport PDF'}
        </button>
      </div>

      {/* 6 KPIs — dont retards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:22 }}>
        <Kpi label="Étudiants"      value={kpis.nb_etudiants}           icon="🎓" color="var(--accent)"  sub="inscrits"/>
        <Kpi label="Moyenne Gén."   value={`${kpis.moyenne_generale}/20`} icon="📈" color="var(--accent3)" sub="toutes promotions"/>
        <Kpi label="Taux Réussite"  value={`${kpis.taux_reussite}%`}     icon="✅" color="var(--success)" sub="≥ 10/20"/>
        <Kpi label="À Risque"       value={kpis.nb_a_risque}             icon="⚠️" color="var(--danger)"  sub="nécessitent suivi"/>
        <Kpi label="Abs. Moy."      value={kpis.taux_absence_moyen}      icon="📅" color="var(--warning)" sub="absences / étudiant"/>
        <Kpi label="Retards Total"  value={kpis.nb_retards_total}        icon="⏰" color="var(--accent2)" sub={`~${kpis.moy_retards_etudiant}/étudiant`}/>
      </div>

      {/* Ligne 1 : distribution + segmentation */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        <div className="card">
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>Distribution des Notes</h3>
          <p style={{ color:'var(--text3)',fontSize:11,marginBottom:14 }}>Répartition globale — rouge = insuffisant, vert = validé</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={notesDist} margin={{ top:0,right:0,left:-20,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="range" tick={{ fill:'var(--text3)',fontSize:9 }} tickLine={false}/>
              <YAxis tick={{ fill:'var(--text3)',fontSize:9 }} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="count" name="Étudiants" radius={[3,3,0,0]}>
                {notesDist.map((_,i) => <Cell key={i} fill={i>=10?'var(--success)':'var(--danger)'} opacity={0.82}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>Segmentation des Profils</h3>
          <p style={{ color:'var(--text3)',fontSize:11,marginBottom:14 }}>Classification automatique par score de risque</p>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={segData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {segData.map((e,i) => <Cell key={i} fill={SEG_COLORS[e.name.toLowerCase()]||'#666'}/>)}
                </Pie>
                <Tooltip content={<TT/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {segData.map((s,i) => (
                <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:SEG_COLORS[s.name.toLowerCase()]||'#666' }}/>
                    <span style={{ fontSize:12,color:'var(--text2)' }}>{s.name}</span>
                  </div>
                  <span style={{ fontWeight:700,fontSize:13 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progression semestres */}
      {prog.length > 1 && (
        <div className="card" style={{ marginBottom:16 }}>
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>Progression par Semestre</h3>
          <p style={{ color:'var(--text3)',fontSize:11,marginBottom:14 }}>Évolution de la moyenne et du taux de réussite (S1 → S2 → S3)</p>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={prog} margin={{ top:0,right:30,left:-10,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="semestre" tick={{ fill:'var(--text3)',fontSize:11 }}/>
              <YAxis yAxisId="left"  domain={[0,20]}  tick={{ fill:'var(--text3)',fontSize:10 }}/>
              <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fill:'var(--text3)',fontSize:10 }}/>
              <Tooltip content={<TT/>}/>
              <Legend wrapperStyle={{ fontSize:12 }}/>
              <Line yAxisId="left"  type="monotone" dataKey="moyenne"       name="Moyenne /20"  stroke="var(--accent)"  strokeWidth={2.5} dot={{ fill:'var(--accent)',  r:5 }}/>
              <Line yAxisId="right" type="monotone" dataKey="taux_reussite" name="Réussite %"   stroke="var(--success)" strokeWidth={2.5} dot={{ fill:'var(--success)', r:5 }} strokeDasharray="5 3"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ligne 2 : modules + classes */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        <div className="card">
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>Performance par Module</h3>
          <p style={{ color:'var(--text3)',fontSize:11,marginBottom:14 }}>Moyenne /20 — rouge si &lt; 10, vert si ≥ 10</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[...(kpis.module_stats||[])].sort((a,b)=>a.moyenne-b.moyenne)}
              layout="vertical" margin={{ top:0,right:20,left:100,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
              <XAxis type="number" domain={[0,20]} tick={{ fill:'var(--text3)',fontSize:9 }}/>
              <YAxis type="category" dataKey="module" tick={{ fill:'var(--text2)',fontSize:9 }} tickLine={false} width={100}/>
              <Tooltip content={<TT/>}/>
              <ReferenceLine x={10} stroke="var(--danger)" strokeDasharray="4 4"/>
              <Bar dataKey="moyenne" name="Moyenne" radius={[0,3,3,0]}>
                {(kpis.module_stats||[]).map((m,i) => (
                  <Cell key={i} fill={m.moyenne>=10?'var(--success)':'var(--danger)'} opacity={0.85}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>Comparaison par Classe</h3>
          <p style={{ color:'var(--text3)',fontSize:11,marginBottom:14 }}>Moyenne et taux de réussite par promotion</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={kpis.classe_stats||[]} margin={{ top:0,right:0,left:-10,bottom:36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="classe" tick={{ fill:'var(--text3)',fontSize:9 }} angle={-15} textAnchor="end" interval={0}/>
              <YAxis yAxisId="left"  domain={[0,20]}  tick={{ fill:'var(--text3)',fontSize:9 }}/>
              <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fill:'var(--text3)',fontSize:9 }}/>
              <Tooltip content={<TT/>}/>
              <Legend wrapperStyle={{ fontSize:11 }}/>
              <Bar yAxisId="left"  dataKey="moyenne"       name="Moyenne/20" fill="var(--accent)"  radius={[3,3,0,0]}/>
              <Bar yAxisId="right" dataKey="taux_reussite" name="Réussite %"  fill="var(--success)" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter corrélations */}
      {corr?.scatter_data && (
        <div className="card">
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14 }}>
            <div>
              <h3 style={{ fontSize:14,fontWeight:700,marginBottom:2 }}>Corrélations Absences & Retards ↔ Moyenne</h3>
              <p style={{ color:'var(--text3)',fontSize:11 }}>Chaque point représente un étudiant — couleur = profil académique</p>
            </div>
            <div style={{ display:'flex',gap:12 }}>
              {[
                [`Abs/Moy : ${corr.correlation_absences_moyenne}`, 'var(--warning)'],
                [`Ret/Moy : ${corr.correlation_retards_moyenne}`,  'var(--accent2)'],
              ].map(([txt,c],i) => (
                <div key={i} style={{ textAlign:'center',background:'var(--bg3)',borderRadius:8,padding:'8px 14px' }}>
                  <div style={{ fontSize:15,fontWeight:800,color:c }}>{txt}</div>
                  <div style={{ fontSize:10,color:'var(--text3)' }}>Corrélation r</div>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ScatterChart margin={{ top:0,right:20,left:-20,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="nb_absences" name="Absences" tick={{ fill:'var(--text3)',fontSize:9 }}
                label={{ value:'Absences',position:'insideBottom',fill:'var(--text3)',fontSize:10,offset:-2 }}/>
              <YAxis dataKey="moyenne" name="Moyenne" domain={[0,20]} tick={{ fill:'var(--text3)',fontSize:9 }}/>
              <Tooltip cursor={{ stroke:'var(--border)' }} content={({ active, payload }) => {
                if (!active||!payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:12 }}>
                    <div style={{ fontWeight:600 }}>{d?.prenom} {d?.nom}</div>
                    <div style={{ color:'var(--text2)' }}>Abs: {d?.nb_absences} | Ret: {d?.nb_retards} | Moy: {d?.moyenne?.toFixed(1)}/20</div>
                  </div>
                );
              }}/>
              {Object.keys(SEG_COLORS).map(seg => (
                <Scatter key={seg} name={seg}
                  data={(corr.scatter_data||[]).filter(d => d.segment===seg)}
                  fill={SEG_COLORS[seg]} opacity={0.75}/>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
