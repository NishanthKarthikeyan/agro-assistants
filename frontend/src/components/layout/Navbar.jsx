import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import {
  ShoppingCart, Menu, X, Leaf, LogOut, User, ChevronDown, ShoppingBag,
  LayoutDashboard, Cloud, Bot, Microscope, TrendingUp, Newspaper, Sprout, Landmark
} from 'lucide-react';
import CartDrawer from '../buyer/CartDrawer';

const FEATURES = [
  { to: '/features/crop-disease', icon: '🔬', label: 'Crop Disease' },
  { to: '/features/market-prices', icon: '📈', label: 'Market Prices' },
  { to: '/features/planner', icon: '🌱', label: 'AI Planner' },
  { to: '/features/news', icon: '📰', label: 'Agri News' },
  { to: '/features/loan', icon: '🏦', label: 'Agri Loan' },
  { to: '/features/chatbot', icon: '🤖', label: 'AI Chat' },
  { to: '/weather', icon: '🌤️', label: 'Weather' },
];

export default function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  const role = userProfile?.role;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dashboardLink = {
    buyer: '/dashboard',
    admin: '/admin',
    delivery: '/delivery',
  }[role] || '/dashboard';

  const isBuyer = role === 'buyer';

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={user ? dashboardLink : '/'} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-glow">
                <Leaf size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg hidden sm:block">
                Agro <span className="text-primary-600">Assistant</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {!user && (
                <>
                  <Link to="/weather" className="px-3 py-2 text-gray-600 hover:text-primary-600 font-medium text-sm transition-colors rounded-lg hover:bg-primary-50">
                    🌤️ Weather
                  </Link>
                  <Link to="/login" className="px-3 py-2 text-gray-600 hover:text-primary-600 font-medium text-sm transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary text-sm py-2 px-4">
                    Get Started
                  </Link>
                </>
              )}

              {user && (
                <>
                  {/* Dashboard Link */}
                  <Link
                    to={dashboardLink}
                    className={`flex items-center gap-1.5 px-3 py-2 font-medium text-sm rounded-lg transition-colors ${isActive(dashboardLink) ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'}`}
                  >
                    <LayoutDashboard size={15} />
                    Dashboard
                  </Link>

                  {/* Features Mega Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setFeaturesOpen(!featuresOpen)}
                      className={`flex items-center gap-1.5 px-3 py-2 font-medium text-sm rounded-lg transition-colors ${featuresOpen ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'}`}
                    >
                      <Sprout size={15} />
                      Features
                      <ChevronDown size={12} className={`transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {featuresOpen && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 animate-fade-in">
                        {FEATURES.map(f => (
                          <Link
                            key={f.to}
                            to={f.to}
                            onClick={() => setFeaturesOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive(f.to) ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            <span className="text-lg">{f.icon}</span>
                            <span>{f.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cart for buyers */}
                  {isBuyer && (
                    <button onClick={() => setCartOpen(true)} className="relative p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <ShoppingCart size={20} />
                      {itemCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {itemCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Profile dropdown */}
                  <div className="relative flex items-center gap-1.5">
                    <Link
                      to={role === 'seller' ? '/seller/profile' : '/profile'}
                      title="View / Edit Profile"
                      className="w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all flex items-center justify-center flex-shrink-0"
                    >
                      {userProfile?.profileImageUrl ? (
                        <img src={userProfile.profileImageUrl} className="w-full h-full object-cover" alt="profile" />
                      ) : (
                        <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                          <User size={15} className="text-primary-600" />
                        </div>
                      )}
                    </Link>

                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-1 py-2 px-1 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 max-w-[90px] truncate">
                        {userProfile?.displayName?.split(' ')[0] || 'User'}
                      </span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 animate-fade-in">
                        <div className="px-4 py-2 border-b border-gray-50">
                          <p className="text-xs text-gray-400 capitalize">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                              role === 'admin' ? 'bg-red-500' : role === 'seller' ? 'bg-blue-500' : role === 'delivery' ? 'bg-orange-500' : 'bg-green-500'
                            }`} />
                            {role} account
                          </p>
                          <p className="text-sm font-medium text-gray-800 truncate">{userProfile?.email}</p>
                        </div>
                        {(role === 'buyer') && (
                          <>
                            <Link to="/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <ShoppingBag size={15} /> My Orders
                            </Link>
                            <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <User size={15} /> My Profile
                            </Link>
                          </>
                        )}
                        <Link to="/features/chatbot" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          🤖 AI Chat
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={15} />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile: cart + menu */}
            <div className="md:hidden flex items-center gap-2">
              {isBuyer && (
                <button onClick={() => setCartOpen(true)} className="relative p-2">
                  <ShoppingCart size={20} className="text-gray-700" />
                  {itemCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{itemCount}</span>}
                </button>
              )}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-600 rounded-lg hover:bg-gray-50">
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto">
            {user && (
              <>
                <Link to={dashboardLink} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-primary-50 font-medium">
                  📊 Dashboard
                </Link>
                <p className="px-3 pt-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">Features</p>
                {FEATURES.map(f => (
                  <Link key={f.to} to={f.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-primary-50">
                    {f.icon} {f.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </>
            )}
            {!user && (
              <>
                <Link to="/weather" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-primary-50 font-medium">🌤️ Weather</Link>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-primary-50 font-medium">Sign In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary block text-center">Get Started</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Cart Drawer */}
      {isBuyer && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}

      {/* Click-away for dropdowns */}
      {(profileOpen || featuresOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setProfileOpen(false); setFeaturesOpen(false); }} />
      )}
    </>
  );
}
