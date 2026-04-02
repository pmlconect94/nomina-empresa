import React, { useState, useEffect } from 'react'
import { supabase, DIAS_SEMANA, CODIGOS_ASISTENCIA, MOTIVOS_TE, fmt } from '../../lib/supabase'

const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export default function TabAsistencias({ semana, nominas, empleados, asistencias, canEdit }) {
  // Estado local completo de asistencias — copia de las de BD
  const [localAsist, setLocalAsist] = useState({})

  // Inicializar estado local cuando llegan las asistencias de BD
  useEffect(() => {
    const init = {}
    Object.entries(asistencias).forEach(([nomId, lista]) => {
      lista.forEach(a => {
        init[`${nomId}_${a.dia_index}`] = { ...a }
      })
    })
    setLocalAsist(init)
  }, [asistencias])

  function getDias() {
    const dias = []
    const ini = new Date(semana.fecha_inicio + 'T12:00:00')
    const fin = new Date(semana.fecha_fin   + 'T12:00:00')
    for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
      dias.push(new Date(d))
    }
    return dias
  }

  const dias = getDias()

  function getAsist(nomId, diaIdx) {
    return localAsist[`${nomId}_${diaIdx}`] || null
  }

  async function updateAsist(nomId, diaIdx, fecha, campo, valor) {
    const key = `${nomId}_${diaIdx}`
    const existente = localAsist[key]

    // 1. Actualización optimista inmediata — no espera BD
    const updated = {
      ...(existente || { nomina_id: nomId, dia_index: diaIdx, fecha, codigo: diaIdx === dias.length - 1 ? 'D' : 'A', te_horas: 0, te_motivo: '', retardo_min: 0 }),
      [campo]: valor
    }
    setLocalAsist(prev => ({ ...prev, [key]: updated }))

    // 2. Guardar en BD sin recargar todo
    try {
      if (existente?.id) {
        await supabase.from('asistencias').update({ [campo]: valor }).eq('id', existente.id)
      } else {
        const { data: nueva } = await supabase.from('asistencias').insert({
          nomina_id: nomId,
          dia_index: diaIdx,
          fecha,
          codigo:      campo === 'codigo'      ? valor : (diaIdx === dias.length - 1 ? 'D' : 'A'),
          te_horas:    campo === 'te_horas'    ? valor : 0,
          te_motivo:   campo === 'te_motivo'   ? valor : '',
          retardo_min: campo === 'retardo_min' ? valor : 0,
        }).select().single()
        // Guardar el id para futuras ediciones
        if (nueva) {
          setLocalAsist(prev => ({ ...prev, [key]: { ...prev[key], id: nueva.id } }))
        }
      }
    } catch (err) {
      console.error('Error guardando asistencia:', err)
    }
  }

  // Resumen de horas extra
  function getFilasTE() {
    const filas = []
    empleados.forEach(emp => {
      const nom = nominas[emp.id]
      if (!nom) return
      dias.forEach((d, i) => {
        const a = getAsist(nom.id, i)
        if (a && (a.te_horas || 0) > 0) {
          filas.push({ emp, a, diaIdx: i, fecha: d })
        }
      })
    })
    return filas
  }

  const filasTE = getFilasTE()

  return (
    <div className="tab-asistencias">
      <div className="asist-header">
        <h3>Asistencias</h3>
        <div className="leyenda">
          {[['A','#EAF3DE','#97C459'],['F','#FCEBEB','#F09595'],['D','#F1EFE8','#B4B2A9'],['V','#E6F1FB','#85B7EB'],['PSG','#FAEEDA','#EF9F27'],['PCG','#EEEDFE','#AFA9EC'],['TXT','#E1F5EE','#5DCAA5'],['SUS','#FCEBEB','#F09595']].map(([c,bg,b]) => (
            <span key={c} className="ley-item">
              <i style={{ background: bg, border: `0.5px solid ${b}` }}></i>{c}
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
                    const fecha  = d.toISOString().split('T')[0]
                    const a      = getAsist(nom.id, i)
                    const codigo = a?.codigo     || (i === dias.length - 1 ? 'D' : 'A')
                    const teHrs  = a?.te_horas   || 0
                    const retMin = a?.retardo_min || 0
                    const motivo = a?.te_motivo  || ''

                    const bgColor =
                      codigo === 'A' ? '#EAF3DE' :
                      codigo === 'F' ? '#FCEBEB' :
                      codigo === 'D' ? '#F1EFE8' :
                      codigo === 'V' ? '#E6F1FB' :
                      codigo === 'PSG' ? '#FAEEDA' :
                      codigo === 'PCG' ? '#EEEDFE' :
                      codigo === 'TXT' ? '#E1F5EE' : '#FCEBEB'

                    return (
                      <React.Fragment key={i}>
                        <td className="td-asist bl" style={{ background: bgColor }}>
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

      {/* Resumen horas extra */}
      <div className="resumen-te-section">
        <h4 className="resumen-te-title">Resumen de horas extra</h4>
        {filasTE.length === 0 ? (
          <p className="empty-te">Sin horas extra registradas esta semana</p>
        ) : (
          <table className="tabla-resumen-te">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Día</th>
                <th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Horas</th>
                <th>Motivo</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {filasTE.map(({ emp, a, diaIdx, fecha }, idx) => {
                const dDR   = emp.sd_real / 7
                const monto = (a.te_horas || 0) * (dDR / 8) * 2
                return (
                  <tr key={idx}>
                    <td><div className="td-nombre">{emp.nombre}</div><div className="td-area">{emp.area}</div></td>
                    <td>{DIAS_SEMANA[diaIdx] || ''}</td>
                    <td>{fecha.getDate()} {MESES_CORTO[fecha.getMonth()]}</td>
                    <td style={{ textAlign: 'right' }} className="bold">{a.te_horas}h</td>
                    <td>{a.te_motivo || '—'}</td>
                    <td style={{ textAlign: 'right' }} className="blue">{fmt(monto)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="tr-totales">
                <td colSpan="3">Total horas extra</td>
                <td style={{ textAlign: 'right' }} className="bold">
                  {filasTE.reduce((s, { a }) => s + (a.te_horas || 0), 0)}h
                </td>
                <td></td>
                <td style={{ textAlign: 'right' }} className="blue bold">
                  {fmt(filasTE.reduce(({ emp, a }, s) => {
                    const dDR = emp.sd_real / 7
                    return s + (a.te_horas || 0) * (dDR / 8) * 2
                  }, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
