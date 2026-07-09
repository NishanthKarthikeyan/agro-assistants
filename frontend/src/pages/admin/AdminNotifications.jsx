import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Send, BarChart2, Users, Radio, MapPin, AlertCircle, TrendingUp, CheckSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminNotifications() {
  const [users, setUsers] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [stats, setStats] = useState({ totalSent: 0, clicked: 0, CTR: 0 });
  const [loading, setLoading] = useState(false);

  // Form states
  const [targetType, setTargetType] = useState('broadcast'); // broadcast, district, user
  const [target, setTarget] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [alertType, setAlertType] = useState('general'); // weather, market_prices, loan_status, disease_reports, government_schemes, breaking_news

  const links = SIDEBAR_LINKS.admin;

  // Load users for target selection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setUsers(list);
    });
    return () => unsubscribe();
  }, []);

  // Fetch mock charts/analytics logs
  useEffect(() => {
    // Generate mock analytics based on active hours
    const mock = [
      { name: '08:00', Sent: 45, Clicked: 22 },
      { name: '10:00', Sent: 95, Clicked: 58 },
      { name: '12:00', Sent: 140, Clicked: 92 },
      { name: '14:00', Sent: 78, Clicked: 35 },
      { name: '16:00', Sent: 120, Clicked: 74 },
      { name: '18:00', Sent: 210, Clicked: 165 },
      { name: '20:00', Sent: 88, Clicked: 41 },
    ];
    setAnalyticsData(mock);

    // Calculate aggregated stats
    const totalSent = mock.reduce((sum, item) => sum + item.Sent, 0);
    const clicked = mock.reduce((sum, item) => sum + item.Clicked, 0);
    const CTR = totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0;
    setStats({ totalSent, clicked, CTR });
  }, []);

  // Submit handler
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title || !body) return toast.error('Please enter Title and Body');

    setLoading(true);
    try {
      let finalTarget = target;
      if (targetType === 'broadcast') finalTarget = 'all';

      await api.post('/api/notifications/trigger-alert', {
        targetType,
        target: finalTarget,
        title,
        body,
        type: alertType
      });

      toast.success('Alert sent successfully via FCM!');
      setTitle('');
      setBody('');
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch alert.');
    } finally {
      setLoading(false);
    }
  };

  const districts = ['Coimbatore', 'Trichy', 'Madurai', 'Erode', 'Salem', 'Chennai'];

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar links={links} role="admin" />

      <main className="flex-1 md:ml-64 p-6 max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Push Notifications Dispatcher</h1>
          <p className="text-gray-500 text-sm mt-0.5">Send real-time alerts, weather alerts & manage campaign analytics.</p>
        </header>

        {/* Analytics stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-xl font-bold">
              📢
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Alerts Sent</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalSent}</h3>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl font-bold">
              🖱️
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Clicks</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">{stats.clicked}</h3>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl font-bold">
              📈
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Avg Click-Through Rate (CTR)</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">{stats.CTR}%</h3>
            </div>
          </div>
        </div>

        {/* Dispatch Form and Analytics Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dispatch Form Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <Send size={18} className="text-green-600" /> Dispatch New Alert
            </h3>

            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Alert Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Alert Type / Category</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-[#f8fafc] text-sm text-gray-800"
                >
                  <option value="general">🔔 General Alerts</option>
                  <option value="weather">🌤️ Weather Alerts</option>
                  <option value="market_prices">📈 Market Price Changes</option>
                  <option value="loan_status">🏦 Loan Status Updates</option>
                  <option value="disease_reports">🔬 Crop Disease Detection</option>
                  <option value="government_schemes">🆕 Government Schemes</option>
                  <option value="breaking_news">📰 Breaking Agriculture News</option>
                </select>
              </div>

              {/* Target Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Target Audience</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'broadcast', label: 'Broadcast', icon: <Radio size={14} /> },
                    { id: 'district', label: 'District', icon: <MapPin size={14} /> },
                    { id: 'user', label: 'Specific User', icon: <Users size={14} /> },
                  ].map((targetOption) => (
                    <button
                      key={targetOption.id}
                      type="button"
                      onClick={() => {
                        setTargetType(targetOption.id);
                        setTarget(targetOption.id === 'broadcast' ? 'all' : targetOption.id === 'district' ? districts[0] : users[0]?.id || '');
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        targetType === targetOption.id
                          ? 'bg-green-600 border-green-600 text-white shadow-sm'
                          : 'bg-[#f8fafc] border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {targetOption.icon}
                      {targetOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Target Selection */}
              {targetType === 'district' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Select District</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-[#f8fafc] text-sm text-gray-800"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'user' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Select User Profile</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-[#f8fafc] text-sm text-gray-800"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName || u.name} ({u.email || u.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Notification Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🌧 Heavy Rain expected within 2 hours"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-[#f8fafc] text-sm text-gray-800 placeholder-gray-400"
                  required
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Notification Body Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g. Severe storms forecast for Coimbatore. Safe-guard harvested crops now."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-[#f8fafc] text-sm text-gray-800 placeholder-gray-400 leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-2 text-sm disabled:opacity-75 cursor-pointer"
              >
                <Send size={16} />
                {loading ? 'Dispatching push...' : 'Broadcast Push Notification'}
              </button>
            </form>
          </div>

          {/* Analytics Chart Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <BarChart2 size={18} className="text-green-600" /> Alert Campaign Activity
            </h3>
            <p className="text-gray-400 text-xs mb-6 font-medium">Hourly statistics for push notification delivery & engagement.</p>

            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Area type="monotone" dataKey="Sent" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                  <Area type="monotone" dataKey="Clicked" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorClicked)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
