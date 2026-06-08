import React, { useState, useEffect } from 'react';
import { Search, Trash2, Eye, ShieldCheck, BookmarkX, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabaseClient';

type SavedPlan = {
  id: string;
  name: string;
  insurer: string;
  insurance_type: string;
  premium: string;
  yearly_premium?: string;
  features: string[];
  risk_score?: number;
  match_score?: number;
  key_benefit?: string;
  best_for?: string;
  created_at: string;
};

const typeColors: Record<string, string> = {
  health: 'bg-blue-50 text-blue-700', life: 'bg-purple-50 text-purple-700',
  vehicle: 'bg-orange-50 text-orange-700', travel: 'bg-cyan-50 text-cyan-700',
  home: 'bg-green-50 text-green-700', business: 'bg-rose-50 text-rose-700',
  accident: 'bg-red-50 text-red-700', critical: 'bg-pink-50 text-pink-700',
  education: 'bg-indigo-50 text-indigo-700', crop: 'bg-lime-50 text-lime-700',
  gadget: 'bg-yellow-50 text-yellow-700', pet: 'bg-teal-50 text-teal-700',
};

const formatPremium = (val: string) =>
  (val || '—').replace(/^Rs\.?\s*/i, '₹').replace(/^INR\s*/i, '₹');

export const SavedPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewingPlan, setViewingPlan] = useState<SavedPlan | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Load from Supabase ── */
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('saved_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setPlans(data);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  /* ── Delete from Supabase ── */
  const handleDelete = async (id: string) => {
    setDeleting(true);
    const { error } = await supabase.from('saved_plans').delete().eq('id', id);
    if (!error) setPlans(prev => prev.filter(p => p.id !== id));
    setDeleting(false);
    setDeleteConfirmId(null);
  };

  const filteredPlans = plans
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.insurer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || p.insurance_type === filterType;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'match') return (b.match_score ?? 0) - (a.match_score ?? 0);
      return 0;
    });

  const uniqueTypes = [...new Set(plans.map(p => p.insurance_type).filter(Boolean))];

  return (
    <div className="space-y-6">

      {/* Delete Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full z-10">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Remove Plan?</h3>
            <p className="text-slate-500 text-sm mb-5">
              Are you sure you want to remove <strong>{plans.find(p => p.id === deleteConfirmId)?.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirmId!)} disabled={deleting}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewingPlan(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full z-10 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#1E64FF] to-blue-500 p-6 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm">
                  {viewingPlan.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{viewingPlan.name}</h3>
                  <p className="text-blue-100 text-sm">{viewingPlan.insurer}</p>
                </div>
              </div>
              <p className="text-2xl font-bold mt-3">{formatPremium(viewingPlan.premium)}<span className="text-blue-200 text-sm ml-1">/year</span></p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Type</p>
                  <p className="font-medium capitalize">{viewingPlan.insurance_type}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Match Score</p>
                  <p className="font-medium text-green-600">{viewingPlan.match_score ?? 'N/A'}%</p>
                </div>
                {viewingPlan.risk_score != null && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs">Risk Score</p>
                    <p className="font-medium">{viewingPlan.risk_score}/100</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Saved On</p>
                  <p className="font-medium">{new Date(viewingPlan.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              {viewingPlan.features?.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2 text-sm">Key Features</p>
                  <ul className="space-y-1.5">
                    {viewingPlan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {viewingPlan.key_benefit && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-800 mb-1">🏆 Key Benefit</p>
                  <p className="text-xs text-blue-700">{viewingPlan.key_benefit}</p>
                </div>
              )}
              {viewingPlan.best_for && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-800 mb-1">👤 Best For</p>
                  <p className="text-xs text-green-700">{viewingPlan.best_for}</p>
                </div>
              )}
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setViewingPlan(null)}
                className="w-full bg-[#1E64FF] text-white py-2.5 rounded-xl font-medium hover:bg-blue-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <span>Home</span> / <span className="text-slate-700">Saved Plans</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Saved Plans</h1>
          <p className="text-slate-500 mt-1">Your bookmarked insurance policies — synced across devices.</p>
        </div>
        <button onClick={() => navigate('/new-recommendation')}
          className="flex items-center gap-2 bg-[#1E64FF] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700">
          + New Recommendation
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search plans or insurers..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="w-full md:w-44 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none bg-white">
            <option value="all">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="w-full md:w-44 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none bg-white">
            <option value="newest">Newest First</option>
            <option value="match">Best Match</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse">
              <div className="flex gap-3"><div className="w-10 h-10 bg-slate-200 rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-200 rounded w-3/4" /><div className="h-3 bg-slate-200 rounded w-1/2" /></div></div>
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-8 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookmarkX className="w-8 h-8 text-[#1E64FF]" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">
            {searchQuery || filterType !== 'all' ? 'No matching plans' : 'No saved plans yet'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {searchQuery || filterType !== 'all' ? 'Try adjusting your filters.' : 'Complete a recommendation and click "Add to Saved Plans" on any policy.'}
          </p>
          {!(searchQuery || filterType !== 'all') && (
            <button onClick={() => navigate('/new-recommendation')}
              className="bg-[#1E64FF] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700">
              Start New Recommendation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map(plan => (
            <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                    {plan.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{plan.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{plan.insurer}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ml-2 ${typeColors[plan.insurance_type] || 'bg-slate-100 text-slate-600'}`}>
                  {plan.insurance_type}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-3 mb-3">
                <div>
                  <p className="text-xs text-slate-400">Annual Premium</p>
                  <p className="text-lg font-bold text-slate-900">{formatPremium(plan.premium)}</p>
                </div>
                {plan.match_score != null && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                    {plan.match_score}% Match
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                {(plan.features || []).slice(0, 3).map((f, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{f}</span>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setViewingPlan(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#1E64FF] text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
                <button onClick={() => setDeleteConfirmId(plan.id)}
                  className="p-2 border border-slate-200 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};