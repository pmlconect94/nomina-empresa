import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { useAuth } from '@/lib/auth';
import { iniciales } from '@/lib/format';

type NavEntry = { label: string; icon: IconName; href: string; enabled: boolean; adminOnly?: boolean };

const NAV: NavEntry[] = [
  { label: 'Dashboard', icon: 'dashboard', href: '/app/dashboard', enabled: true },
  { label: 'Empleados', icon: 'users', href: '/app/empleados', enabled: true },
  { label: 'Nóminas', icon: 'file-text', href: '/app/nominas', enabled: true },
  { label: 'Préstamos', icon: 'coins', href: '/app/prestamos', enabled: true },
  { label: 'Vacaciones', icon: 'calendar-check', href: '/app/vacaciones', enabled: false },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, flexShrink: 0 }}>
          <img src="/logo.png" alt="PML" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>PML CONNECT</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Recursos Humanos</div>
        </div>
      </div>

      <div className="sidebar-section-label">Nómina</div>

      {NAV.map((n) => n.enabled ? (
        <NavLink key={n.href} to={n.href} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon name={n.icon} size={16} />
          {n.label}
        </NavLink>
      ) : (
        <button key={n.href} className="nav-item disabled" disabled title="Próximamente">
          <Icon name={n.icon} size={16} />
          <span>{n.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.7 }}>SOON</span>
        </button>
      ))}

      {user?.rol === 'admin' && (
        <>
          <div className="sidebar-section-label">Administración</div>
          <NavLink to="/app/usuarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon name="settings" size={16} />
            Usuarios
          </NavLink>
        </>
      )}

      <div className="spacer" />

      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
          {iniciales(user?.nombre)}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nombre}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user?.rol}</div>
        </div>
      </div>
    </aside>
  );
}
