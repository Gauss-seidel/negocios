import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const { businessId } = useAuth()
  const [branches, setBranches] = useState([])
  const [currentBranch, setCurrentBranch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) {
      setBranches([])
      setCurrentBranch(null)
      setLoading(false)
      return
    }

    const savedId = localStorage.getItem(`branch_${businessId}`)

    supabase
      .from('branches')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        const list = data || []
        setBranches(list)

        let selected = null
        if (savedId) {
          selected = list.find(b => b.id === savedId)
        }
        if (!selected && list.length > 0) {
          selected = list[0]
        }
        setCurrentBranch(selected)
        setLoading(false)
      })
  }, [businessId])

  const switchBranch = useCallback((branchId) => {
    const found = branches.find(b => b.id === branchId)
    if (found) {
      setCurrentBranch(found)
      localStorage.setItem(`branch_${businessId}`, branchId)
    }
  }, [branches, businessId])

  return (
    <BranchContext.Provider value={{
      branches,
      currentBranch,
      branchCount: branches.length,
      switchBranch,
      loading,
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error('useBranch debe usarse dentro de un BranchProvider')
  }
  return context
}
