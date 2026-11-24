'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sprout, Lock, KeyRound, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { StrawSyncStore } from '../../lib/store';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const idParam = searchParams.get('identifier');
    const tokenParam = searchParams.get('token');
    if (idParam) setIdentifier(idParam);
    if (tokenParam) setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please provide your registered account identifier (email/phone).');
      return;
    }
    if (!token.trim()) {
      setError('Please enter the reset token received.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const updated = StrawSyncStore.resetPassword(identifier, newPassword);
    if (!updated) {
      setError('Failed to update credentials. Please verify your account identifier.');
      return;
    }

    setSuccess('Password updated successfully! Redirecting to login portal...');
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-earth-border shadow-elevated">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-forest-200 text-xs font-medium text-forest-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            Account Email or Mobile
          </label>
          <input
            type="text"
            placeholder="gurpreet@kisan.in"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            Reset Token
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
            <input
              type="text"
              placeholder="e.g. rst_m012_abc"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest font-mono"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
            <input
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-2 transition"
        >
          <span>Update Password & Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-earth-border text-center">
        <Link
          href="/login"
          className="text-xs font-semibold text-charcoal-muted hover:text-forest inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Return to Login</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex w-12 h-12 rounded-2xl bg-forest items-center justify-center text-white shadow-card mb-2 hover:bg-forest-700 transition">
            <Sprout className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Authorize your credential update and regain access to StrawSync.
          </p>
        </div>

        <Suspense fallback={
          <div className="bg-white rounded-3xl p-8 border border-earth-border shadow-elevated text-center text-xs text-charcoal-muted">
            Loading reset form...
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
