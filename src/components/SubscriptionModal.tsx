import React, { useState } from 'react';
import { Mail, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Bell } from 'lucide-react';
import { AppLanguage, getTranslation } from '../utils/i18n';

interface SubscriptionModalProps {
  isOpen: boolean;
  onSubscribed: (email: string) => void;
  language?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onSubscribed,
  language = 'en',
  onLanguageChange,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = getTranslation(language);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError(language === 'fr' ? 'Veuillez saisir votre adresse e-mail pour continuer.' : 'Please enter your email address to continue.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError(t.invalidEmailError);
      return;
    }

    setLoading(true);
    // Simulate swift server subscription registration
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      setTimeout(() => {
        onSubscribed(cleanEmail);
      }, 1200);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Decorative Top Accent Banner & Language Switcher */}
        <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Modal Top Bar with French / English switch */}
        {onLanguageChange && (
          <div className="px-6 pt-3 flex justify-end">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onLanguageChange('fr')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  language === 'fr'
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                French
              </button>
              <span className="text-slate-300 text-[10px] px-1 select-none font-bold">/</span>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  language === 'en'
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 pt-4 space-y-6">
          {/* Header Icon & Brand */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
              <Bell className="w-7 h-7 animate-bounce" />
            </div>

            {/* Target requirement titles */}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.stayWithUs}
            </h2>
            <p className="text-sm font-medium text-slate-600">
              {t.subscribeSubtitle}
            </p>
          </div>

          {/* Benefits Callout */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{t.subscriberPerks}</span>
            </div>
            <ul className="space-y-1 text-slate-600 pl-6 list-disc text-[11px]">
              <li>{t.perk1}</li>
              <li>{t.perk2}</li>
              <li>{t.perk3}</li>
            </ul>
          </div>

          {isSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-emerald-900">
                {t.subscriptionConfirmed}
              </div>
              <p className="text-xs text-emerald-700">
                {t.unlockingStudio}
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
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{t.emailAddress} <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">{t.noSpamNotice}</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
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
                    <span>{t.subscribing}</span>
                  </>
                ) : (
                  <>
                    <span>{t.subscribeButton}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.gdprBadge}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
