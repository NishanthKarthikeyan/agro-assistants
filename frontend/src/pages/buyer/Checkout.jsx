import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import api from '../../utils/api';
import Navbar from '../../components/layout/Navbar';
import toast from 'react-hot-toast';
import { MapPin, CreditCard, Truck, ArrowRight, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

export default function Checkout() {
  const { userProfile } = useAuth();
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState({
    fullName: userProfile?.displayName || '',
    phone:    userProfile?.phone || '',
    street:   userProfile?.address?.street || '',
    city:     userProfile?.address?.city   || '',
    state:    userProfile?.address?.state  || '',
    pincode:  userProfile?.address?.pincode || '',
  });

  const handleChange = (e) => setAddress(a => ({ ...a, [e.target.name]: e.target.value }));

  // ── Load Razorpay script ───────────────────────────────────────────────
  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  // ── API Call: Place Order ──────────────────────────────────────────────
  const placeOrderAPI = async (razorpayOrderId = '', razorpayPaymentId = '') => {
    try {
      const payload = {
        items: items.map(i => ({
          productId:   i.productId,
          productName: i.productName,
          quantity:    i.quantity,
          price:       i.price,
          unit:        i.unit,
          imageUrl:    i.imageUrl || '',
          sellerId:    i.sellerId || '',
        })),
        totalAmount: total,
        deliveryAddress: address,
        paymentMethod: paymentMethod,
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
      };

      const res = await api.post('/api/buyer/orders', payload);
      
      clearCart();
      toast.success('Order placed successfully! 🎉');
      navigate(`/orders/${res.data.orderId}`);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Order failed. Try again.';
      toast.error(msg);
      throw e;
    }
  };

  // ── COD handler ───────────────────────────────────────────────────────
  const handleCOD = async () => {
    if (!address.city || !address.street) { toast.error('Please fill delivery address'); return; }
    setPlacing(true);
    try {
      await placeOrderAPI();
    } catch (e) {
      // Error is handled in placeOrderAPI
    } finally {
      setPlacing(false);
    }
  };

  // ── Razorpay handler ──────────────────────────────────────────────────
  const handleRazorpay = async () => {
    if (!address.city || !address.street) { toast.error('Please fill delivery address'); return; }
    setPlacing(true);

    const loaded = await loadRazorpay();
    if (!loaded) { toast.error('Failed to load payment gateway'); setPlacing(false); return; }

    try {
      const response = await api.post('/api/payment/create-order', { 
        amount: total, 
        orderId: 'pre_' + Date.now() 
      });
      const data = response.data;

      // Automatically mock successful payment if backend is missing Razorpay keys
      if (data.razorpay_order_id?.startsWith('mock_')) {
        toast.success('Development Mode: Simulating successful payment');
        await placeOrderAPI(data.razorpay_order_id, 'mock_payment_id_' + Date.now());
        return;
      }

      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount:      total * 100,
        currency:    'INR',
        name:        'Agro Assistant',
        description: 'Fresh Farm Products',
        order_id:    data.razorpay_order_id,
        handler: async (resp) => {
          try {
            const verifyRes = await api.post('/api/payment/verify', {
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
              order_id:            'pre_verify',
            });
            
            await placeOrderAPI(resp.razorpay_order_id, resp.razorpay_payment_id);
          } catch (e) {
            toast.error('Payment verification failed. Contact support.');
            setPlacing(false);
          }
        },
        prefill: {
          name:    address.fullName || userProfile?.displayName || '',
          email:   userProfile?.email || '',
          contact: address.phone || userProfile?.phone || '',
        },
        theme:  { color: '#16a34a' },
        modal:  { ondismiss: () => setPlacing(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { toast.error('Payment failed. Please try again.'); setPlacing(false); });
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 flex flex-col items-center justify-center text-center px-4">
          <ShoppingBag size={64} className="text-gray-200 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
          <p className="text-gray-400 text-sm mt-1">Add items from the marketplace first</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6">Browse Products</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <h1 className="page-header">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Address + Payment */}
          <div className="lg:col-span-2 space-y-5">
            {/* Delivery Address */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-primary-600" />
                <h2 className="font-bold text-gray-900">Delivery Details</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Full Name</label>
                    <input name="fullName" value={address.fullName} onChange={handleChange} placeholder="Recipient name" className="input" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input name="phone" value={address.phone} onChange={handleChange} placeholder="10-digit number" className="input" type="tel" />
                  </div>
                </div>
                <div>
                  <label className="label">Street / House No. *</label>
                  <input name="street" value={address.street} onChange={handleChange} placeholder="Street, House / Flat number" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">City *</label>
                    <input name="city" value={address.city} onChange={handleChange} placeholder="City" className="input" />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input name="state" value={address.state} onChange={handleChange} placeholder="State" className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">PIN Code</label>
                  <input name="pincode" value={address.pincode} onChange={handleChange} placeholder="6-digit PIN" className="input" maxLength={6} />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={18} className="text-primary-600" />
                <h2 className="font-bold text-gray-900">Payment Method</h2>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'cod',      icon: <Truck size={18} />,       label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
                  { id: 'razorpay', icon: <CreditCard size={18} />, label: 'Pay Online',        desc: 'UPI, Cards, Netbanking, Wallets — powered by Razorpay' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      paymentMethod === opt.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={paymentMethod === opt.id ? 'text-primary-600' : 'text-gray-400'}>{opt.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                      <p className="text-gray-400 text-xs">{opt.desc}</p>
                    </div>
                    {paymentMethod === opt.id && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="card sticky top-20">
              <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4 max-h-52 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-2">
                    {item.imageUrl && <img src={item.imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.price)}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span><span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between font-black text-xl text-gray-900 pt-2 border-t border-gray-100 mt-2">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={paymentMethod === 'cod' ? handleCOD : handleRazorpay}
                disabled={placing}
                className="btn-primary w-full mt-5 flex items-center justify-center gap-2 py-3.5"
              >
                {placing ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : (
                  <>{paymentMethod === 'cod' ? '🛒 Place Order (COD)' : '💳 Pay Now'} <ArrowRight size={16} /></>
                )}
              </button>

              {paymentMethod === 'razorpay' && (
                <p className="text-xs text-gray-400 text-center mt-2">🔒 Secured by Razorpay</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
