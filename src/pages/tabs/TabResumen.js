import React from 'react'
import { fmt, fmtPeriodo } from '../../lib/supabase'

export default function TabResumen({ calcData, semana }) {
  const totales = calcData.reduce((acc, d) => {
    acc.perc  += d.calc.totalPerc
    acc.ded   += d.calc.totalDed
    acc.neto  += d.calc.neto
    acc.dep   += d.calc.deposito
    return acc
  }, { perc:0, ded:0, neto:0, dep:0 })

  function imprimir() { window.print() }

  return (
    <div className="tab-resumen">
      <div className="resumen-header">
        <div>
          <h3>Resumen de nómina</h3>
          <p>{fmtPeriodo(semana.fecha_inicio, semana.fecha_fin)} · Se actualiza conforme capturas incidencias</p>
        </div>
        <button className="btn-imprimir" onClick={imprimir}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimir
        </button>
      </div>

      <div className="totales-cards">
        <div className="tcard"><label>Total percepciones</label><div className="tval">{fmt(totales.perc)}</div></div>
        <div className="tcard red"><label>Total deducciones</label><div className="tval">{fmt(totales.ded)}</div></div>
        <div className="tcard green"><label>Total neto a pagar</label><div className="tval">{fmt(totales.neto)}</div></div>
        <div className="tcard orange"><label>Total depósito banco</label><div className="tval">{fmt(totales.dep)}</div></div>
      </div>

      <div className="print-only-header" style={{display:'none'}}>
        <strong>Nómina {semana.tipo} — {fmtPeriodo(semana.fecha_inicio, semana.fecha_fin)}</strong>
      </div>

      <div className="tabla-scroll">
        <table className="tabla-resumen">
          <thead>
            <tr>
              <th rowSpan="2" className="th-emp">Empleado</th>
              <th className="sec-hdr" colSpan="6">Percepciones</th>
              <th className="sep"></th>
              <th className="sec-hdr" colSpan="4">Deducciones</th>
              <th className="sep"></th>
              <th className="sec-hdr" colSpan="1">Resultado</th>
              <th className="sep"></th>
              <th className="sec-hdr" colSpan="3">Distribución del pago</th>
            </tr>
            <tr>
              <th>Asistencias</th><th>7mo día</th><th>Faltas</th><th>T. extra</th><th>Viajes</th><th>Retroactivos</th>
              <th className="sep"></th>
              <th>Infonavit</th><th>Comedor</th><th>Retardos</th><th>Préstamos</th>
              <th className="sep"></th>
              <th className="th-neto">Neto a pagar</th>
              <th className="sep"></th>
              <th>Dep. total</th><th>Vales</th><th>Dep. banco</th>
            </tr>
          </thead>
          <tbody>
            {calcData.map(({ empleado: e, calc: c }) => (
              <tr key={e.id}>
                <td className="td-emp"><div className="td-nombre">{e.nombre}</div><div className="td-area">{e.area}</div></td>
                <td className="pos">{fmt(c.asistMonto)}</td>
                <td className="pos">{fmt(c.septimo)}</td>
                <td className={c.diasF>0?'neg':'zero'}>{c.diasF>0?'-'+fmt(c.diasF*(c.dDR)):'—'}</td>
                <td className={c.te>0?'pos':'zero'}>{c.te>0?fmt(c.te):'—'}</td>
                <td className={c.incentivos>0?'pos':'zero'}>{c.incentivos>0?fmt(c.incentivos):'—'}</td>
                <td className={c.retroactivos>0?'pos':'zero'}>{c.retroactivos>0?fmt(c.retroactivos):'—'}</td>
                <td className="sep"></td>
                <td className={c.infonavit>0?'neg':'zero'}>{c.infonavit>0?'-'+fmt(c.infonavit):'—'}</td>
                <td className={c.comedor>0?'neg':'zero'}>{c.comedor>0?'-'+fmt(c.comedor):'—'}</td>
                <td className={c.retardoMonto>0?'neg':'zero'}>{c.retardoMonto>0?'-'+fmt(c.retardoMonto):'—'}</td>
                <td className="zero">—</td>
                <td className="sep"></td>
                <td className="td-neto">{fmt(c.neto)}</td>
                <td className="sep"></td>
                <td className="orange">{fmt(c.deposito)}</td>
                <td className="orange">{fmt(c.vales)}</td>
                <td className="orange">{fmt(c.depositoBanco)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tr-totales">
              <td>Totales</td>
              <td colSpan="6"></td>
              <td className="sep"></td>
              <td colSpan="4"></td>
              <td className="sep"></td>
              <td className="td-neto">{fmt(totales.neto)}</td>
              <td className="sep"></td>
              <td colSpan="2"></td>
              <td className="orange">{fmt(totales.dep)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
