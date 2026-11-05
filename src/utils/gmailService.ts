/**
 * Gmail API Client Service for Sheet2Dashboard
 * Sends subscriber notifications and digests on behalf of authenticated user
 */

export interface SubscriberRecord {
  id: string;
  name: string;
  email: string;
  timestamp: string;
  userAgent?: string;
  sentToGmail?: boolean;
}

/**
 * Encode string to base64url (RFC 4648)
 */
function toBase64Url(str: string): string {
  // Use TextEncoder to safely handle all UTF-8 characters
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email via the Gmail API
 */
export async function sendGmailMessage(params: {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const { accessToken, to, subject, htmlBody, fromName = 'Sheet2Dashboard Alerts' } = params;

  const rawMime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    `X-Mailer: Sheet2Dashboard Notifications Engine`,
    '',
    htmlBody,
  ].join('\r\n');

  const base64UrlMessage = toBase64Url(rawMime);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64UrlMessage,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    const errorMsg =
      errorJson?.error?.message || `Gmail API responded with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return await response.json();
}

/**
 * Format email template for single or batch subscriber notification
 */
export function buildSubscriberEmailHtml(subscribers: SubscriberRecord[], recipientEmail: string): string {
  const isMultiple = subscribers.length > 1;
  const count = subscribers.length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%); padding: 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #dbeafe; color: #1e40af; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { background-color: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sheet2Dashboard · Subscriber Notification</h1>
      <p>${isMultiple ? `${count} new subscribers registered` : 'A new user subscribed to your web app'}</p>
    </div>
    <div class="content">
      <div class="badge">GDPR Compliant · Direct Sync</div>
      <p style="font-size: 14px; margin-top: 0;">
        Hello, here are the latest subscriber details sent directly to your connected Gmail account (<strong>${recipientEmail}</strong>):
      </p>

      <table>
        <thead>
          <tr>
            <th>Subscriber Name</th>
            <th>Email Address</th>
            <th>Registered At</th>
          </tr>
        </thead>
        <tbody>
          ${subscribers
            .map(
              (s) => `
            <tr>
              <td style="font-weight: 600; color: #0f172a;">${s.name || '<em style="color:#94a3b8">Not specified</em>'}</td>
              <td><a href="mailto:${s.email}" style="color: #2563eb; text-decoration: none;">${s.email}</a></td>
              <td style="color: #64748b; font-size: 12px;">${new Date(s.timestamp).toLocaleString()}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div style="margin-top: 24px; padding: 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe; font-size: 12px; color: #1e40af;">
        <strong>Subscriber Perks Granted:</strong> Full access to Excel dashboard export, OpenXML native charts, and automated GDPR PII redaction suite.
      </div>
    </div>
    <div class="footer">
      This automated alert was dispatched via your connected Google Account using the Gmail API.<br>
      Sheet2Dashboard · Formula-Driven Excel Analytics
    </div>
  </div>
</body>
</html>
  `.trim();
}
