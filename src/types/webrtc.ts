export type CallStatus =
  | 'idle'           // Before connecting / camera setup
  | 'connecting'     // Connecting to WebSocket signaling
  | 'waiting'        // Connected to signaling, waiting for peer
  | 'negotiating'    // Exchanging offer / answer
  | 'connected'      // WebRTC peer connection established, streaming media
  | 'disconnected'   // Peer left or connection lost
  | 'error';         // Error occurred

export type SignalingStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ChatMessage {
  id: string;
  sender: 'me' | 'peer' | 'system';
  text: string;
  timestamp: number;
}

// Signaling WebSocket Message Types
export interface SignalingReadyMessage {
  type: 'ready';
}

export interface SignalingOfferMessage {
  type: 'offer';
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingAnswerMessage {
  type: 'answer';
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingCandidateMessage {
  type: 'candidate';
  candidate: RTCIceCandidateInit;
}

export interface SignalingPeerLeftMessage {
  type: 'peer-left';
}

export interface SignalingChatMessage {
  type: 'chat';
  text: string;
  senderName?: string;
  timestamp: number;
}

export interface SignalingCodeSyncMessage {
  type: 'code-sync';
  code: string;
}

export type SignalingMessage =
  | SignalingReadyMessage
  | SignalingOfferMessage
  | SignalingAnswerMessage
  | SignalingCandidateMessage
  | SignalingPeerLeftMessage
  | SignalingChatMessage
  | SignalingCodeSyncMessage;
