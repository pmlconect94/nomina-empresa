import React, { useState } from 'react'
import NominaLista from './NominaLista'
import NominaDetalle from './NominaDetalle'
import Prestamos from './Prestamos'
import Empleados from './Empleados'

export default function RRHHPage({ userRol }) {
  const [tab, setTab] = useState('nominas')
  const [nominaActiva, setNominaActiva] = useState(null)

  // #5 préstamos al mismo nivel que nóminas
  const tabs = [
    { key: 'nominas',   label: 'Nóminas' },
    { key: 'empleados', label: 'Empleados' },
    { key: 'prestamos', label: 'Préstamos' },
  ]

  if (nominaActiva) {
    return <NominaDetalle semana={nominaActiva} userRol={userRol} onBack={() => setNominaActiva(null)} />
  }

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
        {tab === 'nominas'   && <NominaLista userRol={userRol} onAbrirNomina={setNominaActiva} />}
        {tab === 'empleados' && <Empleados userRol={userRol} />}
        {tab === 'prestamos' && <Prestamos userRol={userRol} />}
      </div>
    </div>
  )
}
