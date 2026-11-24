'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sprout,
  Truck,
  Building2,
  ShieldCheck,
  ChevronDown,
  Wheat,
  Calculator,
  ArrowRight,
  Menu,
  X,
  LogOut,
  User,
  ShoppingBag,
  ListOrdered
} from 'lucide-react';
import { StrawSyncStore } from '../lib/store';
import { UserProfile, UserRole } from '../types';
import ResidueCalculatorModal from './ResidueCalculatorModal';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(StrawSyncStore.getCurrentUser());
    const unsubscribe = StrawSyncStore.subscribe(() => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
    });
    return () => unsubscribe();
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    StrawSyncStore.switchRole(role);
    setShowRoleMenu(false);
    setMobileMenuOpen(false);
    router.push(`/${role}/dashboard`);
  };

  const handleLogout = () => {
    StrawSyncStore.logout();
    setShowRoleMenu(false);
    setMobileMenuOpen(false);
    router.push('/login');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'farmer':
        return { label: 'Farmer Portal', bg: 'bg-emerald-50 text-forest-700 border-forest-200', icon: Wheat };
      case 'buyer':
        return { label: 'Biomass Buyer', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Building2 };
      case 'logistics':
        return { label: 'Logistics Fleet', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Truck };
      case 'admin':
        return { label: 'Admin Oversight', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: ShieldCheck };
    }
  };

  const currentBadge = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = currentBadge ? currentBadge.icon : Wheat;

  return (
    <>
      <header className="sticky top-0 z-40 bg-sand/90 backdrop-blur-md border-b border-earth-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="flex items-center gap-3 group text-left focus:outline-none"
              >
                <div className="w-11 h-11 rounded-xl bg-forest flex items-center justify-center text-white shadow-subtle group-hover:bg-forest-700 transition">
                  <Sprout className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold tracking-tight text-forest-700">
                      Straw<span className="text-moss">Sync</span>
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sage text-forest-700 border border-forest-100">
                      AgriTech
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-muted font-medium">
                    Don't Burn It, Earn From It!
                  </p>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/"
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    pathname === '/'
                      ? 'text-forest bg-sage/60'
                      : 'text-charcoal-soft hover:text-forest hover:bg-sage/30'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href="/farmer/dashboard"
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    pathname?.startsWith('/farmer')
                      ? 'text-forest bg-sage/60'
                      : 'text-charcoal-soft hover:text-forest hover:bg-sage/30'
                  }`}
                >
                  Farmer Hub
                </Link>
                <Link
                  href="/buyer/marketplace"
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    pathname?.startsWith('/buyer')
                      ? 'text-forest bg-sage/60'
                      : 'text-charcoal-soft hover:text-forest hover:bg-sage/30'
                  }`}
                >
                  Buyer Marketplace
                </Link>
                <Link
                  href="/logistics/dashboard"
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    pathname?.startsWith('/logistics')
                      ? 'text-forest bg-sage/60'
                      : 'text-charcoal-soft hover:text-forest hover:bg-sage/30'
                  }`}
                >
                  Smart Logistics
                </Link>
                <Link
                  href="/admin/dashboard"
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    pathname?.startsWith('/admin')
                      ? 'text-forest bg-sage/60'
                      : 'text-charcoal-soft hover:text-forest hover:bg-sage/30'
                  }`}
                >
                  Admin Oversight
                </Link>
              </nav>
            </div>

            {/* Right Controls */}
            <div className="hidden lg:flex items-center gap-2.5">
              {/* Residue Calculator Trigger */}
              <button
                onClick={() => setCalculatorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-forest-700 bg-white border border-forest-200/80 rounded-xl hover:bg-forest-50/50 shadow-subtle transition"
                title="Calculate recoverable tonnes and fair price"
              >
                <Calculator className="w-3.5 h-3.5 text-forest" />
                <span>Calculator</span>
              </button>

              {/* Persona Switcher / User Profile */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-earth-border rounded-xl shadow-subtle hover:border-forest-300 transition text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-forest-100 flex items-center justify-center text-forest">
                      <RoleIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left leading-tight">
                      <div className="text-[10px] font-medium text-charcoal-muted flex items-center gap-1">
                        <span>Persona:</span>
                        <span className="font-bold text-charcoal capitalize">{currentUser.role}</span>
                      </div>
                      <div className="text-xs font-bold text-forest-800 truncate max-w-[130px]">
                        {currentUser.name}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-charcoal-muted ml-0.5" />
                  </button>

                  {showRoleMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-elevated border border-earth-border py-2 z-50">
                      <div className="px-4 py-2 border-b border-earth-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
                          Switch Live Role
                        </p>
                        <p className="text-[11px] text-charcoal-muted mt-0.5">
                          Change operational persona or test multi-role flow
                        </p>
                      </div>

                      <div className="p-1 space-y-1">
                        <button
                          onClick={() => handleRoleSelect('farmer')}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                            currentUser?.role === 'farmer' ? 'bg-forest-50 text-forest' : 'hover:bg-sand text-charcoal'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-forest-700 flex items-center justify-center shrink-0">
                            <Wheat className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">Farmer (Gurpreet Singh)</div>
                            <div className="text-[10px] text-charcoal-muted">List residue, monitor orders</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleRoleSelect('buyer')}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                            currentUser?.role === 'buyer' ? 'bg-blue-50 text-blue-800' : 'hover:bg-sand text-charcoal'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">Buyer (GreenSource Bio)</div>
                            <div className="text-[10px] text-charcoal-muted">Biomass demand & orders</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleRoleSelect('logistics')}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                            currentUser?.role === 'logistics' ? 'bg-amber-50 text-amber-800' : 'hover:bg-sand text-charcoal'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">Logistics Fleet (Khalsa)</div>
                            <div className="text-[10px] text-charcoal-muted">Dispatch & weighbridge</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleRoleSelect('admin')}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                            currentUser?.role === 'admin' ? 'bg-purple-50 text-purple-800' : 'hover:bg-sand text-charcoal'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">Admin (Oversight Cell)</div>
                            <div className="text-[10px] text-charcoal-muted">CPCB co-firing metrics</div>
                          </div>
                        </button>
                      </div>

                      <div className="px-3 pt-2 border-t border-earth-border flex items-center justify-between text-xs">
                        <Link
                          href={`/${currentUser.role}/dashboard`}
                          onClick={() => setShowRoleMenu(false)}
                          className="text-forest font-bold hover:underline"
                        >
                          Open Dashboard →
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="text-red-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-2 text-xs font-bold text-charcoal hover:text-forest transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-xs font-bold text-white bg-forest hover:bg-forest-700 rounded-xl shadow-subtle transition"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Dedicated Dashboard Quick Access */}
              {currentUser && (
                <Link
                  href={`/${currentUser.role}/dashboard`}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-forest hover:bg-forest-700 rounded-xl shadow-subtle transition flex items-center gap-1.5"
                >
                  <span>My Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setCalculatorOpen(true)}
                className="p-2 text-forest bg-white rounded-lg border border-earth-border"
                title="Calculator"
              >
                <Calculator className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-charcoal bg-white rounded-lg border border-earth-border"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-earth-border bg-white px-4 pt-3 pb-6 space-y-4">
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-bold text-charcoal hover:bg-sand"
              >
                Overview
              </Link>
              <Link
                href="/farmer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-bold text-charcoal hover:bg-sand"
              >
                Farmer Hub
              </Link>
              <Link
                href="/farmer/listings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 pl-6 rounded-lg text-xs text-charcoal-muted hover:bg-sand"
              >
                → Residue Listings
              </Link>
              <Link
                href="/buyer/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-bold text-charcoal hover:bg-sand"
              >
                Buyer Marketplace
              </Link>
              <Link
                href="/buyer/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 pl-6 rounded-lg text-xs text-charcoal-muted hover:bg-sand"
              >
                → Buyer Orders
              </Link>
              <Link
                href="/logistics/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-bold text-charcoal hover:bg-sand"
              >
                Smart Logistics Fleet
              </Link>
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-bold text-charcoal hover:bg-sand"
              >
                Admin Oversight
              </Link>
            </div>

            <div className="border-t border-earth-border pt-3 space-y-2">
              {currentUser ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-forest capitalize">
                    {currentUser.name} ({currentUser.role})
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-center rounded-xl border border-earth-border text-xs font-bold text-charcoal"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-center rounded-xl bg-forest text-white text-xs font-bold"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {calculatorOpen && (
        <ResidueCalculatorModal onClose={() => setCalculatorOpen(false)} />
      )}
    </>
  );
}
