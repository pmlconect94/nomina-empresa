import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// ── Multi-empresa ─────────────────────────────────────────────
// Cada empleado y cada nómina pertenece a una empresa (columna `empresa`).
// Aquí vive la config por empresa (nombre, razón social, cuentas de vales/Banorte).

export type EmpresaCode = 'PML' | 'MARLIN';

export type Empresa = {
  code: EmpresaCode;
  nombre: string;        // nombre corto (UI / encabezados)
  razonSocial: string;   // razón social (impresiones)
  areas: string[];       // áreas para el dropdown del catálogo
  vales?: { idCuenta: string; producto: string };          // EasyVale / Toka
  banorte?: { emisora: string; cuentaCargo: string };      // dispersión Banorte (.pag)
};

export const EMPRESAS: Empresa[] = [
  {
    code: 'PML',
    nombre: 'Productos Marinos Lizárraga',
    razonSocial: 'Productos Marinos Lizarraga, S. de R.L. de C.V.',
    areas: ['Administración', 'Cobranza', 'Contabilidad', 'Logistica/Almacen', 'Recursos Humanos', 'Ventas'],
    vales: { idCuenta: '26260', producto: 'EASYVALE CHIP' },
    banorte: { emisora: '21659', cuentaCargo: '0265911011' },
  },
  {
    code: 'MARLIN',
    nombre: 'Marlin Lizárraga',
    razonSocial: 'Marlin Lizárraga', // TODO: razón social exacta de Marlin
    areas: ['Administración', 'Empaque', 'Estilado', 'Fileteado', 'Hornos', 'Inyección', 'Mantenimiento', 'Parrillas', 'Producción', 'Recursos Humanos', 'Salmon', 'Subida de Tambos'],
    // vales / banorte: pendientes de los datos de Marlin
  },
];

export const getEmpresa = (code?: string | null): Empresa =>
  EMPRESAS.find((e) => e.code === code) || EMPRESAS[0];

type Ctx = { empresa: Empresa; code: EmpresaCode; setCode: (c: EmpresaCode) => void };
const EmpresaContext = createContext<Ctx | null>(null);
const KEY = 'pml_empresa_activa';

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState<EmpresaCode>(() => {
    const saved = localStorage.getItem(KEY);
    return saved === 'PML' || saved === 'MARLIN' ? saved : 'PML';
  });
  const setCode = (c: EmpresaCode) => { localStorage.setItem(KEY, c); setCodeState(c); };
  const value = useMemo(() => ({ empresa: getEmpresa(code), code, setCode }), [code]);
  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa fuera de EmpresaProvider');
  return ctx;
}
