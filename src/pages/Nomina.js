import React, { useState, useEffect, useCallback } from 'react'
import { supabase, calcularNomina, DIAS_SEMANA, CODIGOS_ASISTENCIA, MOTIVOS_TE } from '../lib/supabase'

const BASE_LUNES = new Date(2026, 2, 16) // 16 marzo 2026

function getLunes(offset) {
  const d = new Date(BASE_LUNES)
  d.setDate(d.getDate() + offset * 7)
  return d
}
function fmtFecha(d) {
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtPeriodo(offset) {
  const ini = getLunes(offset)
  const fin = new Date(ini); fin.setDate(ini.getDate() + 6)
  const opts = { day: 'numeric', month: 'long', year: 'numeric' }
  return `${ini.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} – ${fin.toLocaleDateString('es-MX', opts)}`
}
function fmt(n) {
  return '$' + (Math.round((n || 0) * 100) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fechaDia(offset, diaIdx) {
  const d = getLunes(offset)
  d.setDate(d.getDate() + diaIdx)
  return d.toISOString().split('T')[0]
}

export default function Nomina({ userRol }) {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [semana, setSemana] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [empActivo, setEmpActivo] = useState(null)
  const [nomina, setNomina] = useState(null)
  const [asistencias, setAsistencias] = useState([])
  const [incentivosViaje, setIncentivosViaje] = useState(0)
  const [pestaña, setPestaña] = useState('pago')
  const [saving, setSaving] = useState(false)
  const [buscar, setBuscar] = useState('')
  const canEdit = userRol.rol !== 'viewer'

  useEffect(() => { fetchSemana() }, [semanaOffset])
  useEffect(() => { fetchEmpleados() }, [])

  async function fetchSemana() {
    const lunes = getLunes(semanaOffset).toISOString().split('T')[0]
    let { data } = await supabase.from('semanas').select('*').eq('fecha_inicio', lunes).single()
    if (!data && canEdit) {
      const fin = new Date(getLunes(semanaOffset)); fin.setDate(fin.getDate() + 6)
      const { data: nueva } = await supabase.from('semanas').insert({
        fecha_inicio: lunes,
        fecha_fin: fin.toISOString().split('T')[0],
        status: 'abierta'
      }).select().single()
      data = nueva
    }
    setSemana(data)
  }

  async function fetchEmpleados() {
    const { data } = await supabase.from('empleados').select('*').eq('activo', true).order('nombre')
    setEmpleados(data || [])
  }

  async function abrirNomina(emp) {
    setEmpActivo(emp)
    setPestaña('pago')
    if (!semana) return
    // Obtener o crear nómina
    let { data: nom } = await supabase.from('nominas')
      .select('*').eq('semana_id', semana.id).eq('empleado_id', emp.id).single()
    if (!nom && canEdit) {
      const { data: nueva } = await supabase.from('nominas').insert({
        semana_id: semana.id,
        empleado_id: emp.id,
        infonavit: emp.infonavit || 0,
        deposito_total: emp.sd_real
      }).select().single()
      nom = nueva
    }
    setNomina(nom)
    // Obtener asistencias
    let { data: asist } = await supabase.from('asistencias')
      .select('*').eq('nomina_id', nom?.id).order('dia_index')
    if ((!asist || asist.length === 0) && nom && canEdit) {
      const defaults = DIAS_SEMANA.map((_, i) => ({
        nomina_id: nom.id,
        dia_index: i,
        fecha: fechaDia(semanaOffset, i),
        codigo: i === 6 ? 'D' : 'A',
        te_horas: 0, te_motivo: '', retardo_min: 0
      }))
      const { data: nuevas } = await supabase.from('asistencias').insert(defaults).select()
      asist = nuevas
    }
    setAsistencias(asist || [])
    // Incentivos de viajes
    fetchIncentivosViaje(emp.id)
  }

  async function fetchIncentivosViaje(empId) {
    if (!semana) return
    const { data } = await supabase.from('viajes')
      .select('chofer_id, acompanante_id, incent_chofer, incent_acompanante')
      .eq('semana_id', semana.id)
    const total = (data || []).reduce((s, v) => {
      if (v.chofer_id === empId) return s + (v.incent_chofer || 0)
      if (v.acompanante_id === empId) return s + (v.incent_acompanante || 0)
      return s
    }, 0)
    setIncentivosViaje(total)
  }

  async function guardarAsistencia(diaIdx, campo, valor) {
    const asist = asistencias.find(a => a.dia_index === diaIdx)
    if (!asist) return
    const upd = { ...asist, [campo]: valor }
    setAsistencias(prev => prev.map(a => a.dia_index === diaIdx ? upd : a))
    await supabase.from('asistencias').update({ [campo]: valor }).eq('id', asist.id)
  }

  async function guardarNomina(campo, valor) {
    if (!nomina) return
    const upd = { ...nomina, [campo]: valor }
    setNomina(upd)
    await supabase.from('nominas').update({ [campo]: valor }).eq('id', nomina.id)
  }

  async function timbrar() {
    if (!semana || !canEdit) return
    if (!window.confirm('¿Timbrar la nómina? Ya no podrá editarse.')) return
    setSaving(true)
    await supabase.from('semanas').update({ status: 'timbrada', timbrada_at: new Date().toISOString() }).eq('id', semana.id)
    await fetchSemana()
    setSaving(false)
    alert('Nómina timbrada correctamente.')
  }

  const calc = empActivo && nomina ? calcularNomina(empActivo, nomina, asistencias, incentivosViaje) : null
  const empsFiltrados = empleados.filter(e => e.nombre.toLowerCase().includes(buscar.toLowerCase()) || e.area.toLowerCase().includes(buscar.toLowerCase()))
  const timbrada = semana?.status === 'timbrada'

  if (empActivo) return (
    <div className="nomina-detalle">
      <div className="detalle-topbar">
        <button className="btn-back" onClick={() => { setEmpActivo(null); setNomina(null); setAsistencias([]) }}>
          ← Todos los empleados
        </button>
        <div className="pestañas">
          {['pago','asistencias','viajes-emp'].map(p => (
            <button key={p} className={`pestaña ${pestaña===p?'active':''}`} onClick={() => setPestaña(p)}>
              {p==='pago'?'Pago':p==='asistencias'?'Asistencias / Horas extra':'Viajes'}
            </button>
          ))}
        </div>
        <div className="emp-title-info">
          <strong>{empActivo.nombre}</strong>
          <span>{empActivo.area} · {empActivo.puesto}</span>
          {timbrada && <span className="badge-timbrada">Timbrada</span>}
        </div>
      </div>

      {pestaña === 'pago' && calc && (
        <div className="pago-layout">
          <div className="sal-cards">
            <div className="sal-card">
              <label>Sueldo semanal real</label>
              <span>{fmt(empActivo.sd_real)}</span>
            </div>
            <div className="sal-card">
              <label>Salario diario real</label>
              <span>{fmt(calc.dDiarioReal)}</span>
            </div>
            <div className="sal-card fiscal">
              <label>Sueldo semanal fiscal</label>
              <span>{fmt(empActivo.sd_fiscal)}</span>
            </div>
            <div className="sal-card fiscal">
              <label>Previsión social / Puntualidad</label>
              <span>{fmt(calc.prevSocial)}</span>
            </div>
            <div className="sal-card fiscal">
              <label>Vales despensa</label>
              <span>{fmt(calc.vales)}</span>
            </div>
          </div>

          <div className="calc-grid">
            <div className="calc-card">
              <div className="cc-hdr">Percepciones reales</div>
              <div className="crow"><span>Asistencias ({calc.diasA} días)</span><span>{fmt(calc.asistMonto)}</span></div>
              <div className="crow"><span>Séptimo día ({calc.diasCuentan}/6)</span><span>{fmt(calc.septimo)}</span></div>
              <div className="crow"><span>Tiempo extra ({calc.totalTEHrs}h)</span><span>{fmt(calc.te)}</span></div>
              {calc.diasV > 0 && <div className="crow"><span>Prima vacacional ({calc.diasV} días)</span><span>{fmt(calc.primaEfectivo)}</span></div>}
              <div className="crow">
                <span>Comisiones</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.comisiones||0} onChange={e=>guardarNomina('comisiones',+e.target.value)} className="inp-calc"/>
                  : <span>{fmt(nomina?.comisiones)}</span>}
              </div>
              <div className="crow"><span>Incentivos viajes</span><span className="verde">{fmt(calc.incentivos)}</span></div>
              <div className="crow">
                <span>Retroactivos</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.retroactivos||0} onChange={e=>guardarNomina('retroactivos',+e.target.value)} className="inp-calc"/>
                  : <span>{fmt(nomina?.retroactivos)}</span>}
              </div>
              <div className="crow">
                <span>Evaluación desempeño</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.evaluacion||0} onChange={e=>guardarNomina('evaluacion',+e.target.value)} className="inp-calc"/>
                  : <span>{fmt(nomina?.evaluacion)}</span>}
              </div>
              <div className="trow"><span>Total percepciones</span><span>{fmt(calc.totalPerc)}</span></div>
            </div>

            <div className="calc-card">
              <div className="cc-hdr">Deducciones reales</div>
              <div className="crow">
                <span>Infonavit (cuota fija)</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.infonavit||0} onChange={e=>guardarNomina('infonavit',+e.target.value)} className="inp-calc"/>
                  : <span>{fmt(nomina?.infonavit)}</span>}
              </div>
              <div className="crow">
                <span>Comedor</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.comedor||0} onChange={e=>guardarNomina('comedor',+e.target.value)} className="inp-calc"/>
                  : <span>{fmt(nomina?.comedor)}</span>}
              </div>
              <div className="crow">
                <span>Préstamos / Lentes</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.prestamos||0} onChange={e=>guardarNomina('prestamos',+e.target.value)} className="inp-calc"/>
                  : <span>{fmt(nomina?.prestamos)}</span>}
              </div>
              <div className="crow">
                <span>Descuento productos</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.desc_productos||0} onChange={e=>guardarNomina('desc_productos',+e.target.value)} className="inp-calc"/>
                  : <span>{fmt(nomina?.desc_productos)}</span>}
              </div>
              <div className="cc-hdr fiscal-hdr">Solo informativos — sistema fiscal</div>
              <div className="crow">
                <span className="fiscal-lbl">ISR</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.isr||0} onChange={e=>guardarNomina('isr',+e.target.value)} className="inp-calc fiscal-inp"/>
                  : <span>{fmt(nomina?.isr)}</span>}
              </div>
              <div className="crow">
                <span className="fiscal-lbl">IMSS</span>
                {canEdit && !timbrada
                  ? <input type="number" value={nomina?.imss||0} onChange={e=>guardarNomina('imss',+e.target.value)} className="inp-calc fiscal-inp"/>
                  : <span>{fmt(nomina?.imss)}</span>}
              </div>
              <div className="trow rojo"><span>Total deducciones</span><span>{fmt(calc.totalDed)}</span></div>
              <div className="trow neto"><span>Neto a pagar</span><span>{fmt(calc.neto)}</span></div>
            </div>
          </div>

          <div className="pago-dist">
            <div className="pd-card fiscal">
              <label>Depósito total</label>
              {canEdit && !timbrada
                ? <input type="number" value={nomina?.deposito_total||0} onChange={e=>guardarNomina('deposito_total',+e.target.value)}/>
                : <span>{fmt(nomina?.deposito_total)}</span>}
            </div>
            <div className="pd-eq">=</div>
            <div className="pd-card fiscal"><label>Vales</label><span>{fmt(calc.vales)}</span></div>
            <div className="pd-card fiscal"><label>Depósito banco</label><span>{fmt(calc.depositoBanco)}</span></div>
            <div className="pd-card info"><label>Efectivo</label><span>{fmt(calc.efectivo)}</span></div>
          </div>
        </div>
      )}

      {pestaña === 'asistencias' && (
        <div className="asist-layout">
          <div className="dias-grid">
            {DIAS_SEMANA.map((nombre, i) => {
              const a = asistencias.find(x => x.dia_index === i) || {}
              return (
                <div key={i} className={`dia-card dia-${a.codigo||'A'}`}>
                  <div className="dia-nombre">{nombre}</div>
                  <div className="dia-fecha">{fechaDia(semanaOffset, i)}</div>
                  <select value={a.codigo||'A'} disabled={!canEdit||timbrada}
                    onChange={e=>guardarAsistencia(i,'codigo',e.target.value)}>
                    {CODIGOS_ASISTENCIA.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <div className="te-section">
                    <label>T. extra (h)</label>
                    <input type="number" value={a.te_horas||0} disabled={!canEdit||timbrada} min="0" step="0.5"
                      onChange={e=>guardarAsistencia(i,'te_horas',+e.target.value)}/>
                    {(a.te_horas||0) > 0 && (
                      <select value={a.te_motivo||''} disabled={!canEdit||timbrada}
                        onChange={e=>guardarAsistencia(i,'te_motivo',e.target.value)}>
                        <option value="">Motivo</option>
                        {MOTIVOS_TE.map(m=><option key={m}>{m}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="ret-section">
                    <label>Retardo (min)</label>
                    <input type="number" value={a.retardo_min||0} disabled={!canEdit||timbrada} min="0"
                      onChange={e=>guardarAsistencia(i,'retardo_min',+e.target.value)}/>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="resumen-te">
            <h3>Resumen horas extra</h3>
            <table className="resumen-table">
              <thead><tr><th>Día</th><th>Fecha</th><th>Horas</th><th>Motivo</th><th>Monto</th></tr></thead>
              <tbody>
                {asistencias.filter(a => (a.te_horas||0) > 0).map(a => {
                  const dDR = empActivo.sd_real / 7
                  const monto = a.te_horas * (dDR / 8) * 2
                  return (
                    <tr key={a.dia_index}>
                      <td>{DIAS_SEMANA[a.dia_index]}</td>
                      <td>{a.fecha}</td>
                      <td>{a.te_horas}h</td>
                      <td>{a.te_motivo||'—'}</td>
                      <td>{fmt(monto)}</td>
                    </tr>
                  )
                })}
                {asistencias.filter(a=>(a.te_horas||0)>0).length===0 && (
                  <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-secondary)'}}>Sin horas extra esta semana</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pestaña === 'viajes-emp' && (
        <ViajesEmpleado empId={empActivo.id} semanaId={semana?.id} empNombre={empActivo.nombre} />
      )}

      {canEdit && !timbrada && pestaña === 'pago' && (
        <div className="timbrar-bar">
          <button className="btn-timbrar" onClick={timbrar} disabled={saving}>
            {saving ? 'Timbrando...' : 'Timbrar nómina de esta semana'}
          </button>
          <span style={{fontSize:12,color:'var(--text-secondary)'}}>Una vez timbrada no podrá editarse</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="nomina-lista">
      <div className="lista-header">
        <div>
          <h2>Nómina semanal</h2>
          {semana && <span className={`semana-status ${semana.status}`}>{semana.status === 'timbrada' ? '✓ Timbrada' : 'Abierta'}</span>}
        </div>
        <div className="semana-nav">
          <button className="nav-btn" onClick={() => setSemanaOffset(o => o-1)}>←</button>
          <span className="periodo-label">{fmtPeriodo(semanaOffset)}</span>
          <button className="nav-btn" onClick={() => setSemanaOffset(o => o+1)}>→</button>
        </div>
      </div>
      <input className="search-input" placeholder="Buscar empleado o área..." value={buscar} onChange={e=>setBuscar(e.target.value)}/>
      <table className="emp-table">
        <thead>
          <tr><th>Nombre</th><th>Área</th><th>Puesto</th><th>Sueldo real</th><th>Incentivos viaje</th><th>Neto est.</th></tr>
        </thead>
        <tbody>
          {empsFiltrados.map(e => (
            <tr key={e.id} onClick={() => abrirNomina(e)} className="emp-row">
              <td><strong>{e.nombre}</strong></td>
              <td><span className="badge-area">{e.area}</span></td>
              <td style={{color:'var(--text-secondary)'}}>{e.puesto}</td>
              <td>{fmt(e.sd_real)}</td>
              <td>—</td>
              <td style={{fontWeight:500,color:'#185FA5'}}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ViajesEmpleado({ empId, semanaId, empNombre }) {
  const [viajes, setViajes] = useState([])
  useEffect(() => { fetchViajes() }, [])
  async function fetchViajes() {
    if (!semanaId) return
    const { data } = await supabase.from('viajes')
      .select('*, chofer:chofer_id(nombre), acomp:acompanante_id(nombre)')
      .eq('semana_id', semanaId)
      .or(`chofer_id.eq.${empId},acompanante_id.eq.${empId}`)
    setViajes(data || [])
  }
  const fmt = n => '$' + (n||0).toLocaleString('es-MX', {minimumFractionDigits:2})
  return (
    <div className="viajes-emp-panel">
      <h3>Viajes de {empNombre} esta semana</h3>
      <table className="resumen-table">
        <thead><tr><th>Fecha</th><th>Destino</th><th>Cliente</th><th>Rol</th><th>Salida</th><th>Llegada</th><th>Incentivo</th></tr></thead>
        <tbody>
          {viajes.map(v => (
            <tr key={v.id}>
              <td>{v.fecha}</td>
              <td>{v.destino}</td>
              <td>{v.cliente}</td>
              <td>{v.chofer_id === empId ? 'Chofer' : 'Acompañante'}</td>
              <td>{v.hora_salida}</td>
              <td>{v.hora_llegada}{v.se_quedo_dormir ? ' (durmió)' : ''}</td>
              <td style={{fontWeight:500,color:'#185FA5'}}>{v.chofer_id===empId ? fmt(v.incent_chofer) : fmt(v.incent_acompanante)}</td>
            </tr>
          ))}
          {viajes.length===0 && <tr><td colSpan={7} style={{textAlign:'center',color:'var(--text-secondary)'}}>Sin viajes esta semana</td></tr>}
        </tbody>
      </table>
      <div className="viajes-total">
        Total incentivos: <strong>{fmt(viajes.reduce((s,v)=>s+(v.chofer_id===empId?v.incent_chofer:v.incent_acompanante),0))}</strong>
      </div>
    </div>
  )
}
