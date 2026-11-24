'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sprout, Mail, Phone, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { StrawSyncStore } from '../../lib/store';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setToken(null);

    if (!identifier.trim()) {
      setError('Please provide your registered mobile number or email address.');
      return;
    }

    const res = StrawSyncStore.requestPasswordReset(identifier);
    if (!res.success) {
      setError(res.message);
      return;
    }

    setSuccess(res.message);
    if (res.resetToken) {
      setToken(res.resetToken);
    }
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex w-12 h-12 rounded-2xl bg-forest items-center justify-center text-white shadow-card mb-2 hover:bg-forest-700 transition">
            <Sprout className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            Reset StrawSync Password
          </h1>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Enter your registered Kisan mobile number or official email to receive a password reset authorization.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-earth-border shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-forest-200 text-xs font-medium text-forest-800 space-y-3">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Reset Authorization Generated</span>
                </div>
                <p className="text-[11px] leading-relaxed text-forest-700">{success}</p>

                {token && (
                  <div className="p-3 bg-white rounded-lg border border-forest-200 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-charcoal-muted">One-Time Reset Token</div>
                      <code className="text-xs font-mono font-bold text-forest">{token}</code>
                    </div>
                    <Link
                      href={`/reset-password?identifier=${encodeURIComponent(identifier)}&token=${encodeURIComponent(token)}`}
                      className="px-3 py-1.5 bg-forest hover:bg-forest-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      <span>Proceed</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Registered Mobile Number or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                <input
                  type="text"
                  placeholder="+91 98721 44520 or gurpreet@kisan.in"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-2 transition"
            >
              <KeyRound className="w-4 h-4" />
              <span>Generate Reset Token</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-earth-border text-center">
            <Link
              href="/login"
              className="text-xs font-semibold text-charcoal-muted hover:text-forest inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
