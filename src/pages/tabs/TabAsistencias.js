import React, { useState, useCallback } from 'react'
import { supabase, DIAS_SEMANA, CODIGOS_ASISTENCIA, MOTIVOS_TE, fmt } from '../../lib/supabase'

const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export default function TabAsistencias({ semana, nominas, empleados, asistencias, canEdit, onRefresh }) {
  const [localAsist, setLocalAsist] = useState({})

  function getDias() {
    const dias = []
    const ini = new Date(semana.fecha_inicio + 'T12:00:00')
    const fin = new Date(semana.fecha_fin + 'T12:00:00')
    for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
      dias.push(new Date(d))
    }
    return dias
  }

  const dias = getDias()

  function getAsist(nomId, diaIdx) {
    // Primero buscar en estado local (cambios no guardados aún)
    const localKey = `${nomId}_${diaIdx}`
    if (localAsist[localKey]) return localAsist[localKey]
    const lista = asistencias[nomId] || []
    return lista.find(a => a.dia_index === diaIdx)
  }

  // #7: fix captura de asistencias - actualización optimista + guardado en BD
  async function updateAsist(nomId, diaIdx, fecha, campo, valor) {
    const localKey = `${nomId}_${diaIdx}`
    const existente = getAsist(nomId, diaIdx)

    // Actualización optimista en estado local
    const updated = { ...(existente || { nomina_id: nomId, dia_index: diaIdx, fecha, codigo: 'A', te_horas: 0, te_motivo: '', retardo_min: 0 }), [campo]: valor }
    setLocalAsist(prev => ({ ...prev, [localKey]: updated }))

    try {
      if (existente?.id) {
        await supabase.from('asistencias').update({ [campo]: valor }).eq('id', existente.id)
      } else {
        const { data } = await supabase.from('asistencias').insert({
          nomina_id: nomId, dia_index: diaIdx, fecha,
          codigo: campo === 'codigo' ? valor : 'A',
          te_horas: campo === 'te_horas' ? valor : 0,
          te_motivo: campo === 'te_motivo' ? valor : '',
          retardo_min: campo === 'retardo_min' ? valor : 0,
        }).select().single()
        if (data) {
          setLocalAsist(prev => ({ ...prev, [localKey]: data }))
        }
      }
      onRefresh()
    } catch (err) {
      console.error('Error guardando asistencia:', err)
    }
  }

  // #8: calcular resumen de horas extra por empleado
  function getResumenTE(nomId) {
    const asist = asistencias[nomId] || []
    const local = Object.entries(localAsist)
      .filter(([k]) => k.startsWith(nomId + '_'))
      .map(([, v]) => v)

    const todas = [...asist]
    local.forEach(l => {
      const idx = todas.findIndex(a => a.dia_index === l.dia_index)
      if (idx >= 0) todas[idx] = l
      else todas.push(l)
    })

    return todas.filter(a => (a.te_horas || 0) > 0)
  }

  return (
    <div className="tab-asistencias">
      <div className="asist-header">
        <h3>Asistencias</h3>
        <div className="leyenda">
          {[['A','#EAF3DE','#97C459'],['F','#FCEBEB','#F09595'],['D','#F1EFE8','#B4B2A9'],['V','#E6F1FB','#85B7EB'],['PSG','#FAEEDA','#EF9F27'],['PCG','#EEEDFE','#AFA9EC'],['TXT','#E1F5EE','#5DCAA5'],['SUS','#FCEBEB','#F09595']].map(([c,bg,b]) => (
            <span key={c} className="ley-item">
              <i style={{background:bg,border:`0.5px solid ${b}`}}></i>{c}
            </span>
          ))}
        </div>
      </div>

      <div className="asist-scroll">
        <table className="tabla-asist">
          <thead>
            <tr>
              <th className="th-emp-asist">Empleado</th>
              {dias.map((d, i) => (
                <th key={i} className="th-dia" colSpan="4">
                  {DIAS_SEMANA[i] || ''} {d.getDate()} {MESES_CORTO[d.getMonth()]}
                </th>
              ))}
            </tr>
            <tr>
              <th className="th-emp-asist"></th>
              {dias.map((_, i) => (
                <React.Fragment key={i}>
                  <th className="th-sub bl">Asist.</th>
                  <th className="th-sub">R(h)</th>
                  <th className="th-sub">T.E(h)</th>
                  <th className="th-sub">Motivo</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {empleados.map(emp => {
              const nom = nominas[emp.id]
              if (!nom) return null
              return (
                <tr key={emp.id}>
                  <td className="td-emp-asist">
                    <div className="td-nombre">{emp.nombre}</div>
                    <div className="td-area">{emp.area}</div>
                  </td>
                  {dias.map((d, i) => {
                    const fecha = d.toISOString().split('T')[0]
                    const a = getAsist(nom.id, i)
                    const codigo = a?.codigo || (i === dias.length - 1 ? 'D' : 'A')
                    const teHrs = a?.te_horas || 0
                    const retMin = a?.retardo_min || 0
                    const motivo = a?.te_motivo || ''
                    return (
                      <React.Fragment key={i}>
                        <td className={`td-asist bl`} style={{background: codigo==='A'?'#EAF3DE':codigo==='F'?'#FCEBEB':codigo==='D'?'#F1EFE8':codigo==='V'?'#E6F1FB':codigo==='PSG'?'#FAEEDA':codigo==='PCG'?'#EEEDFE':codigo==='TXT'?'#E1F5EE':'#FCEBEB'}}>
                          <select
                            className={`sel-asist ${codigo}`}
                            value={codigo}
                            disabled={!canEdit}
                            onChange={e => updateAsist(nom.id, i, fecha, 'codigo', e.target.value)}
                          >
                            {CODIGOS_ASISTENCIA.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="td-asist">
                          <input
                            className="inp-asist"
                            type="number"
                            value={retMin || ''}
                            min="0"
                            step="0.25"
                            placeholder="0"
                            disabled={!canEdit}
                            onChange={e => updateAsist(nom.id, i, fecha, 'retardo_min', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="td-asist">
                          <input
                            className="inp-asist"
                            type="number"
                            value={teHrs || ''}
                            min="0"
                            step="0.5"
                            placeholder="0"
                            disabled={!canEdit}
                            onChange={e => updateAsist(nom.id, i, fecha, 'te_horas', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="td-asist">
                          <select
                            className="sel-motivo"
                            value={motivo}
                            disabled={!canEdit || teHrs === 0}
                            onChange={e => updateAsist(nom.id, i, fecha, 'te_motivo', e.target.value)}
                          >
                            <option value="">—</option>
                            {MOTIVOS_TE.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* #8: Resumen de horas extra */}
      <div className="resumen-te-section">
        <h4 className="resumen-te-title">Resumen de horas extra</h4>
        {(() => {
          const filas = []
          empleados.forEach(emp => {
            const nom = nominas[emp.id]
            if (!nom) return
            const te = getResumenTE(nom.id)
            te.forEach(a => {
              filas.push({ emp, a, nom })
            })
          })
          if (!filas.length) return <p className="empty-te">Sin horas extra registradas esta semana</p>
          return (
            <table className="tabla-resumen-te">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Día</th>
                  <th>Fecha</th>
                  <th style={{textAlign:'right'}}>Horas</th>
                  <th>Motivo</th>
                  <th style={{textAlign:'right'}}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ emp, a }, idx) => {
                  const dDR = emp.sd_real / 7
                  const monto = (a.te_horas || 0) * (dDR / 8) * 2
                  const diaFecha = a.fecha ? new Date(a.fecha + 'T12:00:00') : null
                  return (
                    <tr key={idx}>
                      <td><div className="td-nombre">{emp.nombre}</div><div className="td-area">{emp.area}</div></td>
                      <td>{DIAS_SEMANA[a.dia_index] || ''}</td>
                      <td>{diaFecha ? `${diaFecha.getDate()} ${MESES_CORTO[diaFecha.getMonth()]}` : '—'}</td>
                      <td style={{textAlign:'right'}} className="bold">{a.te_horas}h</td>
                      <td>{a.te_motivo || '—'}</td>
                      <td style={{textAlign:'right'}} className="blue">{fmt(monto)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="tr-totales">
                  <td colSpan="3">Total horas extra</td>
                  <td style={{textAlign:'right'}} className="bold">{filas.reduce((s,{a})=>s+(a.te_horas||0),0)}h</td>
                  <td></td>
                  <td style={{textAlign:'right'}} className="blue bold">
                    {fmt(filas.reduce(({emp,a}) => {
                      const dDR = emp.sd_real / 7
                      return (a.te_horas || 0) * (dDR / 8) * 2
                    }, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )
        })()}
      </div>
    </div>
  )
}
