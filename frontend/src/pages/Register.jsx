import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
// Google login now handled by Firebase signInWithPopup inside AuthContext


// ── Shared left panel component (reused on Login + Register) ──────────────────
function AuthLeftPanel() {
  return (
    <div style={{
      width: '55%', flexShrink: 0,
      background: 'linear-gradient(135deg, #050f05 0%, #0a1a0a 55%, #0d2d0d 100%)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px',
    }}>
      {/* Animated orb glows */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(22,163,74,0.22) 0%, transparent 70%)',
        top: -100, left: -80, filter: 'blur(60px)',
        animation: 'orbA 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)',
        bottom: -60, right: -60, filter: 'blur(60px)',
        animation: 'orbB 12s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
        top: '45%', left: '55%', filter: 'blur(50px)',
        animation: 'orbA 7s ease-in-out infinite reverse',
      }} />

      {/* Farm silhouette */}
      <svg viewBox="0 0 500 100" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', opacity: 0.18 }}>
        <path d="M0,100 L0,60 Q60,35 120,60 Q180,80 240,50 Q300,22 360,58 Q420,82 500,48 L500,100 Z" fill="#16a34a" />
        <rect x="150" y="42" width="9" height="32" fill="#0a1a0a" />
        <ellipse cx="154" cy="36" rx="18" ry="22" fill="#0a1a0a" />
        <rect x="340" y="47" width="9" height="30" fill="#0a1a0a" />
        <ellipse cx="344" cy="41" rx="16" ry="20" fill="#0a1a0a" />
        <rect x="420" y="96" width="55" height="40" fill="#071507" />
        <polygon points="415,96 475,96 445,72" fill="#050f05" />
      </svg>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 380 }}>
        <div style={{
          width: 90, height: 90,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 26px', fontSize: '2.8rem',
          boxShadow: '0 0 55px rgba(22,163,74,0.62), 0 0 110px rgba(22,163,74,0.2)',
        }}>🌿</div>

        <h1 style={{
          fontFamily: 'Poppins, sans-serif',
          color: '#ffffff', fontSize: '2.6rem', fontWeight: 900,
          lineHeight: 1.1, margin: '0 0 2px',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>AI Agro</h1>
        <h1 style={{
          fontFamily: 'Poppins, sans-serif',
          fontSize: '2.6rem', fontWeight: 900,
          lineHeight: 1.1, margin: '0 0 18px',
          background: 'linear-gradient(135deg, #22c55e, #86efac)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Platform</h1>

        <p style={{
          color: 'rgba(255,255,255,0.62)', fontSize: '1rem',
          lineHeight: 1.65, margin: '0 0 32px',
        }}>
          Join India's smartest agricultural marketplace — buy fresh produce, sell your harvest, and get AI-powered farming insights.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
          {[
            { icon: '🌾', text: 'Direct farmer-to-buyer marketplace' },
            { icon: '🔬', text: 'AI crop disease detection' },
            { icon: '🌤️', text: 'Real-time weather insights' },
            { icon: '📊', text: 'Live APMC mandi prices' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              background: 'rgba(22,163,74,0.12)',
              border: '1px solid rgba(22,163,74,0.28)',
              borderRadius: 13,
            }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes orbA { 0%,100%{transform:translate(0,0)} 50%{transform:translate(24px,-36px)} }
        @keyframes orbB { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,28px)} }
      `}</style>
    </div>
  );
}

// ── Google SVG icon ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Input with icon ───────────────────────────────────────────────────────────
function AuthInput({ label, icon, optional, children, ...props }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: '0.82rem', fontWeight: 600,
        color: '#374151', marginBottom: 6,
      }}>
        {label} {optional && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          fontSize: '1rem', pointerEvents: 'none',
        }}>{icon}</span>
        {children || (
          <input style={{
            width: '100%', paddingLeft: 38, paddingRight: 14,
            paddingTop: 12, paddingBottom: 12,
            border: '1.5px solid #e5e7eb', borderRadius: 12,
            fontSize: '0.88rem', color: '#111', background: '#f9fafb',
            outline: 'none', transition: 'border-color 0.2s, background 0.2s',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
            onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
            {...props}
          />
        )}
      </div>
    </div>
  );
}

// ── Main Register component ───────────────────────────────────────────────────
export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ displayName: '', email: '', password: '', phone: '' });
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [gLoading, setGLoading]   = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.displayName || !form.email || !form.password)
      return toast.error('Please fill all required fields');
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        role: 'buyer',        // Default: always buyer
        phone: form.phone,
        address: {},
        profileImageUrl: '',
      });
      toast.success('Account created! Welcome to Agro Assistant 🌾');
      navigate('/auth-redirect');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Email already registered — try logging in'
        : err.message;
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google! 🌿');
      navigate('/auth-redirect');
    } catch (err) {
      toast.error(err.message || 'Google Login Failed');
    } finally {
      setGLoading(false);
    }
  };


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap');
        .reg-root { display:flex; min-height:100vh; font-family:'Inter',sans-serif; }
        @media(max-width:768px){
          .reg-left  { display:none !important; }
          .reg-right { width:100% !important; background:linear-gradient(160deg,#050f05,#0a1a0a) !important; }
          .reg-box   { background:rgba(255,255,255,0.05) !important; border:1px solid rgba(255,255,255,0.1) !important; border-radius:20px; padding:32px 24px !important; }
          .reg-h2    { color:#fff !important; }
          .reg-sub   { color:rgba(255,255,255,0.55) !important; }
          .reg-signin{ color:rgba(255,255,255,0.5) !important; }
          .reg-signin a { color:#4ade80 !important; }
          .reg-note  { color:rgba(255,255,255,0.35) !important; }
        }
        .reg-submit {
          width:100%; padding:14px;
          background:linear-gradient(135deg,#16a34a,#22c55e);
          color:#fff; border:none; border-radius:12px;
          font-size:0.95rem; font-weight:700; cursor:pointer;
          box-shadow:0 4px 20px rgba(22,163,74,0.35);
          transition:transform 0.2s, box-shadow 0.2s;
          margin-bottom:18px; font-family:inherit;
        }
        .reg-submit:hover:not(:disabled){ transform:translateY(-2px); box-shadow:0 8px 28px rgba(22,163,74,0.45); }
        .reg-submit:disabled { opacity:0.7; cursor:not-allowed; }
        .reg-google {
          width:100%; padding:12px;
          display:flex; align-items:center; justify-content:center; gap:10px;
          background:#fff; border:1.5px solid #e5e7eb;
          border-radius:12px; font-size:0.88rem; font-weight:600;
          color:#111; cursor:pointer; transition:all 0.2s;
          margin-bottom:22px; font-family:inherit;
        }
        .reg-google:hover:not(:disabled){ border-color:#16a34a; background:#f0fdf4; }
        .reg-google:disabled { opacity:0.7; cursor:not-allowed; }
        .reg-divider {
          display:flex; align-items:center; gap:12px;
          margin-bottom:16px; color:#9ca3af; font-size:0.8rem;
        }
        .reg-divider::before,.reg-divider::after{
          content:''; flex:1; height:1px; background:#e5e7eb;
        }
      `}</style>

      <div className="reg-root">
        {/* ── LEFT PANEL ── */}
        <div className="reg-left" style={{ display: 'flex' }}>
          <AuthLeftPanel />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="reg-right" style={{
          flex: 1, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px', overflowY: 'auto',
        }}>
          <div className="reg-box" style={{ width: '100%', maxWidth: 380 }}>
            <h2 className="reg-h2" style={{
              fontFamily: 'Poppins,sans-serif',
              fontSize: '1.7rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px',
            }}>
              Create Account 🌾
            </h2>
            <p className="reg-sub" style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 28px' }}>
              Join India's smartest farm marketplace
            </p>

            <form onSubmit={handleRegister}>
              {/* Full Name */}
              <AuthInput label="Full Name *" icon="👤" name="displayName" value={form.displayName}
                onChange={handleChange} placeholder="Rajesh Kumar" required autoComplete="name" />

              {/* Email */}
              <AuthInput label="Email Address *" icon="📧" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com" required autoComplete="email" />

              {/* Phone (optional) */}
              <AuthInput label="Phone" icon="📱" optional name="phone" value={form.phone}
                onChange={handleChange} placeholder="+91 98765 43210" autoComplete="tel" />

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔒</span>
                  <input
                    name="password" type={showPass ? 'text' : 'password'}
                    value={form.password} onChange={handleChange}
                    placeholder="Min. 6 characters" required autoComplete="new-password"
                    style={{
                      width: '100%', paddingLeft: 38, paddingRight: 44,
                      paddingTop: 12, paddingBottom: 12,
                      border: '1.5px solid #e5e7eb', borderRadius: 12,
                      fontSize: '0.88rem', color: '#111', background: '#f9fafb',
                      outline: 'none', transition: 'border-color 0.2s, background 0.2s',
                      fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                  />
                  <button
                    type="button" onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                      display: 'flex', alignItems: 'center', padding: 4,
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="reg-submit">
                {loading ? 'Creating Account…' : 'Create Account 🌾'}
              </button>
            </form>

            <div className="reg-divider">or</div>

            <button onClick={handleGoogle} disabled={gLoading} className="reg-google">
              <GoogleIcon />
              {gLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <p className="reg-signin" style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', margin: '0 0 14px' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </p>

            <p className="reg-note" style={{ textAlign: 'center', fontSize: '0.73rem', color: '#9ca3af', lineHeight: 1.5 }}>
              ℹ️ Welcome to the platform!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
