import React, { useState, useEffect } from 'react'
import { supabase, fmt, MESES, descuentoPrestamoMonto } from '../lib/supabase'

export default function Prestamos({ userRol }) {
  const [prestamos, setPrestamos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ empleado_id:'', monto:'', fecha_prestamo:'', tipo:'semanal' })
  const canEdit = userRol.rol !== 'viewer'

  useEffect(() => { fetchPrestamos(); fetchEmpleados() }, [])

  async function fetchPrestamos() {
    const { data } = await supabase.from('prestamos')
      .select('*, empleado:empleado_id(nombre,area)')
      .order('created_at', { ascending: false })
    setPrestamos(data||[])
  }

  async function fetchEmpleados() {
    const { data } = await supabase.from('empleados').select('id,nombre').eq('activo',true).order('nombre')
    setEmpleados(data||[])
  }

  async function guardar() {
    if (!form.empleado_id || !form.monto || !form.fecha_prestamo) return
    const monto = parseFloat(form.monto)
    await supabase.from('prestamos').insert({
      empleado_id: form.empleado_id, monto, saldo: monto,
      fecha_prestamo: form.fecha_prestamo, tipo: form.tipo, activo: true
    })
    setModal(false)
    setForm({ empleado_id:'', monto:'', fecha_prestamo:'', tipo:'semanal' })
    fetchPrestamos()
  }

  async function eliminar(id) {
    if (!window.confirm('¿Archivar este préstamo? El registro histórico se conservará.')) return
    await supabase.from('prestamos').update({ activo: false }).eq('id', id)
    fetchPrestamos()
  }

  function fmtFecha(str) {
    if (!str) return '—'
    const d = new Date(str+'T12:00:00')
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`
  }

  // #6 calcular primera nómina de descuento (7 días después)
  function primerDescuento(fechaPrestamo, tipo) {
    if (!fechaPrestamo) return ''
    const d = new Date(fechaPrestamo+'T12:00:00')
    d.setDate(d.getDate() + 7)
    const diasSemana = ['dom','lun','mar','mié','jue','vie','sáb']
    // Ajustar al lunes siguiente
    const dow = d.getDay()
    if (dow !== 1) d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow))
    return `Semana del ${diasSemana[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`
  }

  const desc = descuentoPrestamoMonto(parseFloat(form.monto)||0, form.tipo)
  const noms = form.monto ? Math.ceil(parseFloat(form.monto)/desc) : 0

  const activePrestamos = prestamos.filter(p => p.activo !== false)
  const totPrestado  = activePrestamos.reduce((s,p) => s+p.monto, 0)
  const totPendiente = activePrestamos.reduce((s,p) => s+p.saldo, 0)
  const totDesc      = activePrestamos.filter(p=>p.saldo>0).reduce((s,p) => s+Math.min(descuentoPrestamoMonto(p.monto,p.tipo),p.saldo), 0)

  return (
    <div className="prestamos-page">
      <div className="lista-header">
        <div>
          <h2>Préstamos</h2>
          <p className="subtitle">El primer descuento aplica una semana después de la fecha del préstamo</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => setModal(true)}>+ Nuevo préstamo</button>}
      </div>

      <div className="totales-cards" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>
        <div className="tcard"><label>Total prestado</label><div className="tval">{fmt(totPrestado)}</div></div>
        <div className="tcard orange"><label>Saldo pendiente</label><div className="tval">{fmt(totPendiente)}</div></div>
        <div className="tcard blue"><label>Descuento próx. nómina</label><div className="tval">{fmt(totDesc)}</div></div>
      </div>

      <div className="tabla-card">
        <table className="tabla-prestamos">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Fecha préstamo</th>
              <th>Primer descuento</th>
              <th>Monto original</th>
              <th>Saldo pendiente</th>
              <th>Desc. / nómina</th>
              <th>Tipo</th>
              <th>Avance</th>
              <th>Status</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {prestamos.length === 0 && (
              <tr><td colSpan={canEdit?10:9} className="empty-cell">No hay préstamos registrados</td></tr>
            )}
            {prestamos.map(p => {
              const desc = descuentoPrestamoMonto(p.monto, p.tipo)
              const pagado = p.monto - p.saldo
              const pct = Math.round((pagado/p.monto)*100)
              const liq = p.saldo === 0
              const archivado = p.activo === false
              return (
                <tr key={p.id} style={archivado ? {opacity:0.45} : {}}>
                  <td><div className="td-nombre">{p.empleado?.nombre||'—'}</div><div className="td-area">{p.empleado?.area||''}</div></td>
                  <td>{fmtFecha(p.fecha_prestamo)}</td>
                  <td style={{fontSize:11,color:'#185FA5'}}>{primerDescuento(p.fecha_prestamo, p.tipo)}</td>
                  <td className="bold">{fmt(p.monto)}</td>
                  <td className={liq?'green':'orange'}>{liq?'Liquidado':fmt(p.saldo)}</td>
                  <td className="blue">{liq?'—':fmt(desc)}</td>
                  <td><span className="tipo-pill">{p.tipo==='semanal'?'Semanal 10%':'Quincenal 20%'}</span></td>
                  <td style={{minWidth:100}}>
                    <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>{pct}% pagado</div>
                    <div className="prog-bar"><div className={`prog-fill ${pct>=75&&!liq?'casi':''} ${liq?'liq':''}`} style={{width:pct+'%'}}></div></div>
                  </td>
                  <td><span className={`badge-status ${archivado?'':''}${liq?'timbrada':'abierta'}`}>{archivado?'Archivado':liq?'Liquidado':'Activo'}</span></td>
                  {canEdit && <td>{!archivado && <button className="btn-del" onClick={()=>eliminar(p.id)}>✕</button>}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal-card">
            <div className="modal-hdr"><h3>Nuevo préstamo</h3><button className="btn-close" onClick={()=>setModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-field">
                <label>Empleado</label>
                <select value={form.empleado_id} onChange={e=>setForm(f=>({...f,empleado_id:e.target.value}))}>
                  <option value="">— Selecciona —</option>
                  {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Monto</label>
                  <input type="number" value={form.monto} min="0" placeholder="0.00" onChange={e=>setForm(f=>({...f,monto:e.target.value}))}/>
                </div>
                <div className="form-field">
                  <label>Fecha del préstamo</label>
                  <input type="date" value={form.fecha_prestamo} onChange={e=>setForm(f=>({...f,fecha_prestamo:e.target.value}))}/>
                </div>
              </div>
              <div className="form-field">
                <label>Tipo de descuento</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                  <option value="semanal">Semanal (10% por semana)</option>
                  <option value="quincenal">Quincenal (20% por quincena)</option>
                </select>
              </div>
              {form.monto > 0 && form.fecha_prestamo && (
                <div className="preview-prestamo">
                  <div className="pp-row"><span>Descuento por nómina</span><span>{fmt(desc)}</span></div>
                  <div className="pp-row"><span>Nóminas para liquidar</span><span>{noms} nóminas</span></div>
                  {/* #6 mostrar cuándo aplica el primer descuento */}
                  <div className="pp-row"><span>Primer descuento</span><span>{primerDescuento(form.fecha_prestamo, form.tipo)}</span></div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={!form.empleado_id||!form.monto||!form.fecha_prestamo}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
