import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  CallStatus,
  SignalingStatus,
  SignalingMessage,
  SignalingChatMessage,
  ChatMessage,
} from '../types/webrtc';
import {
  DEFAULT_SIGNALING_URL,
  RTC_CONFIG,
  createSyntheticStream,
} from '../services/webrtc';

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: CallStatus;
  signalingStatus: SignalingStatus;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  callDuration: number;
  messages: ChatMessage[];
  codeText: string;
  hasCameraError: boolean;
  cameraErrorMessage: string;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  sendMessage: (text: string) => void;
  setCodeText: (code: string, broadcast?: boolean) => void;
  reconnectSignaling: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [signalingStatus, setSignalingStatus] = useState<SignalingStatus>('disconnected');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'system',
      text: 'Добро пожаловать в комнату видеособеседования 1-на-1.',
      timestamp: Date.now(),
    },
  ]);

  const [codeText, setCodeTextState] = useState<string>(
    `// Онлайн-редактор кода для собеседования\n// Все изменения синхронизируются в реальном времени с собеседником\n\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}\n\nconsole.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]\n`
  );

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const sendSignalingMessage = useCallback((msg: SignalingMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Setup PeerConnection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    pendingCandidatesRef.current = [];

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setCallStatus('connected');
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          break;
        case 'disconnected':
        case 'failed':
          setCallStatus('disconnected');
          break;
        case 'closed':
          setRemoteStream(null);
          break;
      }
    };

    // Setup DataChannel handler
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannelRef.current = channel;

      channel.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === 'chat') {
            addChatMessage({
              id: `chat-${Date.now()}-${Math.random()}`,
              sender: 'peer',
              text: parsed.text,
              timestamp: parsed.timestamp || Date.now(),
            });
          } else if (parsed.type === 'code-sync') {
            setCodeTextState(parsed.code);
          }
        } catch {
          // ignore
        }
      };
    };

    return pc;
  }, [sendSignalingMessage, addChatMessage]);

  // Initiate call negotiation (create offer)
  const initiateOffer = useCallback(async () => {
    try {
      setCallStatus('negotiating');
      const pc = createPeerConnection();

      // Create data channel on the offering side
      const channel = pc.createDataChannel('interview-data');
      dataChannelRef.current = channel;
      channel.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === 'chat') {
            addChatMessage({
              id: `chat-${Date.now()}-${Math.random()}`,
              sender: 'peer',
              text: parsed.text,
              timestamp: parsed.timestamp || Date.now(),
            });
          } else if (parsed.type === 'code-sync') {
            setCodeTextState(parsed.code);
          }
        } catch {
          // ignore
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);

      sendSignalingMessage({
        type: 'offer',
        sdp: offer,
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [createPeerConnection, sendSignalingMessage, addChatMessage]);

  // Drain queued candidates once remote description is set
  const drainPendingCandidates = async (pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }
  };

  // Connect to Signaling WebSocket
  const connectSignaling = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setSignalingStatus('connecting');

    try {
      const ws = new WebSocket(DEFAULT_SIGNALING_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setSignalingStatus('connected');
        setCallStatus('waiting');

        // Broadcast ready to let peer know we arrived
        ws.send(JSON.stringify({ type: 'ready' }));

        addChatMessage({
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: 'Подключено к signaling серверу. Ожидание собеседника...',
          timestamp: Date.now(),
        });
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as SignalingMessage;

          switch (message.type) {
            case 'ready': {
              // The other peer is ready -> we make the offer
              addChatMessage({
                id: `sys-${Date.now()}`,
                sender: 'system',
                text: 'Собеседник подключился! Установка видеосвязи...',
                timestamp: Date.now(),
              });
              await initiateOffer();
              break;
            }

            case 'offer': {
              // Received offer -> create answer
              setCallStatus('negotiating');
              const pc = createPeerConnection();
              await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
              await drainPendingCandidates(pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              sendSignalingMessage({
                type: 'answer',
                sdp: answer,
              });
              break;
            }

            case 'answer': {
              // Received answer
              if (pcRef.current) {
                await pcRef.current.setRemoteDescription(
                  new RTCSessionDescription(message.sdp)
                );
                await drainPendingCandidates(pcRef.current);
              }
              break;
            }

            case 'candidate': {
              if (message.candidate) {
                if (
                  pcRef.current &&
                  pcRef.current.remoteDescription &&
                  pcRef.current.remoteDescription.type
                ) {
                  await pcRef.current.addIceCandidate(
                    new RTCIceCandidate(message.candidate)
                  );
                } else {
                  pendingCandidatesRef.current.push(message.candidate);
                }
              }
              break;
            }

            case 'peer-left': {
              // The server notified that peer disconnected
              setRemoteStream(null);
              setCallStatus('waiting');
              if (pcRef.current) {
                try {
                  pcRef.current.close();
                } catch {
                  // ignore
                }
                pcRef.current = null;
              }
              addChatMessage({
                id: `sys-${Date.now()}`,
                sender: 'system',
                text: 'Собеседник покинул звонок. Ожидание подключения нового участника...',
                timestamp: Date.now(),
              });
              break;
            }

            case 'chat': {
              addChatMessage({
                id: `chat-${Date.now()}-${Math.random()}`,
                sender: 'peer',
                text: message.text,
                timestamp: message.timestamp || Date.now(),
              });
              break;
            }

            case 'code-sync': {
              setCodeTextState(message.code);
              break;
            }
          }
        } catch (err) {
          console.error('Error handling signaling message:', err);
        }
      };

      ws.onclose = () => {
        setSignalingStatus('disconnected');
        setCallStatus('disconnected');
      };

      ws.onerror = () => {
        setSignalingStatus('error');
      };
    } catch {
      setSignalingStatus('error');
    }
  }, [initiateOffer, createPeerConnection, sendSignalingMessage, addChatMessage]);

  // Request user media (Camera + Mic) with synthetic fallback
  const startCall = useCallback(async () => {
    try {
      setCallStatus('connecting');
      setHasCameraError(false);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch (mediaErr: unknown) {
        console.warn('Could not access real webcam/mic, using virtual fallback:', mediaErr);
        setHasCameraError(true);
        setCameraErrorMessage('Камера недоступна (активирован виртуальный поток для тестирования)');
        stream = createSyntheticStream();
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Keep reference to camera track for screen share toggling
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        cameraTrackRef.current = videoTrack;
      }

      // Connect to signaling once media is ready
      connectSignaling();
    } catch (err: unknown) {
      console.error('Failed to start call:', err);
      setCallStatus('error');
    }
  }, [connectSignaling]);

  // Stop call
  const endCall = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCallDuration(0);

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    // Close screen track if active
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setIsScreenSharing(false);

    // Close WebRTC
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setCallStatus('idle');
    setSignalingStatus('disconnected');

    addChatMessage({
      id: `sys-${Date.now()}`,
      sender: 'system',
      text: 'Звонок завершен.',
      timestamp: Date.now(),
    });
  }, [addChatMessage]);

  // Audio Toggle
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioMuted(!audioTrack.enabled);
    }
  }, []);

  // Video Toggle
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoMuted(!videoTrack.enabled);
    }
  }, []);

  // Screen Share Toggle
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        // Replace track in peer connection
        if (pcRef.current) {
          const senders = pcRef.current.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        // Handle stop sharing by user from browser UI
        screenTrack.onended = () => {
          if (cameraTrackRef.current && pcRef.current) {
            const senders = pcRef.current.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(cameraTrackRef.current);
            }
          }
          setIsScreenSharing(false);
          screenTrackRef.current = null;
        };

        setIsScreenSharing(true);
      } catch {
        // Cancelled screen share
      }
    } else {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (cameraTrackRef.current && pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(cameraTrackRef.current);
        }
      }
      setIsScreenSharing(false);
    }
  }, [isScreenSharing]);

  // Send in-call chat message
  const sendMessage = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      const chatPayload: SignalingChatMessage = {
        type: 'chat',
        text: clean,
        timestamp: Date.now(),
      };

      // Try sending via DataChannel first
      if (
        dataChannelRef.current &&
        dataChannelRef.current.readyState === 'open'
      ) {
        dataChannelRef.current.send(JSON.stringify(chatPayload));
      } else {
        // Fallback to signaling websocket
        sendSignalingMessage(chatPayload);
      }

      addChatMessage({
        id: `chat-${Date.now()}-${Math.random()}`,
        sender: 'me',
        text: clean,
        timestamp: Date.now(),
      });
    },
    [sendSignalingMessage, addChatMessage]
  );

  // Sync notepad / code
  const setCodeText = useCallback(
    (code: string, broadcast = true) => {
      setCodeTextState(code);
      if (broadcast) {
        const payload: SignalingMessage = {
          type: 'code-sync',
          code,
        };
        if (
          dataChannelRef.current &&
          dataChannelRef.current.readyState === 'open'
        ) {
          dataChannelRef.current.send(JSON.stringify(payload));
        } else {
          sendSignalingMessage(payload);
        }
      }
    },
    [sendSignalingMessage]
  );

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerIntervalRef.current = window.setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, [callStatus]);

  // Auto-connect on startup for frictionless 1-click experience
  useEffect(() => {
    startCall();
    return () => {
      endCall();
    };
  }, []);

  return (
    <WebRTCContext.Provider
      value={{
        localStream,
        remoteStream,
        callStatus,
        signalingStatus,
        isAudioMuted,
        isVideoMuted,
        isScreenSharing,
        callDuration,
        messages,
        codeText,
        hasCameraError,
        cameraErrorMessage,
        startCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        sendMessage,
        setCodeText,
        reconnectSignaling: connectSignaling,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};
