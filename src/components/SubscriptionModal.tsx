import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Sparkles, Lock, ArrowRight, ShieldCheck, Bell } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onSubscribed: (email: string, name: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onSubscribed }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter a valid email address to continue.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email format (e.g., user@example.com).');
      return;
    }

    setLoading(true);
    // Simulate swift server subscription registration
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      setTimeout(() => {
        onSubscribed(cleanEmail, name.trim());
      }, 1200);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Decorative Top Accent Banner */}
        <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Icon & Brand */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
              <Bell className="w-7 h-7 animate-bounce" />
            </div>

            {/* Target requirement titles */}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Stay with us !
            </h2>
            <p className="text-sm font-medium text-slate-600">
              subscribe to us and get the last update.
            </p>
          </div>

          {/* Benefits Callout */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Subscriber Member Privileges:</span>
            </div>
            <ul className="space-y-1 text-slate-600 pl-6 list-disc text-[11px]">
              <li>Unlimited Excel formula & dashboard generation</li>
              <li>GDPR & PII data masking toolkits</li>
              <li>Priority access to future BI visual templates</li>
            </ul>
          </div>

          {isSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-emerald-900">
                Subscription Confirmed!
              </div>
              <p className="text-xs text-emerald-700">
                Welcome aboard! Unlocking your dashboard studio now...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Email Address <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">We never share your email</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe & Unlock Website App</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>GDPR compliant · Free forever · Instant unlock</span>
          </div>
        </div>
      </div>
    </div>
  );
};
