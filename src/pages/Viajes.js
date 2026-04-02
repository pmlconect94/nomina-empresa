import React, { useState, useEffect } from 'react'
import { supabase, fmt, fmtPeriodo, calcIncentivos, TAB_CHOFER, TAB_ACOMP, getTramo, MESES } from '../lib/supabase'

const TRAMOS = ['7:00 am – 3:00 pm','3:00 pm – 7:00 pm','7:00 pm – 11:00 pm','11:00 pm en adelante']

export default function Viajes({ userRol, semanaFija }) {
  const [semanas, setSemanas] = useState([])
  const [semanaId, setSemanaId] = useState(semanaFija?.id || null)
  const [semanaInfo, setSemanaInfo] = useState(semanaFija || null)
  const [empleados, setEmpleados] = useState([])
  const [viajes, setViajes] = useState([])
  const [form, setForm] = useState({ fecha:'', destino:'', cliente:'', vehiculo:'', chofer_id:'', acompanante_id:'', hora_salida:'', hora_llegada:'', se_quedo_dormir:false })
  const [incent, setIncent] = useState({ chofer:0, acomp:0, tramo:null })
  const canEdit = userRol.rol !== 'viewer'
  const timbrada = semanaFija?.status === 'timbrada'

  useEffect(() => {
    fetchEmpleados()
    if (!semanaFija) fetchSemanas()
  }, [])

  useEffect(() => { if (semanaId) fetchViajes() }, [semanaId])

  async function fetchSemanas() {
    const { data } = await supabase.from('semanas').select('*').order('fecha_inicio',{ascending:false})
    setSemanas(data||[])
    if (data?.length) { setSemanaId(data[0].id); setSemanaInfo(data[0]) }
  }

  async function fetchEmpleados() {
    const { data } = await supabase.from('empleados').select('id,nombre').eq('activo',true).order('nombre')
    setEmpleados(data||[])
  }

  async function fetchViajes() {
    const { data } = await supabase.from('viajes')
      .select('*, chofer:chofer_id(nombre), acomp:acompanante_id(nombre)')
      .eq('semana_id', semanaId).order('fecha')
    setViajes(data||[])
  }

  function onForm(campo, valor) {
    const nf = {...form, [campo]: valor}
    setForm(nf)
    const { chofer, acomp } = calcIncentivos(nf.hora_llegada, nf.se_quedo_dormir)
    const tramo = nf.se_quedo_dormir ? null : getTramo(nf.hora_llegada)
    setIncent({ chofer, acomp, tramo })
  }

  async function guardar() {
    if (!semanaId) return
    if (!form.chofer_id && !form.acompanante_id) { alert('Selecciona chofer o acompañante'); return }
    await supabase.from('viajes').insert({
      semana_id: semanaId, fecha: form.fecha||null, destino: form.destino,
      cliente: form.cliente, vehiculo: form.vehiculo,
      chofer_id: form.chofer_id||null, acompanante_id: form.acompanante_id||null,
      hora_salida: form.hora_salida||null, hora_llegada: form.hora_llegada||null,
      se_quedo_dormir: form.se_quedo_dormir,
      incent_chofer: incent.chofer, incent_acompanante: incent.acomp
    })
    setForm({ fecha:'', destino:'', cliente:'', vehiculo:'', chofer_id:'', acompanante_id:'', hora_salida:'', hora_llegada:'', se_quedo_dormir:false })
    setIncent({ chofer:0, acomp:0, tramo:null })
    fetchViajes()
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este viaje?')) return
    await supabase.from('viajes').delete().eq('id',id)
    fetchViajes()
  }

  const totalSemana = viajes.reduce((s,v) => s+(v.incent_chofer||0)+(v.incent_acompanante||0), 0)

  return (
    <div className="viajes-page">
      {!semanaFija && (
        <div className="lista-header">
          <h2>Viajes</h2>
          <select className="sel-semana" value={semanaId||''} onChange={e => {
            setSemanaId(e.target.value)
            setSemanaInfo(semanas.find(s=>s.id===e.target.value))
          }}>
            {semanas.map(s => <option key={s.id} value={s.id}>{fmtPeriodo(s.fecha_inicio,s.fecha_fin)}</option>)}
          </select>
        </div>
      )}

      {canEdit && !timbrada && (
        <div className="viaje-form-card">
          <div className="card-hdr">Agregar viaje</div>
          <div className="vf-body">
            <div className="vf-grid">
              <div className="vf-field"><label>Fecha</label><input type="date" value={form.fecha} onChange={e=>onForm('fecha',e.target.value)}/></div>
              <div className="vf-field"><label>Destino</label><input type="text" value={form.destino} placeholder="Ciudad / lugar" onChange={e=>onForm('destino',e.target.value)}/></div>
              <div className="vf-field"><label>Cliente</label><input type="text" value={form.cliente} onChange={e=>onForm('cliente',e.target.value)}/></div>
              <div className="vf-field"><label>Vehículo</label><input type="text" value={form.vehiculo} placeholder="Placa / descripción" onChange={e=>onForm('vehiculo',e.target.value)}/></div>
              <div className="vf-field"><label>Chofer</label>
                <select value={form.chofer_id} onChange={e=>onForm('chofer_id',e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="vf-field"><label>Acompañante</label>
                <select value={form.acompanante_id} onChange={e=>onForm('acompanante_id',e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="vf-field"><label>Hora salida</label><input type="time" value={form.hora_salida} onChange={e=>onForm('hora_salida',e.target.value)}/></div>
              <div className="vf-field"><label>Hora llegada</label><input type="time" value={form.hora_llegada} onChange={e=>onForm('hora_llegada',e.target.value)}/></div>
            </div>
            <div className="dormir-check">
              <input type="checkbox" id="dormir" checked={form.se_quedo_dormir} onChange={e=>onForm('se_quedo_dormir',e.target.checked)}/>
              <label htmlFor="dormir">Se quedó a dormir (paga máximo + reinicio de tabular)</label>
            </div>
            <div className="tab-resultado">
              <div className="tab-cards">
                <div className="tab-card2">
                  <div className="tab-title2">Chofer</div>
                  {TRAMOS.map((t,i)=>(
                    <div key={i} className={`tab-row2 ${(!form.se_quedo_dormir&&incent.tramo===i)||(form.se_quedo_dormir&&(i===0||i===3))?'activo':''}`}>
                      <span>{t}</span><span>{fmt(TAB_CHOFER[i])}</span>
                    </div>
                  ))}
                </div>
                <div className="tab-card2">
                  <div className="tab-title2">Acompañante</div>
                  {TRAMOS.map((t,i)=>(
                    <div key={i} className={`tab-row2 ${(!form.se_quedo_dormir&&incent.tramo===i)||(form.se_quedo_dormir&&(i===0||i===3))?'activo':''}`}>
                      <span>{t}</span><span>{fmt(TAB_ACOMP[i])}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="resultado-viaje">
                <div className="rv-card"><label>Chofer</label><div>{fmt(incent.chofer)}</div></div>
                <div className="rv-card"><label>Acompañante</label><div>{fmt(incent.acomp)}</div></div>
                <div className="rv-card total"><label>Total</label><div>{fmt(incent.chofer+incent.acomp)}</div></div>
              </div>
            </div>
            <button className="btn-guardar-viaje" onClick={guardar}>Guardar viaje</button>
          </div>
        </div>
      )}

      <div className="viajes-tabla-wrap">
        <div className="viajes-tabla-hdr">
          <h3>Viajes {semanaInfo ? '— '+fmtPeriodo(semanaInfo.fecha_inicio, semanaInfo.fecha_fin) : ''}</h3>
          <span className="total-semana">Total incentivos: <strong>{fmt(totalSemana)}</strong></span>
        </div>
        <div className="tabla-scroll">
          <table className="tabla-viajes">
            <thead>
              <tr>
                <th>Fecha</th><th>Destino</th><th>Cliente</th><th>Vehículo</th>
                <th>Chofer</th><th>Acompañante</th><th>Salida</th><th>Llegada</th>
                <th>Inc. chofer</th><th>Inc. acomp.</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {viajes.map(v=>(
                <tr key={v.id}>
                  <td>{v.fecha||'—'}</td><td>{v.destino||'—'}</td><td>{v.cliente||'—'}</td><td>{v.vehiculo||'—'}</td>
                  <td>{v.chofer?.nombre||'—'}</td><td>{v.acomp?.nombre||'—'}</td>
                  <td>{v.hora_salida||'—'}</td><td>{v.hora_llegada||'—'}{v.se_quedo_dormir?' 🌙':''}</td>
                  <td className="blue">{fmt(v.incent_chofer||0)}</td>
                  <td className="blue">{fmt(v.incent_acompanante||0)}</td>
                  {canEdit && !timbrada && <td><button className="btn-del" onClick={()=>eliminar(v.id)}>✕</button></td>}
                </tr>
              ))}
              {viajes.length===0 && <tr><td colSpan={canEdit?11:10} className="empty-cell">No hay viajes registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
