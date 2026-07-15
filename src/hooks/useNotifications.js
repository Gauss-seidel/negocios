import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useNotifications() {
  const { user, businessId } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !businessId) return
    fetchNotifications()

    // Realtime: escuchar nuevas notificaciones
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, businessId])

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.is_read).length)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }, [user?.id])

  const markAllAsRead = useCallback(async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false)

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }, [user?.id])

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
