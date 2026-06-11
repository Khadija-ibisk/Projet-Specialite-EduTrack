import { useState } from 'react';
import { authAPI } from '../api';

const ACCOUNTS = [
  { user: 'admin',     pass: 'admin123',  role: 'Admin',     color: '#4f8ef7', icon: '👑', desc: 'Lecture, écriture, suppression, gestion utilisateurs' },
  { user: 'formateur', pass: 'form123',   role: 'Formateur', color: '#10b981', icon: '📋', desc: 'Lecture + import de fichiers' },
  { user: 'viewer',    pass: 'viewer123', role: 'Viewer',    color: '#7b6ff0', icon: '👁️', desc: 'Lecture seule — visualisation uniquement' },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (u, p) => {
    setLoading(true); setError('');
    try {
      const res = await authAPI.login(u || username, p || password);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify({ username: res.data.username, role: res.data.role, permissions: res.data.permissions }));
      onLogin(res.data);
    } catch { setError('Identifiants incorrects'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', backgroundImage:'radial-gradient(ellipse at 20% 50%, rgba(79,142,247,0.08) 0%, transparent 60%)' }}>
      <div style={{ width: 460 }} className="animate-in">
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:64, height:64, background:'linear-gradient(135deg,var(--accent),var(--accent2))', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:28 }}>📊</div>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:28, fontWeight:800 }}>EduTrack <span style={{ color:'var(--accent)' }}>Analytics</span></h1>
          <p style={{ color:'var(--text2)', marginTop:6, fontSize:13 }}>MAROC YNOV CAMPUS — Plateforme Académique</p>
        </div>

        <div className="card" style={{ padding:28, marginBottom:16 }}>
          <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Connexion</h2>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', color:'var(--text3)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Identifiant</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin / viewer / formateur"
              style={{ width:'100%', padding:'11px 13px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14, outline:'none' }}
              onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border)'}
              onKeyDown={e=>e.key==='Enter'&&submit()} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', color:'var(--text3)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Mot de passe</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
              style={{ width:'100%', padding:'11px 13px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14, outline:'none' }}
              onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border)'}
              onKeyDown={e=>e.key==='Enter'&&submit()} />
          </div>
          {error && <div style={{ background:'rgba(240,82,82,0.1)', border:'1px solid rgba(240,82,82,0.3)', borderRadius:8, padding:'9px 12px', color:'var(--danger)', fontSize:12, marginBottom:14 }}>{error}</div>}
          <button onClick={()=>submit()} disabled={loading} style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,var(--accent),var(--accent2))', border:'none', borderRadius:8, color:'#fff', fontSize:14, fontWeight:700, fontFamily:'var(--font-head)' }}>
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginBottom:2 }}>Connexion rapide — comptes de démonstration</div>
          {ACCOUNTS.map(a => (
            <button key={a.user} onClick={()=>submit(a.user,a.pass)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:'var(--card)', border:`1px solid ${a.color}33`, borderRadius:10, cursor:'pointer', textAlign:'left', width:'100%', transition:'all 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=a.color}
              onMouseLeave={e=>e.currentTarget.style.borderColor=`${a.color}33`}>
              <span style={{ fontSize:20 }}>{a.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{a.user}</span>
                  <span style={{ background:`${a.color}22`, color:a.color, padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:600 }}>{a.role}</span>
                </div>
                <div style={{ color:'var(--text3)', fontSize:11, marginTop:2 }}>{a.desc}</div>
              </div>
              <span style={{ color:'var(--text3)', fontSize:16 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
