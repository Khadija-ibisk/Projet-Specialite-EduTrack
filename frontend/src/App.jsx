import { useState, useEffect } from 'react';
import './index.css';
import Login    from './pages/Login';
import Sidebar  from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Etudiants from './pages/Etudiants';
import Modules   from './pages/Modules';
import Alertes   from './pages/Alertes';
import Import    from './pages/Import';
import MLPage    from './pages/ML';
import Users     from './pages/Users';
import { alertesAPI } from './api';

export default function App() {
  const [user,       setUser]       = useState(() => { const s=localStorage.getItem('user'); return s?JSON.parse(s):null; });
  const [activePage, setActivePage] = useState('dashboard');
  const [nbAlertes,  setNbAlertes]  = useState(0);

  const fetchAlertes = () => alertesAPI.list().then(r=>setNbAlertes(r.data.filter(a=>!a.lue).length)).catch(()=>{});

  useEffect(() => { if (user) fetchAlertes(); }, [user]);

  const handleLogin  = data => { const u={username:data.username,role:data.role,permissions:data.permissions}; localStorage.setItem('user',JSON.stringify(u)); setUser(u); };
  const handleLogout = ()   => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };

  if (!user || !localStorage.getItem('token')) return <Login onLogin={handleLogin}/>;

  const perms = new Set(user.permissions||[]);

  const pages = {
    dashboard: <Dashboard userPerms={perms}/>,
    etudiants: <Etudiants userPerms={perms}/>,
    modules:   <Modules/>,
    alertes:   <Alertes   onRefresh={fetchAlertes} userPerms={perms}/>,
    import:    perms.has('import')       ? <Import/> : null,
    ml:        <MLPage/>,
    users:     perms.has('manage_users') ? <Users/>  : null,
  };

  return (
    <div style={{ display:'flex',minHeight:'100vh' }}>
      <Sidebar active={activePage} setActive={setActivePage} user={user} onLogout={handleLogout} nbAlertes={nbAlertes}/>
      <main style={{ flex:1,marginLeft:240,minHeight:'100vh',background:'var(--bg)',overflowY:'auto' }}>
        {pages[activePage] ?? (
          <div style={{ padding:48,textAlign:'center',color:'var(--text2)' }}>
            <div style={{ fontSize:48,marginBottom:14 }}>🔒</div>
            <h3>Accès restreint</h3>
            <p style={{ marginTop:8 }}>Votre rôle ({user.role}) ne donne pas accès à cette section.</p>
          </div>
        )}
      </main>
    </div>
  );
}
