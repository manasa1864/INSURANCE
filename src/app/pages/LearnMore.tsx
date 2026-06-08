import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  Shield,
  Brain,
  BarChart2,
  GitBranch,
  Heart,
  Car,
  User,
  Plane,
  Home,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Zap,
  Eye,
  TrendingUp,
  Github,
  Linkedin,
} from 'lucide-react';

/* ── FAQ data ── */
const faqs = [
  {
    q: 'How does PolicyWise AI calculate my premium?',
    a: 'Our ML model is trained on millions of anonymised insurance records. It takes your age, health profile, occupation, city tier, and lifestyle choices as inputs and outputs a premium range along with a confidence interval — all explained factor-by-factor.',
  },
  {
    q: 'Is my personal data safe?',
    a: 'Yes. We use bank-grade AES-256 encryption at rest and TLS 1.3 in transit. We never share your raw data with insurers without explicit consent.',
  },
  {
    q: 'Can I compare more than two policies?',
    a: 'The side-by-side comparison tool supports two policies at once, but you can save unlimited plans to your dashboard and swap them freely.',
  },
  {
    q: 'Do I need to pay to use PolicyWise AI?',
    a: 'Core features — recommendations, premium estimates, and comparisons — are completely free. Advanced scenario simulations and PDF reports are available on the Premium plan.',
  },
  {
    q: 'How accurate are the premium predictions?',
    a: 'Our model achieves a 94.2% accuracy (R² = 0.89) on held-out test data. Actual insurer quotes may vary by ±5–8% depending on underwriting.',
  },
  {
    q: 'Which insurance types are supported?',
    a: 'Health, Life, Vehicle, Travel, Home, Business, Critical Illness, Personal Accident, Education, Crop, Gadget, and Pet insurance — with more on the way.',
  },
];

/* ── Team data ── */
const team = [
  { name: 'Aanya Sharma', role: 'ML Engineer', init: 'AS', color: 'from-blue-400 to-blue-600' },
  { name: 'Rohan Mehta', role: 'Full-Stack Developer', init: 'RM', color: 'from-teal-400 to-teal-600' },
  { name: 'Priya Nair', role: 'Insurance Domain Expert', init: 'PN', color: 'from-indigo-400 to-indigo-600' },
  { name: 'Dev Kapoor', role: 'Product & UX', init: 'DK', color: 'from-violet-400 to-violet-600' },
];

/* ── Insurance types ── */
const insuranceTypes = [
  { icon: Heart, label: 'Health', desc: 'Covers hospitalisation, OPD, critical illness, and more.', color: 'bg-rose-50 text-rose-500' },
  { icon: User, label: 'Life / Term', desc: 'Financial protection for your family if the worst happens.', color: 'bg-blue-50 text-blue-500' },
  { icon: Car, label: 'Vehicle', desc: 'Comprehensive & third-party cover for cars and bikes.', color: 'bg-indigo-50 text-indigo-500' },
  { icon: Plane, label: 'Travel', desc: 'Medical, baggage, and trip-cancellation cover abroad.', color: 'bg-sky-50 text-sky-500' },
  { icon: Home, label: 'Home', desc: 'Protect your home against fire, theft, and natural disasters.', color: 'bg-amber-50 text-amber-500' },
  { icon: Briefcase, label: 'Business', desc: 'Liability, property, and employee coverage for businesses.', color: 'bg-slate-100 text-slate-600' },
];

/* ── FAQ Item ── */
const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-slate-200 rounded-xl overflow-hidden transition-all"
      onClick={() => setOpen(!open)}
    >
      <button className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors">
        <span className="font-semibold text-slate-800">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ml-4 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 bg-slate-50">
          {a}
        </div>
      )}
    </div>
  );
};

