import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
  UserCheck,
  ShieldCheck,
  Clock,
  Sparkles,
  RefreshCw,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { googleSignIn, logout, getAccessToken, getCurrentUser, initAuth } from '../utils/firebaseAuth';
import { sendGmailMessage, buildSubscriberEmailHtml, SubscriberRecord } from '../utils/gmailService';
import { User } from 'firebase/auth';

interface GmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscribers: SubscriberRecord[];
  onSubscribersUpdated: (updated: SubscriberRecord[]) => void;
  defaultRecipientEmail?: string;
}

export const GmailIntegrationModal: React.FC<GmailIntegrationModalProps> = ({
  isOpen,
  onClose,
  subscribers,
  onSubscribersUpdated,
  defaultRecipientEmail = 'ai.seo.kh@gmail.com',
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Target recipient email (defaults to user prompt email ai.seo.kh@gmail.com or connected email)
  const [recipientEmail, setRecipientEmail] = useState<string>(
    localStorage.getItem('sheet2dashboard_gmail_recipient') || defaultRecipientEmail
  );

  // Auto-send toggle
  const [autoSendEnabled, setAutoSendEnabled] = useState<boolean>(
    localStorage.getItem('sheet2dashboard_auto_email_subscribers') === 'true'
  );

  // Sending state
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string>('');
  const [sendErrorMessage, setSendErrorMessage] = useState<string>('');

  // Confirmation dialog state (MANDATORY per Workspace Integration Skill)
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [selectedSubscribersToSend, setSelectedSubscribersToSend] = useState<SubscriberRecord[]>([]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(Boolean(token));
        if (user.email && !recipientEmail) {
          setRecipientEmail(user.email);
        }
      },
      () => {
        setCurrentUser(null);
        setHasToken(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthError('');
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        if (!recipientEmail && res.user.email) {
          setRecipientEmail(res.user.email);
          localStorage.setItem('sheet2dashboard_gmail_recipient', res.user.email);
        }
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setAuthError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setHasToken(false);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleRecipientChange = (newEmail: string) => {
    setRecipientEmail(newEmail);
    localStorage.setItem('sheet2dashboard_gmail_recipient', newEmail);
  };

  const handleToggleAutoSend = (enabled: boolean) => {
    setAutoSendEnabled(enabled);
    localStorage.setItem('sheet2dashboard_auto_email_subscribers', enabled ? 'true' : 'false');
  };

  // Trigger confirmation before sending
  const handleInitiateSend = (itemsToSend?: SubscriberRecord[]) => {
    setSendSuccessMessage('');
    setSendErrorMessage('');

    const targetList = itemsToSend && itemsToSend.length > 0 ? itemsToSend : subscribers;
    if (targetList.length === 0) {
      setSendErrorMessage('No subscriber records available to send.');
      return;
    }

    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      setSendErrorMessage('Please provide a valid destination Gmail address.');
      return;
    }

    setSelectedSubscribersToSend(targetList);
    setShowConfirmDialog(true);
  };

  // Perform confirmed send via Gmail API
  const handleConfirmedSend = async () => {
    setShowConfirmDialog(false);
    setIsSending(true);
    setSendErrorMessage('');
    setSendSuccessMessage('');

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Active Google OAuth session token missing. Please sign in with Google.');
      }

      const subject =
        selectedSubscribersToSend.length === 1
          ? `[Sheet2Dashboard] New Subscriber: ${selectedSubscribersToSend[0].name || 'User'} (${selectedSubscribersToSend[0].email})`
          : `[Sheet2Dashboard] Subscriber Digest: ${selectedSubscribersToSend.length} Sign-ups`;

      const htmlBody = buildSubscriberEmailHtml(selectedSubscribersToSend, recipientEmail.trim());

      const result = await sendGmailMessage({
        accessToken: token,
        to: recipientEmail.trim(),
        subject,
        htmlBody,
      });

      // Mark sent in subscriber list
      const sentIds = new Set(selectedSubscribersToSend.map((s) => s.id));
      const updated = subscribers.map((s) => (sentIds.has(s.id) ? { ...s, sentToGmail: true } : s));
      onSubscribersUpdated(updated);
      localStorage.setItem('sheet2dashboard_subscribers', JSON.stringify(updated));

      setSendSuccessMessage(
        `Successfully sent email to ${recipientEmail.trim()} via Gmail API (Message ID: ${result.id.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Failed to send via Gmail API:', err);
      setSendErrorMessage(err.message || 'Failed to dispatch email via Gmail API.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Mail className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Gmail Subscriber Sync</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-semibold">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Connect your Gmail account to receive subscriber names and emails automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status / Feedback Alerts */}
          {sendSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{sendSuccessMessage}</span>
            </div>
          )}

          {sendErrorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{sendErrorMessage}</span>
            </div>
          )}

          {authError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Section 1: Google Account Connection */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. Google Account Connection
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Scope: <code className="font-mono text-blue-600 bg-blue-50 px-1 rounded">gmail.send</code>
              </span>
            </div>

            {hasToken && currentUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-10 h-10 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {currentUser.displayName ? currentUser.displayName[0] : 'G'}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                      <span>{currentUser.displayName || 'Connected Google Account'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{currentUser.email}</div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center sm:text-left">
                <p className="text-xs text-slate-600">
                  Authorize your Google account to permit Sheet2Dashboard to send subscriber alerts to your inbox.
                </p>

                {/* Official Material Google Sign-In Button */}
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  )}
                  <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Delivery Destination & Settings */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. Delivery Destination & Auto-Forwarding
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Destination Email Address:
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  placeholder="e.g., ai.seo.kh@gmail.com"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  Subscribers' names and emails will be delivered here.
                </p>
              </div>

              <div className="space-y-1 flex flex-col justify-center">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={autoSendEnabled}
                    onChange={(e) => handleToggleAutoSend(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Auto-send instant alert on every new sign-up</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  When enabled, any visitor submitting the subscription form triggers an immediate Gmail alert.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Collected Subscribers Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  3. Registered Subscribers ({subscribers.length})
                </span>
                <p className="text-[11px] text-slate-500">
                  List of users who completed the subscription modal on this web app.
                </p>
              </div>

              <button
                disabled={!hasToken || isSending || subscribers.length === 0}
                onClick={() => handleInitiateSend(subscribers)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send All ({subscribers.length}) to My Gmail</span>
              </button>
            </div>

            {subscribers.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">No subscribers recorded yet</div>
                <p className="text-[11px] text-slate-500">
                  Visitors who subscribe via the "Stay with us !" pop-up modal will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Subscriber Name</th>
                      <th className="py-2 px-3">Email Address</th>
                      <th className="py-2 px-3">Subscribed At</th>
                      <th className="py-2 px-3">Gmail Status</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {sub.name || <span className="text-slate-400 font-normal italic">None</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700">{sub.email}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {new Date(sub.timestamp).toLocaleDateString()} {new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-3">
                          {sub.sentToGmail ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            disabled={!hasToken || isSending}
                            onClick={() => handleInitiateSend([sub])}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer disabled:opacity-40"
                          >
                            Send Alert
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>OAuth Token held in volatile memory only · Workspace Certified</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog (Workspace Integration Skill Requirement) */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
              <Mail className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                Confirm Gmail Email Dispatch
              </h4>
              <p className="text-xs text-slate-600">
                Send {selectedSubscribersToSend.length} subscriber record(s) to{' '}
                <strong className="text-slate-900 font-mono">{recipientEmail.trim()}</strong>?
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-200 space-y-1.5">
              <div className="font-semibold text-slate-700">Message Overview:</div>
              <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1">
                <li>From: Connected Google Account ({currentUser?.email || 'You'})</li>
                <li>To: {recipientEmail.trim()}</li>
                <li>Content: Formatted HTML table with names, emails, and registration timestamps</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedSend}
                disabled={isSending}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
