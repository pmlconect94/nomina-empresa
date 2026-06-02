import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Icon } from '@/components/Icon';

export function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (!loading && user) return <Navigate to="/app/dashboard" replace />;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const m = error.message || '';
      if (m.includes('Invalid login credentials')) setError('Correo o contraseña incorrectos.');
      else setError(m);
      setBusy(false);
    }
    // onAuthStateChange en AuthProvider redirige al cargar el rol.
  }

  return (
    <div className="login-grid" style={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', background: 'var(--ink-50)' }}>
      <aside className="login-aside" style={{ display: 'none', flexDirection: 'column', justifyContent: 'space-between', padding: 48, background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-700) 60%, var(--navy-600) 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 20%, rgba(0,163,255,0.18), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(0,115,230,0.12), transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--blue-400)' }} />
            Grupo Lizárraga · Recursos Humanos
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
          <h2 style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.06, margin: 0, marginBottom: 18 }}>
            Nómina, empleados<br />y control de pagos<br /><span style={{ color: 'var(--cyan-500)' }}>en un solo lugar.</span>
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(255,255,255,0.7)', margin: 0, maxWidth: 420 }}>
            Captura de incidencias, cálculo de percepciones y deducciones, préstamos y dispersión del pago para Productos Marinos Lizárraga.
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>PML CONNECT · v3</div>
      </aside>

      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div className="login-card-enter" style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--navy-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, marginBottom: 20 }}>
              <img src="/logo.png" alt="PML" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--ink-900)' }}>Entrar a PML CONNECT</h1>
            <p style={{ fontSize: 14, color: 'var(--ink-500)', margin: 0 }}>Accede con tu cuenta corporativa.</p>
          </div>

          <form onSubmit={handleLogin} className="vstack" style={{ gap: 14 }}>
            <div>
              <label className="field-label">Correo electrónico</label>
              <input className="field-input" type="email" autoFocus value={email} placeholder="correo@empresa.com" onChange={(e) => { setEmail(e.target.value); setError(''); }} />
            </div>
            <div>
              <label className="field-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input className="field-input" type={showPass ? 'text' : 'password'} value={password} placeholder="••••••••" style={{ paddingRight: 70 }} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
                <button type="button" onClick={() => setShowPass((p) => !p)} className="btn btn-ghost btn-sm" style={{ position: 'absolute', right: 4, top: 4 }}>{showPass ? 'Ocultar' : 'Ver'}</button>
              </div>
            </div>
            {error && <div className="badge badge-red" style={{ padding: '8px 12px', borderRadius: 'var(--r-md)' }}>{error}</div>}
            <button className="btn btn-primary btn-lg" type="submit" disabled={busy || !email || !password} style={{ width: '100%', marginTop: 4 }}>
              {busy ? <span className="spinner" /> : <><Icon name="arrow-right" size={14} /> Iniciar sesión</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
