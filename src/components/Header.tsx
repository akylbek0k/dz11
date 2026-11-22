import React, { useState } from 'react';
import { useWebRTC } from '../context/WebRTCContext';
import { IconCopy, IconCheck, IconExternal, IconVideo } from './Icons';

export const Header: React.FC = () => {
  const { callStatus, signalingStatus, callDuration } = useWebRTC();
  const [copied, setCopied] = useState(false);

  // Format timer HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs > 0 ? hrs.toString().padStart(2, '0') : null,
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':');
  };

  const getStatusBadge = () => {
    if (callStatus === 'connected') {
      return {
        label: `Звонок активен (${formatTime(callDuration)})`,
        className: 'badge-connected',
      };
    }
    if (callStatus === 'negotiating') {
      return { label: 'Установка связи WebRTC...', className: 'badge-negotiating' };
    }
    if (callStatus === 'waiting' && signalingStatus === 'connected') {
      return { label: 'Ожидание собеседника...', className: 'badge-waiting' };
    }
    if (signalingStatus === 'connecting') {
      return { label: 'Подключение к signaling...', className: 'badge-connecting' };
    }
    if (signalingStatus === 'error' || callStatus === 'error') {
      return { label: 'Ошибка связи', className: 'badge-error' };
    }
    return { label: 'Не в звонке', className: 'badge-idle' };
  };

  const badge = getStatusBadge();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSecondWindow = () => {
    window.open(
      window.location.href,
      '_blank',
      'width=800,height=600,menubar=no,status=no,toolbar=no'
    );
  };

  return (
    <header className="interview-header">
      <div className="header-left">
        <div className="header-logo">
          <IconVideo size={22} />
        </div>
        <div>
          <h1 className="header-title">Видеособеседования 1-на-1</h1>
          <span className="header-subtitle">WebRTC • Direct P2P • wss://inai-col3</span>
        </div>
        <div className={`status-pill ${badge.className}`}>
          <span className="status-dot" />
          <span className="status-text">{badge.label}</span>
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-action-btn"
          onClick={handleOpenSecondWindow}
          title="Открыть второе окно для проверки звонка самому себе"
        >
          <IconExternal size={16} />
          <span>Тест во 2-м окне</span>
        </button>

        <button
          className="header-action-btn btn-secondary"
          onClick={handleCopyLink}
          title="Скопировать ссылку на комнату"
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          <span>{copied ? 'Скопировано!' : 'Копировать ссылку'}</span>
        </button>
      </div>
    </header>
  );
};
