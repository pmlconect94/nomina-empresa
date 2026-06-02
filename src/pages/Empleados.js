import React, { useState, useEffect } from 'react'
import { supabase, fmt } from '../lib/supabase'

const AREAS = ['Administración','Cobranza','Contabilidad','Logistica/Almacen','Recursos Humanos','Ventas']
const ESQUEMAS = ['Semanal','Quincenal']
const SEXOS = ['Masculino','Femenino']
const ESTADO_CIVIL = ['Soltero','Soltera','Casado','Casada','Union libre','Viudo','Viuda','Divorciado','Divorciada']
const ESCOLARIDAD = ['Primaria','Secundaria','Preparatoria','Licenciatura','Maestría','Universidad','Doctorado']
const TURNOS = [1, 2, 3]

const CAMPOS_SUELDO = {
  sd_fiscal: 'Sueldo fiscal',
  sd_real: 'Sueldo real',
  infonavit: 'Infonavit',
}

function calcEdad(fechaNac) {
  if (!fechaNac) return null
  const n = new Date(fechaNac + 'T12:00:00')
  if (isNaN(n)) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - n.getFullYear()
  const m = hoy.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--
  return edad
}

function fmtFecha(str) {
  if (!str) return '—'
  const d = new Date(str + 'T12:00:00')
  if (isNaN(d)) return str
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtFechaHora(str) {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Empleados({ userRol }) {
  const [empleados, setEmpleados] = useState([])
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({})
  const [nuevo, setNuevo] = useState(false)
  const [notaCambio, setNotaCambio] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'ascending' })
  const [saving, setSaving] = useState(false)
  // Historial
  const [histEmp, setHistEmp] = useState(null)
  const [histData, setHistData] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  const canEdit = userRol.rol === 'admin'

  useEffect(() => { fetchEmpleados() }, [])

  async function fetchEmpleados() {
    const { data } = await supabase.from('empleados').select('*').order('nombre', { ascending: true })
    setEmpleados(data || [])
  }

  const requestSort = (key) => {
    let direction = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending'
    setSortConfig({ key, direction })
  }
  const getSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>
    return sortConfig.direction === 'ascending' ? <span style={{ marginLeft: 4 }}>↑</span> : <span style={{ marginLeft: 4 }}>↓</span>
  }

  const filteredAndSorted = React.useMemo(() => {
    let result = empleados.filter(e => {
      if (!busqueda) return true
      const term = busqueda.toLowerCase()
      return (
        (e.nombre && e.nombre.toLowerCase().includes(term)) ||
        (e.puesto && e.puesto.toLowerCase().includes(term)) ||
        (e.area && e.area.toLowerCase().includes(term)) ||
        (e.rfc && e.rfc.toLowerCase().includes(term)) ||
        (e.id_nomex && String(e.id_nomex).includes(term)) ||
        (e.id_banco && String(e.id_banco).includes(term)) ||
        (e.id_toka && String(e.id_toka).includes(term))
      )
    })
    if (sortConfig !== null) {
      result = [...result].sort((a, b) => {
        let valA = a[sortConfig.key], valB = b[sortConfig.key]
        if (valA === null || valA === undefined) valA = ''
        if (valB === null || valB === undefined) valB = ''
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1
        return 0
      })
    }
    return result
  }, [empleados, busqueda, sortConfig])

  function iniciarEdicion(emp) { setEditando(emp.id); setForm({ ...emp }); setNuevo(false); setNotaCambio('') }
  function iniciarNuevo() {
    setEditando('nuevo')
    setForm({
      id_nomex: '', id_banco: '', id_toka: '', nombre: '', activo: true,
      fecha_ingreso: '', puesto: '', area: '', jefe_inmediato: '', ubicacion: 'Matriz',
      razon_social: 'Productos Marinos Lizarraga, S. de R.L. de C.V.', turno: '', horario: '', esquema_pago: 'Semanal',
      fecha_nacimiento: '', sexo: '', estado_civil: '', escolaridad: '',
      rfc: '', curp: '', nss: '', domicilio: '', colonia: '', municipio: '', codigo_postal: '',
      telefono: '', correo: '', contacto_nombre: '', contacto_parentesco: '', contacto_telefono: '',
      sd_fiscal: 0, sd_real: 0, infonavit: 0,
    })
    setNuevo(true); setNotaCambio('')
  }

  async function getUsuarioActual() {
    const { data } = await supabase.auth.getUser()
    return { id: data?.user?.id || null, nombre: userRol?.nombre || data?.user?.email || 'Sistema' }
  }

  async function guardar() {
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    setSaving(true)
    const parseNum = (v) => (v === '' || v === null || v === undefined) ? null : Number(v)
    const txt = (v) => (v === '' || v === undefined) ? null : v

    const empData = {
      id_nomex: parseNum(form.id_nomex), id_banco: parseNum(form.id_banco), id_toka: parseNum(form.id_toka),
      nombre: form.nombre, activo: form.activo !== false,
      fecha_ingreso: txt(form.fecha_ingreso), puesto: txt(form.puesto), area: txt(form.area),
      jefe_inmediato: txt(form.jefe_inmediato), ubicacion: txt(form.ubicacion), razon_social: txt(form.razon_social),
      turno: parseNum(form.turno), horario: txt(form.horario), esquema_pago: txt(form.esquema_pago),
      fecha_nacimiento: txt(form.fecha_nacimiento), sexo: txt(form.sexo), estado_civil: txt(form.estado_civil),
      escolaridad: txt(form.escolaridad), rfc: txt(form.rfc), curp: txt(form.curp), nss: txt(form.nss),
      domicilio: txt(form.domicilio), colonia: txt(form.colonia), municipio: txt(form.municipio),
      codigo_postal: txt(form.codigo_postal), telefono: txt(form.telefono), correo: txt(form.correo),
      contacto_nombre: txt(form.contacto_nombre), contacto_parentesco: txt(form.contacto_parentesco),
      contacto_telefono: txt(form.contacto_telefono),
      sd_fiscal: +(form.sd_fiscal || 0), sd_real: +(form.sd_real || 0), infonavit: +(form.infonavit || 0),
    }

    let empId = editando
    let error
    if (nuevo) {
      const { data, error: e } = await supabase.from('empleados').insert(empData).select('id').single()
      error = e
      empId = data?.id
    } else {
      ({ error } = await supabase.from('empleados').update(empData).eq('id', editando))
    }
    if (error) { alert('Error al guardar: ' + error.message); setSaving(false); return }

    // Registrar historial de cambios de sueldo / infonavit
    const original = nuevo ? { sd_fiscal: 0, sd_real: 0, infonavit: 0 } : (empleados.find(e => e.id === editando) || {})
    const usuario = await getUsuarioActual()
    const cambios = []
    Object.keys(CAMPOS_SUELDO).forEach(campo => {
      const ant = +(original[campo] || 0)
      const nvo = +(empData[campo] || 0)
      if (ant !== nvo) {
        cambios.push({
          empleado_id: empId, campo, valor_anterior: ant, valor_nuevo: nvo,
          nota: (notaCambio.trim() || (nuevo ? 'Alta inicial' : null)),
          changed_by: usuario.id, changed_by_nombre: usuario.nombre,
        })
      }
    })
    if (cambios.length) await supabase.from('empleado_sueldo_historial').insert(cambios)

    setEditando(null); setSaving(false)
    fetchEmpleados()
  }

  async function toggleActivo(emp) {
    const { error } = await supabase.from('empleados').update({ activo: !emp.activo }).eq('id', emp.id)
    if (error) { alert('Error al cambiar estado: ' + error.message); return }
    fetchEmpleados()
  }

  async function abrirHistorial(emp) {
    setHistEmp(emp); setHistLoading(true); setHistData([])
    const { data } = await supabase.from('empleado_sueldo_historial')
      .select('*').eq('empleado_id', emp.id).order('changed_at', { ascending: false })
    setHistData(data || [])
    setHistLoading(false)
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const edad = calcEdad(form.fecha_nacimiento)

  // Detecta si cambió algún campo de sueldo (para resaltar la nota)
  const orig = (!nuevo && editando) ? (empleados.find(e => e.id === editando) || {}) : { sd_fiscal: 0, sd_real: 0, infonavit: 0 }
  const sueldoCambio = Object.keys(CAMPOS_SUELDO).some(c => +(orig[c] || 0) !== +(form[c] || 0))

  return (
    <div className="empleados-page">
      <div className="lista-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Catálogo de empleados</h2>
          <p className="subtitle">{empleados.length} empleados · {empleados.filter(e => e.activo).length} activos</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="Buscar nombre, puesto, área, RFC, ID…" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '280px' }} />
          {canEdit && <button className="btn-primary" onClick={iniciarNuevo}>+ Agregar empleado</button>}
        </div>
      </div>

      {/* ── Modal Crear / Editar ── */}
      {editando && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditando(null)}>
          <div className="modal-card" style={{ maxWidth: 820 }}>
            <div className="modal-hdr">
              <h3>{nuevo ? 'Nuevo empleado' : 'Editar empleado'}</h3>
              <button className="btn-close" onClick={() => setEditando(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

              <h4 className="form-section-title">Identificadores</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-field"><label>ID Nomex</label><input type="number" value={form.id_nomex ?? ''} onChange={e => f('id_nomex', e.target.value)} /></div>
                <div className="form-field"><label>ID Banco</label><input type="number" value={form.id_banco ?? ''} onChange={e => f('id_banco', e.target.value)} /></div>
                <div className="form-field"><label>ID Toka</label><input type="number" value={form.id_toka ?? ''} onChange={e => f('id_toka', e.target.value)} /></div>
              </div>

              <h4 className="form-section-title">Datos generales</h4>
              <div className="form-field"><label>Nombre completo *</label><input type="text" value={form.nombre || ''} onChange={e => f('nombre', e.target.value)} /></div>
              <div className="form-grid-2">
                <div className="form-field"><label>Puesto</label><input type="text" value={form.puesto || ''} onChange={e => f('puesto', e.target.value)} /></div>
                <div className="form-field"><label>Área</label>
                  <select value={form.area || ''} onChange={e => f('area', e.target.value)}>
                    <option value="">—</option>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                    {form.area && !AREAS.includes(form.area) && <option>{form.area}</option>}
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field"><label>Jefe inmediato</label><input type="text" value={form.jefe_inmediato || ''} onChange={e => f('jefe_inmediato', e.target.value)} /></div>
                <div className="form-field"><label>Fecha de ingreso</label><input type="date" value={form.fecha_ingreso || ''} onChange={e => f('fecha_ingreso', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-field"><label>Turno</label>
                  <select value={form.turno ?? ''} onChange={e => f('turno', e.target.value)}>
                    <option value="">—</option>{TURNOS.map(t => <option key={t} value={t}>Turno {t}</option>)}
                  </select>
                </div>
                <div className="form-field"><label>Horario</label><input type="text" value={form.horario || ''} placeholder="7:00 am - 3:00 pm" onChange={e => f('horario', e.target.value)} /></div>
                <div className="form-field"><label>Esquema de pago</label>
                  <select value={form.esquema_pago || ''} onChange={e => f('esquema_pago', e.target.value)}>
                    <option value="">—</option>{ESQUEMAS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field"><label>Ubicación</label><input type="text" value={form.ubicacion || ''} onChange={e => f('ubicacion', e.target.value)} /></div>
                <div className="form-field"><label>Razón social</label><input type="text" value={form.razon_social || ''} onChange={e => f('razon_social', e.target.value)} /></div>
              </div>

              <h4 className="form-section-title">Datos personales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-field"><label>Fecha de nacimiento{edad != null ? ` (${edad} años)` : ''}</label><input type="date" value={form.fecha_nacimiento || ''} onChange={e => f('fecha_nacimiento', e.target.value)} /></div>
                <div className="form-field"><label>Sexo</label>
                  <select value={form.sexo || ''} onChange={e => f('sexo', e.target.value)}>
                    <option value="">—</option>{SEXOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-field"><label>Estado civil</label>
                  <select value={form.estado_civil || ''} onChange={e => f('estado_civil', e.target.value)}>
                    <option value="">—</option>{ESTADO_CIVIL.map(s => <option key={s}>{s}</option>)}
                    {form.estado_civil && !ESTADO_CIVIL.includes(form.estado_civil) && <option>{form.estado_civil}</option>}
                  </select>
                </div>
              </div>
              <div className="form-field"><label>Escolaridad</label>
                <select value={form.escolaridad || ''} onChange={e => f('escolaridad', e.target.value)}>
                  <option value="">—</option>{ESCOLARIDAD.map(s => <option key={s}>{s}</option>)}
                  {form.escolaridad && !ESCOLARIDAD.includes(form.escolaridad) && <option>{form.escolaridad}</option>}
                </select>
              </div>

              <h4 className="form-section-title">Datos fiscales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-field"><label>RFC</label><input type="text" value={form.rfc || ''} onChange={e => f('rfc', e.target.value.toUpperCase())} /></div>
                <div className="form-field"><label>CURP</label><input type="text" value={form.curp || ''} onChange={e => f('curp', e.target.value.toUpperCase())} /></div>
                <div className="form-field"><label>NSS</label><input type="text" value={form.nss || ''} onChange={e => f('nss', e.target.value)} /></div>
              </div>

              <h4 className="form-section-title">Domicilio</h4>
              <div className="form-field"><label>Domicilio</label><input type="text" value={form.domicilio || ''} onChange={e => f('domicilio', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-field"><label>Colonia</label><input type="text" value={form.colonia || ''} onChange={e => f('colonia', e.target.value)} /></div>
                <div className="form-field"><label>Municipio</label><input type="text" value={form.municipio || ''} onChange={e => f('municipio', e.target.value)} /></div>
                <div className="form-field"><label>Código postal</label><input type="text" value={form.codigo_postal || ''} onChange={e => f('codigo_postal', e.target.value)} /></div>
              </div>

              <h4 className="form-section-title">Contacto</h4>
              <div className="form-grid-2">
                <div className="form-field"><label>Teléfono</label><input type="text" value={form.telefono || ''} onChange={e => f('telefono', e.target.value)} /></div>
                <div className="form-field"><label>Correo electrónico</label><input type="email" value={form.correo || ''} onChange={e => f('correo', e.target.value)} /></div>
              </div>

              <h4 className="form-section-title">Contacto de emergencia</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-field"><label>Nombre</label><input type="text" value={form.contacto_nombre || ''} onChange={e => f('contacto_nombre', e.target.value)} /></div>
                <div className="form-field"><label>Parentesco</label><input type="text" value={form.contacto_parentesco || ''} onChange={e => f('contacto_parentesco', e.target.value)} /></div>
                <div className="form-field"><label>Teléfono de emergencia</label><input type="text" value={form.contacto_telefono || ''} onChange={e => f('contacto_telefono', e.target.value)} /></div>
              </div>

              <h4 className="form-section-title">Nómina (sueldos e Infonavit)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-field"><label>Sueldo semanal fiscal</label><input type="number" step="0.01" value={form.sd_fiscal ?? 0} onChange={e => f('sd_fiscal', e.target.value)} /></div>
                <div className="form-field"><label>Sueldo semanal real</label><input type="number" step="0.01" value={form.sd_real ?? 0} onChange={e => f('sd_real', e.target.value)} /></div>
                <div className="form-field"><label>Infonavit</label><input type="number" step="0.01" value={form.infonavit ?? 0} onChange={e => f('infonavit', e.target.value)} /></div>
              </div>
              {sueldoCambio && (
                <div className="form-field" style={{ background: '#FFF8E6', border: '1px solid #F4D88A', borderRadius: 8, padding: 12, marginTop: 4 }}>
                  <label>Motivo del cambio de sueldo/infonavit (se guardará en el historial)</label>
                  <input type="text" value={notaCambio} placeholder="Ej. Aumento anual, ajuste de infonavit…" onChange={e => setNotaCambio(e.target.value)} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving || !form.nombre}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Historial ── */}
      {histEmp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHistEmp(null)}>
          <div className="modal-card" style={{ maxWidth: 720 }}>
            <div className="modal-hdr">
              <h3>Historial de sueldo/infonavit — {histEmp.nombre}</h3>
              <button className="btn-close" onClick={() => setHistEmp(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {histLoading ? <p>Cargando…</p> : histData.length === 0 ? (
                <div className="empty-state">Sin cambios registrados todavía.</div>
              ) : (
                <table className="tabla-empleados">
                  <thead>
                    <tr><th>Fecha</th><th>Concepto</th><th style={{ textAlign: 'right' }}>Anterior</th><th style={{ textAlign: 'right' }}>Nuevo</th><th>Usuario</th><th>Nota</th></tr>
                  </thead>
                  <tbody>
                    {histData.map(h => {
                      const sube = (h.valor_nuevo || 0) >= (h.valor_anterior || 0)
                      return (
                        <tr key={h.id}>
                          <td className="text-secondary">{fmtFechaHora(h.changed_at)}</td>
                          <td><span className="badge-area">{CAMPOS_SUELDO[h.campo] || h.campo}</span></td>
                          <td style={{ textAlign: 'right' }}>{fmt(h.valor_anterior)}</td>
                          <td style={{ textAlign: 'right' }} className={sube ? 'green' : 'neg'}>{fmt(h.valor_nuevo)}</td>
                          <td className="text-secondary">{h.changed_by_nombre || '—'}</td>
                          <td className="text-secondary">{h.nota || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setHistEmp(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="tabla-scroll">
        <table className="tabla-empleados">
          <thead>
            <tr>
              <th onClick={() => requestSort('id_nomex')} style={{ cursor: 'pointer' }}>Nomex{getSortIndicator('id_nomex')}</th>
              <th onClick={() => requestSort('nombre')} style={{ cursor: 'pointer' }}>Nombre{getSortIndicator('nombre')}</th>
              <th onClick={() => requestSort('area')} style={{ cursor: 'pointer' }}>Área{getSortIndicator('area')}</th>
              <th onClick={() => requestSort('puesto')} style={{ cursor: 'pointer' }}>Puesto{getSortIndicator('puesto')}</th>
              <th onClick={() => requestSort('esquema_pago')} style={{ cursor: 'pointer' }}>Esquema{getSortIndicator('esquema_pago')}</th>
              <th onClick={() => requestSort('sd_fiscal')} style={{ cursor: 'pointer' }}>S. fiscal{getSortIndicator('sd_fiscal')}</th>
              <th onClick={() => requestSort('sd_real')} style={{ cursor: 'pointer' }}>S. real{getSortIndicator('sd_real')}</th>
              <th onClick={() => requestSort('infonavit')} style={{ cursor: 'pointer' }}>Infonavit{getSortIndicator('infonavit')}</th>
              <th onClick={() => requestSort('activo')} style={{ cursor: 'pointer' }}>Status{getSortIndicator('activo')}</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map(e => (
              <tr key={e.id} className={!e.activo ? 'row-inactivo' : ''}>
                <td>{e.id_nomex || e.id_toka || '—'}</td>
                <td><div className="td-nombre">{e.nombre}</div><div className="td-area">{e.correo || ''}</div></td>
                <td><span className="badge-area">{e.area}</span></td>
                <td className="text-secondary">{e.puesto}</td>
                <td className="text-secondary">{e.esquema_pago || '—'}</td>
                <td>{fmt(e.sd_fiscal)}</td>
                <td>{fmt(e.sd_real)}</td>
                <td>{fmt(e.infonavit)}</td>
                <td><span className={`badge-status ${e.activo ? 'abierta' : 'timbrada'}`}>{e.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td className="acciones">
                  <button className="btn-edit" onClick={() => abrirHistorial(e)} title="Historial de sueldo">Historial</button>
                  {canEdit && <button className="btn-edit" onClick={() => iniciarEdicion(e)}>Editar</button>}
                  {canEdit && <button className="btn-toggle" onClick={() => toggleActivo(e)}>{e.activo ? 'Desactivar' : 'Activar'}</button>}
                </td>
              </tr>
            ))}
            {filteredAndSorted.length === 0 && (
              <tr><td colSpan="10" className="empty-cell">Sin empleados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
