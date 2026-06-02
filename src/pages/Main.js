import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import RRHHPage from './RRHH'
import Configuracion from './Configuracion'

export default function Main({ session, userRol }) {
  const [seccion, setSeccion] = useState('rrhh')

  const nav = [
    { key: 'rrhh', label: 'Recursos Humanos' }
  ]

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <img src="/logo.png" alt="PML Logo" className="app-logo-img" style={{ height: '32px', marginRight: '10px' }} />
          <span className="app-title">PML CONNECT</span>
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
        {seccion === 'rrhh'          && <RRHHPage userRol={userRol} />}
        {seccion === 'configuracion' && <Configuracion userRol={userRol} />}
      </main>

      {userRol.rol === 'admin' && (
        <button 
          onClick={() => setSeccion('configuracion')}
          title="Configuración"
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '56px',
            height: '56px',
            backgroundColor: seccion === 'configuracion' ? '#0070bc' : '#ffffff',
            color: seccion === 'configuracion' ? '#fff' : '#666',
            border: 'none',
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000,
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      )}
    </div>
  )
}
