import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/lib/auth';

export function AppLayout() {
  const { user, loading, rolPendiente } = useAuth();

  if (loading) {
    return <div className="loading-screen"><span className="spinner" /></div>;
  }
  if (rolPendiente) {
    return (
      <div className="loading-screen">
        <div className="card" style={{ maxWidth: 420, padding: 28, textAlign: 'center' }}>
          <h2 className="page-title" style={{ marginBottom: 8 }}>Acceso pendiente</h2>
          <p className="muted">Tu cuenta está esperando autorización del administrador.</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
