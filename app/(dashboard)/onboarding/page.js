'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Building2, MessageSquare, BookOpen, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const TOTAL_STEPS = 4;

const INDUSTRIES = [
  'Real Estate', 'Healthcare', 'Legal Services', 'Financial Services',
  'Home Services', 'Retail / E-commerce', 'Fitness & Wellness', 'Restaurants & Food',
  'Education', 'Marketing & Agency', 'SaaS / Technology', 'Consulting', 'Other'
];

const TONES = [
  { value: 'Professional', label: 'Professional', desc: 'Polished and business-like' },
  { value: 'Friendly',     label: 'Friendly',     desc: 'Warm and approachable' },
  { value: 'Formal',       label: 'Formal',       desc: 'Authoritative and precise' },
  { value: 'Casual',       label: 'Casual',       desc: 'Relaxed and conversational' },
];

const LENGTHS = [
  { value: 'Short',  label: 'Short',  desc: '1–3 sentences' },
  { value: 'Medium', label: 'Medium', desc: '2–5 sentences' },
  { value: 'Long',   label: 'Long',   desc: 'Detailed & thorough' },
];

const STEP_META = [
  { icon: Building2, label: 'Your Business' },
  { icon: MessageSquare, label: 'What You Do' },
  { icon: Bot, label: 'AI Personality' },
  { icon: BookOpen, label: "AI's Knowledge" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    industry: '',
    businessDescription: '',
    tone: 'Professional',
    responseLength: 'Medium',
    knowledgeBase: '',
  });

  useEffect(() => {
    fetch('/api/create-customer', { method: 'POST' }).catch(() => {});
  }, []);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const isValid = () => {
    if (step === 1) return form.businessName.trim().length > 0 && form.industry.length > 0;
    if (step === 2) return form.businessDescription.trim().length > 0;
    if (step === 3) return form.tone.length > 0 && form.responseLength.length > 0;
    if (step === 4) return true; // knowledge base is optional
    return false;
  };

  const complete = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch (_) {}
    router.push('/dashboard');
  };

  const inputClass = "w-full px-4 py-3 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 text-sm";

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center py-12 px-4">

      {/* Logo / title */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Bot className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome to BizzyBot</h1>
        <p className="text-sm text-gray-500 mt-1">Let's get your AI set up in 4 quick steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_META.map((s, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <div key={num} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                done   ? 'bg-violet-600 text-white' :
                active ? 'bg-violet-500/20 border border-violet-500 text-violet-400' :
                         'bg-gray-800 text-gray-600'
              }`}>
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span className={`text-xs hidden sm:block ${active ? 'text-white' : 'text-gray-600'}`}>{s.label}</span>
              {i < STEP_META.length - 1 && <div className="w-6 h-px bg-gray-800" />}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-[#161B22] border border-gray-800 rounded-2xl p-8">

        {/* Step 1 — Business name + industry */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">What's your business called?</h2>
              <p className="text-sm text-gray-500">Your AI will introduce itself on behalf of this name.</p>
            </div>
            <input
              autoFocus
              placeholder="e.g. Sunrise Plumbing, Dr. Kim Dental, Atlas Marketing"
              value={form.businessName}
              onChange={e => set('businessName', e.target.value)}
              className={inputClass}
            />
            <div>
              <label className="text-sm text-gray-400 block mb-3">What industry are you in?</label>
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    onClick={() => set('industry', ind)}
                    className={`px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                      form.industry === ind
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#0D1117] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >{ind}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Business description */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">What does your business do?</h2>
              <p className="text-sm text-gray-500">This is the single most important thing you can give your AI. The more detail you add, the better it represents you.</p>
            </div>
            <textarea
              autoFocus
              rows={6}
              placeholder={`Describe your services, what makes you different, and who you serve.\n\nExample: "We're a family-run plumbing company serving the Denver metro area. We specialise in emergency repairs, water heater installation, and drain cleaning. Same-day service available. Licensed and insured. We've been in business for 12 years."`}
              value={form.businessDescription}
              onChange={e => set('businessDescription', e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
        )}

        {/* Step 3 — Tone + response length */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">How should your AI speak?</h2>
              <p className="text-sm text-gray-500">You can change this any time in AI Settings.</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-2">Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => set('tone', t.value)}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      form.tone === t.value
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#0D1117] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-2">Response length</label>
              <div className="grid grid-cols-3 gap-2">
                {LENGTHS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => set('responseLength', l.value)}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      form.responseLength === l.value
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#0D1117] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-sm">{l.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Knowledge base */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Give your AI its knowledge</h2>
              <p className="text-sm text-gray-500">Paste in your FAQs, pricing, service areas, hours, policies — anything leads commonly ask about. Your AI will use this to answer questions accurately. <span className="text-gray-600">(Optional — you can add this later in AI Settings)</span></p>
            </div>
            <textarea
              rows={8}
              placeholder={`Example:\n\nPricing: Drain cleaning starts at $149. Emergency call-out fee: $75.\nService area: Denver, Aurora, Lakewood, Englewood.\nHours: Mon–Sat 7am–8pm. Emergency line 24/7.\nResponse time: We aim to arrive within 2 hours for emergencies.\nPayment: Cash, card, and financing available.\n\nFAQ: Do you offer free estimates? Yes, for non-emergency jobs.`}
              value={form.knowledgeBase}
              onChange={e => set('knowledgeBase', e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!isValid()}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isValid()
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={complete}
              disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
            >
              {saving ? 'Setting up…' : 'Launch my AI'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Skip on step 4 */}
        {step === 4 && (
          <p className="text-center mt-4">
            <button
              onClick={complete}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Skip for now — I'll add this later
            </button>
          </p>
        )}
      </div>

      {/* Step counter */}
      <p className="text-xs text-gray-700 mt-6">Step {step} of {TOTAL_STEPS}</p>
    </div>
  );
}
