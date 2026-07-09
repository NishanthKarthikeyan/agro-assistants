import { useState, useEffect } from 'react';
import { db, auth } from '../../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import Sidebar from '../../components/layout/Sidebar';
import { notificationService } from '../../services/notificationService';
import { Bell, Search, CheckCircle, Trash2, ArrowLeft, Filter, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const { userProfile, role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, weather, market_prices, loan_status, disease_reports, government_schemes, breaking_news
  const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  // Request notifications permission on load
  useEffect(() => {
    if (auth.currentUser) {
      notificationService.requestPermissionAndGetToken(auth.currentUser.uid).then(() => {
        setPermissionStatus(Notification.permission);
        notificationService.listenForForegroundMessages();
      });
    }
  }, []);

  // Listen to realtime notifications from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(list);
      setLoading(false);
    }, (error) => {
      console.error("Realtime notifications sync failed:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      toast.success('Marked as read');
    } catch (e) {
      toast.error('Failed to mark read');
    }
  };

  // Delete single notification
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification deleted');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
      toast.success('All marked as read');
    } catch (e) {
      toast.error('Operation failed');
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      toast.success('Cleared all notifications');
    } catch (e) {
      toast.error('Operation failed');
    }
  };

  // Filter notifications based on tab and search query
  const filteredNotifications = notifications.filter((n) => {
    const matchesTab = activeTab === 'all' || n.type === activeTab;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const categories = [
    { id: 'all', label: '🔔 All' },
    { id: 'weather', label: '🌤️ Weather' },
    { id: 'market_prices', label: '📈 Prices' },
    { id: 'loan_status', label: '🏦 Loans' },
    { id: 'disease_reports', label: '🔬 Disease AI' },
    { id: 'government_schemes', label: '🆕 Schemes' },
    { id: 'breaking_news', label: '📰 News' },
  ];

  const typeStyles = {
    weather: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: '🌤️' },
    market_prices: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: '📈' },
    loan_status: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: '🏦' },
    disease_reports: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: '🔬' },
    government_schemes: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: '🆕' },
    breaking_news: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: '📰' },
    general: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', icon: '🔔' }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar links={links} role={role} />
      
      <main className="flex-1 md:ml-[220px] pt-20 px-4 pb-6 max-w-5xl mx-auto">
        {/* Glassmorphic Header */}
        <header className="backdrop-blur-md bg-white/70 border border-white/20 rounded-3xl p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                Notification Center
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Real-time alerts, market changes & disease scans</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} /> Mark all read
            </button>
            <button
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} /> Clear all
            </button>
          </div>
        </header>

        {/* Permission status warning */}
        {permissionStatus !== 'granted' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6 shadow-sm">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-sm text-amber-800">Push Notifications Disabled</p>
              <p className="text-xs text-amber-700/80 mt-0.5">Enable browser notification settings to get real-time price alerts on your desktop.</p>
              <button 
                onClick={() => {
                  notificationService.requestPermissionAndGetToken(auth.currentUser?.uid).then(() => {
                    setPermissionStatus(Notification.permission);
                  });
                }}
                className="text-xs font-bold text-amber-800 underline mt-2 hover:text-amber-950 block"
              >
                Enable Notifications
              </button>
            </div>
          </div>
        )}

        {/* Search and Tabs Row */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by keyword..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm"
            />
          </div>

          {/* Category Tabs list */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeTab === cat.id
                    ? 'bg-green-600 border-green-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm mt-4 font-medium">Syncing alerts...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
            <p className="text-3xl">📭</p>
            <h3 className="font-bold text-gray-900 text-base mt-3">No Notifications Found</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
              {searchQuery ? "No matches for your search. Try resetting filters." : "You're all caught up! New alerts will show up here as they occur."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const style = typeStyles[notif.type] || typeStyles.general;
              
              return (
                <div
                  key={notif.id}
                  className={`border rounded-2xl p-4 transition-all duration-200 shadow-sm flex items-start justify-between gap-4 ${
                    notif.isRead 
                      ? 'bg-white border-gray-100 hover:border-gray-200 opacity-80' 
                      : 'bg-white border-l-4 border-l-green-500 border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Category Icon Wrapper */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${style.bg} border`}>
                      {style.icon}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                          {notif.type?.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold text-gray-900 ${!notif.isRead && 'font-extrabold'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        {notif.body}
                      </p>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 self-center">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        title="Mark as read"
                        className="p-2 rounded-xl text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      title="Delete"
                      className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
