'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sprout,
  Wheat,
  Building2,
  Truck,
  ShieldCheck,
  LayoutDashboard,
  ListOrdered,
  ShoppingBag,
  Clock,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { StrawSyncStore } from '../lib/store';
import { UserProfile, UserRole } from '../types';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface Props {
  role: UserRole;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const ROLE_ITEMS: Record<UserRole, SidebarItem[]> = {
  farmer: [
    { label: 'Overview Dashboard', href: '/farmer/dashboard', icon: LayoutDashboard },
    { label: 'My Residue Listings', href: '/farmer/listings', icon: ListOrdered },
    { label: 'Dispatches & Orders', href: '/farmer/orders', icon: Clock },
  ],
  buyer: [
    { label: 'Procurement Dashboard', href: '/buyer/dashboard', icon: LayoutDashboard },
    { label: 'Browse Residue Supply', href: '/buyer/marketplace', icon: ShoppingBag },
    { label: 'Purchase Orders', href: '/buyer/orders', icon: Clock },
  ],
  logistics: [
    { label: 'Fleet & Dispatches', href: '/logistics/dashboard', icon: LayoutDashboard },
  ],
  admin: [
    { label: 'Admin Command', href: '/admin/dashboard', icon: LayoutDashboard },
  ],
};

export default function DashboardLayout({ role, title, subtitle, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const enforceRoleAccess = () => {
      const user = StrawSyncStore.getCurrentUser();
      setCurrentUser(user);

      if (!user) {
        router.replace('/login');
        return;
      }

      if (user.role !== 'admin' && user.role !== role) {
        router.replace(`/${user.role}/dashboard`);
      }
    };

    enforceRoleAccess();
    const unsubscribe = StrawSyncStore.subscribe(enforceRoleAccess);
    return () => unsubscribe();
  }, [role, router]);

  const handleLogout = () => {
    StrawSyncStore.logout();
    router.push('/login');
  };

  const hasAccess = Boolean(isMounted && currentUser && (currentUser.role === 'admin' || currentUser.role === role));
  const isAdminOversightView = Boolean(currentUser && currentUser.role === 'admin' && role !== 'admin');

  const getRoleHeader = () => {
    switch (role) {
      case 'farmer':
        return { label: 'Farmer Portal', icon: Wheat, color: 'text-forest bg-emerald-50 border-emerald-200' };
      case 'buyer':
        return { label: 'Biomass Buyer Portal', icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'logistics':
        return { label: 'Logistics Fleet', icon: Truck, color: 'text-amber-800 bg-amber-50 border-amber-200' };
      case 'admin':
        return { label: 'State Oversight Cell', icon: ShieldCheck, color: 'text-purple-800 bg-purple-50 border-purple-200' };
    }
  };

  const roleMeta = getRoleHeader();
  const RoleIcon = roleMeta.icon;
  const items = ROLE_ITEMS[role] || [];

  if (!hasAccess) {
    return (
      <div className="min-h-[75vh] bg-sand flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl px-8 py-6 border border-earth-border shadow-subtle text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-sage text-forest flex items-center justify-center mx-auto">
            <RoleIcon className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-charcoal">Verifying {roleMeta.label} access...</p>
          <p className="text-[11px] text-charcoal-muted">Redirecting to your authorized workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand flex flex-col md:flex-row">
      {/* Mobile Top Header for Sidebar Toggle */}
      <div className="md:hidden bg-white border-b border-earth-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg bg-sand border border-earth-border text-charcoal"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <RoleIcon className="w-4 h-4 text-forest" />
            <span className="text-sm font-bold text-charcoal">{roleMeta.label}</span>
          </div>
        </div>
        <Link
          href="/"
          className="text-xs font-semibold text-charcoal-muted hover:text-forest flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 bg-white border-r border-earth-border shrink-0 flex flex-col justify-between p-5 md:static fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0 shadow-elevated' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand & Portal Header */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-forest flex items-center justify-center text-white shadow-subtle group-hover:bg-forest-700 transition">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-forest-700 leading-tight">
                  Straw<span className="text-moss">Sync</span>
                </div>
                <div className="text-[10px] text-charcoal-muted font-medium">
                  {roleMeta.label}
                </div>
              </div>
            </Link>

            <div className={`mt-4 p-2.5 rounded-xl border flex items-center gap-2 ${roleMeta.color}`}>
              <RoleIcon className="w-4 h-4 shrink-0" />
              <div className="text-xs font-bold truncate">
                {currentUser?.name || 'Authorized User'}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted px-3 py-1">
              Menu Navigation
            </div>
            {items.map((item) => {
              const ItemIcon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-forest text-white shadow-subtle'
                      : 'text-charcoal hover:bg-sand hover:text-forest'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ItemIcon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Back to Home & Logout */}
        <div className="pt-4 border-t border-earth-border space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-muted hover:text-forest hover:bg-sand transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Landing Page</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8">
        {isAdminOversightView && (
          <div className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
              <div>
                <span className="font-bold">Admin Oversight Mode:</span> Viewing platform-wide{' '}
                <strong className="capitalize">{role}</strong> operations as <strong>{currentUser?.name}</strong>.
              </div>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white rounded-lg font-bold shrink-0 text-center"
            >
              Return to Admin Command
            </Link>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
