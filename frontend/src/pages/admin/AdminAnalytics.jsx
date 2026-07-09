import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils/helpers';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';

const COLORS = ['#16a34a', '#22c55e', '#86efac', '#4ade80', '#dcfce7'];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/analytics');
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar links={SIDEBAR_LINKS.admin} role="admin" />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  const categoryData = Object.entries(data.categoryRevenue || {}).map(([name, revenue]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    revenue: Math.round(revenue),
  })).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS.admin} role="admin" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="page-header">Analytics</h1>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            {[
              { label: 'Total Revenue', value: formatCurrency(data.totalRevenue), icon: '💰' },
              { label: 'Paid Orders', value: data.paidOrdersCount, icon: '✅' },
              { label: 'Avg Order Value', value: formatCurrency(data.paidOrdersCount ? data.totalRevenue / data.paidOrdersCount : 0), icon: '📊' },
              { label: 'Total Users', value: data.totalUsers, icon: '👥' },
            ].map((s, i) => (
              <div key={i} className="card">
                <span className="text-2xl">{s.icon}</span>
                <p className="text-gray-400 text-xs mt-2">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Revenue */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Monthly Revenue</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="revenue" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Revenue Pie */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Sales by Category</h2>
              {categoryData.length === 0 ? (
                <div className="text-center py-16 text-gray-300">No sales data yet</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="revenue">
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {categoryData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600">{d.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{formatCurrency(d.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Top Products by Revenue</h2>
            {(!data.topProducts || data.topProducts.length === 0) ? (
              <p className="text-gray-400 text-center py-8">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((p, i) => {
                  const pct = Math.round((p.revenue / (data.topProducts[0].revenue || 1)) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm font-bold w-5">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">{p.name}</span>
                          <span className="text-sm font-bold text-primary-600">{formatCurrency(p.revenue)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
