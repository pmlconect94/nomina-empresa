import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import RRHHPage from './RRHH'
import Empleados from './Empleados'
import Usuarios from './Usuarios'

export default function Main({ session, userRol }) {
  const [seccion, setSeccion] = useState('rrhh')

  const nav = [
    { key: 'rrhh', label: 'Recursos humanos' },
    { key: 'empleados', label: 'Empleados' },
    ...(userRol.rol === 'admin' ? [{ key: 'usuarios', label: 'Usuarios' }] : [])
  ]

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">M</div>
          <span className="app-title">Nómina PML</span>
        </div>
        <nav className="app-nav">
          {nav.map(n => (
            <button key={n.key} className={`nav-item ${seccion===n.key?'active':''}`} onClick={() => setSeccion(n.key)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="app-header-right">
          <span className="user-name">{userRol.nombre || session.user.email}</span>
          <span className={`rol-badge rol-${userRol.rol}`}>{userRol.rol}</span>
          <button className="btn-signout" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>
      <main className="app-main">
        {seccion === 'rrhh'      && <RRHHPage userRol={userRol} />}
        {seccion === 'empleados' && <Empleados userRol={userRol} />}
        {seccion === 'usuarios'  && <Usuarios />}
      </main>
    </div>
  )
}
