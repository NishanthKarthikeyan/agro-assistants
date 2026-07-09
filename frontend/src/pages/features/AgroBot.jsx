import { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import { Send, Bot, User, RotateCcw } from 'lucide-react';
import { triggerNotification } from '../../utils/notifications';

const QUICK_QUESTIONS = [
  'What crops are best for Kharif season?',
  'How to treat tomato leaf blight?',
  'What is the market price of onion today?',
  'How to apply for Kisan Credit Card?',
  'What is the weather forecast for Coimbatore?',
  'Best fertilizer for paddy cultivation?',
];

export default function AgroBot() {
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'buyer';
  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `Hello ${userProfile?.displayName?.split(' ')[0] || 'Farmer'}! 👋 I'm **Agro Assistant**, your AI farming companion.\n\nAsk me about:\n🌾 Crop recommendations & diseases\n📊 Market prices & selling tips\n🌤️ Weather & farming calendar\n🏦 Loan schemes & government schemes\n🌿 Organic farming practices`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const res = await api.post('/ask-agro-assistant', { question });
      const answer = res.data?.answer || res.data?.response || res.data?.message || 'I could not find an answer. Please try again.';
      setMessages(m => [...m, { role: 'bot', text: answer }]);
      
      // Trigger native push and toast for bot response
      triggerNotification('🤖 AI Assistant Response', answer.slice(0, 100) + (answer.length > 100 ? '...' : ''));
    } catch (e) {
      setMessages(m => [...m, {
        role: 'bot',
        text: '⚠️ I\'m having trouble connecting. Please make sure the backend is running and GEMINI_API_KEY is set in your .env file.',
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
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={links} role={role} />
      <main className="flex-1 ml-[220px] flex flex-col" style={{ height: '100vh' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-100 pl-16 pr-8 py-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Agro Assistant AI</h1>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Powered by Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={() => setMessages([{ role: 'bot', text: 'Chat cleared! How can I help you? 🌾' }])}
            className="btn-secondary text-sm flex items-center gap-1.5 py-2"
          >
            <RotateCcw size={14} /> Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center ${msg.role === 'bot' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                {msg.role === 'bot' ? <Bot size={18} className="text-primary-600" /> : <User size={18} className="text-gray-500" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'bot'
                  ? msg.isError
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-white shadow-card border border-gray-100 text-gray-700'
                  : 'bg-primary-600 text-white'
              }`}>
                <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Bot size={18} className="text-primary-600" />
              </div>
              <div className="bg-white shadow-card border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <div className="px-8 py-3">
            <p className="text-xs text-gray-400 mb-2 font-medium">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 px-3 py-1.5 rounded-xl transition-all hover:bg-primary-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-8 py-4">
          <div className="flex items-end gap-3 bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about farming, crops, market prices..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-700 placeholder-gray-400 px-2 py-2 max-h-32"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Press Enter to send • Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  );
}
