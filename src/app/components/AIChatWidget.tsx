import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Bot, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What coverage am I missing?',
  'How can I reduce my premium?',
  'What is term life insurance?',
  'Am I over-insured?',
];

export const AIChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [contextReady, setContextReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: plans }, { data: reports }] = await Promise.all([
        supabase.from('saved_plans').select('name, insurance_type, insurer, premium').eq('user_id', user.id).limit(10),
        supabase.from('reports').select('name, insurance_type, risk_score, estimated_min, estimated_max').eq('user_id', user.id).limit(5),
      ]);

      const types = [...new Set((plans || []).map((p: any) => p.insurance_type).filter(Boolean))];
      const avgRisk = reports?.filter((r: any) => r.risk_score).length
        ? Math.round(reports!.reduce((s, r: any) => s + (r.risk_score || 0), 0) / reports!.filter((r: any) => r.risk_score).length)
        : null;

      const lines = [
        'USER PORTFOLIO CONTEXT:',
        `Saved plans: ${plans?.length || 0}${types.length ? ' — types: ' + types.join(', ') : ' (none yet)'}`,
        avgRisk ? `Average risk score: ${avgRisk}/100` : 'No risk data yet',
        plans?.length
          ? `Plans: ${(plans || []).map((p: any) => `${p.name} (${p.insurer}, ${p.premium})`).join('; ')}`
          : '',
        reports?.length
          ? `Latest report: ${reports[0].name}, risk score ${reports[0].risk_score}`
          : '',
      ].filter(Boolean);

      setUserContext(lines.join('\n'));
      setContextReady(true);
    };
    loadContext();
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm PolicyWise AI. I can help with coverage gaps, premium tips, policy comparisons, and any insurance questions. What would you like to know?",
      }]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) return;

    const userMsg: Message = { role: 'user', content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = [
        'You are PolicyWise AI, an expert Indian insurance advisor in a chat widget.',
        'Give concise, practical advice. Use ₹ for Indian rupees. Keep responses under 100 words unless the user asks for detail.',
        'Focus on Indian insurance products: LIC, HDFC Ergo, Star Health, Bajaj Allianz, ICICI Lombard, etc.',
        'Be warm, direct, and jargon-free.',
        userContext ? '\n' + userContext : '',
      ].join('\n');

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 250,
          messages: [
            { role: 'system', content: systemPrompt },
            ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not respond. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, userContext]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ width: 360, height: 500 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-500/20 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-none">PolicyWise AI</p>
                <p className="text-blue-300 text-xs mt-0.5">
                  {contextReady ? 'Portfolio loaded · Ready' : 'Loading context…'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#1E64FF]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1E64FF] text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#1E64FF]" />
                </div>
                <div className="bg-white border border-slate-100 rounded-xl rounded-bl-sm px-3 py-2.5 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (show only on first message) */}
          {messages.length === 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-slate-50 shrink-0">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-[#1E64FF] hover:text-[#1E64FF] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about insurance…"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1E64FF] focus:border-[#1E64FF] bg-slate-50 placeholder-slate-400"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="p-2 bg-[#1E64FF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#1E64FF] text-white rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center"
        title="Chat with PolicyWise AI"
      >
        {open
          ? <X className="w-6 h-6" />
          : <MessageCircle className="w-6 h-6" />
        }
      </button>
    </>
  );
};
