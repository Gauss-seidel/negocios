import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [businessId, setBusinessId] = useState(null)

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      extractClaims(session?.user)
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      extractClaims(session?.user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  function extractClaims(user) {
    if (!user?.app_metadata) {
      setUserRole(null)
      setBusinessId(null)
      return
    }

    const role = user.app_metadata.role || null
    const bizId = user.app_metadata.business_id || null

    setUserRole(role)
    setBusinessId(bizId)
  }

  const login = useCallback(async (email, password, captchaToken) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (error) throw error
    return data
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setUserRole(null)
    setBusinessId(null)
  }, [])

  const isSuperAdmin = userRole === ROLES.SUPER_ADMIN
  const isBusinessAdmin = userRole === ROLES.BUSINESS_ADMIN
  const isBarber = userRole === ROLES.BARBER
  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userRole,
        businessId,
        isSuperAdmin,
        isBusinessAdmin,
        isBarber,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
