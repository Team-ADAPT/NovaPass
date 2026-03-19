'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authApi, passkeyApi } from '@/lib/api';
import { deriveKeys } from '@/lib/crypto';
import { useVaultStore } from '@/store/vaultStore';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

type LoginForm = { email: string; password: string; totpCode?: string };

export default function LoginPage() {
  const router = useRouter();
  const setEncKey = useVaultStore(s => s.setEncKey);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [supportsPasskeys, setSupportsPasskeys] = useState(false);
  const { register, handleSubmit, watch } = useForm<LoginForm>();
  const fieldClassName =
    'w-full rounded-[22px] border border-[rgba(20,32,45,0.1)] bg-white/72 px-4 py-3.5 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition placeholder:text-slate-400 focus:border-emerald-500/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10';
  
  const email = watch('email');

  useEffect(() => {
    // Check if passkeys are supported
    setSupportsPasskeys(
      typeof window !== 'undefined' && 
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable === 'function'
    );

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      // 1. Fetch salt for this email
      const { data: saltData } = await authApi.getSalt(data.email);

      // 2. Derive authKey + encKey from master password + salt (all client-side)
      const { authKey, encKey } = await deriveKeys(data.password, saltData.salt);

      // 3. Authenticate with server using authKey (NOT the raw password)
      const { data: tokens } = await authApi.login({
        email: data.email,
        authKey,
        totpCode: data.totpCode,
      });

      if (tokens.requiresTwoFactor) {
        setNeeds2FA(true);
        setLoading(false);
        return;
      }

      // 4. Store tokens; keep encKey only in memory (never persisted)
      sessionStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      setEncKey(encKey);

      router.push('/vault');
    } catch (e: any) {
      if (e.response?.status === 404) {
        setError('No account found with this email');
      } else {
        setError(e.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!supportsPasskeys) {
      setError('Passkeys are not supported in this browser');
      return;
    }

    setPasskeyLoading(true);
    setError('');

    try {
      // 1. Get authentication options from server
      const { data: options } = await passkeyApi.beginLogin(email || undefined);

      // 2. Create credential request
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: base64UrlDecode(options.challenge),
          timeout: options.timeout,
          rpId: options.rpId,
          allowCredentials: options.allowCredentials?.map((c: any) => ({
            id: base64UrlDecode(c.id),
            type: c.type,
            transports: c.transports,
          })),
          userVerification: options.userVerification as UserVerificationRequirement,
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No credential returned');
      }

      const response = credential.response as AuthenticatorAssertionResponse;

      // 3. Send assertion to server
      const { data: tokens } = await passkeyApi.completeLogin({
        id: credential.id,
        rawId: base64UrlEncode(new Uint8Array(credential.rawId)),
        type: credential.type,
        response: {
          clientDataJSON: base64UrlEncode(new Uint8Array(response.clientDataJSON)),
          authenticatorData: base64UrlEncode(new Uint8Array(response.authenticatorData)),
          signature: base64UrlEncode(new Uint8Array(response.signature)),
          userHandle: response.userHandle 
            ? base64UrlEncode(new Uint8Array(response.userHandle)) 
            : undefined,
        },
      });

      // 4. Store tokens
      // Note: With passkey login, we don't have the master password to derive encKey
      // The vault will need to be re-encrypted with a different key or user needs to enter password
      sessionStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // For passkey login, redirect to a page that asks for master password to decrypt vault
      // Or implement a different key management strategy
      router.push('/vault?passkey=true');
    } catch (e: any) {
      console.error('Passkey login failed:', e);
      if (e.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled');
      } else {
        setError(e.response?.data?.message || 'Passkey login failed');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Utility functions for base64url encoding/decoding
  function base64UrlDecode(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(paddedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function base64UrlEncode(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  return (
    <main className="relative min-h-screen overflow-hidden py-8 sm:py-10">
      <div className="ambient-orb animate-float left-[-80px] top-10 h-56 w-56 bg-[rgba(240,138,93,0.24)]" />
      <div className="ambient-orb animate-float-delay right-[-40px] top-28 h-72 w-72 bg-[rgba(15,138,114,0.2)]" />

      <div className="page-frame grid min-h-[calc(100vh-4rem)] items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-panel animate-rise relative flex overflow-hidden rounded-[32px] p-7 sm:p-10">
          <div className="relative z-10 flex w-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                <Sparkles size={14} className="text-emerald-700" />
                Encrypted by design
              </div>

              <div className="max-w-xl space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.32em] text-slate-500">
                  NovaPass
                </p>
                <h1 className="text-5xl leading-[0.94] text-slate-900 sm:text-6xl">
                  Unlock your vault without leaking what matters.
                </h1>
                <p className="max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                  Modern password management with client-side encryption, fast access, and a calmer
                  security workflow than the usual enterprise dashboard clutter.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[26px] border border-white/70 bg-white/70 p-5">
                <ShieldCheck size={18} className="text-emerald-700" />
                <p className="mt-5 text-2xl font-semibold text-slate-900">Zero-knowledge</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Encryption keys stay with you, not the server.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/70 p-5">
                <Fingerprint size={18} className="text-emerald-700" />
                <p className="mt-5 text-2xl font-semibold text-slate-900">Passkey ready</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in with a biometric or device PIN when available.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/70 p-5">
                <WandSparkles size={18} className="text-emerald-700" />
                <p className="mt-5 text-2xl font-semibold text-slate-900">Quietly powerful</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Cleaner visuals, same serious security model underneath.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel animate-rise rounded-[32px] p-6 sm:p-8 lg:p-10">
          <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Welcome back</p>
              <h2 className="text-4xl text-slate-900">Sign in to your vault</h2>
              <p className="text-sm leading-6 text-slate-500">
                Your master password never leaves this device. Unlocking may take a brief moment
                while your keys are derived locally.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Email
                </span>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@company.com"
                  className={fieldClassName}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Master password
                </span>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Enter your master password"
                  className={fieldClassName}
                  required
                />
              </label>

              {needs2FA && (
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Authenticator code
                  </span>
                  <input
                    {...register('totpCode')}
                    maxLength={6}
                    placeholder="6-digit code"
                    className={`${fieldClassName} text-center font-mono tracking-[0.35em]`}
                  />
                </label>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="animate-glow flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Unlocking vault...' : needs2FA ? 'Verify authenticator' : 'Unlock vault'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {supportsPasskeys && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[rgba(20,32,45,0.08)]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="rounded-full bg-[var(--bg)] px-3 py-1 text-slate-500">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/72 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passkeyLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Fingerprint size={18} />
                  )}
                  {passkeyLoading ? 'Authenticating...' : 'Sign in with passkey'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-500">
              <span>No account yet?</span>
              <Link href="/register" className="font-semibold text-emerald-700 transition hover:text-emerald-800">
                Create one
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
