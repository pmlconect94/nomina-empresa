import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './lib/auth';
import { EmpresaProvider } from './lib/empresas';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EmpresaProvider>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </EmpresaProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
