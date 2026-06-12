import { useState, useEffect, useRef } from 'react';
import { importAPI } from '../api';

const TYPES = [
  { id:'etudiants', label:'Étudiants', icon:'🎓', color:'var(--accent)',
    desc:'etudiant_id*, prenom*, nom*, classe*, [email, date_inscription]' },
  { id:'notes', label:'Notes', icon:'📝', color:'var(--accent3)',
    desc:'etudiant_id*, module*, note*, [semestre, coefficient]' },
  { id:'absences', label:'Absences', icon:'📅', color:'var(--accent2)',
    desc:'etudiant_id*, module*, date*, [justifiee]' },
  { id:'retards', label:'Retards', icon:'⏰', color:'var(--warning)',
    desc:'etudiant_id*, module*, date*, [minutes]' },
];

function DropZone({ type, onDone }) {
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const ref = useRef();

  const handle = async (file) => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await importAPI.upload(type.id, file);
      setResult(res.data);
      if (onDone) onDone();
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(typeof d === 'object' ? (d.issues || []).join(' | ') : (d || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ borderColor: drag ? type.color : 'var(--border)', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{type.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{type.label}</div>
          <div style={{ color: 'var(--text3)', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{type.desc}</div>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        onClick={() => ref.current?.click()}
        style={{
          border: `2px dashed ${drag ? type.color : 'var(--border2)'}`,
          borderRadius: 8, padding: '22px 16px', textAlign: 'center',
          cursor: 'pointer', background: drag ? `${type.color}11` : 'var(--bg3)', transition: 'all 0.2s'
        }}
      >
        <input ref={ref} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
          onChange={(e) => handle(e.target.files[0])} />
        {loading ? (
          <div style={{ color: 'var(--text2)' }}>
            <div style={{ fontSize: 22, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</div>
            <div style={{ marginTop: 6, fontSize: 12 }}>Traitement en cours...</div>
          </div>
        ) : (
          <div style={{ color: 'var(--text2)' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📤</div>
            <div style={{ fontSize: 12 }}>Glissez ou <span style={{ color: type.color, fontWeight: 600 }}>cliquez ici</span></div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>CSV ou Excel (.xlsx/.xls)</div>
          </div>
        )}
      </div>

      {result && (
        <div style={{ marginTop: 10, padding: '11px 13px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }}>
          <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
            ✅ {result.nb_lignes?.toLocaleString()} lignes importées avec succès
          </div>
          {result.clean_stats?.doublons_supprimes > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>🗑️ {result.clean_stats.doublons_supprimes} doublons supprimés</div>
          )}
          {result.clean_stats?.notes_imputees > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>🔧 {result.clean_stats.notes_imputees} valeurs imputées</div>
          )}
          {(result.warnings || []).slice(0, 2).map((w, i) => (
            <div key={i} style={{ color: 'var(--warning)', fontSize: 11 }}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, padding: '11px 13px', background: 'rgba(240,82,82,0.1)', border: '1px solid rgba(240,82,82,0.3)', borderRadius: 8 }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>❌ Erreur d'import</div>
          <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 3 }}>{error}</div>
        </div>
      )}
    </div>
  );
}

export default function Import() {
  const [history, setHistory] = useState([]);

  function load() {
    importAPI.history()
      .then(function(r) { setHistory(r.data); })
      .catch(function() {});
  }

  useEffect(function() {
    load();
  }, []);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Importation des Données</h1>
        <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: 13 }}>
          Pipeline : Lecture → Validation → Nettoyage → Transformation → Stockage → Alertes
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 0 }}>
        {['📥 Lecture', '✅ Validation', '🧹 Nettoyage', '🔄 Transformation', '💾 Stockage', '🔔 Alertes auto'].map((s, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 11px', fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{s}</div>
            {i < arr.length - 1 && <div style={{ width: 18, height: 1.5, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', opacity: 0.5 }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {TYPES.map(function(t) { return <DropZone key={t.id} type={t} onDone={load} />; })}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📋 Guide des Formats de Fichiers</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { t: 'Étudiants', c: TYPES[0].color, cols: [['etudiant_id','ID unique (ETU0001)',true],['prenom','Prénom',true],['nom','Nom',true],['classe','Promotion',true],['email','Adresse email',false],['date_inscription','YYYY-MM-DD',false]] },
            { t: 'Notes',     c: TYPES[1].color, cols: [['etudiant_id','Référence',true],['module','Nom module',true],['note','0 à 20',true],['semestre','S1/S2/S3',false],['coefficient','Poids',false]] },
            { t: 'Absences',  c: TYPES[2].color, cols: [['etudiant_id','Référence',true],['module','Module',true],['date','YYYY-MM-DD',true],['justifiee','true/false',false]] },
            { t: 'Retards',   c: TYPES[3].color, cols: [['etudiant_id','Référence',true],['module','Module',true],['date','YYYY-MM-DD',true],['minutes','Durée (min)',false]] },
          ].map(function(item, i) {
            return (
              <div key={i} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 13px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: item.c, marginBottom: 8 }}>{item.t}</div>
                {item.cols.map(function([k, d, req], j) {
                  return (
                    <div key={j} style={{ marginBottom: 4 }}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <code style={{ fontSize: 10, color: req ? 'var(--text)' : 'var(--text3)', fontWeight: req ? 700 : 400 }}>{k}</code>
                        {req && <span style={{ fontSize: 9, color: 'var(--danger)', fontWeight: 700 }}>*</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{d}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text3)' }}>* Obligatoire.</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>Historique des Imports</div>
        {history.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Aucun import enregistré</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg3)' }}>
              <tr>
                {['Fichier', 'Type', 'Lignes', 'Statut', 'Date', 'Message'].map(function(h) {
                  return <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--text3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {history.map(function(h, i) {
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 14px', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.filename}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text2)', fontSize: 12 }}>{h.import_type}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600 }}>{h.nb_lignes?.toLocaleString()}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: h.statut === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(240,82,82,0.15)', color: h.statut === 'success' ? 'var(--success)' : 'var(--danger)' }}>{h.statut}</span>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{h.created_at ? new Date(h.created_at).toLocaleString('fr-FR') : ''}</td>
                    <td style={{ padding: '9px 14px', fontSize: 10, color: 'var(--text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}