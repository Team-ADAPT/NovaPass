'use client';

import { useState, useEffect } from 'react';
import { VaultEntry, useVaultStore } from '@/store/vaultStore';
import { Check, Copy, Eye, EyeOff, Fingerprint, Globe, Heart, Pencil, ScanFace, ShieldCheck, StickyNote, Trash2 } from 'lucide-react';
import { generateTOTP, totpSecondsRemaining } from '@/lib/totp';

interface VaultItemCardProps {
  item: VaultEntry;
  onEdit?: (item: VaultEntry) => void;
}

function TotpDisplay({ secret }: { secret: string }) {
  const [code, setCode] = useState('------');
  const [seconds, setSeconds] = useState(totpSecondsRemaining());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let lastWindow = Math.floor(Date.now() / 1000 / 30);

    const refresh = async () => {
      const c = await generateTOTP(secret);
      if (active) setCode(c);
    };
    refresh();

    const interval = setInterval(() => {
      const s = totpSecondsRemaining();
      if (active) setSeconds(s);
      const currentWindow = Math.floor(Date.now() / 1000 / 30);
      if (currentWindow !== lastWindow) {
        lastWindow = currentWindow;
        refresh();
      }
    }, 500); // poll at 500ms so we never miss a window flip

    return () => { active = false; clearInterval(interval); };
  }, [secret]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const urgent = seconds <= 5;

  return (
    <div className="mt-3 rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-slate-950 px-4 py-3 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">2FA Code</p>
          <span className={`mt-2 block font-mono text-2xl font-bold tracking-[0.3em] ${urgent ? 'text-rose-300' : 'text-emerald-200'}`}>
            {code.slice(0, 3)} {code.slice(3)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={`text-xs font-semibold tabular-nums ${urgent ? 'text-rose-400' : 'text-slate-400'}`}>
            {seconds}s
          </div>
          <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
            <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="16" cy="16" r="13" fill="none"
              stroke={urgent ? '#fca5a5' : '#6ee7b7'}
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 13}`}
              strokeDashoffset={`${2 * Math.PI * 13 * (1 - seconds / 30)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <button
            onClick={handleCopy}
            className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VaultItemCard({ item, onEdit }: VaultItemCardProps) {
  const { deleteItem, updateItem } = useVaultStore();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeLabel =
    item.itemType === 'login' ? 'Login' :
    item.itemType === 'card' ? 'Card' :
    item.itemType === 'totp' ? '2FA / TOTP' :
    item.itemType === 'passkey' ? 'Passkey' : 'Note';

  const TypeIcon =
    item.itemType === 'totp' ? ShieldCheck :
    item.itemType === 'passkey' ? ScanFace : StickyNote;

  const notePreview = item.notes?.slice(0, 120);

  const handleCopy = async () => {
    if (item.password) {
      await navigator.clipboard.writeText(item.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article className="glass-panel animate-rise rounded-[28px] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(33,43,54,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            <TypeIcon size={12} />
            {typeLabel}
          </div>
          <p className="mt-4 truncate text-xl font-semibold text-slate-900">{item.title}</p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-sm text-slate-500 transition hover:text-emerald-700"
            >
              <Globe size={13} /> <span className="truncate">{item.url}</span>
            </a>
          )}
        </div>
        <button
          onClick={() => updateItem(item.id, { favorite: !item.favorite })}
          className={`rounded-full border p-2 transition ${
            item.favorite
              ? 'border-rose-200 bg-rose-50 text-rose-500'
              : 'border-[rgba(20,32,45,0.08)] bg-white/70 text-slate-300 hover:text-rose-500'
          }`}
        >
          <Heart size={15} fill={item.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Login fields */}
      {item.username && item.itemType !== 'passkey' && (
        <div className="mt-5 rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/75 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Username</p>
          <p className="mt-2 truncate text-sm text-slate-600">{item.username}</p>
        </div>
      )}

      {item.password && (
        <div className="mt-3 rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-slate-950 px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Password</p>
              <span className="mt-2 block truncate font-mono text-sm text-emerald-200">
                {showPassword ? item.password : '••••••••••••••••'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPassword(v => !v)}
                className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={handleCopy}
                className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
                title="Copy password"
              >
                {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOTP live code */}
      {item.itemType === 'totp' && item.totpSecret && (
        <TotpDisplay secret={item.totpSecret} />
      )}

      {/* Passkey info */}
      {item.itemType === 'passkey' && (
        <div className="mt-3 space-y-2">
          {item.passkeyProvider && (
            <div className="rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/75 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Provider</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <Fingerprint size={14} className="text-emerald-700" />
                {item.passkeyProvider}
              </div>
            </div>
          )}
          {item.passkeyUsername && (
            <div className="rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/75 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Account</p>
              <p className="mt-2 truncate text-sm text-slate-600">{item.passkeyUsername}</p>
            </div>
          )}
        </div>
      )}

      {notePreview && (
        <div className="mt-3 rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/75 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Notes</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {notePreview}
            {item.notes && item.notes.length > notePreview.length ? '...' : ''}
          </p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit?.(item)}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(20,32,45,0.08)] bg-white/80 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-emerald-700"
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this item?')) {
              deleteItem(item.id);
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(20,32,45,0.08)] bg-white/80 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </article>
  );
}
