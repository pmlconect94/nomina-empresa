import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => { fetchUsuarios() }, [])

  async function fetchUsuarios() {
    const { data } = await supabase.from('usuarios_roles').select('*').order('created_at')
    setUsuarios(data||[])
  }

  async function cambiarRol(id, rol) {
    await supabase.from('usuarios_roles').update({ rol }).eq('id', id)
    fetchUsuarios()
  }

  async function toggleActivo(u) {
    await supabase.from('usuarios_roles').update({ activo: !u.activo }).eq('id', u.id)
    fetchUsuarios()
  }

  return (
    <div className="usuarios-page">
      <div className="lista-header"><h2>Gestión de usuarios</h2></div>
      <table className="tabla-empleados">
        <thead>
          <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Status</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {usuarios.map(u=>(
            <tr key={u.id}>
              <td><div className="td-nombre">{u.nombre||'—'}</div></td>
              <td className="text-secondary">{u.email}</td>
              <td>
                <select className="sel-rol" value={u.rol||'viewer'} onChange={e=>cambiarRol(u.id,e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td><span className={`badge-status ${u.activo?'abierta':'timbrada'}`}>{u.activo?'Activo':'Inactivo'}</span></td>
              <td><button className="btn-toggle" onClick={()=>toggleActivo(u)}>{u.activo?'Desactivar':'Activar'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="roles-grid" style={{marginTop:'1.5rem'}}>
        {[['Admin','Acceso total: empleados, nómina, viajes, usuarios y permisos.'],['Editor','Captura y edita nóminas abiertas, viajes y asistencias.'],['Viewer','Solo lectura. No puede editar nada.']].map(([r,d])=>(
          <div key={r} className="rol-card"><strong>{r}</strong><p>{d}</p></div>
        ))}
      </div>
    </div>
  )
}
