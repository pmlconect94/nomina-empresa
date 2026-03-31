import React, { useState } from 'react'
import { supabase, fmt, fmtPeriodo } from '../../lib/supabase'

export default function TabFiscal({ calcData, nominas, semana, canEdit, onRefresh }) {
  const [vals, setVals] = useState({})

  function getVal(empId, campo) {
    if (vals[`${empId}_${campo}`] !== undefined) return vals[`${empId}_${campo}`]
    const nom = nominas[empId]
    return nom?.[campo] || 0
  }

  async function update(empId, campo, valor) {
    setVals(v => ({...v, [`${empId}_${campo}`]: valor}))
    const nom = nominas[empId]
    if (nom) await supabase.from('nominas').update({ [campo]: +valor }).eq('id', nom.id)
  }

  const totISR   = calcData.reduce((s,d) => s + getVal(d.empleado.id,'isr'), 0)
  const totIMSS  = calcData.reduce((s,d) => s + getVal(d.empleado.id,'imss'), 0)
  const totDep   = calcData.reduce((s,d) => s + getVal(d.empleado.id,'deposito_total'), 0)
  const totVales = calcData.reduce((s,d) => s + d.empleado.sd_fiscal*0.10, 0)

  return (
    <div className="tab-fiscal">
      <div className="resumen-header">
        <div>
          <h3>Fiscal</h3>
          <p>{fmtPeriodo(semana.fecha_inicio, semana.fecha_fin)} · Captura ISR e IMSS de tu sistema fiscal</p>
        </div>
        <button className="btn-imprimir" onClick={() => window.print()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimir
        </button>
      </div>

      <div className="totales-cards">
        <div className="tcard red"><label>Total ISR</label><div className="tval">{fmt(totISR)}</div></div>
        <div className="tcard red"><label>Total IMSS</label><div className="tval">{fmt(totIMSS)}</div></div>
        <div className="tcard orange"><label>Total depósito</label><div className="tval">{fmt(totDep)}</div></div>
        <div className="tcard orange"><label>Total vales</label><div className="tval">{fmt(totVales)}</div></div>
      </div>

      <div className="tabla-scroll">
        <table className="tabla-fiscal">
          <thead>
            <tr>
              <th rowSpan="2" className="th-emp">Empleado</th>
              <th className="sec-hdr" colSpan="4">Información fiscal</th>
              <th className="sep"></th>
              <th className="sec-hdr" colSpan="3">Distribución del pago</th>
            </tr>
            <tr>
              <th>Sueldo fiscal</th>
              <th>Prev. social</th>
              <th>ISR</th>
              <th>IMSS</th>
              <th className="sep"></th>
              <th>Dep. total</th>
              <th>Vales</th>
              <th>Dep. banco</th>
            </tr>
          </thead>
          <tbody>
            {calcData.map(({ empleado: e }) => {
              const vales = e.sd_fiscal * 0.10
              const isr = getVal(e.id,'isr')
              const imss = getVal(e.id,'imss')
              const dep = getVal(e.id,'deposito_total')
              const depBanco = Math.max(0, dep - vales)
              return (
                <tr key={e.id}>
                  <td className="td-emp"><div className="td-nombre">{e.nombre}</div><div className="td-area">{e.area}</div></td>
                  <td className="orange">{fmt(e.sd_fiscal)}</td>
                  <td className="orange">{fmt(vales)}</td>
                  <td>
                    {canEdit
                      ? <input className="inp-fiscal" type="number" value={isr} min="0" onChange={e2 => update(e.id,'isr',e2.target.value)} />
                      : <span className="orange">{fmt(isr)}</span>}
                  </td>
                  <td>
                    {canEdit
                      ? <input className="inp-fiscal" type="number" value={imss} min="0" onChange={e2 => update(e.id,'imss',e2.target.value)} />
                      : <span className="orange">{fmt(imss)}</span>}
                  </td>
                  <td className="sep"></td>
                  <td>
                    {canEdit
                      ? <input className="inp-dep" type="number" value={dep} min="0" onChange={e2 => update(e.id,'deposito_total',e2.target.value)} />
                      : <span className="orange">{fmt(dep)}</span>}
                  </td>
                  <td className="orange">{fmt(vales)}</td>
                  <td className="orange">{fmt(depBanco)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="tr-totales">
              <td>Totales</td>
              <td colSpan="2"></td>
              <td className="red">{fmt(totISR)}</td>
              <td className="red">{fmt(totIMSS)}</td>
              <td className="sep"></td>
              <td className="orange">{fmt(totDep)}</td>
              <td className="orange">{fmt(totVales)}</td>
              <td className="orange">{fmt(Math.max(0,totDep-totVales))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
