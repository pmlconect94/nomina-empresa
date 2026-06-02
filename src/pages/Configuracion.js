import React, { useState } from 'react'
import Usuarios from './Usuarios'

export default function Configuracion({ userRol }) {
  const [tab, setTab] = useState('usuarios')

  const tabs = [
    { key: 'usuarios', label: 'Gestión de Usuarios' },
  ]

  return (
    <div className="rrhh-page">
      <div className="rrhh-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`rrhh-tab ${tab===t.key?'active':''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rrhh-content">
        {tab === 'usuarios' && <Usuarios />}
      </div>
    </div>
  )
}
