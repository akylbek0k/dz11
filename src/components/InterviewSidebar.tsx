import React, { useState, useRef, useEffect } from 'react';
import { useWebRTC } from '../context/WebRTCContext';
import {
  IconCode,
  IconMessage,
  IconInfo,
  IconSend,
  IconCopy,
  IconCheck,
  IconClose,
} from './Icons';
import { DEFAULT_SIGNALING_URL } from '../services/webrtc';

interface InterviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'code' | 'chat' | 'info';

const CODE_TEMPLATES: Record<string, string> = {
  js: `// Задача: Two Sum (JavaScript)\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}\n\nconsole.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]\n`,
  py: `# Задача: Проверка на палиндром (Python)\ndef is_palindrome(s: str) -> bool:\n    clean = [c.lower() for c in s if c.isalnum()]\n    return clean == clean[::-1]\n\nprint(is_palindrome("A man, a plan, a canal: Panama")) # True\n`,
  sql: `-- Задача: Топ-3 отдела по зарплате\nSELECT department_id, AVG(salary) AS avg_sal\nFROM employees\nGROUP BY department_id\nORDER BY avg_sal DESC\nLIMIT 3;\n`,
  blank: `// Начните писать код здесь...\n`,
};

export const InterviewSidebar: React.FC<InterviewSidebarProps> = ({ isOpen, onClose }) => {
  const {
    messages,
    sendMessage,
    codeText,
    setCodeText,
    callStatus,
    signalingStatus,
  } = useWebRTC();

  const [activeTab, setActiveTab] = useState<TabType>('code');
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat messages
  useEffect(() => {
    if (activeTab === 'chat' && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  if (!isOpen) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (CODE_TEMPLATES[val]) {
      setCodeText(CODE_TEMPLATES[val], true);
    }
  };

  return (
    <aside className="interview-sidebar">
      {/* Sidebar Header & Tabs */}
      <div className="sidebar-header">
        <div className="sidebar-tabs">
          <button
            className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
            title="Онлайн-редактор кода"
          >
            <IconCode size={16} />
            <span>Код</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            title="Текстовый чат"
          >
            <IconMessage size={16} />
            <span>Чат</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
            title="WebRTC диагностика"
          >
            <IconInfo size={16} />
            <span>Инфо</span>
          </button>
        </div>

        <button className="sidebar-close-btn" onClick={onClose} title="Закрыть панель">
          <IconClose size={18} />
        </button>
      </div>

      {/* Tab: Live Code Editor */}
      {activeTab === 'code' && (
        <div className="sidebar-tab-content code-tab">
          <div className="code-toolbar">
            <select
              className="template-select"
              onChange={handleTemplateChange}
              defaultValue="js"
              title="Выбрать шаблон задачи"
            >
              <option value="js">JavaScript (TwoSum)</option>
              <option value="py">Python (Palindrome)</option>
              <option value="sql">SQL Query</option>
              <option value="blank">Чистый лист</option>
            </select>

            <button
              className="code-action-btn"
              onClick={handleCopyCode}
              title="Скопировать код"
            >
              {copiedCode ? <IconCheck size={14} /> : <IconCopy size={14} />}
              <span>{copiedCode ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>

          <div className="code-editor-wrapper">
            <textarea
              className="code-textarea"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value, true)}
              placeholder="Пишите код или алгоритм здесь..."
              spellCheck={false}
            />
          </div>
          <div className="code-footer">
            <span className="sync-indicator">⚡ Синхронизация кода в реальном времени</span>
          </div>
        </div>
      )}

      {/* Tab: Text Chat */}
      {activeTab === 'chat' && (
        <div className="sidebar-tab-content chat-tab">
          <div className="sidebar-chat-stream">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`sidebar-chat-msg ${
                  m.sender === 'me'
                    ? 'msg-me'
                    : m.sender === 'peer'
                    ? 'msg-peer'
                    : 'msg-system'
                }`}
              >
                {m.sender !== 'system' && (
                  <span className="msg-sender">
                    {m.sender === 'me' ? 'Вы' : 'Собеседник'}
                  </span>
                )}
                <div className="msg-bubble">
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatMessagesEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="sidebar-chat-input-row">
            <input
              type="text"
              placeholder="Напишите сообщение..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="sidebar-input"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="sidebar-send-btn"
              title="Отправить"
            >
              <IconSend size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Tab: Info & WebRTC Protocol Diagnostics */}
      {activeTab === 'info' && (
        <div className="sidebar-tab-content info-tab">
          <div className="info-card">
            <h4>📡 WebRTC Статус</h4>
            <div className="info-row">
              <span className="info-label">Состояние звонка:</span>
              <span className={`status-tag tag-${callStatus}`}>{callStatus}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Signaling WebSocket:</span>
              <span className={`status-tag tag-${signalingStatus}`}>{signalingStatus}</span>
            </div>
          </div>

          <div className="info-card">
            <h4>🌐 Сервера</h4>
            <div className="info-group">
              <span className="info-label">Signaling Gateway:</span>
              <code className="info-code">{DEFAULT_SIGNALING_URL}</code>
            </div>
            <div className="info-group">
              <span className="info-label">Google STUN Server:</span>
              <code className="info-code">stun:stun.l.google.com:19302</code>
            </div>
          </div>

          <div className="info-card">
            <h4>📑 Протокол обмена</h4>
            <ul className="info-list">
              <li>
                <strong>Лимит:</strong> не более 2 клиентов одновременно (3-й выбивает 1-го).
              </li>
              <li>
                <strong>Отключение:</strong> при разрыве оставшемуся приходит <code>{`{ type: 'peer-left' }`}</code>.
              </li>
              <li>
                <strong>Signaling:</strong> двусторонний обмен SDP Offer, Answer и ICE кандидатами.
              </li>
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
};
