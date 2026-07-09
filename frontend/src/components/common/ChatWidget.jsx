import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatWidget({ isOpen, onClose }) {
  const { userProfile } = useAuth();
  
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `Hey there! Agro Assistant is a web app designed to help farmers like you. We offer features like crop disease prediction using images, weather forecasts, market price tracking, an AI-powered crop planner, a buy/sell marketplace, agricultural news, loan applications with a 1% annual interest rate, groundwater level information, and more! Is there anything specific you'd like to know about the app?`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const res = await axios.post('/ask-agro-assistant', { question });
      const answer = res.data?.answer || res.data?.response || res.data?.message || 'I could not find an answer. Please try again.';
      setMessages(m => [...m, { role: 'bot', text: answer }]);
    } catch (e) {
      setMessages(m => [...m, {
        role: 'bot',
        text: '⚠️ I\'m having trouble connecting. Please make sure the backend is running.',
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-44 right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-100 overflow-hidden" style={{ height: '500px', maxHeight: '70vh' }}>
      {/* Header */}
      <div className="bg-primary-600 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Agro Assistant</h3>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'bot' ? 'bg-primary-100' : 'bg-green-500'}`}>
              {msg.role === 'bot' ? <Bot size={14} className="text-primary-700" /> : <User size={14} className="text-white" />}
            </div>
            
            {/* Bubble */}
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user' 
                  ? 'bg-green-500 text-white rounded-br-sm' 
                  : msg.isError 
                    ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
              dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
            />
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
              <Bot size={14} className="text-primary-700" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center h-[38px]">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a message.."
            className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300 hover:bg-green-600 transition-colors"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
