import React, { useState, useRef, useEffect } from 'react';
import {
  Search, HelpCircle, MessageSquare, Plus, ChevronDown,
  FileText, Send, Sparkles, X, CheckCircle2, AlertCircle,
  Phone, Mail, BookOpen, ChevronRight, Loader2, ThumbsUp,
  ThumbsDown, RotateCcw, Clock, Shield, Zap, BarChart2, Info
} from 'lucide-react';
import { insuranceTerms } from '../../lib/insuranceTerms';

/* ── Types ── */
type ChatMessage = { role: 'user' | 'ai'; text: string; };
type Ticket = { id: string; subject: string; category: string; message: string; status: 'Open' | 'Resolved' | 'Closed'; date: string; };
type FaqItem = { q: string; a: string; category: string; };

/* ── FAQ Data ── */
const faqs: FaqItem[] = [
  { category: 'Premiums', q: 'How is the premium calculated?', a: 'Premiums are calculated using a 6-layer AI risk engine that considers your age, BMI, smoking status, pre-existing conditions, city type, occupation, and coverage amount. These factors are combined with real actuarial weights from IRDAI data to give you the most accurate estimate.' },
  { category: 'Premiums', q: 'Why is my risk score different from what I expected?', a: 'Your risk score (0–100) is calculated in real time as you fill the form. A higher score means lower risk and cheaper premiums. Key factors that lower your score include smoking, high BMI, pre-existing conditions, age above 45, and recent hospitalisations. You can see a full breakdown in the Review tab of Step 2.' },
  { category: 'Premiums', q: 'Can I reduce my premium?', a: 'Yes! The What-if Simulator lets you test exactly this. Try improving your BMI category, stopping tobacco, choosing annual payment (saves 3–5% vs monthly), or opting for a higher deductible. Each change shows the exact impact on your estimated premium.' },
  { category: 'Policies', q: 'Can I compare more than 2 policies?', a: 'Currently the Compare Policies tool supports 2 policies side-by-side with AI analysis. You can save as many plans as you like and swap them in the comparison tool. We are working on a 3-way comparison feature.' },
  { category: 'Policies', q: 'How do I save a policy recommendation?', a: 'After getting AI recommendations in Step 5, click "Add to Saved Plans" on any policy card. It will be saved to your Supabase account and appear in the Saved Plans page, synced across all your devices.' },
  { category: 'Policies', q: 'What does the match score mean?', a: 'The match score (e.g. 96%) indicates how well a policy fits your specific risk profile. Higher match = better suited to your age, health, location, and coverage needs. Policies above 90% match are strong recommendations for your profile.' },
  { category: 'Reports', q: 'How do I download my report?', a: 'Go to the Reports page from the sidebar. Each report has a three-dot menu — click it and select "Download". The report downloads as an HTML file you can open in any browser and print as PDF.' },
  { category: 'Reports', q: 'What information is in my report?', a: 'Your report includes your risk profile, risk score, estimated premium range, top 3 recommended policies with their premiums and features, a money-saving tip from the AI, and your tax benefit information.' },
  { category: 'Account', q: 'Is my data secure?', a: 'Yes. Your data is stored in Supabase with Row Level Security — only you can access your own plans and reports. All connections are encrypted. We do not share your data with any insurance company until you choose to apply.' },
  { category: 'Account', q: 'Can I delete my saved plans?', a: 'Yes. On the Saved Plans page, each plan card has a trash icon. Clicking it shows a confirmation dialog before permanently deleting the plan from your account.' },
  { category: 'Features', q: 'What is the What-if Simulator?', a: 'The What-if Simulator lets you test how changing your profile affects your premium. Select a saved plan, adjust parameters like age, BMI, city, coverage amount, add-ons, and the AI calculates a new simulated premium, shows cost drivers, and gives saving recommendations.' },
  { category: 'Features', q: 'How does the AI comparison work?', a: 'When you compare two plans of the same type, the AI picks the better value based on premium, match score, risk score, and features. When you compare two different types, the AI ranks them by urgency based on your risk profile and Indian insurance priority order (health > life > critical > accident > vehicle…).' },
];

