import { useState, useEffect } from 'react';
import { alertesAPI } from '../api';

const NIVEAU = {
  critical:{ label:'🚨 Critique',     bg:'rgba(240,82,82,0.08)',  border:'rgba(240,82,82,0.3)',  color:'var(--danger)',  badge:'tag-critical' },
  warning: { label:'⚠️ Avertissement', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.3)', color:'var(--warning)', badge:'tag-warning'  },
  info:    { label:'ℹ️ Information',   bg:'rgba(79,142,247,0.08)', border:'rgba(79,142,247,0.3)', color:'var(--accent)',  badge:'tag-info'     },
};
const TYPE_LABELS = {
  moyenne_critique:'Moyenne Critique', moyenne_faible:'Moyenne Insuffisante',
  absence_critique:'Absence Critique', absence_elevee:'Absence Élevée',
  retard_critique: 'Retards Critiques', retard_eleve:'Retards Fréquents',
};
const RECOS = {
  moyenne_critique: '→ Entretien individuel urgent + plan de remédiation immédiat.',
  moyenne_faible:   '→ Suivi personnalisé + séances de renforcement ciblées.',
  absence_critique: '→ Contacter la famille + signalement au service de scolarité.',
  absence_elevee:   '→ Rappel d\'assiduité + lettre d\'avertissement.',
  retard_critique:  '→ Rencontre avec le responsable pédagogique + plan d\'amélioration.',
  retard_eleve:     '→ Sensibilisation à la ponctualité + suivi hebdomadaire.',
};

