import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';

export default function AdminDelivery() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ userId: '', name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [agents, setAgents] = useState([]);
  const [deliveryUsers, setDeliveryUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, usersRes, ordersRes] = await Promise.all([
        api.get('/api/admin/delivery-agents'),
        api.get('/api/admin/users?role=delivery'),
        api.get('/api/admin/orders')
      ]);
      setAgents(agentsRes.data.agents || []);
      setDeliveryUsers(usersRes.data.users || []);
      setOrders(ordersRes.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAvailability = async (agentDocId, current) => {
    try {
      // In a real app we'd need an endpoint like PUT /api/admin/delivery-agents/:id
      // but since we only have the frontend here, we'll try to hit an update route
      await api.put(`/api/admin/delivery-agents/${agentDocId}`, { isAvailable: !current });
      toast.success('Availability updated');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update availability');
    }
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/admin/delivery-agents', form);
      toast.success('Delivery agent registered!');
      setForm({ userId: '', name: '', phone: '' });
      setShowAdd(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to register agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS.admin} role="admin" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="page-header mb-0">Delivery Management</h1>
            <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
              + Register Agent
            </button>
          </div>

          {showAdd && (
            <div className="card mb-6 animate-fade-in">
              <h2 className="font-bold text-gray-900 mb-4">Register Delivery Agent</h2>
              <form onSubmit={handleAddAgent} className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">User ID (from Database)</label>
                  <select value={form.userId} onChange={e => {
                    const user = deliveryUsers.find(u => u.uid === e.target.value || u.id === e.target.value);
                    setForm(f => ({ ...f, userId: e.target.value, name: user?.displayName || '', phone: user?.phone || '' }));
                  }} className="input">
                    <option value="">Select user</option>
                    {deliveryUsers.map(u => (
                      <option key={u.id} value={u.uid || u.id}>{u.displayName} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" required />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
                </div>
                <div className="sm:col-span-3 flex gap-3">
                  <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Register'}</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {loading ? <LoadingSpinner /> : agents.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">
              <span className="text-5xl">🚚</span>
              <p className="mt-4">No delivery agents registered yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map(agent => {
                const activeOrder = orders.find(o => o.deliveryAgentId === agent.userId && !['delivered', 'cancelled'].includes(o.status));
                return (
                  <div key={agent.id} className="card-hover">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl">🚚</div>
                      <div>
                        <p className="font-bold text-gray-900">{agent.name}</p>
                        <p className="text-gray-400 text-xs">{agent.phone}</p>
                      </div>
                      <div className={`ml-auto w-3 h-3 rounded-full ${agent.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`} title={agent.isAvailable ? 'Available' : 'Busy'} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Deliveries', value: agent.totalDeliveries || 0 },
                        { label: 'Rating', value: agent.rating ? agent.rating.toFixed(1) + '⭐' : 'N/A' },
                        { label: 'Status', value: agent.isAvailable ? '✅ Free' : '🔴 Busy' },
                      ].map((s, i) => (
                        <div key={i} className="text-center bg-gray-50 rounded-xl p-2">
                          <p className="text-gray-400 text-xs">{s.label}</p>
                          <p className="font-bold text-gray-900 text-sm">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {activeOrder && (
                      <div className="bg-orange-50 rounded-xl p-3 mb-4 text-xs">
                        <p className="font-semibold text-orange-700">Active delivery</p>
                        <p className="text-orange-600">Order #{activeOrder.id.slice(0, 8)} • {activeOrder.status}</p>
                      </div>
                    )}

                    <button
                      onClick={() => handleToggleAvailability(agent.id, agent.isAvailable)}
                      className={`w-full text-sm py-2 rounded-xl font-semibold transition-colors ${
                        agent.isAvailable
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                    >
                      {agent.isAvailable ? 'Mark as Busy' : 'Mark as Available'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
