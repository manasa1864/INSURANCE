// Public landing page — hero, features, how-it-works, footer.
// Loads the 4 most recent signups from Supabase to show as social proof avatars.
// No auth required — this is what visitors see before they sign up.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Shield, ChevronRight, CheckCircle, BarChart2, Zap } from 'lucide-react';
import { supabase } from '../../lib/api/supabaseClient';

interface RecentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const LandingPage = () => {
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setRecentUsers(data.reverse());
      });
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-[#1E64FF] p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">POLICYWISE AI</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-slate-600 hover:text-[#1E64FF] transition-colors">Features</a>
              <a href="#how-it-works" className="text-slate-600 hover:text-[#1E64FF] transition-colors">How it Works</a>
              <a href="#testimonials" className="text-slate-600 hover:text-[#1E64FF] transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth?mode=login" className="text-slate-600 hover:text-[#1E64FF] font-medium">Login</Link>
              <Link
                to="/auth?mode=signup"
                className="bg-[#1E64FF] text-white px-5 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#1E64FF] rounded-full text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>AI-Powered Insurance Intelligence</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight text-slate-900">
                Choose the right insurance with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E64FF] to-[#1FB6A6]">
                  AI-powered clarity
                </span>
              </h1>
              <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
                Stop guessing. Our explainable AI analyzes your unique profile to recommend the perfect policy, predict accurate premiums, and simulate real-world scenarios.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/auth?mode=signup"
                  className="inline-flex justify-center items-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-[#1E64FF] hover:bg-blue-700 shadow-xl hover:shadow-blue-600/30 transition-all"
                >
                  Start Recommendation
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/learn-more"
                  className="inline-flex justify-center items-center px-8 py-4 text-lg font-semibold rounded-full text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Learn More
                </Link>
              </div>

              {/* Dynamic avatar circles */}
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  {recentUsers.length > 0
                    ? recentUsers.map((u) => (
                        <div
                          key={u.id}
                          className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200 flex items-center justify-center shadow-sm"
                        >
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-500">
                              {(u.full_name || '?')[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))
                    : [1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white" />
                      ))}
                </div>
                <p>Trusted by 10,000+ users</p>
              </div>
            </div>

            <div className="relative lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 backdrop-blur-sm">
              <img
                src="https://images.unsplash.com/photo-1513807016779-d51c0c026263?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZhbWlseSUyMGhvbWV8ZW58MXx8fHwxNzY5NzIxOTM5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Happy Family"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Recommended Plan</p>
                    <p className="font-bold text-lg">Family Health Shield Pro</p>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">98% Match</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1E64FF] h-full w-[98%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why choose PolicyWise AI?</h2>
            <p className="text-slate-600 text-lg">
              We combine advanced machine learning with complete transparency to help you make decisions with confidence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart2 className="w-8 h-8 text-[#1E64FF]" />,
                title: 'Explainable AI Insights',
                desc: 'Understand exactly why a premium is priced that way. See which risk factors impact your cost.',
              },
              {
                icon: <Shield className="w-8 h-8 text-[#1FB6A6]" />,
                title: 'Scenario Simulation',
                desc: "Run 'What-if' simulations to see how lifestyle changes like quitting smoking affect your premium.",
              },
              {
                icon: <CheckCircle className="w-8 h-8 text-[#1E64FF]" />,
                title: 'Transparent Comparisons',
                desc: 'Compare policies side-by-side with unbiased data on claim ratios, hidden clauses, and network hospitals.',
              },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100">
                <div className="mb-6 bg-slate-50 w-16 h-16 rounded-xl flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['Select Type', 'Enter Details', 'AI Analysis', 'Simulate', 'Select & Buy'].map((step, i) => (
              <div key={i} className="relative p-6 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 transition-colors group">
                <div className="text-4xl font-black text-slate-200 group-hover:text-blue-200 mb-4 transition-colors">
                  0{i + 1}
                </div>
                <h4 className="font-bold text-lg">{step}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-[#1E64FF]" />
                <span className="text-xl font-bold">POLICYWISE AI</span>
              </div>
              <p className="text-slate-400 max-w-xs">
                Empowering your insurance decisions with transparent, explainable artificial intelligence.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/auth?mode=login" className="hover:text-white">Login</Link></li>
                <li><Link to="/auth?mode=signup" className="hover:text-white">Sign Up</Link></li>
                <li><a href="#" className="hover:text-white">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-white">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
            © 2026 PolicyWise AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};