function ConfigModal({ config, onSave, onClose }) {
  const [form, setForm] = useState({ ...config });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      await alertesAPI.updateConfig(form);
      setMsg('✅ Seuils mis à jour et alertes recalculées.');
      setTimeout(() => { onSave(); onClose(); }, 1200);
    } catch { setMsg('❌ Erreur lors de la sauvegarde.'); }
    finally { setSaving(false); }
  };

  const field = (key, label, min, max, step=1) => (
    <div>
      <label style={{ display:'block',color:'var(--text3)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>{label}</label>
      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
        <input type="range" min={min} max={max} step={step} value={form[key]}
          onChange={e => setForm({...form,[key]: step<1 ? parseFloat(e.target.value) : parseInt(e.target.value)})}
          style={{ flex:1,accentColor:'var(--accent)' }}/>
        <span style={{ fontWeight:800,fontSize:16,color:'var(--accent)',minWidth:36,textAlign:'right' }}>{form[key]}</span>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:28,width:520,maxWidth:'90vw' }} className="animate-in">
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22 }}>
          <h2 style={{ fontSize:17,fontWeight:800 }}>⚙️ Seuils d'Alerte Configurables</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text3)',fontSize:20,cursor:'pointer' }}>✕</button>
        </div>
        <p style={{ color:'var(--text3)',fontSize:12,marginBottom:20 }}>Définissez vos propres seuils. Les alertes seront recalculées automatiquement.</p>

        <div style={{ display:'flex',flexDirection:'column',gap:18 }}>
          <div style={{ background:'var(--bg3)',borderRadius:8,padding:'14px 16px' }}>
            <div style={{ fontWeight:700,fontSize:12,color:'var(--danger)',marginBottom:12 }}>📊 Seuils Moyenne /20</div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {field('seuil_moyenne_critique','Critique (rouge)',0,10,0.5)}
              {field('seuil_moyenne_faible',  'Faible (orange)', 0,15,0.5)}
            </div>
          </div>
          <div style={{ background:'var(--bg3)',borderRadius:8,padding:'14px 16px' }}>
            <div style={{ fontWeight:700,fontSize:12,color:'var(--warning)',marginBottom:12 }}>📅 Seuils Absences</div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {field('seuil_absences_critique','Critique (rouge)',0,30)}
              {field('seuil_absences_eleve',   'Élevé (orange)', 0,20)}
            </div>
          </div>
          <div style={{ background:'var(--bg3)',borderRadius:8,padding:'14px 16px' }}>
            <div style={{ fontWeight:700,fontSize:12,color:'var(--accent2)',marginBottom:12 }}>⏰ Seuils Retards</div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {field('seuil_retards_critique','Critique (rouge)',0,20)}
              {field('seuil_retards_eleve',   'Élevé (orange)', 0,15)}
            </div>
          </div>
        </div>

        {msg && <div style={{ marginTop:14,padding:'9px 12px',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,fontSize:12,color:'var(--success)' }}>{msg}</div>}

        <div style={{ display:'flex',gap:10,marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1,padding:'10px',background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',fontSize:13,cursor:'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2,padding:'10px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>
            {saving?'Sauvegarde...':'💾 Enregistrer et recalculer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Alertes({ onRefresh, userPerms }) {
  const [alertes,    setAlertes]    = useState([]);
  const [config,     setConfig]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const canWrite   = userPerms?.has('write');
  const canRefresh = userPerms?.has('write');

  const loadAlertes = (niv='') => {
    setLoading(true);
    alertesAPI.list(niv ? {niveau:niv} : {})
      .then(r => setAlertes(r.data)).finally(() => setLoading(false));
  };
  const loadConfig = () => alertesAPI.getConfig().then(r => setConfig(r.data)).catch(()=>{});

  useEffect(() => { loadAlertes(filter); loadConfig(); }, [filter]);

  const markLue = async id => {
    await alertesAPI.markLue(id);
    setAlertes(prev => prev.map(a => a.id===id ? {...a,lue:true} : a));
    onRefresh?.();
  };
  const markAll = async () => {
    for (const a of alertes.filter(a=>!a.lue)) await alertesAPI.markLue(a.id);
    setAlertes(prev => prev.map(a => ({...a,lue:true})));
    onRefresh?.();
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await alertesAPI.refresh();
    await loadAlertes(filter);
    setRefreshing(false);
    onRefresh?.();
  };

  const nonLues   = alertes.filter(a=>!a.lue).length;
  const critiques = alertes.filter(a=>a.niveau==='critical').length;
  const warnings  = alertes.filter(a=>a.niveau==='warning').length;

  return (
    <div style={{ padding:28 }}>
      {showConfig && config && (
        <ConfigModal config={config} onClose={()=>setShowConfig(false)} onSave={()=>{ loadAlertes(filter); loadConfig(); onRefresh?.(); }}/>
      )}

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800 }}>Alertes Pédagogiques</h1>
          <p style={{ color:'var(--text2)',marginTop:4,fontSize:13 }}>Détection automatique — {alertes.length} alerte(s) · seuils configurables</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          {nonLues>0 && <button onClick={markAll} style={{ padding:'9px 14px',background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',fontSize:12,cursor:'pointer' }}>Tout marquer lu</button>}
          <button onClick={()=>setShowConfig(true)} style={{ padding:'9px 14px',background:'var(--card2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:13,cursor:'pointer' }}>⚙️ Seuils</button>
          {canRefresh && (
            <button onClick={handleRefresh} disabled={refreshing} style={{ padding:'9px 16px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer' }}>
              {refreshing?'⟳ Analyse...':'🔄 Recalculer'}
            </button>
          )}
        </div>
      </div>

      {/* Seuils actuels */}
      {config && (
        <div style={{ display:'flex',gap:8,marginBottom:18,flexWrap:'wrap' }}>
          {[
            [`Moy. critique < ${config.seuil_moyenne_critique}`,'var(--danger)'],
            [`Moy. faible < ${config.seuil_moyenne_faible}`,'var(--warning)'],
            [`Abs. critique > ${config.seuil_absences_critique}`,'var(--danger)'],
            [`Abs. élevée > ${config.seuil_absences_eleve}`,'var(--warning)'],
            [`Retards critique > ${config.seuil_retards_critique}`,'var(--accent2)'],
            [`Retards élevés > ${config.seuil_retards_eleve}`,'var(--accent2)'],
          ].map(([txt,c],i)=>(
            <span key={i} style={{ padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:`${c}15`,color:c,border:`1px solid ${c}33` }}>{txt}</span>
          ))}
        </div>
      )}

      {/* KPI résumé */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22 }}>
        {[['Non lues',nonLues,'var(--accent)','📬'],['Critiques',critiques,'var(--danger)','🚨'],['Avertissements',warnings,'var(--warning)','⚠️']].map(([l,v,c,icon],i)=>(
          <div key={i} className="card" style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ fontSize:26 }}>{icon}</div>
            <div><div style={{ fontSize:28,fontWeight:800,color:c }}>{v}</div><div style={{ fontSize:12,color:'var(--text3)' }}>{l}</div></div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display:'flex',gap:8,marginBottom:18 }}>
        {[['','Toutes'],['critical','Critiques'],['warning','Avertissements']].map(([n,l])=>(
          <button key={n} onClick={()=>setFilter(n)} style={{ padding:'7px 14px',borderRadius:6,border:'1px solid',borderColor:filter===n?'var(--accent)':'var(--border)',background:filter===n?'rgba(79,142,247,0.15)':'var(--card)',color:filter===n?'var(--accent)':'var(--text2)',fontSize:12,cursor:'pointer' }}>{l}</button>
        ))}
      </div>

      {/* Liste */}
      {loading ? Array(5).fill(0).map((_,i)=><div key={i} className="skeleton" style={{ height:80,marginBottom:8,borderRadius:8 }}/>) :
       alertes.length===0 ? (
        <div style={{ textAlign:'center',padding:48,color:'var(--text2)' }}>
          <div style={{ fontSize:48,marginBottom:14 }}>✅</div>
          <h3>Aucune alerte active</h3>
          <p style={{ marginTop:8 }}>Tous les étudiants sont dans les seuils définis.</p>
        </div>
       ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {alertes.map((a,i) => {
            const cfg = NIVEAU[a.niveau] || NIVEAU.info;
            return (
              <div key={i} className="animate-in" style={{ background:a.lue?'var(--card)':cfg.bg, border:`1px solid ${a.lue?'var(--border)':cfg.border}`, borderRadius:10, padding:'13px 16px', display:'flex', alignItems:'flex-start', gap:14, opacity:a.lue?0.55:1, transition:'opacity 0.2s' }}>
                <div style={{ width:4,minHeight:50,borderRadius:2,background:a.lue?'var(--border)':cfg.color,flexShrink:0,marginTop:2 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700,fontSize:13 }}>{a.nom_complet}</span>
                    <span style={{ background:'var(--bg3)',padding:'2px 8px',borderRadius:4,fontSize:10,color:'var(--text3)' }}>{a.classe}</span>
                    <span className={`badge ${cfg.badge}`} style={{ fontSize:10 }}>{TYPE_LABELS[a.type_alerte]||a.type_alerte}</span>
                  </div>
                  <div style={{ color:'var(--text2)',fontSize:12,marginBottom:4 }}>{a.message}</div>
                  {!a.lue && RECOS[a.type_alerte] && (
                    <div style={{ fontSize:11,color:cfg.color,fontStyle:'italic' }}>{RECOS[a.type_alerte]}</div>
                  )}
                </div>
                <div style={{ textAlign:'right',flexShrink:0 }}>
                  <div style={{ fontSize:10,color:'var(--text3)',marginBottom:6 }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : ''}
                  </div>
                  {!a.lue && <button onClick={()=>markLue(a.id)} style={{ padding:'5px 12px',background:'var(--card2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text2)',fontSize:11,cursor:'pointer' }}>Marquer lu</button>}
                </div>
              </div>
            );
          })}
        </div>
       )}
    </div>
  );
}
