import React, { useState } from 'react'
import NominaLista from './NominaLista'
import NominaDetalle from './NominaDetalle'
import Viajes from './Viajes'
import Prestamos from './Prestamos'

export default function RRHHPage({ userRol }) {
  const [tab, setTab] = useState('nominas')
  const [nominaActiva, setNominaActiva] = useState(null)

  const tabs = [
    { key: 'nominas', label: 'Nóminas' },
    { key: 'viajes',  label: 'Viajes' },
    { key: 'prestamos', label: 'Préstamos' },
  ]

  function abrirNomina(nomina) {
    setNominaActiva(nomina)
  }

  function cerrarNomina() {
    setNominaActiva(null)
  }

  if (nominaActiva) {
    return <NominaDetalle semana={nominaActiva} userRol={userRol} onBack={cerrarNomina} />
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
        {tab === 'nominas'   && <NominaLista userRol={userRol} onAbrirNomina={abrirNomina} />}
        {tab === 'viajes'    && <Viajes userRol={userRol} />}
        {tab === 'prestamos' && <Prestamos userRol={userRol} />}
      </div>
    </div>
  )
}
