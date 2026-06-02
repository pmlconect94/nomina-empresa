import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmpleadosPage } from '@/pages/EmpleadosPage';
import { NominasPage } from '@/pages/NominasPage';
import { NominaDetallePage } from '@/pages/NominaDetallePage';
import { PrestamosPage } from '@/pages/PrestamosPage';
import { UsuariosPage } from '@/pages/UsuariosPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="empleados" element={<EmpleadosPage />} />
        <Route path="nominas" element={<NominasPage />} />
        <Route path="nominas/:semanaId" element={<NominaDetallePage />} />
        <Route path="prestamos" element={<PrestamosPage />} />
        <Route path="vacaciones" element={<PlaceholderPage title="Vacaciones" subtitle="Próximamente (fase F4)" />} />
        <Route path="usuarios" element={<UsuariosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}
