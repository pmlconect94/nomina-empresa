import React, { useState, useEffect } from 'react'
import { supabase, calcIncentivos, TAB_CHOFER, TAB_ACOMP, getTramo } from '../lib/supabase'

const BASE = new Date(2026, 2, 16)
function getLunes(o) { const d=new Date(BASE); d.setDate(d.getDate()+o*7); return d }
function fmtP(o) {
  const ini=getLunes(o), fin=new Date(ini); fin.setDate(ini.getDate()+6)
  return `${ini.toLocaleDateString('es-MX',{day:'numeric',month:'long'})} – ${fin.toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}`
}
function fmt(n){ return '$'+(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }
const TRAMOS = ['7:00 am – 3:00 pm','3:00 pm – 7:00 pm','7:00 pm – 11:00 pm','11:00 pm en adelante']

export default function Viajes({ userRol }) {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [semanaId, setSemanaId] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [viajes, setViajes] = useState([])
  const [form, setForm] = useState({ fecha:'', destino:'', cliente:'', vehiculo:'', chofer_id:'', acompanante_id:'', hora_salida:'', hora_llegada:'', se_quedo_dormir:false })
  const [incent, setIncent] = useState({ chofer:0, acomp:0, tramo:null })
  const canEdit = userRol.rol !== 'viewer'

  useEffect(() => { fetchSemana() }, [semanaOffset])
  useEffect(() => { fetchEmpleados() }, [])
  useEffect(() => { if (semanaId) fetchViajes() }, [semanaId])

  async function fetchSemana() {
    const lunes = getLunes(semanaOffset).toISOString().split('T')[0]
    const { data } = await supabase.from('semanas').select('id,status').eq('fecha_inicio', lunes).single()
    setSemanaId(data?.id || null)
    if (data?.id) fetchViajes(data.id)
  }

  async function fetchEmpleados() {
    const { data } = await supabase.from('empleados').select('id,nombre,puesto').eq('activo',true).order('nombre')
    setEmpleados(data||[])
  }

  async function fetchViajes(sid) {
    const id = sid || semanaId
    if (!id) return
    const { data } = await supabase.from('viajes')
      .select('*, chofer:chofer_id(nombre), acomp:acompanante_id(nombre)')
      .eq('semana_id', id)
      .order('fecha')
    setViajes(data||[])
  }

  function onFormChange(campo, valor) {
    const nf = { ...form, [campo]: valor }
    setForm(nf)
    // Recalcular incentivos
    const { chofer, acomp } = calcIncentivos(nf.hora_llegada, nf.se_quedo_dormir)
    const tramo = nf.se_quedo_dormir ? null : getTramo(nf.hora_llegada)
    setIncent({ chofer, acomp, tramo })
  }

  async function guardarViaje() {
    if (!semanaId) { alert('No hay semana abierta'); return }
    if (!form.chofer_id && !form.acompanante_id) { alert('Selecciona chofer o acompañante'); return }
    await supabase.from('viajes').insert({
      semana_id: semanaId,
      fecha: form.fecha || null,
      destino: form.destino,
      cliente: form.cliente,
      vehiculo: form.vehiculo,
      chofer_id: form.chofer_id || null,
      acompanante_id: form.acompanante_id || null,
      hora_salida: form.hora_salida || null,
      hora_llegada: form.hora_llegada || null,
      se_quedo_dormir: form.se_quedo_dormir,
      incent_chofer: incent.chofer,
      incent_acompanante: incent.acomp
    })
    setForm({ fecha:'', destino:'', cliente:'', vehiculo:'', chofer_id:'', acompanante_id:'', hora_salida:'', hora_llegada:'', se_quedo_dormir:false })
    setIncent({ chofer:0, acomp:0, tramo:null })
    fetchViajes()
  }

  async function eliminarViaje(id) {
    if (!window.confirm('¿Eliminar este viaje?')) return
    await supabase.from('viajes').delete().eq('id', id)
    fetchViajes()
  }

  const totalSemana = viajes.reduce((s,v) => s + (v.incent_chofer||0) + (v.incent_acompanante||0), 0)

  return (
    <div className="viajes-page">
      <div className="lista-header">
        <h2>Panel de viajes</h2>
        <div className="semana-nav">
          <button className="nav-btn" onClick={() => setSemanaOffset(o=>o-1)}>←</button>
          <span className="periodo-label">{fmtP(semanaOffset)}</span>
          <button className="nav-btn" onClick={() => setSemanaOffset(o=>o+1)}>→</button>
        </div>
      </div>

      {canEdit && (
        <div className="viaje-form-card">
          <div className="card-hdr">Agregar viaje</div>
          <div className="vf-grid">
            <div className="vf-field"><label>Fecha</label><input type="date" value={form.fecha} onChange={e=>onFormChange('fecha',e.target.value)}/></div>
            <div className="vf-field"><label>Destino</label><input type="text" value={form.destino} placeholder="Ciudad / lugar" onChange={e=>onFormChange('destino',e.target.value)}/></div>
            <div className="vf-field"><label>Cliente</label><input type="text" value={form.cliente} onChange={e=>onFormChange('cliente',e.target.value)}/></div>
            <div className="vf-field"><label>Vehículo</label><input type="text" value={form.vehiculo} placeholder="Placa / descripción" onChange={e=>onFormChange('vehiculo',e.target.value)}/></div>
            <div className="vf-field">
              <label>Chofer</label>
              <select value={form.chofer_id} onChange={e=>onFormChange('chofer_id',e.target.value)}>
                <option value="">— Selecciona —</option>
                {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="vf-field">
              <label>Acompañante</label>
              <select value={form.acompanante_id} onChange={e=>onFormChange('acompanante_id',e.target.value)}>
                <option value="">— Selecciona —</option>
                {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="vf-field"><label>Hora salida</label><input type="time" value={form.hora_salida} onChange={e=>onFormChange('hora_salida',e.target.value)}/></div>
            <div className="vf-field"><label>Hora llegada</label><input type="time" value={form.hora_llegada} onChange={e=>onFormChange('hora_llegada',e.target.value)}/></div>
          </div>
          <div className="dormir-check">
            <input type="checkbox" id="dormir" checked={form.se_quedo_dormir} onChange={e=>onFormChange('se_quedo_dormir',e.target.checked)}/>
            <label htmlFor="dormir">Se quedó a dormir (paga máximo + reinicio de tabular)</label>
          </div>

          <div className="tab-y-resultado">
            <div className="tab-cards">
              <div className="tab-card">
                <div className="tab-title">Chofer</div>
                {TRAMOS.map((t,i)=>(
                  <div key={i} className={`tab-row ${!form.se_quedo_dormir && incent.tramo===i ? 'activo':''} ${form.se_quedo_dormir && (i===0||i===3)?'activo':''}`}>
                    <span>{t}</span><span>{fmt(TAB_CHOFER[i])}</span>
                  </div>
                ))}
              </div>
              <div className="tab-card">
                <div className="tab-title">Acompañante</div>
                {TRAMOS.map((t,i)=>(
                  <div key={i} className={`tab-row ${!form.se_quedo_dormir && incent.tramo===i ? 'activo':''} ${form.se_quedo_dormir && (i===0||i===3)?'activo':''}`}>
                    <span>{t}</span><span>{fmt(TAB_ACOMP[i])}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="resultado-cards">
              <div className="rc"><label>Incentivo chofer</label><div>{fmt(incent.chofer)}</div></div>
              <div className="rc"><label>Incentivo acompañante</label><div>{fmt(incent.acomp)}</div></div>
              <div className="rc total"><label>Total</label><div>{fmt(incent.chofer+incent.acomp)}</div></div>
            </div>
          </div>
          <button className="btn-guardar-viaje" onClick={guardarViaje}>Guardar viaje</button>
        </div>
      )}

      <div className="viajes-resumen">
        <div className="resumen-hdr">
          <h3>Viajes de la semana</h3>
          <span className="total-semana">Total incentivos: <strong>{fmt(totalSemana)}</strong></span>
        </div>
        <table className="resumen-table full">
          <thead>
            <tr>
              <th>Fecha salida</th><th>Destino</th><th>Cliente</th><th>Vehículo</th>
              <th>Chofer</th><th>Acompañante</th><th>Salida</th><th>Llegada</th>
              <th>Inc. chofer</th><th>Inc. acomp.</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {viajes.map(v=>(
              <tr key={v.id}>
                <td>{v.fecha}</td>
                <td>{v.destino}</td>
                <td>{v.cliente}</td>
                <td>{v.vehiculo}</td>
                <td>{v.chofer?.nombre||'—'}</td>
                <td>{v.acomp?.nombre||'—'}</td>
                <td>{v.hora_salida||'—'}</td>
                <td>{v.hora_llegada||'—'}{v.se_quedo_dormir?' 🌙':''}</td>
                <td style={{color:'#185FA5',fontWeight:500}}>{fmt(v.incent_chofer)}</td>
                <td style={{color:'#185FA5',fontWeight:500}}>{fmt(v.incent_acompanante)}</td>
                {canEdit && <td><button className="btn-del" onClick={()=>eliminarViaje(v.id)}>✕</button></td>}
              </tr>
            ))}
            {viajes.length===0 && <tr><td colSpan={11} style={{textAlign:'center',padding:'20px',color:'var(--text-secondary)'}}>No hay viajes registrados esta semana</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
