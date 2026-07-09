import { useRef, useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ArrowRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — Realistic 3D Leaf
// ─────────────────────────────────────────────────────────────────────────────
function Leaf({ position, rotSpeed, scale, color, phase }) {
  const mesh = useRef();
  const leafGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -1.2);
    shape.bezierCurveTo(0.7, -0.7, 1.0, 0.1, 0, 1.2);
    shape.bezierCurveTo(-1.0, 0.1, -0.7, -0.7, 0, -1.2);
    return new THREE.ShapeGeometry(shape, 12);
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime() + phase;
    mesh.current.position.y += 0.006 * rotSpeed;
    mesh.current.position.x += Math.sin(t * rotSpeed * 0.4) * 0.004;
    mesh.current.rotation.x = Math.sin(t * rotSpeed * 0.6) * 0.5;
    mesh.current.rotation.y += rotSpeed * 0.008;
    mesh.current.rotation.z = Math.sin(t * rotSpeed * 0.3 + 1) * 0.7;
    if (mesh.current.position.y > 9) {
      mesh.current.position.y = -9;
      mesh.current.position.x = (Math.random() - 0.5) * 16;
    }
  });

  return (
    <mesh ref={mesh} position={position} scale={scale} geometry={leafGeo}>
      <meshStandardMaterial
        color={color} side={THREE.DoubleSide}
        transparent opacity={0.72}
        roughness={0.5} metalness={0.05}
      />
    </mesh>
  );
}

function LeafParticles() {
  const leaves = useMemo(() => {
    const colors = ['#16a34a','#15803d','#22c55e','#4ade80','#86efac','#fbbf24','#a3e635','#166534'];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      position: [(Math.random()-0.5)*18, (Math.random()-0.5)*18, Math.random()*3-4],
      rotSpeed: 0.4 + Math.random() * 0.8,
      scale: [0.25 + Math.random()*0.45, 0.25 + Math.random()*0.45, 1],
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 3]} intensity={0.9} color="#d4f1be" />
      <pointLight position={[-6,-4,2]} intensity={0.4} color="#22c55e" />
      <pointLight position={[6, 4,-2]} intensity={0.3} color="#fbbf24" />
      {leaves.map(l => <Leaf key={l.id} {...l} />)}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTER — animates 0→target on scroll into view
// ─────────────────────────────────────────────────────────────────────────────
function CounterNumber({ target, prefix='', suffix='', label, dark }) {
  const [count, setCount] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1800, 1);
        const ease = 1 - Math.pow(1-p, 3);
        setCount(Math.floor(ease * target));
        if (p < 1) requestAnimationFrame(step); else setCount(target);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return (
    <div ref={ref} style={{ textAlign:'center' }}>
      <div style={{
        fontFamily:'Poppins,sans-serif',
        fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:900,
        color:'#fbbf24', lineHeight:1,
      }}>{prefix}{count}{suffix}</div>
      <div style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize:'0.85rem', marginTop:6, fontWeight:500 }}>
        {label}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D TILT CARD