/* ── Groq AI chat ── */
async function askAI(messages: ChatMessage[]): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return 'AI assistant is temporarily unavailable. Please check the FAQ below or create a support ticket.';

  const systemPrompt = [
    'You are the PolicyWise AI support assistant. You help users with questions about the PolicyWise insurance platform.',
    'PolicyWise features: 6-step recommendation wizard, risk engine, Groq AI recommendations, compare policies, what-if simulator, saved plans (Supabase), reports.',
    'Supported insurance types: health, life, vehicle, travel, home, business, accident, critical illness, education, crop, gadget, pet.',
    'Be concise, friendly, and helpful. Answer in 2-4 sentences. If unsure, suggest creating a support ticket.',
    'Never make up insurance policy details. Only answer about the platform features.',
  ].join(' ');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
      ],
    }),
  });
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || 'Sorry, I could not process that. Please try again.';
}

/* ── Components ── */
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

const categoryIcons: Record<string, React.ReactNode> = {
  Premiums: <IndianRupeeIcon />,
  Policies: <Shield className="w-4 h-4" />,
  Reports: <FileText className="w-4 h-4" />,
  Account: <HelpCircle className="w-4 h-4" />,
  Features: <Zap className="w-4 h-4" />,
};

function IndianRupeeIcon() {
  return <span className="text-sm font-bold">₹</span>;
}

