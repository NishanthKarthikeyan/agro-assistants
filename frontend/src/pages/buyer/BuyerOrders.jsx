import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Navbar from '../../components/layout/Navbar';
import { Package, MapPin, CreditCard, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function BuyerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/api/buyer/orders');
        setOrders(res.data.orders || []);
      } catch (err) {
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-indigo-100 text-indigo-800';
      case 'shipped': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        {orders.length === 0 ? (
          <div className="card text-center py-16">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">No orders found</h2>
            <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
            <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="card p-0 overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                      Order Placed
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                      Total Amount
                    </p>
                    <p className="text-sm font-bold text-primary-700">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                      Order ID
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      #{order.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex-grow sm:flex-grow-0 text-right">
                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      View Details <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-grow space-y-4">
                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {order.status === 'delivered' ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          <Clock size={18} className="text-yellow-500" />
                        )}
                        <span className="font-semibold text-gray-900 capitalize">
                          {order.status}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusColor(order.status)}`}>
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-3 mt-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package size={20} />
                                </div>
                              )}
                            </div>
                            <div className="flex-grow">
                              <h4 className="text-sm font-semibold text-gray-900">{item.productName}</h4>
                              <p className="text-sm text-gray-500">Qty: {item.quantity} {item.unit}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
