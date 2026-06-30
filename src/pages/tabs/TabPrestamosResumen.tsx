import { fmt, fmtFecha } from '@/lib/format';

export function TabPrestamosResumen({ prestamos, descMap }: any) {
  const total = Object.values(descMap as Record<string, number>).reduce((s, v) => s + v, 0);
  return (
    <div>
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="card-title">Préstamos con descuento esta nómina</h3>
        <div className="kpi" style={{ minWidth: 200 }}><span className="kpi-label">Total descuento</span><span className="kpi-value blue">{fmt(total)}</span></div>
      </div>
      {prestamos.length === 0 ? (
        <div className="card"><div className="empty"><div className="empty-title">Sin descuentos aplicables en este período</div></div></div>
      ) : (
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Empleado</th><th>Fecha préstamo</th><th>Tipo</th><th className="right">Monto</th><th className="right">Saldo</th><th className="right">Descuento</th><th className="right">Saldo después</th></tr></thead>
            <tbody>
              {prestamos.map((p: any) => {
                const descBase = p.descuento_nomina != null ? Number(p.descuento_nomina) : p.monto * 0.1;
                const desc = Math.min(descBase, p.saldo);
                const despues = Math.max(0, p.saldo - desc);
                return (
                  <tr key={p.id}>
                    <td><div className="fw-600">{p.empleado?.nombre || '—'}</div><div className="text-xs muted">{p.empleado?.area || ''}</div></td>
                    <td className="muted">{fmtFecha(p.fecha_prestamo)}</td>
                    <td><span className="badge badge-gray">{p.tipo === 'semanal' ? 'Semanal' : 'Quincenal'}</span></td>
                    <td className="right mono">{fmt(p.monto)}</td>
                    <td className="right mono orange">{fmt(p.saldo)}</td>
                    <td className="right mono neg">-{fmt(desc)}</td>
                    <td className={`right mono ${despues === 0 ? 'pos' : 'orange'}`}>{despues === 0 ? 'Liquidado' : fmt(despues)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
