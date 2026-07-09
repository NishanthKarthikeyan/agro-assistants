import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Search, Users, Shield, Truck, ShoppingCart } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';

const ROLES = ['buyer', 'seller', 'delivery', 'admin'];

const ROLE_CONFIG = {
  admin:    { color: 'bg-red-100 text-red-700',    icon: <Shield size={12} />,       label: 'Admin' },
  seller:   { color: 'bg-blue-100 text-blue-700',  icon: <ShoppingCart size={12} />, label: 'Seller' },
  delivery: { color: 'bg-orange-100 text-orange-700', icon: <Truck size={12} />,    label: 'Delivery' },
  buyer:    { color: 'bg-green-100 text-green-700', icon: <Users size={12} />,       label: 'Buyer' },
};

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('all');
  const [search,     setSearch]     = useState('');
  const [acting,     setActing]     = useState(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Pending sellers and delivery agents
  const pendingSellers  = users.filter(u => u.role === 'seller'   && !u.isApproved);
  const pendingDelivery = users.filter(u => u.role === 'delivery' && !u.isApproved);

  const filtered = users
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => {
      if (roleFilter === 'pending_sellers')  return u.role === 'seller'   && !u.isApproved;
      if (roleFilter === 'pending_delivery') return u.role === 'delivery' && !u.isApproved;
      return true;
    })
    .filter(u =>
      !search ||
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
    );

  const handleRoleChange = async (userId, newRole) => {
    setActing(userId + '_role');
    try {
      // When promoting to seller/delivery, set isApproved based on role
      const updates = { role: newRole };
      if (newRole === 'buyer') updates.isApproved = true;  // buyers always approved
      await api.put(`/api/admin/users/${userId}`, updates);
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update role');
    } finally {
      setActing(null);
    }
  };

  const handleApprovalToggle = async (userId, currentApproved) => {
    setActing(userId + '_approve');
    try {
      await api.put(`/api/admin/users/${userId}`, {
        isApproved: !currentApproved,
        isActive:   !currentApproved,
      });
      toast.success(!currentApproved ? '✅ Approved!' : 'Approval revoked');
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Failed');
    } finally {
      setActing(null);
    }
  };

  const handleActiveToggle = async (userId, currentActive) => {
    try {
      await api.put(`/api/admin/users/${userId}/toggle-active`, { isActive: !currentActive });
      toast.success(!currentActive ? 'Account activated' : 'Account deactivated');
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Failed');
    }
  };

  const TABS = [
    { id: 'all',              label: 'All Users',       count: users.length },
    { id: 'buyer',            label: '🛒 Buyers',       count: users.filter(u => u.role === 'buyer').length },
    { id: 'seller',           label: '🏪 Sellers',      count: users.filter(u => u.role === 'seller').length },
    { id: 'delivery',         label: '🚚 Delivery',     count: users.filter(u => u.role === 'delivery').length },
    { id: 'admin',            label: '🛡 Admins',        count: users.filter(u => u.role === 'admin').length },
    { id: 'pending_sellers',  label: '⏳ Pending Sellers',  count: pendingSellers.length },
    { id: 'pending_delivery', label: '⏳ Pending Delivery', count: pendingDelivery.length },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS.admin} role="admin" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="page-header mb-0">User Management</h1>
              <p className="text-gray-400 text-sm">{users.length} total users</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Users',      value: users.length,                                    color: 'bg-gray-50' },
              { label: 'Pending Sellers',  value: pendingSellers.length,  urgent: pendingSellers.length  > 0, color: 'bg-yellow-50' },
              { label: 'Pending Delivery', value: pendingDelivery.length, urgent: pendingDelivery.length > 0, color: 'bg-orange-50' },
              { label: 'Active Sellers',   value: users.filter(u => u.role === 'seller' && u.isApproved).length, color: 'bg-green-50' },
            ].map(s => (
              <div key={s.label} className={`card ${s.color}`}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-2xl font-black mt-1 ${s.urgent ? 'text-orange-600' : 'text-gray-900'}`}>{s.value}</p>
                {s.urgent && <p className="text-xs text-orange-500 mt-1">Needs attention</p>}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email..." className="input pl-10 text-sm w-60" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setRoleFilter(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    roleFilter === t.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                  }`}>
                  {t.label} <span className="bg-black/10 px-1 rounded-full">{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">No users found</div>
          ) : (
            <div className="card p-0 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-left text-gray-500">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">User</th>
                    <th className="px-5 py-3.5 font-medium">Role</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium">Joined</th>
                    <th className="px-5 py-3.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(u => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.buyer;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {u.profileImageUrl ? (
                              <img src={u.profileImageUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                                {u.displayName?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">{u.displayName || '—'}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                              {u.phone && <p className="text-xs text-gray-300">📞 {u.phone}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            disabled={acting === u.id + '_role'}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer ${rc.color}`}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            {u.isApproved ? (
                              <span className="badge bg-green-100 text-green-700 text-xs">✅ Approved</span>
                            ) : (
                              <span className="badge bg-yellow-100 text-yellow-700 text-xs">⏳ Pending</span>
                            )}
                            {u.isActive === false && (
                              <span className="badge bg-red-100 text-red-600 text-xs">🚫 Inactive</span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {/* Approve/Revoke toggle */}
                            {u.role !== 'buyer' && (
                              <button
                                onClick={() => handleApprovalToggle(u.id, u.isApproved)}
                                disabled={acting === u.id + '_approve'}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                                  u.isApproved
                                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                    : 'bg-green-100 hover:bg-green-200 text-green-700'
                                }`}
                              >
                                {acting === u.id + '_approve' ? '...' : u.isApproved ? 'Revoke' : 'Approve'}
                              </button>
                            )}
                            {/* Active toggle */}
                            <button
                              onClick={() => handleActiveToggle(u.id, u.isActive !== false)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            >
                              {u.isActive === false ? 'Activate' : 'Deactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
