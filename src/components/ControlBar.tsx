import React from 'react';
import { useWebRTC } from '../context/WebRTCContext';
import {
  IconMic,
  IconMicOff,
  IconVideo,
  IconVideoOff,
  IconScreenShare,
  IconPhoneOff,
  IconPhone,
  IconLayout,
  IconCode,
} from './Icons';

interface ControlBarProps {
  layoutMode: 'pip' | 'split';
  onToggleLayout: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  layoutMode,
  onToggleLayout,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const {
    callStatus,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall,
    startCall,
  } = useWebRTC();

  const isCallActive = callStatus !== 'idle';

  return (
    <footer className="control-bar">
      <div className="control-group">
        {/* Microphone Toggle */}
        <button
          className={`control-btn ${isAudioMuted ? 'btn-danger' : 'btn-active'}`}
          onClick={toggleAudio}
          title={isAudioMuted ? 'Включить микрофон' : 'Выключить микрофон'}
        >
          {isAudioMuted ? <IconMicOff size={22} /> : <IconMic size={22} />}
        </button>

        {/* Camera Toggle */}
        <button
          className={`control-btn ${isVideoMuted ? 'btn-danger' : 'btn-active'}`}
          onClick={toggleVideo}
          title={isVideoMuted ? 'Включить камеру' : 'Выключить камеру'}
        >
          {isVideoMuted ? <IconVideoOff size={22} /> : <IconVideo size={22} />}
        </button>

        {/* Screen Share Toggle */}
        <button
          className={`control-btn ${isScreenSharing ? 'btn-screenshare-on' : ''}`}
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Остановить демонстрацию экрана' : 'Демонстрация экрана'}
        >
          <IconScreenShare size={22} />
        </button>

        {/* Layout Mode Toggle (PiP vs Split) */}
        <button
          className={`control-btn ${layoutMode === 'split' ? 'btn-primary-glow' : ''}`}
          onClick={onToggleLayout}
          title={layoutMode === 'pip' ? 'Переключить на раздельный вид 50/50' : 'Переключить на вид «Картинка в картинке»'}
        >
          <IconLayout size={22} />
        </button>

        {/* Interview Tools (Code & Chat Sidebar) */}
        <button
          className={`control-btn ${isSidebarOpen ? 'btn-primary-glow' : ''}`}
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Скрыть панель собеседования' : 'Открыть код и чат собеседования'}
        >
          <IconCode size={22} />
        </button>

        {/* Call Connect / Disconnect */}
        {isCallActive ? (
          <button
            className="control-btn btn-end-call"
            onClick={endCall}
            title="Завершить видеозвонок"
          >
            <IconPhoneOff size={22} />
          </button>
        ) : (
          <button
            className="control-btn btn-start-call"
            onClick={startCall}
            title="Начать звонок / Подключиться к комнате"
          >
            <IconPhone size={22} />
          </button>
        )}
      </div>
    </footer>
  );
};
