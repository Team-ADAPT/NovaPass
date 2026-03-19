'use client';

interface PasswordStrengthMeterProps {
  password: string;
}

interface StrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
  feedback: string[];
}

function calculateStrength(password: string): StrengthResult {
  if (!password) {
    return { score: 0, label: 'None', color: 'bg-gray-200', feedback: [] };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character type checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const charTypes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (charTypes >= 3) score++;
  if (charTypes === 4) score++;

  // Entropy calculation (simplified)
  const charsetSize = 
    (hasLower ? 26 : 0) +
    (hasUpper ? 26 : 0) +
    (hasDigit ? 10 : 0) +
    (hasSymbol ? 32 : 0);
  
  const entropy = Math.log2(Math.pow(charsetSize || 1, password.length));
  if (entropy > 60) score++;
  if (entropy > 80) score++;

  // Common patterns to avoid
  const commonPatterns = [
    /^(.)\1+$/,           // Repeated characters
    /^(012|123|234|345|456|567|678|789)+$/,  // Sequential numbers
    /^(abc|bcd|cde|def|efg)+$/i,             // Sequential letters
    /password/i,
    /qwerty/i,
    /admin/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 2);
      break;
    }
  }

  // Normalize score to 0-4
  score = Math.min(4, Math.max(0, Math.floor(score / 2)));

  // Generate feedback
  if (password.length < 12) feedback.push('Use at least 12 characters');
  if (!hasUpper) feedback.push('Add uppercase letters');
  if (!hasLower) feedback.push('Add lowercase letters');
  if (!hasDigit) feedback.push('Add numbers');
  if (!hasSymbol) feedback.push('Add special characters');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500'
  ];

  return {
    score,
    label: labels[score],
    color: colors[score],
    feedback: feedback.slice(0, 2) // Show max 2 suggestions
  };
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = calculateStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength.score ? strength.color : 'bg-[rgba(20,32,45,0.08)]'
            }`}
          />
        ))}
      </div>
      
      {password && (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className={`font-semibold uppercase tracking-[0.2em] ${
            strength.score <= 1 ? 'text-rose-500' :
            strength.score === 2 ? 'text-amber-600' :
            'text-emerald-700'
          }`}>
            {strength.label}
          </span>
          {strength.feedback.length > 0 && (
            <span className="truncate text-slate-400">
              {strength.feedback[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Export the calculation function for use elsewhere
export { calculateStrength };
export type { StrengthResult };
