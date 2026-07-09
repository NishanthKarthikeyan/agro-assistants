import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

function calcTotals(items) {
  const total     = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  return { total, itemCount };
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ── LocalStorage loading ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoaded(true);
      return;
    }

    try {
      const storedCart = localStorage.getItem(`cart_${user.uid}`);
      if (storedCart) {
        setItems(JSON.parse(storedCart));
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [user?.uid]);

  // ── LocalStorage auto-saving ─────────────────────────────────────────────
  // Automatically saves cart when items change (avoids double saves in StrictMode)
  useEffect(() => {
    if (!loaded) return; // Don't overwrite before initial load
    if (!user?.uid) return;
    
    setSyncing(true);
    try {
      if (items.length === 0) {
        localStorage.removeItem(`cart_${user.uid}`);
      } else {
        localStorage.setItem(`cart_${user.uid}`, JSON.stringify(items));
      }
    } catch (e) {
      console.error('Cart write error:', e);
    } finally {
      setSyncing(false);
    }
  }, [items, loaded, user?.uid]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const addItem = useCallback((item) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(i.quantity + (item.quantity || 1), i.stock) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setItems(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
        : i
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const clampToStock = useCallback((productId, liveStock) => {
    setItems(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item || item.quantity <= liveStock) return prev;
      toast(`Only ${liveStock} left — quantity adjusted`, { icon: '⚠️' });
      return prev.map(i =>
        i.productId === productId ? { ...i, quantity: liveStock, stock: liveStock } : i
      );
    });
  }, []);

  const { total, itemCount } = calcTotals(items);

  return (
    <CartContext.Provider value={{
      items, total, itemCount, syncing,
      addItem, removeItem, updateQuantity, clearCart, clampToStock,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
