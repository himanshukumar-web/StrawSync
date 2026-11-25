'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Wheat,
  Plus,
  MapPin,
  Trash2,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Edit2
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import AddResidueModal from '../../../components/AddResidueModal';
import EditResidueModal from '../../../components/EditResidueModal';
import { ResidueListing, UserProfile, CalculatorEstimate } from '../../../types';
import {
  StrawSyncStore,
  formatWeight,
  formatUnitPrice,
} from '../../../lib/store';

function FarmerListingsContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [calculatorPrefill, setCalculatorPrefill] = useState<CalculatorEstimate | null>(null);
  const [editingListing, setEditingListing] = useState<ResidueListing | null>(null);

  useEffect(() => {
    const syncStore = () => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
      setListings(StrawSyncStore.getListings());

      if (searchParams.get('fromCalculator') === '1') {
        const prefill = StrawSyncStore.consumeCalculatorPrefill('listing');
        if (prefill) {
          setCalculatorPrefill(prefill);
          setShowAddModal(true);
        }
      }
    };

    syncStore();
    const unsubscribe = StrawSyncStore.subscribe(syncStore);
    return () => unsubscribe();
  }, [searchParams]);

  const isAdminView = currentUser?.role === 'admin';
  const scopedListings = isAdminView
    ? listings
    : currentUser
      ? listings.filter((l) => l.farmerId === currentUser.id)
      : [];

  const filteredListings = scopedListings.filter((l) => {
    if (filterStatus === 'all') return true;
    return l.status === filterStatus;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this residue listing?')) {
      StrawSyncStore.deleteListing(id);
    }
  };

  return (
    <DashboardLayout role="farmer" title="Residue Listings Management">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/farmer/dashboard"
                className="text-xs font-semibold text-charcoal-muted hover:text-forest flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-charcoal mt-1">
              {isAdminView ? 'All Farmer Crop Residue Listings' : 'My Crop Residue Listings'}
            </h1>
            <p className="text-xs text-charcoal-muted">
              Manage your farmgate biomass lots, track verification, and inspect liquidity estimates
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center gap-2 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Residue Lot</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['all', 'verified', 'matched', 'pending', 'sold'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                filterStatus === status
                  ? 'bg-forest text-white shadow-subtle'
                  : 'bg-white text-charcoal-muted border border-earth-border hover:bg-sand'
              }`}
            >
              {status} ({scopedListings.filter((l) => status === 'all' || l.status === status).length})
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-earth-border shadow-subtle space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sand mx-auto flex items-center justify-center text-charcoal-muted">
              <Wheat className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-charcoal">No listings in this view</h3>
            <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
              Add your field acreage to generate instant recoverable biomass estimates and connect with nearby industrial plants.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-subtle"
            >
              <Plus className="w-4 h-4" />
              <span>Create Residue Listing</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((listing) => {
              const getBadge = (st: string) => {
                switch (st) {
                  case 'verified':
                    return { bg: 'bg-emerald-50 text-forest border-forest-200', text: 'Verified for Pickup' };
                  case 'matched':
                    return { bg: 'bg-blue-50 text-blue-800 border-blue-200', text: 'Matched with Buyer' };
                  case 'sold':
                    return { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'Sold & Dispatched' };
                  default:
                    return { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'Pending Verification' };
                }
              };
              const badge = getBadge(listing.status);

              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle hover:border-forest-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {listing.imageUrl ? (
                      <img
                        src={listing.imageUrl}
                        alt={listing.cropName}
                        className="w-full h-36 object-cover rounded-2xl border border-earth-border bg-sand"
                      />
                    ) : (
                      <div className="w-full h-20 rounded-2xl bg-emerald-50/70 border border-forest-100 flex items-center justify-center gap-2 text-xs font-semibold text-forest">
                        <Wheat className="w-4 h-4" />
                        <span className="capitalize">
                          {(listing.category || 'crop_residue').replace(/_/g, ' ')} Lot
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.text}
                      </span>
                      <span className="text-xs text-charcoal-muted font-medium">
                        {listing.landAreaAcres > 0 ? `${listing.landAreaAcres} Acres Plot` : 'Direct Weight Lot'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-charcoal">
                        {listing.cropName}
                      </h3>
                      <p className="text-xs text-charcoal-muted mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-forest" />
                        <span>{listing.village}, {listing.district}</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-sand border border-earth-border grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-charcoal-muted block">Available Stock</span>
                        <span className="font-bold text-forest text-sm">
                          {formatWeight(
                            listing.originalQuantity ?? listing.recoverableTonnes,
                            listing.weightUnit
                          )}
                        </span>
                        {listing.weightUnit && listing.weightUnit !== 'tonne' && (
                          <span className="text-[10px] text-charcoal-muted block">
                            ({listing.recoverableTonnes} Tonnes)
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-charcoal-muted block">Expected Farmgate</span>
                        <span className="font-bold text-charcoal text-sm">
                          {listing.weightUnit &&
                          listing.weightUnit !== 'tonne' &&
                          listing.pricePerUnit !== undefined
                            ? formatUnitPrice(listing.pricePerUnit, listing.weightUnit)
                            : `₹${listing.expectedPricePerTonne}/t`}
                        </span>
                        {listing.weightUnit && listing.weightUnit !== 'tonne' && (
                          <span className="text-[10px] text-charcoal-muted block">
                            (₹{listing.expectedPricePerTonne.toLocaleString('en-IN')}/t)
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-charcoal-muted block">Moisture &amp; Form</span>
                        <span className="font-semibold text-charcoal">{listing.moisturePercentage}% ({listing.baleType})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-charcoal-muted block">Estimated Value</span>
                        <span className="font-bold text-forest">
                          ₹{Math.round(listing.recoverableTonnes * listing.expectedPricePerTonne).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {listing.notes && (
                      <p className="text-[11px] text-charcoal-muted italic line-clamp-2">
                        "{listing.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-earth-border flex items-center justify-between text-xs">
                    <span className="text-[11px] text-charcoal-muted">
                      Window: {listing.collectionStartDate} to {listing.collectionEndDate}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingListing(listing)}
                        className="text-[11px] font-semibold text-forest hover:text-forest-700 flex items-center gap-1 bg-sage/60 px-2.5 py-1 rounded-lg border border-forest-200"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddResidueModal
        isOpen={showAddModal}
        initialPrefill={calculatorPrefill}
        onClose={() => {
          setShowAddModal(false);
          setCalculatorPrefill(null);
        }}
      />

      <EditResidueModal
        isOpen={!!editingListing}
        listing={editingListing}
        onClose={() => setEditingListing(null)}
      />
    </DashboardLayout>
  );
}

export default function FarmerListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-xs font-semibold text-charcoal-muted">
          Loading Farmer Listings...
        </div>
      }
    >
      <FarmerListingsContent />
    </Suspense>
  );
}
