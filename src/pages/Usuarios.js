import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ROLES = [
  { value: 'admin',  label: 'Admin',  desc: 'Acceso total: nóminas, viajes, préstamos y usuarios.' },
  { value: 'editor', label: 'Editor', desc: 'Captura y edita nóminas abiertas, viajes y asistencias.' },
  { value: 'viewer', label: 'Viewer', desc: 'Solo lectura. No puede editar nada.' },
]

export default function Usuarios() {
  const [usuarios, setUsuarios]   = useState([])
  const [modal, setModal]         = useState(null) // 'crear' | 'password'
  const [targetUser, setTargetUser] = useState(null)
  const [form, setForm]           = useState({ nombre: '', email: '', password: '', rol: 'editor' })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [showPass, setShowPass]   = useState(false)

  useEffect(() => { fetchUsuarios() }, [])

  async function fetchUsuarios() {
    const { data } = await supabase.from('usuarios_roles').select('*').order('created_at')
    setUsuarios(data || [])
  }

  async function cambiarRol(id, rol) {
    const { error } = await supabase.from('usuarios_roles').update({ rol }).eq('id', id)
    if (error) { alert('Error al cambiar rol: ' + error.message); return }
    fetchUsuarios()
  }

  async function toggleActivo(u) {
    const { error } = await supabase.from('usuarios_roles').update({ activo: !u.activo }).eq('id', u.id)
    if (error) { alert('Error al cambiar estado: ' + error.message); return }
    fetchUsuarios()
  }

  async function adminAction(body) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/admin-users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    )
    return res.json()
  }

  async function crearUsuario() {
    if (!form.nombre || !form.email || !form.password) return
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true); setError('')

    const result = await adminAction({ action: 'create', email: form.email.trim(), password: form.password })
    if (result.error) { setError(result.error); setSaving(false); return }

    const { error: dbError } = await supabase.from('usuarios_roles').insert({
      user_id: result.user.id,
      email:   form.email.trim(),
      nombre:  form.nombre.trim(),
      rol:     form.rol,
      activo:  true,
    })
    if (dbError) { setError(dbError.message); setSaving(false); return }

    cerrarModal()
    fetchUsuarios()
    setSaving(false)
  }

  async function cambiarPassword() {
    if (!newPassword || newPassword.length < 6) { setError('Mínimo 6 caracteres'); return }
    setSaving(true); setError('')
    const result = await adminAction({ action: 'update-password', userId: targetUser.user_id, password: newPassword })
    if (result.error) { setError(result.error); setSaving(false); return }
    cerrarModal()
    setSaving(false)
  }

  async function eliminarUsuario(u) {
    if (!window.confirm(`¿Eliminar al usuario "${u.nombre || u.email}"?\nEsta acción no puede deshacerse.`)) return
    await adminAction({ action: 'delete', userId: u.user_id })
    await supabase.from('usuarios_roles').delete().eq('id', u.id)
    fetchUsuarios()
  }

  function abrirModalPassword(u) {
    setTargetUser(u); setNewPassword(''); setError(''); setShowPass(false)
    setModal('password')
  }

  function cerrarModal() {
    setModal(null); setError('')
    setForm({ nombre: '', email: '', password: '', rol: 'editor' })
    setNewPassword(''); setTargetUser(null); setShowPass(false)
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="usuarios-page">
      <div className="lista-header">
        <div>
          <h2>Gestión de usuarios</h2>
          <p className="subtitle">Administra el acceso al sistema de nómina</p>
        </div>
        <button className="btn-primary" onClick={() => { setError(''); setShowPass(false); setModal('crear') }}>
          + Crear usuario
        </button>
      </div>

      <div className="tabla-card">
        <table className="tabla-empleados">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className={!u.activo ? 'row-inactivo' : ''}>
                <td><div className="td-nombre">{u.nombre || '—'}</div></td>
                <td className="text-secondary">{u.email}</td>
                <td>
                  <select className="sel-rol" value={u.rol || 'viewer'} onChange={e => cambiarRol(u.id, e.target.value)}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td>
                  <span className={`badge-status ${u.activo ? 'abierta' : 'timbrada'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="acciones">
                  <button className="btn-edit"   onClick={() => abrirModalPassword(u)}>Contraseña</button>
                  <button className="btn-toggle" onClick={() => toggleActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                  <button className="btn-del"    onClick={() => eliminarUsuario(u)} title="Eliminar usuario">✕</button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr><td colSpan="5" className="empty-cell">Sin usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas descriptivas de roles */}
      <div className="roles-grid" style={{ marginTop: '1.5rem' }}>
        {ROLES.map(r => (
          <div key={r.value} className="rol-card">
            <strong>{r.label}</strong><p>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Modal: Crear usuario ── */}
      {modal === 'crear' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-card">
            <div className="modal-hdr">
              <h3>Nuevo usuario</h3>
              <button className="btn-close" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Nombre completo</label>
                <input type="text" value={form.nombre} placeholder="Ej. Juan Pérez"
                  onChange={e => f('nombre', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Correo electrónico</label>
                <input type="email" value={form.email} placeholder="correo@empresa.com"
                  onChange={e => { f('email', e.target.value); setError('') }} />
              </div>
              <div className="form-field">
                <label>Contraseña inicial</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    placeholder="Mínimo 6 caracteres" style={{ paddingRight: 40 }}
                    onChange={e => { f('password', e.target.value); setError('') }} />
                  <button type="button" className="btn-show-pass" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className="form-field">
                <label>Rol</label>
                <select value={form.rol} onChange={e => f('rol', e.target.value)}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
              {error && <div className="login-error" style={{ marginTop: 8 }}>{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={crearUsuario}
                disabled={saving || !form.nombre || !form.email || !form.password}>
                {saving ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cambiar contraseña ── */}
      {modal === 'password' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-card">
            <div className="modal-hdr">
              <h3>Cambiar contraseña</h3>
              <button className="btn-close" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                Usuario: <strong style={{ color: 'var(--text)' }}>{targetUser?.nombre || targetUser?.email}</strong>
              </p>
              <div className="form-field">
                <label>Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={newPassword}
                    placeholder="Mínimo 6 caracteres" style={{ paddingRight: 40 }}
                    onChange={e => { setNewPassword(e.target.value); setError('') }} autoFocus />
                  <button type="button" className="btn-show-pass" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              {error && <div className="login-error" style={{ marginTop: 8 }}>{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={cambiarPassword}
                disabled={saving || !newPassword}>
                {saving ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
