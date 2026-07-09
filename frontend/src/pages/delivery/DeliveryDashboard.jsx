import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import RealTimeBadge from '../../components/shared/RealTimeBadge';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';

const STATUS_ACTIONS = {
  packed: { label: '🚚 Mark as Dispatched', next: 'dispatched' },
  dispatched: { label: '📍 Out for Delivery', next: 'out_for_delivery' },
  out_for_delivery: { label: '✅ Mark as Delivered', next: 'delivered' },
};

export default function DeliveryDashboard() {
  const { userProfile } = useAuth();
  const [updating, setUpdating] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/api/delivery/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assigned deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'delivered');

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await api.put(`/api/delivery/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Status updated: ${getStatusLabel(newStatus)} ✅`);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS.delivery} role="delivery" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="page-header mb-1">My Deliveries</h1>
              <p className="text-gray-400 text-sm">Good day, {userProfile?.displayName?.split(' ')[0]}! 🚚</p>
            </div>
            <RealTimeBadge />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Active Deliveries', value: activeOrders.length, icon: '🚚', color: 'bg-orange-50' },
              { label: 'Completed Today', value: completedOrders.filter(o => {
                const d = new Date(o.updatedAt || o.createdAt);
                return d.toDateString() === new Date().toDateString();
              }).length, icon: '✅', color: 'bg-green-50' },
              { label: 'Total Deliveries', value: completedOrders.length, icon: '📦', color: 'bg-blue-50' },
            ].map((s, i) => (
              <div key={i} className={`card ${s.color}`}>
                <span className="text-3xl">{s.icon}</span>
                <p className="text-gray-400 text-xs mt-2">{s.label}</p>
                <p className="text-3xl font-black text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Active Deliveries */}
          <div className="card mb-6">
            <h2 className="font-bold text-gray-900 mb-4">🔴 Active Deliveries</h2>
            {loading ? <LoadingSpinner size="sm" /> : activeOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-4xl mb-3">🎉</p>
                <p>No active deliveries. You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => {
                  const action = STATUS_ACTIONS[order.status];
                  return (
                    <div key={order.id} className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                            <span className={`badge ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                          </div>
                          <p className="font-semibold text-gray-900">📦 {order.items?.map(i => i.productName).join(', ')}</p>
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <p>👤 Buyer: <span className="font-medium">{order.buyerName}</span></p>
                            <p>📞 Phone: <span className="font-medium">{order.buyerPhone || 'N/A'}</span></p>
                            <p>📍 Address: <span className="font-medium">
                              {[order.deliveryAddress?.street, order.deliveryAddress?.city, order.deliveryAddress?.pincode].filter(Boolean).join(', ')}
                            </span></p>
                            <p>💰 Amount: <span className="font-bold text-primary-600">{formatCurrency(order.totalAmount)}</span>
                              {order.paymentMethod === 'cod' && <span className="ml-1 text-orange-600 font-medium">(Collect COD)</span>}
                            </p>
                          </div>
                        </div>

                        {action && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, action.next)}
                            disabled={updating === order.id}
                            className="btn-primary whitespace-nowrap text-sm"
                          >
                            {updating === order.id ? 'Updating...' : action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed */}
          {completedOrders.length > 0 && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">✅ Completed Deliveries</h2>
              <div className="space-y-2">
                {completedOrders.slice(0, 10).map(order => (
                  <div key={order.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-2xl">✅</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{order.items?.map(i => i.productName).join(', ')}</p>
                      <p className="text-xs text-gray-400">{order.buyerName} • {formatDate(order.updatedAt || order.createdAt)}</p>
                    </div>
                    <span className="font-bold text-primary-600 text-sm">{formatCurrency(order.totalAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
