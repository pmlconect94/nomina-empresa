import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [pendientes, setPendientes] = useState([])

  useEffect(() => { fetchUsuarios() }, [])

  async function fetchUsuarios() {
    const { data } = await supabase.from('usuarios_roles').select('*').order('created_at')
    setUsuarios((data||[]).filter(u=>u.rol))
    setPendientes((data||[]).filter(u=>!u.rol||u.rol==='pendiente'))
  }

  async function cambiarRol(id, rol) {
    await supabase.from('usuarios_roles').update({ rol }).eq('id', id)
    fetchUsuarios()
  }

  async function toggleActivo(u) {
    await supabase.from('usuarios_roles').update({ activo: !u.activo }).eq('id', u.id)
    fetchUsuarios()
  }

  async function aprobar(u) {
    await supabase.from('usuarios_roles').update({ rol: 'viewer', activo: true }).eq('id', u.id)
    fetchUsuarios()
  }

  return (
    <div className="usuarios-page">
      <h2>Gestión de usuarios</h2>

      {pendientes.length > 0 && (
        <div className="pendientes-section">
          <h3>Solicitudes pendientes de acceso</h3>
          {pendientes.map(u=>(
            <div key={u.id} className="pendiente-card">
              <div>
                <strong>{u.nombre||u.email}</strong>
                <span style={{color:'var(--text-secondary)',marginLeft:8}}>{u.email}</span>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn-primary" onClick={()=>aprobar(u)}>Aprobar acceso</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <table className="emp-table" style={{marginTop:'1rem'}}>
        <thead>
          <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Status</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {usuarios.map(u=>(
            <tr key={u.id}>
              <td><strong>{u.nombre||'—'}</strong></td>
              <td style={{color:'var(--text-secondary)'}}>{u.email}</td>
              <td>
                <select value={u.rol||'viewer'} onChange={e=>cambiarRol(u.id,e.target.value)} className="rol-select">
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td><span className={`status-badge ${u.activo?'activo':'inactivo'}`}>{u.activo?'Activo':'Inactivo'}</span></td>
              <td><button className="btn-toggle" onClick={()=>toggleActivo(u)}>{u.activo?'Desactivar':'Activar'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="roles-info">
        <h3>Roles</h3>
        <div className="roles-grid">
          <div className="rol-card"><strong>Admin</strong><p>Acceso total: empleados, nómina, viajes, usuarios y permisos.</p></div>
          <div className="rol-card"><strong>Editor</strong><p>Puede capturar y editar nóminas abiertas, viajes y asistencias. No puede gestionar usuarios.</p></div>
          <div className="rol-card"><strong>Viewer</strong><p>Solo puede ver. No puede editar nada.</p></div>
        </div>
      </div>
    </div>
  )
}
