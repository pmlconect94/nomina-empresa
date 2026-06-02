import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { TopbarClock } from './TopbarClock';
import { useAuth } from '@/lib/auth';

export function Topbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div className="hstack" style={{ gap: 10 }}>
        <span className="dot" style={{ background: 'var(--blue-500)' }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Productos Marinos Lizárraga</span>
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
