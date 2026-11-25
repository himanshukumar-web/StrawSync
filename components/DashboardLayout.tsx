'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
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
import { useLanguage } from '../lib/i18n';
import { UserProfile, UserRole } from '../types';

interface SidebarItem {
  labelKey: string;
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
    { labelKey: 'layout.overviewDashboard', label: 'Overview Dashboard', href: '/farmer/dashboard', icon: LayoutDashboard },
    { labelKey: 'layout.residueListings', label: 'My Residue Listings', href: '/farmer/listings', icon: ListOrdered },
    { labelKey: 'layout.dispatchesOrders', label: 'Dispatches & Orders', href: '/farmer/orders', icon: Clock },
  ],
  buyer: [
    { labelKey: 'layout.procurementDashboard', label: 'Procurement Dashboard', href: '/buyer/dashboard', icon: LayoutDashboard },
    { labelKey: 'layout.browseSupply', label: 'Browse Residue Supply', href: '/buyer/marketplace', icon: ShoppingBag },
    { labelKey: 'layout.purchaseOrders', label: 'Purchase Orders', href: '/buyer/orders', icon: Clock },
  ],
  logistics: [
    { labelKey: 'layout.fleetDispatches', label: 'Fleet & Dispatches', href: '/logistics/dashboard', icon: LayoutDashboard },
  ],
  admin: [
    { labelKey: 'layout.adminCommand', label: 'Admin Command', href: '/admin/dashboard', icon: LayoutDashboard },
  ],
};

export default function DashboardLayout({ role, title, subtitle, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let cancelled = false;

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

    const boot = async () => {
      await StrawSyncStore.initFromServer();
      if (!cancelled) {
        enforceRoleAccess();
      }
    };

    boot();
    const unsubscribe = StrawSyncStore.subscribe(() => {
      if (StrawSyncStore.isServerHydrated() || !StrawSyncStore.isServerConfigured()) {
        enforceRoleAccess();
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [role, router]);

  const handleLogout = async () => {
    await StrawSyncStore.logoutAsync();
    router.push('/login');
  };

  const hasAccess = Boolean(isMounted && currentUser && (currentUser.role === 'admin' || currentUser.role === role));
  const isAdminOversightView = Boolean(currentUser && currentUser.role === 'admin' && role !== 'admin');

  const getRoleHeader = () => {
    switch (role) {
      case 'farmer':
        return { label: t('layout.farmerPortal', 'Farmer Portal'), icon: Wheat, color: 'text-forest bg-emerald-50 border-emerald-200' };
      case 'buyer':
        return { label: t('layout.buyerPortal', 'Biomass Buyer Portal'), icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'logistics':
        return { label: t('layout.logisticsPortal', 'Logistics Fleet'), icon: Truck, color: 'text-amber-800 bg-amber-50 border-amber-200' };
      case 'admin':
        return { label: t('layout.adminPortal', 'State Oversight Cell'), icon: ShieldCheck, color: 'text-purple-800 bg-purple-50 border-purple-200' };
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
    <div className="min-h-[calc(100vh-5rem)] bg-sand flex flex-col lg:flex-row">
      {/* Mobile & Tablet Header for Sidebar Toggle (pinned cleanly below h-20 Navbar) */}
      <div className="lg:hidden bg-white border-b border-earth-border px-4 py-3 flex items-center justify-between sticky top-20 z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle portal navigation"
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

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-x-0 top-20 bottom-0 bg-charcoal/25 backdrop-blur-[1px] z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (aligned below sticky top Navbar at all viewports) */}
      <aside
        className={`w-64 bg-white border-r border-earth-border shrink-0 flex flex-col justify-between p-5 fixed top-20 bottom-0 left-0 z-30 overflow-y-auto transform transition-transform duration-200 ease-in-out lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:z-20 lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-elevated' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Portal Role Header & Active User Pill */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-8 h-8 rounded-xl bg-sage text-forest flex items-center justify-center shrink-0 border border-forest-100">
                <RoleIcon className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-forest-800 leading-tight">
                {roleMeta.label}
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${roleMeta.color}`}>
              <RoleIcon className="w-4 h-4 shrink-0" />
              <div className="text-xs font-bold truncate">
                {currentUser?.name || 'Authorized User'}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted px-3 py-1">
              {t('layout.menuNav', 'Menu Navigation')}
            </div>
            {items.map((item) => {
              const ItemIcon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${isActive
                    ? 'bg-forest text-white shadow-subtle'
                    : 'text-charcoal hover:bg-sand hover:text-forest'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ItemIcon className="w-4 h-4" />
                    <span>{t(item.labelKey, item.label)}</span>
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
            <span>{t('layout.returnHome', 'Return to Landing Page')}</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('layout.signOut', 'Sign Out Session')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (padded clear of floating Voice Copilot button) */}
      <section className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
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
      </section>
    </div>
  );
}
