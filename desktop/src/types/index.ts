// User types
export interface User {
  id: string
  username: string
  status: UserStatus
  created_at: string
  updated_at: string
}

export type UserStatus = 'available' | 'offline'

// Friendship types
export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined'

export interface Friend extends User {
  friendship_id: string
  friendship_status: FriendshipStatus
}

// Presence types
export interface Presence {
  user_id: string
  socket_id?: string
  in_call_with?: string
  updated_at: string
}

// WebRTC types
export interface CallState {
  isActive: boolean
  isPTTPressed: boolean
  connectedUserId?: string
  localStream?: MediaStream
  remoteStream?: MediaStream
}

// Auth types
export interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
  error: string | null
}

// Socket event types
export interface SocketEvents {
  // Client -> Server
  authenticate: { token: string }
  update_status: { status: UserStatus }
  call_initiate: { toUserId: string }
  call_accept: { fromUserId: string }
  call_decline: { fromUserId: string }
  call_end: { callId?: string }

  // Server -> Client
  authenticated: { userId: string }
  presence_update: { userId: string; status: UserStatus }
  friend_online: { userId: string; username: string }
  friend_offline: { userId: string }
  incoming_call: { fromUserId: string; username: string }
  call_accepted: { userId: string }
  call_declined: { userId: string }
  call_ended: { userId: string }
  error: { message: string; code: string }
}

// Window type for Electron IPC
declare global {
  interface Window {
    electron?: {
      startPTT: () => Promise<{ success: boolean }>
      stopPTT: () => Promise<{ success: boolean }>
    }
  }
}

export {}
