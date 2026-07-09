import { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// ── Single 3D Leaf ─────────────────────────────────────────────────────────────
function Leaf({ position, rotation, scale, speed, color }) {
  const mesh = useRef();

  const leafGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -1);
    shape.bezierCurveTo(0.55, -0.6, 0.75, 0.2, 0, 1);
    shape.bezierCurveTo(-0.75, 0.2, -0.55, -0.6, 0, -1);
    return new THREE.ShapeGeometry(shape, 8);
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.position.y += speed * 0.007;
    mesh.current.rotation.x = Math.sin(t * speed + rotation[0]) * 0.45;
    mesh.current.rotation.z = Math.sin(t * speed * 0.65 + rotation[2]) * 0.55;
    mesh.current.position.x += Math.sin(t * speed * 0.25) * 0.002;
    if (mesh.current.position.y > 7) {
      mesh.current.position.y = -7;
      mesh.current.position.x = (Math.random() - 0.5) * 10;
    }
  });

  return (
    <mesh ref={mesh} position={position} rotation={rotation} scale={scale} geometry={leafGeo}>
      <meshStandardMaterial
        color={color} side={THREE.DoubleSide}
        transparent opacity={0.7}
        roughness={0.65} metalness={0.08}
      />
    </mesh>
  );
}

// ── Leaf field ─────────────────────────────────────────────────────────────────
function LeafField({ count = 22 }) {
  const leaves = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      position: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 3 - 1],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      scale: [0.25 + Math.random() * 0.45, 0.25 + Math.random() * 0.45, 1],
      speed: 0.3 + Math.random() * 0.65,
      color: ['#16a34a','#15803d','#22c55e','#4ade80','#86efac','#fbbf24','#166534'][Math.floor(Math.random() * 7)],
    }))
  , [count]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 5, 3]} intensity={0.85} color="#d4f1be" />
      <pointLight position={[-4, -3, 2]} intensity={0.3} color="#22c55e" />
      {leaves.map(l => <Leaf key={l.id} {...l} />)}
    </>
  );
}

// ── Google SVG ─────────────────────────────────────────────────────────────────
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

// Google login now handled by Firebase signInWithPopup inside AuthContext

