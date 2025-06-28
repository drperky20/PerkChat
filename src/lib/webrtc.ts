import { supabase } from './supabase';

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string;
  private userId: string;
  private targetUserId: string;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  private signalingChannel: any = null;

  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor(
    callId: string,
    userId: string,
    targetUserId: string,
    options?: {
      onRemoteStream?: (stream: MediaStream) => void;
      onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    }
  ) {
    this.callId = callId;
    this.userId = userId;
    this.targetUserId = targetUserId;
    this.onRemoteStream = options?.onRemoteStream;
    this.onConnectionStateChange = options?.onConnectionStateChange;

    this.setupSignalingListener();
  }

  async initialize(): Promise<void> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.rtcConfiguration);

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event);
        const [remoteStream] = event.streams;
        this.remoteStream = remoteStream;
        this.onRemoteStream?.(remoteStream);
        this.playRemoteAudio(remoteStream);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal('ice-candidate', event.candidate);
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('Connection state changed:', state);
        if (state) {
          this.onConnectionStateChange?.(state);
        }
      };

      console.log('WebRTC initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Send offer to remote peer
      await this.sendSignal('offer', offer);
      
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Send answer to remote peer
      await this.sendSignal('answer', answer);
      
      return answer;
    } catch (error) {
      console.error('Failed to create answer:', error);
      throw error;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
      throw error;
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;
    
    const audioTracks = this.localStream.getAudioTracks();
    const isMuted = audioTracks.length > 0 && !audioTracks[0].enabled;
    
    audioTracks.forEach(track => {
      track.enabled = isMuted;
    });
    
    return !isMuted; // Return new muted state
  }

  private async sendSignal(type: WebRTCSignal['type'], data: any): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('webrtc-signal', {
        body: {
          call_id: this.callId,
          type,
          data,
          target_user_id: this.targetUserId,
        },
      });

      if (error) {
        console.error('Failed to send signal:', error);
      }
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  }

  private setupSignalingListener(): void {
    // Listen for WebRTC signals on a user-specific channel
    this.signalingChannel = supabase.channel(`call-signals-${this.userId}`)
      .on('broadcast', { event: 'webrtc-signal' }, async (payload) => {
        const signal = payload.payload;
        
        if (signal.call_id !== this.callId || signal.from_user_id !== this.targetUserId) {
          return; // Ignore signals not for this call
        }

        console.log('Received WebRTC signal:', signal);

        try {
          switch (signal.signal_type) {
            case 'offer':
              await this.createAnswer(signal.signal_data);
              break;
            case 'answer':
              await this.handleAnswer(signal.signal_data);
              break;
            case 'ice-candidate':
              await this.handleIceCandidate(signal.signal_data);
              break;
          }
        } catch (error) {
          console.error('Error processing signal:', error);
        }
      })
      .subscribe();
  }

  private playRemoteAudio(stream: MediaStream): void {
    // Create or update audio element for remote stream
    let audioElement = document.getElementById('remote-audio') as HTMLAudioElement;
    
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = 'remote-audio';
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
    }
    
    audioElement.srcObject = stream;
  }

  cleanup(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Remove remote audio element
    const audioElement = document.getElementById('remote-audio');
    if (audioElement) {
      audioElement.remove();
    }

    // Unsubscribe from signaling channel
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe();
      this.signalingChannel = null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }
} 