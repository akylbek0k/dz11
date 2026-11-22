import React, { useRef, useEffect } from 'react';
import { useWebRTC } from '../context/WebRTCContext';
import { IconMicOff, IconVideoOff, IconUser } from './Icons';

interface VideoGridProps {
  layoutMode: 'pip' | 'split';
}

export const VideoGrid: React.FC<VideoGridProps> = ({ layoutMode }) => {
  const {
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    callStatus,
    hasCameraError,
    cameraErrorMessage,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const hasRemoteStream = remoteStream !== null && remoteStream.getVideoTracks().length > 0;

  return (
    <div className={`video-grid-container layout-${layoutMode}`}>
      {/* Remote Video Container */}
      <div className="video-card remote-card">
        {hasRemoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-element"
          />
        ) : (
          <div className="waiting-placeholder">
            <div className="radar-circle">
              <div className="radar-wave" />
              <div className="radar-wave wave-2" />
              <div className="radar-center">
                <IconUser size={40} />
              </div>
            </div>
            <h3 className="waiting-title">
              {callStatus === 'negotiating'
                ? 'Установка видеосвязи WebRTC...'
                : 'Ожидание собеседника...'}
            </h3>
            <p className="waiting-subtitle">
              {callStatus === 'negotiating'
                ? 'Обмен offer / answer и ICE кандидатами через signaling'
                : 'Откройте второе окно браузера по кнопке вверху для проверки связи 1-на-1'}
            </p>
          </div>
        )}

        <div className="video-badge">
          <span className="badge-name">Собеседник</span>
          {hasRemoteStream && (
            <span className="badge-live-dot" title="Видеопоток активен" />
          )}
        </div>
      </div>

      {/* Local Video Container */}
      <div className={`video-card local-card ${layoutMode === 'pip' ? 'pip-floating' : ''}`}>
        {localStream && !isVideoMuted ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-element local-video-mirrored"
          />
        ) : (
          <div className="avatar-placeholder">
            <div className="avatar-circle">
              <IconUser size={32} />
            </div>
            <span className="avatar-label">Камера отключена</span>
          </div>
        )}

        <div className="video-badge local-badge">
          <span className="badge-name">Вы</span>
          {isAudioMuted && (
            <span className="indicator-icon" title="Микрофон выключен">
              <IconMicOff size={14} />
            </span>
          )}
          {isVideoMuted && (
            <span className="indicator-icon" title="Камера выключена">
              <IconVideoOff size={14} />
            </span>
          )}
        </div>

        {hasCameraError && (
          <div className="camera-warning-overlay">
            <span>{cameraErrorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
