import React, { useRef, useEffect, useState } from 'react';
import type { User, Friend, UserStatus } from '../../types';
import { Avatar } from './Avatar';
import { BuddyListDrawer } from './BuddyListDrawer';
import { StatusPicker } from './StatusPicker';

interface FriendWheelProps {
  friends: Friend[];
  currentUser: User;
  currentUserStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
  selectedFriendId: string | null;
  onSelectFriend: (id: string) => void;
  onStartTalking: () => void;
  onStopTalking: () => void;
  isTalking: boolean;
  isListening: boolean;
  receivingFrom: { userId: string; username: string } | null;
  isWebRTCConnected: boolean;
}

export const FriendWheel: React.FC<FriendWheelProps> = ({
  friends,
  currentUser,
  currentUserStatus,
  onStatusChange,
  selectedFriendId,
  onSelectFriend,
  onStartTalking,
  onStopTalking,
  isTalking,
  isListening,
  receivingFrom,
  isWebRTCConnected
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusText, setStatusText] = useState(currentUser.status || '');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Audio Visualizer State
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const ITEM_HEIGHT = 48; // Compact height for wheel items

  // Auto-select first friend on mount or when friends change
  useEffect(() => {
    if (friends.length > 0 && !selectedFriendId) {
      onSelectFriend(friends[0].id);
    }
  }, [friends, selectedFriendId, onSelectFriend]);

  // Map friends to wheel format
  const getStatusLabel = (status: UserStatus): string => {
    switch (status) {
      case 'active': return 'Active'
      case 'away': return 'Away'
      case 'dnd': return 'DND'
      case 'offline': return 'Offline'
      default: return 'Offline'
    }
  }

  const getStatusColor = (status: UserStatus): string => {
    switch (status) {
      case 'active': return 'bg-led'
      case 'away': return 'bg-yellow-500'
      case 'dnd': return 'bg-red-500'
      case 'offline': return 'bg-concrete'
      default: return 'bg-concrete'
    }
  }

  const wheelFriends = friends.map(f => ({
    id: f.id,
    name: f.username,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.username}`,
    status: getStatusLabel(f.status as UserStatus),
    statusValue: f.status as UserStatus,
    isOnline: f.status === 'active' || f.status === 'away',
  }));

  const activeFriend = wheelFriends[activeIndex] || wheelFriends[0];
  const selectedFriend = friends.find(f => f.id === selectedFriendId);

  // Check if PTT is enabled (can send to active/away friends)
  const isPTTEnabled = !!selectedFriend &&
                       (selectedFriend.status === 'active' || selectedFriend.status === 'away') &&
                       isWebRTCConnected &&
                       (currentUserStatus === 'active' || currentUserStatus === 'away'); // Can only send if active/away

  // --- Wheel Logic ---
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    if (index >= 0 && index < wheelFriends.length) {
      setActiveIndex(index);
      onSelectFriend(wheelFriends[index].id);
    }
  };

  // --- Audio / Visualizer Logic ---
  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const initAudio = () => {
    if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64; // Low res for chunky digital look
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
    }
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      analyserRef.current!.getByteFrequencyData(dataArrayRef.current!);
      ctx.clearRect(0, 0, width, height);

      // Draw Digital Bars
      const barWidth = (width / dataArrayRef.current!.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArrayRef.current!.length; i++) {
        barHeight = dataArrayRef.current![i] / 2;

        ctx.fillStyle = `rgba(0, 255, 65, ${barHeight/100 + 0.2})`; // Matrix Green opacity
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  // --- PTT Handlers ---
  const startRecording = () => {
    if (!isPTTEnabled) return;

    onStartTalking();
    initAudio();

    // Kickstart visualizer with mock data if silence
    if (analyserRef.current && dataArrayRef.current) {
         const interval = setInterval(() => {
             if(!isTalking) clearInterval(interval);
             if (dataArrayRef.current) {
                for(let i=0; i<dataArrayRef.current.length; i++) {
                    dataArrayRef.current[i] = Math.random() * 100;
                }
             }
         }, 100);
    }
    drawVisualizer();
  };

  const stopRecording = () => {
    onStopTalking();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Keyboard support for spacebar PTT
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && isPTTEnabled) {
        e.preventDefault();
        startRecording();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPTTEnabled, isTalking]);

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Update user status in Supabase
    setEditingStatus(false);
  };

  return (
    <div className="h-full flex flex-col relative bg-bone text-ink pt-8 font-mono overflow-hidden">

      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>

      {/* --- TOP: VIEWFINDER (40%) --- */}
      <div className="h-[40%] flex flex-col items-center justify-center relative z-10 p-4 border-b-2 border-ink bg-bone">

         {/* Drawer Toggle Button */}
         <div className="absolute top-2 right-2 z-10">
           <button
             onClick={() => setIsDrawerOpen(true)}
             className="w-8 h-8 bg-concrete border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center font-bold text-sm"
             title="Open friends list"
           >
             ☰
           </button>
         </div>

         {/* Status Readout */}
         <div className="absolute top-2 left-0 right-0 px-3 flex justify-between items-start">
             <div className="bg-concrete/30 px-2 py-1 rounded-sm border border-ink/10 max-w-[80%]">
                 <p className="text-[10px] text-ink font-bold leading-tight">
                    "{activeFriend?.status || 'Offline'}"
                 </p>
             </div>
             {activeFriend?.isOnline && (
                <div className={`w-2 h-2 rounded-full ${getStatusColor(activeFriend.statusValue)} animate-pulse border border-ink/50 shadow-[0_0_4px_${activeFriend.statusValue === 'active' ? '#00FF41' : '#fbbf24'}]`}></div>
             )}
         </div>

         {/* The Avatar */}
         <div className="relative mt-4">
             <Avatar
               src={activeFriend?.avatar || ''}
               alt={activeFriend?.name || 'No friends'}
               size="lg"
               online={activeFriend?.isOnline}
             />
         </div>
      </div>

      {/* --- MIDDLE: WHEEL (Fixed Height) --- */}
      <div className="relative h-32 w-full bg-concrete/20 border-b-2 border-ink flex items-center z-20 shadow-inner">

          {/* Center Selection Indicator */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-12 bg-white/40 border-y border-ink pointer-events-none z-0 flex items-center justify-between px-2">
             <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[6px] border-l-signal border-b-[5px] border-b-transparent"></div>
             <div className="w-0 h-0 border-t-[5px] border-t-transparent border-r-[6px] border-r-signal border-b-[5px] border-b-transparent"></div>
          </div>

          <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="w-full h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-[40px]" // Padding creates center space
          >
              {wheelFriends.length === 0 ? (
                <div className="h-[48px] flex items-center justify-center snap-center">
                  <span className="text-sm uppercase tracking-widest font-mono opacity-40">No friends yet</span>
                </div>
              ) : (
                wheelFriends.map((friend, i) => (
                  <div
                      key={friend.id}
                      onClick={() => {
                          if (scrollRef.current) {
                              scrollRef.current.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
                          }
                      }}
                      className={`h-[48px] flex items-center justify-center snap-center cursor-pointer select-none transition-all duration-200
                          ${i === activeIndex ? 'opacity-100 scale-110 font-bold text-ink' : 'opacity-40 text-ink/60 scale-90'}
                      `}
                  >
                      <span className="text-lg uppercase tracking-widest font-mono">{friend.name}</span>
                  </div>
                ))
              )}
          </div>
      </div>

      {/* --- BOTTOM: ACTION DECK (Flex 1) --- */}
      <div className="flex-1 bg-bone relative flex flex-col items-center justify-center">

          {/* Visualizer Background */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 pointer-events-none opacity-50">
              <canvas ref={canvasRef} width="128" height="32" className="w-full h-full" />
          </div>

          {/* Listening Indicator */}
          {isListening && receivingFrom && (
            <div 
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-led text-ink px-3 py-1 rounded border border-ink text-xs font-bold animate-pulse cursor-pointer hover:bg-signal transition-colors"
              onClick={() => {
                // Quick reply: switch wheel to the sender
                const senderFriend = friends.find(f => f.id === receivingFrom.userId)
                if (senderFriend) {
                  onSelectFriend(senderFriend.id)
                  // Scroll to friend in wheel
                  const friendIndex = wheelFriends.findIndex(f => f.id === senderFriend.id)
                  if (scrollRef.current && friendIndex >= 0) {
                    scrollRef.current.scrollTo({ top: friendIndex * ITEM_HEIGHT, behavior: 'smooth' })
                  }
                }
              }}
              title="Click to reply"
            >
              🔊 RECEIVING FROM {receivingFrom.username.toUpperCase()}
            </div>
          )}

          <div className="mt-4">
            <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={!isPTTEnabled}
                className={`
                    w-24 h-24 rounded-full border-4 border-ink flex items-center justify-center transition-all duration-100 relative group
                    ${isPTTEnabled
                        ? (isTalking
                            ? 'bg-signal translate-y-1 shadow-none'
                            : 'bg-signal shadow-hard hover:-translate-y-0.5 cursor-pointer')
                        : 'bg-concrete opacity-50 cursor-not-allowed'}
                `}
            >
                <div className="absolute inset-2 border border-white/20 rounded-full"></div>
                <span className="text-white font-bold text-sm tracking-widest group-hover:scale-110 transition-transform">
                    {isTalking ? 'ON AIR' : 'PTT'}
                </span>
            </button>
          </div>

          <div className="text-[10px] text-ink/40 mt-4 font-bold tracking-widest">
            {isPTTEnabled ? 'HOLD TO SPEAK' : 'SELECT AVAILABLE FRIEND'}
          </div>
      </div>

      {/* --- FOOTER: STATUS --- */}
      <div className="h-10 border-t-2 border-ink bg-concrete flex items-center justify-between px-3 shrink-0 relative z-30">
          <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-ink rounded-full"></div>
              <span className="text-[10px] font-bold uppercase">ME</span>
          </div>

          <StatusPicker
            currentStatus={currentUserStatus}
            onStatusChange={onStatusChange}
          />
      </div>

      {/* Buddy List Drawer */}
      <BuddyListDrawer
        friends={friends}
        currentUserId={currentUser.id}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectFriend={onSelectFriend}
      />
    </div>
  );
};
