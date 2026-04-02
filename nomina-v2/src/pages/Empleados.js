import React, { useState, useEffect } from 'react'
import { supabase, fmt } from '../lib/supabase'

const AREAS = ['Administración','Almacén','Aseo','Comercial','Contabilidad','Crédito y Cobranza','Logística','Producción','Tesorería']

export default function Empleados({ userRol }) {
  const [empleados, setEmpleados] = useState([])
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({})
  const [nuevo, setNuevo] = useState(false)
  const canEdit = userRol.rol === 'admin'

  useEffect(() => { fetchEmpleados() }, [])

  async function fetchEmpleados() {
    const { data } = await supabase.from('empleados').select('*').order('nombre')
    setEmpleados(data||[])
  }

  function iniciarEdicion(emp) { setEditando(emp.id); setForm({...emp}); setNuevo(false) }
  function iniciarNuevo() { setEditando('nuevo'); setForm({ id_banco:'',id_toka:'',nombre:'',area:'',puesto:'',sd_fiscal:0,sd_real:0,infonavit:0,activo:true }); setNuevo(true) }

  async function guardar() {
    if (nuevo) {
      await supabase.from('empleados').insert({ id_banco:+form.id_banco, id_toka:+form.id_toka, nombre:form.nombre, area:form.area, puesto:form.puesto, sd_fiscal:+form.sd_fiscal, sd_real:+form.sd_real, infonavit:+form.infonavit, activo:true })
    } else {
      await supabase.from('empleados').update({ nombre:form.nombre, area:form.area, puesto:form.puesto, sd_fiscal:+form.sd_fiscal, sd_real:+form.sd_real, infonavit:+form.infonavit, activo:form.activo }).eq('id', editando)
    }
    setEditando(null)
    fetchEmpleados()
  }

  async function toggleActivo(emp) {
    await supabase.from('empleados').update({ activo: !emp.activo }).eq('id', emp.id)
    fetchEmpleados()
  }

  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  return (
    <div className="empleados-page">
      <div className="lista-header">
        <h2>Catálogo de empleados</h2>
        {canEdit && <button className="btn-primary" onClick={iniciarNuevo}>+ Agregar empleado</button>}
      </div>

      {editando && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditando(null)}>
          <div className="modal-card">
            <div className="modal-hdr">
              <h3>{nuevo?'Nuevo empleado':'Editar empleado'}</h3>
              <button className="btn-close" onClick={()=>setEditando(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-field"><label>ID Banco</label><input type="number" value={form.id_banco||''} onChange={e=>f('id_banco',e.target.value)}/></div>
                <div className="form-field"><label>ID Toka</label><input type="number" value={form.id_toka||''} onChange={e=>f('id_toka',e.target.value)}/></div>
              </div>
              <div className="form-field"><label>Nombre completo</label><input type="text" value={form.nombre||''} onChange={e=>f('nombre',e.target.value)}/></div>
              <div className="form-grid-2">
                <div className="form-field"><label>Área</label>
                  <select value={form.area||''} onChange={e=>f('area',e.target.value)}>
                    <option value="">—</option>{AREAS.map(a=><option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-field"><label>Puesto</label><input type="text" value={form.puesto||''} onChange={e=>f('puesto',e.target.value)}/></div>
              </div>
              <div className="form-grid-2">
                <div className="form-field"><label>Sueldo semanal fiscal</label><input type="number" value={form.sd_fiscal||0} onChange={e=>f('sd_fiscal',e.target.value)}/></div>
                <div className="form-field"><label>Sueldo semanal real</label><input type="number" value={form.sd_real||0} onChange={e=>f('sd_real',e.target.value)}/></div>
              </div>
              <div className="form-field"><label>Infonavit (cuota fija)</label><input type="number" value={form.infonavit||0} onChange={e=>f('infonavit',e.target.value)}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={()=>setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <table className="tabla-empleados">
        <thead>
          <tr><th>ID</th><th>Nombre</th><th>Área</th><th>Puesto</th><th>Sueldo fiscal</th><th>Sueldo real</th><th>Infonavit</th><th>Status</th>{canEdit&&<th>Acciones</th>}</tr>
        </thead>
        <tbody>
          {empleados.map(e=>(
            <tr key={e.id} className={!e.activo?'row-inactivo':''}>
              <td>{e.id_banco}</td>
              <td><div className="td-nombre">{e.nombre}</div></td>
              <td><span className="badge-area">{e.area}</span></td>
              <td className="text-secondary">{e.puesto}</td>
              <td>{fmt(e.sd_fiscal)}</td>
              <td>{fmt(e.sd_real)}</td>
              <td>{fmt(e.infonavit)}</td>
              <td><span className={`badge-status ${e.activo?'abierta':'timbrada'}`}>{e.activo?'Activo':'Inactivo'}</span></td>
              {canEdit&&<td className="acciones">
                <button className="btn-edit" onClick={()=>iniciarEdicion(e)}>Editar</button>
                <button className="btn-toggle" onClick={()=>toggleActivo(e)}>{e.activo?'Desactivar':'Activar'}</button>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
