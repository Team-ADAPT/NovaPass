'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVaultStore } from '@/store/vaultStore';
import { authApi, passkeyApi } from '@/lib/api';
import QRCode from 'qrcode';
import { 
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Fingerprint,
  Key,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface TwoFactorSetup {
  secret: string;
  qrCodeUri: string;
}

interface Passkey {
  id: number;
  credentialId: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { encKey } = useVaultStore();
  
  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);
  
  // Passkeys State
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [showPasskeyNameInput, setShowPasskeyNameInput] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');

  useEffect(() => {
    if (!encKey) {
      router.push('/login');
      return;
    }
    loadPasskeys();
  }, [encKey, router]);

  const loadPasskeys = async () => {
    try {
      const { data } = await passkeyApi.list();
      setPasskeys(data.passkeys || []);
    } catch (error) {
      console.error('Failed to load passkeys:', error);
    } finally {
      setPasskeysLoading(false);
    }
  };

  // ============ 2FA Functions ============

  const handleSetup2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const { data } = await authApi.setup2FA();
      setTwoFactorSetup(data);
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.qrCodeUri, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error: any) {
      setTwoFactorError(error.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleConfirm2FA = async () => {
    if (totpCode.length !== 6) {
      setTwoFactorError('Please enter a 6-digit code');
      return;
    }
    
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      await authApi.confirm2FA(totpCode);
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setQrCodeDataUrl(null);
      setTotpCode('');
    } catch (error: any) {
      setTwoFactorError(error.response?.data?.message || 'Invalid code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter your 2FA code to disable:');
    if (!code) return;
    
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      await authApi.disable2FA(code);
      setTwoFactorEnabled(false);
    } catch (error: any) {
      setTwoFactorError(error.response?.data?.message || 'Invalid code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const copySecret = () => {
    if (twoFactorSetup?.secret) {
      navigator.clipboard.writeText(twoFactorSetup.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  // ============ Passkey Functions ============

  const handleRegisterPasskey = async () => {
    if (!window.PublicKeyCredential) {
      setPasskeyError('Passkeys are not supported in this browser');
      return;
    }

    setRegisteringPasskey(true);
    setPasskeyError('');

    try {
      // Step 1: Get registration options from server
      const { data: options } = await passkeyApi.beginRegistration(passkeyName || undefined);

      // Step 2: Create credential using WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64UrlDecode(options.challenge),
          rp: {
            id: options.rp.id,
            name: options.rp.name,
          },
          user: {
            id: base64UrlDecode(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams.map((p: any) => ({
            type: p.type,
            alg: p.alg,
          })),
          timeout: options.timeout,
          attestation: options.attestation as AttestationConveyancePreference,
          authenticatorSelection: options.authenticatorSelection ? {
            authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment as AuthenticatorAttachment,
            requireResidentKey: options.authenticatorSelection.requireResidentKey,
            residentKey: options.authenticatorSelection.residentKey as ResidentKeyRequirement,
            userVerification: options.authenticatorSelection.userVerification as UserVerificationRequirement,
          } : undefined,
          excludeCredentials: options.excludeCredentials?.map((c: any) => ({
            id: base64UrlDecode(c.id),
            type: c.type,
            transports: c.transports,
          })),
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Step 3: Send credential to server
      await passkeyApi.completeRegistration({
        id: credential.id,
        rawId: base64UrlEncode(new Uint8Array(credential.rawId)),
        type: credential.type,
        response: {
          clientDataJSON: base64UrlEncode(new Uint8Array(response.clientDataJSON)),
          attestationObject: base64UrlEncode(new Uint8Array(response.attestationObject)),
          transports: response.getTransports?.() || [],
        },
        passkeyName: passkeyName || undefined,
      });

      // Reload passkeys list
      await loadPasskeys();
      setShowPasskeyNameInput(false);
      setPasskeyName('');
    } catch (error: any) {
      console.error('Passkey registration failed:', error);
      if (error.name === 'NotAllowedError') {
        setPasskeyError('Passkey registration was cancelled');
      } else {
        setPasskeyError(error.response?.data?.message || error.message || 'Failed to register passkey');
      }
    } finally {
      setRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: number) => {
    if (!confirm('Are you sure you want to delete this passkey?')) return;

    try {
      await passkeyApi.delete(passkeyId);
      setPasskeys(passkeys.filter(p => p.id !== passkeyId));
    } catch (error: any) {
      setPasskeyError(error.response?.data?.message || 'Failed to delete passkey');
    }
  };

  // ============ Utility Functions ============

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
    <main className="relative min-h-screen overflow-hidden py-6 sm:py-8">
      <div className="ambient-orb animate-float left-[-50px] top-14 h-72 w-72 bg-[rgba(240,138,93,0.18)]" />
      <div className="ambient-orb animate-float-delay right-[-70px] top-20 h-80 w-80 bg-[rgba(15,138,114,0.16)]" />

      <div className="page-frame flex flex-col gap-5">
        <header className="glass-panel animate-rise rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => router.push('/vault')}
                className="rounded-full border border-[rgba(20,32,45,0.08)] bg-white/70 p-3 text-slate-600 transition hover:bg-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <Sparkles size={14} className="text-emerald-700" />
                  Security controls
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Settings</p>
                  <h1 className="mt-2 text-4xl text-slate-900 sm:text-5xl">Tune how your vault is protected.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                    Manage two-factor authentication, register passkeys, and review the current
                    local security model without leaving the product flow.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">2FA status</p>
                <p className="mt-3 text-2xl text-slate-900">{twoFactorEnabled ? 'Enabled' : 'Optional'}</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Passkeys</p>
                <p className="mt-3 text-2xl text-slate-900">{passkeys.length}</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Encryption</p>
                <p className="mt-3 text-2xl text-slate-900">AES-256-GCM</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel animate-rise rounded-[32px] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-700">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Security</p>
                  <h2 className="mt-2 text-3xl text-slate-900">Two-factor authentication</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Add an authenticator app step to make credential replay significantly harder.
                  </p>
                </div>
              </div>
              {twoFactorEnabled ? (
                <button
                  onClick={handleDisable2FA}
                  disabled={twoFactorLoading}
                  className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  Disable
                </button>
              ) : !twoFactorSetup ? (
                <button
                  onClick={handleSetup2FA}
                  disabled={twoFactorLoading}
                  className="flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {twoFactorLoading && <Loader2 size={14} className="animate-spin" />}
                  Enable
                </button>
              ) : null}
            </div>

            {twoFactorEnabled && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700">
                <Check size={14} />
                Two-factor authentication is enabled
              </div>
            )}

            {twoFactorSetup && qrCodeDataUrl && (
              <div className="mt-6 rounded-[28px] border border-[rgba(20,32,45,0.08)] bg-white/78 p-5">
                <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-start">
                  <div className="rounded-[24px] bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <img src={qrCodeDataUrl} alt="2FA QR Code" className="mx-auto rounded-[18px]" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 1</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Scan the QR code with your authenticator app. If you prefer manual setup,
                        copy the secret below.
                      </p>
                    </div>

                    <div className="rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-slate-950 px-4 py-3 text-white">
                      <div className="flex items-center justify-between gap-3">
                        <code className="truncate font-mono text-sm text-emerald-200">{twoFactorSetup.secret}</code>
                        <button
                          onClick={copySecret}
                          className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
                        >
                          {secretCopied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 2</p>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          value={totpCode}
                          onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="flex-1 rounded-[20px] border border-[rgba(20,32,45,0.08)] bg-white px-4 py-3 text-center text-lg font-mono tracking-[0.35em] text-slate-900 focus:border-emerald-500/35 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                        />
                        <button
                          onClick={handleConfirm2FA}
                          disabled={twoFactorLoading || totpCode.length !== 6}
                          className="flex items-center justify-center gap-2 rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {twoFactorLoading && <Loader2 size={16} className="animate-spin" />}
                          Verify
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTwoFactorSetup(null);
                        setQrCodeDataUrl(null);
                        setTotpCode('');
                      }}
                      className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                    >
                      Cancel setup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {twoFactorError && (
              <div className="mt-4 flex items-center gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={14} />
                {twoFactorError}
              </div>
            )}
          </div>

          <aside className="glass-panel animate-rise rounded-[32px] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-700">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Model</p>
                <h2 className="mt-2 text-3xl text-slate-900">Local vault security</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/70 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Key derivation</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">PBKDF2-SHA256 with 600,000 iterations.</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Vault encryption</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">AES-256-GCM with per-item encrypted payloads.</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Passkey note</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Passkeys can authenticate you, but the vault still needs a local encryption key to decrypt data.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="glass-panel animate-rise rounded-[32px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-700">
                <Fingerprint size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Authentication</p>
                <h2 className="mt-2 text-3xl text-slate-900">Passkeys</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Register device-bound passkeys for fast login with biometrics or your device PIN.
                </p>
              </div>
            </div>
          </div>

          {passkeyError && (
            <div className="mt-5 flex items-center gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle size={14} />
              {passkeyError}
            </div>
          )}

          {passkeysLoading ? (
            <div className="mt-8 flex justify-center py-4">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {passkeys.map(passkey => (
                <div
                  key={passkey.id}
                  className="flex flex-col gap-3 rounded-[24px] border border-[rgba(20,32,45,0.08)] bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-700">
                      <Key size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{passkey.name}</p>
                      <p className="text-sm text-slate-500">
                        Created {new Date(passkey.createdAt).toLocaleDateString()}
                        {passkey.lastUsedAt && ` • Last used ${new Date(passkey.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePasskey(passkey.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              ))}

              {passkeys.length === 0 && !showPasskeyNameInput && (
                <div className="rounded-[24px] border border-dashed border-[rgba(20,32,45,0.14)] bg-white/55 p-6 text-center text-sm text-slate-500">
                  No passkeys registered yet.
                </div>
              )}

              {showPasskeyNameInput ? (
                <div className="rounded-[24px] border border-[rgba(20,32,45,0.08)] bg-white/78 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={passkeyName}
                      onChange={e => setPasskeyName(e.target.value)}
                      placeholder="Passkey name (optional)"
                      className="flex-1 rounded-[20px] border border-[rgba(20,32,45,0.08)] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/35 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                    <button
                      onClick={handleRegisterPasskey}
                      disabled={registeringPasskey}
                      className="flex items-center justify-center gap-2 rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {registeringPasskey && <Loader2 size={14} className="animate-spin" />}
                      Register
                    </button>
                    <button
                      onClick={() => {
                        setShowPasskeyNameInput(false);
                        setPasskeyName('');
                      }}
                      className="rounded-[20px] border border-[rgba(20,32,45,0.08)] bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowPasskeyNameInput(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-[rgba(20,32,45,0.14)] bg-white/55 p-4 text-sm font-semibold text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700"
                >
                  <Plus size={16} />
                  Add a passkey
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
