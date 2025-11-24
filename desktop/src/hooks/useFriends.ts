import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Friend } from '@/types'

export const useFriends = (userId: string | null) => {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setFriends([])
      setLoading(false)
      return
    }

    loadFriends()

    // Subscribe to friendship changes
    const friendshipsChannel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadFriends()
        }
      )
      .subscribe()

    // Subscribe to user status changes
    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          setFriends((prev) =>
            prev.map((friend) =>
              friend.id === payload.new.id
                ? { ...friend, status: payload.new.status }
                : friend
            )
          )
        }
      )
      .subscribe()

    return () => {
      friendshipsChannel.unsubscribe()
      usersChannel.unsubscribe()
    }
  }, [userId])

  const loadFriends = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      // Get all friendships where user is involved
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

      if (friendshipsError) throw friendshipsError

      if (!friendships || friendships.length === 0) {
        setFriends([])
        return
      }

      // Get friend IDs
      const friendIds = friendships.map((f) =>
        f.user_id === userId ? f.friend_id : f.user_id
      )

      // Get friend user data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', friendIds)

      if (usersError) throw usersError

      // Combine data
      const friendsData: Friend[] = (users || []).map((user) => {
        const friendship = friendships.find(
          (f) => f.user_id === user.id || f.friend_id === user.id
        )!

        return {
          ...user,
          friendship_id: friendship.id,
          friendship_status: friendship.status,
        }
      })

      setFriends(friendsData)
    } catch (err: any) {
      console.error('Load friends error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { friends, loading, error, refresh: loadFriends }
}
