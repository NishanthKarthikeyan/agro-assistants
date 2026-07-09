import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { triggerNotification } from '../../utils/notifications';
import {
  Search, MapPin, Wind, Droplets, Eye, Thermometer, Gauge,
  Sunrise, Sunset, CloudRain, Navigation, Moon, Shield, Waves, LocateFixed
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────────

const fmt = (t) => Math.round(t);
const fmtTime = (unix) => new Date(unix * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const fmtHour = (unix) => new Date(unix * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true });

const emoji = (id) => {
  if (!id) return '🌤️';
  if (id < 300) return '⛈️';
  if (id < 400) return '🌦️';
  if (id < 600) return '🌧️';
  if (id < 700) return '❄️';
  if (id < 800) return '🌫️';
  if (id === 800) return '☀️';
  if (id <= 803) return '⛅';
  return '☁️';
};

const aqiLabel = (aqi) => {
  const labels = ['', 'Good 🟢', 'Fair 🟡', 'Moderate 🟠', 'Poor 🔴', 'Very Poor ⛔'];
  return labels[aqi] || 'N/A';
};

const windDir = (deg) => {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WNW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16] || '—';
};

// ── Custom Dynamic Styles Injection ─────────────────────────────────────────────

const customStyles = `
  @keyframes weather-rain {
    0% { transform: translateY(-100px); }
    100% { transform: translateY(100vh); }
  }
  @keyframes weather-twinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  @keyframes weather-drift {
    0% { transform: translateX(-50px); }
    100% { transform: translateX(110vw); }
  }
  @keyframes weather-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(2deg); }
  }
  .animate-weather-rain {
    animation: weather-rain linear infinite;
  }
  .animate-weather-twinkle {
    animation: weather-twinkle ease-in-out infinite;
  }
  .animate-weather-drift {
    animation: weather-drift linear infinite;
  }
  .animate-weather-float {
    animation: weather-float ease-in-out 4s infinite;
  }
`;

// ── Weather Animated Backgrounds ────────────────────────────────────────────────

