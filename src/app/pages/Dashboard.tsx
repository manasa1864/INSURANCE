// Main dashboard — shows portfolio stats, premium trend chart, AI insights, and coverage gaps.
// Data comes from two Supabase tables: saved_plans and reports.
// AI insight + coverage gap analysis are fetched from Groq once Supabase data has loaded.

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield, TrendingUp, AlertTriangle, Clock, ChevronRight, Activity,
  FileText, User, Sparkles, RefreshCw, BookmarkCheck, BarChart2,
  Zap, Target, IndianRupee, ShieldAlert, ShieldCheck, ShieldX
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '../../lib/api/supabaseClient';
import { useNavigate } from 'react-router';

interface CoverageGap {
  gaps: { type: string; reason: string; urgency: 'high' | 'medium' | 'low' }[];
  overlaps: { description: string }[];
  summary: string;
}

interface AIInsight {
  portfolioSummary: string;
  topRecommendation: string;
  riskAlert: string;
  savingOpportunity: string;
  nextAction: string;
  marketInsight: string;
  scoreChange: string;
  premiumForecast: string;
}

const formatPremium = (val: string) => {
  if (!val) return '—';
  return val.replace(/^Rs\.?\s*/i, '₹').replace(/^INR\s*/i, '₹');
};

const formatCurrency = (val: number) =>
  val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${val}`;

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [coverageGap, setCoverageGap] = useState<CoverageGap | null>(null);
  const [gapLoading, setGapLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email || '');
        setAvatarUrl(user.user_metadata?.avatar_url || null);

        // Load saved plans from Supabase
        const { data: plans } = await supabase
          .from('saved_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (plans) setSavedPlans(plans);

        // Load reports from Supabase
        const { data: reps } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (reps) setReports(reps);
      }
    };
    fetchAll();
  }, []);

  const totalPlans = savedPlans.length;
  const totalReports = reports.length;
  const latestReport = reports[0];
  const latestPlan = savedPlans[0];

  const avgRiskScore = reports.filter((r: any) => r.risk_score).length > 0
    ? Math.round(reports.filter((r: any) => r.risk_score).reduce((s: number, r: any) => s + r.risk_score, 0) / reports.filter((r: any) => r.risk_score).length)
    : null;

  const avgPremium = savedPlans.length > 0
    ? Math.round(savedPlans.reduce((s: number, p: any) => {
        const cleaned = (p.premium || '0').replace(/[^0-9]/g, '');
        const num = parseInt(cleaned);
        return s + (isNaN(num) ? 0 : num);
      }, 0) / savedPlans.length)
    : null;

  // Supabase uses snake_case columns
  const insuranceTypes = [...new Set(savedPlans.map((p: any) => p.insurance_type).filter(Boolean))];

  const premiumTrend = reports.slice(0, 6).reverse().map((r: any) => ({
    name: new Date(r.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    min: r.estimated_min || 0,
    max: r.estimated_max || 0,
  }));

  const riskColor = avgRiskScore
    ? avgRiskScore >= 70 ? 'text-green-600' : avgRiskScore >= 45 ? 'text-amber-600' : 'text-red-600'
    : 'text-slate-400';
  const riskLabel = avgRiskScore
    ? avgRiskScore >= 70 ? 'Low Risk' : avgRiskScore >= 45 ? 'Moderate Risk' : 'High Risk'
    : 'No Data Yet';

  const fetchAIInsight = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) { setAiError(true); return; }
    setAiLoading(true);
    setAiError(false);
    try {
      const types = [...new Set(savedPlans.map((p: any) => p.insurance_type).filter(Boolean))].join(', ') || 'none';
      const lReport = reports[0];
      const lPlan = savedPlans[0];

      const profileLines = [
        'You are PolicyWise AI, an expert Indian insurance advisor.',
        'Analyse this user portfolio and give brief actionable insights.',
        '',
        'USER PORTFOLIO:',
        'Saved plans: ' + savedPlans.length + (types !== 'none' ? ', types: ' + types : ''),
        'Reports generated: ' + reports.length,
        lReport ? 'Latest report: ' + lReport.name + ', risk score ' + lReport.risk_score + '/100, estimated premium ' + (lReport.estimated_min || 0) + ' to ' + (lReport.estimated_max || 0) + ' rupees per year' : 'No reports yet',
        lPlan ? 'Latest saved plan: ' + lPlan.name + ' by ' + lPlan.insurer + ', premium ' + lPlan.premium : 'No plans saved yet',
        avgRiskScore ? 'Average risk score: ' + avgRiskScore + '/100' : 'No risk data yet',
        '',
        'Respond with JSON only. No markdown, no backticks, no explanation outside JSON:',
        '{',
        '  "portfolioSummary": "1-2 sentences on their insurance portfolio status",',
        '  "topRecommendation": "Most important insurance action they should take now",',
        '  "riskAlert": "Key risk in their profile to be aware of",',
        '  "savingOpportunity": "Specific way to reduce their premium costs",',
        '  "nextAction": "Single most impactful next step today",',
        '  "marketInsight": "One relevant 2025 Indian insurance market tip",',
        '  "scoreChange": "How their risk score could improve with specific actions",',
        '  "premiumForecast": "Brief premium trend forecast for their insurance types"',
        '}',
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 700,
          messages: [
            { role: 'system', content: 'You are PolicyWise AI. Always respond with valid JSON only. No text before or after the JSON object.' },
            { role: 'user', content: profileLines.join('\n') },
          ],
        }),
      });

      if (!response.ok) throw new Error('API ' + response.status);
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const clean = text.replace(/```json|```/g, '').trim();
      setAiInsight(JSON.parse(clean));
    } catch (err) {
      console.error('Dashboard AI error:', err);
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [savedPlans, reports, avgRiskScore]);

  const fetchCoverageGap = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey || savedPlans.length === 0) return;
    setGapLoading(true);
    try {
      const covered = [...new Set(savedPlans.map((p: any) => p.insurance_type).filter(Boolean))].join(', ');
      const prompt = [
        'You are PolicyWise AI, an expert Indian insurance advisor.',
        `The user currently has these insurance types: ${covered}.`,
        'Analyse gaps and overlaps against ideal coverage for an Indian working professional.',
        'Respond with JSON only. No markdown, no backticks:',
        '{',
        '  "gaps": [{"type": "insurance type name", "reason": "why they need it (1 sentence)", "urgency": "high|medium|low"}],',
        '  "overlaps": [{"description": "brief overlap description"}],',
        '  "summary": "1 sentence overall coverage assessment"',
        '}',
        'Return at most 3 gaps and 1 overlap. Only real gaps based on their current coverage.',
      ].join('\n');

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 400,
          messages: [
            { role: 'system', content: 'Respond only with valid JSON. No text before or after the JSON object.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      setCoverageGap(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      // silently fail — coverage gap is non-critical
    } finally {
      setGapLoading(false);
    }
  }, [savedPlans]);

  // Run AI insight once Supabase data has loaded
  useEffect(() => {
    if (savedPlans.length > 0 || reports.length > 0) {
      fetchAIInsight();
    }
    if (savedPlans.length > 0) {
      fetchCoverageGap();
    }
  }, [savedPlans, reports]); // eslint-disable-line

  const firstName = userName.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-sm shrink-0 flex items-center justify-center">
            {avatarUrl ? <img src={avatarUrl} alt={firstName} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-slate-400" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}! 👋</h1>
            <p className="text-slate-500 text-sm">Your AI insurance advisor is ready.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/reports')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm">View Reports</button>
          <button onClick={() => navigate('/new-recommendation')} className="px-4 py-2 bg-[#1E64FF] text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-lg shadow-blue-500/20">+ New Recommendation</button>
        </div>
      </div>

      {/* AI Insight Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-blue-500/20 p-2 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5 text-blue-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider">AI Portfolio Insight</p>
                {aiLoading && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />}
              </div>
              {aiLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-white/10" />
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                </div>
              ) : aiError || !aiInsight ? (
                <p className="text-slate-300 text-sm">
                  {totalPlans === 0 && totalReports === 0
                    ? 'Complete your first recommendation to unlock personalised AI insights.'
                    : 'AI insights temporarily unavailable.'}
                </p>
              ) : (
                <div>
                  <p className="text-white text-sm leading-relaxed">{aiInsight.portfolioSummary}</p>
                  <p className="text-blue-200 text-xs mt-2">💡 {aiInsight.nextAction}</p>
                </div>
              )}
            </div>
          </div>
          <button onClick={fetchAIInsight} disabled={aiLoading} className="text-blue-300 hover:text-white shrink-0">
            <RefreshCw className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Shield, color: 'bg-blue-50', iconColor: 'text-[#1E64FF]', label: 'Saved Plans', value: totalPlans > 0 ? `${totalPlans} Plan${totalPlans > 1 ? 's' : ''}` : 'None yet', sub: latestPlan ? latestPlan.insurance_type : 'Start exploring', onClick: () => navigate('/saved') },
          { icon: IndianRupee, color: 'bg-teal-50', iconColor: 'text-[#1FB6A6]', label: 'Avg. Premium', value: avgPremium ? formatCurrency(avgPremium) + '/yr' : '—', sub: latestReport ? `Last: ${formatCurrency(latestReport.estimated_min || 0)}` : 'No reports yet', onClick: () => navigate('/reports') },
          { icon: AlertTriangle, color: avgRiskScore ? (avgRiskScore >= 70 ? 'bg-green-50' : avgRiskScore >= 45 ? 'bg-amber-50' : 'bg-red-50') : 'bg-slate-50', iconColor: riskColor, label: 'Avg. Risk Score', value: avgRiskScore ? `${avgRiskScore}/100` : '—', sub: riskLabel, onClick: () => navigate('/reports') },
          { icon: FileText, color: 'bg-indigo-50', iconColor: 'text-indigo-600', label: 'Reports', value: totalReports > 0 ? `${totalReports} Report${totalReports > 1 ? 's' : ''}` : 'None yet', sub: latestReport ? `Last: ${latestReport.report_date}` : 'Generate first', onClick: () => navigate('/reports') },
        ].map((card, idx) => (
          <div key={idx} onClick={card.onClick} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2.5 ${card.color} rounded-xl`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-slate-500 text-xs mb-1">{card.label}</p>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#1E64FF] transition-colors">{card.value}</h3>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Premium Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Premium History</h3>
              <p className="text-xs text-slate-400">From your generated reports</p>
            </div>
            {aiInsight?.premiumForecast && (
              <p className="text-xs text-[#1E64FF] max-w-40 text-right">{aiInsight.premiumForecast}</p>
            )}
          </div>
          {premiumTrend.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={premiumTrend}>
                  <defs>
                    <linearGradient id="cMin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E64FF" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1E64FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cMax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1FB6A6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1FB6A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} />
                  <Area type="monotone" dataKey="min" stroke="#1E64FF" strokeWidth={2} fillOpacity={1} fill="url(#cMin)" name="Min" />
                  <Area type="monotone" dataKey="max" stroke="#1FB6A6" strokeWidth={2} fillOpacity={1} fill="url(#cMax)" name="Max" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-slate-400">
              <BarChart2 className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium">No premium history yet</p>
              <p className="text-xs mt-1 text-slate-400">Complete a recommendation to see data here</p>
              <button onClick={() => navigate('/new-recommendation')} className="mt-4 text-xs text-[#1E64FF] font-medium hover:underline">Start now →</button>
            </div>
          )}
        </div>

        {/* Risk + AI Alerts */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Portfolio Health</h3>
            {avgRiskScore ? (
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={avgRiskScore >= 70 ? '#22c55e' : avgRiskScore >= 45 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${avgRiskScore} ${100 - avgRiskScore}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">{avgRiskScore}</span>
                  </div>
                </div>
                <div>
                  <p className={`font-bold ${riskColor}`}>{riskLabel}</p>
                  <p className="text-xs text-slate-400">{totalReports} report{totalReports !== 1 ? 's' : ''}</p>
                  {aiInsight?.scoreChange && <p className="text-xs text-[#1E64FF] mt-1 leading-relaxed">{aiInsight.scoreChange}</p>}
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <Target className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Complete a recommendation</p>
              </div>
            )}
          </div>

          {aiInsight && !aiLoading && (
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-800 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Risk Alert
                </p>
                <p className="text-amber-800 text-xs leading-relaxed">{aiInsight.riskAlert}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-green-800 mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Saving Opportunity
                </p>
                <p className="text-green-800 text-xs leading-relaxed">{aiInsight.savingOpportunity}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Saved Plans */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900">Saved Plans</h3>
            <button onClick={() => navigate('/saved')} className="text-xs text-[#1E64FF] hover:underline">View all</button>
          </div>
          {savedPlans.length > 0 ? (
            <div className="space-y-2">
              {savedPlans.slice(0, 3).map((plan: any, idx: number) => (
                <div key={idx} onClick={() => navigate('/saved')}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {(plan.name || 'P').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{plan.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{plan.insurance_type}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#1E64FF] shrink-0 whitespace-nowrap">{formatPremium(plan.premium)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookmarkCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No saved plans</p>
              <button onClick={() => navigate('/new-recommendation')} className="mt-3 text-xs text-[#1E64FF] hover:underline">Get recommendations →</button>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900">Recent Reports</h3>
            <button onClick={() => navigate('/reports')} className="text-xs text-[#1E64FF] hover:underline">View all</button>
          </div>
          {reports.length > 0 ? (
            <div className="space-y-2">
              {reports.slice(0, 3).map((report: any, idx: number) => (
                <div key={idx} onClick={() => navigate('/reports')}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#1E64FF]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{report.name}</p>
                      <p className="text-xs text-slate-400">{report.report_date}</p>
                    </div>
                  </div>
                  {report.risk_score && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${report.risk_score >= 70 ? 'bg-green-100 text-green-700' : report.risk_score >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {report.risk_score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No reports yet</p>
              <button onClick={() => navigate('/new-recommendation')} className="mt-3 text-xs text-[#1E64FF] hover:underline">Generate first report →</button>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1E64FF]" /> AI Insights
            </h3>
            <button onClick={fetchAIInsight} disabled={aiLoading} className="text-slate-400 hover:text-[#1E64FF]">
              <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {aiLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : aiInsight ? (
            <div className="space-y-3">
              {[
                { label: '🎯 Top Action', text: aiInsight.topRecommendation, bg: 'bg-blue-50 border-blue-100' },
                { label: '📈 Market Insight', text: aiInsight.marketInsight, bg: 'bg-purple-50 border-purple-100' },
                { label: '🔮 Forecast', text: aiInsight.scoreChange, bg: 'bg-slate-50 border-slate-200' },
              ].map(({ label, text, bg }) => (
                <div key={label} className={`rounded-xl p-3 border ${bg}`}>
                  <p className="text-xs font-bold text-slate-700 mb-1">{label}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {totalPlans === 0 && totalReports === 0 ? 'Complete a recommendation to unlock insights' : 'Insights unavailable'}
              </p>
              {totalPlans === 0 && (
                <button onClick={() => navigate('/new-recommendation')} className="mt-3 text-xs text-[#1E64FF] hover:underline">Get started →</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Coverage Gap Detector */}
      {(gapLoading || coverageGap) && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">AI Coverage Gap Analysis</h3>
                {coverageGap?.summary && !gapLoading && (
                  <p className="text-xs text-slate-500 mt-0.5">{coverageGap.summary}</p>
                )}
              </div>
            </div>
            {gapLoading && <div className="w-4 h-4 border-2 border-[#1E64FF] border-t-transparent rounded-full animate-spin" />}
          </div>

          {gapLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : coverageGap && (
            <div className="space-y-4">
              {coverageGap.gaps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Missing Coverage</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {coverageGap.gaps.map((gap, i) => {
                      const urgencyStyle = gap.urgency === 'high'
                        ? 'border-rose-200 bg-rose-50'
                        : gap.urgency === 'medium'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-slate-200 bg-slate-50';
                      const badgeStyle = gap.urgency === 'high'
                        ? 'bg-rose-100 text-rose-700'
                        : gap.urgency === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-600';
                      return (
                        <div key={i} className={`rounded-xl border p-3.5 ${urgencyStyle}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-semibold text-slate-800 capitalize">{gap.type}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badgeStyle}`}>
                              {gap.urgency}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{gap.reason}</p>
                          <button
                            onClick={() => navigate('/new-recommendation?type=' + gap.type)}
                            className="mt-2 text-xs font-medium text-[#1E64FF] hover:underline"
                          >
                            Get recommendation →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {coverageGap.overlaps.length > 0 && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-0.5">Potential Overlap</p>
                    <p className="text-xs text-blue-700 leading-relaxed">{coverageGap.overlaps[0].description}</p>
                  </div>
                </div>
              )}

              {coverageGap.gaps.length === 0 && (
                <div className="flex items-center gap-3 py-3">
                  <ShieldX className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="font-medium text-slate-800">Great coverage!</p>
                    <p className="text-xs text-slate-500">No significant gaps detected based on your saved plans.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Coverage Map */}
      {insuranceTypes.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900">Your Insurance Coverage</h3>
            <p className="text-xs text-slate-400">{insuranceTypes.length}/12 types covered</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['health','life','vehicle','travel','home','business','accident','critical','education','crop','gadget','pet'].map(type => {
              const covered = insuranceTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => covered ? navigate('/saved') : navigate('/new-recommendation?type=' + type)}
                  title={covered ? 'View your saved ' + type + ' plans' : 'Get ' + type + ' insurance recommendations'}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all hover:scale-105 ${
                    covered
                      ? 'bg-[#1E64FF] text-white border-[#1E64FF] hover:bg-blue-700'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-[#1E64FF] hover:border-[#1E64FF]'
                  }`}>
                  {covered ? '✓ ' : '+ '}{type}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            <span className="text-[#1E64FF] font-medium">✓ Covered</span> — click to view saved plans &nbsp;·&nbsp;
            <span className="text-slate-500">+ Uncovered</span> — click to get a recommendation
          </p>
          {aiInsight && <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">💡 {aiInsight.topRecommendation}</p>}
        </div>
      )}

    </div>
  );
};