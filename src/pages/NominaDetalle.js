import React, { useState, useEffect, useCallback } from 'react'
import { supabase, fmt, fmtPeriodo, calcularNomina, DIAS_SEMANA, CODIGOS_ASISTENCIA, MOTIVOS_TE } from '../lib/supabase'
import TabResumen from './tabs/TabResumen'
import TabAsistencias from './tabs/TabAsistencias'
import TabViajes from './Viajes'
import TabPrestamos from './Prestamos'
import TabFiscal from './tabs/TabFiscal'

export default function NominaDetalle({ semana, userRol, onBack }) {
  const [tab, setTab] = useState('resumen')
  const [empleados, setEmpleados] = useState([])
  const [nominas, setNominas] = useState({})
  const [asistencias, setAsistencias] = useState({})
  const [incentivos, setIncentivos] = useState({})
  const [prestamosDesc, setPrestamosDesc] = useState({})
  const [loading, setLoading] = useState(true)
  const canEdit = userRol.rol !== 'viewer'
  const timbrada = semana.status === 'timbrada'

  const TABS = [
    { key: 'resumen',     label: 'Resumen' },
    { key: 'asistencias', label: 'Asistencias' },
    { key: 'viajes',      label: 'Viajes' },
    { key: 'prestamos',   label: 'Préstamos' },
    { key: 'fiscal',      label: 'Fiscal' },
  ]

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    const [empRes, nomRes, asistRes, viajesRes, prestRes] = await Promise.all([
      supabase.from('empleados').select('*').eq('activo', true).order('nombre'),
      supabase.from('nominas').select('*').eq('semana_id', semana.id),
      supabase.from('asistencias').select('*').eq('nomina_id', semana.id),
      supabase.from('viajes').select('*').eq('semana_id', semana.id),
      supabase.from('prestamos').select('*').eq('activo', true),
    ])

    const emps = empRes.data || []
    setEmpleados(emps)

    const nominaMap = {}
    ;(nomRes.data || []).forEach(n => { nominaMap[n.empleado_id] = n })
    setNominas(nominaMap)

    const asistMap = {}
    ;(asistRes.data || []).forEach(a => {
      if (!asistMap[a.nomina_id]) asistMap[a.nomina_id] = []
      asistMap[a.nomina_id].push(a)
    })
    setAsistencias(asistMap)

    const incentMap = {}
    ;(viajesRes.data || []).forEach(v => {
      if (v.chofer_id) incentMap[v.chofer_id] = (incentMap[v.chofer_id]||0) + (v.incent_chofer||0)
      if (v.acompanante_id) incentMap[v.acompanante_id] = (incentMap[v.acompanante_id]||0) + (v.incent_acompanante||0)
    })
    setIncentivos(incentMap)

    const descMap = {}
    ;(prestRes.data || []).filter(p => p.saldo > 0).forEach(p => {
      const tipo = semana.tipo === 'quincenal' ? 'quincenal' : 'semanal'
      const desc = tipo === 'semanal' ? p.monto * 0.10 : p.monto * 0.20
      descMap[p.empleado_id] = (descMap[p.empleado_id]||0) + Math.min(desc, p.saldo)
    })
    setPrestamosDesc(descMap)

    setLoading(false)
  }, [semana.id, semana.tipo])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  async function timbrar() {
    if (!window.confirm('¿Timbrar la nómina? Ya no podrá editarse.')) return
    await supabase.from('semanas').update({ status: 'timbrada', timbrada_at: new Date().toISOString() }).eq('id', semana.id)
    onBack()
  }

  const calcData = empleados.map(e => {
    const nom = nominas[e.id]
    const asist = nom ? (asistencias[nom.id] || []) : []
    const incent = incentivos[e.id] || 0
    const desc = prestamosDesc[e.id] || 0
    return { empleado: e, nomina: nom, asistencias: asist, calc: calcularNomina(e, nom, asist, incent, desc) }
  })

  if (loading) return <div className="loading-inner"><div className="loading-spinner"></div></div>

  return (
    <div className="nomina-detalle">
      <div className="detalle-topbar">
        <button className="btn-back" onClick={onBack}>← Nóminas</button>
        <div className="detalle-info">
          <span className="detalle-periodo">{fmtPeriodo(semana.fecha_inicio, semana.fecha_fin)}</span>
          <span className="detalle-tipo">{semana.tipo === 'semanal' ? 'Semanal' : 'Quincenal'}</span>
          <span className={`badge-status ${semana.status}`}>{semana.status === 'abierta' ? 'Abierta' : 'Timbrada'}</span>
        </div>
      </div>

      <div className="detalle-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`detalle-tab ${tab===t.key?'active':''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="detalle-body">
        {tab === 'resumen'     && <TabResumen calcData={calcData} semana={semana} />}
        {tab === 'asistencias' && <TabAsistencias semana={semana} nominas={nominas} empleados={empleados} asistencias={asistencias} canEdit={canEdit && !timbrada} onRefresh={cargarDatos} />}
        {tab === 'viajes'      && <TabViajes userRol={userRol} semanaFija={semana} />}
        {tab === 'prestamos'   && <TabPrestamos userRol={userRol} semana={semana} />}
        {tab === 'fiscal'      && <TabFiscal calcData={calcData} nominas={nominas} semana={semana} canEdit={canEdit && !timbrada} onRefresh={cargarDatos} />}
      </div>

      {canEdit && !timbrada && (
        <div className="timbrar-bar">
          <button className="btn-timbrar" onClick={timbrar}>Timbrar nómina</button>
          <span>Una vez timbrada no podrá editarse</span>
        </div>
      )}
    </div>
  )
}