function WeatherBackground({ theme }) {
  if (theme === 'night') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Twinkling Stars */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/80 animate-weather-twinkle"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 80 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 3 + 's',
              animationDuration: (1.5 + Math.random() * 2) + 's',
            }}
          />
        ))}
        {/* Glowing floating crescent Moon — upper-left visible area */}
        <div className="absolute top-8 left-[38%] w-40 h-40 bg-yellow-100/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-6 left-[39%] w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(253,224,71,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-10 left-[40%] w-20 h-20 bg-gradient-to-tr from-yellow-200 to-amber-100 rounded-full shadow-[0_0_60px_rgba(253,224,71,0.25),0_0_120px_rgba(253,224,71,0.08)] animate-weather-float z-10 flex items-center justify-center text-5xl"
          style={{ filter: 'drop-shadow(0 0 18px rgba(253,224,71,0.35))' }}>
          🌙
        </div>
      </div>
    );
  }

  if (theme === 'rainy') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Falling Raindrops */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-sky-200/40 rounded-full animate-weather-rain"
            style={{
              width: '1.5px',
              height: (25 + Math.random() * 25) + 'px',
              left: Math.random() * 100 + '%',
              top: '-50px',
              animationDuration: (0.7 + Math.random() * 0.5) + 's',
              animationDelay: Math.random() * 2 + 's',
            }}
          />
        ))}
        {/* Cloudy background fog overlay */}
        <div className="absolute top-10 left-10 w-64 h-20 bg-slate-400/10 rounded-full blur-2xl animate-weather-drift" style={{ animationDuration: '30s' }} />
      </div>
    );
  }

  // Sunny/default light mode background
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating clouds */}
      <div className="absolute top-12 left-[-150px] w-48 h-16 bg-white/40 rounded-full blur-md animate-weather-drift" style={{ animationDuration: '40s' }} />
      <div className="absolute top-24 left-[-100px] w-36 h-12 bg-white/30 rounded-full blur-md animate-weather-drift" style={{ animationDuration: '30s', animationDelay: '5s' }} />
      {/* Sun glow — upper-center visible area */}
      <div className="absolute top-6 left-[36%] w-44 h-44 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.04) 50%, transparent 75%)' }} />
      <div className="absolute top-10 left-[40%] w-20 h-20 bg-gradient-to-tr from-yellow-400 to-amber-300 rounded-full shadow-[0_0_60px_rgba(251,191,36,0.35),0_0_120px_rgba(251,191,36,0.1)] animate-weather-float z-10 flex items-center justify-center text-5xl"
        style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.45))' }}>
        ☀️
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN WEATHER PAGE ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function WeatherPage() {
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'buyer';
  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  const [input, setInput] = useState('');
  const [weather, setWeather] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('detecting');

  // ── Auto-detect GPS Location on Mount ──────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus('found');
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setGpsStatus('error');
          fetchWeatherByCity('Coimbatore');
        },
        { timeout: 8000 }
      );
    } else {
      setGpsStatus('error');
      fetchWeatherByCity('Coimbatore');
    }
  }, []);

  // ── Weather Alert: Too Hot & No Rain in Next 2 Hours ─────────────────────
  useEffect(() => {
    if (!weather) return;

    let isHotAndNoRain = false;
    let avgTemp = 30;

    if (weather.hourly && weather.hourly.length >= 2) {
      const next2Hours = weather.hourly.slice(0, 2);
      avgTemp = Math.round(next2Hours.reduce((acc, h) => acc + h.temp, 0) / next2Hours.length);
      
      isHotAndNoRain = next2Hours.every(hour => {
        const tempVal = hour.temp;
        const condId = hour.weather?.[0]?.id || 800;
        const hasRain = (condId >= 200 && condId < 600);
        return tempVal >= 28 && !hasRain;
      });
    } else if (weather.current) {
      const currentTemp = weather.current.temp;
      avgTemp = Math.round(currentTemp);
      const condId = weather.current.weather?.[0]?.id || 800;
      const hasRain = (condId >= 200 && condId < 600);
      isHotAndNoRain = currentTemp >= 28 && !hasRain;
    }

    if (isHotAndNoRain) {
      triggerNotification(
        '🌤️ Weather Alert: Extreme Heat',
        `No rain forecast for the next 2 hours. Intense hot sun is expected (around ${avgTemp}°C). Keep crops irrigated and stay hydrated! 🌾`
      );
    }
  }, [weather]);

  const fetchWeatherByCoords = async (lat, lon) => {
    setLoading(true);
    try {
      const res = await api.get(`/weather?lat=${lat}&lon=${lon}`);
      setWeather(res.data);
      fetchAdvice(res.data.city_name || 'local area');
    } catch (e) {
      toast.error('Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCity = async (city) => {
    setLoading(true);
    try {
      const res = await api.get(`/weather?city=${encodeURIComponent(city)}`);
      setWeather(res.data);
      fetchAdvice(city);
    } catch (e) {
      toast.error(e.response?.data?.error || 'City not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvice = async (city) => {
    setAdviceLoading(true);
    try {
      const advRes = await api.get(`/weather-intelligence?city=${encodeURIComponent(city)}`);
      setAdvice(advRes.data);
    } catch { }
    finally { setAdviceLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    fetchWeatherByCity(input.trim());
    setInput('');
  };

  const handleRelocate = () => {
    if (navigator.geolocation) {
      setGpsStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus('found');
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => { setGpsStatus('error'); toast.error('Location access denied'); },
        { timeout: 8000 }
      );
    }
  };

  // ── Derived Values ─────────────────────────────────────────────────────────
  const cond = weather?.current?.weather?.[0];
  const lat = weather?.lat || 11.0168;
  const lon = weather?.lon || 76.9558;
  const intel = weather?.intelligence || {};
  const aq = weather?.air_quality;
  const hourly = weather?.hourly?.slice(0, 12) || [];
  const daily = weather?.daily?.slice(0, 7) || [];

  // Theme Detection
  const isNightTime = new Date().getHours() < 6 || new Date().getHours() >= 19;
  const code = cond?.id;
  const isThunder = code >= 200 && code < 300;
  const isRain = (code >= 400 && code < 600) || (code >= 300 && code < 400); // including drizzle

  let theme = 'sunny'; // default clear day light theme
  if (isNightTime) {
    theme = 'night';
  } else if (isRain || isThunder) {
    theme = 'rainy';
  }

  // Theme styling configurations
  const themeClasses = {
    sunny: {
      bg: 'from-sky-100 via-white to-emerald-50/40 text-gray-800',
      card: 'bg-white/80 border-sky-100/50 shadow-sky-100/30 text-gray-800 hover:border-sky-200',
      pill: 'bg-sky-50/80 border-sky-100 text-gray-800',
      accentText: 'bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent',
      subtext: 'text-gray-500',
      navInput: 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-sky-400/40 focus:border-sky-300',
      searchBtn: 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200/50',
      navBtn: 'bg-white hover:bg-sky-50 border-gray-200 text-sky-500',
      textMain: 'text-gray-800',
      textMuted: 'text-gray-400',
      borderColor: 'border-sky-100',
      forecastCard: 'bg-gradient-to-b from-sky-50/80 to-white border-sky-100/60 text-gray-800 hover:shadow-sky-100/40',
      forecastDaily: 'bg-gradient-to-b from-emerald-50/60 to-white border-emerald-100/60 text-gray-800 hover:shadow-emerald-100/40',
    },
    night: {
      bg: 'from-[#030712] via-[#090d16] to-[#0f172a] text-white',
      card: 'bg-slate-900/60 border-white/[0.08] shadow-black/40 text-white hover:border-white/20',
      pill: 'bg-slate-950/50 border-white/[0.05] text-white',
      accentText: 'bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent',
      subtext: 'text-slate-400',
      navInput: 'bg-slate-800/80 border-white/10 text-white placeholder-slate-500 focus:ring-cyan-500/40 focus:border-cyan-500/30',
      searchBtn: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/30',
      navBtn: 'bg-slate-800/80 hover:bg-slate-700 border-white/10 text-cyan-400',
      textMain: 'text-white',
      textMuted: 'text-slate-500',
      borderColor: 'border-white/10',
      forecastCard: 'bg-slate-950/40 border-white/[0.05] text-white hover:bg-slate-900/60',
      forecastDaily: 'bg-slate-950/40 border-white/[0.05] text-white hover:bg-slate-900/60',
    },
    rainy: {
      bg: 'from-slate-900 via-slate-850 to-indigo-950/60 text-white',
      card: 'bg-slate-900/50 border-blue-500/20 shadow-blue-950/20 text-white hover:border-blue-500/30',
      pill: 'bg-slate-950/60 border-blue-500/10 text-white',
      accentText: 'bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent',
      subtext: 'text-slate-300',
      navInput: 'bg-slate-850/80 border-blue-500/20 text-white placeholder-slate-400 focus:ring-blue-500/40 focus:border-blue-500/30',
      searchBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/30',
      navBtn: 'bg-slate-850/80 hover:bg-slate-800 border-blue-500/20 text-blue-400',
      textMain: 'text-white',
      textMuted: 'text-slate-400',
      borderColor: 'border-blue-500/20',
      forecastCard: 'bg-slate-950/50 border-blue-500/10 text-white hover:bg-slate-900/60',
      forecastDaily: 'bg-slate-950/50 border-blue-500/10 text-white hover:bg-slate-900/60',
    }
  };

  const style = themeClasses[theme];
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&marker=true&message=true`;

  return (
    <div className={`flex min-h-screen bg-gradient-to-br transition-all duration-700 ${style.bg}`}>
      {/* Inject custom keyframe styles */}
      <style>{customStyles}</style>

      <Sidebar links={links} role={role} />

      <main className="flex-1 md:ml-[220px] min-h-screen overflow-y-auto relative z-10">
        
        {/* Animated Weather Elements */}
        <WeatherBackground theme={theme} />

        <div className="relative z-20 max-w-[1400px] mx-auto px-4 sm:px-6 pt-20 md:pt-6 pb-6">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                <span className={style.accentText}>
                  LIVE AGRO WEATHER
                </span>
              </h1>
              <p className={`text-sm mt-1 ${style.subtext}`}>Real-time conditions · 3D wind visualization · AI crop insights</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full sm:w-auto relative z-30">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500" />
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Search city..."
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm shadow-sm transition-all focus:outline-none focus:ring-2 ${style.navInput}`}
                />
              </div>
              <button type="submit" className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-md ${style.searchBtn}`}>
                Go
              </button>
              <button type="button" onClick={handleRelocate} title="Use my location" className={`border p-2.5 rounded-xl transition-all active:scale-95 shadow-sm ${style.navBtn}`}>
                <LocateFixed size={18} />
              </button>
            </form>
          </div>

          {/* ── Loading State ───────────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-12 h-12 border-[3px] border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              <p className="text-sky-500 text-sm font-medium animate-pulse">
                {gpsStatus === 'detecting' ? 'Detecting your location…' : 'Loading weather data…'}
              </p>
            </div>
          )}

          {/* ── Weather Data ────────────────────────────────────────────── */}
          {weather && !loading && (
            <div className="space-y-5 animate-fade-in">

              {/* Row 1: Temperature Hero + Windy Map */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* Temperature Hero Card */}
                <div className={`lg:col-span-2 rounded-2xl border shadow-sm transition-all duration-300 p-5 relative overflow-hidden flex flex-col justify-between min-h-[460px] ${style.card}`}>
                  {theme === 'sunny' && (
                    <>
                      <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
                    </>
                  )}
                  {theme === 'night' && (
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/[0.08] rounded-full blur-3xl pointer-events-none" />
                  )}
                  {theme === 'rainy' && (
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/[0.08] rounded-full blur-3xl pointer-events-none" />
                  )}

                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-4">
                      <MapPin size={14} className={theme === 'sunny' ? 'text-sky-500' : theme === 'night' ? 'text-cyan-400' : 'text-blue-400'} />
                      <span className={`font-bold text-sm ${theme === 'sunny' ? 'text-sky-700' : theme === 'night' ? 'text-cyan-300' : 'text-blue-300'}`}>{weather.city_name || weather.timezone}</span>
                      {gpsStatus === 'found' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 border ${theme === 'sunny' ? 'bg-emerald-100 text-emerald-600 border-emerald-200/60' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/35'}`}>📍 GPS</span>}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-6xl font-black tracking-tight leading-none">{fmt(weather.current?.temp)}°C</div>
                        <p className={`capitalize font-bold text-lg mt-2 ${theme === 'sunny' ? 'text-sky-600' : theme === 'night' ? 'text-cyan-300/80' : 'text-blue-300/80'}`}>{cond?.description}</p>
                        <div className={`flex gap-3 mt-3 text-xs ${style.textMuted}`}>
                          <span>Feels {fmt(weather.current?.feels_like)}°</span>
                          <span>H:{fmt(daily[0]?.temp?.max || daily[0]?.temp?.day || weather.current?.temp)}° L:{fmt(daily[0]?.temp?.min || daily[0]?.temp?.night || weather.current?.temp)}°</span>
                        </div>
                      </div>
                      <div className="text-7xl animate-weather-float select-none drop-shadow-lg">{emoji(cond?.id)}</div>
                    </div>
                  </div>

                  {/* Sunrise / Sunset */}
                  {weather.current?.sunrise && (
                    <div className={`flex gap-5 mt-6 pt-3 border-t text-xs ${theme === 'sunny' ? 'border-sky-100 text-gray-500' : 'border-white/[0.08] text-slate-400'}`}>
                      <span className="flex items-center gap-1.5"><Sunrise size={13} className="text-amber-500" /> {fmtTime(weather.current.sunrise)}</span>
                      <span className="flex items-center gap-1.5"><Sunset size={13} className="text-orange-500" /> {fmtTime(weather.current.sunset)}</span>
                    </div>
                  )}
                </div>

                {/* Windy 3D Map */}
                <div className={`lg:col-span-3 rounded-2xl border shadow-sm transition-all duration-500 p-4 relative group flex flex-col min-h-[460px] ${style.card}`}>
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme === 'sunny' ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${theme === 'sunny' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                      </span>
                      <h2 className={`font-extrabold text-xs uppercase tracking-widest ${theme === 'sunny' ? 'text-sky-600' : 'text-cyan-400'}`}>3D Windy Map — Live</h2>
                    </div>
                    <span className={`text-[10px] ${style.textMuted}`}>drag · zoom · interact</span>
                  </div>
                  <div className={`flex-1 rounded-xl overflow-hidden border ${theme === 'sunny' ? 'border-sky-100' : 'border-white/[0.06]'}`}>
                    <iframe
                      title="Windy Weather Map"
                      src={windyUrl}
                      className="w-full h-full min-h-[360px] border-0"
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Humidity</span>
                    <Droplets size={16} className="text-blue-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{weather.current?.humidity}%</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Wind</span>
                    <Wind size={16} className="text-teal-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{Math.round(weather.current?.wind_speed)} km/h {windDir(weather.current?.wind_deg)}</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Pressure</span>
                    <Gauge size={16} className="text-indigo-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{weather.current?.pressure} hPa</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Visibility</span>
                    <Eye size={16} className="text-amber-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{intel.visibility_km || `${((weather.current?.visibility || 0) / 1000).toFixed(1)} km`}</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Dew Point</span>
                    <Thermometer size={16} className="text-emerald-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{intel.dew_point_c || '—'}</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>UV Risk</span>
                    <Waves size={16} className="text-rose-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{intel.uv_risk_level || 'N/A'}</p>
                </div>
              </div>

              {/* Row 3: Intelligence Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Fog Risk</span>
                    <CloudRain size={16} className="text-violet-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{intel.fog_probability || '0%'}</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Frost Risk</span>
                    <Shield size={16} className="text-sky-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{intel.frost_risk || 'None'}</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Moon Phase</span>
                    <Moon size={16} className="text-indigo-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{intel.moon_phase || 'N/A'}</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Cloud Cover</span>
                    <Navigation size={16} className="text-cyan-500 opacity-80" />
                  </div>
                  <p className="text-lg font-black leading-none">{intel.cloud_cover || '—'}</p>
                </div>
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-3.5 flex flex-col gap-2 min-h-[84px] justify-between ${style.pill}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${style.textMuted}`}>Air Quality</span>
                    <span className="text-xs font-bold text-orange-500 opacity-80">AQI</span>
                  </div>
                  <p className="text-lg font-black leading-none">{aq?.main?.aqi ? aqiLabel(aq.main.aqi) : 'N/A'}</p>
                </div>
              </div>

              {/* Row 4: Hourly Forecast */}
              {hourly.length > 0 && (
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-4 ${style.card}`}>
                  <h3 className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${style.textMuted}`}>Hourly Forecast</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {hourly.map((h, i) => (
                      <div key={i} className={`flex-shrink-0 rounded-xl px-3 py-3 w-[72px] text-center border transition-all ${style.forecastCard}`}>
                        <p className={`text-[10px] font-bold mb-1.5 ${theme === 'sunny' ? 'text-gray-400' : 'text-slate-500'}`}>{fmtHour(h.dt)}</p>
                        <div className="text-2xl mb-1.5">{emoji(h.weather?.[0]?.id)}</div>
                        <p className="font-black text-sm">{fmt(h.temp)}°</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 5: 7-Day Forecast + AI Advice */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* 7-Day Forecast */}
                {daily.length > 0 && (
                  <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-4 lg:col-span-2 ${style.card}`}>
                    <h3 className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${style.textMuted}`}>7-Day Cultivation Forecast</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {daily.map((d, i) => {
                        const date = new Date(d.dt * 1000);
                        const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
                        const dayNum = date.getDate();
                        const avg = fmt(d.temp?.day || d.temp || 0);
                        const hi = fmt(d.temp?.max || d.temp?.day || avg);
                        const lo = fmt(d.temp?.min || d.temp?.night || avg);
                        return (
                          <div key={i} className={`flex-shrink-0 border rounded-xl p-3 w-[90px] text-center transition-all group ${style.forecastDaily}`}>
                            <p className={`text-[10px] font-bold mb-1 ${theme === 'sunny' ? 'text-gray-400' : 'text-slate-500'}`}>{i === 0 ? 'Today' : dayName}</p>
                            <p className={`text-[9px] ${theme === 'sunny' ? 'text-gray-300' : 'text-slate-600'}`}>{dayNum}</p>
                            <div className="text-3xl my-2 group-hover:scale-110 transition-transform">{emoji(d.weather?.[0]?.id)}</div>
                            <p className="font-black text-base">{avg}°</p>
                            <p className={`text-[10px] font-medium mt-0.5 ${theme === 'sunny' ? 'text-gray-400' : 'text-slate-500'}`}>{lo}° / {hi}°</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Farming Insights */}
                <div className={`rounded-2xl border shadow-sm transition-all duration-300 p-4 relative ${style.card}`}>
                  <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-extrabold text-[10px] uppercase tracking-widest text-emerald-600">AI Crop Insights</h3>
                  </div>

                  {adviceLoading ? (
                    <div className="flex items-center gap-2 py-8 text-gray-400">
                      <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                      <span className="text-xs animate-pulse">Analyzing crop conditions…</span>
                    </div>
                  ) : advice?.advice ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                      {advice.advice.split('\n').filter(Boolean).map((line, i) => (
                        <p key={i} className={`text-xs leading-relaxed flex gap-1.5 ${theme === 'sunny' ? 'text-gray-600' : 'text-slate-300'}`}>
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">▸</span>
                          <span>{line}</span>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        `🌡️ ${fmt(weather.current?.temp)}°C — ${weather.current?.temp > 30 ? 'High heat! Increase irrigation.' : weather.current?.temp < 10 ? 'Cold alert — protect crops.' : 'Ideal growing temperature.'}`,
                        `💧 Humidity ${weather.current?.humidity}% — ${weather.current?.humidity > 80 ? 'Fungal risk high. Monitor leaves.' : weather.current?.humidity < 40 ? 'Plan drip irrigation.' : 'Good humidity for crops.'}`,
                        `💨 Wind ${Math.round(weather.current?.wind_speed)} km/h — ${weather.current?.wind_speed > 40 ? 'Protect tall crops!' : 'Good for spraying.'}`,
                      ].map((t, i) => (
                        <p key={i} className={`text-xs leading-relaxed flex gap-1.5 ${theme === 'sunny' ? 'text-gray-600' : 'text-slate-300'}`}>
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">▸</span>
                          <span>{t}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── Empty State ────────────────────────────────────────────── */}
          {!weather && !loading && (
            <div className={`rounded-2xl border shadow-sm transition-all duration-300 text-center py-20 max-w-md mx-auto mt-20 ${style.card}`}>
              <div className="text-7xl mb-4 animate-float">🌤️</div>
              <h2 className="text-xl font-black mb-2">Explore Farm Weather</h2>
              <p className={`text-sm max-w-xs mx-auto ${style.subtext}`}>Search a city or allow location access for live 3D wind maps and AI farming insights.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
