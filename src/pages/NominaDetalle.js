import React, { useState, useEffect, useCallback } from 'react'
import { supabase, fmt, fmtPeriodo, calcularNomina } from '../lib/supabase'
import TabResumen from './tabs/TabResumen'
import TabAsistencias from './tabs/TabAsistencias'
import TabViajes from './Viajes'
import TabPrestamosResumen from './tabs/TabPrestamosResumen'
import TabComedor from './tabs/TabComedor'
import TabFiscal from './tabs/TabFiscal'

export default function NominaDetalle({ semana, userRol, onBack }) {
  const [tab, setTab] = useState('resumen')
  const [empleados, setEmpleados] = useState([])
  const [nominas, setNominas] = useState({})
  const [asistencias, setAsistencias] = useState({})
  const [incentivos, setIncentivos] = useState({})
  const [prestamosDesc, setPrestamosDesc] = useState({})
  const [prestamosData, setPrestamosData] = useState([])
  const [loading, setLoading] = useState(true)
  const [unlockPrompt, setUnlockPrompt] = useState(false)
  const [unlockPin, setUnlockPin] = useState('')
  const canEdit = userRol.rol !== 'viewer'
  const timbrada = semana.status === 'timbrada'

  const TABS = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'asistencias', label: 'Asistencias' },
    { key: 'viajes', label: 'Viajes' },
    { key: 'comedor', label: 'Comedor' },
    { key: 'prestamos', label: 'Préstamos' },
    { key: 'fiscal', label: 'Fiscal' },
  ]

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    const [empRes, nomRes, viajesRes, prestRes] = await Promise.all([
      supabase.from('empleados').select('*').eq('activo', true).order('id_nomex', { ascending: true }),
      supabase.from('nominas').select('*').eq('semana_id', semana.id),
      supabase.from('viajes').select('*').eq('semana_id', semana.id),
      supabase.from('prestamos').select('*, empleado:empleado_id(nombre,area)').eq('activo', true),
    ])

    const emps = empRes.data || []
    setEmpleados(emps)

    const nominaMap = {}
    ;(nomRes.data || []).forEach(n => { nominaMap[n.empleado_id] = n })
    setNominas(nominaMap)

    const nomIds = (nomRes.data || []).map(n => n.id)
    let asistMap = {}
    if (nomIds.length) {
      const { data: asistData } = await supabase.from('asistencias').select('*').in('nomina_id', nomIds)
      ;(asistData || []).forEach(a => {
        if (!asistMap[a.nomina_id]) asistMap[a.nomina_id] = []
        asistMap[a.nomina_id].push(a)
      })
    }
    setAsistencias(asistMap)

    const incentMap = {}
    ;(viajesRes.data || []).forEach(v => {
      if (v.chofer_id) incentMap[v.chofer_id] = (incentMap[v.chofer_id]||0) + (v.incent_chofer||0)
      if (v.acompanante_id) incentMap[v.acompanante_id] = (incentMap[v.acompanante_id]||0) + (v.incent_acompanante||0)
    })
    setIncentivos(incentMap)

    // #6: Solo aplica si fecha_prestamo + dias_espera <= fecha_inicio semana
    const fechaIniSemana = new Date(semana.fecha_inicio + 'T12:00:00')
    const descMap = {}
    const prestActivos = (prestRes.data || []).filter(p => {
      if (p.saldo <= 0) return false
      const fechaPrest = new Date(p.fecha_prestamo + 'T12:00:00')
      const diasEspera = p.tipo === 'semanal' ? 7 : 15
      const primeraNomina = new Date(fechaPrest)
      primeraNomina.setDate(fechaPrest.getDate() + diasEspera)
      return fechaIniSemana >= primeraNomina
    })
    prestActivos.forEach(p => {
      const desc = p.tipo === 'semanal' ? p.monto * 0.10 : p.monto * 0.20
      descMap[p.empleado_id] = (descMap[p.empleado_id]||0) + Math.min(desc, p.saldo)
    })
    setPrestamosDesc(descMap)
    setPrestamosData(prestActivos)
    setLoading(false)
  }, [semana.id, semana.tipo, semana.fecha_inicio])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // #4: botón dice "Guardar nómina"
  async function guardarNomina() {
    if (!window.confirm('¿Guardar y cerrar la nómina? Ya no podrá editarse.')) return

    // Bug #2: Descontar saldo de cada préstamo activo y registrar historial
    const descuentoOps = prestamosData.flatMap(p => {
      const descBruto = p.tipo === 'semanal' ? p.monto * 0.10 : p.monto * 0.20
      const descReal  = parseFloat(Math.min(descBruto, p.saldo).toFixed(2))
      if (descReal <= 0) return []
      const nuevoSaldo = parseFloat((p.saldo - descReal).toFixed(2))
      const nomId = nominas[p.empleado_id]?.id
      const ops = [
        supabase.from('prestamos').update({ saldo: nuevoSaldo, activo: nuevoSaldo > 0 }).eq('id', p.id)
      ]
      if (nomId) {
        ops.push(
          supabase.from('prestamo_descuentos').insert({
            prestamo_id: p.id,
            nomina_id: nomId,
            semana_id: semana.id,
            monto_descontado: descReal,
            saldo_anterior: p.saldo,
            saldo_posterior: nuevoSaldo,
          })
        )
      }
      return ops
    })
    await Promise.all(descuentoOps)

    await supabase.from('semanas').update({ status: 'timbrada', timbrada_at: new Date().toISOString() }).eq('id', semana.id)
    onBack()
  }

  async function desbloquearNomina() {
    const pinMaestro = process.env.REACT_APP_MASTER_PIN || '1424798';
    if (unlockPin !== pinMaestro) {
      alert('PIN incorrecto. Autorización denegada.');
      setUnlockPin('');
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres desbloquear esta nómina? Los cobros de préstamos realizados en esta semana serán devueltos a los balances de los trabajadores.')) return;

    setLoading(true);

    const { data: descuentos } = await supabase.from('prestamo_descuentos').select('*').eq('semana_id', semana.id);
    
    if (descuentos && descuentos.length > 0) {
      const rollbackOps = descuentos.map(d => 
        supabase.from('prestamos').update({ saldo: d.saldo_anterior, activo: true }).eq('id', d.prestamo_id)
      );
      await Promise.all(rollbackOps);
      
      await supabase.from('prestamo_descuentos').delete().eq('semana_id', semana.id);
    }

    await supabase.from('semanas').update({ status: 'abierta', timbrada_at: null }).eq('id', semana.id);
    
    setUnlockPrompt(false);
    setUnlockPin('');
    onBack();
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
          <span className={`badge-status ${semana.status}`}>{semana.status === 'abierta' ? 'Abierta' : 'Guardada'}</span>
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
        {tab === 'comedor'     && <TabComedor semana={semana} nominas={nominas} empleados={empleados} canEdit={canEdit && !timbrada} />}
        {tab === 'prestamos'   && <TabPrestamosResumen prestamos={prestamosData} descMap={prestamosDesc} semana={semana} />}
        {tab === 'fiscal'      && <TabFiscal calcData={calcData} nominas={nominas} semana={semana} canEdit={canEdit && !timbrada} onRefresh={cargarDatos} />}
      </div>

      {canEdit && !timbrada && (
        <div className="timbrar-bar">
          <button className="btn-timbrar" onClick={guardarNomina}>Guardar nómina</button>
          <span>Una vez guardada no podrá editarse</span>
        </div>
      )}

      {canEdit && timbrada && (
        <div className="timbrar-bar" style={{ background: '#fce8e8', borderColor: '#f8b4b4', marginTop: '15px' }}>
          <button className="btn-timbrar" style={{ background: '#e3342f' }} onClick={() => setUnlockPrompt(true)}>
            Desbloquear nómina
          </button>
          <span style={{ color: '#cc1f1a' }}>Esta nómina está cerrada y protegida</span>
        </div>
      )}

      {unlockPrompt && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-hdr">
              <h3>Autorización Requerida</h3>
              <button className="btn-close" onClick={() => { setUnlockPrompt(false); setUnlockPin(''); }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '15px' }}>Ingrese la clave maestra de administrador para revertir esta nómina.</p>
              <div className="form-field">
                <input 
                  type="password" 
                  autoFocus
                  placeholder="PIN Maestro" 
                  value={unlockPin} 
                  onChange={e => setUnlockPin(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && desbloquearNomina()}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '18px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setUnlockPrompt(false); setUnlockPin(''); }}>Cancelar</button>
              <button className="btn-primary" style={{ background: '#e3342f' }} onClick={desbloquearNomina}>Autorizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
