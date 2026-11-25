'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sprout,
  Truck,
  Building2,
  ShieldCheck,
  Wheat,
  Calculator,
  ArrowRight,
  Menu,
  X,
  LogOut,
  Bell,
  CheckCheck,
  Coins,
  PackageCheck,
} from 'lucide-react';
import { StrawSyncStore } from '../lib/store';
import { PlatformNotification, UserProfile, UserRole } from '../types';
import ResidueCalculatorModal from './ResidueCalculatorModal';

interface NavLinkItem {
  label: string;
  href: string;
  matchPrefix?: string;
}

function getRoleNavLinks(role?: UserRole): NavLinkItem[] {
  switch (role) {
    case 'farmer':
      return [
        { label: 'Overview', href: '/' },
        { label: 'Farmer Hub', href: '/farmer/dashboard', matchPrefix: '/farmer/dashboard' },
        { label: 'My Listings', href: '/farmer/listings', matchPrefix: '/farmer/listings' },
        { label: 'My Orders', href: '/farmer/orders', matchPrefix: '/farmer/orders' },
      ];
    case 'buyer':
      return [
        { label: 'Overview', href: '/' },
        { label: 'Buyer Dashboard', href: '/buyer/dashboard', matchPrefix: '/buyer/dashboard' },
        { label: 'Buyer Marketplace', href: '/buyer/marketplace', matchPrefix: '/buyer/marketplace' },
        { label: 'My Orders', href: '/buyer/orders', matchPrefix: '/buyer/orders' },
      ];
    case 'logistics':
      return [
        { label: 'Overview', href: '/' },
        { label: 'Smart Logistics', href: '/logistics/dashboard', matchPrefix: '/logistics' },
      ];
    case 'admin':
      return [
        { label: 'Overview', href: '/' },
        { label: 'Farmer Hub', href: '/farmer/dashboard', matchPrefix: '/farmer' },
        { label: 'Buyer Marketplace', href: '/buyer/marketplace', matchPrefix: '/buyer' },
        { label: 'Smart Logistics', href: '/logistics/dashboard', matchPrefix: '/logistics' },
        { label: 'Admin Oversight', href: '/admin/dashboard', matchPrefix: '/admin' },
      ];
    default:
      return [{ label: 'Overview', href: '/' }];
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    const syncAuthAndAlerts = () => {
      const user = StrawSyncStore.getCurrentUser();
      setCurrentUser(user);
      setNotifications(user ? StrawSyncStore.getNotifications(user.id) : []);
    };
    syncAuthAndAlerts();
    const unsubscribe = StrawSyncStore.subscribe(syncAuthAndAlerts);
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    StrawSyncStore.logout();
    setNotifOpen(false);
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

  const navLinks = getRoleNavLinks(currentUser?.role);
  const currentBadge = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = currentBadge ? currentBadge.icon : Wheat;

  const isNavLinkActive = (item: NavLinkItem) => {
    if (item.href === '/') return pathname === '/';
    return item.matchPrefix ? pathname?.startsWith(item.matchPrefix) : pathname === item.href;
  };

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

              {/* Desktop Nav Links (strictly isolated by active user role) */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                      isNavLinkActive(item)
                        ? 'text-forest bg-sage/60'
                        : 'text-charcoal-soft hover:text-forest hover:bg-sage/30'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
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

              {/* Logged-in Identity Badge, Notification Bell & Logout */}
              {currentUser ? (
                <>
                  {/* Notification Bell Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNotifOpen(!notifOpen)}
                      aria-label="Notifications"
                      className="relative p-2 bg-white border border-earth-border rounded-xl shadow-subtle hover:border-forest-300 text-charcoal transition"
                    >
                      <Bell className="w-4 h-4 text-forest" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-elevated border border-earth-border py-2 z-50">
                        <div className="px-4 py-2.5 border-b border-earth-border flex items-center justify-between">
                          <span className="text-xs font-bold text-charcoal">
                            Alerts & Escrow Updates ({unreadCount} unread)
                          </span>
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={() => StrawSyncStore.markAllNotificationsRead(currentUser.id)}
                              className="text-[11px] font-semibold text-forest hover:underline flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Mark all read</span>
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-earth-border">
                          {notifications.length === 0 ? (
                            <div className="p-5 text-center text-xs text-charcoal-muted">
                              No notifications yet. Delivery and escrow settlement updates appear here in real time.
                            </div>
                          ) : (
                            notifications.slice(0, 8).map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => StrawSyncStore.markNotificationRead(n.id)}
                                className={`w-full text-left px-4 py-3 hover:bg-sand transition flex items-start gap-2.5 ${
                                  !n.read ? 'bg-sage/40' : 'bg-white'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {n.type === 'payment' ? (
                                    <Coins className="w-4 h-4 text-forest" />
                                  ) : n.type === 'delivery' ? (
                                    <PackageCheck className="w-4 h-4 text-blue-700" />
                                  ) : (
                                    <Bell className="w-4 h-4 text-amber-700" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-charcoal truncate">{n.title}</span>
                                    {!n.read && <span className="w-2 h-2 rounded-full bg-forest shrink-0" />}
                                  </div>
                                  <p className="text-[11px] text-charcoal-soft mt-0.5 leading-snug">{n.message}</p>
                                  <span className="text-[10px] text-charcoal-muted mt-1 block">
                                    {new Date(n.createdAt).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-earth-border rounded-xl shadow-subtle text-left">
                    <div className="w-7 h-7 rounded-lg bg-forest-100 flex items-center justify-center text-forest shrink-0">
                      <RoleIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left leading-tight">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${currentBadge?.bg}`}>
                        {currentBadge?.label}
                      </span>
                      <div className="text-xs font-bold text-charcoal truncate max-w-[140px]">
                        {currentUser.name}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/${currentUser.role}/dashboard`}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-forest hover:bg-forest-700 rounded-xl shadow-subtle transition flex items-center gap-1.5"
                  >
                    <span>My Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="px-3 py-2 text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-earth-border rounded-xl shadow-subtle transition flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-2 text-xs font-bold text-charcoal hover:text-forest transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-xs font-bold text-white bg-forest hover:bg-forest-700 rounded-xl shadow-subtle transition"
                  >
                    Register
                  </Link>
                </div>
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
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-xs font-bold ${
                    isNavLinkActive(item)
                      ? 'bg-sage/60 text-forest'
                      : 'text-charcoal hover:bg-sand'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
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
                    Logout
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-center rounded-xl border border-earth-border text-xs font-bold text-charcoal"
                  >
                    Login
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