export default function Login() {
  const { login, loginWithGoogle, user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      navigate('/auth-redirect');
    }
  }, [user, userProfile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back! 🌾');
      navigate('/auth-redirect');
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password' : err.message;
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


  const inputStyle = {
    width: '100%', paddingLeft: 42, paddingRight: 14,
    paddingTop: 13, paddingBottom: 13,
    border: '1.5px solid #e5e7eb', borderRadius: 13,
    fontSize: '0.9rem', color: '#0f172a', background: '#f8fafc',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  };
  const inputFocus = (e) => { e.target.style.borderColor = '#16a34a'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.1)'; };
  const inputBlur  = (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800;900&display=swap');
        html, body { margin:0; padding:0; }
        .login-root { display:flex; min-height:100vh; font-family:'Inter',sans-serif; }

        /* Left panel hides on mobile */
        @media(max-width:768px){
          .login-left  { display:none !important; }
          .login-right {
            width:100% !important;
            background: linear-gradient(160deg,#050f05,#0a1a0a) !important;
            padding: 40px 24px !important;
          }
          .login-card {
            background: rgba(255,255,255,0.06) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            border-radius: 20px;
            padding: 32px 24px !important;
          }
          .login-welcome { color:#fff !important; }
          .login-sub     { color:rgba(255,255,255,0.5) !important; }
          .login-lbl     { color:rgba(255,255,255,0.75) !important; }
          .login-reg     { color:rgba(255,255,255,0.5) !important; }
          .login-reg a   { color:#4ade80 !important; }
        }

        /* Submit button */
        .login-btn {
          width:100%; padding:14px;
          background:linear-gradient(135deg,#16a34a,#22c55e);
          color:#fff; border:none; border-radius:13px;
          font-size:0.95rem; font-weight:700; cursor:pointer;
          box-shadow:0 4px 20px rgba(22,163,74,0.35);
          transition:transform 0.2s, box-shadow 0.2s;
          margin-bottom:20px; font-family:'Inter',sans-serif;
          letter-spacing:0.2px;
        }
        .login-btn:hover:not(:disabled){ transform:translateY(-2px); box-shadow:0 8px 28px rgba(22,163,74,0.5); }
        .login-btn:active:not(:disabled){ transform:translateY(0); }
        .login-btn:disabled { opacity:0.7; cursor:not-allowed; }

        /* Google button */
        .login-google {
          width:100%; padding:12px;
          display:flex; align-items:center; justify-content:center; gap:10px;
          background:#fff; border:1.5px solid #e5e7eb; border-radius:13px;
          font-size:0.9rem; font-weight:600; color:#0f172a; cursor:pointer;
          transition:all 0.2s; margin-bottom:24px; font-family:'Inter',sans-serif;
        }
        .login-google:hover:not(:disabled){ border-color:#16a34a; background:#f0fdf4; }
        .login-google:disabled { opacity:0.7; cursor:not-allowed; }

        /* Divider */
        .login-divider {
          display:flex; align-items:center; gap:12px;
          margin-bottom:18px; color:#9ca3af; font-size:0.8rem;
        }
        .login-divider::before,.login-divider::after{
          content:''; flex:1; height:1px; background:#e5e7eb;
        }

        /* Farm silhouette animation */
        @keyframes farmSway {
          0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)}
        }
      `}</style>

      <div className="login-root">

        {/* ── LEFT PANEL — Dark green + 3D leaves ── */}
        <div className="login-left" style={{
          width: '55%', flexShrink: 0,
          background: 'linear-gradient(135deg, #050f05 0%, #0a1a0a 55%, #0d2d0d 100%)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px',
        }}>
          {/* Three.js leaf canvas */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 62 }} gl={{ alpha: true }}>
              <LeafField count={22} />
            </Canvas>
          </div>

          {/* Dark overlay for readability */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,15,5,0.52)', pointerEvents: 'none' }} />

          {/* Farm silhouette SVG */}
          <svg viewBox="0 0 500 90" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', opacity: 0.2, pointerEvents: 'none' }}>
            <path d="M0,90 L0,56 Q60,32 120,56 Q180,76 240,46 Q300,18 360,54 Q420,78 500,44 L500,90 Z" fill="#16a34a" />
            <rect x="148" y="40" width="9" height="30" fill="#0a1a0a" />
            <ellipse cx="152" cy="33" rx="17" ry="21" fill="#0a1a0a" />
            <rect x="338" y="44" width="9" height="30" fill="#0a1a0a" />
            <ellipse cx="342" cy="37" rx="15" ry="19" fill="#0a1a0a" />
          </svg>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 380 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                width: 90, height: 90,
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 26px', fontSize: '2.8rem',
                boxShadow: '0 0 55px rgba(22,163,74,0.62), 0 0 110px rgba(22,163,74,0.2)',
              }}
            >🌿</motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                fontFamily: 'Poppins, sans-serif',
                color: '#ffffff', fontSize: '2.6rem', fontWeight: 900,
                lineHeight: 1.1, margin: '0 0 2px',
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              AI Agro
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: '2.6rem', fontWeight: 900,
                lineHeight: 1.1, margin: '0 0 18px',
                background: 'linear-gradient(135deg, #22c55e, #86efac)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}
            >
              Assistant
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              style={{
                color: 'rgba(255,255,255,0.62)', fontSize: '1rem',
                lineHeight: 1.65, margin: '0 0 32px',
              }}
            >
              Empowering Indian Farmers with AI
            </motion.p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
              {[
                { icon: '🌾', text: 'Direct farmer-to-buyer marketplace' },
                { icon: '🔬', text: 'AI crop disease detection' },
                { icon: '🌤️', text: 'Realtime weather & farming insights' },
                { icon: '📊', text: 'Live APMC mandi price tracker' },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.12 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'rgba(22,163,74,0.12)',
                    border: '1px solid rgba(22,163,74,0.28)',
                    borderRadius: 13,
                  }}
                >
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 500 }}>{f.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — White form ── */}
        <div className="login-right" style={{
          flex: 1, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 44px',
        }}>
          <motion.div
            className="login-card"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: 370 }}
          >
            <h2 className="login-welcome" style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: '1.75rem', fontWeight: 800,
              color: '#0f172a', margin: '0 0 4px',
            }}>
              Welcome Back 👋
            </h2>
            <p className="login-sub" style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 30px' }}>
              Sign in to your Agro Assistant account
            </p>

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label className="login-lbl" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>📧</span>
                  <input
                    id="login-email"
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={inputStyle}
                    onFocus={inputFocus} onBlur={inputBlur}
                    required autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 26 }}>
                <label className="login-lbl" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔒</span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={inputFocus} onBlur={inputBlur}
                    required autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                      display: 'flex', alignItems: 'center', padding: 4,
                      transition: 'color 0.2s',
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-btn">
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <div className="login-divider">or</div>

            <button onClick={handleGoogle} disabled={gLoading} className="login-google">
              <GoogleIcon />
              {gLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <p className="login-reg" style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Register here</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
