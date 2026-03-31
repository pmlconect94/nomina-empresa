import React, { useState, useEffect } from 'react'
import { supabase, MESES, fmtPeriodo, toISO } from '../lib/supabase'

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function getSugerencia(tipo) {
  const hoy = new Date()
  const anio = hoy.getFullYear(), mes = hoy.getMonth(), dia = hoy.getDate()
  if (tipo === 'semanal') {
    const dow = hoy.getDay()
    const lunes = new Date(hoy); lunes.setDate(dia - (dow === 0 ? 6 : dow - 1))
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6)
    return { ini: lunes, fin: domingo }
  } else {
    if (dia <= 15) return { ini: new Date(anio,mes,1), fin: new Date(anio,mes,15) }
    const ultimo = new Date(anio,mes+1,0).getDate()
    return { ini: new Date(anio,mes,16), fin: new Date(anio,mes,ultimo) }
  }
}

function fmtSug(d) {
  return `${DIAS[d.getDay()].charAt(0).toUpperCase()+DIAS[d.getDay()].slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export default function NominaLista({ userRol, onAbrirNomina }) {
  const [semanas, setSemanas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [modal, setModal] = useState(false)
  const [tipo, setTipo] = useState(null)
  const [fechaIni, setFechaIni] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [saving, setSaving] = useState(false)
  const canEdit = userRol.rol !== 'viewer'

  useEffect(() => { fetchSemanas() }, [])

  async function fetchSemanas() {
    const { data } = await supabase.from('semanas').select('*').order('fecha_inicio', { ascending: false })
    setSemanas(data || [])
  }

  function selTipo(t) {
    setTipo(t)
    const sug = getSugerencia(t)
    setFechaIni(toISO(sug.ini))
    setFechaFin(toISO(sug.fin))
  }

  async function crearNomina() {
    if (!fechaIni || !fechaFin || !tipo) return
    setSaving(true)
    const { data: semana, error } = await supabase.from('semanas').insert({
      fecha_inicio: fechaIni,
      fecha_fin: fechaFin,
      tipo,
      status: 'abierta'
    }).select().single()
    if (!error) {
      const { data: empleados } = await supabase.from('empleados').select('id').eq('activo', true)
      if (empleados?.length) {
        await supabase.from('nominas').insert(
          empleados.map(e => ({ semana_id: semana.id, empleado_id: e.id }))
        )
      }
      setModal(false)
      fetchSemanas()
    }
    setSaving(false)
  }

  const lista = filtro === 'todas' ? semanas : semanas.filter(s => s.status === filtro)
  const sug = tipo ? getSugerencia(tipo) : null

  return (
    <div className="nomina-lista">
      <div className="lista-header">
        <div>
          <h2>Nóminas</h2>
          <p className="subtitle">Selecciona una nómina para capturar incidencias</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => { setModal(true); setTipo(null); setFechaIni(''); setFechaFin('') }}>+ Crear nómina</button>}
      </div>

      <div className="filtros">
        {['todas','abierta','timbrada'].map(f => (
          <button key={f} className={`filtro ${filtro===f?'active':''}`} onClick={() => setFiltro(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      <div className="nominas-grid">
        {lista.length === 0 && <div className="empty-state">No hay nóminas en esta categoría</div>}
        {lista.map(s => (
          <div key={s.id} className="nomina-card" onClick={() => onAbrirNomina(s)}>
            <div className="nc-left">
              <div className="nc-tipo">{s.tipo === 'semanal' ? 'Semanal' : 'Quincenal'}</div>
              <div className="nc-periodo">{fmtPeriodo(s.fecha_inicio, s.fecha_fin)}</div>
            </div>
            <div className="nc-right">
              <span className={`badge-status ${s.status}`}>{s.status === 'abierta' ? 'Abierta' : 'Timbrada'}</span>
              <span className="nc-arrow">›</span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal-card">
            <div className="modal-hdr">
              <h3>Nueva nómina</h3>
              <button className="btn-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-label">Tipo de nómina</p>
              <div className="tipo-grid">
                <div className={`tipo-btn ${tipo==='semanal'?'selected':''}`} onClick={() => selTipo('semanal')}>
                  <div className="tipo-label">Semanal</div>
                  <div className="tipo-desc">Lunes a domingo</div>
                </div>
                <div className={`tipo-btn ${tipo==='quincenal'?'selected':''}`} onClick={() => selTipo('quincenal')}>
                  <div className="tipo-label">Quincenal</div>
                  <div className="tipo-desc">1–15 o 16–fin de mes</div>
                </div>
              </div>

              {tipo && (
                <>
                  <div className="sugerencia-box">
                    <div className="sug-label">Período sugerido</div>
                    <div className="sug-fechas">{fmtSug(sug.ini)} al {fmtSug(sug.fin)}</div>
                    <button className="btn-usar-sug" onClick={() => { setFechaIni(toISO(sug.ini)); setFechaFin(toISO(sug.fin)) }}>Usar esta</button>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Fecha inicio</label>
                      <input type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Fecha fin</label>
                      <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                    </div>
                  </div>
                  {fechaIni && fechaFin && (
                    <div className="preview-nomina">
                      <strong>{fmtPeriodo(fechaIni, fechaFin)}</strong>
                      <span> · Se creará sin incidencias para todos los empleados activos</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearNomina} disabled={!tipo||!fechaIni||!fechaFin||saving}>
                {saving ? 'Creando...' : 'Crear nómina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
