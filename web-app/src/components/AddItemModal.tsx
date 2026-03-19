'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useVaultStore } from '@/store/vaultStore';
import {
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Globe,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sliders,
  ScanFace,
  X,
} from 'lucide-react';
import PasswordStrengthMeter from './PasswordStrengthMeter';

type FormData = {
  itemType: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  totpSecret: string;
  passkeyUsername: string;
  passkeyProvider: string;
};

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

function generatePassword(options: PasswordOptions): string {
  let chars = '';
  if (options.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (options.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.numbers) chars += '0123456789';
  if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (chars === '') chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  const arr = crypto.getRandomValues(new Uint8Array(options.length));
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

export default function AddItemModal({ onClose }: { onClose: () => void }) {
  const { addItem } = useVaultStore();
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: { itemType: 'login' }
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordOptions, setShowPasswordOptions] = useState(false);
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  
  const itemType = watch('itemType');
  const password = watch('password') || '';
  const fieldClassName =
    'w-full rounded-[20px] border border-[rgba(20,32,45,0.08)] bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500/35 focus:outline-none focus:ring-4 focus:ring-emerald-500/10';

  const handleGeneratePassword = () => {
    setValue('password', generatePassword(passwordOptions));
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await addItem({
        itemType: data.itemType,
        title: data.title,
        url: data.url,
        favorite: false,
        username: data.username,
        password: data.password,
        notes: data.notes,
        totpSecret: data.totpSecret,
        passkeyUsername: data.passkeyUsername,
        passkeyProvider: data.passkeyProvider,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="glass-panel animate-rise w-full max-w-2xl rounded-[32px] p-5 sm:p-7 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Create item</p>
            <h2 className="mt-2 text-3xl text-slate-900">Add something worth protecting</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              NovaPass encrypts the sensitive fields locally, then stores only ciphertext on the server.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[rgba(20,32,45,0.08)] bg-white/70 p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Item type
              </span>
              <select {...register('itemType')} className={fieldClassName}>
                <option value="login">Login</option>
                <option value="card">Card</option>
                <option value="note">Secure Note</option>
                <option value="totp">2FA / TOTP</option>
                <option value="passkey">Passkey</option>
              </select>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Title
              </span>
              <input
                {...register('title')}
                placeholder="Netflix, company card, SSH key..."
                required
                className={fieldClassName}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              {itemType === 'login' && (
                <>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Website
                    </span>
                    <div className="relative">
                      <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...register('url')}
                        placeholder="https://example.com"
                        className={`${fieldClassName} pl-11`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Username or email
                    </span>
                    <input
                      {...register('username')}
                      placeholder="name@company.com"
                      className={fieldClassName}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Password
                    </span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          {...register('password')}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Paste or generate a password"
                          className={`${fieldClassName} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="rounded-[20px] border border-[rgba(20,32,45,0.08)] bg-white/80 px-4 py-3 text-slate-600 transition hover:bg-white"
                        title="Generate password"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPasswordOptions(v => !v)}
                        className={`rounded-[20px] border border-[rgba(20,32,45,0.08)] px-4 py-3 text-slate-600 transition hover:bg-white ${
                          showPasswordOptions ? 'bg-white' : 'bg-white/80'
                        }`}
                        title="Password options"
                      >
                        <Sliders size={15} />
                      </button>
                    </div>

                    <PasswordStrengthMeter password={password} />
                    
                    {showPasswordOptions && (
                      <div className="rounded-[24px] border border-[rgba(20,32,45,0.08)] bg-white/75 p-4 space-y-3">
                        <div>
                          <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Length
                            <span className="text-slate-700">{passwordOptions.length}</span>
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="64"
                            value={passwordOptions.length}
                            onChange={e => setPasswordOptions(o => ({ ...o, length: parseInt(e.target.value, 10) }))}
                            className="w-full accent-emerald-700"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          {[
                            { key: 'uppercase', label: 'Uppercase' },
                            { key: 'lowercase', label: 'Lowercase' },
                            { key: 'numbers', label: 'Numbers' },
                            { key: 'symbols', label: 'Symbols' },
                          ].map(opt => (
                            <label key={opt.key} className="flex items-center gap-2 rounded-full bg-[rgba(20,32,45,0.04)] px-3 py-2">
                              <input
                                type="checkbox"
                                checked={passwordOptions[opt.key as keyof PasswordOptions] as boolean}
                                onChange={e => setPasswordOptions(o => ({ ...o, [opt.key]: e.target.checked }))}
                                className="accent-emerald-700"
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {itemType === 'card' && (
                <div className="rounded-[24px] border border-[rgba(20,32,45,0.08)] bg-white/75 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-700">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Card item</p>
                      <p className="text-sm text-slate-500">
                        Use notes for issuer details, reference numbers, or recovery instructions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {itemType === 'note' && (
                <div className="rounded-[24px] border border-[rgba(20,32,45,0.08)] bg-white/75 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-700">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Secure note</p>
                      <p className="text-sm text-slate-500">
                        Store recovery phrases, internal codes, or operational notes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {itemType === 'totp' && (
                <>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Website
                    </span>
                    <div className="relative">
                      <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...register('url')}
                        placeholder="https://example.com"
                        className={`${fieldClassName} pl-11`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      TOTP Secret Key
                    </span>
                    <input
                      {...register('totpSecret')}
                      placeholder="Base32 secret from the site (e.g. JBSWY3DPEHPK3PXP)"
                      required
                      className={fieldClassName}
                    />
                    <p className="text-xs text-slate-400">
                      Scan the QR code with any authenticator app and copy the secret, or enter it directly from the site's 2FA setup page.
                    </p>
                  </div>
                </>
              )}

              {itemType === 'passkey' && (
                <>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Website
                    </span>
                    <div className="relative">
                      <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        {...register('url')}
                        placeholder="https://example.com"
                        className={`${fieldClassName} pl-11`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Account / Username
                    </span>
                    <input
                      {...register('passkeyUsername')}
                      placeholder="name@example.com"
                      className={fieldClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Passkey Provider
                    </span>
                    <select {...register('passkeyProvider')} className={fieldClassName}>
                      <option value="">Select provider...</option>
                      <option value="Google">Google Passkey</option>
                      <option value="Apple">Apple Passkey (Face ID / Touch ID)</option>
                      <option value="Microsoft">Microsoft Passkey</option>
                      <option value="Hardware Key">Hardware Key (YubiKey etc.)</option>
                      <option value="Other">Other</option>
                    </select>
                    <p className="text-xs text-slate-400">
                      This records which device/provider holds the passkey credential for reference.
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Notes
                </span>
                <textarea
                  {...register('notes')}
                  placeholder="Anything you want encrypted with this item"
                  rows={5}
                  className={`${fieldClassName} resize-none`}
                />
              </div>
            </div>

            <aside className="rounded-[28px] border border-[rgba(20,32,45,0.08)] bg-white/72 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-700">
                  {itemType === 'login' ? <KeyRound size={16} /> : itemType === 'card' ? <CreditCard size={16} /> : itemType === 'totp' ? <ShieldCheck size={16} /> : itemType === 'passkey' ? <ScanFace size={16} /> : <FileText size={16} />}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Preview</p>
                  <p className="text-sm text-slate-500">A clean summary before encryption.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-500">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Type</p>
                  <p className="mt-2 text-base font-medium text-slate-900 capitalize">{itemType}</p>
                </div>
                {itemType === 'login' && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Password preview</p>
                    <p className="mt-2 rounded-[18px] bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-200">
                      {password || 'No password generated yet'}
                    </p>
                  </div>
                )}
                <div className="rounded-[22px] bg-[rgba(15,138,114,0.08)] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={16} className="mt-0.5 text-emerald-700" />
                    <p className="leading-6 text-slate-600">
                      Sensitive fields are encrypted locally in the browser before sync.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[20px] border border-[rgba(20,32,45,0.08)] bg-white/80 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Encrypting and saving...' : 'Save encrypted item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
