import React, { useState } from 'react';
import type { Friend } from '../../types';
import { supabase } from '../../lib/supabase';

interface BuddyListDrawerProps {
  friends: Friend[];
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (id: string) => void;
}

export const BuddyListDrawer: React.FC<BuddyListDrawerProps> = ({
  friends,
  currentUserId,
  isOpen,
  onClose,
  onSelectFriend,
}) => {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pending = friends.filter(f => f.friendship_status === 'pending');
  const accepted = friends.filter(f => f.friendship_status === 'accepted');

  const handleAccept = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      // Supabase realtime will auto-refresh the list
    } catch (err: any) {
      console.error('Accept friend error:', err);
    }
  };

  const handleDecline = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      // Supabase realtime will auto-refresh the list
    } catch (err: any) {
      console.error('Decline friend error:', err);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Find user by username
      const { data: targetUser, error: findError } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username.toLowerCase().trim())
        .single();

      if (findError || !targetUser) {
        setError('User not found');
        return;
      }

      if (targetUser.id === currentUserId) {
        setError("You can't add yourself");
        return;
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .or(`user_id.eq.${targetUser.id},friend_id.eq.${targetUser.id}`)
        .single();

      if (existing) {
        setError('Friend request already sent or you are already friends');
        return;
      }

      // Send friend request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: targetUser.id,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setUsername('');
      setTimeout(() => {
        setShowAddFriend(false);
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Add friend error:', err);
      setError(err.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`
        fixed right-0 top-0 bottom-0 w-80 bg-bone border-l-2 border-ink
        transform transition-transform duration-300 z-50
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-4 border-b-2 border-ink flex justify-between items-center">
          <h2 className="font-mono font-bold uppercase tracking-wider">Friends</h2>
          <button onClick={onClose} className="text-2xl hover:text-signal transition-colors">×</button>
        </div>

        {/* Pending Requests */}
        {pending.length > 0 && (
          <div className="p-4 border-b border-concrete">
            <h3 className="text-xs uppercase font-bold mb-2 text-ink/60">Pending Requests</h3>
            {pending.map(friend => (
              <div key={friend.id} className="flex items-center justify-between mb-2 p-2 bg-concrete/30 border border-ink/10">
                <span className="text-sm font-mono">{friend.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(friend.friendship_id)}
                    className="px-2 py-1 bg-led text-ink text-xs font-bold border border-ink hover:shadow-hard-sm transition-all"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleDecline(friend.friendship_id)}
                    className="px-2 py-1 bg-error text-white text-xs font-bold border border-ink hover:shadow-hard-sm transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friend List */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {accepted.length === 0 ? (
            <div className="text-center text-ink/40 text-sm py-8">
              No friends yet. Add some below!
            </div>
          ) : (
            accepted.map(friend => (
              <button
                key={friend.id}
                onClick={() => {
                  onSelectFriend(friend.id);
                  onClose();
                }}
                className="w-full p-2 flex items-center gap-2 hover:bg-concrete rounded mb-1 transition-colors border border-transparent hover:border-ink"
              >
                <div className={`w-2 h-2 rounded-full ${
                  friend.status === 'active' ? 'bg-led shadow-[0_0_4px_#00FF41]' :
                  friend.status === 'away' ? 'bg-yellow-500' :
                  friend.status === 'dnd' ? 'bg-red-500' :
                  'bg-concrete'
                }`} />
                <span className="font-mono text-sm">{friend.username}</span>
              </button>
            ))
          )}
        </div>

        {/* Add Friend Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-ink bg-bone">
          <button
            onClick={() => setShowAddFriend(true)}
            className="w-full py-2 bg-signal text-white font-bold border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase text-sm"
          >
            + Add Friend
          </button>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setShowAddFriend(false)}>
          <div className="bg-bone border-2 border-ink shadow-hard p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-mono font-bold uppercase">Add Friend</h3>
              <button onClick={() => setShowAddFriend(false)} className="text-2xl hover:text-signal">×</button>
            </div>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold mb-1 text-ink/60">Username</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border-2 border-ink bg-concrete focus:outline-none focus:border-signal font-mono"
                  placeholder="friend_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  disabled={loading || success}
                />
              </div>

              {error && (
                <div className="p-2 bg-error text-white text-sm border border-ink">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-2 bg-led text-ink text-sm border border-ink font-bold">
                  Friend request sent! ✓
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-signal text-white font-bold border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || success || !username.trim()}
              >
                {loading ? 'Sending...' : success ? 'Sent!' : 'Send Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
