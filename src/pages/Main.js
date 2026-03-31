import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import Nomina from './Nomina'
import Viajes from './Viajes'
import Empleados from './Empleados'
import Usuarios from './Usuarios'

export default function Main({ session, userRol }) {
  const [seccion, setSeccion] = useState('nomina')

  const nav = [
    { key: 'nomina',    label: 'Nómina' },
    { key: 'viajes',    label: 'Viajes' },
    { key: 'empleados', label: 'Empleados' },
    ...(userRol.rol === 'admin' ? [{ key: 'usuarios', label: 'Usuarios' }] : [])
  ]

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">M</div>
          <span className="app-title">Nómina</span>
        </div>
        <nav className="app-nav">
          {nav.map(n => (
            <button
              key={n.key}
              className={`nav-btn ${seccion === n.key ? 'active' : ''}`}
              onClick={() => setSeccion(n.key)}
            >{n.label}</button>
          ))}
        </nav>
        <div className="app-header-right">
          <span className="user-name">{userRol.nombre || session.user.email}</span>
          <span className={`rol-badge rol-${userRol.rol}`}>{userRol.rol}</span>
          <button className="btn-signout" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>
      <main className="app-main">
        {seccion === 'nomina'    && <Nomina userRol={userRol} />}
        {seccion === 'viajes'    && <Viajes userRol={userRol} />}
        {seccion === 'empleados' && <Empleados userRol={userRol} />}
        {seccion === 'usuarios'  && <Usuarios />}
      </main>
    </div>
  )
}
