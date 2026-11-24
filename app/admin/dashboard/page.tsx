'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Building2,
  Wheat,
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  Scale,
  Coins,
  Leaf,
  Settings,
  History,
  Lock,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  Check,
  X
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import {
  ResidueListing,
  BuyerDemand,
  PurchaseOrder,
  UserProfile,
  UserRole,
  AdminAuditLog,
  PlatformSettings,
  OrderStatus
} from '../../../types';
import { StrawSyncStore } from '../../../lib/store';

type AdminTab =
  | 'overview'
  | 'users'
  | 'farmers'
  | 'buyers'
  | 'logistics'
  | 'orders'
  | 'settings'
  | 'audit_logs'
  | 'alerts';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState(StrawSyncStore.getCurrentUser());
  const [stats, setStats] = useState(StrawSyncStore.getPlatformStats());
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [demands, setDemands] = useState<BuyerDemand[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(StrawSyncStore.getPlatformSettings());

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [notification, setNotification] = useState<string>('');

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Modal / Action States
  const [cancelOrderModal, setCancelOrderModal] = useState<PurchaseOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('Quality inspection failure at weighbridge');
  const [assignLogisticsModal, setAssignLogisticsModal] = useState<PurchaseOrder | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('user-log-1');
  const [disputeModal, setDisputeModal] = useState<PurchaseOrder | null>(null);
  const [disputeResolution, setDisputeResolution] = useState('Moisture deduction applied per CPCB guidelines');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(1500);

  useEffect(() => {
    const refreshData = () => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
      setStats(StrawSyncStore.getPlatformStats());
      setListings(StrawSyncStore.getListings());
      setDemands(StrawSyncStore.getDemands());
      setOrders(StrawSyncStore.getOrders());
      setUsers(StrawSyncStore.getAllUsers());
      setAuditLogs(StrawSyncStore.getAuditLogs());
      setSettings(StrawSyncStore.getPlatformSettings());
    };

    refreshData();
    const unsubscribe = StrawSyncStore.subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4500);
  };

  const handleVerifyListing = (id: string) => {
    StrawSyncStore.verifyListing(id, currentUser?.name || 'Admin');
    showNotification(`Residue Listing #${id} verified and cleared for matching!`);
  };

  const handleRejectListing = (id: string) => {
    const reason = prompt('Please enter rejection reason:', 'Moisture content exceeds 20% limit') || 'Unverified field location';
    StrawSyncStore.rejectListing(id, reason, currentUser?.name || 'Admin');
    showNotification(`Listing #${id} rejected. Reason recorded in audit log.`);
  };

  const handleToggleUser = (userId: string) => {
    const updated = StrawSyncStore.toggleUserStatus(userId, currentUser?.name || 'Admin');
    if (updated) {
      showNotification(`User ${updated.name} status updated to ${updated.status?.toUpperCase()}`);
    }
  };

  const handleVerifyUser = (userId: string) => {
    const updated = StrawSyncStore.verifyUser(userId, currentUser?.name || 'Admin');
    if (updated) {
      showNotification(`User ${updated.name} KYC and credentials verified!`);
    }
  };

  const handleChangeRole = (userId: string, newRole: UserRole) => {
    StrawSyncStore.changeUserRole(userId, newRole, currentUser?.name || 'Admin');
    showNotification(`User role updated to ${newRole.toUpperCase()}`);
  };

  const handleConfirmCancelOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderModal) return;
    StrawSyncStore.cancelOrder(cancelOrderModal.id, cancelReason, currentUser?.name || 'Admin');
    showNotification(`Order #${cancelOrderModal.orderNumber} cancelled. Escrow refund triggered.`);
    setCancelOrderModal(null);
  };

  const handleConfirmAssignLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignLogisticsModal) return;
    const partner = users.find((u) => u.id === selectedPartnerId) || { name: 'Khalsa Agro Transport' };
    StrawSyncStore.assignLogisticsToOrder(
      assignLogisticsModal.id,
      selectedPartnerId,
      partner.name,
      currentUser?.name || 'Admin'
    );
    showNotification(`Logistics partner ${partner.name} assigned to Order #${assignLogisticsModal.orderNumber}!`);
    setAssignLogisticsModal(null);
  };

  const handleConfirmDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModal) return;
    StrawSyncStore.resolveDispute(
      disputeModal.id,
      disputeResolution,
      adjustmentAmount,
      currentUser?.name || 'Admin'
    );
    showNotification(`Dispute for Order #${disputeModal.orderNumber} resolved. Adjustment recorded.`);
    setDisputeModal(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StrawSyncStore.updatePlatformSettings(settings, currentUser?.name || 'Admin');
    showNotification('Platform governance policies and fee settings updated successfully!');
  };

  const handleResetData = () => {
    if (confirm('Reset entire demo database to verified initial seed state?')) {
      StrawSyncStore.resetToDefaults();
      showNotification('Platform state restored to clean initial benchmark.');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        (u.organization && u.organization.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    return true;
  });

  const farmersList = users.filter((u) => u.role === 'farmer');
  const buyersList = users.filter((u) => u.role === 'buyer');
  const logisticsList = users.filter((u) => u.role === 'logistics');

  return (
    <DashboardLayout role="admin" title="State Residue Oversight Cell">
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-2xl shrink-0">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-charcoal">
                  Central Command & Governance — StrawSync
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200">
                  Super Admin Privileged
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-1">
                Authorized Administrator: <strong>{currentUser?.name || 'Smt. Ananya Verma, IAS'}</strong> • CPCB & State Pollution Control Cell
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResetData}
              className="px-4 py-2 bg-sand hover:bg-earth-border text-charcoal-muted hover:text-charcoal rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-earth-border"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Demo Seed</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center justify-between shadow-subtle animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-forest" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification('')} className="text-forest hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs (All 8 Modules) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-earth-border">
          {[
            { id: 'overview', label: 'Overview Metrics', icon: BarChart3 },
            { id: 'users', label: `Users (${users.length})`, icon: Users },
            { id: 'farmers', label: `Farmers (${farmersList.length})`, icon: Wheat },
            { id: 'buyers', label: `Buyers (${buyersList.length})`, icon: Building2 },
            { id: 'logistics', label: `Logistics (${logisticsList.length})`, icon: Truck },
            { id: 'orders', label: `Orders (${orders.length})`, icon: FileText },
            { id: 'settings', label: 'Platform Policies', icon: Settings },
            { id: 'audit_logs', label: `Audit Trail (${auditLogs.length})`, icon: History },
            { id: 'alerts', label: 'Stubble Fire Alerts', icon: AlertTriangle },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-purple-800 text-white shadow-subtle'
                    : 'bg-white text-charcoal-muted hover:text-charcoal hover:bg-sand border border-earth-border'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODULE A: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-earth-border shadow-subtle">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted block">Total Users</span>
                <span className="text-xl font-extrabold text-charcoal mt-1 block">{stats.totalUsers}</span>
                <span className="text-[10px] text-charcoal-muted">{stats.farmersCount} Farmers • {stats.buyersCount} Buyers</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-earth-border shadow-subtle">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted block">Residue Listed</span>
                <span className="text-xl font-extrabold text-forest mt-1 block">{stats.totalListedTonnes} t</span>
                <span className="text-[10px] text-forest-700">{stats.activeListingsCount} Active field lots</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-earth-border shadow-subtle">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted block">Sold & Delivered</span>
                <span className="text-xl font-extrabold text-blue-800 mt-1 block">{stats.totalSoldTonnes} t</span>
                <span className="text-[10px] text-blue-700">Weighbridge cleared</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-earth-border shadow-subtle">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted block">Active Orders</span>
                <span className="text-xl font-extrabold text-amber-700 mt-1 block">{stats.activeOrders}</span>
                <span className="text-[10px] text-amber-800">{stats.pendingOrders} Pending approval</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-earth-border shadow-subtle">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted block">Completed Orders</span>
                <span className="text-xl font-extrabold text-emerald-700 mt-1 block">{stats.completedOrders}</span>
                <span className="text-[10px] text-emerald-800">{stats.cancelledOrders} Cancelled</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-earth-border shadow-subtle">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted block">Transaction Value</span>
                <span className="text-xl font-extrabold text-purple-900 mt-1 block">₹{(stats.totalTransactionValue / 100000).toFixed(1)}L</span>
                <span className="text-[10px] text-purple-700">Protected in Escrow</span>
              </div>
            </div>

            {/* Platform Health and Impact Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-charcoal">CPCB Co-Firing Compliance & Residue Distribution</h3>
                  <span className="text-xs font-bold text-forest">Target: 5% Biomass Co-Firing</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-sand border border-earth-border">
                    <span className="text-[11px] font-bold text-charcoal-muted block">Thermal Plant Co-firing</span>
                    <span className="text-lg font-bold text-forest mt-1 block">4.8% / 5.0%</span>
                    <div className="w-full bg-earth-border h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-forest h-full rounded-full" style={{ width: '96%' }} />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-sand border border-earth-border">
                    <span className="text-[11px] font-bold text-charcoal-muted block">CO₂ Emissions Prevented</span>
                    <span className="text-lg font-bold text-emerald-700 mt-1 block">{stats.totalCO2PreventedTonnes} Tonnes</span>
                    <span className="text-[10px] text-charcoal-muted">Eq. to removing 840 cars</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-sand border border-earth-border">
                    <span className="text-[11px] font-bold text-charcoal-muted block">Direct Farmer Payouts</span>
                    <span className="text-lg font-bold text-purple-900 mt-1 block">₹{stats.totalFarmerPayouts.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-charcoal-muted">Zero middlemen margin</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-4">
                <h3 className="text-base font-bold text-charcoal">Active Stakeholder Census</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 bg-sand rounded-xl">
                    <span className="font-semibold text-charcoal">Verified Farmers / FPOs</span>
                    <strong className="text-forest">{stats.farmersCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-sand rounded-xl">
                    <span className="font-semibold text-charcoal">Biomass Industrial Buyers</span>
                    <strong className="text-blue-700">{stats.buyersCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-sand rounded-xl">
                    <span className="font-semibold text-charcoal">Logistics & Fleet Operators</span>
                    <strong className="text-amber-700">{stats.logisticsCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-sand rounded-xl">
                    <span className="font-semibold text-charcoal">State Cell Controllers</span>
                    <strong className="text-purple-700">{stats.adminCount}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE B: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-charcoal">Registered Stakeholder Directory</h3>
                <p className="text-xs text-charcoal-muted">Verify KYC, toggle account activity, or inspect permissions</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-sand border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-purple-600"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-sand border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-purple-600"
                >
                  <option value="all">All Roles</option>
                  <option value="farmer">Farmers</option>
                  <option value="buyer">Buyers</option>
                  <option value="logistics">Logistics</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-earth-border text-charcoal-muted uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Stakeholder</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Contact & Location</th>
                    <th className="py-3 px-3">KYC Status</th>
                    <th className="py-3 px-3">Account State</th>
                    <th className="py-3 px-3 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-border">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-sand/60 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-charcoal">{u.name}</div>
                        <div className="text-[11px] text-charcoal-muted">{u.organization || 'Individual Farm'}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'farmer' ? 'bg-emerald-50 text-forest' :
                          u.role === 'buyer' ? 'bg-blue-50 text-blue-700' :
                          u.role === 'logistics' ? 'bg-amber-50 text-amber-800' : 'bg-purple-50 text-purple-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-charcoal-soft">
                        <div>{u.phone}</div>
                        <div className="text-[11px] text-charcoal-muted">{u.location}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        {u.isVerified ? (
                          <span className="text-forest font-bold inline-flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVerifyUser(u.id)}
                            className="text-amber-800 hover:underline text-[11px] font-bold"
                          >
                            Verify KYC
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          u.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            u.status === 'suspended'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE C: FARMER MANAGEMENT */}
        {activeTab === 'farmers' && (
          <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-5">
            <div>
              <h3 className="text-base font-bold text-charcoal">Farmer & Residue Listing Oversight</h3>
              <p className="text-xs text-charcoal-muted">Review field stubble registrations, check GPS coordinates, and clear for industrial matching</p>
            </div>

            <div className="space-y-4">
              {listings.map((l) => (
                <div key={l.id} className="p-4 rounded-2xl bg-sand border border-earth-border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-charcoal text-sm">{l.cropName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'verified' ? 'bg-emerald-100 text-forest' :
                        l.status === 'matched' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status}
                      </span>
                    </div>
                    <div className="text-charcoal-muted mt-1">
                      Farmer: <strong>{l.farmerName}</strong> ({l.farmerPhone}) • Location: <strong>{l.village}, {l.district} ({l.state})</strong>
                    </div>
                    <div className="text-charcoal-soft mt-1">
                      Land Area: <strong>{l.landAreaAcres} Acres</strong> • Recoverable: <strong>{l.recoverableTonnes} Tonnes</strong> • Rate: <strong>₹{l.expectedPricePerTonne}/t</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {l.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleVerifyListing(l.id)}
                          className="px-3.5 py-1.5 bg-forest hover:bg-forest-700 text-white rounded-xl font-bold transition flex items-center gap-1 shadow-subtle"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Verify</span>
                        </button>
                        <button
                          onClick={() => handleRejectListing(l.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold transition border border-red-200"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold text-forest">Verification Complete</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE D: BUYER MANAGEMENT */}
        {activeTab === 'buyers' && (
          <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-5">
            <div>
              <h3 className="text-base font-bold text-charcoal">Biomass Industrial Buyers & Demand Requisitions</h3>
              <p className="text-xs text-charcoal-muted">Monitor industrial plant fuel intakes, boilers, and purchase quotas</p>
            </div>

            <div className="space-y-4">
              {demands.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-sand border border-earth-border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-charcoal text-sm">{d.companyName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        {d.industryType}
                      </span>
                    </div>
                    <div className="text-charcoal-muted mt-1">
                      Facility: <strong>{d.plantLocation.address}, {d.plantLocation.district} ({d.plantLocation.state})</strong>
                    </div>
                    <div className="text-charcoal-soft mt-1">
                      Requirement: <strong>{d.requiredTonnes}t {d.cropType.toUpperCase()}</strong> • Fulfilled: <strong>{d.fulfilledTonnes}t</strong> • Max Price: <strong>₹{d.maxDeliveredPricePerTonne}/t</strong>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-charcoal-muted block">Intake Progress</span>
                    <span className="text-sm font-bold text-forest">
                      {Math.round((d.fulfilledTonnes / d.requiredTonnes) * 100)}% Fulfilled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE E: LOGISTICS MANAGEMENT */}
        {activeTab === 'logistics' && (
          <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-5">
            <div>
              <h3 className="text-base font-bold text-charcoal">Logistics & Haulage Partner Directory</h3>
              <p className="text-xs text-charcoal-muted">Fleet carriers, weighbridge calibrations, and dispatch efficiency</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {logisticsList.map((log) => (
                <div key={log.id} className="p-5 rounded-2xl bg-sand border border-earth-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-charcoal text-sm">{log.organization || log.name}</span>
                      <span className="block text-[11px] text-charcoal-muted">{log.location}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      GPS Active
                    </span>
                  </div>
                  <div className="text-charcoal-soft">
                    Fleet Contact: <strong>{log.name}</strong> • Phone: <strong>{log.phone}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-earth-border text-[11px] text-charcoal-muted">
                    Vehicles: Tata 22ft 6-Wheeler (15t), Ashok Leyland Multi-Axle (28t), Mahindra Bolero Maxi (3t)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE F: COMPLETE ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-charcoal">Central Purchase Order Command</h3>
                <p className="text-xs text-charcoal-muted">View every transaction, manage status, assign logistics, and resolve disputes</p>
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 bg-sand border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-purple-600"
              >
                <option value="all">All Orders ({orders.length})</option>
                <option value="requested">Pending Acceptance</option>
                <option value="accepted">Accepted</option>
                <option value="logistics_assigned">Logistics Assigned</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="settled">Settled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-4">
              {filteredOrders.map((o) => (
                <div key={o.id} className="p-5 rounded-2xl bg-sand border border-earth-border space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-charcoal text-sm">PO #{o.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.status === 'settled' ? 'bg-emerald-100 text-forest' :
                        o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-forest text-sm">₹{o.buyerTotalBill.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-charcoal-muted block">Escrow Protected</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-charcoal-soft">
                    <div>
                      <span>Farmer: <strong>{o.farmerName}</strong> ({o.farmerPhone})</span>
                      <div className="text-[11px] text-charcoal-muted">{o.pickupLocation.village}, {o.pickupLocation.district}</div>
                    </div>
                    <div>
                      <span>Buyer: <strong>{o.buyerName}</strong></span>
                      <div className="text-[11px] text-charcoal-muted">{o.deliveryLocation.facility}</div>
                    </div>
                    <div>
                      <span>Logistics: <strong>{o.logisticsPartnerName || 'Unassigned'}</strong></span>
                      <div className="text-[11px] text-charcoal-muted">{o.quantityTonnes}t {o.cropType.toUpperCase()} • {o.distanceKm} km</div>
                    </div>
                  </div>

                  {o.cancelledReason && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px]">
                      <strong>Cancellation Note:</strong> {o.cancelledReason}
                    </div>
                  )}

                  {o.disputeNotes && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <strong>Dispute Resolved:</strong> {o.disputeNotes} (Adjustment: ₹{o.adjustments})
                    </div>
                  )}

                  {/* Administrative Action Bar */}
                  <div className="pt-3 border-t border-earth-border flex flex-wrap items-center justify-between gap-2">
                    <div className="text-charcoal-muted text-[11px]">
                      Date: {o.createdAt.split('T')[0]}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setAssignLogisticsModal(o)}
                        className="px-3 py-1.5 bg-white border border-earth-border hover:border-purple-300 text-charcoal rounded-xl font-bold transition"
                      >
                        Assign/Reassign Logistics
                      </button>

                      <button
                        onClick={() => setDisputeModal(o)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold transition"
                      >
                        Resolve Dispute
                      </button>

                      {o.status !== 'cancelled' && o.status !== 'settled' && (
                        <button
                          onClick={() => setCancelOrderModal(o)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODULE G: PLATFORM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-charcoal">Platform Governance & Regulatory Policies</h3>
              <p className="text-xs text-charcoal-muted">Adjust operational parameters, transaction fee rates, and co-firing rules</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase mb-1">
                    Platform Transaction Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={settings.platformFeePercent}
                    onChange={(e) => setSettings({ ...settings, platformFeePercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-sand border border-earth-border rounded-xl font-bold text-charcoal"
                    required
                  />
                  <span className="text-[10px] text-charcoal-muted">Deducted on successful escrow settlement</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal uppercase mb-1">
                    Max Economic Haulage Radius (km)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="20"
                    max="500"
                    value={settings.maxDistanceKm}
                    onChange={(e) => setSettings({ ...settings, maxDistanceKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-sand border border-earth-border rounded-xl font-bold text-charcoal"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3 bg-sand rounded-xl border border-earth-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireListingApproval}
                    onChange={(e) => setSettings({ ...settings, requireListingApproval: e.target.checked })}
                    className="rounded text-forest focus:ring-forest w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-charcoal block">Mandatory KVK Ground Inspection</span>
                    <span className="text-[10px] text-charcoal-muted">Require agriculture extension officer sign-off before lot goes live</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-sand rounded-xl border border-earth-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoAssignLogistics}
                    onChange={(e) => setSettings({ ...settings, autoAssignLogistics: e.target.checked })}
                    className="rounded text-forest focus:ring-forest w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-charcoal block">Automated Least-Cost Logistics Allocation</span>
                    <span className="text-[10px] text-charcoal-muted">Algorithmically allocate closest available truck to accepted orders</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-sand rounded-xl border border-earth-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smsAlertsEnabled}
                    onChange={(e) => setSettings({ ...settings, smsAlertsEnabled: e.target.checked })}
                    className="rounded text-forest focus:ring-forest w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-charcoal block">Kisan SMS & WhatsApp Notifications</span>
                    <span className="text-[10px] text-charcoal-muted">Dispatch Punjabi & Hindi alerts upon purchase offer and truck arrival</span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-800 hover:bg-purple-900 text-white rounded-xl font-bold transition shadow-subtle"
              >
                Save Governance Policies
              </button>
            </form>
          </div>
        )}

        {/* MODULE H: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-5">
            <div>
              <h3 className="text-base font-bold text-charcoal">Immutable Administrative Audit Log</h3>
              <p className="text-xs text-charcoal-muted">Every verification, policy change, and order cancellation recorded with timestamps</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-earth-border text-charcoal-muted uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Administrator</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Entity</th>
                    <th className="py-3 px-3">Details / Value</th>
                    <th className="py-3 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-sand/60 transition">
                      <td className="py-3 px-3 font-mono text-[11px] text-charcoal-muted">
                        {log.timestamp.replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-3 px-3 font-bold text-charcoal">
                        {log.adminName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-charcoal-soft font-mono text-[11px]">
                        {log.entityType.toUpperCase()}:{log.entityId}
                      </td>
                      <td className="py-3 px-3 text-charcoal text-[11px] max-w-xs truncate">
                        {log.newValue || '-'}
                      </td>
                      <td className="py-3 px-3 text-charcoal-muted text-[11px]">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-4">
            <h3 className="text-base font-bold text-charcoal">Satellite & Extension Field Alerts</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Sangrur Corridor Critical Stubble Collection</span>
                </div>
                <p className="text-red-800">46 tonnes of PR-126 paddy straw awaiting dispatch in Dhuri Khurd. Farmer scheduled to sow wheat in 3 days. High fire risk if collection delayed.</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Delayed Weighbridge Slip at Panipat Facility</span>
                </div>
                <p className="text-amber-800">Truck HR-05-BL-4891 reported waiting at gate entry. Recalibrating electronic moisture sensor.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CANCEL ORDER MODAL */}
      {cancelOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl border border-earth-border shadow-elevated p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-earth-border">
              <h3 className="text-base font-bold text-charcoal">Cancel Order #{cancelOrderModal.orderNumber}</h3>
              <button onClick={() => setCancelOrderModal(null)} className="text-charcoal-muted hover:text-charcoal">✕</button>
            </div>
            <form onSubmit={handleConfirmCancelOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">Administrative Cancellation Reason *</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-sand border border-earth-border rounded-xl font-medium text-charcoal focus:outline-none focus:border-red-600"
                  required
                />
              </div>
              <p className="text-[11px] text-red-600 italic">Cancelling will release the allocated escrow deposit back to buyer.</p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCancelOrderModal(null)} className="px-4 py-2 font-bold text-charcoal-muted">Dismiss</button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-subtle">Confirm Cancellation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN LOGISTICS MODAL */}
      {assignLogisticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl border border-earth-border shadow-elevated p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-earth-border">
              <h3 className="text-base font-bold text-charcoal">Assign Logistics Carrier</h3>
              <button onClick={() => setAssignLogisticsModal(null)} className="text-charcoal-muted hover:text-charcoal">✕</button>
            </div>
            <form onSubmit={handleConfirmAssignLogistics} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">Select Verified Fleet Partner</label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full px-3 py-2 bg-sand border border-earth-border rounded-xl font-bold text-charcoal"
                >
                  {logisticsList.map((log) => (
                    <option key={log.id} value={log.id}>{log.organization || log.name} ({log.location})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAssignLogisticsModal(null)} className="px-4 py-2 font-bold text-charcoal-muted">Dismiss</button>
                <button type="submit" className="px-5 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-xl font-bold shadow-subtle">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE DISPUTE MODAL */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl border border-earth-border shadow-elevated p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-earth-border">
              <h3 className="text-base font-bold text-charcoal">Resolve Quality or Weight Dispute</h3>
              <button onClick={() => setDisputeModal(null)} className="text-charcoal-muted hover:text-charcoal">✕</button>
            </div>
            <form onSubmit={handleConfirmDispute} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">Resolution Ruling & Reason *</label>
                <textarea
                  rows={2}
                  value={disputeResolution}
                  onChange={(e) => setDisputeResolution(e.target.value)}
                  className="w-full px-3 py-2 bg-sand border border-earth-border rounded-xl font-medium text-charcoal"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">Payout Adjustment Amount (₹)</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-sand border border-earth-border rounded-xl font-bold text-charcoal"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDisputeModal(null)} className="px-4 py-2 font-bold text-charcoal-muted">Dismiss</button>
                <button type="submit" className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold shadow-subtle">Execute Ruling</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
