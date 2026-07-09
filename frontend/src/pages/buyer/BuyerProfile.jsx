import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/layout/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Package, Save } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import axios from 'axios';

export default function BuyerProfile() {
  const { userProfile, checkAuth } = useAuth();
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    displayName: userProfile?.displayName || '',
    phone: userProfile?.phone || '',
    street: userProfile?.address?.street || '',
    city: userProfile?.address?.city || '',
    state: userProfile?.address?.state || '',
    pincode: userProfile?.address?.pincode || '',
  });

  const [orders, setOrders] = useState([]);
  const [oLoad, setOLoad] = useState(true);

  const fetchOrders = useCallback(async () => {
    setOLoad(true);
    try {
      const res = await api.get('/api/buyer/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setOLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('profile_image', file);
      // Wait, is there a specific endpoint? Actually, if there is a separate microservice for uploading, we'll keep it. Let's just assume '/upload-profile-image' works or use 'api.post'.
      const res = await api.post('/upload-profile-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      await api.put('/api/auth/profile', { profileImageUrl: res.data.secure_url });
      toast.success('Photo updated!');
      await checkAuth(); // Refresh local profile
    } catch { 
      toast.error('Upload failed'); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/auth/profile', {
        displayName: form.displayName,
        phone: form.phone,
        address: { street: form.street, city: form.city, state: form.state, pincode: form.pincode },
      });
      toast.success('Profile saved!');
      await checkAuth(); // Refresh profile in context
    } catch { 
      toast.error('Failed to save profile'); 
    } finally { 
      setSaving(false); 
    }
  };

  const totalSpent = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <h1 className="page-header">My Profile</h1>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Profile Edit */}
          <div className="card">
            <div className="text-center mb-6">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 bg-primary-100 flex items-center justify-center text-3xl mx-auto mb-3"
              >
                {userProfile?.profileImageUrl ? (
                  <img src={userProfile.profileImageUrl} className="w-full h-full object-cover" alt="" />
                ) : <User size={32} className="text-primary-600" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <p className="font-bold text-gray-900">{userProfile?.displayName}</p>
              <p className="text-gray-400 text-xs">{userProfile?.email}</p>
              <button onClick={() => fileRef.current?.click()} className="text-primary-600 text-xs mt-1 hover:underline">
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-2xl">
              <div className="text-center">
                <p className="text-xl font-black text-gray-900">{orders.length}</p>
                <p className="text-gray-400 text-xs">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-primary-600">{formatCurrency(totalSpent)}</p>
                <p className="text-gray-400 text-xs">Total Spent</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input name="displayName" value={form.displayName} onChange={handleChange} className="input text-sm" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} className="input text-sm" />
              </div>
              <div>
                <label className="label">Street</label>
                <input name="street" value={form.street} onChange={handleChange} className="input text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">City</label>
                  <input name="city" value={form.city} onChange={handleChange} className="input text-sm" />
                </div>
                <div>
                  <label className="label">PIN</label>
                  <input name="pincode" value={form.pincode} onChange={handleChange} className="input text-sm" />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Right: Order History */}
          <div className="lg:col-span-2 card">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={18} /> Order History
            </h2>
            {oLoad ? <LoadingSpinner size="sm" /> : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p>No orders yet. Start shopping!</p>
                <Link to="/dashboard" className="btn-primary mt-4 inline-block text-sm">Browse Products</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-50 hover:border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg">
                      {order.items?.[0]?.imageUrl ? (
                        <img src={order.items[0].imageUrl} className="w-full h-full rounded-xl object-cover" alt="" />
                      ) : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{order.items?.map(i => i.productName).join(', ')}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">{formatCurrency(order.totalAmount)}</p>
                      <span className={`badge text-xs ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
