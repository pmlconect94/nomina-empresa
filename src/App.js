import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Main from './pages/Main'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [userRol, setUserRol] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRol(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchRol(session.user.id)
      else { setUserRol(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchRol(userId) {
    const { data } = await supabase
      .from('usuarios_roles')
      .select('rol, nombre')
      .eq('user_id', userId)
      .single()
    setUserRol(data)
    setLoading(false)
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p>Cargando...</p>
    </div>
  )

  if (!session) return <Login />

  if (!userRol) return (
    <div className="loading-screen">
      <div className="no-access-card">
        <h2>Acceso pendiente</h2>
        <p>Tu cuenta <strong>{session.user.email}</strong> está esperando autorización del administrador.</p>
        <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
    </div>
  )

  return <Main session={session} userRol={userRol} />
}
