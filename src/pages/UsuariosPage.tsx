import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import { PageEnter } from '@/components/motion';

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Acceso total, incluida gestión de usuarios.' },
  { value: 'editor', label: 'Editor', desc: 'Captura y edita nóminas, viajes y asistencias.' },
  { value: 'viewer', label: 'Viewer', desc: 'Solo lectura.' },
];

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [modal, setModal] = useState<null | 'crear' | 'password'>(null);
  const [target, setTarget] = useState<any>(null);
  const [form, setForm] = useState<any>({ nombre: '', email: '', password: '', rol: 'editor' });
  const [newPass, setNewPass] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch(); }, []);
  async function fetch() { const { data } = await supabase.from('usuarios_roles').select('*').order('created_at'); setUsuarios(data || []); }

  async function adminAction(body: any) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await window.fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function cambiarRol(id: string, rol: string) { const { error } = await supabase.from('usuarios_roles').update({ rol }).eq('id', id); if (error) toast.error(error.message); else fetch(); }
  async function toggleActivo(u: any) { const { error } = await supabase.from('usuarios_roles').update({ activo: !u.activo }).eq('id', u.id); if (error) toast.error(error.message); else fetch(); }

  async function crear() {
    if (!form.nombre || !form.email || form.password.length < 6) { toast.error('Completa los campos (contraseña mín. 6)'); return; }
    setBusy(true);
    const r = await adminAction({ action: 'create', email: form.email.trim(), password: form.password });
    if (r.error) { toast.error(r.error); setBusy(false); return; }
    const { error } = await supabase.from('usuarios_roles').insert({ user_id: r.user.id, email: form.email.trim(), nombre: form.nombre.trim(), rol: form.rol, activo: true });
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success('Usuario creado'); cerrar(); fetch(); setBusy(false);
  }
  async function cambiarPass() {
    if (newPass.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setBusy(true);
    const r = await adminAction({ action: 'update-password', userId: target.user_id, password: newPass });
    if (r.error) { toast.error(r.error); setBusy(false); return; }
    toast.success('Contraseña actualizada'); cerrar(); setBusy(false);
  }
  async function eliminar(u: any) {
    if (!confirm(`¿Eliminar a "${u.nombre || u.email}"?`)) return;
    await adminAction({ action: 'delete', userId: u.user_id });
    await supabase.from('usuarios_roles').delete().eq('id', u.id); fetch();
  }
  function cerrar() { setModal(null); setForm({ nombre: '', email: '', password: '', rol: 'editor' }); setNewPass(''); setTarget(null); }

  return (
    <PageEnter>
      <div className="page-header">
        <div><h1 className="page-title">Usuarios</h1><p className="page-subtitle">Administra el acceso al sistema</p></div>
        <button className="btn btn-primary" onClick={() => setModal('crear')}><Icon name="user-plus" size={15} /> Crear usuario</button>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={!u.activo ? 'row-inactive' : ''}>
                <td className="fw-600">{u.nombre || '—'}</td>
                <td className="muted">{u.email}</td>
                <td><select className="field-input" style={{ width: 130, padding: '6px 8px' }} value={u.rol || 'viewer'} onChange={(e) => cambiarRol(u.id, e.target.value)}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></td>
                <td><span className={`badge ${u.activo ? 'badge-green' : 'badge-gray'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div className="hstack" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setTarget(u); setModal('password'); }}>Contraseña</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => eliminar(u)}><Icon name="trash" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan={5}><div className="empty"><div className="empty-title">Sin usuarios</div></div></td></tr>}
          </tbody>
        </table>
      </div>

      {modal === 'crear' && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && cerrar()}>
          <div className="modal page-enter" style={{ maxWidth: 480 }}>
            <div className="modal-header"><h3 className="modal-title">Nuevo usuario</h3><button className="btn btn-ghost btn-sm" onClick={cerrar}><Icon name="x" size={16} /></button></div>
            <div className="modal-body vstack" style={{ gap: 14 }}>
              <div><label className="field-label">Nombre completo</label><input className="field-input" value={form.nombre} onChange={(e) => setForm((f: any) => ({ ...f, nombre: e.target.value }))} /></div>
              <div><label className="field-label">Correo</label><input className="field-input" type="email" value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="field-label">Contraseña inicial</label><input className="field-input" type="text" value={form.password} placeholder="Mín. 6 caracteres" onChange={(e) => setForm((f: any) => ({ ...f, password: e.target.value }))} /></div>
              <div><label className="field-label">Rol</label><select className="field-input" value={form.rol} onChange={(e) => setForm((f: any) => ({ ...f, rol: e.target.value }))}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}</select></div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={cerrar}>Cancelar</button><button className="btn btn-primary" onClick={crear} disabled={busy}>{busy ? 'Creando…' : 'Crear'}</button></div>
          </div>
        </div>
      )}

      {modal === 'password' && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && cerrar()}>
          <div className="modal page-enter" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h3 className="modal-title">Cambiar contraseña</h3><button className="btn btn-ghost btn-sm" onClick={cerrar}><Icon name="x" size={16} /></button></div>
            <div className="modal-body">
              <p className="text-sm muted" style={{ marginTop: 0 }}>Usuario: <strong>{target?.nombre || target?.email}</strong></p>
              <label className="field-label">Nueva contraseña</label>
              <input className="field-input" type="text" value={newPass} autoFocus placeholder="Mín. 6 caracteres" onChange={(e) => setNewPass(e.target.value)} />
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={cerrar}>Cancelar</button><button className="btn btn-primary" onClick={cambiarPass} disabled={busy}>{busy ? 'Guardando…' : 'Cambiar'}</button></div>
          </div>
        </div>
      )}
    </PageEnter>
  );
}
