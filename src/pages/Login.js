import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      const msg = error.message || ''
      if (msg.includes('Invalid login credentials'))
        setError('Correo o contraseña incorrectos. Verifica tus datos.')
      else if (msg.includes('Email not confirmed'))
        setError('El correo no ha sido confirmado. Contacta al administrador.')
      else if (msg.includes('User not found'))
        setError('No existe un usuario con ese correo.')
      else
        setError(msg)
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo" style={{ background: 'transparent', margin: '0 auto 10px', width: '100%', textAlign: 'center' }}>
          <img src="/logo.png" alt="PML Logo" style={{ width: '220px', height: 'auto' }} />
        </div>
        <h1>PML CONNECT</h1>
        <p>Productos Marinos Lizárraga</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-field">
            <label>Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="correo@empresa.com"
              autoComplete="email"
              autoFocus
              required
              disabled={loading}
            />
          </div>

          <div className="form-field login-pass-wrap">
            <label>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                className="btn-show-pass"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
                title={showPass ? 'Ocultar' : 'Mostrar'}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="btn-login"
            disabled={loading || !email || !password}
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
