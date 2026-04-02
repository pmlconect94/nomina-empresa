import React from 'react'
import { fmt, fmtPeriodo, MESES } from '../../lib/supabase'

export default function TabPrestamosResumen({ prestamos, descMap, semana }) {
  const totalDesc = Object.values(descMap).reduce((s, v) => s + v, 0)

  function fmtFecha(str) {
    if (!str) return '—'
    const d = new Date(str + 'T12:00:00')
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`
  }

  return (
    <div className="tab-prestamos-resumen">
      <div className="resumen-header">
        <div>
          <h3>Préstamos activos esta nómina</h3>
          <p>{fmtPeriodo(semana.fecha_inicio, semana.fecha_fin)} · Solo empleados con descuento aplicable</p>
        </div>
        <div className="tcard blue" style={{minWidth:200}}>
          <label>Total descuento esta nómina</label>
          <div className="tval">{fmt(totalDesc)}</div>
        </div>
      </div>

      {prestamos.length === 0 ? (
        <div className="empty-state">No hay préstamos con descuento aplicable en este período</div>
      ) : (
        <div className="tabla-card">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Fecha préstamo</th>
                <th>Tipo</th>
                <th style={{textAlign:'right'}}>Monto original</th>
                <th style={{textAlign:'right'}}>Saldo pendiente</th>
                <th style={{textAlign:'right'}}>Descuento esta nómina</th>
                <th style={{textAlign:'right'}}>Saldo después</th>
              </tr>
            </thead>
            <tbody>
              {prestamos.map(p => {
                const desc = descMap[p.empleado_id] || 0
                const saldoDespues = Math.max(0, p.saldo - desc)
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="td-nombre">{p.empleado?.nombre || '—'}</div>
                      <div className="td-area">{p.empleado?.area || ''}</div>
                    </td>
                    <td>{fmtFecha(p.fecha_prestamo)}</td>
                    <td><span className="tipo-pill">{p.tipo === 'semanal' ? 'Semanal 10%' : 'Quincenal 20%'}</span></td>
                    <td style={{textAlign:'right'}} className="bold">{fmt(p.monto)}</td>
                    <td style={{textAlign:'right'}} className="orange">{fmt(p.saldo)}</td>
                    <td style={{textAlign:'right'}} className="red bold">-{fmt(desc)}</td>
                    <td style={{textAlign:'right'}} className={saldoDespues === 0 ? 'green' : 'orange'}>
                      {saldoDespues === 0 ? 'Liquidado' : fmt(saldoDespues)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="tr-totales">
                <td colSpan="5">Total descuento</td>
                <td style={{textAlign:'right'}} className="red bold">-{fmt(totalDesc)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
