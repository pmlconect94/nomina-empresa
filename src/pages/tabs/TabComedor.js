import React, { useState, useEffect } from 'react'
import { supabase, fmt } from '../../lib/supabase'

const COSTO_POR_DIA = 30 // Costo fijo estipulado por día de comedor

export default function TabComedor({ semana, nominas, empleados, canEdit, onRefresh }) {
  // Estado local para evitar lag de escritura: { nomina_id: dias }
  const [localDias, setLocalDias] = useState({})

  useEffect(() => {
    const init = {}
    empleados.forEach(emp => {
      const nom = nominas[emp.id]
      if (nom) {
        // Obtenemos los días aproximados en base a la deducción actual
        const montoComedor = parseFloat(nom.comedor || 0)
        init[nom.id] = Math.max(0, Math.min(5, Math.floor(montoComedor / COSTO_POR_DIA)))
      }
    })
    setLocalDias(init)
  }, [empleados, nominas])

  async function actualizarComedor(empId, nomId, diasStr) {
    let dias = parseInt(diasStr, 10)
    if (isNaN(dias)) dias = 0
    if (dias < 0) dias = 0
    if (dias > 5) dias = 5

    // Actualización optimista local
    setLocalDias(prev => ({ ...prev, [nomId]: dias }))
    
    // Calcular deducción aplicable
    const monto = dias * COSTO_POR_DIA

    // Bugfix: Inyectar la modificación directamente en el objeto 'nominas' del padre
    // Importante: 'nominas' está mapeado usando empId como llave, no nomId!
    if (nominas && nominas[empId]) {
      nominas[empId].comedor = monto
    }

    // Persistir a DB directamente
    try {
      await supabase.from('nominas').update({ comedor: monto }).eq('id', nomId)
    } catch (err) {
      console.error("Error guardando comedor:", err)
    }
  }

  // Resumen total del comedor (para pie de la tabla)
  const totalDias = Object.values(localDias).reduce((a, b) => a + b, 0)
  const totalMonto = totalDias * COSTO_POR_DIA

  return (
    <div className="tab-asistencias">
      <div className="asist-header">
        <div>
          <h3>Asignación de Comedor</h3>
          <p className="subtitle" style={{ fontSize: 13, color: 'var(--text2)' }}>
            Permite un máximo de 5 días por empleado. Costo por día: <strong>{fmt(COSTO_POR_DIA)}</strong> 
          </p>
        </div>
      </div>

      <div className="asist-scroll" style={{ maxWidth: '600px' }}>
        <table className="tabla-asist tabla-resumen">
          <thead>
            <tr>
              <th className="th-emp-asist">Empleado</th>
              <th>Días de comedor (0-5)</th>
              <th style={{ textAlign: 'right' }}>Monto a descontar</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map(emp => {
              const nom = nominas[emp.id]
              if (!nom) return null

              const dias = localDias[nom.id] ?? 0
              const monto = dias * COSTO_POR_DIA

              return (
                <tr key={emp.id}>
                  <td className="td-emp">
                    <div className="td-nombre">{emp.nombre}</div>
                    <div className="td-area">{emp.area}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      className="inp-asist"
                      style={{ width: '80px', textAlign: 'center', margin: '0 auto', display: 'block' }}
                      value={dias === 0 ? '' : dias}
                      min="0"
                      max="5"
                      step="1"
                      placeholder="0"
                      disabled={!canEdit}
                      onChange={e => actualizarComedor(emp.id, nom.id, e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }} className={monto > 0 ? "neg" : "zero"}>
                    {monto > 0 ? `-${fmt(monto)}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="tr-totales">
              <td>Total General</td>
              <td style={{ textAlign: 'center' }}>{totalDias} días</td>
              <td style={{ textAlign: 'right' }} className="neg bold">-{fmt(totalMonto)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
