import { useState } from 'react';

const NAV_ITEMS = [
  { id:'dashboard', label:'Tableau de Bord', icon:'📊', perm:'read' },
  { id:'etudiants', label:'Étudiants',       icon:'🎓', perm:'read' },
  { id:'modules',   label:'Modules',         icon:'📚', perm:'read' },
  { id:'alertes',   label:'Alertes',         icon:'🔔', perm:'read' },
  { id:'import',    label:'Importation',     icon:'📥', perm:'import' },
  { id:'ml',        label:'Intelligence IA', icon:'🤖', perm:'read' },
  { id:'users',     label:'Utilisateurs',    icon:'👥', perm:'manage_users' },
];

const ROLE_COLORS = { admin:'#4f8ef7', responsable:'#10b981', formateur:'#f59e0b', viewer:'#7b6ff0' };
const ROLE_ICONS  = { admin:'👑', responsable:'📋', formateur:'🖊️', viewer:'👁️' };

export default function Sidebar({ active, setActive, user, onLogout, nbAlertes }) {
  const [collapsed, setCollapsed] = useState(false);
  const perms = new Set(user?.permissions || []);

  return (
    <aside style={{ width:collapsed?64:240, minHeight:'100vh', background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', transition:'width 0.25s ease', position:'fixed', left:0, top:0, bottom:0, zIndex:100 }}>
      {/* Logo */}
      <div style={{ padding:collapsed?'18px 12px':'18px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, flexShrink:0, background:'linear-gradient(135deg,var(--accent),var(--accent2))', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📊</div>
        {!collapsed && <div><div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:14, lineHeight:1 }}>EduTrack</div><div style={{ color:'var(--text3)', fontSize:9, marginTop:2 }}>Analytics Platform</div></div>}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 8px' }}>
        {NAV_ITEMS.filter(item => perms.has(item.perm)).map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={()=>setActive(item.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:collapsed?0:9, justifyContent:collapsed?'center':'flex-start', padding:collapsed?'10px':'9px 11px', borderRadius:8, border:'none', background:isActive?'rgba(79,142,247,0.15)':'transparent', color:isActive?'var(--accent)':'var(--text2)', marginBottom:2, cursor:'pointer', fontWeight:isActive?600:400, position:'relative', transition:'all 0.15s', fontSize:13 }}
              onMouseEnter={e=>!isActive&&(e.currentTarget.style.background='var(--bg3)')}
              onMouseLeave={e=>!isActive&&(e.currentTarget.style.background='transparent')}>
              <span style={{ fontSize:17 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {item.id==='alertes' && nbAlertes>0 && (
                <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'var(--danger)', color:'#fff', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 6px' }}>{nbAlertes>99?'99+':nbAlertes}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role badge */}
      {!collapsed && (
        <div style={{ margin:'0 10px 10px', padding:'10px 12px', background:'var(--bg3)', borderRadius:8, border:`1px solid ${ROLE_COLORS[user?.role]||'var(--border)'}33` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>{ROLE_ICONS[user?.role]||'👤'}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:12 }}>{user?.username}</div>
              <div style={{ fontSize:10, color:ROLE_COLORS[user?.role]||'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{user?.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div style={{ padding:collapsed?'10px 8px':'10px 10px', borderTop:'1px solid var(--border)' }}>
        <button onClick={onLogout} style={{ width:'100%', padding:collapsed?'8px':'8px 12px', background:'rgba(240,82,82,0.1)', border:'1px solid rgba(240,82,82,0.2)', borderRadius:8, color:'var(--danger)', fontSize:12, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <span>🚪</span>{!collapsed&&'Déconnexion'}
        </button>
      </div>

      {/* Toggle */}
      <button onClick={()=>setCollapsed(!collapsed)} style={{ position:'absolute', right:-12, top:22, width:24, height:24, borderRadius:'50%', background:'var(--card2)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {collapsed?'›':'‹'}
      </button>
    </aside>
  );
}
