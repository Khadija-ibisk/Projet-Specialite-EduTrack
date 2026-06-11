import { useState, useEffect } from 'react';
import { etudiantsAPI } from '../api';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
         BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const SEG_COLORS = { excellent:'#10b981', stable:'#4f8ef7', moyen:'#7b6ff0', fragile:'#f59e0b', risque:'#f05252' };
const TT = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return <div style={{ background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:12 }}><div style={{ color:'var(--text2)',marginBottom:4 }}>{label}</div>{payload.map((p,i)=><div key={i} style={{ color:p.color||'var(--text)' }}>{p.name}: <strong>{typeof p.value==='number'?p.value.toFixed(2):p.value}</strong></div>)}</div>;
};

function RiskGauge({ score }) {
  const color = score<30?'var(--success)':score<60?'var(--warning)':'var(--danger)';
  const r=32, c=2*Math.PI*r;
  return (
    <div style={{ position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center' }}>
      <svg width={84} height={84} viewBox="0 0 84 84">
        <circle cx={42} cy={42} r={r} fill="none" stroke="var(--border)" strokeWidth={6}/>
        <circle cx={42} cy={42} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${(score/100)*c} ${c}`} strokeLinecap="round" transform="rotate(-90 42 42)"/>
      </svg>
      <div style={{ position:'absolute',textAlign:'center' }}>
        <div style={{ fontSize:15,fontWeight:800,color }}>{score}</div>
        <div style={{ fontSize:9,color:'var(--text3)' }}>risque</div>
      </div>
    </div>
  );
}

function StudentDetail({ etudiantId, onBack, canDelete }) {
  const [data, setData] = useState(null);
  const [tab,  setTab]  = useState('notes');

  useEffect(() => { etudiantsAPI.get(etudiantId).then(r => setData(r.data)); }, [etudiantId]);

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement cet étudiant et toutes ses données ?')) return;
    await etudiantsAPI.delete(etudiantId);
    onBack();
  };

  if (!data) return <div style={{ padding:32,textAlign:'center',color:'var(--text2)' }}>Chargement...</div>;

  const { etudiant, moyenne, variance, nb_absences, nb_retards, minutes_retard,
          notes, absences, retards, notes_by_module, score_risque, segment, classement, total_classe } = data;

  const radarData = Object.entries(notes_by_module||{}).slice(0,8).map(([m,s])=>({
    module: m.length>11 ? m.slice(0,11)+'…' : m,
    note: parseFloat(s.mean?.toFixed(1)||0)
  }));
  const barData = Object.entries(notes_by_module||{}).map(([m,s])=>({
    module: m.length>16 ? m.slice(0,16)+'…' : m,
    moyenne: parseFloat(s.mean?.toFixed(2)||0)
  }));
  const semestres = [...new Set((notes||[]).map(n=>n.semestre))].sort();
  const progData  = semestres.map(sem=>({
    semestre: sem,
    moyenne: parseFloat(((notes||[]).filter(n=>n.semestre===sem)
      .reduce((s,n)=>s+n.note,0)/Math.max(1,(notes||[]).filter(n=>n.semestre===sem).length)).toFixed(2))
  }));

  const TABS = [
    { id:'notes',    label:`Notes (${(notes||[]).length})` },
    { id:'absences', label:`Absences (${nb_absences})` },
    { id:'retards',  label:`Retards (${nb_retards})` },
  ];

  return (
    <div style={{ padding:28 }} className="animate-in">
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
        <button onClick={onBack} style={{ background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 16px',color:'var(--text2)',cursor:'pointer' }}>← Retour</button>
        {canDelete && (
          <button onClick={handleDelete} style={{ padding:'8px 16px',background:'rgba(240,82,82,0.1)',border:'1px solid rgba(240,82,82,0.3)',borderRadius:8,color:'var(--danger)',fontSize:13,cursor:'pointer' }}>🗑️ Supprimer</button>
        )}
      </div>

      {/* Header carte */}
      <div className="card" style={{ marginBottom:16,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap' }}>
        <div style={{ width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),var(--accent2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,flexShrink:0 }}>
          {etudiant.prenom?.[0]}{etudiant.nom?.[0]}
        </div>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:19,fontWeight:800 }}>{etudiant.prenom} {etudiant.nom}</h2>
          <div style={{ color:'var(--text2)',fontSize:12,marginTop:1 }}>{etudiant.email}</div>
          <div style={{ display:'flex',gap:8,marginTop:6,alignItems:'center',flexWrap:'wrap' }}>
            <span style={{ background:'var(--bg3)',padding:'3px 10px',borderRadius:6,fontSize:11,color:'var(--text2)' }}>{etudiant.classe}</span>
            <span style={{ fontSize:11,color:'var(--text3)' }}>{etudiant.etudiant_id}</span>
            <span className={`badge badge-${segment}`}>{segment}</span>
          </div>
        </div>
        <div style={{ display:'flex',gap:18,alignItems:'center',flexWrap:'wrap' }}>
          {[
            ['Moyenne',     `${moyenne}/20`,           moyenne>=10?'var(--success)':'var(--danger)'],
            ['Variance',    `${variance} σ²`,           'var(--accent2)'],
            ['Absences',    nb_absences,                nb_absences>10?'var(--danger)':'var(--text)'],
            ['Retards',     nb_retards,                 nb_retards>8?'var(--warning)':'var(--text)'],
            ['Min. retard', `${minutes_retard||0} min`, 'var(--text2)'],
            [`Rang`,        `${classement}/${total_classe}`, 'var(--text)'],
          ].map(([l,v,c],i) => (
            <div key={i} style={{ textAlign:'center',background:'var(--bg3)',borderRadius:8,padding:'8px 14px' }}>
              <div style={{ fontSize:20,fontWeight:800,color:c }}>{v}</div>
              <div style={{ fontSize:10,color:'var(--text3)',marginTop:1 }}>{l}</div>
            </div>
          ))}
          <RiskGauge score={Math.round(score_risque||0)}/>
        </div>
      </div>

      {/* Recommandations */}
      {score_risque > 50 && (
        <div style={{ marginBottom:16,padding:'12px 16px',background:'rgba(240,82,82,0.08)',border:'1px solid rgba(240,82,82,0.25)',borderRadius:10 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--danger)',marginBottom:6 }}>⚠️ Recommandations Pédagogiques</div>
          {moyenne<10        && <div style={{ fontSize:12,color:'var(--text2)',marginBottom:3 }}>• Organiser un entretien individuel et établir un plan de remédiation personnalisé.</div>}
          {nb_absences>10    && <div style={{ fontSize:12,color:'var(--text2)',marginBottom:3 }}>• Contacter l'étudiant pour un rappel d'assiduité — {nb_absences} absences enregistrées.</div>}
          {nb_retards>8      && <div style={{ fontSize:12,color:'var(--text2)',marginBottom:3 }}>• Sensibiliser à la ponctualité — {nb_retards} retards pour {minutes_retard} minutes cumulées.</div>}
          {variance>20       && <div style={{ fontSize:12,color:'var(--text2)',marginBottom:3 }}>• Variance élevée (σ²={variance}) : résultats très irréguliers, besoin de régularité.</div>}
          {Object.entries(notes_by_module||{}).some(([,s])=>s.mean<10) && (
            <div style={{ fontSize:12,color:'var(--text2)' }}>• Renforcement sur les modules insuffisants (note &lt; 10/20).</div>
          )}
        </div>
      )}

      {/* Graphiques */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        <div className="card">
          <h3 style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>Profil de Compétences</h3>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)"/>
              <PolarAngleAxis dataKey="module" tick={{ fill:'var(--text2)',fontSize:9 }}/>
              <PolarRadiusAxis domain={[0,20]} tick={{ fill:'var(--text3)',fontSize:8 }}/>
              <Radar name="Note" dataKey="note" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>Notes par Module</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} layout="vertical" margin={{ top:0,right:20,left:72,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
              <XAxis type="number" domain={[0,20]} tick={{ fill:'var(--text3)',fontSize:9 }}/>
              <YAxis type="category" dataKey="module" tick={{ fill:'var(--text2)',fontSize:9 }} tickLine={false} width={72}/>
              <Tooltip content={<TT/>}/>
              <ReferenceLine x={10} stroke="var(--danger)" strokeDasharray="4 4"/>
              <Bar dataKey="moyenne" name="Moyenne" radius={[0,3,3,0]}>
                {barData.map((d,i) => <Cell key={i} fill={d.moyenne>=10?'var(--success)':'var(--danger)'} opacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Progression semestres */}
      {progData.length > 1 && (
        <div className="card" style={{ marginBottom:16,padding:'14px 18px' }}>
          <div style={{ display:'flex',gap:20,alignItems:'center' }}>
            <div style={{ fontSize:13,fontWeight:700,color:'var(--text2)' }}>Progression :</div>
            {progData.map((p,i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:18,fontWeight:800,color:p.moyenne>=10?'var(--success)':'var(--danger)' }}>{p.moyenne}</div>
                <div style={{ fontSize:10,color:'var(--text3)' }}>{p.semestre}</div>
              </div>
            ))}
            {progData.length>=2 && (
              <div style={{ marginLeft:8,fontSize:12,color:progData[progData.length-1].moyenne > progData[0].moyenne?'var(--success)':'var(--danger)' }}>
                {progData[progData.length-1].moyenne > progData[0].moyenne ? '📈 En progression' : '📉 En régression'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglets données détaillées */}
      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div style={{ display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg3)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'11px 18px',border:'none',background:'transparent',color:tab===t.id?'var(--accent)':'var(--text2)',fontWeight:tab===t.id?700:400,fontSize:13,cursor:'pointer',borderBottom:tab===t.id?'2px solid var(--accent)':'2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==='notes' && (
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg3)' }}>
              <tr>{['Module','Semestre','Note /20','Coeff','Appréciation'].map(h=><th key={h} style={{ padding:'9px 14px',textAlign:'left',color:'var(--text3)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(notes||[]).map((n,i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--border)',transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'9px 14px',fontSize:13 }}>{n.module}</td>
                  <td style={{ padding:'9px 14px',fontSize:12,color:'var(--text2)' }}>{n.semestre}</td>
                  <td style={{ padding:'9px 14px' }}><span style={{ fontWeight:700,fontSize:14,color:n.note>=10?'var(--success)':'var(--danger)' }}>{n.note}</span></td>
                  <td style={{ padding:'9px 14px',color:'var(--text2)',fontSize:12 }}>×{n.coefficient}</td>
                  <td style={{ padding:'9px 14px',fontSize:12,color:n.note>=16?'var(--success)':n.note>=12?'var(--accent)':n.note>=10?'var(--warning)':'var(--danger)' }}>
                    {n.note>=16?'⭐ Très Bien':n.note>=12?'✅ Bien':n.note>=10?'🔸 Passable':'❌ Insuffisant'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab==='absences' && (
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg3)' }}>
              <tr>{['Module','Date','Justifiée'].map(h=><th key={h} style={{ padding:'9px 14px',textAlign:'left',color:'var(--text3)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(absences||[]).length===0
                ? <tr><td colSpan={3} style={{ padding:'20px',textAlign:'center',color:'var(--text3)',fontSize:13 }}>Aucune absence enregistrée ✅</td></tr>
                : (absences||[]).map((a,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'9px 14px',fontSize:13 }}>{a.module}</td>
                    <td style={{ padding:'9px 14px',fontSize:12,color:'var(--text2)' }}>{a.date}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ fontSize:11,padding:'3px 8px',borderRadius:4,fontWeight:600,
                        background:a.justifiee?'rgba(16,185,129,0.15)':'rgba(240,82,82,0.15)',
                        color:a.justifiee?'var(--success)':'var(--danger)' }}>
                        {a.justifiee ? '✓ Justifiée' : '✗ Non justifiée'}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}

        {tab==='retards' && (
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg3)' }}>
              <tr>{['Module','Date','Durée (min)'].map(h=><th key={h} style={{ padding:'9px 14px',textAlign:'left',color:'var(--text3)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(retards||[]).length===0
                ? <tr><td colSpan={3} style={{ padding:'20px',textAlign:'center',color:'var(--text3)',fontSize:13 }}>Aucun retard enregistré ✅</td></tr>
                : (retards||[]).map((r,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'9px 14px',fontSize:13 }}>{r.module}</td>
                    <td style={{ padding:'9px 14px',fontSize:12,color:'var(--text2)' }}>{r.date}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ fontWeight:700,fontSize:13,color:r.minutes>=30?'var(--warning)':'var(--text2)' }}>{r.minutes} min</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function Etudiants({ userPerms }) {
  const [students,  setStudents]  = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [classe,    setClasse]    = useState('');
  const [segment,   setSegment]   = useState('');
  const [sortBy,    setSortBy]    = useState('moyenne');
  const [sortAsc,   setSortAsc]   = useState(false);
  const [selectedId,setSelectedId]= useState(null);

  const canDelete = userPerms?.has('delete');

  const load = (params={}) => {
    setLoading(true);
    etudiantsAPI.list(params).then(r=>setStudents(r.data)).finally(()=>setLoading(false));
  };

  useEffect(() => { etudiantsAPI.classes().then(r=>setClasses(r.data)); load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const p = {};
      if (classe)  p.classe  = classe;
      if (segment) p.segment = segment;
      if (search)  p.search  = search;
      load(p);
    }, 300);
    return () => clearTimeout(t);
  }, [search, classe, segment]);

  const sorted = [...students].sort((a,b) => {
    const va=a[sortBy]??0, vb=b[sortBy]??0;
    return sortAsc ? va-vb : vb-va;
  });

  const toggleSort = col => { if(sortBy===col) setSortAsc(!sortAsc); else { setSortBy(col); setSortAsc(false); } };

  if (selectedId) return <StudentDetail etudiantId={selectedId} onBack={()=>setSelectedId(null)} canDelete={canDelete}/>;

  return (
    <div style={{ padding:28 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22,fontWeight:800 }}>Gestion des Étudiants</h1>
        <p style={{ color:'var(--text2)',marginTop:4,fontSize:13 }}>{students.length} étudiant(s) — cliquez sur une ligne pour la fiche détaillée</p>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
        <input placeholder="🔍 Rechercher (nom, prénom, ID)..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:1,minWidth:200,padding:'10px 13px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }}/>
        <select value={classe} onChange={e=>setClasse(e.target.value)}
          style={{ padding:'10px 13px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }}>
          <option value="">Toutes les classes</option>
          {classes.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={segment} onChange={e=>setSegment(e.target.value)}
          style={{ padding:'10px 13px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,outline:'none' }}>
          <option value="">Tous les profils</option>
          {Object.keys(SEG_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Compteurs segments */}
      {students.length>0 && (
        <div style={{ display:'flex',gap:8,marginBottom:14,flexWrap:'wrap' }}>
          {Object.entries(students.reduce((acc,s)=>{ acc[s.segment]=(acc[s.segment]||0)+1; return acc; },{})).map(([seg,n])=>(
            <span key={seg} style={{ padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:600,background:`${SEG_COLORS[seg]}15`,border:`1px solid ${SEG_COLORS[seg]}40`,color:SEG_COLORS[seg] }}>
              {n} {seg}
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead style={{ background:'var(--bg3)' }}>
            <tr>
              {[{k:'nom',l:'Étudiant'},{k:'classe',l:'Classe'},{k:'moyenne',l:'Moyenne'},{k:'nb_absences',l:'Absences'},{k:'nb_retards',l:'Retards'},{k:'score_risque',l:'Risque'},{k:'segment',l:'Profil'}].map(col=>(
                <th key={col.k} onClick={()=>toggleSort(col.k)}
                  style={{ padding:'10px 14px',textAlign:'left',color:'var(--text3)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,cursor:'pointer',userSelect:'none' }}>
                  {col.l} {sortBy===col.k?(sortAsc?'↑':'↓'):''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(8).fill(0).map((_,i)=><tr key={i}><td colSpan={7} style={{ padding:'10px 14px' }}><div className="skeleton" style={{ height:18 }}/></td></tr>)
              : sorted.map((s,i)=>(
                <tr key={i} onClick={()=>setSelectedId(s.etudiant_id)}
                  style={{ borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                      <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),var(--accent2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0 }}>
                        {s.prenom?.[0]}{s.nom?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight:600,fontSize:13 }}>{s.prenom} {s.nom}</div>
                        <div style={{ color:'var(--text3)',fontSize:10 }}>{s.etudiant_id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px',color:'var(--text2)',fontSize:12 }}>{s.classe}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontWeight:700,fontSize:14,color:s.moyenne>=10?'var(--success)':'var(--danger)' }}>{parseFloat(s.moyenne).toFixed(1)}</span>
                    <span style={{ color:'var(--text3)',fontSize:11 }}>/20</span>
                  </td>
                  <td style={{ padding:'10px 14px',color:s.nb_absences>10?'var(--danger)':'var(--text2)',fontSize:13,fontWeight:s.nb_absences>10?700:400 }}>{s.nb_absences||0}</td>
                  <td style={{ padding:'10px 14px',color:s.nb_retards>8?'var(--warning)':'var(--text2)',fontSize:13,fontWeight:s.nb_retards>8?700:400 }}>{s.nb_retards||0}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                      <div style={{ flex:1,height:4,background:'var(--border)',borderRadius:2,maxWidth:55,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${s.score_risque}%`,background:s.score_risque<30?'var(--success)':s.score_risque<60?'var(--warning)':'var(--danger)',borderRadius:2 }}/>
                      </div>
                      <span style={{ fontSize:11,color:'var(--text2)' }}>{Math.round(s.score_risque)}</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <span className={`badge badge-${s.segment}`}>{s.segment}</span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
