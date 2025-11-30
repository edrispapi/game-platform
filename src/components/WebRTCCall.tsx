'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneOff, X } from 'lucide-react';
import { toast } from 'sonner';

interface WebRTCCallProps {
  friendId: string;
  friendUsername: string;
  type: 'audio' | 'video';
  onEnd: () => void;
}

export function WebRTCCall({ friendId, friendUsername, type, onEnd }: WebRTCCallProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const startCall = async () => {
    try {
      setIsCalling(true);
      
      // Get user media
      const constraints = type === 'video' 
        ? { video: true, audio: true }
        : { video: false, audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setIsConnected(true);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            to: friendId,
          }));
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Connect to signaling server (WebSocket)
      // For now, we'll use a simple HTTP-based signaling
      // In production, use WebSocket server
      const ws = new WebSocket(`ws://localhost:8877/api/webrtc/signaling?userId=${friendId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'offer',
          offer: offer,
          from: 'current-user-id', // Replace with actual user ID
          to: friendId,
        }));
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'answer' && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'ice-candidate' && pc.signalingState !== 'closed') {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Failed to establish connection');
        endCall();
      };

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please check your camera/microphone permissions.');
      endCall();
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsCalling(false);
    setIsConnected(false);
    onEnd();
  };

  if (!isCalling) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-void-800 rounded-lg p-8 border border-void-700">
          <h3 className="text-xl font-bold mb-4">
            {type === 'video' ? 'Video' : 'Audio'} Call with {friendUsername}
          </h3>
          <div className="flex gap-4">
            <Button onClick={startCall} className="bg-green-600 hover:bg-green-700">
              {type === 'video' ? <Video className="mr-2 h-4 w-4" /> : <Phone className="mr-2 h-4 w-4" />}
              Start Call
            </Button>
            <Button variant="outline" onClick={onEnd}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Remote Video */}
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Local Video (Picture-in-Picture) */}
        {type === 'video' && (
          <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-blood-500">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-void-900/90 p-4 flex items-center justify-center gap-4">
        <div className="text-white text-center">
          <p className="font-bold">{friendUsername}</p>
          <p className="text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Connecting...'}
          </p>
        </div>
        <Button
          onClick={endCall}
          size="lg"
          className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

