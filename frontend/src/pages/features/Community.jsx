import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';

const TEAM = [
  { name: 'Karthickkumar',   role: 'Full Stack Developer',    emoji: '👨‍💻', bio: 'Led the architecture and React migration of the platform.' },
  { name: 'Gopika',   role: 'Backend & AI Integration', emoji: '🤖', bio: 'Built the Flask AI engine and Gemini API integrations.' },
  { name: 'Priyadharshini', role: 'UI/UX & Frontend',         emoji: '🎨', bio: 'Designed the user experience and component library.' },
  { name: 'VinithPrakash', role: 'Data & Market Features',   emoji: '📊', bio: 'Developed market prices, weather, and data pipelines.' },
];

const MENTORS = [
  { name: 'Dr. P. Thangavelu', title: 'Principal',             emoji: '🏛️' },
  { name: 'Dr. R. Senthil Kumar', title: 'Head of Department', emoji: '👨‍🏫' },
];

const FEATURES = [
  { icon: '🔬', title: 'Crop Disease AI',      desc: 'Upload a leaf photo — Gemini AI identifies diseases and suggests organic + chemical remedies.' },
  { icon: '🌤️', title: 'Real-time Weather',    desc: 'Powered by OpenWeatherMap — hourly, daily forecast, air quality, frost risk, and moon phase.' },
  { icon: '📈', title: 'Market Prices',        desc: 'Live vegetable prices from government API with AI-estimated fallback via Google Search.' },
  { icon: '🌱', title: 'AI Crop Planner',      desc: 'Input crop, area, and location — get a full farming plan with cost and profit estimates.' },
  { icon: '🛒', title: 'Agro Marketplace',     desc: 'Direct farm-to-buyer marketplace with Razorpay payments, real-time stock, and order tracking.' },
  { icon: '📰', title: 'Agri News',            desc: 'Curated Indian agriculture news via NewsAPI — updated every session.' },
  { icon: '🏦', title: 'Agri Loan Assistant',  desc: 'Step-by-step loan eligibility checker with document upload support.' },
  { icon: '🤖', title: 'AI Chatbot',           desc: 'Voice + text assistant that understands English and Tamil — powered by Gemini.' },
];

export default function Community() {
  const { userProfile } = useAuth();
  const role  = userProfile?.role || 'buyer';
  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={links} role={role} />
      <main className="flex-1 ml-[220px] pt-16 md:pt-0">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-emerald-900 text-white px-8 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="text-6xl mb-4">🌾</div>
            <h1 className="text-4xl font-extrabold mb-4">About Agro Assistant</h1>
            <p className="text-primary-200 text-lg leading-relaxed">
              A senior-level full-stack platform empowering Indian farmers with AI, real-time marketplace,
              and smart agricultural tools — built with ❤️ by engineering students.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
              <span className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">React + Vite</span>
              <span className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">Flask + Python</span>
              <span className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">Google Gemini AI</span>
              <span className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">MongoDB Atlas</span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-12">
          {/* Features */}
          <section className="mb-16">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Platform Features</h2>
            <p className="text-gray-400 text-center mb-8">Everything a modern farmer needs, in one place</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FEATURES.map(f => (
                <div key={f.title} className="card-hover text-center">
                  <div className="text-4xl mb-3">{f.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Mission */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-100 rounded-3xl p-10 text-center">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                To eliminate the middlemen who exploit farmers by creating a <strong>transparent, technology-driven
                platform</strong> where farmers can sell directly to buyers, get AI-powered crop advice, and access
                financial tools — all in their own language.
              </p>
            </div>
          </section>

          {/* Team */}
          <section className="mb-16">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">The Team</h2>
            <p className="text-gray-400 text-center mb-8">The developers behind Agro Assistant</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TEAM.map(m => (
                <div key={m.name} className="card text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-emerald-100 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3">
                    {m.emoji}
                  </div>
                  <h3 className="font-bold text-gray-900">{m.name}</h3>
                  <p className="text-primary-600 text-xs font-medium mb-2">{m.role}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{m.bio}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Mentors */}
          <section>
            <h2 className="text-xl font-extrabold text-gray-900 mb-6 text-center">Faculty Mentors</h2>
            <div className="flex justify-center gap-6 flex-wrap">
              {MENTORS.map(m => (
                <div key={m.name} className="card text-center w-64">
                  <div className="text-4xl mb-3">{m.emoji}</div>
                  <h3 className="font-bold text-gray-900">{m.name}</h3>
                  <p className="text-gray-400 text-sm">{m.title}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
