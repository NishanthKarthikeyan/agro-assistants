import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import RealTimeBadge from '../../components/shared/RealTimeBadge';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';

export default function AdminOrders() {
  const [filter, setFilter] = useState('all');
  const [assigning, setAssigning] = useState(null);
  const [agentInputs, setAgentInputs] = useState({});

  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, agentsRes] = await Promise.all([
        api.get('/api/admin/orders'),
        api.get('/api/admin/users?role=delivery')
      ]);
      setOrders(ordersRes.data.orders || []);
      setAgents(agentsRes.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const handleStatusOverride = async (orderId, newStatus) => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Status → ${getStatusLabel(newStatus)} ✅`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleAssignAgent = async (orderId) => {
    const agentId = agentInputs[orderId];
    if (!agentId) return toast.error('Select an agent first');
    setAssigning(orderId);
    try {
      await api.put(`/api/admin/orders/${orderId}/assign`, { agentId });
      toast.success('Delivery agent assigned! 🚚');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign');
    } finally {
      setAssigning(null);
    }
  };

  const STATUSES = ['all', 'pending', 'confirmed', 'packed', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled'];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS.admin} role="admin" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="page-header mb-0">Order Management</h1>
            <RealTimeBadge />
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap capitalize transition-all ${filter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>
                {getStatusLabel(s)}
              </button>
            ))}
          </div>

          {loading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              {filtered.map(order => (
                <div key={order.id} className="card">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                        <span className={`badge ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                        <span className={`badge ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {getStatusLabel(order.paymentStatus)}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-4 gap-3 text-sm mb-3">
                        <div><p className="text-gray-400 text-xs">Buyer</p><p className="font-medium">{order.buyerName}</p></div>
                        <div><p className="text-gray-400 text-xs">Seller</p><p className="font-medium">{order.sellerName}</p></div>
                        <div><p className="text-gray-400 text-xs">Amount</p><p className="font-bold text-primary-600">{formatCurrency(order.totalAmount)}</p></div>
                        <div><p className="text-gray-400 text-xs">Date</p><p className="font-medium text-xs">{formatDate(order.createdAt)}</p></div>
                      </div>

                      {order.deliveryAddress && (
                        <p className="text-gray-400 text-xs">
                          📍 {[order.deliveryAddress.street, order.deliveryAddress.city, order.deliveryAddress.pincode].filter(Boolean).join(', ')}
                        </p>
                      )}

                      {order.deliveryAgentId && (
                        <p className="text-green-600 text-xs mt-1">🚚 Agent: {order.deliveryAgentName || order.deliveryAgentId}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[220px]">
                      {/* Assign agent (for packed orders) */}
                      {order.status === 'packed' && !order.deliveryAgentId && (
                        <div className="flex gap-2">
                          <select
                            value={agentInputs[order.id] || ''}
                            onChange={e => setAgentInputs(p => ({ ...p, [order.id]: e.target.value }))}
                            className="input text-sm flex-1 py-1.5"
                          >
                            <option value="">Select Agent</option>
                            {agents.map(a => (
                              <option key={a.id} value={a.id}>{a.displayName || a.email}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignAgent(order.id)}
                            disabled={assigning === order.id}
                            className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                          >
                            {assigning === order.id ? '...' : 'Assign'}
                          </button>
                        </div>
                      )}

                      {/* Status override */}
                      <select
                        value={order.status}
                        onChange={e => handleStatusOverride(order.id, e.target.value)}
                        className="input text-xs py-1.5"
                      >
                        {['pending','confirmed','packed','dispatched','out_for_delivery','delivered','cancelled'].map(s => (
                          <option key={s} value={s}>{getStatusLabel(s)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="card text-center py-16 text-gray-400">No orders found</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
