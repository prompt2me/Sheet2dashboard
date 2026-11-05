import { PiiType, PiiRedactionMethod, ColumnProfile } from '../types/dashboard';

/**
 * Fast deterministic hash for GDPR pseudonymization
 * Generates consistent, readable tokens like `anon_a1b2c3d4`
 */
export function generateDeterministicPiiHash(val: string, salt = 'GDPR_ANON'): string {
  if (!val) return '';
  const str = `${salt}:${val.trim().toLowerCase()}`;
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 ^= ch;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 = Math.imul(hash2 ^ ch, 0x5bd1e995);
  }

  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `anon_${h1.slice(0, 4)}${h2.slice(0, 4)}`;
}

/**
 * Mask sensitive string based on detected PII category
 */
export function maskPiiString(val: string, piiType?: PiiType): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.length === 0) return '';

  // Email masking: s***s@domain.com
  if (piiType === 'email' || (clean.includes('@') && clean.includes('.'))) {
    const parts = clean.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const domain = parts[1];
      if (name.length <= 2) {
        return `${name[0]}*@${domain}`;
      }
      return `${name[0]}${'*'.repeat(Math.max(2, name.length - 2))}${name[name.length - 1]}@${domain}`;
    }
  }

  // Phone masking: ***-***-1234
  if (piiType === 'phone' || /^[\d\s+().-]{7,}$/.test(clean)) {
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 4) {
      const last4 = digits.slice(-4);
      return `***-***-${last4}`;
    }
    return '***-***-****';
  }

  // Personal Name masking: Sarah Jenkins -> S**** J******
  if (piiType === 'name' || piiType === 'custom') {
    const words = clean.split(/\s+/);
    if (words.length > 1) {
      return words
        .map((w) => {
          if (w.length <= 1) return w;
          return `${w[0]}${'*'.repeat(Math.max(2, w.length - 1))}`;
        })
        .join(' ');
    }
    return `${clean[0]}${'*'.repeat(Math.max(3, clean.length - 1))}`;
  }

  // Address masking: *** Main St, Suite 4
  if (piiType === 'address') {
    const words = clean.split(/\s+/);
    if (words.length > 2) {
      return `*** ${words.slice(1).join(' ')}`;
    }
    return `*** ${clean}`;
  }

  // Identification / SSN / Tax ID: ***-**-1234
  if (piiType === 'id' || piiType === 'financial') {
    if (clean.length > 4) {
      return `****-****-${clean.slice(-4)}`;
    }
    return '****-****-****';
  }

  // Generic fallback masking
  if (clean.length <= 2) return '**';
  return `${clean[0]}${'*'.repeat(clean.length - 2)}${clean[clean.length - 1]}`;
}

/**
 * Apply selected redaction method to a cell value
 */
export function redactCellValue(
  value: any,
  method: PiiRedactionMethod = 'mask',
  piiType?: PiiType
): any {
  if (value === null || value === undefined || value === '') {
    return value;
  }
  if (method === 'none') {
    return value;
  }
  const strVal = String(value);

  switch (method) {
    case 'mask':
      return maskPiiString(strVal, piiType);
    case 'hash':
      return generateDeterministicPiiHash(strVal);
    case 'redact_label':
      return '[REDACTED PII]';
    default:
      return maskPiiString(strVal, piiType);
  }
}

/**
 * Detect if a column likely contains PII based on name patterns and sample values
 */
export function detectPiiColumn(
  name: string,
  sampleValues: (string | number | boolean | null)[]
): { isPII: boolean; piiType?: PiiType } {
  const lowerName = name.toLowerCase().replace(/[_\s-]+/g, '_');

  // 1. Email check
  if (
    lowerName.includes('email') ||
    lowerName.includes('e_mail') ||
    lowerName.includes('mail_address')
  ) {
    return { isPII: true, piiType: 'email' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailMatchCount = sampleValues.filter(
    (v) => typeof v === 'string' && emailRegex.test(v.trim())
  ).length;
  if (emailMatchCount > 0 && emailMatchCount >= sampleValues.length * 0.4) {
    return { isPII: true, piiType: 'email' };
  }

  // 2. Phone check
  if (
    lowerName.includes('phone') ||
    lowerName.includes('mobile') ||
    lowerName.includes('telephone') ||
    lowerName.includes('cell_phone') ||
    lowerName.includes('contact_number')
  ) {
    return { isPII: true, piiType: 'phone' };
  }

  // 3. Name check (Personal Identifiable Information)
  if (
    lowerName === 'name' ||
    lowerName.includes('full_name') ||
    lowerName.includes('first_name') ||
    lowerName.includes('last_name') ||
    lowerName.includes('contact_name') ||
    lowerName.includes('customer_name') ||
    lowerName.includes('client_name') ||
    lowerName.includes('patient_name') ||
    lowerName.includes('employee_name') ||
    lowerName.includes('sales_rep') ||
    lowerName.includes('rep_name') ||
    lowerName.includes('user_name') ||
    lowerName.includes('person')
  ) {
    return { isPII: true, piiType: 'name' };
  }

  // 4. Address check
  if (
    lowerName.includes('address') ||
    lowerName.includes('street') ||
    lowerName.includes('zip_code') ||
    lowerName.includes('postal_code')
  ) {
    return { isPII: true, piiType: 'address' };
  }

  // 5. Government / National ID check
  if (
    lowerName.includes('ssn') ||
    lowerName.includes('social_security') ||
    lowerName.includes('passport') ||
    lowerName.includes('tax_id') ||
    lowerName.includes('national_id')
  ) {
    return { isPII: true, piiType: 'id' };
  }

  // 6. Financial identifier check
  if (
    lowerName.includes('credit_card') ||
    lowerName.includes('card_number') ||
    lowerName.includes('iban') ||
    lowerName.includes('bank_account') ||
    lowerName.includes('account_no')
  ) {
    return { isPII: true, piiType: 'financial' };
  }

  return { isPII: false };
}
