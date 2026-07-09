import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

// ── Public Pages ─────────────────────────────────────────────────────────────
import Landing  from './pages/Landing';
import Login    from './pages/Login';
import Register from './pages/Register';

// ── Features (all logged-in users) ──────────────────────────────────────────
import CropDisease  from './pages/features/CropDisease';
import MarketPrices from './pages/features/MarketPrices';
import AiPlanner    from './pages/features/AiPlanner';
import AgriNews     from './pages/features/AgriNews';
import AgroLoan     from './pages/features/AgroLoan';
import AgroBot      from './pages/features/AgroBot';
import Community    from './pages/features/Community';
import Notifications from './pages/features/Notifications';
import AdminNotifications from './pages/admin/AdminNotifications';

// ── Weather ───────────────────────────────────────────────────────────────────
import WeatherPage from './pages/weather/WeatherPage';

// ── Buyer ─────────────────────────────────────────────────────────────────────
import FeatureDashboard from './pages/buyer/FeatureDashboard';
import OrderTracking    from './pages/buyer/OrderTracking';
import BuyerOrders      from './pages/buyer/BuyerOrders';
import BuyerProfile     from './pages/buyer/BuyerProfile';


// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts  from './pages/admin/AdminProducts';
import AdminAddProduct from './pages/admin/AdminAddProduct';
import AdminOrders    from './pages/admin/AdminOrders';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminDelivery  from './pages/admin/AdminDelivery';
import AdminUsers     from './pages/admin/AdminUsers';

// ── Delivery ──────────────────────────────────────────────────────────────────
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';

// ─── Route Guards ──────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">Loading…</p>
    </div>
  </div>
);

function PrivateRoute({ children, allowedRoles }) {
  const { user, userProfile, loading } = useAuth();
  if (loading || (user && !userProfile)) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(userProfile?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

// Any logged-in user — no role restriction
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}


function RoleRedirect() {
  const { user, userProfile, loading } = useAuth();
  if (loading || (user && !userProfile)) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  const map = { buyer: '/dashboard', admin: '/admin', delivery: '/delivery' };
  return <Navigate to={map[userProfile.role] || '/dashboard'} replace />;
}

import { triggerNotification } from './utils/notifications';

function AppRoutes() {
  const { user } = useAuth();



  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth-redirect" element={<RoleRedirect />} />

      {/* ── Features — all logged-in users ───────────────────────────── */}
      <Route path="/weather"                element={<WeatherPage />} />
      <Route path="/features/crop-disease"  element={<AuthRoute><CropDisease /></AuthRoute>} />
      <Route path="/features/market-prices" element={<AuthRoute><MarketPrices /></AuthRoute>} />
      <Route path="/features/planner"       element={<AuthRoute><AiPlanner /></AuthRoute>} />
      <Route path="/features/news"          element={<AuthRoute><AgriNews /></AuthRoute>} />
      <Route path="/features/loan"          element={<AuthRoute><AgroLoan /></AuthRoute>} />
      <Route path="/features/chatbot"       element={<AuthRoute><AgroBot /></AuthRoute>} />
      <Route path="/features/community"     element={<AuthRoute><Community /></AuthRoute>} />
      <Route path="/features/notifications" element={<AuthRoute><Notifications /></AuthRoute>} />

      {/* ── Buyer ────────────────────────────────────────────────────── */}
      <Route path="/dashboard"                element={<PrivateRoute allowedRoles={['buyer']}><FeatureDashboard /></PrivateRoute>} />
      <Route path="/orders"                   element={<PrivateRoute allowedRoles={['buyer']}><BuyerOrders /></PrivateRoute>} />
      <Route path="/orders/:orderId"          element={<PrivateRoute allowedRoles={['buyer']}><OrderTracking /></PrivateRoute>} />
      <Route path="/profile"                  element={<PrivateRoute allowedRoles={['buyer']}><BuyerProfile /></PrivateRoute>} />
      <Route path="/become-seller"            element={<Navigate to="/dashboard" replace />} />
      <Route path="/:section"                 element={<PrivateRoute allowedRoles={['buyer']}><FeatureDashboard /></PrivateRoute>} />

      {/* ── Admin ────────────────────────────────────────────────────── */}
      <Route path="/admin"            element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/users"      element={<PrivateRoute allowedRoles={['admin']}><AdminUsers /></PrivateRoute>} />
      <Route path="/admin/products"   element={<PrivateRoute allowedRoles={['admin']}><AdminProducts /></PrivateRoute>} />
      <Route path="/admin/products/add"   element={<PrivateRoute allowedRoles={['admin']}><AdminAddProduct /></PrivateRoute>} />
      <Route path="/admin/products/edit/:id" element={<PrivateRoute allowedRoles={['admin']}><AdminAddProduct /></PrivateRoute>} />
      <Route path="/admin/orders"     element={<PrivateRoute allowedRoles={['admin']}><AdminOrders /></PrivateRoute>} />
      <Route path="/admin/analytics"  element={<PrivateRoute allowedRoles={['admin']}><AdminAnalytics /></PrivateRoute>} />
      <Route path="/admin/delivery"   element={<PrivateRoute allowedRoles={['admin']}><AdminDelivery /></PrivateRoute>} />
      <Route path="/admin/notifications" element={<PrivateRoute allowedRoles={['admin']}><AdminNotifications /></PrivateRoute>} />

      {/* ── Delivery ─────────────────────────────────────────────────── */}
      <Route path="/delivery" element={<PrivateRoute allowedRoles={['delivery']}><DeliveryDashboard /></PrivateRoute>} />

      {/* ── Fallback ──────────────────────────────────────────────────── */}
      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-black text-gray-900">403</h1>
            <p className="text-gray-500 mt-2">You don't have access to this page.</p>
            <a href="/" className="btn-primary mt-4 inline-block">Go Home</a>
          </div>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useEffect } from 'react';
import { initOneSignal } from './utils/notifications';

export default function App() {
  useEffect(() => {
    initOneSignal();
  }, []);

  const GOOGLE_CLIENT_ID = "1088545736944-buf4nercqib5ptim9chdq0i71gvh719v.apps.googleusercontent.com";
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
