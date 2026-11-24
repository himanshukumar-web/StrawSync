'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sprout,
  Wheat,
  Building2,
  Truck,
  ShieldCheck,
  ArrowRight,
  Lock,
  Phone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../../types';
import { StrawSyncStore } from '../../lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  const [identifier, setIdentifier] = useState('+91 98721 44520');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleQuickDemoLogin = (role: UserRole) => {
    StrawSyncStore.switchRole(role);
    setSuccess(`Logged in as demo ${role.toUpperCase()}! Redirecting to dashboard...`);
    setTimeout(() => {
      router.push(`/${role}/dashboard`);
    }, 350);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your mobile number or registered email.');
      return;
    }

    const user = StrawSyncStore.login(identifier, selectedRole);
    setSuccess(`Welcome back, ${user.name}! Redirecting...`);
    setTimeout(() => {
      router.push(`/${selectedRole}/dashboard`);
    }, 350);
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex w-12 h-12 rounded-2xl bg-forest items-center justify-center text-white shadow-card mb-2 hover:bg-forest-700 transition">
            <Sprout className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-3xl font-extrabold text-charcoal tracking-tight">
            Sign In to Straw<span className="text-moss">Sync</span>
          </h1>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Access your agricultural residue dashboard, active matching engine, and dispatch tracking.
          </p>
        </div>

        {/* Quick Demo Login Bar for Judges & Testers */}
        <div className="bg-sand p-4 rounded-2xl border border-earth-border shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
              Live Demo Accounts (1-Click Instant Login)
            </span>
            <span className="text-[10px] font-semibold text-forest bg-sage px-2 py-0.5 rounded-full border border-forest-100">
              Judges & Testers
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleQuickDemoLogin('farmer')}
              className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-earth-border hover:border-emerald-300 text-left transition"
            >
              <div className="flex items-center gap-1.5 text-forest font-bold text-xs">
                <Wheat className="w-3.5 h-3.5" />
                <span>Farmer</span>
              </div>
              <div className="text-[10px] text-charcoal-muted truncate">Gurpreet Singh</div>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('buyer')}
              className="p-2.5 rounded-xl bg-white hover:bg-blue-50 border border-earth-border hover:border-blue-300 text-left transition"
            >
              <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                <Building2 className="w-3.5 h-3.5" />
                <span>Buyer</span>
              </div>
              <div className="text-[10px] text-charcoal-muted truncate">GreenSource Bio</div>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('logistics')}
              className="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-earth-border hover:border-amber-300 text-left transition"
            >
              <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                <Truck className="w-3.5 h-3.5" />
                <span>Logistics</span>
              </div>
              <div className="text-[10px] text-charcoal-muted truncate">Khalsa Freight</div>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('admin')}
              className="p-2.5 rounded-xl bg-white hover:bg-purple-50 border border-earth-border hover:border-purple-300 text-left transition"
            >
              <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </div>
              <div className="text-[10px] text-charcoal-muted truncate">Pollution Cell</div>
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 border border-earth-border shadow-elevated">
          {/* Navigation to Register */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-earth-border">
            <span className="text-sm font-bold text-charcoal">Enter Your Credentials</span>
            <Link
              href="/register"
              className="text-xs font-semibold text-forest hover:underline flex items-center gap-1"
            >
              <span>Need an account? Register</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-charcoal uppercase mb-2">
              Select Your Role:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('farmer')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  selectedRole === 'farmer'
                    ? 'border-forest bg-forest-50/50 text-forest'
                    : 'border-earth-border bg-white text-charcoal hover:bg-sand'
                }`}
              >
                <Wheat className="w-4 h-4 text-forest shrink-0" />
                <div>
                  <div className="text-xs font-bold">Farmer / FPO</div>
                  <div className="text-[10px] text-charcoal-muted">Sell crop stubble</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('buyer')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  selectedRole === 'buyer'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-800'
                    : 'border-earth-border bg-white text-charcoal hover:bg-sand'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Biomass Buyer</div>
                  <div className="text-[10px] text-charcoal-muted">Source raw parali</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('logistics')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  selectedRole === 'logistics'
                    ? 'border-amber-500 bg-amber-50/50 text-amber-800'
                    : 'border-earth-border bg-white text-charcoal hover:bg-sand'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Logistics Fleet</div>
                  <div className="text-[10px] text-charcoal-muted">Haulage & dispatch</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  selectedRole === 'admin'
                    ? 'border-purple-500 bg-purple-50/50 text-purple-800'
                    : 'border-earth-border bg-white text-charcoal hover:bg-sand'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Admin Cell</div>
                  <div className="text-[10px] text-charcoal-muted">Policy & metrics</div>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                Kisan Mobile Number / Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                <input
                  type="text"
                  placeholder="+91 98721 44520"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-charcoal-muted uppercase">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-forest hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-2 transition"
            >
              <span>Sign In as {selectedRole.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
