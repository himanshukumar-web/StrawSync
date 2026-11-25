'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sprout,
  Wheat,
  Building2,
  Truck,
  ArrowRight,
  Lock,
  Phone,
  User,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../../types';
import { StrawSyncStore, normalizeIdentifier } from '../../lib/store';

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'buyer' | 'logistics'>('farmer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your full name or registered farm/enterprise name.');
      return;
    }

    const normPhone = normalizeIdentifier(phone);
    const normEmail = normalizeIdentifier(email);

    if (!normPhone && !normEmail) {
      setError('Please enter at least a 10-digit mobile number or an email address.');
      return;
    }
    if (email.trim() && !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (phone.trim() && normPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!location.trim()) {
      setError('Please enter your district and state.');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    const result = StrawSyncStore.register({
      name: name.trim(),
      role: selectedRole,
      phone: normPhone,
      email: normEmail,
      organization: organization.trim() || (selectedRole === 'farmer' ? 'Kisan Producer Group' : selectedRole === 'buyer' ? 'Biomass Enterprise' : 'Freight Transport'),
      location: location.trim(),
      coordinates: { lat: 30.3742, lng: 75.8712 },
      password: password.trim(),
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(`Account created for ${result.user.name}! Redirecting to ${selectedRole} dashboard...`);
    setTimeout(() => {
      router.push(`/${result.user.role}/dashboard`);
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
            Register for Straw<span className="text-moss">Sync</span>
          </h1>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
            Join India's agricultural residue liquidity network. Convert stubble liability into economic value.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 border border-earth-border shadow-elevated">
          {/* Navigation to Login */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-earth-border">
            <span className="text-sm font-bold text-charcoal">Create Your Profile</span>
            <Link
              href="/login"
              className="text-xs font-semibold text-forest hover:underline flex items-center gap-1"
            >
              <span>Existing user? Sign In</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Role Selection: Farmer, Buyer, Logistics ONLY (No public Admin) */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-charcoal uppercase mb-2">
              Select Your Role:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedRole('farmer')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  selectedRole === 'farmer'
                    ? 'border-forest bg-forest-50/50 text-forest ring-1 ring-forest'
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
                    ? 'border-blue-500 bg-blue-50/50 text-blue-800 ring-1 ring-blue-500'
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
                    ? 'border-amber-500 bg-amber-50/50 text-amber-800 ring-1 ring-amber-500'
                    : 'border-earth-border bg-white text-charcoal hover:bg-sand'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Logistics Partner</div>
                  <div className="text-[10px] text-charcoal-muted">Fleet & transport</div>
                </div>
              </button>
            </div>
            <p className="text-[10px] text-charcoal-muted mt-2 italic">
              * Administrative accounts are issued exclusively via Ministry / Pollution Control Cell authorization.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
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
                Full Name / Farm or Company Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                <input
                  type="text"
                  placeholder={selectedRole === 'farmer' ? 'e.g. Sardar Gurpreet Singh' : selectedRole === 'buyer' ? 'e.g. GreenSource Bio-Energy' : 'e.g. Khalsa Logistics'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                  <input
                    type="email"
                    placeholder="name@example.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                  10-Digit Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                  <input
                    type="tel"
                    placeholder="+91 94178 85574 or 9417885574"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Primary District & State *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                <input
                  type="text"
                  placeholder="e.g. Ghaziabad, UP"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-2 transition"
            >
              <span>Complete Registration as {selectedRole.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
