import React, { useState } from 'react';
import { WebRTCProvider } from './context/WebRTCContext';
import { Header } from './components/Header';
import { VideoGrid } from './components/VideoGrid';
import { ControlBar } from './components/ControlBar';
import { InterviewSidebar } from './components/InterviewSidebar';
import './styles/interview.css';

const MainInterviewView: React.FC = () => {
  const [layoutMode, setLayoutMode] = useState<'pip' | 'split'>('pip');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="interview-app">
      <Header />

      <main className="interview-main-content">
        <VideoGrid layoutMode={layoutMode} />

        <InterviewSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </main>

      <ControlBar
        layoutMode={layoutMode}
        onToggleLayout={() => setLayoutMode((m) => (m === 'pip' ? 'split' : 'pip'))}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
      />
    </div>
  );
};

export default function App() {
  return (
    <WebRTCProvider>
      <MainInterviewView />
    </WebRTCProvider>
  );
}
