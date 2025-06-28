import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface CallSession {
  id: string;
  caller_id: string;
  recipient_id: string;
  conversation_id: string;
  status: 'initiating' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
  created_at: string;
  answered_at?: string;
  ended_at?: string;
  duration?: number;
  caller_profile?: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  recipient_profile?: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface CallState {
  currentCall: CallSession | null;
  incomingCall: CallSession | null;
  isCallActive: boolean;
  isMuted: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  
  // Actions
  initiateCall: (recipientId: string, conversationId?: string) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  toggleMute: () => void;
  setupWebRTC: () => Promise<void>;
  cleanupWebRTC: () => void;
  
  // Internal
  setCurrentCall: (call: CallSession | null) => void;
  setIncomingCall: (call: CallSession | null) => void;
  requestMicrophonePermission: () => Promise<boolean>;
}

// WebRTC Configuration
const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useCallStore = create<CallState>((set, get) => ({
  currentCall: null,
  incomingCall: null,
  isCallActive: false,
  isMuted: false,
  localStream: null,
  remoteStream: null,
  peerConnection: null,

  requestMicrophonePermission: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop for now
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast.error('Microphone permission is required for voice calls');
      return false;
    }
  },

  initiateCall: async (recipientId: string, conversationId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check microphone permission
      const hasPermission = await get().requestMicrophonePermission();
      if (!hasPermission) return;

      // Call the edge function to initiate the call
      const { data, error } = await supabase.functions.invoke('initiate-call', {
        body: { recipient_id: recipientId, conversation_id: conversationId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Set up WebRTC
      await get().setupWebRTC();

      // Set current call
      set({
        currentCall: data.call_session,
        isCallActive: true,
      });

      toast.success('Call initiated');
    } catch (error: any) {
      console.error('Failed to initiate call:', error);
      toast.error(error.message || 'Failed to initiate call');
    }
  },

  answerCall: async (callId: string) => {
    try {
      // Check microphone permission
      const hasPermission = await get().requestMicrophonePermission();
      if (!hasPermission) return;

      // Call the edge function to answer the call
      const { data, error } = await supabase.functions.invoke('answer-call', {
        body: { call_id: callId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Set up WebRTC
      await get().setupWebRTC();

      // Update call state
      const incomingCall = get().incomingCall;
      if (incomingCall?.id === callId) {
        set({
          currentCall: { ...incomingCall, status: 'connected' },
          incomingCall: null,
          isCallActive: true,
        });
      }

      toast.success('Call answered');
    } catch (error: any) {
      console.error('Failed to answer call:', error);
      toast.error(error.message || 'Failed to answer call');
    }
  },

  endCall: async (callId: string) => {
    try {
      // Call the edge function to end the call
      const { data, error } = await supabase.functions.invoke('end-call', {
        body: { call_id: callId },
      });

      if (error) throw error;

      // Cleanup WebRTC
      get().cleanupWebRTC();

      // Clear call state
      set({
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        isMuted: false,
      });

      toast.success(`Call ended (${data.duration ? Math.floor(data.duration / 60) : 0}:${data.duration ? (data.duration % 60).toString().padStart(2, '0') : '00'})`);
    } catch (error: any) {
      console.error('Failed to end call:', error);
      toast.error(error.message || 'Failed to end call');
      
      // Still cleanup on error
      get().cleanupWebRTC();
      set({
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        isMuted: false,
      });
    }
  },

  declineCall: async (callId: string) => {
    try {
      await get().endCall(callId);
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      set({ isMuted: !isMuted });
      toast.success(isMuted ? 'Unmuted' : 'Muted');
    }
  },

  setupWebRTC: async () => {
    try {
      // Get local stream
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfiguration);
      
      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        set({ remoteStream });
        
        // Play remote audio
        const audioElement = document.createElement('audio');
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
      };

      // Handle ICE candidates (in a real app, these would be exchanged via signaling server)
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
          // In a real implementation, send this to the other peer via signaling
        }
      };

      set({
        localStream,
        peerConnection,
      });

    } catch (error) {
      console.error('Failed to set up WebRTC:', error);
      toast.error('Failed to set up audio connection');
    }
  },

  cleanupWebRTC: () => {
    const { localStream, peerConnection } = get();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }
    
    // Remove any audio elements
    document.querySelectorAll('audio').forEach(audio => {
      if (audio.srcObject) {
        audio.remove();
      }
    });

    set({
      localStream: null,
      remoteStream: null,
      peerConnection: null,
    });
  },

  setCurrentCall: (call: CallSession | null) => set({ currentCall: call }),
  setIncomingCall: (call: CallSession | null) => set({ incomingCall: call }),
}));

// Set up real-time subscriptions for call events
const setupCallSubscriptions = (userId: string) => {
  // Subscribe to call sessions where user is involved
  const callSubscription = supabase
    .channel('call-sessions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'call_sessions',
        filter: `or(caller_id.eq.${userId},recipient_id.eq.${userId})`,
      },
      async (payload) => {
        console.log('Call session change:', payload);
        
        const callSession = payload.new as CallSession;
        const { currentCall, incomingCall, setCurrentCall, setIncomingCall } = useCallStore.getState();
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Fetch full call details with profiles
          const { data: fullCall } = await supabase
            .from('call_sessions')
            .select(`
              *,
              caller_profile:caller_id (id, username, display_name, avatar_url),
              recipient_profile:recipient_id (id, username, display_name, avatar_url)
            `)
            .eq('id', callSession.id)
            .single();

          if (fullCall) {
            // Handle incoming call
            if (fullCall.recipient_id === userId && fullCall.status === 'ringing' && !currentCall) {
              setIncomingCall(fullCall);
              
              // Play ringtone (optional)
              const audio = new Audio('/ringtone.mp3');
              audio.loop = true;
              audio.play().catch(console.error);
              
              toast('Incoming call from ' + (fullCall.caller_profile?.display_name || fullCall.caller_profile?.username), {
                duration: 10000,
                icon: '📞',
              });
            }
            
            // Update current call if it matches
            if (currentCall?.id === fullCall.id) {
              setCurrentCall(fullCall);
              
              if (fullCall.status === 'ended' || fullCall.status === 'declined' || fullCall.status === 'missed') {
                // Call ended, cleanup
                useCallStore.getState().cleanupWebRTC();
                setCurrentCall(null);
                setIncomingCall(null);
                useCallStore.setState({ isCallActive: false, isMuted: false });
              }
            }
            
            // Clear incoming call if it was declined/ended
            if (incomingCall?.id === fullCall.id && 
                (fullCall.status === 'ended' || fullCall.status === 'declined' || fullCall.status === 'missed')) {
              setIncomingCall(null);
              
              // Stop ringtone
              document.querySelectorAll('audio').forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
              });
            }
          }
        }
      }
    )
    .subscribe();

  return callSubscription;
};

// Initialize subscriptions when user is authenticated
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    setupCallSubscriptions(session.user.id);
  }
}); 