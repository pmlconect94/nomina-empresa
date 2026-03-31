import React, { useState } from 'react'
import { supabase, DIAS_SEMANA, CODIGOS_ASISTENCIA, MOTIVOS_TE } from '../../lib/supabase'

export default function TabAsistencias({ semana, nominas, empleados, asistencias, canEdit, onRefresh }) {
  const [saving, setSaving] = useState({})

  function getDias() {
    const dias = []
    const ini = new Date(semana.fecha_inicio + 'T12:00:00')
    const fin = new Date(semana.fecha_fin + 'T12:00:00')
    for (let d = new Date(ini); d <= fin; d.setDate(d.getDate()+1)) {
      dias.push(new Date(d))
    }
    return dias
  }

  const dias = getDias()

  function getAsist(nomId, diaIdx) {
    const lista = asistencias[nomId] || []
    return lista.find(a => a.dia_index === diaIdx)
  }

  async function updateAsist(nomId, diaIdx, fecha, campo, valor) {
    const key = `${nomId}_${diaIdx}_${campo}`
    setSaving(s => ({...s, [key]: true}))
    const existe = getAsist(nomId, diaIdx)
    if (existe) {
      await supabase.from('asistencias').update({ [campo]: valor }).eq('id', existe.id)
    } else {
      await supabase.from('asistencias').insert({
        nomina_id: nomId, dia_index: diaIdx, fecha,
        codigo: campo === 'codigo' ? valor : 'A',
        te_horas: campo === 'te_horas' ? valor : 0,
        te_motivo: campo === 'te_motivo' ? valor : '',
        retardo_min: campo === 'retardo_min' ? valor : 0,
      })
    }
    await onRefresh()
    setSaving(s => ({...s, [key]: false}))
  }

  const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

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
              {dias.map((d,i) => (
                <th key={i} className="th-dia" colSpan="4">
                  {DIAS_SEMANA[i] || ''} {d.getDate()} {MESES_CORTO[d.getMonth()]}
                </th>
              ))}
            </tr>
            <tr>
              <th className="th-emp-asist"></th>
              {dias.map((_,i) => (
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
                  {dias.map((d,i) => {
                    const fecha = d.toISOString().split('T')[0]
                    const a = getAsist(nom.id, i)
                    const codigo = a?.codigo || (i === dias.length-1 ? 'D' : 'A')
                    const teHrs = a?.te_horas || 0
                    const retMin = a?.retardo_min || 0
                    const motivo = a?.te_motivo || ''
                    return (
                      <React.Fragment key={i}>
                        <td className={`td-asist bl asist-${codigo}`}>
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
                          <input className="inp-asist" type="number" value={retMin||''} min="0" step="0.25"
                            placeholder="0" disabled={!canEdit}
                            onChange={e => updateAsist(nom.id, i, fecha, 'retardo_min', +e.target.value)} />
                        </td>
                        <td className="td-asist">
                          <input className="inp-asist" type="number" value={teHrs||''} min="0" step="0.5"
                            placeholder="0" disabled={!canEdit}
                            onChange={e => updateAsist(nom.id, i, fecha, 'te_horas', +e.target.value)} />
                        </td>
                        <td className="td-asist">
                          <select className="sel-motivo" value={motivo} disabled={!canEdit || teHrs===0}
                            onChange={e => updateAsist(nom.id, i, fecha, 'te_motivo', e.target.value)}>
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
    </div>
  )
}