/* ── Main Component ── */
export const HelpSupport = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqFeedback, setFaqFeedback] = useState<Record<number, 'up' | 'down'>>({});

  // AI Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Hi! I\'m the PolicyWise AI assistant. Ask me anything about the platform — premiums, reports, saved plans, or how to use any feature.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ticket
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ category: '', subject: '', message: '' });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [termSearch, setTermSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: 'T-8821', subject: 'Login issue on mobile', category: 'Account', message: '', status: 'Open', date: '2 hrs ago' },
    { id: 'T-8805', subject: 'Report PDF not downloading', category: 'Reports', message: '', status: 'Resolved', date: 'Yesterday' },
    { id: 'T-8790', subject: 'Premium discrepancy', category: 'Premiums', message: '', status: 'Closed', date: 'Oct 20' },
  ]);

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(f => {
    const matchSearch = !searchQuery ||
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'All' || f.category === activeCategory;
    return matchSearch && matchCat;
  });

  const handleChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const reply = await askAI(newMessages);
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Please try again or create a support ticket.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleTicketSubmit = () => {
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.message) return;
    const newTicket: Ticket = {
      id: 'T-' + Math.floor(Math.random() * 9000 + 1000),
      subject: ticketForm.subject,
      category: ticketForm.category,
      message: ticketForm.message,
      status: 'Open',
      date: 'Just now',
    };
    setTickets(prev => [newTicket, ...prev]);
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketOpen(false);
      setTicketSubmitted(false);
      setTicketForm({ category: '', subject: '', message: '' });
    }, 2000);
  };

  const quickQuestions = [
    'How is my risk score calculated?',
    'How do I reduce my premium?',
    'Where can I download my report?',
    'What does match score mean?',
  ];

  return (
    <div className="space-y-6">

      {/* ── Docs Modal ── */}
      {docsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDocsOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full z-10 max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">PolicyWise User Guide</h3>
                    <p className="text-purple-200 text-sm">Learn how to use every feature</p>
                  </div>
                </div>
                <button onClick={() => setDocsOpen(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {[
                {
                  step: '1', icon: '🎯', title: 'Get a Recommendation',
                  desc: 'Click "New Recommendation" in the sidebar. Go through 6 steps: pick insurance type → fill details → AI analyses your risk → get 3 tailored policy recommendations → save report.',
                  tips: ['Fill all fields marked * for best accuracy', 'Watch the risk score update live in the sidebar', 'Your risk score affects which policies are suggested'],
                },
                {
                  step: '2', icon: '💾', title: 'Save Plans',
                  desc: 'In Step 5 (Results), click "Add to Saved Plans" on any policy card. Saved plans sync to your Supabase account and appear on the Saved Plans page across all devices.',
                  tips: ['You can save multiple policies from the same recommendation', 'Saved plans are used by Compare Policies and the Simulator'],
                },
                {
                  step: '3', icon: '📊', title: 'Generate & Download Reports',
                  desc: 'In Step 6 (Report), click "Save to Reports Panel" to store it, or "Download Report" to get an HTML file. Open the HTML in any browser and use Ctrl+P to print as PDF.',
                  tips: ['Reports include your risk score, top 3 policies, and AI tips', 'All saved reports appear in the Reports page'],
                },
                {
                  step: '4', icon: '⚖️', title: 'Compare Policies',
                  desc: 'Go to Compare Policies in the sidebar. Select any 2 saved plans. The AI provides a detailed comparison — if same type it picks the better value, if different types it ranks by urgency based on your risk scores.',
                  tips: ['You need at least 2 saved plans to compare', 'Download the comparison as an HTML report'],
                },
                {
                  step: '5', icon: '🔬', title: 'What-if Simulator',
                  desc: 'Select a saved plan and adjust parameters like age, BMI, coverage amount, city, add-ons. The AI calculates a simulated premium and shows exactly which factors raise or lower your cost.',
                  tips: ['Try toggling "Smoker" on/off to see the impact', 'Annual payment always gives lower premiums than monthly', 'Check the Tax Benefit section — it shows your 80D deduction'],
                },
                {
                  step: '6', icon: '📈', title: 'Dashboard',
                  desc: 'The Dashboard shows your portfolio at a glance — saved plans, reports, average risk score, premium history chart, and AI insights. Coverage map badges are clickable — blue = go to saved plans, grey = get a recommendation for that type.',
                  tips: ['Click the refresh icon on AI Insights to regenerate', 'Coverage map shows all 12 insurance types'],
                },
              ].map(({ step, icon, title, desc, tips }) => (
                <div key={step} className="flex gap-4">
                  <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                    {step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 mb-1">{icon} {title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">{desc}</p>
                    <ul className="space-y-1">
                      {tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                          <span className="text-purple-400 shrink-0">→</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setDocsOpen(false)}
                className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-medium hover:bg-purple-700">
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ticket Modal ── */}
      {ticketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setTicketOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full z-10">
            {ticketSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 text-xl mb-2">Ticket Created!</h3>
                <p className="text-slate-500 text-sm">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900 text-lg">Create Support Ticket</h3>
                  <button onClick={() => setTicketOpen(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
                    <select value={ticketForm.category} onChange={e => setTicketForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none bg-white">
                      <option value="">Select category…</option>
                      {['Account & Billing', 'Technical Issue', 'Policy Questions', 'Premium Calculation', 'Report Issues', 'Feature Request', 'Other'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject <span className="text-red-500">*</span></label>
                    <input type="text" value={ticketForm.subject} onChange={e => setTicketForm(p => ({ ...p, subject: e.target.value }))}
                      placeholder="Brief summary of your issue"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message <span className="text-red-500">*</span></label>
                    <textarea value={ticketForm.message} onChange={e => setTicketForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Describe your issue in detail — include any error messages or screenshots description…"
                      rows={4}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setTicketOpen(false)}
                      className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-50 text-sm">
                      Cancel
                    </button>
                    <button onClick={handleTicketSubmit}
                      disabled={!ticketForm.category || !ticketForm.subject || !ticketForm.message}
                      className="flex-1 bg-[#1E64FF] text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                      Submit Ticket
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── AI Chat Drawer ── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
          <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl z-10">
            {/* Chat header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-5 text-white">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/30 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-200" />
                  </div>
                  <div>
                    <p className="font-bold">PolicyWise AI Assistant</p>
                    <p className="text-blue-300 text-xs">Powered by Llama 3.3</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setChatMessages([{ role: 'ai', text: 'Hi! I\'m the PolicyWise AI assistant. Ask me anything about the platform.' }])}
                    className="text-blue-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setChatOpen(false)} className="text-blue-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick questions */}
            {chatMessages.length <= 1 && (
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map(q => (
                    <button key={q} onClick={() => { setChatInput(q); }}
                      className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-[#1E64FF] hover:text-[#1E64FF] transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1E64FF]" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1E64FF] text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#1E64FF]" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: i * 150 + 'ms' }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="Type your question…"
                  className="flex-1 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
                <button onClick={handleChat} disabled={!chatInput.trim() || chatLoading}
                  className="w-11 h-11 bg-[#1E64FF] text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">AI may make mistakes. For complex issues, create a ticket.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Term Definition Modal ── */}
      {activeTerm && insuranceTerms[activeTerm] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setActiveTerm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg"><Info className="w-4 h-4 text-[#1E64FF]" /></div>
                <h3 className="font-bold text-slate-900 text-base">{insuranceTerms[activeTerm].title}</h3>
              </div>
              <button onClick={() => setActiveTerm(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">{insuranceTerms[activeTerm].plain}</p>
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
              {insuranceTerms[activeTerm].example}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <span>Home</span> / <span className="text-slate-700">Help & Support</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Help & Support</h1>
          <p className="text-slate-500 mt-1">Find answers instantly or get help from our team.</p>
        </div>
        <button onClick={() => setTicketOpen(true)}
          className="flex items-center gap-2 bg-[#1E64FF] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> Create Ticket
        </button>
      </div>

      {/* ── Hero search + AI chat CTA ── */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-8 text-white text-center">
        <Sparkles className="w-8 h-8 text-blue-300 mx-auto mb-3" />
        <h2 className="text-2xl font-bold mb-2">How can we help you?</h2>
        <p className="text-slate-300 text-sm mb-6">Search the FAQ or ask our AI assistant instantly</p>
        <div className="max-w-xl mx-auto relative mb-4">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for answers… e.g. 'how to download report'"
            className="w-full pl-12 pr-4 py-3.5 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
        </div>
        <button onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <MessageSquare className="w-4 h-4" /> Chat with AI Assistant
        </button>
      </div>

      {/* ── Contact Options ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: MessageSquare, color: 'bg-blue-50 text-blue-600 border-blue-100',
            title: 'AI Assistant', sub: 'Get instant answers', badge: 'Instant',
            badgeColor: 'bg-green-100 text-green-700',
            onClick: () => setChatOpen(true),
          },
          {
            icon: Mail, color: 'bg-teal-50 text-teal-600 border-teal-100',
            title: 'Email Support', sub: 'support@policywise.ai', badge: '24hr reply',
            badgeColor: 'bg-amber-100 text-amber-700',
            onClick: () => window.location.href = 'mailto:support@policywise.ai',
          },
          {
            icon: BookOpen, color: 'bg-purple-50 text-purple-600 border-purple-100',
            title: 'Documentation', sub: 'Full user guide & features', badge: 'Always open',
            badgeColor: 'bg-blue-100 text-blue-700',
            onClick: () => setDocsOpen(true),
          },
        ].map(({ icon: Icon, color, title, sub, badge, badgeColor, onClick }) => (
          <button key={title} onClick={onClick}
            className="bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm group-hover:text-[#1E64FF] transition-colors">{title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: FAQ ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#1E64FF] text-white border-[#1E64FF]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#1E64FF] hover:text-[#1E64FF]'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                {searchQuery ? `Search results for "${searchQuery}"` : 'Frequently Asked Questions'}
                <span className="text-slate-400 text-sm font-normal ml-2">({filteredFaqs.length})</span>
              </h3>
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="font-medium text-slate-700 mb-1">No results found</p>
                <p className="text-sm text-slate-400 mb-4">Try different keywords or ask our AI assistant</p>
                <button onClick={() => setChatOpen(true)}
                  className="text-sm bg-[#1E64FF] text-white px-5 py-2.5 rounded-xl hover:bg-blue-700">
                  Ask AI Assistant
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredFaqs.map((faq, i) => (
                  <div key={i} className="group">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-start justify-between p-5 text-left hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3 min-w-0 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                          faq.category === 'Premiums' ? 'bg-blue-50 text-blue-700' :
                          faq.category === 'Policies' ? 'bg-green-50 text-green-700' :
                          faq.category === 'Reports' ? 'bg-purple-50 text-purple-700' :
                          faq.category === 'Account' ? 'bg-orange-50 text-orange-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>{faq.category}</span>
                        <p className="text-sm font-medium text-slate-800">{faq.q}</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform mt-0.5 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5">
                        <p className="text-sm text-slate-600 leading-relaxed pl-16">{faq.a}</p>
                        <div className="flex items-center gap-3 mt-4 pl-16">
                          <p className="text-xs text-slate-400">Was this helpful?</p>
                          <button onClick={() => setFaqFeedback(p => ({ ...p, [i]: 'up' }))}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${faqFeedback[i] === 'up' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-100'}`}>
                            <ThumbsUp className="w-3.5 h-3.5" /> Yes
                          </button>
                          <button onClick={() => setFaqFeedback(p => ({ ...p, [i]: 'down' }))}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${faqFeedback[i] === 'down' ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                            <ThumbsDown className="w-3.5 h-3.5" /> No
                          </button>
                          {faqFeedback[i] === 'down' && (
                            <button onClick={() => setChatOpen(true)}
                              className="text-xs text-[#1E64FF] hover:underline">
                              Ask AI instead →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Not found CTA */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 text-sm">Didn't find your answer?</p>
              <p className="text-xs text-slate-500 mt-0.5">Our AI assistant can answer most questions instantly</p>
            </div>
            <button onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 bg-[#1E64FF] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shrink-0">
              <Sparkles className="w-4 h-4" /> Ask AI
            </button>
          </div>
        </div>

        {/* ── Right: Tickets ── */}
        <div className="space-y-4">

          {/* Status overview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-4 text-sm">Platform Status</h3>
            <div className="space-y-3">
              {[
                { label: 'AI Recommendations', status: 'Operational' },
                { label: 'Supabase Sync', status: 'Operational' },
                { label: 'Report Downloads', status: 'Operational' },
                { label: 'Authentication', status: 'Operational' },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Your Tickets</h3>
              <button onClick={() => setTicketOpen(true)}
                className="text-xs text-[#1E64FF] font-medium hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {tickets.map(ticket => (
                <div key={ticket.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-slate-900 truncate">{ticket.subject}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                      ticket.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      ticket.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>#{ticket.id} · {ticket.category}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ticket.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-amber-800 mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Quick Tips
            </p>
            <ul className="space-y-2">
              {[
                'Use the What-if Simulator to test premium scenarios',
                'Save plans from Step 5 to compare them later',
                'Download your report as HTML and print as PDF',
                'Enable annual payment for 3-5% lower premiums',
              ].map((tip, i) => (
                <li key={i} className="text-xs text-amber-800 flex items-start gap-2">
                  <span className="w-4 h-4 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]">{i + 1}</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Insurance Glossary */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1E64FF]" /> Insurance Glossary
              </h3>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={termSearch}
                  onChange={e => setTermSearch(e.target.value)}
                  placeholder="Search terms…"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#1E64FF] focus:border-[#1E64FF] outline-none bg-slate-50"
                />
              </div>
            </div>
            <ul className="divide-y divide-slate-50 max-h-64 overflow-y-auto custom-scrollbar">
              {Object.keys(insuranceTerms)
                .filter(t => !termSearch || t.toLowerCase().includes(termSearch.toLowerCase()))
                .map(term => (
                  <li key={term} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-slate-700">{term}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTerm(term)}
                      className="text-[#1E64FF] hover:underline font-medium flex items-center gap-1 text-xs shrink-0 ml-2"
                    >
                      What's this? <Info className="w-3 h-3" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};