export const LearnMore = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* ── Navbar ── */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-[#1E64FF] p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">POLICYWISE AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth?mode=login" className="text-slate-600 hover:text-[#1E64FF] font-medium text-sm">Login</Link>
            <Link
              to="/auth?mode=signup"
              className="bg-[#1E64FF] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-all shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Banner ── */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-[#1E64FF] rounded-full text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" /> About PolicyWise AI
          </div>
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            Making insurance simple,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E64FF] to-[#1FB6A6]">
              transparent & smart
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We built PolicyWise AI because choosing insurance shouldn't require a finance degree.
            Here's everything you need to know about how it works.
          </p>
        </div>
      </section>

      {/* ── How the AI Works ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How the AI Works</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Our system combines classical actuarial science with modern machine learning for recommendations you can actually understand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: Brain,
                color: 'bg-blue-50 text-[#1E64FF]',
                title: 'Gradient Boosted ML Model',
                desc: 'Trained on 500K+ anonymised Indian insurance records. Uses XGBoost with SHAP explainability so every prediction has a reason.',
              },
              {
                icon: Eye,
                color: 'bg-teal-50 text-[#1FB6A6]',
                title: 'Explainable Predictions',
                desc: 'SHAP values break down exactly which factors — age, BMI, city, occupation — are driving your premium up or down.',
              },
              {
                icon: TrendingUp,
                color: 'bg-indigo-50 text-indigo-500',
                title: 'Scenario Simulation',
                desc: 'Change any input — quit smoking, increase coverage, add a rider — and see the premium impact in real time.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${item.color}`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Pipeline diagram */}
          <div className="bg-slate-900 rounded-2xl p-8 text-white">
            <h3 className="font-bold text-lg mb-8 text-center text-slate-300">Recommendation Pipeline</h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {[
                { step: '01', label: 'User Inputs', sub: 'Age, health, lifestyle' },
                { step: '02', label: 'Feature Engineering', sub: 'Normalise & encode' },
                { step: '03', label: 'ML Inference', sub: 'XGBoost prediction' },
                { step: '04', label: 'SHAP Explainer', sub: 'Factor attribution' },
                { step: '05', label: 'Results + Report', sub: 'Ranked policies' },
              ].map((p, i, arr) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center text-center min-w-[100px]">
                    <div className="w-12 h-12 rounded-full bg-[#1E64FF]/20 border border-[#1E64FF]/40 flex items-center justify-center text-[#1E64FF] font-bold text-sm mb-3">
                      {p.step}
                    </div>
                    <p className="font-semibold text-sm">{p.label}</p>
                    <p className="text-slate-500 text-xs mt-1">{p.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 hidden md:block" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Insurance Types ── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Insurance Types Explained</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Not sure which type of insurance you need? Here's a quick guide.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {insuranceTypes.map((type, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${type.color} group-hover:scale-110 transition-transform`}>
                  <type.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-[#1E64FF] transition-colors">{type.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{type.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/auth?mode=signup"
              className="inline-flex items-center gap-2 bg-[#1E64FF] text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg"
            >
              Get My Recommendation <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-500">Everything you wanted to know but were afraid to ask.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Meet the Team</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              A small, passionate team building at the intersection of AI and financial inclusion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-all text-center group">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <span className="text-white font-bold text-xl">{member.init}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{member.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{member.role}</p>
                <div className="flex justify-center gap-3 mt-4">
                  <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <Github className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-[#1E64FF]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to find your perfect policy?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join 10,000+ users who've already made smarter insurance decisions.
          </p>
          <Link
            to="/auth?mode=signup"
            className="inline-flex items-center gap-2 bg-white text-[#1E64FF] px-8 py-4 rounded-full font-bold hover:bg-blue-50 transition-all shadow-xl text-lg"
          >
            Get Started Free <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1E64FF]" />
            <span className="font-bold">POLICYWISE AI</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 PolicyWise AI. All rights reserved.</p>
          <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors">← Back to Home</Link>
        </div>
      </footer>
    </div>
  );
};