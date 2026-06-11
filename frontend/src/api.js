import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/';
  }
  return Promise.reject(err);
});

export const authAPI = {
  login: (u, p) => { const f = new FormData(); f.append('username',u); f.append('password',p); return api.post('/auth/login',f); },
  me: () => api.get('/auth/me'),
};
export const dashboardAPI = {
  kpis:        () => api.get('/dashboard/kpis'),
  correlations:() => api.get('/dashboard/correlations'),
  progression: () => api.get('/dashboard/progression'),
  globalStats: () => api.get('/stats/global'),
};
export const etudiantsAPI = {
  list:    params => api.get('/etudiants', { params }),
  get:     id     => api.get(`/etudiants/${id}`),
  delete:  id     => api.delete(`/etudiants/${id}`),
  classes: ()     => api.get('/classes'),
};
export const modulesAPI  = { analysis: () => api.get('/modules/analysis') };
export const alertesAPI  = {
  list:    params => api.get('/alertes', { params }),
  markLue: id     => api.patch(`/alertes/${id}/lue`),
  refresh: ()     => api.post('/alertes/refresh'),
  getConfig:()    => api.get('/alertes/config'),
  updateConfig: data => api.put('/alertes/config', data),
};
export const importAPI   = {
  upload:  (type, file) => { const f = new FormData(); f.append('file', file); return api.post(`/import/${type}`, f); },
  history: ()           => api.get('/import/history'),
};
export const mlAPI       = {
  riskModel:  ()  => api.get('/ml/risk-model'),
  clustering: n   => api.get('/ml/clustering', { params: { n_clusters: n } }),
};
export const rapportAPI  = {
  downloadPDF: async () => {
    const res = await api.get('/rapport/pdf', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type:'application/pdf' }));
    const a   = document.createElement('a');
    a.href = url; a.download = `EduTrack_Rapport_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click(); window.URL.revokeObjectURL(url);
  }
};
export const usersAPI = {
  list:       ()         => api.get('/users'),
  create:     data       => { const f=new FormData(); Object.entries(data).forEach(([k,v])=>f.append(k,v)); return api.post('/users',f); },
  updateRole: (id, role) => { const f=new FormData(); f.append('role',role); return api.patch(`/users/${id}/role`,f); },
  delete:     id         => api.delete(`/users/${id}`),
};
export default api;
