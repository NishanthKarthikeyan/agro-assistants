import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import RealTimeBadge from '../../components/shared/RealTimeBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Users, ShoppingBag, DollarSign, Clock, Package, Truck } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';

const STATUS_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#06b6d4', '#10b981', '#ef4444'];

export default function AdminDashboard() {
  const [statsData, setStatsData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/orders')
      ]);
      setStatsData(statsRes.data);
      setOrders(ordersRes.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !statsData) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar links={SIDEBAR_LINKS.admin} role="admin" />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  // Order status distribution for pie chart
  const statusDist = {};
  orders.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });
  const pieData = Object.entries(statusDist).map(([name, value]) => ({ name: getStatusLabel(name), value }));

  // Revenue trend (last 7 days)
  const revData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const rev = orders
      .filter(o => {
        if (!o.createdAt) return false;
        const od = new Date(o.createdAt);
        return od.toDateString() === d.toDateString() && o.paymentStatus === 'paid';
      })
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    return { day, revenue: rev };
  });

  const stats = [
    { label: 'Total Users', value: statsData.totalUsers, icon: <Users size={20} />, color: 'text-blue-600 bg-blue-50', sub: `${statsData.buyers} buyers` },
    { label: 'Total Revenue', value: formatCurrency(statsData.totalRevenue), icon: <DollarSign size={20} />, color: 'text-green-600 bg-green-50', sub: 'from paid orders' },
    { label: 'Pending Orders', value: statsData.pendingOrders, icon: <ShoppingBag size={20} />, color: 'text-orange-600 bg-orange-50', sub: 'awaiting confirmation' },
    { label: 'Pending Approvals', value: statsData.pendingProductApprovals, icon: <Clock size={20} />, color: 'text-yellow-600 bg-yellow-50', sub: `${statsData.pendingProductApprovals} products` },
    { label: 'Total Products', value: statsData.totalProducts, icon: <Package size={20} />, color: 'text-purple-600 bg-purple-50', sub: `${statsData.totalProducts - statsData.pendingProductApprovals} live` },
    { label: 'Delivery Agents', value: statsData.deliveryAgents, icon: <Truck size={20} />, color: 'text-teal-600 bg-teal-50', sub: 'registered agents' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS.admin} role="admin" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="page-header mb-1">Admin Dashboard</h1>
              <p className="text-gray-400 text-sm">Full platform overview</p>
            </div>
            <RealTimeBadge />
          </div>

          {/* Approval Alerts */}
          {(statsData.pendingProductApprovals > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-amber-800">Pending Approvals</p>
                  <p className="text-amber-600 text-sm">{statsData.pendingProductApprovals} product{statsData.pendingProductApprovals !== 1 ? 's' : ''} awaiting review</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/admin/products" className="btn-primary text-sm py-2">Review Products</Link>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {stats.map((s, i) => (
              <div key={i} className="stats-card">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-medium">{s.label}</p>
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 card">
              <h2 className="font-bold text-gray-900 mb-4">Revenue Trend — Last 7 Days</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} dot={{ fill: '#16a34a', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Order Status Donut */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Order Status</h2>
              {pieData.length === 0 ? (
                <div className="text-center py-12 text-gray-300">No orders yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="space-y-1.5 mt-2">
                {pieData.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Recent Orders</h2>
              <Link to="/admin/orders" className="text-primary-600 text-sm font-medium hover:underline">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-50">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Buyer</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.slice(0, 10).map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-mono text-xs text-gray-400">#{o.id.slice(0, 8)}</td>
                      <td className="py-3 font-medium text-gray-800">{o.buyerName || '—'}</td>
                      <td className="py-3 text-gray-500">{o.sellerName || '—'}</td>
                      <td className="py-3 font-bold">{formatCurrency(o.totalAmount)}</td>
                      <td className="py-3"><span className={`badge ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span></td>
                      <td className="py-3 text-gray-400 text-xs">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
