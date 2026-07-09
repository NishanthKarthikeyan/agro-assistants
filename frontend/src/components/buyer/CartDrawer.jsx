import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

export default function CartDrawer({ open, onClose }) {
  const { items, total, updateQuantity, removeItem, itemCount } = useCart();
  const navigate = useNavigate();

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={onClose} />}

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary-600" />
            <h2 className="font-bold text-gray-900">Cart</h2>
            {itemCount > 0 && (
              <span className="bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
              <ShoppingCart size={56} strokeWidth={1} />
              <div className="text-center">
                <p className="font-semibold text-gray-500">Your cart is empty</p>
                <p className="text-sm mt-1">Add fresh produce from the marketplace</p>
              </div>
              <button onClick={onClose} className="btn-primary">Browse Products</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.productName} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🥬</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.productName}</p>
                    <p className="text-gray-400 text-xs">{item.sellerName} • {formatCurrency(item.price)}/{item.unit}</p>
                    <p className="text-primary-600 font-bold text-sm mt-0.5">{formatCurrency(item.price * item.quantity)}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl">
                      <button
                        onClick={() => item.quantity === 1 ? removeItem(item.productId) : updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1.5 hover:bg-gray-200 rounded-l-xl transition-colors"
                      >
                        {item.quantity === 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} className="text-gray-600" />}
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="p-1.5 hover:bg-gray-200 rounded-r-xl transition-colors disabled:opacity-40"
                      >
                        <Plus size={14} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-5 space-y-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
              <span className="font-black text-xl text-gray-900">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={() => { onClose(); navigate('/checkout'); }}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
