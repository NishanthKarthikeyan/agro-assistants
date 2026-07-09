import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/layout/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import RealTimeBadge from '../../components/shared/RealTimeBadge';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Check, Truck, MapPin, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/helpers';

const ORDER_STEPS = [
  { key: 'pending',          label: 'Order Placed',     icon: '📋', desc: 'Your order has been received' },
  { key: 'confirmed',        label: 'Confirmed',        icon: '✅', desc: 'Seller confirmed your order' },
  { key: 'reached_seller',   label: 'Reached Seller',   icon: '🏪', desc: 'Delivery partner has reached the seller' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🚚', desc: 'Order is on the way to you!' },
  { key: 'delivered',        label: 'Delivered',        icon: '🎉', desc: 'Order delivered successfully!' },
];

const STATUS_ORDER = ORDER_STEPS.map(s => s.key);

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get(`/api/buyer/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    
    // Optional polling for real-time feel
    const interval = setInterval(() => {
      api.get(`/api/buyer/orders/${orderId}`).then(res => setOrder(res.data)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchOrder, orderId]);

  const currentStepIndex = STATUS_ORDER.indexOf(order?.status);
  const isCancelled      = order?.status === 'cancelled';

  // ── Cancel order ─────────────
  const handleCancel = async () => {
    if (!window.confirm('Cancel this order? Stock will be restored.')) return;
    try {
      await api.put(`/api/buyer/orders/${orderId}/cancel`);
      toast.success('Order cancelled — stock restored');
      fetchOrder(); // Refresh
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to cancel order');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar /><div className="pt-24"><LoadingSpinner /></div></div>
  );

  if (!order) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="pt-24 text-center">
        <p className="text-gray-400 mb-4">Order not found</p>
        <Link to="/dashboard" className="btn-primary">Back to Shopping</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Order #{orderId.slice(0, 8)}</h1>
              <RealTimeBadge />
            </div>
            <p className="text-gray-400 text-sm">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <Link to="/dashboard" className="btn-secondary text-sm">Continue Shopping</Link>
        </div>

        {/* Cancelled State */}
        {isCancelled && (
          <div className="card mb-6 bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <X size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-red-800">Order Cancelled</p>
                <p className="text-red-600 text-sm">Stock has been restored. If you paid online, refund will be processed in 5-7 days.</p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery OTP Banner */}
        {order?.deliveryOtp && order?.status !== 'delivered' && (
          <div className="card mb-6 flex items-center justify-between border-2 border-primary-100 bg-primary-50 p-5 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-0.5">Delivery OTP</p>
              <h3 className="text-sm font-bold text-gray-800">Share this code with your delivery partner to confirm delivery</h3>
            </div>
            <div className="bg-primary-600 text-white font-extrabold text-2xl px-4 py-2 rounded-xl tracking-widest shadow-md">
              {order.deliveryOtp}
            </div>
          </div>
        )}

        {/* Timeline */}
        {!isCancelled && (
          <div className="card mb-6">
            <h2 className="font-bold text-gray-900 mb-6">Order Status</h2>
            <div className="relative">
              <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-100" />
              <div className="space-y-6">
                {ORDER_STEPS.map((step, i) => {
                  const isDone    = i <= currentStepIndex;
                  const isCurrent = i === currentStepIndex;
                  return (
                    <div key={step.key} className="flex items-start gap-4 relative">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                        isDone ? 'bg-primary-600 shadow-glow' : 'bg-gray-100'
                      } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}>
                        {isDone ? (
                          i === currentStepIndex
                            ? <span className="text-lg">{step.icon}</span>
                            : <Check size={16} className="text-white" />
                        ) : (
                          <span className="text-lg opacity-30">{step.icon}</span>
                        )}
                      </div>
                      <div className={isDone ? '' : 'opacity-40'}>
                        <p className={`font-semibold text-sm ${isCurrent ? 'text-primary-700' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                          {isCurrent && <span className="ml-2 badge bg-primary-100 text-primary-700 text-xs">Current</span>}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">{step.desc}</p>
                        {/* Show timestamp from trackingHistory */}
                        {order.trackingHistory?.find(h => h.status === step.key) && (
                          <p className="text-xs text-primary-500 mt-0.5">
                            {formatDate(order.trackingHistory.find(h => h.status === step.key).at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* Items */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Items Ordered</h2>
            <div className="space-y-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.imageUrl && <img src={item.imageUrl} className="w-10 h-10 rounded-xl object-cover" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.price)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Delivery + Payment */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin size={15} /> Delivery Address</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {order.deliveryAddress?.fullName && <><strong>{order.deliveryAddress.fullName}</strong><br/></>}
                {[order.deliveryAddress?.street, order.deliveryAddress?.city,
                  order.deliveryAddress?.state, order.deliveryAddress?.pincode]
                  .filter(Boolean).join(', ')}
              </p>
              {order.deliveryAddress?.phone && (
                <p className="text-gray-400 text-xs mt-1">📞 {order.deliveryAddress.phone}</p>
              )}
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3">Payment</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <span className="font-medium">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                </span>
              </div>
            </div>

            {order.deliveryAgentName && (
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Truck size={15} /> Delivery Agent</h3>
                <p className="text-gray-800 font-medium">{order.deliveryAgentName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cancel button — only for pending orders */}
        {order.status === 'pending' && (
          <button onClick={handleCancel} className="w-full btn-danger py-3">
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
