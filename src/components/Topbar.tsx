import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { TopbarClock } from './TopbarClock';
import { useAuth } from '@/lib/auth';
import { useEmpresa, EMPRESAS, type EmpresaCode } from '@/lib/empresas';

export function Topbar() {
  const { user, signOut } = useAuth();
  const { code, setCode } = useEmpresa();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div className="hstack" style={{ gap: 10 }}>
        <span className="dot" style={{ background: 'var(--blue-500)' }} />
        <select
          value={code}
          onChange={(e) => { setCode(e.target.value as EmpresaCode); navigate('/app/nominas'); }}
          title="Empresa activa"
          style={{ fontSize: 13, fontWeight: 600, border: '1px solid var(--ink-200)', borderRadius: 6, padding: '4px 8px', background: 'white', cursor: 'pointer', color: 'var(--ink-900)' }}
        >
          {EMPRESAS.map((e) => <option key={e.code} value={e.code}>{e.nombre}</option>)}
        </select>
      </div>
      <div className="hstack" style={{ gap: 8 }}>
        <TopbarClock />
        <span className={`badge ${user?.rol === 'admin' ? 'badge-blue' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{user?.rol}</span>
        <button
          className="btn btn-ghost btn-sm"
          title={`Cerrar sesión — ${user?.email}`}
          onClick={async () => { await signOut(); navigate('/login'); }}
        >
          <Icon name="logout" size={14} /> Salir
        </button>
      </div>
    </div>
  );
}
