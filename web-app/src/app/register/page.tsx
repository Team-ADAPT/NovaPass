'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';
import { deriveKeys, generateSalt } from '@/lib/crypto';
import { useVaultStore } from '@/store/vaultStore';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldEllipsis,
  WandSparkles,
} from 'lucide-react';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

type RegisterForm = { username: string; email: string; password: string; confirmPassword: string };

export default function RegisterPage() {
  const router = useRouter();
  const setEncKey = useVaultStore(s => s.setEncKey);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const fieldClassName =
    'w-full rounded-[22px] border border-[rgba(20,32,45,0.1)] bg-white/72 px-4 py-3.5 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition placeholder:text-slate-400 focus:border-emerald-500/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10';
  
  const password = watch('password') || '';
  const confirmPassword = watch('confirmPassword');

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (data.password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const salt = generateSalt();
      const { authKey, encKey, masterKeyHash } = await deriveKeys(data.password, salt);

      const { data: tokens } = await authApi.register({
        username: data.username,
        email: data.email,
        authKey,
        masterKeyHash,
        salt,
      });

      sessionStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      setEncKey(encKey);
      router.push('/vault');
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.error || e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden py-8 sm:py-10">
      <div className="ambient-orb animate-float left-[-40px] top-24 h-72 w-72 bg-[rgba(15,138,114,0.18)]" />
      <div className="ambient-orb animate-float-delay bottom-10 right-[-60px] h-64 w-64 bg-[rgba(240,138,93,0.2)]" />

      <div className="page-frame grid min-h-[calc(100vh-4rem)] items-stretch gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        <section className="glass-panel animate-rise rounded-[32px] p-6 sm:p-8 lg:p-10">
          <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Create vault</p>
              <h1 className="text-4xl text-slate-900 sm:text-5xl">Set up a calmer security workflow.</h1>
              <p className="text-sm leading-6 text-slate-500">
                NovaPass derives your keys locally, encrypts before syncing, and gives you a
                cleaner vault than the usual password spreadsheet.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Username
                </span>
                <input
                  {...register('username', { required: true, minLength: 3 })}
                  placeholder="Choose a handle"
                  className={fieldClassName}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Email
                </span>
                <input
                  {...register('email', { required: true })}
                  type="email"
                  placeholder="you@company.com"
                  className={fieldClassName}
                  required
                />
              </label>
              
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Master password
                </span>
                <div className="relative">
                  <input
                    {...register('password', { required: true, minLength: 12 })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a master password"
                    className={`${fieldClassName} pr-11`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>
              
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Confirm password
                </span>
                <input
                  {...register('confirmPassword', { required: true })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your master password"
                  className={`${fieldClassName} ${
                    confirmPassword && confirmPassword !== password ? 'border-rose-300 focus:ring-rose-500/10' : ''
                  }`}
                  required
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-rose-600">Passwords do not match</p>
                )}
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="rounded-[24px] border border-white/70 bg-white/60 p-4 text-sm leading-6 text-slate-500">
                <p className="font-semibold uppercase tracking-[0.2em] text-slate-600">Important</p>
                <p className="mt-2">
                  Your master password cannot be recovered. NovaPass uses a zero-knowledge model,
                  so only you can decrypt your vault.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || (!!confirmPassword && confirmPassword !== password)}
                className="animate-glow flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Creating account...' : 'Create encrypted vault'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-500">
              <span>Already have an account?</span>
              <Link href="/login" className="font-semibold text-emerald-700 transition hover:text-emerald-800">
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="glass-panel animate-rise relative overflow-hidden rounded-[32px] p-7 sm:p-10">
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                <WandSparkles size={14} className="text-emerald-700" />
                Designed for focus
              </div>

              <div className="max-w-xl space-y-4">
                <h2 className="text-5xl leading-[0.94] text-slate-900 sm:text-6xl">
                  Security that looks intentional, not intimidating.
                </h2>
                <p className="max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                  Password management should feel sharp and confident. This vault keeps the serious
                  security model while presenting it like a modern product instead of a compliance tool.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/70 bg-white/72 p-5">
                <ShieldEllipsis size={18} className="text-emerald-700" />
                <p className="mt-5 text-xl font-semibold text-slate-900">Client-side first</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Vault entries are encrypted before any sync request is sent.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/70 bg-white/72 p-5">
                <KeyRound size={18} className="text-emerald-700" />
                <p className="mt-5 text-xl font-semibold text-slate-900">One master key</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Unlock once, then manage credentials in a single clean space.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/70 bg-white/72 p-5">
                <ArrowRight size={18} className="text-emerald-700" />
                <p className="mt-5 text-xl font-semibold text-slate-900">Ready in seconds</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Registration derives your keys locally and opens the vault immediately.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