// ─────────────────────────────────────────────────────────────────────────────
function TiltCard({ feature, index, dark }) {
  const cardRef = useRef();
  const handleMouseMove = (e) => {
    const card = cardRef.current; if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(700px) rotateX(${-y*11}deg) rotateY(${x*11}deg) scale(1.025)`;
    card.style.boxShadow = dark
      ? '0 20px 50px rgba(22,163,74,0.2), 0 0 0 1px rgba(22,163,74,0.25)'
      : '0 20px 50px rgba(22,163,74,0.15), 0 0 0 1px rgba(22,163,74,0.3)';
  };
  const handleMouseLeave = () => {
    const card = cardRef.current; if (!card) return;
    card.style.transform = 'perspective(700px) rotateX(0) rotateY(0) scale(1)';
    card.style.boxShadow = dark
      ? '0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(22,163,74,0.1)'
      : '0 2px 16px rgba(0,0,0,0.06), 0 0 0 1px #e5e7eb';
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity:0, y:50 }}
      whileInView={{ opacity:1, y:0 }}
      transition={{ delay: index*0.08, duration:0.5, ease:'easeOut' }}
      viewport={{ once:true, margin:'-80px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: dark ? '1px solid rgba(22,163,74,0.15)' : '1px solid #e5e7eb',
        borderRadius:20, padding:'28px 24px',
        cursor:'default',
        transition:'transform 0.12s ease, box-shadow 0.3s ease',
        boxShadow: dark ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.06)',
        willChange:'transform',
      }}
    >
      <div style={{ fontSize:'2.5rem', marginBottom:14 }}>{feature.icon}</div>
      <h3 style={{ fontFamily:'Poppins,sans-serif', color: dark?'#fff':'#111827', fontSize:'1rem', fontWeight:700, margin:'0 0 10px' }}>
        {feature.title}
      </h3>
      <p style={{ color: dark?'rgba(255,255,255,0.6)':'rgba(0,0,0,0.58)', fontSize:'0.85rem', lineHeight:1.65, margin:0 }}>
        {feature.desc}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIALS CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name:'Murugan Rajan',   role:'Tomato Farmer, Salem',      text:'Within 2 weeks I sold 500 kg without a broker. The AI price tool is incredible!' },
  { name:'Kavitha Selvam',  role:'Buyer, Coimbatore',         text:'Fresh vegetables directly from farmers — no chemicals! Disease detection saved my crop.' },
  { name:'Arumugam Pillai', role:'Rice Farmer, Thanjavur',    text:'AI Crop Planner told me exact yield. Saved ₹25,000 last season!' },
  { name:'Priya Natarajan', role:'Vegetable Seller, Madurai', text:'I check market prices every morning before going to the mandi. Totally changed my strategy.' },
  { name:'Senthil Kumar',   role:'Farmer, Dindigul',          text:'Weather advisory saved my crop! Warned me about rain 2 days early.' },
];

function TestimonialsCarousel({ dark }) {
  const trackRef = useRef();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const track = trackRef.current; if (!track) return;
    let pos = 0; let raf;
    const tick = () => {
      if (!paused) {
        pos -= 0.45;
        const totalW = track.scrollWidth / 2;
        if (Math.abs(pos) >= totalW) pos = 0;
        track.style.transform = `translateX(${pos}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div style={{ overflow:'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={trackRef} style={{ display:'flex', gap:20, padding:'12px 0', willChange:'transform' }}>
        {doubled.map((t, i) => (
          <div key={i} style={{
            flexShrink:0, width:320,
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
            border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(22,163,74,0.15)',
            backdropFilter:'blur(10px)', borderRadius:18, padding:'22px 20px',
          }}>
            <div style={{ fontSize:'0.95rem', marginBottom:10 }}>⭐⭐⭐⭐⭐</div>
            <p style={{ color: dark?'rgba(255,255,255,0.78)':'rgba(0,0,0,0.72)', fontSize:'0.85rem', lineHeight:1.7, margin:'0 0 16px', fontStyle:'italic' }}>
              "{t.text}"
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'0.9rem', flexShrink:0 }}>
                {t.name.charAt(0)}
              </div>
              <div>
                <p style={{ color: dark?'#fff':'#111827', fontWeight:700, fontSize:'0.82rem', margin:0 }}>{t.name}</p>
                <p style={{ color: dark?'rgba(255,255,255,0.45)':'rgba(0,0,0,0.45)', fontSize:'0.72rem', margin:'2px 0 0' }}>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon:'🌾', title:'Sell Fresh Produce',   desc:'List vegetables, fruits, grains directly to buyers at fair prices — no middlemen.' },
  { icon:'🛒', title:'Buy Farm Fresh',        desc:'Get fresh produce directly from local farmers with real-time stock and live prices.' },
  { icon:'🌤️', title:'AI Weather Insights',  desc:'Animated 7-day forecast with AI-powered farming advisories for your region.' },
  { icon:'🔬', title:'Disease Detection',     desc:'Upload a leaf photo — AI diagnoses disease and recommends treatment instantly.' },
  { icon:'📊', title:'Market Prices',         desc:'Live vegetable prices from APMC mandis across India, updated in real-time.' },
  { icon:'🤖', title:'AI Crop Planner',       desc:'Custom farming plans with cost estimates, yield projections, and weekly guides.' },
];

const STEPS = [
  { icon:'📝', step:'01', title:'Register & Choose Role', desc:'Sign up as Buyer or Seller in under a minute.' },
  { icon:'🔍', step:'02', title:'Explore Marketplace',   desc:'Browse fresh produce with real-time stock and prices.' },
  { icon:'💳', step:'03', title:'Secure Payments',       desc:'Pay via Razorpay — UPI, cards, wallets, or COD.' },
  { icon:'📍', step:'04', title:'Track Live',            desc:'Follow your order — packed, dispatched, delivered.' },
];

const AI_FEATURES = [
  {
    icon:'🌤️', title:'AI Weather Intelligence',
    desc:'Get hyper-local 7-day forecasts with AI farming advisories. Know when to irrigate, spray, or harvest.',
    points:['7-day animated forecast','AI farming advisory','Rain & fog probability','UV risk levels'],
    color:'#60a5fa',
  },
  {
    icon:'🔬', title:'Crop Disease Detection',
    desc:'Upload any diseased leaf photo and get instant AI diagnosis with organic & chemical treatment options.',
    points:['Instant leaf analysis','Disease name & severity','Organic & chemical treatment','Tamil language support'],
    color:'#4ade80',
  },
  {
    icon:'🌱', title:'AI Crop Planner',
    desc:'Enter land area and location. Get a complete farming plan with cost breakdown and profit estimates.',
    points:['Season-specific plans','Cost & profit estimates','Step-by-step weekly guide','Location-based advice'],
    color:'#fbbf24',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// THEME HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const theme = {
  bg:        (d) => d ? '#050f05'   : '#f0fdf4',
  bg2:       (d) => d ? '#070d07'   : '#ffffff',
  bg3:       (d) => d ? '#0a1a0a'   : '#dcfce7',
  text:      (d) => d ? '#ffffff'   : '#111827',
  textSub:   (d) => d ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.58)',
  cardBg:    (d) => d ? 'rgba(255,255,255,0.04)' : '#ffffff',
  cardBord:  (d) => d ? 'rgba(22,163,74,0.15)' : '#e5e7eb',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [dark, setDark] = useState(true); // DEFAULT: DARK MODE

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        .landing-root { font-family:'Inter',sans-serif; overflow-x:hidden; }

        /* Navbar */
        .l-nav {
          position:fixed; top:0; left:0; right:0; z-index:300;
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 40px;
          transition: background 0.4s ease, border-color 0.4s ease;
        }
        @media(max-width:600px){ .l-nav{ padding:14px 18px; } }
        .l-nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .l-nav-logo-icon {
          width:36px; height:36px;
          background:linear-gradient(135deg,#16a34a,#22c55e);
          border-radius:10px; display:flex; align-items:center; justify-content:center;
          font-size:1.15rem; box-shadow:0 0 16px rgba(22,163,74,0.4);
        }
        .l-nav-links { display:flex; align-items:center; gap:10px; }
        .l-nav-btn {
          text-decoration:none; font-weight:600; font-size:0.88rem;
          padding:8px 16px; border-radius:10px; transition:all 0.2s;
        }
        .l-nav-register {
          background:linear-gradient(135deg,#16a34a,#22c55e); color:#fff;
          text-decoration:none; font-weight:700; font-size:0.85rem;
          padding:9px 18px; border-radius:10px;
          box-shadow:0 4px 14px rgba(22,163,74,0.4); transition:all 0.25s;
        }
        .l-nav-register:hover { transform:translateY(-1px); box-shadow:0 6px 22px rgba(22,163,74,0.55); }

        /* Dark/light toggle in navbar */
        .l-nav-toggle {
          display:flex; align-items:center; gap:6px;
          padding:8px 14px; border-radius:10px; cursor:pointer;
          font-size:0.85rem; font-weight:600; border:none;
          transition:all 0.2s; font-family:inherit;
        }
        @media(max-width:500px){
          .l-nav-toggle { padding:8px 10px; }
          .l-nav-toggle-text { display:none; }
        }

        /* Sections */
        .l-section-label {
          display:inline-block; padding:5px 14px; border-radius:100px;
          font-size:0.75rem; font-weight:700; letter-spacing:1.2px;
          text-transform:uppercase; margin-bottom:16px;
          background:rgba(22,163,74,0.18); color:#4ade80;
          border:1px solid rgba(22,163,74,0.25);
        }
        .l-section-label.light {
          background:rgba(22,163,74,0.12); color:#15803d;
          border-color:rgba(22,163,74,0.3);
        }
        .l-cta-primary {
          display:inline-flex; align-items:center; gap:8px;
          background:linear-gradient(135deg,#16a34a,#22c55e);
          color:#fff; text-decoration:none; font-weight:700;
          padding:14px 28px; border-radius:14px;
          box-shadow:0 8px 25px rgba(22,163,74,0.4); transition:all 0.25s;
          font-size:0.95rem;
        }
        .l-cta-primary:hover { transform:translateY(-2px); box-shadow:0 12px 30px rgba(22,163,74,0.5); }

        /* Feature grid */
        .l-feat-grid {
          display:grid; grid-template-columns:repeat(3,1fr); gap:20px;
          max-width:1100px; margin:60px auto 0;
        }
        @media(max-width:900px){ .l-feat-grid{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:580px){ .l-feat-grid{ grid-template-columns:1fr; } }

        /* Steps */
        .l-steps-grid {
          display:grid; grid-template-columns:repeat(4,1fr);
          gap:28px; position:relative; z-index:1;
          max-width:980px; margin:60px auto 0;
        }
        @media(max-width:700px){ .l-steps-grid{ grid-template-columns:repeat(2,1fr); } }

        /* AI showcase */
        .l-ai-row { display:grid; grid-template-columns:1fr 1fr; min-height:400px; }
        @media(max-width:768px){ .l-ai-row{ grid-template-columns:1fr; } }

        /* Badge pulse */
        @keyframes bPulse {
          0%,100%{ border-color:rgba(34,197,94,0.25); }
          50%{ border-color:rgba(34,197,94,0.6); }
        }
        @keyframes dotP{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes heroFloat {
          0%,100%{transform:translateY(0) rotate(-1deg)}
          50%{transform:translateY(-16px) rotate(1deg)}
        }
        .hero-card { animation: heroFloat 4s ease-in-out infinite; }
        ::-webkit-scrollbar{ width:5px; }
        ::-webkit-scrollbar-track{ background:#0a1a0a; }
        ::-webkit-scrollbar-thumb{ background:#16a34a; border-radius:4px; }
      `}</style>

      <div
        className="landing-root"
        style={{
          background: dark
            ? 'linear-gradient(135deg,#050f05 0%,#0a1a0a 50%,#0d2d0d 100%)'
            : 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 50%,#bbf7d0 100%)',
          color: theme.text(dark),
          transition:'background 0.4s ease, color 0.4s ease',
        }}
      >

        {/* ── NAVBAR ── */}
        <nav
          className="l-nav"
          style={{
            background: dark ? 'rgba(5,15,5,0.82)' : 'rgba(240,253,244,0.88)',
            backdropFilter:'blur(20px)',
            borderBottom: dark ? '1px solid rgba(34,197,94,0.1)' : '1px solid rgba(22,163,74,0.15)',
          }}
        >
          <Link to="/" className="l-nav-logo">
            <div className="l-nav-logo-icon">🌾</div>
            <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, color: theme.text(dark), fontSize:'0.95rem' }}>
              AI Agro Assistant
            </span>
          </Link>
          <div className="l-nav-links">
            {/* Dark/Light mode toggle inside Navbar */}
            <button
              className="l-nav-toggle"
              onClick={() => setDark(!dark)}
              style={{
                background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                backdropFilter:'blur(12px)',
                border: dark ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.12)',
                color: dark ? '#ffffff' : '#1a1a1a',
                boxShadow: dark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.05)',
              }}
            >
              <span style={{ fontSize:'1rem' }}>{dark ? '☀️' : '🌙'}</span>
              <span className="l-nav-toggle-text">{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <Link
              to="/login"
              className="l-nav-btn"
              style={{
                color: dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
                border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
              }}
            >Sign In</Link>
            <Link to="/register" className="l-nav-register">Get Started Free</Link>
          </div>
        </nav>

        {/* ════════════════════════════════════════════════════
            HERO — Full 3D leaf canvas background
        ════════════════════════════════════════════════════ */}
        <section style={{ position:'relative', minHeight:'100vh', overflow:'hidden', display:'flex', alignItems:'center' }}>
          {/* Three.js leaf canvas */}
          <div style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none' }}>
            <Canvas camera={{ position:[0,0,7], fov:65 }} gl={{ alpha:true }}>
              <LeafParticles />
            </Canvas>
          </div>

          {/* Gradient overlay — adapts to mode */}
          <div style={{
            position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
            background: dark
              ? 'radial-gradient(ellipse at center, rgba(5,15,5,0.65) 0%, rgba(5,15,5,0.82) 100%)'
              : 'radial-gradient(ellipse at center, rgba(240,253,244,0.72) 0%, rgba(240,253,244,0.9) 100%)',
            transition:'background 0.4s ease',
          }} />

          {/* Hero content */}
          <div style={{
            position:'relative', zIndex:2,
            maxWidth:1200, margin:'0 auto', padding:'100px 40px 60px',
            width:'100%',
            display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
            gap:40,
          }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              {/* Badge */}
              <motion.div
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:0.1 }}
                style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  background: dark ? 'rgba(22,163,74,0.18)' : 'rgba(22,163,74,0.12)',
                  border:'1px solid rgba(22,163,74,0.4)', borderRadius:100,
                  padding:'6px 16px', marginBottom:24,
                  animation:'bPulse 3s ease-in-out infinite',
                }}
              >
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'dotP 1.5s infinite', display:'block' }} />
                <span style={{ color: dark?'#86efac':'#15803d', fontSize:'0.82rem', fontWeight:600 }}>
                  🌿 AI-Powered Agricultural Ecosystem
                </span>
              </motion.div>

              {/* Heading — word-by-word */}
              <h1 style={{ fontFamily:'Poppins,sans-serif', fontWeight:900, lineHeight:1.1, margin:'0 0 20px', fontSize:'clamp(2.5rem,5.5vw,4.2rem)', letterSpacing:'-1px' }}>
                {[
                  { w:'Farm',    c: dark?'#fff':'#111827', d:0.2  },
                  { w:'Smarter.',c:'#22c55e',              d:0.32 },
                  { w:'Sell',    c: dark?'#fff':'#111827', d:0.44 },
                  { w:'Faster.', c: dark?'#fff':'#111827', d:0.56 },
                  { w:'Grow',    c:'#fbbf24',              d:0.68 },
                  { w:'Bigger.', c: dark?'#fff':'#111827', d:0.8  },
                ].map(({ w, c, d }, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity:0, y:40 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay:d, duration:0.55, ease:'easeOut' }}
                    style={{ color:c, display:'inline-block', marginRight:'0.28em' }}
                  >{w}</motion.span>
                ))}
              </h1>

              <motion.p
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                transition={{ delay:1.0 }}
                style={{
                  fontSize:'1.1rem', lineHeight:1.72, marginBottom:34,
                  color: theme.textSub(dark), maxWidth:480,
                }}
              >
                India's first AI-powered agricultural ecosystem — connecting 500+ farmers directly to buyers with real-time AI insights.
              </motion.p>

              <motion.div
                initial={{ opacity:0, y:16 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:1.15 }}
                style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:28, justifyContent:'center' }}
              >
                <Link to="/register" className="l-cta-primary">
                  Get Started Free <ArrowRight size={17} />
                </Link>
                <Link to="/weather" style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                  border: dark ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.14)',
                  color: theme.text(dark), textDecoration:'none', fontWeight:600,
                  padding:'14px 28px', borderRadius:14, fontSize:'0.95rem',
                  transition:'all 0.2s',
                }}>🌤️ Live Weather</Link>
              </motion.div>

              <motion.div
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                transition={{ delay:1.35 }}
                style={{ display:'flex', gap:18, flexWrap:'wrap' }}
              >
                {['🛡️ Razorpay Payments','⚡ MongoDB Atlas','🧠 AI'].map(t => (
                  <span key={t} style={{ fontSize:'0.78rem', fontWeight:500, color: dark?'rgba(255,255,255,0.45)':'rgba(0,0,0,0.45)' }}>{t}</span>
                ))}
              </motion.div>
            </div>



            {/* Hide card on mobile */}
            <style>{`@media(max-width:900px){.hero-card{display:none!important}
              .hero-left{grid-column:1/-1}
              [data-hero-content]{grid-template-columns:1fr!important}
            `}</style>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            STATS
        ════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity:0, y:30 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true, margin:'-100px' }}
          transition={{ duration:0.6 }}
          style={{
            padding:'56px 40px',
            background: dark ? 'rgba(22,163,74,0.1)' : 'rgba(22,163,74,0.08)',
            borderTop: dark ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(22,163,74,0.25)',
            borderBottom: dark ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(22,163,74,0.25)',
          }}
        >
          <div style={{ maxWidth:880, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:40 }}>
            <CounterNumber target={500}   suffix="+"  label="Farmers Registered" dark={dark} />
            <CounterNumber target={10000} suffix="+"  label="Products Listed"    dark={dark} />
            <CounterNumber target={50} prefix="₹" suffix="L+" label="Trade Facilitated" dark={dark} />
            <CounterNumber target={98}    suffix="%"  label="Satisfaction Rate"  dark={dark} />
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════
            FEATURES — 3D Tilt cards
        ════════════════════════════════════════════════════ */}
        <section style={{ padding:'100px 40px', background: theme.bg2(dark), transition:'background 0.4s' }}>
          <div style={{ maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
            <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}>
              <span className={`l-section-label${dark?'':' light'}`}>Features</span>
              <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, color: theme.text(dark), margin:'0 0 14px' }}>
                Everything a Farmer Needs
              </h2>
              <p style={{ color: theme.textSub(dark), fontSize:'0.95rem', maxWidth:520, margin:'0 auto' }}>
                From AI disease detection to real-time market prices — built for India's agricultural ecosystem.
              </p>
            </motion.div>
            <div className="l-feat-grid">
              {FEATURES.map((f, i) => <TiltCard key={i} feature={f} index={i} dark={dark} />)}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            HOW IT WORKS
        ════════════════════════════════════════════════════ */}
        <section style={{ padding:'100px 40px', background: theme.bg(dark), transition:'background 0.4s' }}>
          <div style={{ maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
            <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}>
              <span className={`l-section-label${dark?'':' light'}`}>Process</span>
              <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, color: theme.text(dark), margin:'12px 0 14px' }}>
                How It Works
              </h2>
              <p style={{ color: theme.textSub(dark), fontSize:'0.95rem', maxWidth:500, margin:'0 auto' }}>
                Start trading in minutes — register, explore, pay, and track.
              </p>
            </motion.div>
            <div className="l-steps-grid">
              {STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity:0, y:28 }}
                  whileInView={{ opacity:1, y:0 }}
                  transition={{ delay:i*0.14, duration:0.5 }}
                  viewport={{ once:true }}
                  style={{ textAlign:'center' }}
                >
                  <div style={{
                    width:70, height:70,
                    background: dark ? 'linear-gradient(135deg,#0d2d0d,#050f05)' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
                    border: dark ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(22,163,74,0.4)',
                    borderRadius:20, margin:'0 auto 16px',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'1.8rem', position:'relative',
                    boxShadow: dark ? '0 4px 20px rgba(22,163,74,0.2)' : '0 4px 20px rgba(22,163,74,0.12)',
                    transition:'transform 0.3s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform='scale(1.08) translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='scale(1) translateY(0)'}
                  >
                    {s.icon}
                    <span style={{ position:'absolute', top:-7, right:-7, background:'#16a34a', color:'#fff', fontSize:'0.62rem', fontWeight:800, width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {s.step}
                    </span>
                  </div>
                  <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:'0.95rem', fontWeight:700, color: theme.text(dark), margin:'0 0 8px' }}>
                    {s.title}
                  </h3>
                  <p style={{ color: theme.textSub(dark), fontSize:'0.82rem', lineHeight:1.65, margin:0 }}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            AI FEATURES — alternating left/right
        ════════════════════════════════════════════════════ */}
        <section>
          {AI_FEATURES.map((f, i) => {
            const isEven = i % 2 === 0;
            const visual = (
              <div style={{ background:'linear-gradient(135deg,#050f05,#0a1a0a)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', minHeight:360 }}>
                <div style={{ position:'absolute', inset:0, opacity:0.3, pointerEvents:'none' }}>
                  <Canvas camera={{ position:[0,0,4], fov:60 }} gl={{ alpha:true }}>
                    <LeafParticles />
                  </Canvas>
                </div>
                <div style={{ position:'relative', zIndex:2, textAlign:'center' }}>
                  <div style={{ fontSize:'5rem', filter:'drop-shadow(0 0 30px rgba(255,255,255,0.15))' }}>{f.icon}</div>
                  <div style={{ marginTop:14, padding:'6px 16px', background:'rgba(255,255,255,0.08)', borderRadius:100, color:f.color, fontWeight:700, fontSize:'0.75rem', display:'inline-block' }}>
                    Gemini 2.5 Flash ⚡
                  </div>
                </div>
              </div>
            );
            const textPanel = (
              <div style={{
                padding:'56px 52px', display:'flex', flexDirection:'column', justifyContent:'center',
                background: dark ? (isEven ? '#0a1a0a' : '#070d07') : (isEven ? '#f0fdf4' : '#ffffff'),
                transition:'background 0.4s',
              }}>
                <span className={`l-section-label${dark?'':' light'}`}>{f.icon} AI Feature</span>
                <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:'1.6rem', fontWeight:800, color: theme.text(dark), margin:'14px 0 12px', lineHeight:1.2 }}>
                  {f.title}
                </h3>
                <p style={{ color: theme.textSub(dark), fontSize:'0.9rem', lineHeight:1.75, margin:'0 0 22px' }}>{f.desc}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {f.points.map((pt, j) => (
                    <div key={j} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:f.color, flexShrink:0 }} />
                      <span style={{ color: dark?'rgba(255,255,255,0.8)':'rgba(0,0,0,0.72)', fontSize:'0.88rem', fontWeight:500 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
            return (
              <motion.div
                key={i}
                className="l-ai-row"
                initial={{ opacity:0 }}
                whileInView={{ opacity:1 }}
                transition={{ duration:0.6 }}
                viewport={{ once:true }}
              >
                {isEven ? <>{visual}{textPanel}</> : <>{textPanel}{visual}</>}
              </motion.div>
            );
          })}
        </section>

        {/* ════════════════════════════════════════════════════
            TESTIMONIALS
        ════════════════════════════════════════════════════ */}
        <section style={{ padding:'80px 0', background: theme.bg2(dark), overflow:'hidden', transition:'background 0.4s' }}>
          <div style={{ maxWidth:1100, margin:'0 auto 40px', padding:'0 40px', textAlign:'center' }}>
            <span className={`l-section-label${dark?'':' light'}`}>Testimonials</span>
            <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'clamp(1.8rem,3.5vw,2.4rem)', fontWeight:900, color: theme.text(dark), margin:'12px 0 8px' }}>
              Loved by Farmers Across India
            </h2>
            <p style={{ color: theme.textSub(dark), fontSize:'0.85rem' }}>Hover to pause</p>
          </div>
          <TestimonialsCarousel dark={dark} />
        </section>

        {/* ════════════════════════════════════════════════════
            CTA
        ════════════════════════════════════════════════════ */}
        <section style={{ padding:'110px 40px', position:'relative', overflow:'hidden', textAlign:'center', background:'#050f05' }}>
          <div style={{ position:'absolute', inset:0, opacity:0.22, pointerEvents:'none' }}>
            <Canvas camera={{ position:[0,0,5], fov:60 }} gl={{ alpha:true }}>
              <LeafParticles />
            </Canvas>
          </div>
          <div style={{ position:'relative', zIndex:2 }}>
            <motion.div initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.6 }}>
              <div style={{ display:'inline-block', background:'rgba(251,191,36,0.14)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:100, padding:'6px 18px', color:'#fbbf24', fontWeight:700, fontSize:'0.75rem', marginBottom:22, letterSpacing:'1px' }}>
                🚀 JOIN 500+ FARMERS
              </div>
              <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, color:'#fff', margin:'0 0 16px' }}>
                Ready to Grow Your<br />Farm Business?
              </h2>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'1rem', maxWidth:460, margin:'0 auto 38px' }}>
                Join hundreds of Indian farmers already using AI Agro Assistant to sell smarter and earn more.
              </p>
              <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
                <Link to="/register" className="l-cta-primary">Get Started <ArrowRight size={16} /></Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════ */}
        <footer style={{
          background: dark ? '#030803' : '#f0fdf4',
          borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(22,163,74,0.15)',
          padding:'48px 40px', transition:'background 0.4s',
        }}>
          <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, background:'linear-gradient(135deg,#16a34a,#22c55e)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.95rem' }}>🌾</div>
              <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, color: theme.text(dark), fontSize:'0.95rem' }}>AI Agro Assistant</span>
            </div>
            <p style={{ color: dark?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.4)', fontSize:'0.8rem', textAlign:'center', margin:0 }}>
              Built for NIT Project — Karthickkumar, Gopika, Priyadharshini, VinithPrakash<br />
              Mentors: Dr. P. Thangavelu (Principal) · Dr. R. Senthil Kumar (HOD)
            </p>
            <div style={{ display:'flex', gap:22 }}>
              {[{to:'/weather',l:'Weather'},{to:'/login',l:'Login'},{to:'/register',l:'Register'},{to:'/features/crop-disease',l:'Crop Disease'}].map(x => (
                <Link key={x.to} to={x.to} style={{ color: dark?'rgba(255,255,255,0.35)':'rgba(0,0,0,0.4)', textDecoration:'none', fontSize:'0.83rem', transition:'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='#16a34a'}
                  onMouseLeave={e => e.target.style.color= dark?'rgba(255,255,255,0.35)':'rgba(0,0,0,0.4)'}
                >{x.l}</Link>
              ))}
            </div>
            <p style={{ color: dark?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.25)', fontSize:'0.73rem', margin:0 }}>
              © 2025 AI Agro Assistant — Empowering Indian Farmers with AI
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}
