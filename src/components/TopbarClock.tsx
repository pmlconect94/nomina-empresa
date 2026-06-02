import { useEffect, useState } from 'react';

export function TopbarClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fecha = now.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
  const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="text-sm muted mono" style={{ marginRight: 8 }}>
      <span style={{ textTransform: 'capitalize' }}>{fecha}</span> · {hora}
    </div>
  );
}
