import { useState, useEffect } from 'react';
import { usersAPI } from '../api';

const ROLES = ['admin','responsable','formateur','viewer'];
const ROLE_COLORS = { admin:'#4f8ef7', responsable:'#10b981', formateur:'#f59e0b', viewer:'#7b6ff0' };
const ROLE_ICONS  = { admin:'👑', responsable:'📋', formateur:'🖊️', viewer:'👁️' };
const PERMS_DESC  = {
  admin:       ['read','write','delete','import','manage_users'],
  responsable: ['read','write','import'],
  formateur:   ['read','import'],
  viewer:      ['read'],
};

export default function Users() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ username:'', email:'', password:'', role:'viewer' });
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  const load = () => { setLoading(true); usersAPI.list().then(r=>setUsers(r.data)).finally(()=>setLoading(false)); };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.username||!form.email||!form.password) return;
    setSaving(true);
    try { await usersAPI.create(form); setShowForm(false); setForm({username:'',email:'',password:'',role:'viewer'}); setMsg({type:'success',text:'Utilisateur créé avec succès'}); load(); }
    catch(e) { setMsg({type:'error',text:e.response?.data?.detail||'Erreur'}); }
    finally { setSaving(false); }
  };

  const handleRoleChange = async (id, role) => {
    try { await usersAPI.updateRole(id, role); load(); setMsg({type:'success',text:'Rôle mis à jour'}); }
    catch(e) { setMsg({type:'error',text:e.response?.data?.detail||'Erreur'}); }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
    try { await usersAPI.delete(id); load(); setMsg({type:'success',text:'Utilisateur supprimé'}); }
    catch(e) { setMsg({type:'error',text:e.response?.data?.detail||'Erreur'}); }
  };

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Gestion des Utilisateurs</h1>
          <p style={{ color:'var(--text2)', marginTop:4, fontSize:13 }}>Administration des accès — fonctionnalité réservée aux administrateurs</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)} style={{ padding:'10px 18px', background:'linear-gradient(135deg,var(--accent),var(--accent2))', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700 }}>
          {showForm?'✕ Annuler':'+ Nouvel utilisateur'}
        </button>
      </div>

      {msg && <div style={{ marginBottom:16, padding:'11px 14px', background:msg.type==='success'?'rgba(16,185,129,0.1)':'rgba(240,82,82,0.1)', border:`1px solid ${msg.type==='success'?'rgba(16,185,129,0.3)':'rgba(240,82,82,0.3)'}`, borderRadius:8, color:msg.type==='success'?'var(--success)':'var(--danger)', fontSize:13, display:'flex', justifyContent:'space-between' }}>
        {msg.text} <button onClick={()=>setMsg(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
      </div>}

      {/* Rôles legend */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {ROLES.map(role=>(
          <div key={role} className="card" style={{ borderTop:`2px solid ${ROLE_COLORS[role]}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:18 }}>{ROLE_ICONS[role]}</span>
              <span style={{ fontWeight:700, fontSize:13, color:ROLE_COLORS[role], textTransform:'capitalize' }}>{role}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {PERMS_DESC[role].map(p=>(
                <div key={p} style={{ fontSize:11, color:'var(--text2)', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ color:'var(--success)', fontSize:10 }}>✓</span>{p}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-in" style={{ marginBottom:20, borderTop:'2px solid var(--accent)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Créer un nouvel utilisateur</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:14 }}>
            {[['username','Identifiant','ex: jean.dupont'],['email','Email','ex: jean@campus.ma'],['password','Mot de passe','min. 6 caractères']].map(([key,lbl,ph])=>(
              <div key={key}>
                <label style={{ display:'block', color:'var(--text3)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{lbl}</label>
                <input type={key==='password'?'password':'text'} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                  style={{ width:'100%', padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none' }} />
              </div>
            ))}
            <div>
              <label style={{ display:'block', color:'var(--text3)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Rôle</label>
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}
                style={{ width:'100%', padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none' }}>
                {ROLES.map(r=><option key={r} value={r}>{ROLE_ICONS[r]} {r}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving} style={{ padding:'10px 20px', background:'linear-gradient(135deg,var(--success),#059669)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700 }}>
            {saving?'Création...':'✓ Créer l\'utilisateur'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead style={{ background:'var(--bg3)' }}>
            <tr>{['Utilisateur','Email','Rôle','Permissions','Actions'].map(h=>(
              <th key={h} style={{ padding:'11px 16px', textAlign:'left', color:'var(--text3)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? Array(3).fill(0).map((_,i)=><tr key={i}><td colSpan={5} style={{ padding:'12px 16px' }}><div className="skeleton" style={{ height:20 }} /></td></tr>)
            : users.map((u,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:`${ROLE_COLORS[u.role]}22`, border:`1.5px solid ${ROLE_COLORS[u.role]}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{ROLE_ICONS[u.role]}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{u.username}</div>
                      <div style={{ fontSize:10, color:'var(--text3)' }}>ID #{u.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'12px 16px', color:'var(--text2)', fontSize:12 }}>{u.email}</td>
                <td style={{ padding:'12px 16px' }}>
                  {u.username==='admin' ? (
                    <span style={{ background:`${ROLE_COLORS[u.role]}22`, color:ROLE_COLORS[u.role], padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:600 }}>{ROLE_ICONS[u.role]} {u.role}</span>
                  ) : (
                    <select value={u.role} onChange={e=>handleRoleChange(u.id,e.target.value)}
                      style={{ padding:'5px 10px', background:'var(--bg3)', border:`1px solid ${ROLE_COLORS[u.role]}55`, borderRadius:6, color:ROLE_COLORS[u.role], fontSize:12, fontWeight:600, outline:'none', cursor:'pointer' }}>
                      {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {(u.permissions||[]).map(p=>(
                      <span key={p} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:4, padding:'2px 7px', fontSize:10, color:'var(--text2)' }}>{p}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding:'12px 16px' }}>
                  {u.username!=='admin' && (
                    <button onClick={()=>handleDelete(u.id,u.username)} style={{ padding:'5px 12px', background:'rgba(240,82,82,0.1)', border:'1px solid rgba(240,82,82,0.3)', borderRadius:6, color:'var(--danger)', fontSize:12 }}>
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
